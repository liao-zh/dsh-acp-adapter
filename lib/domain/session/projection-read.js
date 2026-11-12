/**
 * Read one adapter-registered unit's internal fold state.
 * @param handle - the registration handle captured when the unit was registered.
 * @param session - Session whose committed events are folded.
 * @returns the projection state at the Session's current cursor.
 */
export function readProjectionState(handle, session) {
    return handle.stateOf(session);
}
/**
 * Read one Host-registered unit's published client view.
 * @param ctx - context that may carry the projection registry.
 * @param session - Session whose committed events are folded.
 * @param key - the Host's client-visible projection unit.
 * @returns the current view, or undefined when no registry or unit is available.
 */
export function readHostProjectionView(ctx, session, key) {
    const projections = ctx.get('sessionProjections', false);
    if (projections === undefined)
        return undefined;
    return projections.snapshot(session, [key]).values[key];
}
//# sourceMappingURL=projection-read.js.map