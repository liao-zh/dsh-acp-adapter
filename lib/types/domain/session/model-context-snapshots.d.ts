/**
 * Read the current DSH model-facing context snapshots from an effective session
 * message projection. This is deliberately a tiny source allow-list: ACP must
 * not replay arbitrary user-role history just because it happens to be durable.
 */
export interface ModelContextMessageLike {
    readonly id?: unknown;
    readonly role?: unknown;
    readonly source?: unknown;
    readonly content?: unknown;
}
export interface ModelContextSnapshot {
    readonly source: 'runtime-context' | 'skill-catalog';
    readonly id?: string;
    readonly text: string;
}
/**
 * Return the newest valid runtime-context and skill-catalog messages, in source
 * order. A malformed newest snapshot suppresses that source instead of falling
 * back to stale content. Empty clear snapshots remain present when they contain
 * the source's explicit clearing text.
 */
export declare function currentModelContextSnapshots(messages: readonly ModelContextMessageLike[], skillEntryPointAvailable?: boolean): readonly ModelContextSnapshot[];
//# sourceMappingURL=model-context-snapshots.d.ts.map