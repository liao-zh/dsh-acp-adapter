/** Retain unchanged per-anchor leases when the chat gains or loses markers. */
export class ActivityAnchorSubscriptions {
    hub;
    sessionId;
    scope;
    leases = new Map();
    onChange;
    reconcile(hub, sessionId, scope, desired, onChange) {
        this.onChange = onChange;
        if (this.hub !== hub || this.sessionId !== sessionId || this.scope !== scope) {
            this.releaseAll();
            this.hub = hub;
            this.sessionId = sessionId;
            this.scope = scope;
        }
        const next = new Map(desired.map((item) => [item.key, item]));
        for (const [key, lease] of this.leases) {
            const item = next.get(key);
            if (item !== undefined &&
                item.ownerDshSessionId === lease.ownerDshSessionId &&
                item.promptAnchorMessageId === lease.promptAnchorMessageId)
                continue;
            this.leases.delete(key);
            lease.handle?.release();
        }
        for (const item of desired) {
            if (this.leases.has(item.key))
                continue;
            const lease = {
                ownerDshSessionId: item.ownerDshSessionId,
                promptAnchorMessageId: item.promptAnchorMessageId,
            };
            // Register before acquire: a hub is allowed to notify synchronously.
            this.leases.set(item.key, lease);
            const notify = () => {
                if (this.leases.get(item.key) !== lease || lease.handle === undefined)
                    return;
                this.onChange?.(item.key, lease.handle);
            };
            try {
                lease.handle = hub.acquire(item.ownerDshSessionId, item.ownerDshSessionId, item.promptAnchorMessageId, notify);
            }
            catch (error) {
                if (this.leases.get(item.key) === lease)
                    this.leases.delete(item.key);
                throw error;
            }
            // A synchronous notification during acquire is ignored until handle is
            // assigned; this read publishes the current snapshot immediately after.
            notify();
        }
    }
    dispose() {
        this.releaseAll();
        this.hub = undefined;
        this.sessionId = undefined;
        this.scope = undefined;
        this.onChange = undefined;
    }
    releaseAll() {
        const leases = [...this.leases.values()];
        this.leases.clear();
        for (const lease of leases)
            lease.handle?.release();
    }
}
//# sourceMappingURL=activity-anchor-subscriptions.js.map