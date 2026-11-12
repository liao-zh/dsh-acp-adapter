/** Known complete file sides, shared by live normalization and legacy UI reads. */
export interface ActivityDiff {
    path: string;
    oldText: string | null;
    newText: string;
}
export declare function activityDiffsOf(value: unknown): ActivityDiff[];
//# sourceMappingURL=activity-diffs.d.ts.map