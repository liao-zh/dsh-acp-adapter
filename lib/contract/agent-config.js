/** Browser-safe profile contract and identity rules. */
/**
 * Settings namespace storing the ACP agent list.
 * 当前设置区段与包名一致。旧 `dsh-acp` settings 由
 * `src/host/composition/legacy-settings.ts` 导入；sidecar 根目录仍使用
 * `src/persistence/sidecar.ts` 中的 `dshHomePath('dsh-acp')`。
 */
export const ACP_SETTINGS_NS = 'dsh-acp-adapter';
/** LLM route id prefix; agent `<id>` routes as `acp-<id>`. */
export const ACP_ROUTE_PREFIX = 'acp-';
/**
 * Agent ids double as settings path segments, health-endpoint URL segments,
 * and route id suffixes — kept to the settings-namespace alphabet on purpose.
 */
export const ACP_AGENT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
/** Derive the LLM route id for one agent id. */
export function acpRouteId(agentId) {
    return `${ACP_ROUTE_PREFIX}${agentId}`;
}
/** Inverse of {@link acpRouteId}; undefined for non-ACP routes and the bare prefix. */
export function acpAgentIdFromRoute(provider) {
    if (!provider.startsWith(ACP_ROUTE_PREFIX))
        return undefined;
    const id = provider.slice(ACP_ROUTE_PREFIX.length);
    return ACP_AGENT_ID_PATTERN.test(id) ? id : undefined;
}
/** 所有可显式绑定的合法 runtime（settings schema 使用）。 */
export const ACP_AGENT_IDS = ['devin', 'codex', 'kimi', 'claude', 'codebuddy', 'antigravity'];
/** Profile-ID fallback predates explicit runtime bindings and is limited to the original four IDs. */
const LEGACY_RUNTIME_IDS = ['devin', 'codex', 'kimi', 'claude'];
export const RUNTIME_REGISTRY_IDS = {
    devin: 'devin',
    codex: 'codex-acp',
    kimi: 'kimi',
    claude: 'claude-acp',
    codebuddy: 'codebuddy-code',
    antigravity: 'antigravity-acp',
};
/** Explicit binding wins; only the original built-in profile IDs retain legacy fallback. */
export function effectiveRuntimeOf(id, config) {
    return config?.runtime ?? (LEGACY_RUNTIME_IDS.includes(id) ? id : undefined);
}
/** Catalog metadata does not participate in execution identity. */
export function catalogIdOf(id, config) {
    const runtime = effectiveRuntimeOf(id, config);
    return config.catalogId ?? (runtime === undefined ? id : RUNTIME_REGISTRY_IDS[runtime]);
}
/** Used only when creating a catalog preset; never infer runtime from saved catalogId. */
export function runtimeForCatalogId(id) {
    return ACP_AGENT_IDS.find((runtime) => RUNTIME_REGISTRY_IDS[runtime] === id);
}
//# sourceMappingURL=agent-config.js.map