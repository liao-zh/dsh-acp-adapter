/**
 * Interpret the shared Team projection for the panel.
 * @param projection - the Host's `agentTeam` projection, when available.
 * @param loading - whether the projection is still being read.
 * @returns the roster state; 0.2.2 exposes no member rows, so a loaded
 *   projection without a failure is `empty`, not `ready`.
 */
export function teamRoster(projection, loading) {
    if (projection === undefined)
        return loading ? { kind: 'loading', members: [] } : { kind: 'unavailable', members: [] };
    if (projection.failure !== undefined)
        return {
            kind: 'failed',
            message: projection.failure,
            members: [],
            // No roster survives in this projection, so a failure cannot name members.
            memberIds: [],
        };
    return { kind: 'empty', members: [] };
}
/**
 * A revision string that changes whenever the projected Team state changes.
 * @param projection - the Host's `agentTeam` projection, when available.
 * @returns a stable encoding of the mode, failure, and task board.
 */
export function projectionRevision(projection) {
    if (projection === undefined)
        return '';
    return JSON.stringify([
        projection.failure,
        projection.enabled,
        projection.tasks.map((task) => [task.id, task.revision, task.status, task.ownerId, task.ownerName]),
    ]);
}
//# sourceMappingURL=team-projection.js.map