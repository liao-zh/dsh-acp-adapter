import { type RemoteStreamFactory } from '@deepseek-ai/dsh-api-gateway/client';
import type { AcpRecoveryView } from '../../contract/remote.ts';
import type { AcpRemoteLike } from './acp-remote.ts';
type RecoveryStreamState = 'connected' | 'reconnecting' | 'unavailable';
/** Reopen terminally failed consumers only after the prior snapshot stream is quiescent. */
export declare function recoveringRecoveryStream(remote: AcpRemoteLike, factory: RemoteStreamFactory, sessionId: string, changed: (snapshot: AcpRecoveryView) => void, stateChanged: (state: RecoveryStreamState, error?: unknown, refreshReady?: boolean) => void): {
    start(): void;
    dispose(): Promise<void>;
};
export {};
//# sourceMappingURL=recovery-stream.d.ts.map