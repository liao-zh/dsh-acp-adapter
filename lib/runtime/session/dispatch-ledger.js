/** A small adapter around the durable sidecar methods. */
export class DispatchLedger {
    store;
    constructor(store) {
        this.store = store;
    }
    begin(record) {
        return this.store.begin({ ...record, state: 'dispatch-uncertain' });
    }
    settle(dshSessionId, key) {
        return this.store.settle(dshSessionId, key);
    }
    read(dshSessionId, key) {
        return this.store.read(dshSessionId, key);
    }
}
//# sourceMappingURL=dispatch-ledger.js.map