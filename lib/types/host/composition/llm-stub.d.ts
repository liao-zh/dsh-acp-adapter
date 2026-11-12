/**
 * ACP provider 使用的 stub LLM adapter。
 *
 * One adapter instance serves every `acp-<id>` route: `stream()` never runs —
 * ACP sessions are driven by AcpAgent, and this route exists so the
 * prompt gate (`turnAgentFor`) accepts the selection. `listModels`
 * is a probe: spawn the agent, read the `model` config option, tear down：
 * capability-aware session cleanup first — close then delete when advertised);
 * the result (success OR failure) is cached by config hash with a TTL (ok 10min /
 * error 30s, agent-config.ts `acpProbeFresh`). Failed automatic refreshes keep
 * the last verified catalog for the same config without hiding the failure
 * from health. The panel refreshes via {@link AcpStubAdapter.invalidateProbe}.
 *
 * The adapter owns no registration: ./installed-profile-registry.ts registers/replaces routes and
 * directory entries. This module is deliberately free of cordis imports so the
 * cache and failure mapping stay unit-testable with plain fakes.
 *
 * 本包 tsconfig 用 `types: []`；本文件需要 `os.tmpdir()` 作为 probe 子进程
 * 的 cwd，经 triple-slash reference 引入 @types/node
 * （src/protocol/v1/connection.ts 同款先例）。
 * @module @zaimokuza/dsh-acp-adapter/host/composition/llm-stub
 */
import { LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmModelInfo, LlmModelReasoningInfo, LlmProviderInfo, StreamChunk } from '@deepseek-ai/dsh-llm';
import type * as acp from '@agentclientprotocol/sdk';
import { acpProbeConfigKey } from '../../domain/session/agent-config.ts';
import type { AcpStubAgentConfig } from '../../domain/session/agent-config.ts';
import type { AcpErrorKind, AcpProbeCleanup, AcpProbeOptions, AcpProbePhase, AcpProbeResult } from '../../protocol/v1/types.ts';
import type { AcpSpawnPlanView } from '../../runtime/process/types.ts';
import type { SubprocessSeamResolution } from '../../runtime/process/subprocess.ts';
export { acpProbeConfigKey };
/**
 * Probe runtime preparation：为健康探测准备临时 cwd 和清理回调；正式会话
 * 不经探测临时目录，也不重定向 Agent data home。
 */
export interface AcpProbeRuntimePreparationInput {
    /** 完整路由 id（`acp-<id>`）。 */
    readonly provider: string;
    /** 该路由的当前配置。 */
    readonly config: AcpStubAgentConfig;
    /** 原始 argv（command + args，结构化）。 */
    readonly argv: string[];
}
/**
 * Probe runtime preparation 产物（disposable probe）：spawn 计划 + 可选的 probe
 * cwd（disposable 数据根——probe 的 session/new 落点，ownsCwd=false，probe 自身
 * 不删）+ 清理回调。`cleanup` 由 {@link AcpStubAdapter} 在 probe 结束后（成功、
 * 失败、清理失败一律）于 finally 调用；cleanup 自身失败仅 warn，不翻转 probe
 * 结果（协议清理尽力而为 + disposable 根必删的纪律见 与
 * session configuration keeps only the probe's protocol cleanup outcome.
 */
export interface AcpProbeRuntimePreparation {
    /** probe 的 spawn 计划（env 整体由计划供给）。 */
    readonly plan: AcpSpawnPlanView;
    /** disposable probe cwd；缺席时 probe 用系统临时目录（ownsCwd=true 自删，旧行为）。 */
    readonly cwd?: string;
    /** probe 结束后的清理（删 disposable 根等）；同步或异步均可。 */
    readonly cleanup: () => Promise<void> | void;
}
/** Probe runtime preparer：返回临时运行目录和清理回调。 */
export type AcpProbeRuntimePreparer = (input: AcpProbeRuntimePreparationInput) => Promise<AcpProbeRuntimePreparation>;
export interface AcpStubAdapterOptions {
    /**
     * Current agent configs keyed by FULL route id (`acp-<id>`). Read on every
     * call so settings changes reach the adapter without re-instantiation.
     */
    agents: () => ReadonlyMap<string, AcpStubAgentConfig>;
    /** Connection knobs forwarded to every probe (tests shorten the teardown ladder). */
    probeOptions?: AcpProbeOptions;
    /**
     * 加载期解析的 subprocess seam：probe 的 spawn 经它走宿主服务。
     * `{ok:false}`（宿主无 subprocess 服务/未接线）时 probe 以 spawn-failure
     * fail closed 进缓存，绝不自制 child_process 回退。
     */
    subprocess: SubprocessSeamResolution;
    /**
     * Probe 的 runtime preparation（临时 cwd + cleanup，不提供安全隔离）。
     * 存在时 probe 以 `spawnPlan` spawn（env 整体由计划供给）；缺席时保持
     * 逐字节旧行为（配置 env 原样透传、无 confine——纯模块单测路径）。
     */
    prepareProbe?: AcpProbeRuntimePreparer;
    /**
     * 结构性 warn 通道（runtime cleanup 失败只 warn 不翻转 probe
     * 结果）。缺席时写 `process.stderr` 保底。
     */
    onWarn?: (message: string) => void;
}
/** One cached probe outcome; failures are cached too (see {@link AcpStubAdapter.listModels}). */
export interface AcpProbeCacheEntry {
    /** Config hash the entry was produced from. */
    readonly key: string;
    /** `Date.now()` at write; the health endpoint displays it. */
    readonly at: number;
    readonly result: {
        readonly kind: 'ok';
        readonly models: readonly LlmModelInfo[];
        /** initialize 响应的 authMethods 原值（现在随缓存保留；health 端点透传）。 */
        readonly authMethods: readonly acp.AuthMethod[];
        /** initialize 握手的 agentInfo 原值（现在随缓存保留；health 端点透传）。 */
        readonly agentInfo: acp.Implementation | null | undefined;
        /** initialize 握手的 agentCapabilities 实际值（能力披露的数据源）。 */
        readonly agentCapabilities: acp.AgentCapabilities | undefined;
        /**
         * probe 会话清理事实（close/delete 三态如实三态）。
         * 清理失败不翻转 probe 成败——本分支仍是 ok，但 health 据此展示降级。
         */
        readonly cleanup: AcpProbeCleanup;
        /**
         * initialize 握手的 capability hash（sha256-16 of canonical
         * capabilities，`null` 输入当未握手）。记录进条目供 health 展示；
         * **不进缓存键**——agent version 与 capability 是 probe 的**结果**而非
         * 输入（计划条文的合理解读），版本/能力漂移靠 TTL 与「重新检查」发现。
         */
        readonly capabilityHash: string;
        /** initialize 协商的 ACP 协议版本（readiness；health 端点透传）。 */
        readonly protocolVersion: number | undefined;
        /**
         * configOptions 是否含 `category=model` 项（ 五态目录口径的输入事实）：
         * kimi 的模型目录只经 configOptions 提供（实际 ACP 行为 legacy `models` 为空），
         * 此项在场即视为有目录。与 models 同为 probe 结果——进条目不进缓存键。
         */
        readonly hasModelConfigOption: boolean;
        /** Bounded session-scoped configuration snapshot used for exact model resolution. */
        readonly configOptions: readonly acp.SessionConfigOption[] | undefined;
        /** Model-scoped snapshots for Agents such as Kimi whose reasoning
         * catalogue changes when the selected model changes. */
        readonly modelConfigOptions?: Readonly<Record<string, readonly acp.SessionConfigOption[]>>;
    } | {
        readonly kind: 'error';
        readonly failureKind: AcpErrorKind;
        readonly error: LlmError;
        /** probe 失败阶段（健康四层分层判据；未标记时为 undefined → 端点归 null）。 */
        readonly probePhase: AcpProbePhase | undefined;
    };
}
/** Extract the `category: 'model'` select options from a probe, flattening grouped options. */
/** Resolve ACP thought-level metadata into DSH's adapter-owned reasoning shape. */
export declare function reasoningInfoFromConfigOptions(_profileId: string, _config: AcpStubAgentConfig, configOptions: readonly acp.SessionConfigOption[] | undefined): LlmModelReasoningInfo | undefined;
/** Apply display-only disambiguation after flattening ACP model options.
 * Identity (`id`) and the option value are never changed and names from
 * different profiles are intentionally not compared. */
export declare function disambiguateProbeModels(models: readonly LlmModelInfo[]): LlmModelInfo[];
export declare function probeModels(provider: string, configOptions: AcpProbeResult['configOptions']): LlmModelInfo[];
/**
 * Map a probe failure to a locale-neutral host diagnostic, classified by
 * {@link AcpErrorKind}. Browser surfaces localize from `failureKind`; this
 * English text is only the technical fallback for hosts without that UI.
 */
/** Keep protocol diagnostics useful in logs/settings without leaking stderr or
 * allowing an agent to create an unbounded ModelPicker error row. */
export declare function boundedProbeDiagnostic(value: string): string;
/**
 * Probe helper owned by one ACP profile adapter. `stream()` throws guidance;
 * `listModels` serves that profile's shared ModelPicker/Settings probe cache.
 * Both success and failure are cached by config hash. Settings/health consumes
 * the latest outcome, while model selection can retain the last verified
 * catalog after an automatic refresh failure for the same configuration.
 */
export declare class AcpStubAdapter extends LlmAdapter {
    private readonly options;
    private readonly probeOptions;
    private readonly cache;
    private readonly lastGoodCatalog;
    /** In-flight probes, so concurrent catalog builds share one spawn per route. */
    private readonly inflight;
    constructor(options: AcpStubAdapterOptions);
    providerInfo(provider: string): LlmProviderInfo;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    /**
     * This route never serves a model call. The error is what a session whose
     * selection points at an ACP route surfaces (: switching a blank
     * session to an ACP provider mid-life reports guidance, and the runtime
     * normalizes the throw into a terminal stream failure).
     */
    stream(_options: GenerateOptions): AsyncIterable<StreamChunk>;
    /** Drop probe outcomes and retained catalogs so an explicit re-check starts fresh. */
    invalidateProbe(provider?: string): void;
    /** Last cached probe outcome for the health endpoint; undefined when never probed. */
    probeSnapshot(provider: string): AcpProbeCacheEntry | undefined;
    /** Session configuration from the last verified catalog for the current config. */
    configOptions(provider: string): readonly acp.SessionConfigOption[] | undefined;
    /** Configuration confirmed after selecting one model in the disposable
     * probe session. A missing model-specific result cannot borrow another
     * model's reasoning choices. Agents without model-specific discovery keep
     * their original session-scoped snapshot. */
    configOptionsForModel(provider: string, model: string): readonly acp.SessionConfigOption[] | undefined;
    private currentCatalog;
    private probeAndCache;
}
//# sourceMappingURL=llm-stub.d.ts.map