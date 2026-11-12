import { RemoteSnapshotStream } from '@deepseek-ai/dsh-api-gateway/client';
/** Current policy subscription, including host-owned fresh ACP sessions. */
export function toolApprovalPolicyStream(remote, factory, sessionId, changed, unavailable) {
    return new RemoteSnapshotStream(factory.$stream({
        name: 'DSH tool approval policy',
        open: (signal) => remote.toolApprovalPolicyFollow(sessionId, signal),
        ended: () => new Error('DSH tool approval policy stream ended'),
        carrierFailed: unavailable,
    }), {
        name: 'DSH tool approval policy',
        isSnapshot: (frame) => frame.type === 'opened',
        replace: (frame) => changed(frame.snapshot),
        update: (frame) => changed(frame.snapshot),
        failed: unavailable,
    });
}
//# sourceMappingURL=tool-approval-policy-stream.js.map