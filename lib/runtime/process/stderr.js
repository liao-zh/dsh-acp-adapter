/**
 * stderr 环形缓冲与脱敏（自 acp-client.ts 切出）：行数与总字节双上限；
 * 写入缓冲前脱敏，不在缓冲中保留敏感原文。
 * @module @zaimokuza/dsh-acp-adapter/runtime/process/stderr
 */
export const DEFAULT_STDERR_MAX_LINES = 200;
export const DEFAULT_STDERR_MAX_BYTES = 64 * 1024;
/**
 * 默认 stderr 脱敏：滤常见 token 形状——JWT、GitHub 系令牌、`sk-` 系 API key、
 * Bearer 头、`api_key/token/secret/password=value` 形键值对。
 */
import { redactSecretText } from "../../domain/observability/redaction.js";
export const defaultRedactStderrLine = redactSecretText;
const PRIVATE_KEY_BEGIN = /-----BEGIN ((?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY)-----/u;
const PRIVATE_KEY_SCAN_CARRY = 96;
/** Bounded streaming PEM scanner for frames that may be split, redrawn, or discarded. */
export class StderrPrivateKeyScanner {
    endMarker;
    carry = '';
    constructor(endMarker) {
        this.endMarker = endMarker;
    }
    push(chunk) {
        let input = this.carry + chunk;
        this.carry = '';
        while (input.length > 0) {
            if (this.endMarker !== undefined) {
                const end = input.indexOf(this.endMarker);
                if (end < 0) {
                    this.carry = input.slice(-Math.min(input.length, this.endMarker.length - 1));
                    return;
                }
                input = input.slice(end + this.endMarker.length);
                this.endMarker = undefined;
                continue;
            }
            const begin = PRIVATE_KEY_BEGIN.exec(input);
            if (begin === null) {
                this.carry = input.slice(-Math.min(input.length, PRIVATE_KEY_SCAN_CARRY));
                return;
            }
            this.endMarker = `-----END ${begin[1]}-----`;
            input = input.slice((begin.index ?? 0) + begin[0].length);
        }
    }
    clearCarry() {
        this.carry = '';
    }
    get openEndMarker() {
        return this.endMarker;
    }
}
/** stderr 环形缓冲：行数与总字节双上限；敏感内容不会进入缓冲。 */
export class StderrRing {
    maxLines;
    maxBytes;
    redact;
    lines = [];
    bytes = 0;
    activePrivateKeyEndMarker;
    constructor(maxLines, maxBytes, redact) {
        this.maxLines = maxLines;
        this.maxBytes = maxBytes;
        this.redact = redact;
    }
    push(rawLine) {
        // Keep complete, bounded PEM blocks together so the shared redactor can
        // preserve surrounding diagnostic text. Larger inputs are handled per line.
        if (Buffer.byteLength(rawLine, 'utf8') < this.maxBytes) {
            const inputLines = this.redact(rawLine).split(/\r?\n/u);
            if (rawLine.endsWith('\n'))
                inputLines.pop();
            for (const inputLine of inputLines)
                this.pushRedactedLine(inputLine);
            return;
        }
        const inputLines = rawLine.split(/\r?\n/u);
        if (rawLine.endsWith('\n'))
            inputLines.pop();
        for (const inputLine of inputLines)
            this.pushRawLine(inputLine);
    }
    /** Current PEM state, for preserving it while an oversized line is discarded. */
    get privateKeyEndMarker() {
        return this.activePrivateKeyEndMarker;
    }
    setPrivateKeyEndMarker(endMarker) {
        this.activePrivateKeyEndMarker = endMarker;
    }
    /** Store a safe marker instead of an overlong line and continue PEM protection. */
    pushTruncatedLine(endMarker) {
        this.activePrivateKeyEndMarker = endMarker;
        this.store('<stderr line truncated>');
    }
    pushRawLine(rawLine) {
        const lineBudget = Math.max(0, this.maxBytes - 1);
        if (Buffer.byteLength(rawLine, 'utf8') > lineBudget) {
            const scanner = new StderrPrivateKeyScanner(this.activePrivateKeyEndMarker);
            scanner.push(rawLine);
            this.pushTruncatedLine(scanner.openEndMarker);
            return;
        }
        // The shared redactor removes complete PEM blocks in one pass. Keep this
        // state for key blocks split across pushes.
        for (const inputLine of this.redact(rawLine).split(/\r?\n/u))
            this.pushRedactedLine(inputLine);
    }
    pushRedactedLine(redactedLine) {
        let line = redactedLine;
        if (this.activePrivateKeyEndMarker !== undefined) {
            const end = line.indexOf(this.activePrivateKeyEndMarker);
            if (end === -1)
                return;
            line = line.slice(end + this.activePrivateKeyEndMarker.length);
            this.activePrivateKeyEndMarker = undefined;
            if (line.length === 0)
                return;
        }
        const begin = /-----BEGIN ((?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY)-----/u.exec(line);
        if (begin !== null) {
            const beginAt = begin.index ?? 0;
            const endMarker = `-----END ${begin[1]}-----`;
            const bodyAt = beginAt + begin[0].length;
            if (line.indexOf(endMarker, bodyAt) === -1)
                this.activePrivateKeyEndMarker = endMarker;
            this.store('<redacted-private-key>');
            return;
        }
        this.store(line);
    }
    store(line) {
        // Never keep the tail of an over-long line: truncation can remove a secret's
        // key prefix and make the remaining value look harmless.
        const lineBudget = Math.max(0, this.maxBytes - 1);
        if (Buffer.byteLength(line, 'utf8') > lineBudget)
            line = '<stderr line truncated>';
        this.lines.push(line);
        this.bytes += Buffer.byteLength(line, 'utf8') + 1;
        while (this.lines.length > this.maxLines || this.bytes > this.maxBytes) {
            const dropped = this.lines.shift();
            if (dropped === undefined)
                break;
            this.bytes -= Buffer.byteLength(dropped, 'utf8') + 1;
        }
    }
    snapshot() {
        return [...this.lines];
    }
}
//# sourceMappingURL=stderr.js.map