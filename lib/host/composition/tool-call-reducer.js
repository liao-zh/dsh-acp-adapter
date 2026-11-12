/** Pure, prompt-scoped reducer for ACP tool_call patches. */
const terminalStatuses = new Set(['completed', 'failed', 'cancelled']);
function normalizedStatus(value) {
    if (value === undefined || value === null)
        return undefined;
    return value === 'in_progress' ? 'running' : value;
}
/** A bounded-in-scope reducer: one instance belongs to one DSH turn. */
export class AcpToolCallReducer {
    calls = new Map();
    apply(patch, context = {}) {
        const previous = this.calls.get(patch.callId);
        const patchStatus = normalizedStatus(patch.status);
        const failedDuringExternalStop = context.externalSignalAborted === true &&
            patchStatus === 'failed' &&
            (previous?.status === 'pending' || previous?.status === 'running');
        const status = previous !== undefined && terminalStatuses.has(previous.status)
            ? previous.status
            : failedDuringExternalStop
                ? 'cancelled'
                : (patchStatus ?? previous?.status ?? 'pending');
        const next = {
            ...(previous ?? {
                callId: patch.callId,
                status: 'pending',
            }),
            // ACP says omitting a field leaves it unchanged.  `name: null` has the
            // same meaning explicitly; title is required on a created call, so a
            // nullable update cannot replace an established title with no title.
            ...Object.fromEntries(Object.entries(patch).filter(([key, value]) => value !== undefined && !((key === 'name' || key === 'title') && value === null))),
            ...(failedDuringExternalStop ? { providerStatus: 'failed' } : {}),
            status,
        };
        this.calls.set(patch.callId, next);
        return next;
    }
}
//# sourceMappingURL=tool-call-reducer.js.map