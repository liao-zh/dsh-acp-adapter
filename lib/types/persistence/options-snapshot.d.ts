/**
 * Bounded option snapshot codec used by sidecar cold-start presentation.
 *
 * This module owns normalization and validation only; SQLite lifecycle remains
 * in sidecar.ts. Snapshot fields use independent display bounds; serialized
 * length remains protected by the existing budget below.
 */
import type { SessionConfigOption } from '@agentclientprotocol/sdk';
/** 快照的选项数硬上限（超出从尾部丢弃，model 类选项保底保留）。 */
export declare const ACP_SNAPSHOT_OPTION_LIMIT: 32;
/** 展示字段的字符数硬上限（超出截断）。 */
export declare const ACP_SNAPSHOT_FIELD_MAX: 128;
/** Mode descriptions are explanatory UI text, separate from compact option labels. */
export declare const ACP_SNAPSHOT_MODE_DESCRIPTION_MAX: 1024;
/** 快照单选项的可选值条数硬上限（超出截断）。 */
export declare const ACP_SNAPSHOT_VALUES_LIMIT: 64;
/** 快照整体序列化字节数硬上限（超出先丢尾部非 model 类选项，再剥 values 列表）。 */
export declare const ACP_SNAPSHOT_TOTAL_BYTES: 16384;
/**
 * 标准化后的单个 config option 快照条目：只含展示与 allowed-values
 * 参考交集所需的最小事实——`_meta`、description、任意大对象一律不持久化。
 * `value` 为当前值（select=string 值 id / boolean=原生 boolean）；`values`
 * 为 select 的拍平可选值 id 列表（boolean 归 null）。
 */
export interface AcpOptionsSnapshotOption {
    readonly id: string;
    readonly category: string | null;
    readonly name: string;
    readonly value: string | boolean;
    readonly values: readonly string[] | null;
}
/**
 * 按 DSH session 持久化的 last-known config option 快照（`option_snapshots`
 * 表 payload）。`fingerprint` 是运行时指纹（launch fingerprint + agentInfo +
 * protocolVersion 的 canonical 哈希）：恢复后指纹变化 → 旧快照只作诊断，
 * 不作能力结论。快照既供冷启动只读展示，也供同一 binding 建立时恢复仍由
 * 活体 Agent 广告且值域兼容的非模型选项；它本身绝不授权热切换（coordinator
 * 预检仍要求活体可写 option）。
 */
export interface AcpOptionsSnapshotRecord {
    readonly options: readonly AcpOptionsSnapshotOption[];
    readonly currentModeId: string | null;
    /** 刷新时间（epoch 毫秒）。 */
    readonly updatedAt: number;
    readonly fingerprint: string;
    /** Last ACP context occupancy; never mapped to DSH TokenUsage. */
    readonly contextUsage?: {
        readonly used: number;
        readonly size: number;
        readonly cost?: {
            readonly amount: number;
            readonly currency: string;
        } | null;
    } | null;
    /** Complete bounded legacy mode state, when advertised by the Agent. */
    readonly modes?: {
        readonly currentModeId: string;
        readonly availableModes: readonly {
            readonly id: string;
            readonly name: string;
            readonly description?: string | null;
        }[];
    } | null;
}
/**
 * 活体权威快照 → 标准化有界快照（的唯一构造点）。未知 type 跳过；
 * 超 {@link ACP_SNAPSHOT_TOTAL_BYTES} 时先丢尾部非 model 类选项（model 类是
 * Current filter 参考交集的唯一消费者，保底），再剥剩余选项的 values 列表
 * （当前值保留——只读展示仍成立）。
 */
export declare function acpOptionsSnapshotOf(configOptions: readonly SessionConfigOption[] | undefined, currentModeId: string | undefined, fingerprint: string, updatedAt: number, extras?: Pick<AcpOptionsSnapshotRecord, 'contextUsage' | 'modes'>): AcpOptionsSnapshotRecord;
/** snapshot 行的语义校验 + 窄化（读路径；败者 undefined + warn——按「无快照」处理）。 */
export declare function toOptionsSnapshotRecord(raw: unknown): AcpOptionsSnapshotRecord | undefined;
//# sourceMappingURL=options-snapshot.d.ts.map