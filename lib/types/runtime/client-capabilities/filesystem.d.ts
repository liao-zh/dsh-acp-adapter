import fs from 'node:fs';
import type * as acp from '@agentclientprotocol/sdk';
export declare const ACP_FS_MAX_BYTES: number;
export declare const ACP_FS_MAX_LINES = 20000;
export declare const ACP_FS_MAX_LINE = 1000000;
/** Stable, content-free reason codes for failed filesystem requests. */
export type AcpFileAuditReason = 'invalid-path' | 'not-regular-file' | 'file-too-large' | 'io-error' | 'invalid-utf8' | 'line-limit-exceeded' | 'invalid-line' | 'invalid-limit' | 'aborted' | 'timeout' | 'concurrent-change' | 'content-too-large' | 'invalid-content';
export interface AcpFileOperationAudit {
    readonly operation: 'read' | 'write';
    readonly path: string;
    readonly bytes: number;
    readonly beforeHash: string | null;
    readonly afterHash: string | null;
    readonly outcome: 'ok' | 'error' | 'aborted' | 'timeout' | 'concurrent-change';
    readonly acpSessionId: string;
    readonly profileId: string;
    /** Present for diagnostics on failed requests; never contains file content or OS error text. */
    readonly reason?: AcpFileAuditReason;
    /** Original ACP read window, when supplied and representable as a safe integer. */
    readonly line?: number;
    readonly limit?: number;
}
export interface AcpFileSystemOptions {
    readonly profileId: string;
    readonly signal?: AbortSignal;
    readonly audit?: (event: AcpFileOperationAudit) => void | Promise<void>;
    /** Warning sink for an audit failure after the file operation already happened. */
    readonly onAuditError?: (error: unknown, event: AcpFileOperationAudit) => void | Promise<void>;
    readonly maxBytes?: number;
    /** Per-request wall clock budget; system calls are raced, not magically cancelled. */
    readonly timeoutMs?: number;
    /** Narrow fault-injection seam for deterministic IO deadline tests. */
    readonly io?: {
        readonly beforeRead?: () => Promise<void>;
        readonly beforeWrite?: () => Promise<void>;
        readonly open?: typeof fs.promises.open;
        readonly writeFile?: typeof fs.promises.writeFile;
        readonly rename?: typeof fs.promises.rename;
    };
}
export interface AcpFileSystemHandlers {
    readonly readTextFile: (params: acp.ReadTextFileRequest) => Promise<acp.ReadTextFileResponse>;
    readonly writeTextFile: (params: acp.WriteTextFileRequest) => Promise<acp.WriteTextFileResponse>;
    /** Abort in-flight operations when the ACP connection/session is disposed. */
    readonly dispose: () => void;
}
/** Native Agent Access file handlers. There is no workspace allow-list here by design. */
export declare function createAcpFileSystemHandlers(options: AcpFileSystemOptions): AcpFileSystemHandlers;
//# sourceMappingURL=filesystem.d.ts.map