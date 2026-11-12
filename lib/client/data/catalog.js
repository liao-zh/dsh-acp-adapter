/** Build-time registry catalog. No runtime network or host-platform assumptions. */
import { runtimeForCatalogId } from "../../contract/agent-config.js";
import registryJson from '../../../assets/registry/registry.json' with { type: 'json' };
import executablesJson from '../../../assets/registry/executables.json' with { type: 'json' };
/** registry.json 的 agents 数组（CI 已校验；这里收窄为最小只读面）。 */
const registryAgents = registryJson.agents;
/** executables.json sidecar 的 entries（agent id → PATH 可执行名预填）。 */
const executableEntries = executablesJson.entries;
/** Display guidance absent from the registry, not launch configuration. */
const LOGIN_HINTS = {
    devin: 'devin auth login',
    codex: 'codex login',
    kimi: 'kimi login',
    claude: 'claude',
    // The public CLI starts the interactive CodeBuddy session with `codebuddy`;
    // its ACP guide documents `--acp` as the server mode, not a separate login command.
    codebuddy: 'codebuddy',
};
/** Known installed CLI names for binary distributions; never archive paths. */
const INSTALLED_BINARY_COMMANDS = { devin: 'devin', kimi: 'kimi' };
/** Curated adapter regression/live-smoke coverage, not certification of registry versions.
 * Keep this explicit: adding a runtime binding does not establish verification.
 */
const VERIFIED_ADAPTER_IDS = [
    'devin',
    'codebuddy-code',
    'codex-acp',
    'kimi',
    'claude-acp',
    'antigravity-acp',
    'qwen-code',
];
/** npx/uvx 分发的安装指引（spawn 姿态不变：只做展示，不自动安装）。 */
function installHintOf(agent) {
    const distribution = agent.distribution;
    // Match the same distribution selected by the sidecar generator.
    if (distribution?.binary !== undefined) {
        return (agent.website ??
            Object.entries(distribution.binary)
                .map(([platform, entry]) => `${platform}: ${entry?.archive ?? ''}`)
                .join('\n'));
    }
    if (distribution?.npx !== undefined)
        return `npm install -g ${distribution.npx.package ?? agent.id}`;
    if (distribution?.uvx !== undefined)
        return `uv tool install ${distribution.uvx.package ?? agent.id}`;
    return agent.website ?? agent.id;
}
/**
 * 全量 catalog：已验证适配条目排前，其余按 registry 顺序。合成是
 * 纯数据变换，模块加载时执行一次。
 */
export const ACP_CATALOG_ENTRIES = buildCatalogEntries(registryAgents, executableEntries);
export function buildCatalogEntries(registryAgents, executableEntries) {
    const entries = [];
    for (const agent of registryAgents) {
        const executable = executableEntries[agent.id];
        const runtime = runtimeForCatalogId(agent.id);
        const command = executable?.kind === 'binary'
            ? (INSTALLED_BINARY_COMMANDS[agent.id] ?? executable.command)
            : (executable?.command ?? '');
        const args = executable?.args ?? [];
        entries.push({
            id: agent.id,
            name: agent.name,
            version: executable?.version ?? agent.version,
            installHint: installHintOf(agent),
            command,
            verification: VERIFIED_ADAPTER_IDS.includes(agent.id) ? 'adapter-tested' : 'unverified',
            args: [...args],
            env: { ...executable?.env },
            requiresCommand: command === '',
            ...(runtime === undefined
                ? {}
                : { runtime, ...(LOGIN_HINTS[runtime] === undefined ? {} : { loginHint: LOGIN_HINTS[runtime] }) }),
        });
    }
    entries.sort((left, right) => {
        const leftRank = VERIFIED_ADAPTER_IDS.indexOf(left.id);
        const rightRank = VERIFIED_ADAPTER_IDS.indexOf(right.id);
        return ((leftRank < 0 ? VERIFIED_ADAPTER_IDS.length : leftRank) -
            (rightRank < 0 ? VERIFIED_ADAPTER_IDS.length : rightRank));
    });
    return entries;
}
/** Look up one catalog entry by registry agent id (the add-menu rows are rendered from the list). */
export function catalogEntryOf(id) {
    return ACP_CATALOG_ENTRIES.find((entry) => entry.id === id);
}
//# sourceMappingURL=catalog.js.map