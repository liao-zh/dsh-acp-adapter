import type { Context } from '@deepseek-ai/cordis';
import type { AcpRecoveryState } from '../../persistence/sidecar.ts';
export interface HostExecutionOwner {
    hasPendingHostCalls?(): boolean;
    hasUncommittedHostFeedback?(): boolean;
    hasRetainedHostFeedback?(): boolean;
    waitForHostCallsSettled?(): Promise<void>;
}
export declare function setSharedRecoveryFallback(root: Context, state: AcpRecoveryState): void;
export declare function getSharedRecoveryFallback(root: Context, sessionId: string): AcpRecoveryState | undefined;
export declare function clearSharedRecoveryFallback(root: Context, sessionId: string): void;
/** Keep draining Host calls visible across profile adapter replacement and plugin reinstallation. */
export declare function retainHostExecutionOwner(root: Context, sessionId: string, owner: HostExecutionOwner): void;
/** Recovery must fail fast while an abandoned transport can still execute or report a tool. */
export declare function assertHostExecutionQuiescent(root: Context, sessionId: string, allowSettledFailure?: boolean): void;
/** Move feedback evidence out of the active gate after an explicit recovery action succeeds. */
export declare function clearHostExecutionOwners(root: Context, sessionId: string): void;
//# sourceMappingURL=host-execution-owners.d.ts.map