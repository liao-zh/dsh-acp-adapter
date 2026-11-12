/**
 * Shared ACP profile data: settings shape, `acp-<id>` routes, runtime binding rules and probe cache keys. Profile shapes and binding rules are
 * re-exported from the browser-safe contract. No host composition dependency.
 * @module @zaimokuza/dsh-acp-adapter/domain/session/agent-config
 */
import type { AcpAgentConfig, AcpAgentId, AcpStubAgentConfig } from '../../contract/agent-config.ts';
export * from '../../contract/agent-config.ts';
/**
 * 兼容状态词表（readiness 展示）：'current' = 握手版本与 registry 快照的
 * 上游版本一致；'different' = 不一致（不阻断，如实展示——registry 版本是
 * 目录参考，不是运行门）；'unknown' = 快照无该 agent 的版本事实。
 */
export type AcpVersionCompatibility = 'current' | 'different' | 'unknown';
/**
 * 版本兼容状态派生（readiness 的纯函数核心；remote 层 probeRow 消费）：
 * 无版本参考（普通 profile，或快照无该 agent 的 version 事实）或对端握手
 * 未给出版本 → null / 'unknown'（无从判定，诚实空缺）；否则握手
 * `agentInfo.version`（trim 后）与 registry 参考版本精确比对：等 →
 * 'current'，不等 → 'different'。
 */
export declare function acpVersionCompatibility(referenceVersion: string | null | undefined, agentVersion: string | null | undefined): AcpVersionCompatibility | null;
/**
 * Stable serialization of the probe-affecting config (command + args + env **键名
 * 集合** + `runtime` 绑定, env key-order normalized). The probe cache is keyed on it: a rename or a
 * loginHint edit must NOT re-probe, an env reorder must not either, and any real
 * change must. `runtime` 参与键：它决定 runtime 身份（边界），绑定变了
 * runtime 绑定变化会改变实际启动配置，probe 结果可能不同——必须重探。The hash is the
 * canonical JSON itself — no crypto needed for an in-memory cache key. Generic
 * parameter so a full {@link AcpStubAgentConfig} passes without tripping
 * excess-property checks.
 *
 * env 分量是 **secret-free 键名 + 值 hash**（排序固定）：env 值变化必须 bust
 * 缓存，避免凭证轮换后继续展示旧探测结果；明文值绝不进入 key。这函数同时服务 llm-stub
 * 缓存命中、五态新鲜度与创建门，三处消费同一口径。
 *
 * 自 src/host/composition/llm-stub.ts 下沉到本叶子：remote 层的 health
 * 新鲜度判定与 installed-profile registry 的会话创建门都要消费它，放 host
 * 组合层会造成不必要的跨层依赖。
 */
export declare function acpProbeConfigKey<C extends Pick<AcpStubAgentConfig, 'command' | 'args' | 'env'> & {
    readonly runtime?: AcpAgentId;
}>(config: C): string;
/**
 * probe 缓存 TTL（固定策略）：成功条目 10 分钟、失败条目 30 秒
 * （负缓存短窗口——外部条件修复后无需等很久或重启；「重新检查」
 * （invalidateProbe）随时绕过 TTL）。
 */
export declare const ACP_PROBE_CACHE_OK_TTL_MS: number;
export declare const ACP_PROBE_CACHE_ERROR_TTL_MS = 30000;
/**
 * probe 缓存新鲜度判定（全仓唯一落点）：key 与当前配置的
 * {@link acpProbeConfigKey} 相等 **且** 未过期（按成功/失败取对应 TTL）。
 * llm-stub 的 listModels 命中过期条目按 miss 重 probe。设置页的最后一次
 * 明确检查状态不消费这个 TTL；它只在配置 key 改变时失效。
 * 结构参数化（只要 key/at/result.kind 三键），llm-stub 缓存条目与 remote 的
 * 结构面快照都直接适配。
 */
export declare function acpProbeFresh(entry: {
    readonly key: string;
    readonly at: number;
    readonly result: {
        readonly kind: 'ok' | 'error';
    };
}, key: string, now: number): boolean;
/** One agent resolved from an LLM route id ('s creation-time routing query). */
export interface AcpResolvedAgent {
    id: string;
    config: AcpAgentConfig;
}
//# sourceMappingURL=agent-config.d.ts.map