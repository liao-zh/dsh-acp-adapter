/**
 * Transactional handoff between DSH execution backends.
 *
 * This module deliberately has no DSH settings or UI dependency.  The stock
 * session controller remains the authority for model selection: restoring the
 * source calls `session.selectModel(source)`, and selecting the destination
 * calls the same official operation after the destination exists.  That gives
 * the host its normal "selection becomes default" semantics without a second
 * plugin-owned default store.
 */
function messageOf(message, fallback) {
    return typeof message === 'string' && message.length > 0 ? message : fallback;
}
/**
 * Resolves the only locations that are truthful for a new session.  Workspace
 * membership wins over cwd because it preserves DSH's grouping semantics.
 */
export function resolveCrossBackendLocation(sessionId, workspaces, cwd) {
    const workspace = workspaces.find((candidate) => candidate.sessionIds.includes(sessionId));
    if (workspace !== undefined)
        return { workspaceId: workspace.workspaceId };
    if (typeof cwd === 'string' && cwd.length > 0)
        return { cwd };
    return undefined;
}
/**
 * Small stateful coordinator.  A ticket key identifies one user decision;
 * retries reuse its preallocated destination id and skip completed phases.
 * No phase after destination selection writes a separate default: the official
 * destination `selectModel` call is the sole default-producing operation.
 */
export class CrossBackendTransactionController {
    states = new Map();
    stateFor(ticket) {
        const existing = this.states.get(ticket.key);
        if (existing !== undefined)
            return existing;
        const state = {
            destinationSessionId: `session-${globalThis.crypto.randomUUID()}`,
            sourceRestored: ticket.sourceAlreadyRestored === true,
            destinationCreated: false,
            destinationSelected: false,
            opened: false,
        };
        this.states.set(ticket.key, state);
        return state;
    }
    async confirm(ticket, operations) {
        const state = this.stateFor(ticket);
        if (!state.sourceRestored && ticket.sourceSelection !== undefined) {
            const restored = await operations.restoreSource(ticket.sourceSelection);
            if (!restored.ok) {
                return {
                    ok: false,
                    failure: {
                        phase: 'restore-source',
                        message: messageOf(restored.message, 'source model restore failed'),
                        destinationSessionId: state.destinationSessionId,
                    },
                };
            }
            state.sourceRestored = true;
        }
        // A blank launcher has no previous model to restore.  It is still safe to
        // create a destination because no semantic context is being replaced.
        if (ticket.sourceSelection === undefined)
            state.sourceRestored = true;
        if (!state.destinationCreated) {
            let created = { published: false };
            try {
                created = await operations.createDestination({
                    sessionId: state.destinationSessionId,
                    location: ticket.location,
                });
            }
            catch (error) {
                return {
                    ok: false,
                    failure: {
                        phase: 'create-destination',
                        message: messageOf(error instanceof Error ? error.message : undefined, 'destination creation failed'),
                        destinationSessionId: state.destinationSessionId,
                    },
                };
            }
            if (!created.published) {
                return {
                    ok: false,
                    failure: {
                        phase: 'create-destination',
                        message: messageOf(created.message, 'destination creation failed'),
                        destinationSessionId: state.destinationSessionId,
                    },
                };
            }
            state.destinationCreated = true;
        }
        if (!state.destinationSelected) {
            const selected = await operations.selectDestination(state.destinationSessionId, ticket.targetSelection);
            if (!selected.ok) {
                return {
                    ok: false,
                    failure: {
                        phase: 'select-destination',
                        message: messageOf(selected.message, 'destination model selection failed'),
                        destinationSessionId: state.destinationSessionId,
                    },
                };
            }
            state.destinationSelected = true;
        }
        if (!state.opened) {
            const opened = await operations.openDestination(state.destinationSessionId);
            if (!opened.ok) {
                return {
                    ok: false,
                    failure: {
                        phase: 'open-destination',
                        message: messageOf(opened.message, 'opening destination failed'),
                        destinationSessionId: state.destinationSessionId,
                    },
                };
            }
            state.opened = true;
        }
        return { ok: true, destinationSessionId: state.destinationSessionId };
    }
    /** Cancel restores the source only; it never creates or opens a destination. */
    async cancel(ticket, operations) {
        if (ticket.sourceAlreadyRestored === true) {
            this.states.delete(ticket.key);
            return { ok: true, destinationSessionId: '' };
        }
        if (ticket.sourceSelection === undefined) {
            this.states.delete(ticket.key);
            return { ok: true, destinationSessionId: '' };
        }
        const restored = await operations.restoreSource(ticket.sourceSelection);
        if (!restored.ok) {
            return {
                ok: false,
                failure: { phase: 'restore-source', message: messageOf(restored.message, 'source model restore failed') },
            };
        }
        this.states.delete(ticket.key);
        return { ok: true, destinationSessionId: '' };
    }
    /** Explicitly discard a completed/failed transaction after the UI is done. */
    forget(key) {
        this.states.delete(key);
    }
}
//# sourceMappingURL=cross-backend-controller.js.map