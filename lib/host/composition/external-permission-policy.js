import { Service } from '@deepseek-ai/cordis';
import { agentCarrier } from '@deepseek-ai/dsh-agent';
function validDecision(value) {
    return (value === 'allow-once' ||
        value === 'deny-once' ||
        value === 'not-applicable' ||
        value === 'cancelled' ||
        value === 'failed');
}
function freezeFacts(value) {
    if (value === null || typeof value !== 'object' || Object.isFrozen(value))
        return;
    // ACP facts are JSON. Mutable built-ins such as Map remain mutable after
    // Object.freeze(), so reject them instead of claiming an immutable snapshot.
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
        throw new TypeError('ACP permission facts must contain only JSON objects and arrays');
    }
    Object.freeze(value);
    for (const child of Object.values(value))
        freezeFacts(child);
}
/**
 * Host-local dispatch only. The existing permission handler owns asked/decided
 * audit, response mapping, and complete human fallback; this service owns no
 * authorization state or persistence.
 */
export default class AcpPermissionPolicy extends Service {
    accepting = true;
    lifetime = new AbortController();
    active = new Set();
    constructor(ctx) {
        super(ctx, 'acpPermissionPolicy');
        ctx.effect(() => async () => {
            this.accepting = false;
            this.lifetime.abort();
            // Callers are cancelled immediately. Providers must observe the signal
            // and settle; an in-process callback cannot safely be forcibly killed.
            await Promise.allSettled([...this.active]);
        }, 'dsh-acp: drain registered permission policies');
    }
    evaluate(request) {
        if (!this.accepting || request.signal?.aborted)
            return Promise.resolve('cancelled');
        const signal = AbortSignal.any([this.lifetime.signal, ...(request.signal ? [request.signal] : [])]);
        let input;
        try {
            // Capture before yielding: mutation of the original request between
            // evaluate() and provider dispatch must not change the authorization facts.
            const params = structuredClone(request.params);
            freezeFacts(params);
            input = Object.freeze({
                agent: request.agent,
                requestId: request.requestId,
                profile: request.profile,
                params,
                signal,
            });
        }
        catch {
            return Promise.resolve(signal.aborted ? 'cancelled' : 'failed');
        }
        const result = Promise.withResolvers();
        const abort = () => result.resolve('cancelled');
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted)
            abort();
        const settled = Promise.resolve()
            .then(async () => {
            if (signal.aborted)
                return 'cancelled';
            const decision = await this.ctx.waterfall(agentCarrier(input.agent), 'dsh-acp/permission-policy', input, async () => 'not-applicable');
            return validDecision(decision) ? decision : 'failed';
        })
            .catch(() => 'failed')
            .then((decision) => {
            result.resolve(signal.aborted ? 'cancelled' : decision);
        })
            .finally(() => {
            signal.removeEventListener('abort', abort);
            this.active.delete(settled);
        });
        this.active.add(settled);
        return result.promise;
    }
}
//# sourceMappingURL=external-permission-policy.js.map