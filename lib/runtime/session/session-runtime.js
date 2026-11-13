/**
 * Minimal ACP session owner used by the provider adapter.
 *
 * This is deliberately not a DSH Agent or AgentLoop.  It owns one ACP
 * connection and one ACP session for one DSH model route, while the stock DSH
 * loop remains responsible for turns, history, cancellation and UI.
 */
/// <reference types="node" />
import { AcpClientConnection, supportsFork } from "../../protocol/v1/connection.js";
import { acpConfigOptionsSnapshot } from "../../protocol/v1/config-options.js";
import { waitWithin } from "../process/timeout.js";
import { AcpHostSettlementError } from "./mcp-lease.js";
import { collectLiveDiagnostic, emitLiveDiagnostic, liveDiagnosticId, liveDiagnosticTraceEnabled, } from "../../contract/live-diagnostic-trace.js";
import { AcpClientError } from "../../protocol/v1/errors.js";
import { performance } from 'node:perf_hooks';
import { generatedContextBlock } from "../text-block-boundary.js";
import { ACP_CONFIG_IDENTIFIER_MAX } from "../../contract/config-options.js";
import { isQwenUserQuestion } from "../../domain/policy/qwen-question.js";
import { RequestError } from '@agentclientprotocol/sdk';
import { QwenBackgroundTasks, qwenTaskCompletion, qwenTaskSnapshots, } from "./qwen-background.js";
const safeAcpErrorCodes = new Set([
    'ACP_ABORTED',
    'ACP_AUTH_REQUIRED',
    'ACP_BINDING_PERSIST_FAILED',
    'ACP_CRASH',
    'ACP_CONFIG_CHANGE_DURING_PROMPT',
    'ACP_PROTOCOL_ERROR',
    'ACP_RESOURCE_EXHAUSTED',
    'ACP_SPAWN_FAILURE',
    'ACP_TIMEOUT',
    'ACP_STEERING_OUTCOME_UNKNOWN',
    'ACP_STEERING_FAILED',
    'ACP_TEAM_TOOL_FAILED',
    'ACP_HOST_CALL_DRAIN_TIMEOUT',
    'ACP_HOST_GENERATION_STILL_ACTIVE',
    'ACP_HOST_TOOL_NOT_DISPATCHED',
    'ACP_HOST_FEEDBACK_COMMIT_FAILED',
    'ACP_HOST_TOOL_RECONCILIATION_REQUIRED',
]);
function structuredAcpErrorCode(error) {
    try {
        if (typeof error !== 'object' || error === null || !('code' in error))
            return 'unavailable';
        const code = error.code;
        return typeof code === 'string' && safeAcpErrorCodes.has(code) ? code : 'unavailable';
    }
    catch {
        return 'unavailable';
    }
}
function structuredJsonRpcCode(error) {
    try {
        if (typeof error !== 'object' || error === null)
            return null;
        const cause = error.cause;
        if (typeof cause !== 'object' || cause === null || !('code' in cause))
            return null;
        const code = cause.code;
        return typeof code === 'number' && Number.isSafeInteger(code) ? code : null;
    }
    catch {
        return null;
    }
}
function structuredProviderErrorKind(error) {
    try {
        if (error instanceof AcpClientError && error.kind === 'resource-exhausted')
            return 'resource_exhausted';
        if (typeof error !== 'object' || error === null || !('cause' in error))
            return 'unavailable';
        const cause = error.cause;
        if (typeof cause !== 'object' || cause === null || !('data' in cause))
            return 'unavailable';
        const data = cause.data;
        return typeof data === 'object' && data !== null && 'errorKind' in data && data.errorKind === 'resource_exhausted'
            ? 'resource_exhausted'
            : 'unavailable';
    }
    catch {
        return 'unavailable';
    }
}
/** A fork failure established before RPC dispatch; matching display text is not such proof. */
export class AcpForkPreDispatchError extends Error {
    code;
    constructor(code, cause) {
        const messages = {
            ACP_FORK_UNSUPPORTED: 'The ACP Agent does not advertise session/fork',
            ACP_FORK_PRECONDITION_FAILED: 'The ACP Agent no longer matches the parent binding',
            ACP_FORK_INTENT_FAILED: 'The ACP fork intent could not be persisted before dispatch',
        };
        super(messages[code], { cause });
        this.name = 'AcpForkPreDispatchError';
        this.code = code;
    }
}
/** An automatic turn must retain uncertainty until an explicit terminal outcome. */
export class AcpAgentTurnOutcomeError extends AcpClientError {
    reason;
    constructor(reason) {
        super('protocol-error', 'Qwen automatic turn ended without a recognized terminal outcome');
        this.reason = reason;
        this.name = 'AcpAgentTurnOutcomeError';
    }
}
function isOwnedQwenTurnUpdate(update, turnId) {
    const turn = update._meta?.backgroundTurn;
    return typeof turn === 'object' && turn !== null && !Array.isArray(turn) && 'turnId' in turn && turn.turnId === turnId;
}
function isIncompleteQwenTurnUpdate(update, turnId) {
    if (update.sessionUpdate !== 'agent_message_chunk')
        return false;
    const meta = update._meta;
    if (meta?.source !== 'background_notification_response')
        return false;
    const task = meta.backgroundTask;
    return (typeof task === 'object' &&
        task !== null &&
        !Array.isArray(task) &&
        'turnId' in task &&
        task.turnId === turnId &&
        'turnComplete' in task &&
        task.turnComplete === true &&
        'partial' in task &&
        task.partial === true);
}
/** Updates that describe Agent work (as opposed to session metadata). */
function isTurnContent(update) {
    const kind = update.sessionUpdate;
    if (kind === 'user_message_chunk') {
        const source = update._meta?.source;
        return source === 'cron' || source === 'loop';
    }
    // Empty chunks are Qwen bookkeeping (usage, per-request lifecycle) that can
    // trail a finished prompt; they never start an automatic turn.
    if ((kind === 'agent_message_chunk' || kind === 'agent_thought_chunk') &&
        update.content.type === 'text' &&
        update.content.text === '')
        return false;
    return (kind === 'agent_message_chunk' ||
        kind === 'agent_thought_chunk' ||
        kind === 'tool_call' ||
        kind === 'tool_call_update' ||
        kind === 'plan');
}
function scheduledTurnLabel(update) {
    if (update.sessionUpdate !== 'user_message_chunk' || update.content.type !== 'text')
        return undefined;
    const source = update._meta?.source;
    const text = update.content.text.replace(/\s+/g, ' ').trim();
    const short = text.length > 100 ? `${text.slice(0, 99)}…` : text;
    return `${source === 'loop' ? 'loop' : 'cron'}: ${short === '' ? 'scheduled prompt' : short}`;
}
const AGENT_TURN_BUFFER_MAX = 10_000;
/** Upper bound for an Agent-initiated turn's permission request to wait for host adoption. */
const AGENT_TURN_ADOPTION_MAX_MS = 60_000;
const ACP_STOP_REASONS = new Set(['end_turn', 'max_tokens', 'max_turn_requests', 'refusal', 'cancelled']);
const QWEN_AGENT_NAME = 'qwen-code';
/** Transient failure while refreshing an already-settled, cancelled session. */
export class AcpSessionRefreshRetryError extends Error {
    code = 'ACP_SESSION_REFRESH_FAILED';
    constructor(cause) {
        super('The cancelled ACP session could not be refreshed before dispatch', { cause });
        this.name = 'AcpSessionRefreshRetryError';
    }
}
/** The runtime was explicitly closed while refreshing a cancelled session. */
export class AcpSessionRefreshAbortedError extends Error {
    code = 'ACP_SESSION_REFRESH_ABORTED';
    constructor(cause) {
        super('The cancelled ACP session refresh was cancelled before dispatch', { cause });
        this.name = 'AcpSessionRefreshAbortedError';
    }
}
/** A conforming Agent normally settles cancellation immediately; this only
 * bounds an Agent that ignores `session/cancel`. */
const ACP_CANCEL_SETTLE_GRACE_MS = 5_000;
function isAborted(signal) {
    return signal?.aborted === true;
}
function waitForRefreshRetry(signal, delayMs) {
    if (signal?.aborted === true)
        return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, delayMs);
        const onAbort = () => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
            reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        if (signal?.aborted === true)
            onAbort();
    });
}
function isTransientSessionRefreshFailure(error) {
    return error instanceof AcpClientError && (error.kind === 'crash' || error.kind === 'timeout');
}
/** ACP tool updates are top-level patches. Keep the detached fields that can
 * make a later id-only permission request understandable to the user. */
function mergeToolCallSnapshot(previous, patch) {
    const next = { ...(previous ?? {}), toolCallId: patch.toolCallId };
    if (patch.kind !== undefined)
        next.kind = patch.kind;
    if (patch.status !== undefined)
        next.status = patch.status;
    // ACP explicitly treats `name: null` as unchanged. A created tool call has
    // a required title, so retain that useful title across nullable updates too.
    if (patch.title !== undefined && patch.title !== null)
        next.title = patch.title;
    if (patch.name !== undefined && patch.name !== null)
        next.name = patch.name;
    if (patch.content !== undefined)
        next.content = patch.content;
    if (patch.locations !== undefined)
        next.locations = patch.locations;
    if (patch.rawInput !== undefined)
        next.rawInput = patch.rawInput;
    if (patch.rawOutput !== undefined)
        next.rawOutput = patch.rawOutput;
    if (patch._meta !== undefined)
        next._meta = patch._meta;
    return structuredClone(next);
}
/**
 * Some ACP agents stream a complete JSON argument object through tool content
 * immediately before requesting permission, but omit `rawInput` from the
 * request itself.  Recover only a complete, bounded execute-command object;
 * partial JSON and arbitrary prose remain unusable rather than being guessed.
 */
function executeInputFromContent(content) {
    const parts = [];
    const visit = (value) => {
        if (Array.isArray(value)) {
            for (const item of value)
                visit(item);
            return;
        }
        if (typeof value !== 'object' || value === null)
            return;
        const block = value;
        if (block.type === 'text' && typeof block.text === 'string')
            parts.push(block.text);
        else if (block.type === 'content')
            visit(block.content);
    };
    visit(content);
    const serialized = parts.join('').trim();
    if (serialized === '' || Buffer.byteLength(serialized, 'utf8') > 64 * 1024)
        return undefined;
    let parsed;
    try {
        parsed = JSON.parse(serialized);
    }
    catch {
        return undefined;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        return undefined;
    const input = parsed;
    const command = input.command ?? input.cmd;
    const argv = input.argv;
    if (!(typeof command === 'string' && command.trim() !== '') &&
        !(Array.isArray(argv) && argv.length > 0 && argv.every((item) => typeof item === 'string')))
        return undefined;
    return structuredClone(input);
}
function permissionToolCall(prior, request) {
    const toolCall = prior === undefined ? structuredClone(request) : mergeToolCallSnapshot(prior, request);
    if (toolCall.kind === 'execute' && toolCall.rawInput === undefined) {
        // Kimi replaces the streamed JSON argument content with human-readable
        // approval prose on the request itself. Prefer the request when it still
        // contains structured input, then fall back to the preceding snapshot.
        const recovered = executeInputFromContent(toolCall.content) ?? executeInputFromContent(prior?.content);
        if (recovered !== undefined)
            toolCall.rawInput = recovered;
    }
    return toolCall;
}
/** Kimi namespaces permission ids as `<turn>:<tool-id>` while its preceding
 * standard tool updates use the unprefixed id.  Accept that one documented
 * numeric namespace form only, and only when the candidate is unambiguous and
 * kind-compatible; all other opaque ids remain exact-match only. */
function permissionPriorSnapshot(snapshots, request) {
    const exact = snapshots?.get(request.toolCallId);
    if (exact !== undefined)
        return exact;
    const match = /^(\d+):(.+)$/.exec(request.toolCallId);
    if (match?.[2] !== undefined) {
        const candidate = snapshots?.get(match[2]);
        if (candidate !== undefined) {
            if (request.kind !== undefined && candidate.kind !== undefined && request.kind !== candidate.kind)
                return undefined;
            return candidate;
        }
    }
    // A sole candidate can belong to an earlier operation, including a completed
    // one. Without a matching identity, keep the request's own details only.
    return undefined;
}
const ACP_PERMISSION_INPUT_GRACE_MS = 1_500;
async function completePermissionToolCall(snapshots, request, signal) {
    const deadline = Date.now() + ACP_PERMISSION_INPUT_GRACE_MS;
    let toolCall = permissionToolCall(permissionPriorSnapshot(snapshots, request), request);
    while (toolCall.kind === 'execute' &&
        toolCall.rawInput === undefined &&
        Date.now() < deadline &&
        !isAborted(signal)) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        toolCall = permissionToolCall(permissionPriorSnapshot(snapshots, request), request);
    }
    return toolCall;
}
async function raceAbort(pending, signal, onAbort) {
    if (signal === undefined)
        return await pending;
    let listener;
    const aborted = new Promise((resolve) => {
        listener = () => resolve(onAbort());
        if (signal.aborted)
            listener();
        else
            signal.addEventListener('abort', listener, { once: true });
    });
    try {
        return await Promise.race([pending, aborted]);
    }
    finally {
        if (listener !== undefined)
            signal.removeEventListener('abort', listener);
    }
}
/** A bounded, detached ACP session configuration snapshot. */
/** One reusable ACP connection/session, lazily started on the first prompt. */
export class AcpSessionRuntime {
    options;
    connection;
    mcpLease;
    mcpKey;
    sessionId;
    starting;
    /** Keep restore/new initialization behind process teardown. Lease shutdown is
     * allowed its own grace, but must not shorten the subprocess close ladder. */
    closing;
    cancelledRefreshController;
    launch;
    replayHandler;
    restoringSessionId;
    connectionAbort;
    sessionCreationGeneration = 0;
    sessionCreation;
    promptAbort;
    promptPhaseAbort;
    promptSignal;
    configSnapshot;
    currentMode;
    modeSnapshot;
    usageSnapshot;
    promptOrdinal = 0;
    configWrite = Promise.resolve();
    /** Claim the complete prompt lifecycle, including lazy session setup. This is
     * distinct from promptActive, which gates Agent callbacks only after the
     * session/prompt request has actually been dispatched. */
    promptClaimed = false;
    hostSettlementPendingValue = false;
    refreshBeforeRestore = false;
    refreshBindingSessionId;
    lastRestoreRefreshedCancelledSessionValue = false;
    promptActive = false;
    /** One map per active prompt. Tool call ids are only meaningful inside this
     * lifetime for permission enrichment and must never leak into another turn. */
    promptToolSnapshots;
    cancelGraceMs;
    retiredMcpLeases = new Set();
    constructor(options) {
        this.options = options;
        this.cancelGraceMs = options.cancelGraceMs ?? ACP_CANCEL_SETTLE_GRACE_MS;
    }
    get acpSessionId() {
        return this.sessionId ?? this.agentTurnFailure?.view.acpSessionId;
    }
    get pendingAgentTurnFailure() {
        return this.agentTurnFailure?.view;
    }
    /** Close a vendor process after a cancelled response and its local settlement
     * complete, keeping the same-session refresh marker for the next user input.
     * This is deliberately not a prompt retry. */
    async retireCancelledSession() {
        if (this.options.refreshSessionAfterCancelledPrompt !== true ||
            !this.refreshBeforeRestore ||
            this.refreshBindingSessionId === undefined)
            return;
        await this.close();
    }
    get agentCapabilities() {
        return (this.connection ?? this.agentTurnFailure?.turn.connection)?.agentCapabilities;
    }
    /** Positive image-input proof belongs to the current live connection only. */
    get inputImageSupported() {
        if (this.connection === undefined ||
            !this.connection.isTransportAvailable ||
            this.connectionAbort?.signal.aborted === true ||
            this.mcpLease?.signal.aborted === true ||
            this.mcpKey !== this.options.mcpKey?.())
            return undefined;
        return this.connection.agentCapabilities?.promptCapabilities?.image;
    }
    get agentInfo() {
        return (this.connection ?? this.agentTurnFailure?.turn.connection)?.agentInfo;
    }
    get protocolVersion() {
        return (this.connection ?? this.agentTurnFailure?.turn.connection)?.protocolVersion;
    }
    /** Latest detached options advertised by this ACP session. */
    get configOptions() {
        return this.configSnapshot;
    }
    get currentModeId() {
        return this.currentMode;
    }
    /** Complete detached legacy mode state advertised by this ACP session. */
    get modes() {
        return this.modeSnapshot;
    }
    /** ACP context occupancy/cumulative cost; intentionally not DSH TokenUsage. */
    get contextUsage() {
        return this.usageSnapshot;
    }
    get lastRestoreRefreshedCancelledSession() {
        return this.lastRestoreRefreshedCancelledSessionValue;
    }
    get cancelledSessionRefreshPending() {
        return this.refreshBeforeRestore;
    }
    get cancelledSessionRefreshBindingId() {
        return this.refreshBindingSessionId;
    }
    get isBusy() {
        return this.promptClaimed;
    }
    get hostSettlementPending() {
        return this.hostSettlementPendingValue;
    }
    toolControlOutcome(toolCallId) {
        return this.mcpLease?.toolControlOutcome?.(toolCallId);
    }
    setHostSettlementPending(pending) {
        if (this.hostSettlementPendingValue === pending)
            return;
        this.hostSettlementPendingValue = pending;
        try {
            this.options.onHostSettlementChanged?.();
        }
        catch {
            /* Host settlement notifications are best effort. */
        }
    }
    hasPendingHostCalls() {
        return (this.mcpLease?.hasPendingCalls?.() === true ||
            [...this.retiredMcpLeases].some((lease) => lease.hasPendingCalls?.() === true));
    }
    hasUncommittedHostFeedback() {
        return (this.mcpLease?.hasUncommittedFeedback?.() === true ||
            [...this.retiredMcpLeases].some((lease) => lease.hasUncommittedFeedback?.() === true));
    }
    async flushHostFeedback() {
        const leases = [this.mcpLease, ...this.retiredMcpLeases].filter((lease) => lease !== undefined);
        try {
            for (const lease of leases)
                await lease.flushHostFeedback?.();
        }
        finally {
            this.setHostSettlementPending(this.hasPendingHostCalls() || this.hasUncommittedHostFeedback());
        }
    }
    hasRetainedHostFeedback() {
        return (this.mcpLease?.hasRetainedFeedback?.() === true ||
            [...this.retiredMcpLeases].some((lease) => lease.hasRetainedFeedback?.() === true));
    }
    async waitForHostCallsSettled() {
        const leases = [this.mcpLease, ...this.retiredMcpLeases].filter((lease) => lease !== undefined);
        await Promise.all(leases.map((lease) => lease.waitForCallsSettled?.() ?? Promise.resolve()));
        for (const lease of this.retiredMcpLeases) {
            if (lease.hasPendingCalls?.() !== true && lease.hasRetainedFeedback?.() !== true)
                this.retiredMcpLeases.delete(lease);
        }
    }
    pendingQuestions = 0;
    /** Qwen-initiated turns, oldest first; the last one may still be live. */
    agentTurns = [];
    /** Sticky for this owner, including transport teardown; only its Host can settle/discard it. */
    agentTurnFailure;
    agentTurnWaiters = new Set();
    /** A host prompt() is waiting to adopt an Agent-initiated turn. */
    awaitingAgentTurn = false;
    /** `session/prompt` RPC is on the wire (updates arrive through its listener). */
    wirePromptActive = false;
    qwenTasks;
    get canSteer() {
        return this.connection?.supportsSteering === true && this.pendingQuestions === 0;
    }
    async steer(content, onDispatch) {
        if (!this.canSteer || !this.promptActive || this.sessionId === undefined)
            return 'promptRequired';
        return await this.connection.steer(this.sessionId, content, onDispatch);
    }
    async start(signal) {
        await this.initialize(signal);
        if (this.agentTurnFailure !== undefined)
            return;
        if (this.sessionId !== undefined)
            return;
        const starting = this.starting ?? this.beginStartup((owner) => this.createSession(owner, signal));
        try {
            await starting.task;
        }
        finally {
            if (this.starting === starting)
                this.starting = undefined;
        }
    }
    /** Initialize and negotiate capabilities without creating session/new. */
    async initialize(signal) {
        // Retain failed automatic output for the normal Host/WAL settlement path.
        // A closed transport here must never create a new session or replay its wake.
        if (this.agentTurnFailure !== undefined)
            return;
        if (this.closing !== undefined)
            await this.closing;
        if (this.connection !== undefined &&
            (this.connection.isClosed || this.mcpLease?.signal.aborted === true || this.mcpKey !== this.options.mcpKey?.()))
            await this.close();
        if (this.connection !== undefined)
            return;
        const starting = this.starting ?? this.beginStartup((owner) => this.createConnection(owner, signal));
        try {
            await starting.task;
        }
        finally {
            if (this.starting === starting)
                this.starting = undefined;
        }
    }
    beginStartup(operation) {
        const completion = Promise.withResolvers();
        const owner = {
            controller: new AbortController(),
            task: completion.promise,
            connection: undefined,
            cleanup: undefined,
        };
        this.starting = owner;
        void operation(owner).then(completion.resolve, completion.reject);
        return owner;
    }
    /**
     * Restore an already-bound ACP session. `session/resume` is preferred because
     * it does not replay presentation history. `session/load` is an explicit
     * staging path: notifications are forwarded to the caller but never written
     * to DSH history by this runtime.
     */
    async restore(binding, signal, onReplay) {
        this.lastRestoreRefreshedCancelledSessionValue = false;
        if (this.promptClaimed)
            throw new Error('ACP_PROMPT_ALREADY_ACTIVE');
        if (this.agentTurnFailure !== undefined) {
            if (binding.agentSessionId !== this.agentTurnFailure.view.acpSessionId)
                throw new Error('ACP binding session id does not match the failed automatic turn');
            // Failure presentation only: prompt() consumes its prefix/error without RPC.
            return 'reused';
        }
        if (this.refreshBeforeRestore) {
            if (this.refreshBindingSessionId !== binding.agentSessionId)
                throw new Error('ACP binding session id does not match the cancelled runtime session');
            return await this.refreshCancelledSession(binding, signal, onReplay);
        }
        if (this.closing !== undefined)
            await this.closing;
        // A closed transport cannot own a reusable in-memory session, even if the
        // remote session id is still cached. Clear local state before deciding
        // whether this binding can be reused; the caller's durable recovery guard
        // remains responsible for authorizing a resume after an unknown outcome.
        if (this.connection?.isClosed === true)
            await this.close();
        if (this.sessionId !== undefined) {
            if (this.sessionId !== binding.agentSessionId)
                throw new Error('ACP binding session id does not match the active runtime');
            return 'reused';
        }
        return await this.restoreCold(binding, signal, onReplay);
    }
    async waitForCancelledSessionSettlement() {
        if (this.promptClaimed)
            throw new AcpHostSettlementError('ACP_HOST_GENERATION_STILL_ACTIVE');
        if (this.hasPendingHostCalls())
            throw new AcpHostSettlementError('ACP_HOST_GENERATION_STILL_ACTIVE');
        await this.flushHostFeedback();
        if (this.promptClaimed || this.hasPendingHostCalls() || this.hasUncommittedHostFeedback())
            throw new AcpHostSettlementError('ACP_HOST_GENERATION_STILL_ACTIVE');
    }
    async refreshCancelledSession(binding, signal, onReplay) {
        const refreshController = new AbortController();
        this.cancelledRefreshController = refreshController;
        const refreshSignal = signal === undefined ? refreshController.signal : AbortSignal.any([signal, refreshController.signal]);
        const retryDelaysMs = [100, 300];
        try {
            await this.waitForCancelledSessionSettlement();
            if (refreshSignal.aborted)
                throw new AcpSessionRefreshAbortedError(refreshSignal.reason);
            for (let attempt = 0;; attempt += 1) {
                if (refreshSignal.aborted)
                    throw new AcpSessionRefreshAbortedError(refreshSignal.reason);
                try {
                    await this.closeForCancelledRefresh(refreshController);
                    const restored = await this.restoreCold(binding, refreshSignal, onReplay);
                    if (refreshSignal.aborted)
                        throw new AcpSessionRefreshAbortedError(refreshSignal.reason);
                    this.refreshBeforeRestore = false;
                    this.refreshBindingSessionId = undefined;
                    this.lastRestoreRefreshedCancelledSessionValue = true;
                    return restored;
                }
                catch (error) {
                    if (refreshSignal.aborted)
                        throw new AcpSessionRefreshAbortedError(refreshSignal.reason ?? error);
                    if (!isTransientSessionRefreshFailure(error) || attempt >= retryDelaysMs.length) {
                        if (attempt >= retryDelaysMs.length && isTransientSessionRefreshFailure(error))
                            throw new AcpSessionRefreshRetryError(error);
                        throw error;
                    }
                    try {
                        await waitForRefreshRetry(refreshSignal, retryDelaysMs[attempt]);
                    }
                    catch (waitError) {
                        if (refreshSignal.aborted)
                            throw new AcpSessionRefreshAbortedError(refreshSignal.reason ?? waitError);
                        throw waitError;
                    }
                }
            }
        }
        finally {
            if (this.cancelledRefreshController === refreshController)
                this.cancelledRefreshController = undefined;
        }
    }
    async closeForCancelledRefresh(owner) {
        await this.closeInternal(owner);
    }
    async restoreCold(binding, signal, onReplay) {
        await this.initialize(signal);
        const connection = this.connection;
        if (connection === undefined)
            throw new Error('ACP connection is not started');
        const caps = connection.agentCapabilities;
        const mcpServers = this.mcpLease?.servers ?? [];
        const rpcOptions = signal === undefined ? {} : { signal };
        this.replayHandler = onReplay;
        this.restoringSessionId = binding.agentSessionId;
        try {
            if (caps?.sessionCapabilities?.resume != null) {
                const response = await connection.resumeSession(binding.agentSessionId, { cwd: this.options.cwd, mcpServers }, rpcOptions);
                this.applySessionSnapshot(response);
                this.sessionId = binding.agentSessionId;
                return 'resumed';
            }
            if (caps?.loadSession !== true) {
                throw new Error('ACP agent does not advertise session/resume or session/load');
            }
            const response = await connection.loadSession(binding.agentSessionId, { cwd: this.options.cwd, mcpServers }, rpcOptions);
            this.applySessionSnapshot(response);
            this.sessionId = binding.agentSessionId;
            return 'loaded';
        }
        finally {
            this.replayHandler = undefined;
            this.restoringSessionId = undefined;
        }
    }
    /**
     * Create a child ACP session from an already-bound parent. This is kept
     * separate from start(): a successful fork owns the returned child id and
     * must never first create an unrelated session/new.
     * AcpForkPreDispatchError proves no fork RPC was sent; every other failure
     * retains an unknown remote outcome. The runtime owns intent-error wrapping.
     * The final synchronous validator runs after intent persistence and directly
     * before dispatch; it must throw AcpForkPreDispatchError for a known refusal.
     */
    async fork(parentSessionId, signal, expected, beforeDispatch, validateBeforeDispatch) {
        if (this.agentTurnFailure !== undefined)
            throw this.agentTurnFailure.view.error;
        if (this.sessionId !== undefined)
            throw new Error('ACP runtime already owns a session');
        await this.initialize(signal);
        const connection = this.connection;
        if (connection === undefined)
            throw new Error('ACP connection is not started');
        const mcpServers = this.mcpLease?.servers ?? [];
        try {
            if (!supportsFork(connection.agentCapabilities))
                throw new AcpForkPreDispatchError('ACP_FORK_UNSUPPORTED');
            if (expected?.protocolVersion !== undefined && connection.protocolVersion !== expected.protocolVersion)
                throw new AcpForkPreDispatchError('ACP_FORK_PRECONDITION_FAILED');
            if (expected?.agent?.name !== undefined && connection.agentInfo?.name !== expected.agent.name)
                throw new AcpForkPreDispatchError('ACP_FORK_PRECONDITION_FAILED');
            if (expected?.agent?.version !== undefined && connection.agentInfo?.version !== expected.agent.version)
                throw new AcpForkPreDispatchError('ACP_FORK_PRECONDITION_FAILED');
            try {
                await beforeDispatch?.();
            }
            catch (error) {
                if (error instanceof AcpForkPreDispatchError)
                    throw error;
                throw new AcpForkPreDispatchError('ACP_FORK_INTENT_FAILED', error);
            }
            validateBeforeDispatch?.();
            const response = await connection.forkSession(parentSessionId, { cwd: this.options.cwd, mcpServers }, signal === undefined ? {} : { signal });
            if (typeof response.sessionId !== 'string' ||
                response.sessionId.length === 0 ||
                response.sessionId === parentSessionId) {
                throw new Error('ACP_FORK_INVALID_RESPONSE');
            }
            this.applySessionSnapshot(response);
            this.sessionId = response.sessionId;
            return response;
        }
        catch (error) {
            await this.close().catch(() => undefined);
            throw error;
        }
    }
    async prompt(content, onUpdate, signal, onTeamReport, onTurnConcluded, onSuccessfulToolResult, promptOptions = {}) {
        if (this.promptClaimed)
            throw new Error('ACP_PROMPT_ALREADY_ACTIVE');
        // Claim synchronously before the asynchronous local feedback flush. Without
        // this ordering, two callers can both pass the initial check and dispatch
        // overlapping RPC prompts while they await the same retained feedback.
        this.promptClaimed = true;
        const promptAbort = new AbortController();
        this.promptAbort = promptAbort;
        const setupSignal = signal === undefined ? promptAbort.signal : AbortSignal.any([signal, promptAbort.signal]);
        try {
            this.throwPendingAgentTurnFailure(onUpdate);
            await this.flushHostFeedback();
            if (this.hasPendingHostCalls() || this.hasUncommittedHostFeedback())
                throw new AcpHostSettlementError('ACP_HOST_GENERATION_STILL_ACTIVE');
            // A turn cancelled before dispatch has no remote outcome to reconcile.
            if (isAborted(signal))
                return { stopReason: 'cancelled' };
            // Claim the prompt first, preventing further UI writes, then finish any
            // already admitted setting changes before sending this turn.
            await this.configWrite;
            if (setupSignal.aborted)
                return { stopReason: 'cancelled' };
            this.throwPendingAgentTurnFailure(onUpdate);
            await this.start(setupSignal);
            this.throwPendingAgentTurnFailure(onUpdate);
            const connection = this.connection;
            const sessionId = this.sessionId;
            if (connection === undefined || sessionId === undefined)
                throw new Error('ACP session is not started');
            if (isAborted(signal))
                return { stopReason: 'cancelled' };
            // A turn woken by a Qwen background/cron notice runs the turn Qwen has
            // already started instead of dispatching a new session/prompt.
            const adoptedTurn = promptOptions.adoptAgentTurn === true ? await this.nextAgentTurn(setupSignal) : undefined;
            this.throwPendingAgentTurnFailure(onUpdate);
            if (isAborted(signal))
                return { stopReason: 'cancelled' };
            const promptToolSnapshots = adoptedTurn === undefined ? new Map() : (this.promptToolSnapshots ?? new Map());
            if (adoptedTurn === undefined)
                this.promptToolSnapshots?.clear();
            this.promptToolSnapshots = promptToolSnapshots;
            this.promptActive = true;
            this.promptAbort = promptAbort;
            let phaseAbort = new AbortController();
            this.promptPhaseAbort = phaseAbort;
            this.promptSignal = signal;
            const diagnosticsEnabled = liveDiagnosticTraceEnabled();
            const promptOrdinal = diagnosticsEnabled ? ++this.promptOrdinal : undefined;
            const promptStartedAt = diagnosticsEnabled ? performance.now() : 0;
            const diagnosticLeaseId = diagnosticsEnabled ? this.mcpLease?.diagnosticLeaseId : undefined;
            const diagnosticSessionId = diagnosticsEnabled
                ? (liveDiagnosticId('dsh-session', this.options.diagnosticDshSessionId) ?? 'unavailable')
                : 'unavailable';
            const diagnosticAcpSessionId = diagnosticsEnabled
                ? (liveDiagnosticId('acp-session', sessionId) ?? 'unavailable')
                : undefined;
            if (diagnosticsEnabled)
                emitLiveDiagnostic({
                    type: 'adapter-prompt/start',
                    sessionId: diagnosticSessionId,
                    ...(diagnosticAcpSessionId === undefined ? {} : { acpSessionId: diagnosticAcpSessionId }),
                    promptOrdinal: promptOrdinal,
                    ...(diagnosticLeaseId === undefined ? {} : { leaseId: diagnosticLeaseId }),
                });
            const beginLease = () => this.mcpLease?.beginPrompt(this.permissionSignal() ?? promptAbort.signal, onTeamReport, promptOrdinal, onTurnConcluded, 
            // Natural prompt completion aborts setup/permission work but must not
            // cancel an already-dispatched Host body. When ACP has no external
            // Stop signal, provide a distinct live signal until lease shutdown.
            promptOptions.hostBodySignal ?? signal ?? new AbortController().signal, onSuccessfulToolResult);
            beginLease();
            // Do not pass the turn signal into the RPC budget layer: abandoning an
            // in-flight JSON-RPC request poisons the connection. ACP cancellation is a
            // protocol notification followed by a bounded wait for this same prompt.
            const instructions = this.mcpLease?.instructions;
            const deliver = (notification) => {
                const update = notification.update;
                // Permission snapshots retain the original wire identity; only the presentation callback is normalized.
                const presented = notification.sessionId === sessionId &&
                    (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update')
                    ? this.mcpLease?.presentTool?.(update)
                    : undefined;
                onUpdate(presented === undefined
                    ? notification
                    : { ...notification, update: { ...update, ...presented } });
            };
            const wirePrompt = async (wireContent) => {
                this.wirePromptActive = true;
                try {
                    return await connection.prompt(sessionId, instructions === undefined
                        ? wireContent
                        : [{ type: 'text', text: generatedContextBlock(instructions) }, ...wireContent], (notification) => {
                        // Qwen's discrete "background task completed" line is task state,
                        // not part of the assistant answer.
                        if (connection.agentInfo?.name === QWEN_AGENT_NAME && qwenTaskCompletion(notification) !== undefined)
                            return;
                        // Qwen drains its cron queue before answering session/prompt: from
                        // the echoed scheduled prompt on, the stream belongs to that turn.
                        if (notification.sessionId === sessionId && this.liveAgentTurn()?.announced === false)
                            return;
                        deliver(notification);
                    });
                }
                finally {
                    this.wirePromptActive = false;
                }
            };
            const prompting = (async () => {
                if (adoptedTurn === undefined)
                    return await wirePrompt(content);
                const response = await this.adoptAgentTurn(connection, adoptedTurn, deliver);
                await connection.drainAgentTurnHostOperations(sessionId);
                const followup = promptOptions.followupContent;
                if (followup === undefined || setupSignal.aborted)
                    return response;
                if (connection.isClosed)
                    throw new AcpClientError('crash', 'ACP automatic turn connection closed before follow-up');
                // Close and drain the adopted capability generation before admitting
                // retained input. Native FS and MCP bodies cannot spill into its tools.
                this.mcpLease?.endPrompt({ stopReason: response.stopReason, remoteOutcomeKnown: true });
                phaseAbort.abort(new Error('ACP adopted turn ended'));
                await this.mcpLease?.drainPrompt?.();
                await this.flushHostFeedback();
                if (this.hasPendingHostCalls() || this.hasUncommittedHostFeedback())
                    throw new AcpHostSettlementError('ACP_HOST_GENERATION_STILL_ACTIVE');
                if (setupSignal.aborted)
                    return { stopReason: 'cancelled' };
                this.releaseAgentTurn(connection, sessionId, adoptedTurn);
                promptToolSnapshots.clear();
                phaseAbort = new AbortController();
                this.promptPhaseAbort = phaseAbort;
                beginLease();
                // This is independently admitted input, not a retry of the automatic
                // turn. Its own response determines whether that input completed.
                return await wirePrompt(followup);
            })();
            let settled = false;
            void prompting.then(() => {
                settled = true;
            }, () => {
                settled = true;
            });
            const onAbort = () => {
                if (settled)
                    return;
                void connection.cancel(sessionId).catch(() => undefined);
                void waitWithin(prompting, this.cancelGraceMs).then((response) => {
                    if (response !== undefined || settled || this.connection !== connection || connection.isClosed)
                        return;
                    // The remote outcome is now unknown. Closing the connection rejects
                    // the still-pending prompt, allowing the adapter's existing recovery
                    // guard to take over instead of hanging the DSH turn indefinitely.
                    void connection.close().catch(() => undefined);
                }, () => {
                    /* prompt failed inside the grace period; no escalation needed */
                });
            };
            signal?.addEventListener('abort', onAbort, { once: true });
            if (isAborted(signal))
                onAbort();
            let promptResponse;
            let promptError;
            try {
                promptResponse = await prompting;
                return promptResponse;
            }
            catch (error) {
                promptError = error;
                throw error;
            }
            finally {
                this.wirePromptActive = false;
                signal?.removeEventListener('abort', onAbort);
                if (adoptedTurn !== undefined)
                    this.releaseAgentTurn(connection, sessionId, adoptedTurn);
                void this.ensureQwenTasks()?.refresh();
                // Permission requests are scoped to this prompt, not merely to the
                // process connection. Natural completion must cancel an unresolved host
                // question just as Stop does, before another turn can begin.
                const externallyAborted = isAborted(signal);
                this.mcpLease?.endPrompt({
                    ...(promptResponse === undefined ? {} : { stopReason: promptResponse.stopReason }),
                    externallyAborted,
                    remoteOutcomeKnown: promptResponse !== undefined,
                });
                this.setHostSettlementPending(promptResponse !== undefined && (this.hasPendingHostCalls() || this.hasUncommittedHostFeedback()));
                promptAbort.abort(new Error('ACP prompt lifetime ended'));
                let drainError;
                if (this.options.refreshSessionAfterCancelledPrompt === true && promptResponse?.stopReason === 'cancelled') {
                    this.refreshBeforeRestore = true;
                    this.refreshBindingSessionId = sessionId;
                }
                if (this.mcpLease?.drainPrompt !== undefined) {
                    try {
                        await this.mcpLease.drainPrompt();
                    }
                    catch (error) {
                        drainError = error;
                    }
                }
                this.setHostSettlementPending(this.hasPendingHostCalls() || this.hasUncommittedHostFeedback());
                const feedbackCommitFailure = drainError instanceof AcpHostSettlementError &&
                    drainError.code === 'ACP_HOST_FEEDBACK_COMMIT_FAILED' &&
                    promptResponse === undefined;
                if (drainError instanceof AcpHostSettlementError &&
                    drainError.code === 'ACP_HOST_FEEDBACK_COMMIT_FAILED' &&
                    promptResponse !== undefined) {
                    drainError = new AcpHostSettlementError('ACP_HOST_FEEDBACK_COMMIT_FAILED', {
                        remoteOutcomeKnown: true,
                        remoteResponse: promptResponse,
                    });
                }
                const structuredFailureError = feedbackCommitFailure && promptError !== undefined ? promptError : (drainError ?? promptError);
                const structuredFailure = diagnosticsEnabled && structuredFailureError !== undefined
                    ? collectLiveDiagnostic(() => ({
                        operation: 'session/prompt',
                        errorCode: structuredAcpErrorCode(structuredFailureError),
                        providerErrorKind: structuredProviderErrorKind(structuredFailureError),
                        jsonRpcCode: structuredJsonRpcCode(structuredFailureError),
                    }))
                    : undefined;
                if (diagnosticsEnabled)
                    emitLiveDiagnostic({
                        type: 'adapter-prompt/end',
                        sessionId: diagnosticSessionId,
                        ...(diagnosticAcpSessionId === undefined ? {} : { acpSessionId: diagnosticAcpSessionId }),
                        promptOrdinal: promptOrdinal,
                        ...(diagnosticLeaseId === undefined ? {} : { leaseId: diagnosticLeaseId }),
                        durationMs: Math.max(0, Math.round(performance.now() - promptStartedAt)),
                        stopReason: promptResponse?.stopReason === 'end_turn' ||
                            promptResponse?.stopReason === 'max_tokens' ||
                            promptResponse?.stopReason === 'cancelled' ||
                            promptResponse?.stopReason === 'refusal' ||
                            promptResponse?.stopReason === 'max_turn_requests'
                            ? promptResponse.stopReason
                            : 'unknown',
                        ...(structuredFailure ?? {}),
                    });
                if (this.promptAbort === promptAbort) {
                    promptToolSnapshots.clear();
                    if (this.promptToolSnapshots === promptToolSnapshots)
                        this.promptToolSnapshots = undefined;
                    this.promptAbort = undefined;
                    phaseAbort.abort(new Error('ACP prompt phase ended'));
                    if (this.promptPhaseAbort === phaseAbort)
                        this.promptPhaseAbort = undefined;
                    this.promptSignal = undefined;
                    this.promptActive = false;
                }
                if (drainError !== undefined && !(feedbackCommitFailure && promptError !== undefined))
                    throw drainError;
            }
        }
        finally {
            promptAbort.abort(new Error('ACP prompt lifetime ended'));
            if (this.promptAbort === promptAbort)
                this.promptAbort = undefined;
            this.promptClaimed = false;
        }
    }
    /** Set one ACP option for this runtime's session; writes are serialized and never cross sessions. */
    async setConfigOption(configId, value, signal) {
        if (this.agentTurnFailure !== undefined)
            throw this.agentTurnFailure.view.error;
        if (this.promptClaimed)
            throw new Error('ACP_CONFIG_CHANGE_DURING_PROMPT');
        const connection = this.connection;
        const sessionId = this.sessionId;
        if (connection === undefined || sessionId === undefined)
            throw new Error('ACP session is not started');
        const run = this.configWrite.then(async () => {
            signal?.throwIfAborted();
            if (connection !== this.connection || sessionId !== this.sessionId)
                throw new Error('ACP configuration connection changed');
            const response = await connection.setConfigOption(sessionId, configId, value, signal === undefined ? {} : { signal });
            if (connection !== this.connection || sessionId !== this.sessionId)
                throw new Error('ACP configuration connection changed');
            this.configSnapshot = acpConfigOptionsSnapshot(response.configOptions);
        });
        this.configWrite = run.catch(() => undefined);
        await run;
    }
    /** Set a legacy ACP mode for this runtime's session. */
    async setMode(modeId, signal) {
        if (this.agentTurnFailure !== undefined)
            throw this.agentTurnFailure.view.error;
        if (this.promptClaimed)
            throw new Error('ACP_CONFIG_CHANGE_DURING_PROMPT');
        const connection = this.connection;
        const sessionId = this.sessionId;
        if (connection === undefined || sessionId === undefined)
            throw new Error('ACP session is not started');
        const run = this.configWrite.then(async () => {
            signal?.throwIfAborted();
            if (connection !== this.connection || sessionId !== this.sessionId)
                throw new Error('ACP configuration connection changed');
            await connection.setMode(sessionId, modeId, signal === undefined ? {} : { signal });
            if (connection !== this.connection || sessionId !== this.sessionId)
                throw new Error('ACP configuration connection changed');
            this.currentMode = modeId;
        });
        this.configWrite = run.catch(() => undefined);
        await run;
    }
    /** Cancel initialization and await acquired resources and late setup cleanup before reuse. */
    close() {
        return this.closeInternal();
    }
    closeInternal(refreshOwner) {
        this.sessionCreationGeneration += 1;
        this.sessionCreation?.updates.clear();
        this.sessionCreation = undefined;
        if (this.cancelledRefreshController !== undefined && this.cancelledRefreshController !== refreshOwner)
            this.cancelledRefreshController.abort(new Error('ACP session runtime closed during cancelled-session refresh'));
        if (this.closing !== undefined)
            return this.closing;
        // Capture one generation before signalling it. A concurrent restore waits
        // for this promise, and cleanup below only clears fields still owned by
        // this generation.
        const starting = this.starting;
        const connection = this.connection ?? starting?.connection;
        const lease = this.mcpLease;
        const launch = this.launch;
        const connectionAbort = this.connectionAbort;
        const completion = Promise.withResolvers();
        const closing = completion.promise;
        this.closing = closing;
        const operation = (async () => {
            starting?.controller.abort(new Error('ACP session runtime closed during setup'));
            const closeResources = () => this.closeResources(connection, lease, launch, connectionAbort);
            const cleanup = starting === undefined ? closeResources() : (starting.cleanup ??= closeResources());
            // Startup owns resources that may still be acquired after cancellation,
            // such as a pending MCP lease. Its failure cleanup must settle as well.
            const [closed] = await Promise.allSettled([cleanup, starting?.task]);
            if (closed.status === 'rejected')
                throw closed.reason;
        })();
        void operation.then(completion.resolve, completion.reject);
        void closing.then(() => {
            if (this.closing === closing)
                this.closing = undefined;
        }, () => {
            if (this.closing === closing)
                this.closing = undefined;
        });
        return closing;
    }
    async closeResources(connection, lease, launch, connectionAbort) {
        this.promptAbort?.abort(new Error('ACP session runtime closed'));
        for (const turn of this.agentTurns)
            turn.end({ error: new AcpAgentTurnOutcomeError('missing-terminal') });
        this.agentTurns = [];
        this.notifyAgentTurnWaiters();
        const qwenTasks = this.qwenTasks;
        qwenTasks?.beginClose();
        this.promptToolSnapshots?.clear();
        this.promptToolSnapshots = undefined;
        connectionAbort?.abort();
        // MCP teardown is bounded independently. The subprocess owns a separate
        // bounded EOF/terminate ladder; wrapping both in cancelGraceMs could
        // abandon that ladder and let restore spawn while the old child lives.
        const leaseClose = lease === undefined
            ? Promise.resolve(undefined)
            : waitWithin(Promise.resolve().then(() => lease.close(this.cancelGraceMs)), this.cancelGraceMs);
        const connectionClose = connection?.close();
        const results = await Promise.allSettled([leaseClose, connectionClose]);
        // A close request does not prove the Agent's private work has stopped.
        // Release native job waiters only after cleanup reports its actual result.
        qwenTasks?.close(connection?.isCleanupConfirmed === true);
        if (this.qwenTasks === qwenTasks)
            this.qwenTasks = undefined;
        if (lease?.hasPendingCalls?.() === true || lease?.hasRetainedFeedback?.() === true) {
            this.retiredMcpLeases.add(lease);
            const settled = lease.waitForCallsSettled?.();
            if (settled !== undefined)
                void settled.then(() => {
                    if (lease.hasPendingCalls?.() !== true && lease.hasRetainedFeedback?.() !== true)
                        this.retiredMcpLeases.delete(lease);
                }, () => {
                    /* keep the lease reachable when settlement cannot be observed */
                });
        }
        if (this.connection === connection && this.mcpLease === lease && this.launch === launch) {
            this.connection = undefined;
            this.mcpLease = undefined;
            this.sessionId = undefined;
            this.launch = undefined;
            // A confirmed cancelled response keeps the same durable ACP binding for
            // the next explicit user action. Preserve its last-known controls while
            // the process is retired so a passive UI refresh can still render them;
            // the next prompt/control write must restore the binding before use.
            if (!this.refreshBeforeRestore && this.agentTurnFailure === undefined) {
                this.configSnapshot = undefined;
                this.currentMode = undefined;
                this.modeSnapshot = undefined;
                this.usageSnapshot = undefined;
            }
        }
        if (this.connectionAbort === connectionAbort)
            this.connectionAbort = undefined;
        const errors = [];
        for (const result of results)
            if (result.status === 'rejected')
                errors.push(result.reason);
        if (errors.length > 0)
            throw new AggregateError(errors, 'ACP runtime cleanup failed');
    }
    async createSession(starting, signal) {
        const connection = this.connection;
        if (connection === undefined)
            throw new Error('ACP connection is not started');
        starting.connection = connection;
        const connectionAbort = this.connectionAbort;
        if (connectionAbort === undefined)
            throw new Error('ACP connection is not active');
        const setupSignal = AbortSignal.any([
            starting.controller.signal,
            connectionAbort.signal,
            ...(signal === undefined ? [] : [signal]),
        ]);
        setupSignal.throwIfAborted();
        const generation = ++this.sessionCreationGeneration;
        const creation = {
            generation,
            connection,
            connectionAbort,
            updates: new Map(),
        };
        this.sessionCreation = creation;
        try {
            const session = await connection.newSession({ cwd: this.options.cwd, mcpServers: this.mcpLease?.servers ?? [] }, { signal: setupSignal });
            setupSignal.throwIfAborted();
            connectionAbort.signal.throwIfAborted();
            if (generation !== this.sessionCreationGeneration ||
                this.connection !== connection ||
                this.connectionAbort !== connectionAbort)
                throw new Error('ACP session creation generation changed');
            const staged = creation.updates.get(session.sessionId);
            if (staged?.configOptions !== undefined)
                this.configSnapshot = staged.configOptions;
            if (staged?.currentModeId !== undefined)
                this.currentMode = staged.currentModeId;
            this.applySessionSnapshot(session);
            this.sessionId = session.sessionId;
        }
        catch (error) {
            if (this.connection === connection && this.connectionAbort === connectionAbort)
                await (starting.cleanup ??= this.closeResources(connection, this.mcpLease, this.launch, connectionAbort)).catch(() => undefined);
            throw error;
        }
        finally {
            if (this.sessionCreation === creation) {
                creation.updates.clear();
                this.sessionCreation = undefined;
            }
        }
    }
    stageSessionCreationUpdate(connection, connectionAbort, notification) {
        const creation = this.sessionCreation;
        if (creation === undefined ||
            creation.connection !== connection ||
            creation.connectionAbort !== connectionAbort ||
            creation.generation !== this.sessionCreationGeneration ||
            connectionAbort.signal.aborted)
            return;
        const update = notification.update;
        if (update.sessionUpdate !== 'config_option_update' && update.sessionUpdate !== 'current_mode_update')
            return;
        let staged = creation.updates.get(notification.sessionId);
        if (staged === undefined) {
            if (creation.updates.size >= 32)
                return;
            staged = {};
        }
        if (update.sessionUpdate === 'config_option_update') {
            const configOptions = acpConfigOptionsSnapshot(update.configOptions);
            if (configOptions !== undefined)
                staged.configOptions = configOptions;
        }
        else {
            if (update.currentModeId.length > ACP_CONFIG_IDENTIFIER_MAX)
                return;
            staged.currentModeId = update.currentModeId;
        }
        creation.updates.set(notification.sessionId, staged);
    }
    async createConnection(starting, signal) {
        signal?.throwIfAborted();
        // Teardown can arrive while prepareLaunch/initialize is still pending.
        // Own its cancellation before awaiting either, so a disposed session cannot
        // publish a newly initialized child after close() has returned.
        const connectionAbort = starting.controller;
        this.connectionAbort = connectionAbort;
        const setupSignal = signal === undefined ? connectionAbort.signal : AbortSignal.any([signal, connectionAbort.signal]);
        const launch = await this.options.prepareLaunch(this.options.config, this.options.cwd);
        if (setupSignal.aborted) {
            await launch.mcpLease?.close().catch(() => undefined);
            setupSignal.throwIfAborted();
        }
        this.launch = launch;
        this.mcpLease = launch.mcpLease;
        const spec = {
            argv: [...launch.argv],
            cwd: this.options.cwd,
            env: launch.env,
            spawnPlan: launch.spawnPlan,
            subprocess: this.options.subprocess,
        };
        const fileSystemHandlers = this.options.createFileSystemHandlers?.({ cwd: this.options.cwd, env: launch.env });
        const terminalHandlers = this.options.createTerminalHandlers?.({ cwd: this.options.cwd, env: launch.env });
        const connection = new AcpClientConnection(spec, {
            ...(this.options.enableClaudeDraftSubagents === true ? { enableClaudeDraftSubagents: true } : {}),
            ...(this.options.onCapabilityDegraded === undefined
                ? {}
                : { onCapabilityDegraded: this.options.onCapabilityDegraded }),
            ...(fileSystemHandlers === undefined ? {} : { fileSystemHandlers }),
            ...(terminalHandlers === undefined ? {} : { terminalHandlers }),
            ...(this.options.onPermissionRequest === undefined
                ? {}
                : {
                    onPermissionRequest: async (params) => {
                        this.pendingQuestions += 1;
                        try {
                            return await this.handlePermissionRequest(params);
                        }
                        finally {
                            this.pendingQuestions -= 1;
                        }
                    },
                }),
            ...(this.options.onElicitationRequest === undefined
                ? {}
                : {
                    onElicitationRequest: async (params) => {
                        const signal = this.permissionSignal();
                        if (!this.promptActive || isAborted(signal))
                            return { action: 'cancel' };
                        const scope = params;
                        const toolCall = scope.sessionId !== this.sessionId || typeof scope.toolCallId !== 'string'
                            ? undefined
                            : this.promptToolSnapshots?.get(scope.toolCallId);
                        this.pendingQuestions += 1;
                        try {
                            const lease = this.mcpLease;
                            const automaticPromise = Promise.resolve(lease?.elicitation?.(params, toolCall));
                            let automatic;
                            if (signal === undefined)
                                automatic = await automaticPromise;
                            else {
                                const abortToken = Symbol('abort');
                                let onAbort;
                                const aborted = new Promise((resolve) => {
                                    onAbort = () => resolve(abortToken);
                                    if (isAborted(signal))
                                        onAbort();
                                    else
                                        signal.addEventListener('abort', onAbort, { once: true });
                                });
                                try {
                                    const result = await Promise.race([automaticPromise, aborted]);
                                    if (result === abortToken)
                                        return { action: 'cancel' };
                                    automatic = result;
                                }
                                finally {
                                    if (onAbort !== undefined)
                                        signal.removeEventListener('abort', onAbort);
                                }
                            }
                            if (isAborted(signal) || lease !== this.mcpLease || lease?.signal.aborted)
                                return { action: 'cancel' };
                            if (automatic !== undefined)
                                return automatic;
                            const hostToolName = this.mcpLease?.elicitationToolName?.(params, toolCall);
                            return await this.options.onElicitationRequest(params, signal, hostToolName, hostToolName === undefined ? undefined : toolCall);
                        }
                        finally {
                            this.pendingQuestions -= 1;
                        }
                    },
                }),
            ...(this.options.qwenTaskJobs === undefined
                ? {}
                : {
                    onQwenTurnStart: (params) => this.startAgentTurn(params),
                    onQwenTurnEnd: (params) => {
                        this.endAgentTurn(params);
                    },
                    onQwenActiveWork: () => this.updateAgentTurnWork(),
                }),
            onSessionUpdate: (notification) => {
                if (connectionAbort.signal.aborted)
                    return;
                this.stageSessionCreationUpdate(connection, connectionAbort, notification);
                this.routeAgentTurnUpdate(notification);
                this.applyUpdate(notification);
                this.replayHandler?.(notification);
                this.options.onSessionUpdate?.(notification);
            },
        });
        starting.connection = connection;
        try {
            await connection.initialize({ signal: setupSignal });
            this.mcpKey = this.options.mcpKey?.();
            this.mcpLease ??= await this.options.createMcpLease?.(connection.agentCapabilities);
            setupSignal.throwIfAborted();
            this.connection = connection;
            this.connectionAbort = connectionAbort;
        }
        catch (error) {
            await connection.close().catch(() => undefined);
            await this.mcpLease?.close().catch(() => undefined);
            this.mcpLease = undefined;
            this.launch = undefined;
            throw error;
        }
    }
    applySessionSnapshot(snapshot) {
        if (snapshot.configOptions !== undefined && snapshot.configOptions !== null)
            this.configSnapshot = acpConfigOptionsSnapshot(snapshot.configOptions);
        if (snapshot.modes?.currentModeId !== undefined &&
            snapshot.modes.currentModeId.length <= ACP_CONFIG_IDENTIFIER_MAX) {
            this.currentMode = snapshot.modes.currentModeId;
            this.modeSnapshot = structuredClone(snapshot.modes);
        }
    }
    applyUpdate(notification) {
        // Claude's negotiated child-session updates share this connection. They
        // are forwarded to the external-subagent projector, but never own the
        // parent's model, mode, usage or permission snapshots.
        if (notification.sessionId !== (this.sessionId ?? this.restoringSessionId))
            return;
        const update = notification.update;
        const diagnosticsEnabled = liveDiagnosticTraceEnabled();
        const diagnosticSessionId = diagnosticsEnabled
            ? (liveDiagnosticId('dsh-session', this.options.diagnosticDshSessionId) ?? 'unavailable')
            : 'unavailable';
        const diagnosticAcpSessionId = diagnosticsEnabled
            ? (liveDiagnosticId('acp-session', notification.sessionId) ?? 'unavailable')
            : undefined;
        if (diagnosticsEnabled && (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update')) {
            const toolNames = new Set([
                'spawn_teammate',
                'send_message',
                'list_agents',
                'wait_agent',
                'interrupt_agent',
                'team_task_create',
                'team_task_list',
                'team_task_get',
                'team_task_update',
            ]);
            const rawToolName = update.name;
            const rawStatus = update.status;
            emitLiveDiagnostic({
                type: 'acp-tool/update',
                sessionId: diagnosticSessionId,
                ...(diagnosticAcpSessionId === undefined ? {} : { acpSessionId: diagnosticAcpSessionId }),
                ...(this.mcpLease?.diagnosticLeaseId === undefined ? {} : { leaseId: this.mcpLease.diagnosticLeaseId }),
                ...(this.promptActive ? { adapterPromptOrdinal: this.promptOrdinal } : {}),
                providerToolCallId: liveDiagnosticId('acp-tool-call', update.toolCallId) ?? 'unavailable',
                tool: typeof rawToolName === 'string' && toolNames.has(rawToolName) ? rawToolName : 'other',
                providerToolStatus: rawStatus === 'pending' || rawStatus === 'in_progress' || rawStatus === 'completed' || rawStatus === 'failed'
                    ? rawStatus
                    : 'unknown',
            });
        }
        if (diagnosticsEnabled && update.sessionUpdate === 'usage_update') {
            emitLiveDiagnostic({
                type: 'acp-usage/update',
                sessionId: diagnosticSessionId,
                ...(diagnosticAcpSessionId === undefined ? {} : { acpSessionId: diagnosticAcpSessionId }),
                ...(this.promptActive ? { adapterPromptOrdinal: this.promptOrdinal } : {}),
                contextUsed: update.used,
                contextSize: update.size,
            });
        }
        if ((this.promptActive || this.liveAgentTurn() !== undefined) &&
            notification.sessionId === this.sessionId &&
            (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update')) {
            // Keep permission enrichment prompt- and session-scoped. Kimi streams
            // tool arguments before requesting permission, so the map is cleared at
            // every turn boundary and can never authorize data from another turn.
            const snapshots = this.promptToolSnapshots;
            if (snapshots !== undefined)
                snapshots.set(update.toolCallId, mergeToolCallSnapshot(snapshots.get(update.toolCallId), update));
        }
        if (update.sessionUpdate === 'config_option_update')
            this.configSnapshot = acpConfigOptionsSnapshot(update.configOptions);
        if (update.sessionUpdate === 'current_mode_update') {
            if (update.currentModeId.length <= ACP_CONFIG_IDENTIFIER_MAX) {
                this.currentMode = update.currentModeId;
                if (this.modeSnapshot !== undefined)
                    this.modeSnapshot = { ...this.modeSnapshot, currentModeId: update.currentModeId };
            }
        }
        if (update.sessionUpdate === 'usage_update') {
            const cost = update.cost;
            this.usageSnapshot = {
                used: update.used,
                size: update.size,
                ...(cost === undefined
                    ? {}
                    : { cost: cost === null ? null : { amount: cost.amount, currency: cost.currency } }),
            };
        }
    }
    ensureQwenTasks() {
        if (this.qwenTasks !== undefined)
            return this.qwenTasks;
        const startJob = this.options.qwenTaskJobs;
        const connection = this.connection;
        const sessionId = this.sessionId;
        if (startJob === undefined ||
            connection === undefined ||
            sessionId === undefined ||
            connection.agentInfo?.name !== QWEN_AGENT_NAME)
            return undefined;
        this.qwenTasks = new QwenBackgroundTasks({
            startJob,
            log: (message) => console.warn(`dsh-acp: ${message}`),
            listTasks: async () => {
                if (connection !== this.connection || connection.isClosed)
                    return undefined;
                return qwenTaskSnapshots(await connection.extRequest('qwen/status/session/tasks', { sessionId }));
            },
            cancelTask: async (taskId, taskKind) => {
                if (connection !== this.connection || connection.isClosed)
                    throw new Error('Qwen connection is unavailable');
                return await connection.extRequest('qwen/control/session/task/cancel', { sessionId, taskId, taskKind });
            },
        });
        return this.qwenTasks;
    }
    notifyAgentTurnWaiters() {
        for (const wake of [...this.agentTurnWaiters])
            wake();
    }
    /** Resolve on the next Agent-turn state change or after `ms`. */
    agentTurnChange(ms, signal) {
        return new Promise((resolve) => {
            let timer;
            const wake = () => {
                if (timer !== undefined)
                    clearTimeout(timer);
                this.agentTurnWaiters.delete(wake);
                signal?.removeEventListener('abort', wake);
                resolve();
            };
            timer = setTimeout(wake, Math.max(1, ms));
            this.agentTurnWaiters.add(wake);
            signal?.addEventListener('abort', wake, { once: true });
        });
    }
    liveAgentTurn() {
        const last = this.agentTurns.at(-1);
        return last !== undefined && last.ended === undefined ? last : undefined;
    }
    startAgentTurn(params) {
        const notFound = () => {
            throw RequestError.methodNotFound('_qwencode/start_turn');
        };
        if (params.sessionId !== this.sessionId)
            return { accepted: false };
        if (this.agentTurnFailure !== undefined)
            return { accepted: false };
        // Only background notification turns are adopted; others keep Qwen's own fallback.
        if (params.source !== 'background_notification')
            return notFound();
        // A host prompt owns the session; Qwen retries the notification after it.
        if (this.promptClaimed && !this.awaitingAgentTurn)
            return { accepted: false };
        if (this.liveAgentTurn() !== undefined)
            return { accepted: false };
        const tasks = this.ensureQwenTasks();
        if (tasks === undefined)
            return notFound();
        const turn = this.createAgentTurn(params.turnId, true, params.taskId);
        // A host call already waiting adopts it directly; otherwise the task's
        // native job settles unawaited and DSH wakes the idle agent.
        if (!this.awaitingAgentTurn && !tasks.wake(params))
            return notFound();
        this.agentTurns.push(turn);
        this.armAgentTurnWatchdog(turn);
        this.armAgentTurnAdoptionWatchdog(turn);
        this.promptToolSnapshots ??= new Map();
        this.connection?.setAgentTurnActive(params.sessionId, true);
        this.notifyAgentTurnWaiters();
        return { accepted: true };
    }
    createAgentTurn(turnId, announced, taskId) {
        const connection = this.connection;
        const sessionId = this.sessionId;
        if (connection === undefined || sessionId === undefined)
            throw new Error('ACP automatic turn has no owner');
        let resolveEnded;
        const endedPromise = new Promise((resolve) => {
            resolveEnded = resolve;
        });
        const turn = {
            turnId,
            sessionId,
            connection,
            ...(taskId === undefined ? {} : { taskId }),
            announced,
            incomplete: false,
            buffer: [],
            listener: undefined,
            ended: undefined,
            endedPromise,
            workSeq: this.connection?.qwenActiveWorkSnapshot?.seq ?? 0,
            workReported: false,
            workFinished: false,
            shellTools: new Map(),
            end: (outcome) => {
                if (turn.ended !== undefined)
                    return;
                turn.ended = outcome;
                if (turn.idleTimer !== undefined)
                    clearTimeout(turn.idleTimer);
                if (turn.adoptionTimer !== undefined)
                    clearTimeout(turn.adoptionTimer);
                resolveEnded(outcome);
            },
        };
        return turn;
    }
    endAgentTurn(params) {
        if (params.sessionId !== this.sessionId)
            return;
        const turn = this.agentTurns.find((candidate) => candidate.turnId === params.turnId);
        if (turn === undefined)
            return;
        if (params.reason === 'end_turn' && turn.incomplete) {
            this.finishAgentTurn(turn, { error: new AcpAgentTurnOutcomeError('incomplete-turn') });
            return;
        }
        this.finishAgentTurn(turn, params.reason !== undefined && ACP_STOP_REASONS.has(params.reason)
            ? { stopReason: params.reason }
            : { error: new AcpAgentTurnOutcomeError('unrecognized-end-reason') });
    }
    finishAgentTurn(turn, outcome) {
        if (turn.ended !== undefined)
            return;
        turn.end(outcome);
        if ('error' in outcome && this.agentTurnFailure === undefined)
            this.agentTurnFailure = {
                view: { acpSessionId: turn.sessionId, turnId: turn.turnId, error: outcome.error },
                turn,
                // Earlier fast-ended turns may also still be waiting for the Host.
                // Preserve their ordered prefix rather than losing it on transport close.
                prefix: this.agentTurns.filter((candidate) => candidate.listener === undefined || candidate === turn),
            };
        const sessionId = this.sessionId;
        if (sessionId !== undefined && this.liveAgentTurn() === undefined)
            this.connection?.setAgentTurnActive(sessionId, false);
        if (turn.listener === undefined) {
            // Not adopted yet: keep a bounded record for the woken host turn only.
            const stale = setTimeout(() => {
                if (turn.listener === undefined)
                    this.agentTurns = this.agentTurns.filter((candidate) => candidate !== turn);
            }, 120_000);
            stale.unref?.();
        }
        this.notifyAgentTurnWaiters();
    }
    routeAgentTurnUpdate(notification) {
        if (this.agentTurnFailure !== undefined ||
            notification.sessionId !== this.sessionId ||
            this.connection?.isClosed === true ||
            this.connection?.agentInfo?.name !== QWEN_AGENT_NAME)
            return;
        const completion = qwenTaskCompletion(notification);
        if (completion !== undefined) {
            this.ensureQwenTasks()?.complete(completion, this.wirePromptActive);
            return;
        }
        let turn = this.liveAgentTurn();
        if (this.wirePromptActive && turn?.announced !== false && scheduledTurnLabel(notification.update) === undefined)
            return;
        if (turn === undefined) {
            // Qwen runs cron/loop turns (and announced turns it fell back on) with
            // no start/end markers. Adopt them like a background turn instead of
            // dropping their output and failing their approvals. A scheduled echo
            // may arrive while the finishing prompt is still on the wire.
            if (this.promptClaimed && !this.awaitingAgentTurn && scheduledTurnLabel(notification.update) === undefined)
                return;
            if (!isTurnContent(notification.update))
                return;
            turn = this.startUnannouncedTurn(notification);
            if (turn === undefined)
                return;
        }
        // A cancellation can carry the same marker. Latch it without settling so
        // the explicit terminal receipt retains its own non-success semantics.
        if (turn.announced && isIncompleteQwenTurnUpdate(notification.update, turn.turnId))
            turn.incomplete = true;
        if (!turn.announced || isOwnedQwenTurnUpdate(notification.update, turn.turnId)) {
            this.trackAgentTurnUpdate(turn, notification.update);
        }
        if (turn.listener !== undefined)
            turn.listener(notification);
        else if (turn.buffer.length < AGENT_TURN_BUFFER_MAX)
            turn.buffer.push(notification);
    }
    unannouncedSeq = 0;
    startUnannouncedTurn(notification) {
        const tasks = this.ensureQwenTasks();
        const sessionId = this.sessionId;
        if (tasks === undefined || sessionId === undefined)
            return undefined;
        this.unannouncedSeq += 1;
        const turn = this.createAgentTurn(`unannounced:${String(this.unannouncedSeq)}`, false);
        if (!this.awaitingAgentTurn &&
            !tasks.wake({ label: scheduledTurnLabel(notification.update) ?? 'Qwen automatic turn' }))
            return undefined;
        this.agentTurns.push(turn);
        this.armAgentTurnAdoptionWatchdog(turn);
        this.promptToolSnapshots ??= new Map();
        this.connection?.setAgentTurnActive(sessionId, true);
        this.notifyAgentTurnWaiters();
        return turn;
    }
    /** Request/usage markers end model rounds, not the tool/Stop-hook work after them. */
    trackAgentTurnUpdate(turn, update) {
        if (turn.workFinished)
            return;
        if (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update') {
            const known = turn.shellTools.get(update.toolCallId);
            const shell = update.kind === 'execute' || update._meta?.toolName === 'run_shell_command' || known !== undefined;
            if (shell && known !== 'settled') {
                const status = update.status;
                turn.shellTools.set(update.toolCallId, status === 'completed' || status === 'failed'
                    ? 'settled'
                    : status === 'in_progress'
                        ? 'running'
                        : (known ?? 'pending'));
            }
        }
        this.armAgentTurnWatchdog(turn);
    }
    ownsAgentTurn(turn) {
        return this.connection === turn.connection && this.sessionId === turn.sessionId && turn.ended === undefined;
    }
    agentTurnHasHostWork(turn) {
        return (this.pendingQuestions > 0 ||
            this.hasPendingHostCalls() ||
            turn.connection.hasPendingAgentTurnHostOperations(turn.sessionId));
    }
    failAgentTurnReporting(turn) {
        if (!this.ownsAgentTurn(turn))
            return;
        this.finishAgentTurn(turn, { error: new AcpAgentTurnOutcomeError('missing-terminal') });
        // Capture this generation; an old timer may never close a replacement connection.
        void turn.connection.close().catch(() => undefined);
    }
    armAgentTurnAdoptionWatchdog(turn) {
        if (turn.adoptionTimer !== undefined)
            clearTimeout(turn.adoptionTimer);
        turn.adoptionTimer = setTimeout(() => {
            if (!this.ownsAgentTurn(turn) || turn.listener !== undefined)
                return;
            if (this.agentTurnHasHostWork(turn) || this.promptActive || this.awaitingAgentTurn)
                this.armAgentTurnAdoptionWatchdog(turn);
            else
                this.failAgentTurnReporting(turn);
        }, this.options.agentTurnAdoptionMs ?? AGENT_TURN_ADOPTION_MAX_MS);
        turn.adoptionTimer.unref?.();
    }
    armAgentTurnWatchdog(turn) {
        if (turn.idleTimer !== undefined)
            clearTimeout(turn.idleTimer);
        const interval = turn.connection.qwenActiveWorkIntervalMs;
        turn.idleTimer = setTimeout(() => {
            if (!this.ownsAgentTurn(turn))
                return;
            // An unanswered human question can legitimately remain open. Missing
            // reporting otherwise makes the outcome unknown, never end_turn.
            if (this.agentTurnHasHostWork(turn))
                this.armAgentTurnWatchdog(turn);
            else
                this.failAgentTurnReporting(turn);
        }, this.options.unannouncedIdleMs ??
            (interval === undefined || (turn.announced && !turn.workReported) ? 180_000 : interval * 3));
        turn.idleTimer.unref?.();
    }
    updateAgentTurnWork() {
        const turn = this.liveAgentTurn();
        const snapshot = this.connection?.qwenActiveWorkSnapshot;
        const interval = this.connection?.qwenActiveWorkIntervalMs;
        if (turn === undefined || snapshot === undefined || interval === undefined || snapshot.seq <= turn.workSeq)
            return;
        turn.workSeq = snapshot.seq;
        const session = snapshot.sessions.find((candidate) => candidate.sessionId === turn.sessionId);
        if (turn.workFinished)
            return;
        if (turn.announced && session?.finishedBackgroundTurnId === turn.turnId) {
            // An explicit finished execution is not a stop reason. Give its ordered
            // terminal receipt a reporting window; missing receipt stays unknown.
            turn.workFinished = true;
            turn.workReported = true;
            this.armAgentTurnWatchdog(turn);
            return;
        }
        const active = session?.holds.some((hold) => (!turn.announced && hold.category === 'session' && hold.id === 'session:active-turn') ||
            (turn.announced && hold.category === 'notification' && hold.id === turn.taskId) ||
            (turn.announced &&
                hold.category === 'shell' &&
                hold.id === 'background-shells' &&
                [...turn.shellTools.values()].includes('running'))) === true;
        if (active) {
            turn.workReported = true;
            this.armAgentTurnWatchdog(turn);
            return;
        }
        // Even a fresh active -> idle transition says nothing about success, failure,
        // or cancellation. Keep waiting for an explicit terminal outcome; if it never
        // arrives, the watchdog preserves uncertainty instead of admitting follow-up.
    }
    async waitForAdoption() {
        const deadline = Date.now() + AGENT_TURN_ADOPTION_MAX_MS;
        while (!this.promptActive &&
            this.liveAgentTurn() !== undefined &&
            Date.now() < deadline &&
            this.connection?.isClosed !== true) {
            await this.agentTurnChange(Math.min(1_000, deadline - Date.now()));
        }
    }
    /** Oldest unadopted Agent turn, waiting briefly for Qwen's announcement. */
    async nextAgentTurn(signal) {
        const pick = () => this.agentTurns.find((turn) => turn.listener === undefined);
        const deadline = Date.now() + (this.options.agentTurnWaitMs ?? 5_000);
        this.awaitingAgentTurn = true;
        try {
            let turn = pick();
            while (turn === undefined && !signal.aborted && Date.now() < deadline && this.connection?.isClosed !== true) {
                await this.agentTurnChange(deadline - Date.now(), signal);
                turn = pick();
            }
            return turn;
        }
        finally {
            this.awaitingAgentTurn = false;
        }
    }
    /** Present an Agent-initiated turn as the current prompt until it ends. */
    adoptAgentTurn(connection, turn, deliver) {
        if (turn.adoptionTimer !== undefined)
            clearTimeout(turn.adoptionTimer);
        for (const notification of turn.buffer.splice(0))
            deliver(notification);
        turn.listener = deliver;
        this.notifyAgentTurnWaiters();
        return Promise.race([turn.endedPromise, connection.failed]).then((outcome) => {
            if ('error' in outcome)
                throw outcome.error;
            return { stopReason: outcome.stopReason };
        });
    }
    releaseAgentTurn(connection, sessionId, turn) {
        if (turn.idleTimer !== undefined)
            clearTimeout(turn.idleTimer);
        if (turn.adoptionTimer !== undefined)
            clearTimeout(turn.adoptionTimer);
        turn.listener = () => undefined;
        this.agentTurns = this.agentTurns.filter((candidate) => candidate !== turn);
        if (this.liveAgentTurn() === undefined)
            connection.setAgentTurnActive(sessionId, false);
    }
    throwPendingAgentTurnFailure(deliver) {
        const failed = this.agentTurnFailure;
        if (failed === undefined)
            return;
        for (const turn of failed.prefix) {
            for (const notification of turn.buffer.splice(0))
                deliver(notification);
            turn.listener = () => undefined;
        }
        this.agentTurns = this.agentTurns.filter((turn) => !failed.prefix.includes(turn));
        throw failed.view.error;
    }
    permissionSignal() {
        const connectionSignal = this.connectionAbort?.signal;
        const promptLifetimeSignal = this.promptAbort?.signal;
        const promptSignal = this.promptSignal;
        const signals = [connectionSignal, promptLifetimeSignal, this.promptPhaseAbort?.signal, promptSignal].filter((signal) => signal !== undefined);
        if (signals.length === 0)
            return undefined;
        if (signals.length === 1)
            return signals[0];
        return AbortSignal.any(signals);
    }
    async handlePermissionRequest(params) {
        const cancelled = () => ({ outcome: { outcome: 'cancelled' } });
        // A Qwen-initiated turn may ask before the woken host turn has adopted it.
        if (!this.promptActive && params.sessionId === this.sessionId && this.liveAgentTurn() !== undefined)
            await this.waitForAdoption();
        if (!this.promptActive || this.sessionId === undefined || params.sessionId !== this.sessionId)
            return cancelled();
        const handler = this.options.onPermissionRequest;
        if (handler === undefined)
            return cancelled();
        const signal = this.permissionSignal();
        if (isAborted(signal))
            return cancelled();
        if (this.connection?.agentInfo?.name === QWEN_AGENT_NAME && isQwenUserQuestion(params)) {
            // A question is not an approval: never run it through the tool approval
            // policy (Auto must not "approve" it with an empty answer).
            const ask = this.options.onQwenQuestion;
            if (ask === undefined)
                return cancelled();
            return await raceAbort(ask(params, signal), signal, cancelled);
        }
        const request = {
            ...params,
            toolCall: await completePermissionToolCall(this.promptToolSnapshots, params.toolCall, signal),
        };
        const lease = this.mcpLease;
        const inspectPromise = Promise.resolve(lease?.inspectPermission?.(request));
        let inspected;
        if (signal === undefined)
            inspected = await inspectPromise;
        else {
            const abortToken = Symbol('permission-abort');
            let onAbort;
            const aborted = new Promise((resolve) => {
                onAbort = () => resolve(abortToken);
                if (isAborted(signal))
                    onAbort();
                else
                    signal.addEventListener('abort', onAbort, { once: true });
            });
            try {
                const result = await Promise.race([inspectPromise, aborted]);
                if (result === abortToken)
                    return cancelled();
                inspected = result;
            }
            finally {
                if (onAbort !== undefined)
                    signal.removeEventListener('abort', onAbort);
            }
        }
        if (this.options.onPermissionCheck !== undefined) {
            // Audit stores only the bounded decision facts, never capability names or addresses.
            try {
                await this.options.onPermissionCheck(inspected ?? { reason: 'bridge-unavailable' }, request);
            }
            catch {
                return cancelled();
            }
        }
        // A matching DSH title alone grants no identity or Auto approval, but it
        // is ambiguous ownership and must retain the bridge's revocation fence.
        const ownedByBridge = inspected?.reason !== 'identity-unmatched' || inspected.titleMatchesCurrentTool === true;
        if (isAborted(signal) ||
            (ownedByBridge && (lease !== this.mcpLease || lease?.signal.aborted)) ||
            (inspected?.reason === 'auto-approved' && lease?.validatePermissionDecision?.(request) === false))
            return cancelled();
        // Use the very policy resolution that was audited above. Re-reading here
        // could turn an audited Ask into an automatic approval (or the reverse).
        const bridgeDecision = inspected === undefined ? await lease?.permission(request) : inspected.response;
        if (bridgeDecision !== undefined)
            return bridgeDecision;
        // Resolve bridge decisions against the original wire identity first; normalize
        // only the request shown by the native approval surface.
        // Native Agent permissions outlive an unrelated MCP bridge. A permission
        // for this bridge instead remains revocable while the user is answering;
        // a late answer cannot authorize a retired capability.
        const approvalSignal = ownedByBridge && lease !== undefined
            ? AbortSignal.any(signal === undefined ? [lease.signal] : [signal, lease.signal])
            : signal;
        const pending = handler({ ...request, toolCall: lease?.presentTool?.(request.toolCall) ?? request.toolCall }, approvalSignal);
        if (approvalSignal === undefined)
            return await pending;
        let onAbort;
        const aborted = new Promise((resolve) => {
            onAbort = () => {
                resolve(cancelled());
            };
            if (isAborted(approvalSignal))
                onAbort();
            else
                approvalSignal.addEventListener('abort', onAbort, { once: true });
        });
        try {
            // The native question service receives the same signal, but the ACP RPC
            // must still settle if a host implementation fails to honor it. The race
            // also observes a late handler rejection, avoiding an unhandled promise.
            const response = await Promise.race([pending, aborted]);
            // A resolved answer can win the race before cancellation's microtask
            // runs. Recheck the owning lifetime at the actual RPC reply boundary.
            if (isAborted(approvalSignal) || (ownedByBridge && lease !== this.mcpLease))
                return cancelled();
            return response;
        }
        finally {
            if (onAbort !== undefined)
                approvalSignal.removeEventListener('abort', onAbort);
        }
    }
}
//# sourceMappingURL=session-runtime.js.map