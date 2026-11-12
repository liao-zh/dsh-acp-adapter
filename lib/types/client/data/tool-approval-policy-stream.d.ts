import { RemoteSnapshotStream, type RemoteStreamFactory } from '@deepseek-ai/dsh-api-gateway/client';
import type { AcpToolApprovalPolicyFrame, AcpToolApprovalPolicySnapshot } from '../../contract/remote.ts';
import type { AcpRemoteLike } from './acp-remote.ts';
export type { AcpToolApprovalPolicySnapshot as ToolApprovalPolicySnapshot };
/** Current policy subscription, including host-owned fresh ACP sessions. */
export declare function toolApprovalPolicyStream(remote: AcpRemoteLike, factory: RemoteStreamFactory, sessionId: string, changed: (snapshot: AcpToolApprovalPolicySnapshot) => void, unavailable: (error: unknown) => void): RemoteSnapshotStream<Extract<AcpToolApprovalPolicyFrame, {
    type: 'opened';
}>, Extract<AcpToolApprovalPolicyFrame, {
    type: 'changed';
}>>;
//# sourceMappingURL=tool-approval-policy-stream.d.ts.map