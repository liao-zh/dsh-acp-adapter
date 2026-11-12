import { RemoteSnapshotStream } from '@deepseek-ai/dsh-api-gateway/client';
/** Current recovery facts; reconnect replaces the baseline rather than replaying history. */
function recoveryStream(remote, factory, sessionId, changed, failed) {
    return new RemoteSnapshotStream(factory.$stream({
        name: 'ACP recovery facts',
        open: (signal) => remote.recoveryFollow(sessionId, signal),
        ended: () => new Error('ACP recovery stream ended'),
        carrierFailed: (error) => failed(error, 'carrier'),
    }), {
        name: 'ACP recovery facts',
        isSnapshot: (frame) => frame.type === 'opened',
        replace: (frame) => changed(frame.snapshot),
        update: (frame) => changed(frame.snapshot),
        failed: (error) => failed(error, 'terminal'),
    });
}
const recoveryRetryDelays = [250, 500, 1_000, 2_000, 4_000, 8_000];
// Only a connection that stayed up this long resets backoff; open-then-drop flapping keeps escalating.
const recoveryHealthyResetMs = 30_000;
const stableRecoveryErrorCodes = new Set([
    'dsh-acp/config',
    'dsh-acp/not-installed',
    'dsh-acp/auth-required',
    'dsh-acp/protocol-incompatible',
    'dsh-acp/user-rejected',
    'gateway/bad-request',
]);
function isStableRecoveryError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string' &&
        stableRecoveryErrorCodes.has(error.code));
}
/** Reopen terminally failed consumers only after the prior snapshot stream is quiescent. */
export function recoveringRecoveryStream(remote, factory, sessionId, changed, stateChanged) {
    let stopped = false;
    let started = false;
    let current;
    let retryTimer;
    let retiring = Promise.resolve();
    let attempt = 0;
    let connectedAt;
    const startNext = () => {
        if (stopped)
            return;
        connectedAt = undefined;
        let stream;
        stream = recoveryStream(remote, factory, sessionId, (snapshot) => {
            if (stopped || current !== stream)
                return;
            connectedAt ??= Date.now();
            stateChanged('connected');
            changed(snapshot);
        }, (error, source) => {
            if (stopped || current !== stream)
                return;
            const stable = isStableRecoveryError(error);
            if (source === 'carrier' && !stable) {
                stateChanged('reconnecting', error);
                return;
            }
            current = undefined;
            stateChanged(stable ? 'unavailable' : 'reconnecting', error);
            const close = stream.dispose().catch(() => { });
            retiring = close;
            void close.then(() => {
                if (stopped)
                    return;
                if (stable) {
                    stateChanged('unavailable', error, true);
                    return;
                }
                if (connectedAt !== undefined && Date.now() - connectedAt >= recoveryHealthyResetMs)
                    attempt = 0;
                const delay = recoveryRetryDelays[Math.min(attempt, recoveryRetryDelays.length - 1)];
                attempt++;
                retryTimer = setTimeout(() => {
                    retryTimer = undefined;
                    startNext();
                }, delay);
            });
        });
        current = stream;
        stream.start();
    };
    return {
        start() {
            if (started || stopped)
                return;
            started = true;
            startNext();
        },
        async dispose() {
            if (stopped)
                return;
            stopped = true;
            if (retryTimer !== undefined) {
                clearTimeout(retryTimer);
                retryTimer = undefined;
            }
            const stream = current;
            current = undefined;
            if (stream !== undefined)
                await stream.dispose();
            await retiring;
        },
    };
}
//# sourceMappingURL=recovery-stream.js.map