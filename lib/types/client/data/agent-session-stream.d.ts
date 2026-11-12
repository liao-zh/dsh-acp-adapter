import { RemoteSnapshotStream, type RemoteStreamFactory } from '@deepseek-ai/dsh-api-gateway/client';
import type { AcpAgentSessionFrame, AcpAgentSessionSnapshotView } from '../../contract/remote.ts';
import type { AcpRemoteLike } from './acp-remote.ts';
/** A current-state subscription; reconnection replaces the baseline rather than replaying history. */
export declare function agentSessionStream(remote: AcpRemoteLike, factory: RemoteStreamFactory, sessionId: string, changed: (snapshot: AcpAgentSessionSnapshotView | null) => void, unavailable: (error: unknown) => void): RemoteSnapshotStream<Extract<AcpAgentSessionFrame, {
    type: 'opened';
}>, Extract<AcpAgentSessionFrame, {
    type: 'changed';
}>>;
//# sourceMappingURL=agent-session-stream.d.ts.map