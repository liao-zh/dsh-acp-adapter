/**
 * 端到端能力矩阵：Agent 在 initialize 握手广告的能力不等于
 * 产品端到端能力——图片输入还要求 DSH durable attachment seam。本模块把每行能力的三列事实（Agent advertisement / adapter path /
 * host seam）折成三值状态（supported | degraded | unsupported），host 侧计算
 * （src/remote/service.ts 的 health probe-ok 分支）、wire 传输
 * （src/contract/remote.ts `AcpCapabilityMatrixRow`）、client 渲染
 * （src/client/ui/AcpSection.ts 健康卡能力区）。
 *
 * 零 import 叶子（分层守卫见 test/contracts/architecture.spec.ts）：输入是 contract
 * `AcpCapabilityFacts` 的结构镜像（本模块自带源形状
 * 声明，TS 结构兼容，不反向 import contract）。note 是 host 侧事实陈述
 * （与 `AcpProbeCleanupView.message` 同款口径：原始英文事实文本过线，
 * client 只做次级展示，不过 locale）。
 *
 * 广告数据缺席（caps 为 null = 未 probe/未握手）时矩阵不空缺：每行
 * advertised=null，status 仍按 adapter/host 事实如实给出。
 * @module @zaimokuza/dsh-acp-adapter/domain/policy/capability-matrix
 */
/** 能力矩阵一行的端到端状态词表（恒定三值）。 */
export type AcpCapabilityMatrixStatus = 'supported' | 'degraded' | 'unsupported';
/**
 * 矩阵的一行：三列事实（advertised = Agent initialize 广告值，无广告数据归
 * null；adapterPath = adapter 实现路径的短事实词；hostSeam = 参与该能力的
 * 宿主 seam 短事实词，无 host seam 参与归 null）+ 派生的三值 status + 可选
 * note（降级/不支持的原因或设计决策出处）。
 */
export interface AcpCapabilityMatrixRow {
    readonly id: string;
    readonly advertised: boolean | null;
    readonly adapterPath: string;
    readonly hostSeam: string | null;
    readonly status: AcpCapabilityMatrixStatus;
    readonly note?: string;
}
/** initialize 握手广告能力的源形状（结构镜像 contract `AcpCapabilityFacts`）。 */
export interface AcpCapabilityAdvertisement {
    readonly loadSession: boolean;
    readonly sessionList: boolean;
    readonly sessionClose: boolean;
    readonly sessionDelete: boolean;
    readonly promptImage: boolean;
    readonly promptAudio: boolean;
    readonly promptEmbeddedContext: boolean;
    readonly mcpHttp: boolean;
    readonly mcpSse: boolean;
}
/** Health probe 的临时沙箱事实；保留为兼容输入，但不作为正式会话能力展示。 */
/** Host/plugin seams that materially change end-to-end capability. */
export interface AcpCapabilityHostSeams {
    readonly imageInput: boolean;
}
/**
 * 计算端到端能力矩阵（每行三列事实齐备，行集与顺序恒定）：
 * 九个 Agent 广告能力行。caps 为 null 时广告列
 * 全 null，status 按 adapter/host 事实照常给出（矩阵不因缺广告数据而空缺）。
 */
export declare function acpCapabilityMatrix(caps: AcpCapabilityAdvertisement | null, host?: AcpCapabilityHostSeams): readonly AcpCapabilityMatrixRow[];
//# sourceMappingURL=capability-matrix.d.ts.map