/** Shared, dependency-free classification of Agent-owned config options. */
/** Maximum length for opaque ACP option and mode identifiers. */
export declare const ACP_CONFIG_IDENTIFIER_MAX: 512;
/** Normalize ACP identifiers without changing the original value shown to users. */
export declare function normalizeAcpConfigOptionKey(value: string): string;
/**
 * Model and reasoning controls remain owned by the stock DSH model picker.
 * ACP agents may spell their category/id with different casing or separators;
 * classification is normalized while the Agent-provided labels stay untouched.
 */
export declare function isAcpModelOrReasoningOption(option: {
    readonly id: string;
    readonly category?: string | null;
}): boolean;
//# sourceMappingURL=config-options.d.ts.map