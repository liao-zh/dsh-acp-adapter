/**
 * stderr 环形缓冲与脱敏（自 acp-client.ts 切出）：行数与总字节双上限；
 * 写入缓冲前脱敏，不在缓冲中保留敏感原文。
 * @module @zaimokuza/dsh-acp-adapter/runtime/process/stderr
 */
export declare const DEFAULT_STDERR_MAX_LINES = 200;
export declare const DEFAULT_STDERR_MAX_BYTES: number;
/**
 * 默认 stderr 脱敏：滤常见 token 形状——JWT、GitHub 系令牌、`sk-` 系 API key、
 * Bearer 头、`api_key/token/secret/password=value` 形键值对。
 */
import { redactSecretText } from '../../domain/observability/redaction.ts';
export declare const defaultRedactStderrLine: typeof redactSecretText;
/** Bounded streaming PEM scanner for frames that may be split, redrawn, or discarded. */
export declare class StderrPrivateKeyScanner {
    private endMarker;
    private carry;
    constructor(endMarker: string | undefined);
    push(chunk: string): void;
    clearCarry(): void;
    get openEndMarker(): string | undefined;
}
/** stderr 环形缓冲：行数与总字节双上限；敏感内容不会进入缓冲。 */
export declare class StderrRing {
    private readonly maxLines;
    private readonly maxBytes;
    private readonly redact;
    private lines;
    private bytes;
    private activePrivateKeyEndMarker;
    constructor(maxLines: number, maxBytes: number, redact: (line: string) => string);
    push(rawLine: string): void;
    /** Current PEM state, for preserving it while an oversized line is discarded. */
    get privateKeyEndMarker(): string | undefined;
    setPrivateKeyEndMarker(endMarker: string | undefined): void;
    /** Store a safe marker instead of an overlong line and continue PEM protection. */
    pushTruncatedLine(endMarker: string | undefined): void;
    private pushRawLine;
    private pushRedactedLine;
    private store;
    snapshot(): string[];
}
//# sourceMappingURL=stderr.d.ts.map