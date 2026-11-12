import type { SettingsScopeLike } from './controller.ts';
/** Client-side ownership catalogue derived from the plugin's authoritative
 * profile registry. A naming prefix is never an ownership claim. */
export declare class ManagedAcpRouteCatalog {
    private readonly scope;
    private routes;
    private readonly durableRoutes;
    private readonly unsubscribe;
    constructor(scope: SettingsScopeLike, durableRoutes?: Iterable<string>);
    owns: (provider: string | undefined) => boolean;
    dispose(): void;
    private refresh;
}
//# sourceMappingURL=managed-routes.d.ts.map