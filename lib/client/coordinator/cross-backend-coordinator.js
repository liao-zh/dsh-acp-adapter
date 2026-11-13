import { CrossBackendTransactionController, resolveCrossBackendLocation } from "../data/cross-backend-controller.js";
function isAcpRoute(provider, ownsRoute) {
    return provider !== undefined && ownsRoute(provider);
}
function sameSelection(left, right) {
    return (left?.provider === right?.provider &&
        left?.model === right?.model &&
        left?.reasoningEffort === right?.reasoningEffort);
}
/** Pure observation decision, independent of React and side effects. */
export function shouldConfirmBackendTransition(input, ownsRoute) {
    if (input.next === null || sameSelection(input.lastUsed, input.next))
        return false;
    const fromAcp = isAcpRoute(input.lastUsed?.provider, ownsRoute);
    const toAcp = isAcpRoute(input.next.provider, ownsRoute);
    if (!fromAcp && !toAcp)
        return false;
    if (input.blank && input.lastUsed === null && toAcp)
        return false;
    if (fromAcp && toAcp && input.lastUsed?.provider === input.next.provider)
        return false;
    return true;
}
export class CrossBackendCoordinator {
    ctx;
    ownsRoute;
    tx = new CrossBackendTransactionController();
    listeners = new Set();
    unsubscribers = [];
    observed = new Map();
    queued = [];
    pending = null;
    snapshot = { pending: null };
    disposed = false;
    constructor(ctx, ownsRoute) {
        this.ctx = ctx;
        this.ownsRoute = ownsRoute;
    }
    start() {
        // dsh-session also exposes a host-side `ctx.sessions` store. Resolve the
        // public client faces through Cordis by name so both packages can coexist
        // in one TypeScript program without merging incompatible Context fields.
        const sessions = this.ctx.get('sessions');
        if (sessions === undefined || typeof sessions.list?.subscribe !== 'function') {
            return () => this.dispose();
        }
        const syncBindings = () => {
            if (this.disposed)
                return;
            const rows = sessions.list.getSnapshot().byId;
            for (const [id, observed] of this.observed) {
                if (sessions.binding(id) !== observed.binding || rows[id] === undefined) {
                    observed.unsubscribe();
                    this.observed.delete(id);
                }
            }
            for (const row of Object.values(rows)) {
                if (this.observed.has(row.id))
                    continue;
                // Borrow the generation already owned by a view/resource. Merely listing
                // history must not keep every Session resident or reopen it.
                const binding = sessions.binding(row.id);
                const projection = binding?.session.projections.faceOf('modelSelection');
                if (binding === undefined || projection === undefined)
                    continue;
                const observed = {
                    binding,
                    unsubscribe: () => { },
                    lastProjection: undefined,
                    suppressed: undefined,
                    staging: false,
                };
                this.observed.set(row.id, observed);
                observed.unsubscribe = projection.subscribe(() => {
                    this.observe(row.id, observed);
                });
                this.observe(row.id, observed);
            }
        };
        this.unsubscribers.push(sessions.list.subscribe(syncBindings));
        syncBindings();
        return () => this.dispose();
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    getSnapshot() {
        return this.snapshot;
    }
    async confirm() {
        const pending = this.pending;
        if (pending === null || this.disposed || !pending.confirmable || pending.busy)
            return;
        this.pending = { ...pending, busy: true, failure: null };
        this.suppressSelection(pending.ticket.sourceSessionId, pending.ticket.sourceSelection);
        this.emit();
        const result = await this.tx.confirm(pending.ticket, this.operationsFor(pending.ticket));
        if (result.ok)
            this.tx.forget(pending.ticket.key);
        if (this.disposed)
            return;
        if (result.ok) {
            this.pending = this.queued.shift() ?? null;
        }
        else {
            this.pending = { ...pending, busy: false, failure: result.failure };
        }
        this.emit();
    }
    async cancel() {
        const pending = this.pending;
        if (pending === null || this.disposed || pending.busy)
            return;
        const source = pending.ticket.sourceSelection;
        if (source === undefined) {
            this.tx.forget(pending.ticket.key);
            this.pending = this.queued.shift() ?? null;
            this.emit();
            return;
        }
        this.pending = { ...pending, busy: true, failure: null };
        this.suppressSelection(pending.ticket.sourceSessionId, source);
        this.emit();
        const result = await this.tx.cancel(pending.ticket, this.operationsFor(pending.ticket));
        if (this.disposed)
            return;
        if (result.ok)
            this.pending = this.queued.shift() ?? null;
        else
            this.pending = { ...pending, busy: false, failure: result.failure };
        this.emit();
    }
    observe(sessionId, observed) {
        if (this.disposed || this.observed.get(sessionId) !== observed)
            return;
        const sessions = this.ctx.get('sessions');
        const session = sessions.binding(sessionId);
        const value = session?.session.projections.faceOf('modelSelection').getSnapshot();
        const projection = value;
        if (projection === undefined || sameSelection(observed.lastProjection?.next, projection.next))
            return;
        // `lastUsed` is the last committed turn model.  A stock picker change can
        // leave an uncommitted `next` selection in the projection (for example a
        // same-profile reasoning change); if the user immediately chooses another
        // backend, cancellation must restore that visible pre-transition choice,
        // not the older committed model.
        const sourceSelection = observed.lastProjection?.next ?? projection.lastUsed;
        observed.lastProjection = projection;
        if (sameSelection(observed.suppressed, projection.next) && observed.suppressed !== undefined) {
            observed.suppressed = undefined;
            return;
        }
        if (observed.staging ||
            this.pending?.ticket.sourceSessionId === sessionId ||
            this.queued.some((item) => item.ticket.sourceSessionId === sessionId))
            return;
        const row = sessions.list.getSnapshot().byId[sessionId];
        if (!shouldConfirmBackendTransition({
            lastUsed: projection.lastUsed,
            next: projection.next,
            blank: row?.blank === true,
        }, this.ownsRoute))
            return;
        const workspaces = this.ctx.get('workspaces').list.getSnapshot();
        const location = resolveCrossBackendLocation(sessionId, workspaces.items, row?.cwd);
        if (location === undefined) {
            const ticket = {
                key: `${sessionId}\u0000${Date.now()}`,
                sourceSessionId: sessionId,
                sourceSelection: sourceSelection ?? undefined,
                targetSelection: projection.next,
                location: {},
            };
            void this.stagePending(ticket, observed, 'no-location');
            return;
        }
        const ticket = {
            key: `${sessionId}\u0000${Date.now()}\u0000${projection.next.provider}\u0000${projection.next.model}`,
            sourceSessionId: sessionId,
            sourceSelection: sourceSelection ?? undefined,
            targetSelection: projection.next,
            location,
        };
        // The stock picker has already written `next` by the time this additive
        // observer runs. Compensate immediately, before exposing the decision UI,
        // so refresh/close cannot commit an unconfirmed backend transition.
        void this.stagePending(ticket, observed);
    }
    async stagePending(ticket, observed, blockingReason) {
        if (observed.staging || this.disposed)
            return;
        const source = ticket.sourceSelection;
        observed.staging = true;
        if (source !== undefined)
            this.suppressSelection(ticket.sourceSessionId, source);
        // A nonblank session can have no committed model selection when its first
        // request was stopped before request/header. There is no truthful source
        // model to restore, but the host guard blocks ACP use in that history; the
        // user can still explicitly continue by creating a fresh destination.
        const restored = source === undefined ? { ok: true } : await this.operationsFor(ticket).restoreSource(source);
        observed.staging = false;
        if (this.disposed || this.observed.get(ticket.sourceSessionId) !== observed)
            return;
        const pending = restored.ok
            ? {
                ticket: {
                    ...ticket,
                    ...(source === undefined ? {} : { sourceAlreadyRestored: true }),
                },
                failure: null,
                ...(blockingReason === undefined ? {} : { blockingReason }),
                confirmable: blockingReason === undefined,
                busy: false,
            }
            : {
                ticket,
                failure: {
                    phase: 'restore-source',
                    message: restored.message ?? 'source model restore failed',
                },
                confirmable: false,
                busy: false,
            };
        if (this.pending === null)
            this.pending = pending;
        else
            this.queued.push(pending);
        this.emit();
    }
    operationsFor(ticket) {
        const remote = this.ctx.remote;
        const sessions = this.ctx.get('sessions');
        return {
            restoreSource: async (selection) => {
                try {
                    const result = await remote.session.selectModel({
                        sessionId: ticket.sourceSessionId,
                        ...selection,
                    });
                    return result.ok ? { ok: true } : { ok: false, message: result.error.message };
                }
                catch (error) {
                    return { ok: false, message: error instanceof Error ? error.message : String(error) };
                }
            },
            createDestination: async ({ sessionId, location, }) => {
                try {
                    await sessions.create({
                        sessionId: sessionId,
                        ...(location.cwd === undefined ? {} : { cwd: location.cwd }),
                        ...(location.workspaceId === undefined ? {} : { workspaceId: location.workspaceId }),
                    });
                    return { published: true };
                }
                catch (error) {
                    // A transport timeout can race a successful Host create. Reuse the
                    // preallocated id when the authoritative list already contains it.
                    if (sessions.list.getSnapshot().byId[sessionId] !== undefined)
                        return { published: true };
                    return { published: false, message: error instanceof Error ? error.message : String(error) };
                }
            },
            selectDestination: async (sessionId, selection) => {
                try {
                    const result = await remote.session.selectModel({ sessionId: sessionId, ...selection });
                    return result.ok ? { ok: true } : { ok: false, message: result.error.message };
                }
                catch (error) {
                    return { ok: false, message: error instanceof Error ? error.message : String(error) };
                }
            },
            openDestination: async (sessionId) => {
                try {
                    this.ctx.uiWorkspace.openSession(sessionId);
                    return { ok: true };
                }
                catch (error) {
                    return { ok: false, message: error instanceof Error ? error.message : String(error) };
                }
            },
        };
    }
    emit() {
        this.snapshot = { pending: this.pending };
        for (const listener of [...this.listeners])
            listener();
    }
    suppressSelection(sessionId, selection) {
        if (selection === undefined)
            return;
        const observed = this.observed.get(sessionId);
        if (observed !== undefined)
            observed.suppressed = selection;
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const observed of this.observed.values())
            observed.unsubscribe();
        this.observed.clear();
        this.queued.length = 0;
        for (const unsubscribe of this.unsubscribers.splice(0))
            unsubscribe();
        this.listeners.clear();
    }
}
//# sourceMappingURL=cross-backend-coordinator.js.map