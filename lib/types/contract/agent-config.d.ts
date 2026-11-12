/** Browser-safe profile contract and identity rules. */
/**
 * Settings namespace storing the ACP agent list.
 * 当前设置区段与包名一致。旧 `dsh-acp` settings 由
 * `src/host/composition/legacy-settings.ts` 导入；sidecar 根目录仍使用
 * `src/persistence/sidecar.ts` 中的 `dshHomePath('dsh-acp')`。
 */
export declare const ACP_SETTINGS_NS = "dsh-acp-adapter";
/** LLM route id prefix; agent `<id>` routes as `acp-<id>`. */
export declare const ACP_ROUTE_PREFIX = "acp-";
/**
 * Agent ids double as settings path segments, health-endpoint URL segments,
 * and route id suffixes — kept to the settings-namespace alphabet on purpose.
 */
export declare const ACP_AGENT_ID_PATTERN: RegExp;
/** Derive the LLM route id for one agent id. */
export declare function acpRouteId(agentId: string): string;
/** Inverse of {@link acpRouteId}; undefined for non-ACP routes and the bare prefix. */
export declare function acpAgentIdFromRoute(provider: string): string | undefined;
/**
 * Per-agent configuration the stub consumes. The registry
 * (src/host/composition/installed-profile-registry.ts) stores exactly this shape per agent id in
 * the `dsh-acp-adapter` settings namespace; declared in this leaf module so neither the
 * adapter nor its consumers import the registry for the datum.
 */
export interface AcpStubAgentConfig {
    /** Display name; the selector group label is `<name> · ACP`. */
    name: string;
    /** Executable probed per catalog refresh. */
    command: string;
    args: readonly string[];
    /** Agent environment from settings; native sessions preserve these values. */
    env: Record<string, string>;
    /** Login guidance shown when a probe fails with auth_required. */
    loginHint?: string;
    /** Explicit specialized runtime; the original four built-in profile IDs remain a fallback.
     * Catalog metadata never grants runtime behavior. Unknown profiles use generic ACP.
     */
    runtime?: AcpAgentId;
    /** Registry identity for display metadata only; never grants runtime behavior. */
    catalogId?: string;
}
/** One ACP agent's stored configuration (the `dsh-acp-adapter` settings per-id value). */
export type AcpAgentConfig = AcpStubAgentConfig;
/** Explicitly supported ACP backend identity bindings. */
export type AcpAgentId = 'devin' | 'codex' | 'kimi' | 'claude' | 'codebuddy' | 'antigravity';
/** 所有可显式绑定的合法 runtime（settings schema 使用）。 */
export declare const ACP_AGENT_IDS: readonly AcpAgentId[];
export declare const RUNTIME_REGISTRY_IDS: Readonly<Record<AcpAgentId, string>>;
/** Explicit binding wins; only the original built-in profile IDs retain legacy fallback. */
export declare function effectiveRuntimeOf(id: string, config?: {
    readonly runtime?: AcpAgentId;
}): AcpAgentId | undefined;
/** Catalog metadata does not participate in execution identity. */
export declare function catalogIdOf(id: string, config: {
    readonly runtime?: AcpAgentId;
    readonly catalogId?: string;
}): string;
/** Used only when creating a catalog preset; never infer runtime from saved catalogId. */
export declare function runtimeForCatalogId(id: string): AcpAgentId | undefined;
//# sourceMappingURL=agent-config.d.ts.map