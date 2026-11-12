/** Locale-safe formatting for host/transport diagnostics shown by plugin UI. */
/** Stable references are safe to retain while locale-specific host prose is not. */
function diagnosticReference(message) {
    if (message === undefined)
        return undefined;
    return (message.match(/acperr-\d{8}T\d{6}Z-[0-9a-z]+-[0-9a-f]{6,16}\b/i)?.[0] ?? message.match(/\bACP_[A-Z0-9_]+\b/)?.[0]);
}
/** Render an optional diagnostic reference as a locale-neutral suffix. */
function diagnosticReferenceSuffix(message) {
    const reference = diagnosticReference(message);
    return reference === undefined ? '' : ` (${reference})`;
}
/**
 * Localize an operation failure without interpolating arbitrary host prose.
 * Agent-authored messages are not passed through this helper.
 */
export function localizedDiagnostic(t, key, rawMessage, params = {}) {
    return t(key, { ...params, reference: diagnosticReferenceSuffix(rawMessage) });
}
//# sourceMappingURL=diagnostics.js.map