/**
 * Sidecar 旁路存储（sidecar 持久化规则，持久化原则）：审批审计与 ACP binding
 * **不落 session log**，落 harness-home 下的插件私有存储（root =
 * `<dshHome>/dsh-acp`）。
 *
 * 为什么不在 session log：live-event ordering evidence 表明（
 * orchestrator 复跑复证）——插件直写 `ctx.sessionPersistence.append` 会在 live
 * session 上每条 marker 静默吞掉其后一条 live 事件（重启才显形）；`Session.append`
 * 又无 ignorable 写入面。在宿主提供可忽略审计事件入口前，sidecar 是审计真源。
 *
 * ## node:sqlite（DatabaseSync）+ WAL 生产化重写
 *
 * 存储引擎从「每 sessionId 一个 JSONL 文件 + tmp/fsync/rename 原子发布」重写为
 * 单库文件 `<root>/sidecar.sqlite`（`journal_mode=WAL`、`synchronous=NORMAL`、
 * `busy_timeout=5000`）。选型定稿理由：Node ≥22.13 `node:sqlite` 免 flag
 * （engines `^22.19||>=24` 全覆盖），零新依赖；WAL 自带崩溃恢复（进程级 kill -9
 * 不丢已 commit 事务）；追加是 O(1) 页写入而非 JSONL 的全文重写。`synchronous=
 * NORMAL` 下 commit 不逐条 fsync（无 fsync 风暴），进程崩溃不丢已提交记录；整库
 * checkpoint 在 {@link AcpSidecar.flush}/{@link AcpSidecar.dispose} 周期性执行。
 *
 * **不自动迁移旧 JSONL**：SQLite 重写发生在 1.0 前的 RC 阶段，旧
 * `<sessionId>.jsonl` 从未成为稳定存储契约。启动时若发现旧文件，仅 warn 并忽略，
 * 不读、不迁、不删；对应旧会话因缺少 binding 进入 reconciliation-required
 * fail-safe（`binding-missing`）。需要保留旧 Agent 上下文时，应先用生成该 JSONL
 * 的旧插件版本处理；否则由用户显式放弃旧 ACP 上下文。当前 SQLite 数据库保持兼容。
 * `.corrupt-*` 坏行隔离概念随之删除——SQLite 要么库损坏要么不损坏，不存在行级
 * 隔离；库无法打开或校验失败时 open 即 fail loud，读路径不吞错继续。
 *
 * `platform` option 与 ./platform.ts（rename/重试画像）随本重写一并移除——SQLite
 * 的 commit/WAL 恢复取代了 tmp+rename 发布面；这是上述 1.0 前 RC 的存储破坏性变更。
 *
 * ## 表结构
 *
 * - `audit` 追加表（全部 kind 的完整历史）：record_id（per-session 唯一）、
 *   dsh_session_id、seq（per-session 单调，1 起）、time、kind、acp_provider_id?、
 *   acp_session_id?、dedupe_key（仅 permission decided 有值，`(dsh_session_id,
 *   dedupe_key)` 部分唯一索引）、payload（canonical JSON 文本，键序稳定）。
 * - `bindings` 最新索引表：dsh_session_id 主键 upsert（payload + envelope 分量），
 *   {@link AcpSidecar.readLatestBinding}/{@link AcpSidecar.listBindings} 只查此表。
 * - `option_snapshots` 冷启动 last-known 配置快照表：每会话
 *   至多一行（dsh_session_id 主键 upsert），payload 为
 *   {@link AcpOptionsSnapshotRecord}——标准化且有界（`_meta`/未知键剥离，
 *   字段/值数/总字节硬上限见 `ACP_SNAPSHOT_*` 常量）；取代 binding 曾携带的
 *   一次性无界 `configSnapshot`（该字段已删除，单一事实副本只在此表）。
 *   活体权威快照到达即刷新（建立/set_config_option/set_mode/turn 收束变更）；
 *   写失败仅 warn（last-known 是展示/参考面，不是提交面）。
 * - `member_model_selections` teammate 模型选择表：每个 DSH session 至多一行，
 *   记录最近选择及其 binding key；binding 变化由调用方决定是否重新解释，sidecar
 *   不主动清除该配置。
 * - `activity_journal` 外部 Agent 活动表：按 DSH session 隔离、以 activity_id
 *   append-only revision，activity_seq 只在首次出现时分配，revision_seq 为每次
 *   mutation 的连续游标；它是机器可读的执行活动面，和面向人的 audit envelope
 *   分开。活动行可独立分页，并作为会话轨迹与外部子代理投影的持久事实源。
 *
 * **recordId 派生**（钉版规则不变）：permission **decided** →
 * `decided:<agentSessionId>:<toolCallId>:<requestId>`（requestId 为
 * `dsh-acp-permission-<randomUUID >`，跨进程/跨重启唯一）；其余 →
 * `h:<sha256-16>`（canonical `[kind,time,payload]` 的键序无关稳定哈希），同会话内
 * 撞名追加 `-2/-3…` 序号。
 *
 * **decided 去重**（幂等语义不变）：待写 decided 的去重键已存在 → 跳过写入并
 * 正常 resolve（`BEGIN IMMEDIATE` + 精确 dedupe 冲突处理；先 SELECT 预检避免
 * 无谓消耗 seq）。只对 decided 去重：同 requestId 的 asked 重放是真实事件，审计如实各落
 * 一条；键缺任一分量的 decided 不参与去重（宁多落一条也不丢审计）。
 *
 * **binding 语义门槛（不变）** envelope 落库 ≠ binding 可用。
 * {@link AcpSidecar.readLatestBinding} 对 bindings 表最新 payload 做全字段语义校验
 * （{@link AcpBindingData} 全部必填字段）；不通过判 `{status:'outdated'}`（调用方
 * 映射 'binding-outdated'，绝不回退更早的 binding——索引表只有最新一条）。
 * binding 指纹的扩展分量一律 optional：
 * 缺席（旧版本写出的 binding）不判 outdated，由 profile-adapter.ts 的指纹 canonical 哈希
 * 预检以既有 'profile-changed' 阻断；字段在场时这里只做形态校验。
 *
 * ## 有界审计队列（有界审计队列）
 *
 * 同步 durable 路径（append 落库 commit 后才 resolve）：`binding`（recordBinding
 * fail-closed：binding 先于 prompt）与 `permission`（审批桥 fail-closed：append
 * reject → cancelled，见 src/domain/policy/permissions.ts）。其余 kind
 * （reconciliation/degradation/replay-assessment）进**有界
 * 内存队列**（上限 {@link ACP_SIDECAR_AUDIT_QUEUE_LIMIT}，默认 1024；满 → 丢弃
 * 新记录并 warn 计数，绝不阻塞 turn），microtask 批量事务落库；
 * {@link AcpSidecar.flush} 落齐全部排队记录（生产接线：AcpAgent turn 收束与
 * dispose 前调用）。读路径（list/readLatestBinding/listBindings）先
 * 落齐队列再查库——append → list 的可见性顺序与 JSONL 时代一致。队列是内存面：
 * 进程崩溃丢失未 flush 的非审批审计（可接受，设计既定）；binding/permission 不走
 * 队列，无此窗口。
 *
 * ## 权限位与生命周期
 *
 * 目录 `0700`；`sidecar.sqlite` 及 `-wal`/`-shm` `0600`（打开后显式 chmod 兜底——
 * SQLite 自建的 wal/shm 不吃 umask 之外的约束，flush/checkpoint 后复 chmod）。
 *
 * 宿主仍无插件可消费的会话删除钩子；sidecar 行的生命周期
 * 因此与 harness-home 一致。ACP 审计不随 DSH 官方 `/export`（Alpha 仍无
 * ignorable 事件 seam，DSH 自定义审计 seam 缺失）。
 *
 * stateRoot 来源：dsh 没有 per-profile 插件目录，惯例是 harness-home 全局
 * （settings-file、sessions 同在 `resolveDshHome()` 下，dev/prod 隔离靠
 * `DSH_HOME`）。app-boot `boot()` 在挂载插件树之前 `ctx.provide('dshHomePath',
 * dshHomePath)`（app-boot/src/index.ts:770），故 {@link installAcpSidecar} 用
 * host composition 的 widen-accessor 模式读该 slot；slot 缺席
 * （裸 Context 单测）返回 `undefined` 并 warn—— sidecar 是 ACP 会话的
 * 强制前提：缺席时 ACP 会话一律拒绝启动（fail loud，见
 * provider runtime），不再「退化为纯窥测」。
 *
 * @module @zaimokuza/dsh-acp-adapter/persistence/sidecar
 */
import { type AcpActivityPresentation } from '../domain/policy/activity-presentation.ts';
import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session';
import type { AcpDegradationAuditData, AcpPermissionAuditData, AcpTerminalAuditData, AcpSessionForkAuditData } from '../domain/policy/events.ts';
import type { AcpOptionsSnapshotRecord } from './options-snapshot.ts';
export { ACP_SNAPSHOT_FIELD_MAX, ACP_SNAPSHOT_MODE_DESCRIPTION_MAX, ACP_SNAPSHOT_OPTION_LIMIT, ACP_SNAPSHOT_TOTAL_BYTES, ACP_SNAPSHOT_VALUES_LIMIT, acpOptionsSnapshotOf, toOptionsSnapshotRecord, } from './options-snapshot.ts';
export type { AcpOptionsSnapshotRecord, AcpOptionsSnapshotOption } from './options-snapshot.ts';
/** sidecar 记录格式版本（envelope 的 `schemaVersion`）。 */
export declare const ACP_SIDECAR_SCHEMA_VERSION: 2;
/** sidecar 单库文件名（`<root>/sidecar.sqlite`；WAL 旁生 `-wal`/`-shm`）。 */
export declare const ACP_SIDECAR_DB_FILENAME = "sidecar.sqlite";
/**
 * 非审批审计内存队列上限：满 → 丢弃新记录并 warn 计数，绝不阻塞 turn。
 * 生产接线在 turn 收束与 dispose 前 {@link AcpSidecar.flush} 落齐。
 */
export declare const ACP_SIDECAR_AUDIT_QUEUE_LIMIT: 1024;
/** Activity presentation/detail bounds keep the journal safe to render and page. */
export declare const ACP_ACTIVITY_PRESENTATION_MAX: 2048;
export declare const ACP_ACTIVITY_RAW_MAX: 16384;
export declare const ACP_ACTIVITY_REF_MAX: 512;
/** Durable provider dispatch state. A committed `dispatch-uncertain` row is
 * intentionally visible after a host crash; a later request must not silently
 * replay the same ACP prompt. */
export type AcpDispatchState = 'dispatch-uncertain' | 'settled';
export interface AcpDispatchRecord {
    readonly key: string;
    readonly dshSessionId: string;
    readonly provider: string;
    readonly model: string;
    readonly state: AcpDispatchState;
    readonly createdAt: number;
    readonly settledAt?: number;
    readonly provenance?: {
        readonly turn: number;
        readonly step: number;
        readonly startSeq: number;
        readonly endSeq: number | null;
        readonly anchorMessageId: string;
        readonly acceptedMessageIds: readonly string[];
        /** Absent on rows written by older pre-release builds. */
        readonly projectionFiltered?: boolean;
    };
}
export type AcpActivityKind = 'tool' | 'plan' | 'terminal' | 'diff' | 'resource' | 'delegated' | 'other';
export type AcpActivityStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'unfinished';
export interface AcpActivityRecord {
    readonly display?: AcpActivityPresentation;
    /** First-seen insertion boundary in the native assistant content; absent on legacy records. */
    readonly contentIndex?: number;
    readonly dshSessionId: string;
    readonly ownerDshSessionId: string;
    readonly promptAnchorMessageId: string;
    readonly activityId: string;
    /** Stable first-seen ordering used by the trajectory view. */
    readonly activitySeq: number;
    /** Monotonic mutation cursor used by page/follow consumers. */
    readonly revisionSeq: number;
    /** Last durable update time. */
    readonly time: number;
    readonly kind: AcpActivityKind;
    readonly status: AcpActivityStatus;
    readonly presentation: string;
    readonly rawDetail?: string;
    readonly rawDetailRef?: string;
}
export type AcpActivityInput = Omit<AcpActivityRecord, 'activitySeq' | 'revisionSeq'> & {
    readonly activitySeq?: number;
    readonly revisionSeq?: number;
};
/** Restricts an activity view to one owner/turn anchor.  Both fields are
 * optional so the host can ask for a whole session, but a client that renders
 * a single DSH turn should always provide the anchor. */
export interface AcpActivityFilter {
    readonly ownerDshSessionId?: string;
    readonly promptAnchorMessageId?: string;
}
/** Called only after the activity revision has committed in SQLite. */
export type AcpActivitySubscriber = (activity: AcpActivityRecord) => void;
/**
 * secret-free 启动指纹：profile config 的 command/args 原样 +
 * **排序后的环境变量键名**（`envKeys` 绝不含值）。
 * 恢复预检忽略历史目录版本参考字段，其余身份与当前配置不一致即 'profile-changed'。
 *
 * binding 中的扩展分量（组装真源：
 * src/domain/session/launch-fingerprint.ts）一律 **optional** 缺席 = 旧版本写出的
 * 指纹，不靠 readLatestBinding 判 outdated，而靠 canonical 哈希预检（新代码恒写出
 * 全部新键——N/A 记 null（canonical JSON 保留 null 键），除历史版本参考外，旧 binding 缺键 → 哈希
 * 不等 → 既有 'profile-changed' 阻断）。字段在场时 readLatestBinding 只做形态校验。
 */
export interface AcpLaunchFingerprint {
    readonly command: string;
    readonly args: readonly string[];
    readonly envKeys: readonly string[];
    /** Explicit profile env values, represented only by secret-free hashes. */
    readonly explicitEnv?: readonly {
        readonly key: string;
        readonly hash16: string;
    }[];
    /** 边界：注册表 profile id。 */
    readonly profileId?: string | null;
    /** 历史字段名：存储 runtime 绑定 id；普通 profile 记 null，重构不改写旧绑定。 */
    readonly descriptorId?: string | null;
    /** 边界：历史 descriptor 钉版字段（versionPolicy 已移除，新指纹恒 null；保留以兼容旧 binding 形状）。 */
    readonly adapterVersion?: string | null;
    readonly wrappedCliVersion?: string | null;
    /** 历史凭证引用字段；当前实现恒为 null，不接管 Agent 凭证。 */
    readonly envRefs?: readonly {
        readonly key: string;
        readonly present: boolean;
    }[] | null;
    /** 边界：executable override env 的 `{name,present}`（无声明记 null）。 */
    readonly executableOverride?: {
        readonly name: string;
        readonly present: boolean;
    } | null;
    /** Native final state-location env shape: fixed keys, presence, and value hashes only. */
    readonly nativeStateEnv?: readonly {
        readonly key: string;
        readonly present: boolean;
        readonly hash16?: string;
    }[] | null;
    /** Sorted explicit host tool selection hash; null when no host tools are exposed. */
    readonly mcpFingerprint?: string | null;
}
/** initialize 握手回报的 agent 身份（`agentInfo`；未回报字段如实缺省）。 */
export interface AcpBindingAgentInfo {
    readonly name?: string;
    readonly version?: string;
}
/** A user-selected mode belongs to one exact ACP binding, never a replacement session. */
export interface AcpModeIntent {
    readonly bindingKey: string;
    readonly modeId: string;
}
/** A member's selected model stays binding-scoped and is retained after application. */
export interface AcpMemberModelSelection {
    readonly bindingKey: string;
    readonly model: string;
}
export declare function modeIntentBindingKey(binding: AcpBindingData): string;
/**
 * ACP binding：dsh sessionId → ACP 侧会话的绑定事实（resume 路由 marker-first 的
 * 依据）。`provider` 是路由 id（`acp-<id>`），`agentSessionId` 喂给 `session/load`。
 *
 * 下列字段**全部必填**（缺字段 = 不可用 binding，
 * {@link AcpSidecar.readLatestBinding} 判 `{status:'outdated'}`）：
 * - `dshCommittedSeq`：本 binding 担保的 DSH 日志已提交前缀上界（写 binding 时
 *   建立 turn 起点处的 `session.seq`；此后每个 turn 收束时刷新到最新日志尖）。
 *   重启对账以 `[historyBaseSeq, dshCommittedSeq)` 为期望可见历史的取材区间。
 * - `historyBaseSeq`：本 ACP 代际可见历史的起始 seq（全新建立 = 建立 turn 起点；
 *   load 续代 = 沿用被加载 binding 的值；rebindBlank 新代际 = 重开 turn 起点——
 *   显式放弃的旧 ACP 上下文不参与期望序列）。
 * - `generation`：每 dsh session 从 1 单调递增；每次 `session/new` 重建 +1
 *   （load 续代不变）。
 */
export interface AcpBindingData {
    readonly provider: string;
    readonly agentSessionId: string;
    /** 注册表 profile id（路由 `acp-<id>` 的 `<id>` 部分）。 */
    readonly profileId: string;
    /** 建立时会话 cwd 的 canonical 形态（realpath）。 */
    readonly canonicalCwd: string;
    readonly launchFingerprint: AcpLaunchFingerprint;
    readonly agent: AcpBindingAgentInfo;
    /** initialize 协商出的 ACP protocolVersion。 */
    readonly protocolVersion: number;
    /** agentCapabilities canonical JSON 的 sha256-16（预检只记录不阻断；loadSession 缺席另有 'capability-missing'）。 */
    readonly capabilityHash: string;
    /** configOptions（id+当前值）+ currentModeId canonical JSON 的 sha256-16（预检只记录不阻断）。 */
    readonly configHash: string;
    readonly generation: number;
    /** Monotonic marker separating ACP rebind generations. */
    readonly bindingEpoch: number;
    /** Number of successfully committed ACP prompts represented by this binding. */
    readonly committedPromptOrdinal: number;
    /** 本代际可见历史的起始 seq（含；见类型注释）。 */
    readonly historyBaseSeq: number;
    /** 建立时间（epoch 毫秒）。 */
    readonly establishedAt: number;
    /** 本 binding 担保的 DSH 已提交日志前缀上界（不含；见类型注释）。 */
    readonly dshCommittedSeq: number;
}
/** {@link AcpSidecar.readLatestBinding} 的读出模型：最新一条合法 binding + 落盘时间。 */
export type AcpBindingRecord = AcpBindingData & {
    readonly time: number;
};
/**
 * {@link AcpSidecar.readLatestBinding} 的结果：最新 binding payload 语义校验通过 →
 * `{status:'ok'}`；存在 binding 行但缺 必填字段/语义畸形 →
 * `{status:'outdated'}`（不可用 binding，调用方映射 'binding-outdated'）；
 * 无 binding 行（或库不存在）→ `undefined`（与「不可用」明确区分）。
 */
export type AcpBindingLookup = {
    readonly status: 'ok';
    readonly binding: AcpBindingRecord;
} | {
    readonly status: 'outdated';
};
/**
 * reconciliation-required 的原因词表（sidecar `reconciliation` 记录的
 * `cause` 字段 + turn 失败错误 `ACP_RECONCILIATION_REQUIRED` 的分类）：
 * - 预检不一致：`cwd-changed`/`profile-changed`/`agent-changed`/`protocol-changed`
 * - 恢复路径失败：`capability-missing`（未广告 loadSession）/`id-not-found`
 *   （list 确定 miss）/`load-failed`（load 抛错）
 * - 回放对账失败：`replay-overflow`（staging 缓冲溢出）/`replay-diverged`
 *   （回放与 DSH 前缀数量/顺序/内容不符）/`dsh-log-diverged`（DSH 日志在
 *   担保前缀之后还有非崩溃尾巴的可见事件）/`dsh-log-truncated`（DSH 可见历史
 *   短于 agent 回放）
 * - binding 不可用：`binding-in-use`（双绑守卫冲突）/`binding-missing`
 *   （日志有 ACP 历史但无 binding——sidecar 丢失）/`binding-outdated`
 * （binding 缺 必填字段）/`backend-conflict`（binding、日志或恢复请求的
 * execution provider 互相矛盾）
 */
export type AcpReconciliationCause = 'cwd-changed' | 'profile-changed' | 'agent-changed' | 'protocol-changed' | 'capability-missing' | 'id-not-found' | 'load-failed' | 'replay-overflow' | 'replay-diverged' | 'dsh-log-diverged' | 'dsh-log-truncated' | 'binding-in-use' | 'binding-missing' | 'binding-outdated' | 'backend-conflict';
/** Durable current recovery state. Unlike the append-only audit stream this is
 * the small, directly readable state that survives refresh/restart and drives
 * the composer/recovery UI. */
export type AcpRecoveryStateKind = 'healthy' | 'reconnect-required' | 'outcome-unknown' | 'reconciliation-required' | 'session-lost' | 'local-history-damaged' | 'resumed-unverified';
export interface AcpRecoveryState {
    readonly dshSessionId: string;
    readonly kind: AcpRecoveryStateKind;
    readonly cause?: string;
    readonly detail?: string;
    readonly provider?: string;
    readonly acpSessionId?: string;
    readonly generation?: number;
    readonly interruptedTurnId?: string;
    /** Known, settled cwd handoff deferred by User Stop; never an uncertain fork. */
    readonly targetCwd?: string;
    /** Last time the host attempted a non-healthy recovery transition. */
    readonly lastAttemptAt?: number;
    /** Explicit user action, when the recovery surface records one. */
    readonly lastUserAction?: string;
    readonly updatedAt: number;
}
/**
 * `reconciliation` 记录的载荷：进入 reconciliation-required 的事实。
 * `detail` 是有界、无秘密的人类可读摘要（分叉 index 与两侧截断摘要等）；
 * `acpSessionId`（在场时）由 envelope 的 acpSessionId 冗余一份。
 */
export interface AcpReconciliationData {
    readonly cause: AcpReconciliationCause;
    readonly detail?: string;
    readonly acpSessionId?: string;
    readonly generation?: number;
}
/** Non-blocking result of comparing a session/load replay with DSH-visible history. */
export interface AcpReplayAssessmentData {
    /** Absent on historical records whose restore mechanism was not recorded. */
    readonly method?: 'reused' | 'resumed' | 'loaded';
    readonly status: 'matched' | 'different' | 'overflow' | 'not-compared' | 'unavailable';
    readonly detail?: string;
    readonly acpSessionId?: string;
    readonly generation?: number;
}
/** {@link AcpSidecar.listBindings} 的行项：一份有效 binding + 其所属 dsh sessionId（行键）。 */
export interface AcpBoundSessionBinding {
    readonly dshSessionId: string;
    readonly binding: AcpBindingRecord;
}
/** 统一读取模型的公共 envelope 字段。 */
interface AcpSidecarEntryBase {
    /** 记录格式版本（恒为 v2）。 */
    readonly schemaVersion: typeof ACP_SIDECAR_SCHEMA_VERSION;
    /** 落盘时间（epoch 毫秒）。 */
    readonly time: number;
    /** per session 单调序号。 */
    readonly seq: number;
    /** 稳定记录 id（派生规则见模块注释）。 */
    readonly recordId: string;
    /** 宿主 dsh 会话 id（行键）。 */
    readonly dshSessionId: string;
    /** ACP provider 路由 id（`acp-<id>`）；仅 binding 行有（推导自 payload.provider）。 */
    readonly acpProviderId?: string;
    /** ACP 侧会话 id；binding 恒有，permission asked/decided（此后）/ reconciliation（在场时）推导自 payload。 */
    readonly acpSessionId?: string;
}
/**
 * sidecar 记录的 `kind` 全集（判别联合的判别值）：`binding`/`permission`、
 * `reconciliation`（恢复对账失败 → reconciliation-required 的事实记录，载荷见
 * {@link AcpReconciliationData}）； 新增 `degradation`（tool result 内容
 * 降级事实，载荷见 {@link AcpDegradationAuditData}）； 新增 `session-fork`
 *（DSH fork 是否调用 ACP session/fork 及受控降级原因，载荷见
 * {@link AcpSessionForkAuditData}）。
 */
export interface AcpFileSystemAuditData {
    readonly operation: 'read' | 'write';
    readonly path: string;
    readonly bytes: number;
    readonly beforeHash: string | null;
    readonly afterHash: string | null;
    readonly outcome: 'ok' | 'error' | 'aborted' | 'timeout' | 'concurrent-change';
    readonly acpSessionId: string;
    readonly profileId: string;
    /** Content-free failure classification for diagnosing agent read requests. */
    readonly reason?: string;
    /** Original ACP read window when it was a safe integer. */
    readonly line?: number;
    readonly limit?: number;
}
export type AcpSidecarKind = 'binding' | 'permission' | 'reconciliation' | 'replay-assessment' | 'degradation' | 'filesystem' | 'terminal' | 'session-fork';
/** Single source of truth for sidecar kind → payload decoding/storage shape. */
export interface AcpSidecarPayloadByKind {
    binding: AcpBindingData;
    permission: AcpPermissionAuditData;
    reconciliation: AcpReconciliationData;
    'replay-assessment': AcpReplayAssessmentData;
    degradation: AcpDegradationAuditData;
    filesystem: AcpFileSystemAuditData;
    terminal: AcpTerminalAuditData;
    'session-fork': AcpSessionForkAuditData;
}
/**
 * 统一读取模型（判别联合，`kind` 判别）：`data` 访问器即落库 payload 的原内容
 * （内容消费契约不变，envelope 只是包装层）。
 */
export type AcpSidecarEntry = {
    [K in AcpSidecarKind]: AcpSidecarEntryBase & {
        readonly kind: K;
        readonly data: AcpSidecarPayloadByKind[K];
    };
}[AcpSidecarKind];
/** {@link AcpSidecar.append} 的入参：`time` 可缺省（由 store 的 `now()` 补齐）。 */
export type AcpSidecarEntryInput = {
    [K in AcpSidecarKind]: {
        readonly kind: K;
        readonly time?: number;
        readonly data: AcpSidecarPayloadByKind[K];
    };
}[AcpSidecarKind];
/**
 * sidecar 存储面（的唯一审计/binding 通道；SQLite WAL 承载）。
 *
 * 接口语义门槛（JSONL 时代钉版，本实现全数保持）：非法 sessionId **同步**抛
 * TypeError（契约违例，非运行时失败），I/O 失败才走 Promise 拒绝；
 * readLatestBinding 的 ok/outdated/undefined 三态；listBindings 只计入 ok。
 * SQLite 要么库损坏要么不损坏；库无法打开时 open 即 fail loud。
 */
export interface AcpSidecar {
    /** 存储根目录（`<dshHome>/dsh-acp`）。 */
    readonly root: string;
    /**
     * 追加一条记录。`binding`/`permission` 同步落库 commit 后才 resolve（durable
     * 语义）；其余 kind 进有界内存队列、入队即 resolve（绝不阻塞 turn，flush 落齐，
     * 见模块注释「有界审计队列」）。幂等去重副作用：待写记录是 permission decided
     * 且同去重键的 decided 已存在 → **跳过本次写入并正常 resolve**——重连重放不
     * 生成重复决定（审批 correlation）。
     * @param sessionId - dsh 会话 id（行键；非法字符抛 TypeError）。
     * @param entry - 待落盘记录；`time` 缺省时由 store 时钟补齐。
     */
    append(sessionId: SessionId, entry: AcpSidecarEntryInput): Promise<void>;
    /** Commit a confirmed cwd fork against its exact durable parent and fork intent. */
    commitDirectoryFork(sessionId: SessionId, parent: AcpBindingData, replacement: AcpBindingData): Promise<void>;
    /** Persist the dispatch uncertainty before crossing the ACP process boundary. */
    beginDispatch(record: AcpDispatchRecord): Promise<void>;
    /** Mark a previously durable dispatch complete; idempotent for settled rows. */
    settleDispatch(sessionId: SessionId, key: string, settledAt?: number): Promise<void>;
    /** Read a dispatch ledger row after restart. */
    readDispatch(sessionId: SessionId, key: string): Promise<AcpDispatchRecord | undefined>;
    /** Explicitly resolve a user-reviewed uncertain dispatch without replaying it. */
    clearDispatch(sessionId: SessionId, key?: string): Promise<void>;
    /** Upsert one external ACP activity, preserving its first-seen sequence. */
    upsertActivity(record: AcpActivityInput): Promise<AcpActivityRecord>;
    /** Opening snapshot, ordered by stable first-seen activity sequence. */
    activitySnapshot(sessionId: SessionId, limit?: number, filter?: AcpActivityFilter): Promise<readonly AcpActivityRecord[]>;
    /** Bounded activity revisions after a durable revision cursor. */
    activityPage(sessionId: SessionId, afterSeq: number, limit?: number, filter?: AcpActivityFilter, throughRevision?: number): Promise<readonly AcpActivityRecord[]>;
    /** Current durable activity head. */
    activityHead(sessionId: SessionId, filter?: AcpActivityFilter): Promise<number>;
    /**
     * Read-only ownership proof for a cold activity source. A session is trusted
     * only when it has a valid persisted ACP binding or an activity row whose
     * durable owner is that same session; missing/corrupt stores return false or
     * reject rather than granting access.
     */
    hasDurableActivityOwner(sessionId: SessionId): Promise<boolean>;
    /** Exact child ids created by the external-subagent projection bridge. */
    listProjectedSubagentIds(): Promise<readonly string[]>;
    /** Durable projection rows used to converge an interrupted two-store commit. */
    listProjectedSubagentActivities(): Promise<readonly AcpActivityRecord[]>;
    /** Subscribe to committed revisions. The returned disposer is idempotent. */
    subscribeActivity(sessionId: SessionId, filter: AcpActivityFilter, subscriber: AcpActivitySubscriber): () => void;
    /**
     * 最新一条 binding 的判定（语义门槛）：bindings 索引行的 payload 全字段
     * 语义校验通过 → `{status:'ok', binding}`；不通过 → `{status:'outdated'}`
     * （**不回退**——索引表只保留最新一条，最新即权威）；无 binding 行/库不存在
     * → `undefined`（resume 回退 request/header 窥测的信号）。
     */
    readLatestBinding(sessionId: SessionId): Promise<AcpBindingLookup | undefined>;
    /** Read the durable recovery state; missing rows mean healthy/never degraded. */
    readRecoveryState(sessionId: SessionId): Promise<AcpRecoveryState | undefined>;
    /** Atomically replace the current recovery state for a DSH session. */
    writeRecoveryState(state: AcpRecoveryState, options?: {
        readonly clearDispatch?: true;
    }): Promise<void>;
    /**
     * 全量 binding 索引（双绑守卫的唯一消费点 = host composition 的
     * resume 路由）：查 bindings 表全部行，仅语义校验通过（`{status:'ok'}`）者计入
     * （畸形行跳过并 warn；库不存在 → 空数组）。
     */
    listBindings(): Promise<readonly AcpBoundSessionBinding[]>;
    /** 该 sessionId 全量合法 entry（按 seq 升序；行级校验失败者跳过并 warn）；库不存在 → 空数组。 */
    list(sessionId: SessionId): Promise<readonly AcpSidecarEntry[]>;
    /** Cursor-paged audit read. Only the requested bounded window is decoded. */
    listPage(sessionId: SessionId, afterSeq: number, limit: number, throughSeq?: number): Promise<readonly AcpSidecarEntry[]>;
    /** Snapshot-only physical page; advances across malformed stored rows. */
    listPageScan(sessionId: SessionId, afterSeq: number, limit: number, throughSeq: number): Promise<{
        readonly entries: readonly AcpSidecarEntry[];
        readonly scannedThrough: number;
        readonly scannedRecords: number;
        readonly unreadableRecords: number;
        readonly hasMore: boolean;
    }>;
    /** Flush queued audit records and return the fixed durable high-water mark. */
    auditHead(sessionId: SessionId): Promise<number>;
    /**
     * 写入（upsert）该会话的 last-known option 快照（输入须先经
     * {@link acpOptionsSnapshotOf} 标准化）。同步 durable；写失败 reject
     * （调用方按「last-known 展示面」纪律降级为 warn，不翻转主链路）。
     */
    writeOptionSnapshot(sessionId: SessionId, snapshot: AcpOptionsSnapshotRecord): Promise<void>;
    /** Pending user selection, scoped to an exact ACP binding. */
    readModeIntent(sessionId: SessionId): Promise<AcpModeIntent | undefined>;
    writeModeIntent(sessionId: SessionId, intent: AcpModeIntent): Promise<void>;
    clearModeIntent(sessionId: SessionId, intent: AcpModeIntent): Promise<void>;
    /** Persist the latest selected model for a teammate binding. */
    readMemberModelSelection(sessionId: SessionId): Promise<AcpMemberModelSelection | undefined>;
    writeMemberModelSelection(sessionId: SessionId, selection: AcpMemberModelSelection): Promise<void>;
    /** Read or durably initialize the session's host-owned DSH tool approval policy. */
    readToolApprovalPolicy(sessionId: SessionId, initialize?: 'auto' | 'ask'): Promise<'auto' | 'ask' | undefined>;
    /** Persist a session-scoped override. */
    writeToolApprovalPolicy(sessionId: SessionId, policy: 'auto' | 'ask'): Promise<void>;
    /** 读该会话的 last-known option 快照；无行/畸形 → `undefined`（畸形行 warn 一次）。 */
    readOptionSnapshot(sessionId: SessionId): Promise<AcpOptionsSnapshotRecord | undefined>;
    /**
     * 落齐非审批审计队列：排队记录批量事务落库后做一轮 WAL checkpoint
     * （PASSIVE）并复 chmod wal/shm。生产接线：AcpAgent turn 收束与 dispose 前调用；
     * 读路径内部同样先落齐。队列空 → no-op。
     */
    flush(): Promise<void>;
    /** 关闭存储：落齐队列 + WAL checkpoint（TRUNCATE）+ 关闭连接。幂等；之后的方法调用会按需重开库。 */
    dispose(): Promise<void>;
}
/** {@link createAcpSidecar} 的构造项。 */
export interface AcpSidecarOptions {
    /** 存储根目录（调用方负责选址；生产为 `dshHomePath('dsh-acp')`）。 */
    readonly root: string;
    /** 时钟（`time` 缺省补齐用；默认 `Date.now`，测试注入确定性）。 */
    readonly now?: (() => number) | undefined;
    /** 诊断出口（行级校验失败计数、队列丢弃、库打开失败等；默认 noop）。 */
    readonly warn?: ((message: string) => void) | undefined;
    /** 非审批审计队列上限（默认 {@link ACP_SIDECAR_AUDIT_QUEUE_LIMIT}；测试注入小队列）。 */
    readonly queueLimit?: number | undefined;
}
/**
 * canonical JSON 的 sha256 前 16 hex（binding 的 capabilityHash/configHash
 * 算法；与 recordId 的内容哈希同源，测试夹具用同一导出保证一致）。
 */
export declare function acpCanonicalHash16(value: unknown): string;
/**
 * 创建 sidecar 存储（库懒建：读路径不建库，首个 append/flush 需要落库时才创建
 * `<root>/sidecar.sqlite`）。
 * @param options - 见 {@link AcpSidecarOptions}。
 * @returns sidecar 存储面。
 */
export declare function createAcpSidecar(options: AcpSidecarOptions): AcpSidecar;
/**
 * 生产接线：从 `dshHomePath` slot 选址（`<dshHome>/dsh-acp`）。slot 缺席 →
 * warn 并返回 `undefined`： sidecar 是 ACP 会话启动的强制前提——
 * provider runtime 拿到 undefined 即抛错，
 * ACP 会话拒绝启动（fail loud，不再「退化为纯窥测」）。widen-accessor 模式照抄
 * host composition 的 `getCtxSlot`（slot 的 Context 增强声明住在
 * app-boot，本包不依赖它编译）。
 */
export declare function installAcpSidecar(ctx: Context): AcpSidecar | undefined;
//# sourceMappingURL=sidecar.d.ts.map