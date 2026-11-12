import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
/** This public child declaration has exactly one owner. A replacement that
 * borrows its navigation face is not another source for native composition. */
export declare function ownsNativeHeaderViews(entry: StoredEntry): boolean;
/** The pinned shell lists raw view registrations; rendering elects one entry per id. */
export declare function uniqueViewTabs<T extends {
    id: string;
}>(tabs: readonly T[]): readonly T[];
/** Adapt the source rather than a component Hook, so a replacement header can
 * borrow the same navigation face without losing deduplication. The cache belongs
 * to this one composition mount and keeps useSyncExternalStore snapshots stable. */
export declare function nativeHeaderViewRegistration(entry: StoredEntry): Record<string, unknown>;
//# sourceMappingURL=native-header-views.d.ts.map