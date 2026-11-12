var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/** Bounded cleanup of the host provider's managed range, independent of command outcome. */
import { deadline } from '@deepseek-ai/dsh-timeout';
import { waitWithin } from "./timeout.js";
export async function stopSubprocess(handle, options) {
    const warn = options.warn ??
        ((message) => {
            console.warn(message);
        });
    const observe = async (ms) => {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            // Zero means the next timer tick in ACP; zero disables the host deadline.
            const budget = __addDisposableResource(env_1, deadline(options.signal, Math.max(1, ms), 'ACP_PROCESS_EXIT_TIMEOUT'), false);
            return (await waitWithin(handle.waitForExit(budget.signal), Math.max(1, ms))) === true;
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    };
    try {
        handle.stdin?.end();
    }
    catch {
        /* Continue cleanup after a broken pipe. */
    }
    try {
        if (await observe(options.eofGraceMs))
            return true;
    }
    catch {
        warn('dsh-acp: subprocess exit observation failed; attempting managed-range termination');
    }
    try {
        handle.terminate();
    }
    catch {
        warn('dsh-acp: subprocess termination request failed; checking managed-range exit');
    }
    try {
        if (await observe(options.exitWaitMs))
            return true;
    }
    catch {
        warn('dsh-acp: subprocess provider could not observe managed-range exit');
    }
    warn('dsh-acp: managed-range exit was not confirmed within the cleanup budget; host cleanup remains responsible');
    return false;
}
//# sourceMappingURL=cleanup.js.map