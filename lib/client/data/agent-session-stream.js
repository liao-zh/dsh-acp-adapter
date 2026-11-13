import { RemoteSnapshotStream } from '@deepseek-ai/dsh-api-gateway/client';
/** A current-state subscription; reconnection replaces the baseline rather than replaying history. */
export function agentSessionStream(remote, factory, sessionId, changed, unavailable) {
    return new RemoteSnapshotStream(factory.$stream({
        name: 'ACP Agent controls',
        open: (signal) => remote.agentSessionFollow(sessionId, signal),
        ended: () => new Error('ACP Agent controls stream ended'),
        carrierFailed: unavailable,
    }), {
        name: 'ACP Agent controls',
        isSnapshot: (frame) => frame.type === 'opened',
        replace: (frame) => changed(frame.snapshot),
        update: (frame) => changed(frame.snapshot),
        failed: unavailable,
    });
}
//# sourceMappingURL=agent-session-stream.js.map