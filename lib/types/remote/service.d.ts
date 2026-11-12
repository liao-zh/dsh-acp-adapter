/**
 * dshAcp Remote service。
 *
 * 登录遵循 external-login-only：用户只在 Agent 自带 CLI 中登录，面板仅展示
 * 探针状态和 loginHint。ACP 会话的控制面只通过 host-owned recovery/session-control 方法暴露；模型选择、
 * 权限和 elicitation 仍由 DSH 原生面或 host handler 处理。公开方法为 health、
 * backendOf、boundSessions、audit/activity timeline、recovery 和 agent session controls。
 * 所有调用都走宿主 typed Remote，不保留手写 HTTP 写旁路。
 *
 * 边界形态：
 * - `AcpRemoteService extends TypertRemoteService`（`super(ctx, 'dshAcp')`），方法
 *   以 `@Remote` 标注；strict descriptor/zod codec 由构建期
 *   `scripts/gen-typert.ts` 生成（lib/typert.host.{js,d.ts} +
 *   lib/typert.remote-client.{js,d.ts}），host 侧经 typert-loader 自动注册进
 *   `ctx.typert`，client 侧 `ctx.remote.$mount(contribution)` 挂载。
 * - wire 类型全部来自 src/contract/remote.ts 的收窄 contract（SDK v1 类型的
 *   `_meta: Record<string, unknown>` 过不了 strict boundary，且 client 本就只
 *   消费收窄字段）；SDK → contract 的显式映射在本文件（数据最小化：auth 的
 *   vars/env 键名、config option 的 `_meta` 不过线）。
 * - 会话身份只使用 JSON `sessionId: string` 参数；backend/recovery 由 Host 的
 *   binding、request header 与 recovery store 提供，不暴露 Agent 控制对象。
 * - 错误纪律：业务失败统一映射为 `dsh-acp/*` `RemoteError`，保留稳定的
 *   category 以及 ACP kind/correlationId；参数错误使用 Gateway 公共
 *   `gateway/bad-request`。Gateway 将 typed code/details 原样送到 Client，
 *   不再把可判别的 ACP 失败折叠为 `gateway/internal`。
 *
 * Subprocess seam（不变）：两个缺省实现（可执行预检 / `<command> --version`）
 * 全经宿主公共 seam `ctx.subprocess` 的解析产物（deps.subprocess 注入）——
 * 本模块不触碰 `node:child_process`。seam 缺席时缺省实现 fail closed：
 * executable=false、version=null。
 *
 * 本包 tsconfig 用 `types: []`（不含 node 全局类型）；本文件是 host 侧
 * 子进程模块，经下方 triple-slash reference 显式引入 @types/node
 * （src/protocol/v1/connection.ts 同款先例），不改动共享 tsconfig。
 * @module @zaimokuza/dsh-acp-adapter/remote/service
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type * as acp from '@agentclientprotocol/sdk';
import type { AcpAgentConfig } from '../domain/session/agent-config.ts';
import type { AcpSessionContinuityState } from '../runtime/session/continuity.ts';
import type { SubprocessSeamResolution } from '../runtime/process/subprocess.ts';
import type { AcpApprovalChildView, AcpTeamMemberView, AcpTeamMemberModelsView, AcpBackendState, AcpBoundSessionsView, AcpCapabilityFacts, AcpRecoveryView, AcpRecoveryFrame, AcpHealthView, AcpHealthRequest, AcpAuditTimelinePage, AcpAuditTimelineEntry, AcpDiagnosticView, AcpActivityFilterView, AcpActivityPageView, AcpActivitySnapshotView, AcpActivityView, AcpActivityJournalFrame, AcpAgentSessionSnapshotView, AcpAgentSessionFrame, AcpAgentSessionOptionWrite, AcpToolApprovalPolicySnapshot, AcpToolApprovalPolicyFrame, AcpToolApprovalPolicyWrite, AcpOwnedRoutesView, AcpProjectedSubagentsView } from '../contract/remote.ts';
export type { AcpAuditSummaryCode } from '../contract/remote.ts';
/** `<command> --version` 尽力而为的短超时（毫秒）。 */
export declare const DEFAULT_VERSION_PROBE_TIMEOUT_MS = 3000;
/**
 * 把 initialize 响应的 `AgentCapabilities` 实际值归一化为展示事实；
 * 未握手/未广告（undefined/null）归 null（UI 显示「未知」，绝不编造）。
 */
export declare function capabilityFactsOf(caps: acp.AgentCapabilities | null | undefined): AcpCapabilityFacts | null;
/**
 * Probe-cache face the health method uses
 * （`AcpStubAdapter.probeSnapshot/invalidateProbe/listModels` 结构面；ok 分支的
 * authMethods 现在随缓存保留、过线前收窄）。`listModels` 是「重新检查」
 * （收尾）的重探触发器：失败同样落缓存（缓存的错误即失败事实），调用方
 * catch 后读新快照。
 */
export interface AcpProbeCacheLike {
    probeSnapshot(routeId: string): AcpProbeSnapshotLike | undefined;
    invalidateProbe(routeId: string): void;
    /** 触发一次重探（结果落缓存）；reject = 探测失败（失败条目已落缓存）。 */
    listModels(routeId: string): Promise<unknown>;
}
/**
 * llm-stub 探针缓存条目的结构面（key 配置哈希 + at 时间戳 + 成功/失败分支；
 * SDK 原值，出栈前收窄）。设置页只接受 key 与当前配置的
 * `acpProbeConfigKey` 相等的最后一次明确结果；这里不套模型目录缓存 TTL，
 * 避免把“上次检查成功”在 10 分钟后错误降成“从未探测”。模型目录仍由
 * llm-stub 的 `acpProbeFresh` 执行 ok 10min / error 30s 的运行时缓存策略。
 * ok 分支的 cleanup/capabilityHash 是
 * 新增——旧条目（或测试夹具）缺席时 health 行如实归 null。
 */
export interface AcpProbeSnapshotLike {
    readonly key: string;
    readonly at: number;
    readonly result: {
        readonly kind: 'ok';
        readonly models: readonly unknown[];
        readonly authMethods?: readonly acp.AuthMethod[];
        /** initialize 握手原值（现在随缓存保留；缺失时 health 行归 null）。 */
        readonly agentInfo?: acp.Implementation | null | undefined;
        readonly agentCapabilities?: acp.AgentCapabilities | undefined;
        /** probe 会话清理事实（缺席时 health 行归 null）。 */
        readonly cleanup?: {
            readonly close: string;
            readonly delete: string;
            readonly message?: string | undefined;
        } | undefined;
        /** initialize 握手能力的 sha256-16（缺席时 health 行归 null）。 */
        readonly capabilityHash?: string | undefined;
        /** initialize 协商的协议版本（边界；缺席时 health 行归 null）。 */
        readonly protocolVersion?: number | undefined;
        /**
         * configOptions 是否含 `category=model` 项（ 五态目录口径；
         * 旧条目/测试夹具缺席时按「无 model 类 configOption」计，与引入前逐字节一致）。
         */
        readonly hasModelConfigOption?: boolean | undefined;
    } | {
        readonly kind: 'error';
        readonly failureKind: string;
        readonly error: {
            readonly message: string;
        };
        /** probe 失败阶段（未标记时 health 行归 null）。 */
        readonly probePhase?: 'initialize' | 'session' | undefined;
    };
}
/** Registry face: agent 列表 + probe 缓存（快照/刷新）。 */
export interface AcpHealthRegistryLike {
    agents(): ReadonlyMap<string, AcpAgentConfig>;
    /** Resolve the registered profile adapter that owns this route's probe cache. */
    readonly probeCacheFor: (profileId: string) => AcpProbeCacheLike | undefined;
    /** Publish settled explicit checks through the native model registry. */
    readonly modelsChanged?: (profileIds: readonly string[]) => void;
}
/** Host-owned recovery verbs for the provider composition.  This deliberately
 * exposes no legacy Agent object or model/options surface. */
export interface AcpRecoveryAdapterLike {
    retryOriginal(sessionId: string): Promise<void>;
    rebindBlank(sessionId: string): Promise<void>;
}
/** New additive provider control seam. It never exposes the legacy Agent. */
export interface AcpAgentSessionControlLike {
    setTeamMemberMode?(sessionId: string, modeId: string): Promise<AcpAgentSessionSnapshotView>;
    agentSessionSnapshot(sessionId: string): Promise<AcpAgentSessionSnapshotView>;
    setAgentSessionOption(sessionId: string, request: AcpAgentSessionOptionWrite): Promise<AcpAgentSessionSnapshotView>;
}
export interface AcpRemoteServiceDeps {
    /** Live runtime ownership; deliberately accepts native as well as ACP parents. */
    approvalChildren?: (parent: string) => readonly AcpApprovalChildView[];
    teamManagement?: {
        members(lead: string): Promise<readonly AcpTeamMemberView[]>;
        models?(lead: string, member: string): Promise<AcpTeamMemberModelsView>;
        selectModel?(lead: string, member: string, model: string): Promise<AcpTeamMemberModelsView>;
    };
    /** Registry：agent 列表 + probe 缓存（快照/刷新）。 */
    registry: AcpHealthRegistryLike;
    /**
     * 宿主结构门事实（；缺省恒 true）：health 行的五态 `state` 字段在
     * 结构门未通过时归 `incompatible`。生产接线由 host composition 以公开宿主
     * 服务组装（remote 层不依赖宿主私有实现
     * ——test/contracts/architecture.spec.ts 白名单）。
     */
    hostCompatible?: () => boolean;
    /** 可执行存在性检查；缺省 `seam.resolveExecutable`（seam 缺席时恒 false）。 */
    checkExecutable?: (command: string) => Promise<boolean>;
    /** 版本查询；缺省经 seam 的 `<command> --version` 尽力而为（seam 缺席时恒 null）。 */
    queryVersion?: (command: string) => Promise<string | null>;
    /**
     * 加载期解析的 subprocess seam（host composition 注入）。
     * 仅驱动两个缺省实现：ok 时 checkExecutable=resolveExecutable 预检、
     * queryVersion=经 seam spawn `<command> --version`；缺席/未接线时缺省实现
     * fail closed（false / null）。显式注入的 checkExecutable/queryVersion 不受
     * 本字段影响。
     */
    subprocess?: SubprocessSeamResolution;
    /**
     * 活体 ACP 会话的连续性清单（health 视图 `liveSessions` 字段的数据源）。
     * 可选；未接线时该字段归 null，区别于明确读取后没有活体会话的空数组。
     * 当前 provider composition 不接线此清单。
     */
    listLiveSessions?: () => readonly {
        readonly sessionId: string;
        readonly continuity: AcpSessionContinuityState;
    }[];
    /**
     * `backendOf` 的 backend 事实源（缺席时 backendOf 响亮拒绝——未接线
     * 不冒充 blank）。生产接线 = host composition：
     * - `readBindingProvider`：sidecar 最新 binding 的 provider（ok 且语义门槛
     *   通过）；无记录/读取失败/outdated 归 undefined（binding 读取失败非权威，
     *   与 resume 的 readBindingFor 同款容错）；
     * - `peekHeaderProvider`：日志末条 request/header 的 provider（只读
     *   inspect 窥测，resume 同款手法）；会话存在但无 header 归 undefined，
     *   会话不存在/日志不可读/无持久化后端则 throw；
     * - `hasLiveAgent`：任意 backend 的活体 agent 在场判定（session 存在性证据）。
     */
    backendFacts?: {
        readonly readBindingProvider: (sessionId: string) => Promise<string | undefined>;
        readonly peekHeaderProvider: (sessionId: string) => Promise<string | undefined>;
        readonly hasLiveAgent: (sessionId: string) => boolean;
    };
    /**
     * `boundSessions` 的 binding 计数源（删除确认提示；缺席时 boundSessions
     * 响亮拒绝——未接线不冒充 0）。生产接线 = host composition 以
     * sidecar.listBindings 按 provider 过滤计数（只读）。
     */
    bindingFacts?: {
        readonly countBoundSessions: (provider: string) => Promise<number>;
        readonly listBoundProviders?: () => Promise<readonly string[]>;
    };
    /** Durable recovery state used when a session is not currently live. */
    recoveryStateStore?: {
        readonly read: (sessionId: string) => Promise<AcpRecoveryView | undefined>;
    };
    /** Resolves the ACP profile adapter named by a durable binding. */
    recoveryAdapter?: (provider: string) => AcpRecoveryAdapterLike | undefined;
    /** Resolves only the new per-profile provider control surface. */
    agentSessionControl?: (provider: string) => AcpAgentSessionControlLike | undefined;
    toolApprovalPolicy?: {
        readonly read: (sessionId: string) => Promise<AcpToolApprovalPolicySnapshot>;
        readonly write: (sessionId: string, policy: 'auto' | 'ask') => Promise<AcpToolApprovalPolicySnapshot>;
    };
    toolApprovalPolicyChanges?: {
        readonly subscribe: (changed: () => void) => () => void;
        readonly notify: () => void;
    };
    /** A real host session may subscribe before its first ACP binding exists. */
    agentSessionChanges?: {
        readonly canRead: (sessionId: string) => boolean | Promise<boolean>;
        readonly subscribe: (sessionId: string, changed: () => void) => () => void;
    };
    /** Host-projected, bounded sidecar rows. Raw persistence payloads stay host-side. */
    auditTimeline?: {
        readonly list: (sessionId: string, afterSeq: number, limit: number, throughSeq?: number) => Promise<readonly AcpAuditTimelineEntry[]>;
        readonly hasMore: (sessionId: string, seq: number, throughSeq?: number) => Promise<boolean>;
        readonly head: (sessionId: string) => Promise<number>;
        readonly scanPage: (sessionId: string, afterSeq: number, limit: number, throughSeq: number) => Promise<{
            readonly entries: readonly AcpAuditTimelineEntry[];
            readonly scannedThrough: number;
            readonly scannedRecords: number;
            readonly unreadableRecords: number;
            readonly hasMore: boolean;
        }>;
    };
    /** Host-owned ACP activity journal. All reads are bounded and session-scoped;
     * raw sidecar handles never cross the Remote boundary. */
    activityTimeline?: {
        readonly snapshot: (sessionId: string, limit: number, filter?: AcpActivityFilterView) => Promise<readonly AcpActivityView[]>;
        readonly page: (sessionId: string, afterRevision: number, limit: number, filter?: AcpActivityFilterView, throughRevision?: number) => Promise<readonly AcpActivityView[]>;
        readonly head: (sessionId: string, filter?: AcpActivityFilterView) => Promise<number>;
        /** Delivers each committed revision at most once and in ascending revision order. */
        readonly subscribe?: (sessionId: string, filter: AcpActivityFilterView | undefined, subscriber: (activity: AcpActivityView) => void) => () => void;
    };
    /** Authorizes a client-facing activity read against the current DSH session.
     * Missing authorization is fail-closed; it is never inferred from a string id. */
    activityAccess?: (sessionId: string) => boolean | Promise<boolean>;
    /** Shared strict gate for audit and activity reads; production uses durable ownership only. */
    ownedSessionReadGate?: (sessionId: string) => boolean | Promise<boolean>;
    /** Strict decision for the live activity stream, including its initial binding race. */
    activityReadStatus?: (sessionId: string) => 'owned' | 'binding-pending' | 'denied' | Promise<'owned' | 'binding-pending' | 'denied'>;
    projectedSubagentIds?: () => Promise<readonly string[]>;
    /** Whether the DSH durable attachment service is mounted for ACP image input. */
    imageInputAvailable?: boolean;
}
/**
 * dshAcp namespace 的 Remote service（构造即注册 cordis service，gateway 经
 * strict descriptor 找到实例并调用）。当前公开面：health/backendOf/boundSessions、
 * audit/activity timeline、recoverySnapshot/retryOriginal/rebindRecoveryBlank、
 * agentSessionSnapshot/setAgentSessionOption。
 * - `health()`                    ← GET /dsh-acp/health（provider 行 + 顶层
 *   健康快照；**密钥边界** 只回显 command/args/loginHint，
 * env 永不在响应里——钉版见 test/integration/host/health.spec.ts；每行携带五态
 *   `state`，派生规则见 src/domain/session/agent-state.ts）
 * - `recoverySnapshot(sessionId)` ←：读取 sidecar 的恢复闩锁，不解析旧 Agent
 * - `retryOriginal(sessionId)` ←：恢复原 ACP binding，不重发中断 prompt
 *
 * 全部依赖注入（{@link AcpRemoteServiceDeps}）；测试直接 new 实例驱动方法，
 * 不再经过 HTTP req/res 假件。
 */
export declare class AcpRemoteService extends TypertRemoteService {
    private readonly resolved;
    private readonly recoveryOperations;
    constructor(ctx: Context, deps: AcpRemoteServiceDeps);
    /** Read a bounded sidecar page. Raw payloads never cross the Remote boundary. */
    auditTimeline(sessionId: string, request?: {
        readonly afterSeq?: number;
        readonly limit?: number;
        readonly view?: AcpDiagnosticView;
        readonly captureSnapshot?: boolean;
        readonly snapshotHead?: number;
    }): Promise<AcpAuditTimelinePage>;
    /** Opening snapshot for the activity panel. Authorization is deliberately
     * separate from the sidecar query: a caller cannot turn an arbitrary string
     * into access to another DSH session's Agent trace. */
    activitySnapshot(sessionId: string, request?: {
        readonly limit?: number;
        readonly filter?: AcpActivityFilterView;
    }): Promise<AcpActivitySnapshotView>;
    /** Exact immutable revision; use the same ownership gate as journal reads. */
    activityDetail(sessionId: string, request: {
        readonly activityId: string;
        readonly revisionSeq: number;
        readonly ownerDshSessionId: string;
    }, signal?: AbortSignal): Promise<AcpActivityView>;
    /** Revision-cursor page used for reconnect/gap repair. The page contains
     * every committed revision, while the snapshot contains only current rows. */
    activityPage(sessionId: string, request?: {
        readonly afterRevision?: number;
        readonly limit?: number;
        readonly filter?: AcpActivityFilterView;
        readonly snapshotHead?: number;
        readonly captureSnapshot?: boolean;
    }, signal?: AbortSignal): Promise<AcpActivityPageView>;
    /**
     * Snapshot-first live journal. The subscription is attached before the
     * opening read, so a revision committed during the opening window is either
     * present in the opening snapshot or remains queued for delivery. The
     * opening cursor is the unfiltered session head; clients filter activities
     * locally while retaining a contiguous reconnect cursor.
     */
    activityFollow(sessionId: string, request: {
        readonly limit?: number;
        readonly filter?: AcpActivityFilterView;
    } | undefined, signal: AbortSignal): AsyncIterable<AcpActivityJournalFrame>;
    private requireActivityRead;
    /** Validate identity and ownership before touching either sidecar source. */
    private requireOwnedSessionAccess;
    private hasOwnedSessionAccess;
    teamMembers(lead: string): Promise<readonly AcpTeamMemberView[]>;
    /** Authoritative eligible descendants; no approval is recreated or answered here. */
    approvalChildren(parent: string): Promise<readonly AcpApprovalChildView[]>;
    teamMemberModels(lead: string, sessionId: string): Promise<AcpTeamMemberModelsView>;
    setTeamMemberModel(lead: string, sessionId: string, model: string): Promise<AcpTeamMemberModelsView>;
    setTeamMemberMode(lead: string, sessionId: string, modeId: string): Promise<AcpAgentSessionSnapshotView>;
    /** Exact ownership proof consumed by additive client observers. Historical
     * routes remain owned after profile removal so old Activity still renders;
     * an unrelated plugin merely using the `acp-` prefix is never claimed. */
    ownedProviderRoutes(): Promise<AcpOwnedRoutesView>;
    projectedSubagentIds(): Promise<AcpProjectedSubagentsView>;
    /** Global discovery carries only the sessions allowed for this actual Remote caller. */
    private callerCanReadSession;
    /**
     * 全部 provider 的健康行（executable/version/probe 快照收窄透传 + 五态
     * `state`）+ 沙箱/指标/活体会话连续性事实。`request.recheck === true` 时重探：
     * `agentId` 在场只检查并返回该 provider，缺席检查并返回全部。这样卡片操作
     * 不会为无关 Agent 运行 executable/version/protocol probe；缺省只读缓存视图
     * （面板打开不 spawn probe）。
     */
    health(request?: AcpHealthRequest): Promise<AcpHealthView>;
    /** Additive Agent-owned controls/context surface. It intentionally does not
     * reuse the legacy live Agent/options service, model picker, or DSH usage. */
    agentSessionSnapshot(sessionId: string): Promise<AcpAgentSessionSnapshotView>;
    /** Subscribe before reading: creation or a config notification cannot fall into the opening gap. */
    agentSessionFollow(sessionId: string, signal: AbortSignal): AsyncIterable<AcpAgentSessionFrame>;
    setAgentSessionOption(sessionId: string, request: AcpAgentSessionOptionWrite): Promise<AcpAgentSessionSnapshotView>;
    toolApprovalPolicy(sessionId: string): Promise<AcpToolApprovalPolicySnapshot>;
    setToolApprovalPolicy(sessionId: string, request: AcpToolApprovalPolicyWrite): Promise<AcpToolApprovalPolicySnapshot>;
    toolApprovalPolicyFollow(sessionId: string, signal: AbortSignal): AsyncIterable<AcpToolApprovalPolicyFrame>;
    private requirePolicySessionAccess;
    private agentSessionControlFor;
    /** Read Host-owned recovery facts, including its durable store and in-memory fallback. */
    recoverySnapshot(sessionId: string): Promise<AcpRecoveryView>;
    /** Subscribe before reading volatile and durable recovery facts; reads stay side-effect-free. */
    recoveryFollow(sessionId: string, signal: AbortSignal): AsyncIterable<AcpRecoveryFrame>;
    private recoveryAdapterFor;
    /** Serialize destructive recovery choices for one owned session only. */
    private runRecoveryOperation;
    /** Retry the original durable Agent binding; never resends the interrupted prompt. */
    retryOriginal(sessionId: string): Promise<AcpRecoveryView>;
    /** Rebind a blank ACP context and return recovery state without requiring an option snapshot. */
    rebindRecoveryBlank(sessionId: string): Promise<AcpRecoveryView>;
    /**
     * Read the current backend from its durable binding, then request header.
     * A known live session without either fact is blank; an absent or unreadable
     * session without live existence evidence is rejected rather than guessed.
     */
    backendOf(sessionId: string): Promise<AcpBackendState>;
    /**
     * boundSessions（删除确认提示）：该 profile（按 agent id）当前被多少个
     * 既有 DSH 会话的 sidecar binding 引用——删除 profile 后这些会话显示
     * backend-unavailable，面板在确认文案中如实预告。纯读零副作用；agent id
     * 非法或未接线一律 throw（不冒充 0）。
     */
    boundSessions(agentId: string): Promise<AcpBoundSessionsView>;
}
//# sourceMappingURL=service.d.ts.map