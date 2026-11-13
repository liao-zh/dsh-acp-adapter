import { isSubprocessLaunchFailure } from "../process/subprocess.js";
import { stopSubprocess } from "../process/cleanup.js";
/**
 * ACP v1 client terminal capability.
 *
 * Terminals are agent-owned process trees started through the host subprocess
 * seam. This is Native Agent Access: the adapter does not add a sandbox or a
 * second approval boundary. The host still owns lifecycle, correlation and
 * bounded cleanup, while the agent remains responsible for deciding when to
 * create and release a terminal.
 */
/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import { terminalFailureFacts } from "./terminal-failure.js";
/** Keep individual terminal snapshots bounded even when an agent omits a limit. */
export const ACP_TERMINAL_DEFAULT_OUTPUT_BYTES = 1_048_576;
export const ACP_TERMINAL_MAX_OUTPUT_BYTES = 8 * 1_024 * 1_024;
export const ACP_TERMINAL_RELEASE_WAIT_MS = 10_000;
export const ACP_TERMINAL_MAX_ACTIVE = 64;
class TerminalOutputRing {
    data = Buffer.alloc(0);
    didTruncate = false;
    limit;
    constructor(requested) {
        const normalized = requested === null || requested === undefined
            ? ACP_TERMINAL_DEFAULT_OUTPUT_BYTES
            : Number.isSafeInteger(requested) && requested >= 0
                ? requested
                : (() => {
                    throw new Error('terminal outputByteLimit must be a non-negative integer');
                })();
        this.limit = Math.min(normalized, ACP_TERMINAL_MAX_OUTPUT_BYTES);
    }
    append(chunk) {
        const bytes = Buffer.isBuffer(chunk)
            ? chunk
            : chunk instanceof Uint8Array
                ? Buffer.from(chunk)
                : Buffer.from(String(chunk), 'utf8');
        if (bytes.length === 0)
            return;
        if (this.limit === 0) {
            this.didTruncate = true;
            this.data = Buffer.alloc(0);
            return;
        }
        const combined = Buffer.concat([this.data, bytes]);
        if (combined.length <= this.limit) {
            this.data = combined;
            return;
        }
        this.didTruncate = true;
        let start = combined.length - this.limit;
        // The retained suffix must start at a UTF-8 character boundary. If the
        // stream contained malformed bytes, Buffer.toString('utf8') still gives a
        // valid replacement-character string rather than leaking invalid text.
        while (start < combined.length && (combined[start] & 0xc0) === 0x80)
            start += 1;
        this.data = combined.subarray(start);
    }
    get bytes() {
        return this.data.length;
    }
    get truncated() {
        return this.didTruncate;
    }
    text() {
        return this.data.toString('utf8');
    }
}
function isAbsolutePath(value) {
    return value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\');
}
function assertSession(paramsSessionId, expected) {
    if (paramsSessionId !== expected)
        throw new Error('terminal request belongs to a different ACP session');
}
function assertCommand(command) {
    if (command.length === 0 || command.includes('\0'))
        throw new Error('terminal command must be a non-empty executable without NUL');
}
function assertArgs(args) {
    if (args.some((arg) => arg.includes('\0')))
        throw new Error('terminal arguments must not contain NUL');
}
function isSpawnNotFound(error) {
    return isSubprocessLaunchFailure(error) && error.code === 'ENOENT';
}
function isShellCommandLaunchFailure(error, command) {
    if (isSpawnNotFound(error))
        return true;
    if (typeof error !== 'object' || error === null)
        return false;
    const { code, syscall } = error;
    if (code !== 'ENAMETOOLONG' ||
        typeof syscall !== 'string' ||
        !(syscall === 'spawn' || syscall.startsWith('spawn ') || syscall === 'execve') ||
        Buffer.byteLength(command, 'utf8') <= 255)
        return false;
    // A long `node -e "..."` can exceed the executable-name limit before ENOENT.
    // Admit only an ordinary bare program followed by argument text. A real
    // executable path, an overlong first token or an ambiguous quoted prefix
    // must keep its launch error rather than become shell syntax.
    const program = /^([A-Za-z0-9_][A-Za-z0-9_.+-]*)[ \t\r\n]+\S/.exec(command)?.[1];
    return program !== undefined && program.length <= 255;
}
/**
 * A few ACP clients send a shell command in `command` while leaving `args`
 * empty (for example `uname -s`). Try the structured executable first; a
 * launch-level ENOENT or an unambiguous long command's ENAMETOOLONG may fall
 * back once to the platform shell. An exited command (including shell exit
 * 127) is never retried, so this cannot duplicate an already-running process.
 */
function shellFallbackArgv(command, args) {
    const commandLine = [command, ...args].join(' ');
    return process.platform === 'win32' ? ['cmd.exe', '/d', '/s', '/c', commandLine] : ['/bin/sh', '-c', commandLine];
}
function assertEnvName(name) {
    if (name.length === 0 || name.includes('=') || /[\0\r\n]/.test(name))
        throw new Error('terminal environment names must be non-empty and must not contain =, NUL, or line breaks');
}
function exitStatus(exit) {
    return exit === null ? null : { exitCode: exit.exitCode, signal: exit.signal };
}
function auditEvent(record, operation, outcome) {
    const event = {
        operation,
        terminalId: record.id,
        dshSessionId: record.dshSessionId,
        profileId: record.profileId,
        acpSessionId: record.acpSessionId,
        command: record.command,
        argCount: record.args.length,
        cwd: record.cwd,
        outputBytes: record.output.bytes,
        truncated: record.output.truncated,
        outcome,
        terminationRequested: record.killRequested,
        ...(record.exit === null ? {} : { exitCode: record.exit.exitCode, signal: record.exit.signal }),
        ...(record.failure === undefined ? {} : { failure: record.failure }),
    };
    return event;
}
function attachOutput(stream, append) {
    stream?.on('data', append);
    stream?.on('error', () => { });
}
/** Decode each pipe independently; native readers never consume ACP's ring. */
function attachJobOutput(stream, append) {
    if (stream === undefined)
        return () => { };
    const decoder = new StringDecoder('utf8');
    let flushed = false;
    const write = (text) => {
        if (text.length > 0)
            append(text);
    };
    const onData = (chunk) => {
        const bytes = Buffer.isBuffer(chunk) || chunk instanceof Uint8Array ? chunk : Buffer.from(String(chunk), 'utf8');
        write(decoder.write(bytes));
    };
    const flush = () => {
        if (flushed)
            return;
        flushed = true;
        stream.off('data', onData);
        stream.off('end', flush);
        stream.off('close', flush);
        write(decoder.end());
    };
    stream.on('data', onData);
    stream.once('end', flush);
    stream.once('close', flush);
    return flush;
}
/** Create a per-connection ACP v1 terminal host. */
export function createAcpTerminalHandlers(options) {
    const active = new Map();
    let disposed = false;
    const releaseWaitMs = options.releaseWaitMs ?? ACP_TERMINAL_RELEASE_WAIT_MS;
    const recordAudit = (record, operation, outcome) => {
        const event = auditEvent(record, operation, outcome);
        const audit = options.audit;
        if (audit === undefined)
            return Promise.resolve();
        const operationPromise = record.auditTail
            .then(() => audit(event))
            .catch((error) => options.onAuditError?.(error, event))
            .then(() => { });
        record.auditTail = operationPromise;
        return operationPromise;
    };
    const get = (terminalId, acpSessionId) => {
        if (disposed)
            throw new Error('terminal host is disposed');
        const record = active.get(terminalId);
        if (record === undefined)
            throw new Error('terminal ID is unknown or already released');
        assertSession(acpSessionId, record.acpSessionId);
        return record;
    };
    const requestKill = (record) => {
        if (record.killRequested)
            return;
        record.handle.terminate();
        record.killRequested = true;
        void recordAudit(record, 'kill', 'killed');
    };
    const cancelRecord = (record) => {
        if (record.killRequested)
            return;
        if (record.job === undefined)
            return requestKill(record);
        try {
            record.job.cancel();
        }
        catch {
            // The owner/registry may already have been disposed. The terminal still
            // owns its handle and must finish cleanup independently of presentation.
            requestKill(record);
        }
    };
    const jobDone = async (record) => {
        const fact = await record.done;
        let cleanupError;
        let exited = false;
        try {
            // Command completion is separate from managed-range quiescence. Always
            // use the provider's bounded cleanup ladder: a detached child can keep
            // waitForExit pending after the main command has already settled.
            exited = await stopSubprocess(record.handle, { eofGraceMs: 0, exitWaitMs: releaseWaitMs });
        }
        catch (error) {
            cleanupError = `terminal cleanup failed: ${String(error)}; managed-range exit remains unconfirmed`;
        }
        if (!exited && cleanupError === undefined)
            cleanupError = 'terminal managed-range exit was not confirmed; cleanup remains unconfirmed';
        const failure = [record.error?.message, cleanupError].filter((detail) => detail !== undefined).join('; ') ||
            undefined;
        // Flush a trailing partial UTF-8 sequence before the native registry seals
        // its ring. ACP retains its independent byte snapshot until release.
        record.flushJobOutput();
        return {
            status: failure !== undefined
                ? 'failed'
                : record.killRequested
                    ? 'killed'
                    : fact?.exitCode === 0
                        ? 'completed'
                        : 'failed',
            detail: failure ?? (fact?.signal ? `signal: ${fact.signal}` : `exit code: ${String(fact?.exitCode ?? 'unknown')}`),
        };
    };
    const createTerminal = async (params) => {
        if (disposed)
            throw new Error('terminal host is disposed');
        if (active.size >= ACP_TERMINAL_MAX_ACTIVE)
            throw new Error('terminal host has reached its active terminal limit');
        assertCommand(params.command);
        const args = params.args ?? [];
        assertArgs(args);
        const cwd = params.cwd ?? options.cwd;
        if (!isAbsolutePath(cwd) || cwd.includes('\0'))
            throw new Error('terminal cwd must be an absolute path without NUL');
        const env = { ...options.env };
        for (const variable of params.env ?? []) {
            assertEnvName(variable.name);
            if (variable.value.includes('\0'))
                throw new Error('terminal environment values must not contain NUL');
            env[variable.name] = variable.value;
        }
        const output = new TerminalOutputRing(params.outputByteLimit);
        const spawnSpec = {
            argv: [params.command, ...args],
            cwd,
            env,
            graceMs: 2_000,
        };
        const canShellFallback = args.length === 0;
        const id = `term_${randomUUID().replaceAll('-', '')}`;
        let attempt = 'direct';
        let phase = 'spawn';
        let spawnAttempted = false;
        const spawn = (argv, nextAttempt) => {
            attempt = nextAttempt;
            phase = 'spawn';
            spawnAttempted = true;
            const handle = options.subprocess.spawn({ ...spawnSpec, argv });
            phase = 'completion';
            return handle;
        };
        const start = (jobOutput) => {
            let handle;
            try {
                handle = spawn(spawnSpec.argv, 'direct');
            }
            catch (error) {
                if (!canShellFallback || !isShellCommandLaunchFailure(error, params.command))
                    throw error;
                handle = spawn(shellFallbackArgv(params.command, args), 'shell-fallback');
            }
            const outputFlushers = [];
            const record = {
                id,
                acpSessionId: params.sessionId,
                command: params.command,
                args: [...args],
                cwd,
                handle,
                output,
                flushJobOutput: () => {
                    for (const flush of outputFlushers)
                        flush();
                },
                exit: null,
                released: false,
                killRequested: false,
                dshSessionId: options.dshSessionId,
                profileId: options.profileId,
                done: Promise.resolve(undefined),
                auditTail: Promise.resolve(),
            };
            active.set(id, record);
            const attachHandle = (nextHandle) => {
                record.handle = nextHandle;
                attachOutput(nextHandle.stdout, (chunk) => {
                    record.output.append(chunk);
                });
                attachOutput(nextHandle.stderr, (chunk) => {
                    record.output.append(chunk);
                });
                if (jobOutput !== undefined) {
                    outputFlushers.push(attachJobOutput(nextHandle.stdout, (text) => jobOutput(text, 'stdout')), attachJobOutput(nextHandle.stderr, (text) => jobOutput(text, 'stderr')));
                }
                // ACP v1 exposes no terminal stdin method. Closing stdin prevents commands
                // that read input from remaining alive forever while the Agent only polls output.
                try {
                    nextHandle.stdin?.end();
                }
                catch {
                    /* process teardown remains authoritative */
                }
            };
            attachHandle(handle);
            const settleProcess = async () => {
                try {
                    return await handle.done;
                }
                catch (error) {
                    // A process that was accepted by the OS and later exits with an error
                    // must not be retried. The shell itself is never retried either.
                    if (!canShellFallback || attempt !== 'direct' || !isShellCommandLaunchFailure(error, params.command))
                        throw error;
                    if (!(await stopSubprocess(handle, { eofGraceMs: 0, exitWaitMs: releaseWaitMs })))
                        throw error;
                    if (record.released || record.killRequested || disposed)
                        throw error;
                    const fallback = spawn(shellFallbackArgv(params.command, args), 'shell-fallback');
                    attachHandle(fallback);
                    return await fallback.done;
                }
            };
            record.done = settleProcess().then((fact) => {
                record.exit = fact;
                try {
                    options.onExit?.(auditEvent(record, 'exit', 'exited'));
                }
                catch {
                    // Presentation observers must never change the process result.
                }
                void recordAudit(record, 'exit', 'exited');
                return fact;
            }, (error) => {
                record.error = error instanceof Error ? error : new Error(String(error));
                record.failure = terminalFailureFacts(error, params.command, args, attempt, phase);
                void recordAudit(record, 'exit', 'error');
                return undefined;
            });
            return record;
        };
        let record;
        try {
            if (options.startJob === undefined)
                record = start();
            else {
                const job = options.startJob([params.command, ...args].join(' '), (jobOutput) => {
                    record = start(jobOutput);
                    return { cancel: () => requestKill(record), done: jobDone(record) };
                });
                record.job = job;
            }
        }
        catch (error) {
            if (spawnAttempted && options.audit !== undefined) {
                const event = {
                    operation: 'create',
                    terminalId: id,
                    dshSessionId: options.dshSessionId,
                    profileId: options.profileId,
                    acpSessionId: params.sessionId,
                    command: '[omitted]',
                    argCount: args.length,
                    cwd,
                    outputBytes: 0,
                    truncated: false,
                    outcome: 'error',
                    failure: terminalFailureFacts(error, params.command, args, attempt, phase),
                };
                try {
                    await options.audit(event);
                }
                catch (auditError) {
                    try {
                        options.onAuditError?.(auditError, event);
                    }
                    catch {
                        /* keep the original launch error */
                    }
                }
            }
            throw error;
        }
        await recordAudit(record, 'create', 'started');
        return { terminalId: id };
    };
    const terminalOutput = async (params) => {
        const record = get(params.terminalId, params.sessionId);
        const outcome = record.error === undefined ? (record.exit === null ? 'running' : 'exited') : 'error';
        await recordAudit(record, 'output-summary', outcome);
        return {
            output: record.output.text(),
            truncated: record.output.truncated,
            exitStatus: exitStatus(record.exit),
        };
    };
    const waitForExit = async (params) => {
        const record = get(params.terminalId, params.sessionId);
        await record.done;
        const exit = record.exit;
        if (exit === null)
            throw record.error ?? new Error('terminal exited without an exit fact');
        return { exitCode: exit.exitCode, signal: exit.signal };
    };
    const killTerminal = async (params) => {
        const record = get(params.terminalId, params.sessionId);
        cancelRecord(record);
        await record.auditTail;
        return {};
    };
    const releaseOne = async (record, signal) => {
        if (record.released)
            return true;
        if (record.releasePromise !== undefined)
            return await record.releasePromise;
        record.releasePromise = (async () => {
            if (record.job !== undefined)
                cancelRecord(record);
            record.killRequested = true;
            const exited = await stopSubprocess(record.handle, { eofGraceMs: 0, exitWaitMs: releaseWaitMs, signal });
            if (!exited) {
                await recordAudit(record, 'release', 'timeout');
                delete record.releasePromise;
                return false;
            }
            record.released = true;
            active.delete(record.id);
            // No protocol operation may use the released ID again.
            // A durable release audit is the final operation.
            await recordAudit(record, 'release', 'released');
            await record.auditTail;
            record.job?.release();
            return true;
        })();
        return await record.releasePromise;
    };
    const releaseTerminal = async (params) => {
        const record = get(params.terminalId, params.sessionId);
        if (!(await releaseOne(record)))
            throw new Error('terminal release timed out while the process tree was still running; retry release');
        return {};
    };
    const cancelSession = (acpSessionId) => {
        for (const record of active.values()) {
            if (record.acpSessionId !== acpSessionId || record.killRequested)
                continue;
            if (record.exit !== null && record.job === undefined)
                continue;
            cancelRecord(record);
        }
    };
    const releaseSession = async (acpSessionId) => {
        const records = [...active.values()].filter((record) => record.acpSessionId === acpSessionId);
        const deadline = AbortSignal.timeout(releaseWaitMs);
        await Promise.all(records.map((record) => releaseOne(record, deadline)));
    };
    const dispose = async () => {
        if (disposed)
            return;
        disposed = true;
        const records = [...active.values()];
        const deadline = AbortSignal.timeout(releaseWaitMs);
        await Promise.all(records.map((record) => releaseOne(record, deadline)));
    };
    return {
        createTerminal,
        terminalOutput,
        waitForExit,
        killTerminal,
        releaseTerminal,
        cancelSession,
        releaseSession,
        dispose,
    };
}
//# sourceMappingURL=terminal.js.map