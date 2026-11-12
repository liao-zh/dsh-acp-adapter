import type { SubprocessSeam } from '../../runtime/process/subprocess.ts';
import type { AcpTerminalHandlers } from '../../protocol/v1/types.ts';
import type { AcpTerminalAuditData } from '../../domain/policy/events.ts';
import type { AcpTerminalJobStarter } from './terminal-job.ts';
/** Keep individual terminal snapshots bounded even when an agent omits a limit. */
export declare const ACP_TERMINAL_DEFAULT_OUTPUT_BYTES = 1048576;
export declare const ACP_TERMINAL_MAX_OUTPUT_BYTES: number;
export declare const ACP_TERMINAL_RELEASE_WAIT_MS = 10000;
export declare const ACP_TERMINAL_MAX_ACTIVE = 64;
export interface AcpTerminalHandlersOptions {
    readonly subprocess: SubprocessSeam;
    readonly profileId: string;
    readonly dshSessionId: string;
    readonly cwd: string;
    readonly env: Readonly<Record<string, string>>;
    readonly audit?: (event: AcpTerminalAuditData) => Promise<void>;
    /** In-memory process fact; must not wait behind durable audit I/O. */
    readonly onExit?: (event: AcpTerminalAuditData) => void;
    readonly onAuditError?: (error: unknown, event: AcpTerminalAuditData) => void;
    readonly releaseWaitMs?: number;
    readonly startJob?: AcpTerminalJobStarter | undefined;
}
/** Create a per-connection ACP v1 terminal host. */
export declare function createAcpTerminalHandlers(options: AcpTerminalHandlersOptions): AcpTerminalHandlers;
//# sourceMappingURL=terminal.d.ts.map