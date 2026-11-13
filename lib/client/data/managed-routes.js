/** Client-side ownership catalogue derived from the plugin's authoritative
 * profile registry. A naming prefix is never an ownership claim. */
export class ManagedAcpRouteCatalog {
    scope;
    routes = new Set();
    durableRoutes;
    unsubscribe;
    constructor(scope, durableRoutes = []) {
        this.scope = scope;
        this.durableRoutes = new Set(durableRoutes);
        this.routes = new Set(this.durableRoutes);
        this.refresh();
        this.unsubscribe = scope.subscribe(() => {
            this.refresh();
        });
    }
    owns = (provider) => provider !== undefined && this.routes.has(provider);
    dispose() {
        this.unsubscribe();
        this.routes.clear();
    }
    refresh() {
        const agents = this.scope.getSnapshot().value?.agents;
        if (agents === undefined)
            return;
        this.routes = new Set([...this.durableRoutes, ...Object.keys(agents).map((id) => `acp-${id}`)]);
    }
}
//# sourceMappingURL=managed-routes.js.map