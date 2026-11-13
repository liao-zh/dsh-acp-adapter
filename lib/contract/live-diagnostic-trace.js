const stateKey = Symbol.for('@zaimokuza/dsh-acp-adapter/live-diagnostic-trace/v1');
function currentState() {
    return globalThis[stateKey];
}
/** Install an explicit test-owned sink. It is not enabled by default. */
export function installLiveDiagnosticTrace(sink) {
    const target = globalThis;
    const state = { sink, failures: 0 };
    target[stateKey] = state;
    return () => {
        if (target[stateKey] === state)
            delete target[stateKey];
    };
}
/** Hash through the currently installed test sink; raw IDs never enter its event stream. */
export function liveDiagnosticId(kind, value) {
    if (value === undefined || value === null)
        return 'unavailable';
    try {
        const id = currentState()?.sink.id(kind, value);
        return typeof id === 'string' && (/^h:[a-f0-9]{24}$/.test(id) || id === 'unavailable') ? id : 'unavailable';
    }
    catch {
        noteFailure();
        return undefined;
    }
}
/** Fingerprint input through the test run's in-memory HMAC key. */
export function liveDiagnosticFingerprint(kind, value) {
    try {
        const fingerprint = currentState()?.sink.fingerprint(kind, value);
        if (fingerprint === undefined)
            return undefined;
        const hmac = fingerprint.hmac;
        const bytes = fingerprint.bytes;
        const complete = fingerprint.complete;
        return {
            hmac: typeof hmac === 'string' && /^h:[a-f0-9]{24}$/.test(hmac) ? hmac : 'unavailable',
            bytes: typeof bytes === 'number' && Number.isSafeInteger(bytes) && bytes >= 0 ? bytes : null,
            complete: complete === true && typeof hmac === 'string' && /^h:[a-f0-9]{24}$/.test(hmac),
        };
    }
    catch {
        noteFailure();
        return undefined;
    }
}
/** Count diagnostic preparation failures without allowing them to affect host work. */
export function noteLiveDiagnosticFailure() {
    noteFailure();
}
/** Safely collect diagnostic fields; the factory is skipped without a sink. */
export function collectLiveDiagnostic(factory) {
    const state = currentState();
    if (state === undefined)
        return undefined;
    try {
        return factory();
    }
    catch {
        state.failures += 1;
        return undefined;
    }
}
/** A diagnostics sink is observational only; callback failures never escape into Host behavior. */
export function emitLiveDiagnostic(event) {
    const state = currentState();
    if (state === undefined)
        return;
    try {
        const result = state.sink(event);
        if (result !== undefined && typeof result.then === 'function') {
            void Promise.resolve(result).catch(() => {
                state.failures += 1;
            });
        }
    }
    catch {
        state.failures += 1;
    }
}
export function liveDiagnosticTraceFailureCount() {
    return currentState()?.failures ?? 0;
}
export function liveDiagnosticTraceEnabled() {
    return currentState() !== undefined;
}
function noteFailure() {
    const state = currentState();
    if (state !== undefined)
        state.failures += 1;
}
//# sourceMappingURL=live-diagnostic-trace.js.map