/**
 * 结构化 ACP 连接错误（自 acp-client.ts 切出； 扩为统一错误 taxonomy
 * 的落点）。`kind`（./types.ts `AcpErrorKind`）供上层
 * （src/host/composition/llm-stub.ts 失败文案、src/remote/service.ts 方法、
 * turn 错误）分流；`message` 面向用户可读。
 *
 * 统一 taxonomy（错误分类；十分类词表见 ./types.ts
 * `AcpErrorCategory` 的逐类注释）：
 * - 每个用户可见错误携带三件套：**稳定 code**（`ACP_*`，kind → code 映射见
 *   {@link ACP_ERROR_CODES}，turn/end 与 llm-stub 沿用同一张表）、**taxonomy
 *   分类**（{@link AcpClientError.category}，默认按 kind 映射，构造点可覆盖）、
 *   **correlation id**（{@link AcpClientError.correlationId}）。
 * - correlation id 生成规则（{@link newAcpCorrelationId}，确定性规则 + 可检索）：
 *   `acperr-<UTC 紧凑时间戳>-<会话内单调序号 base36>-<随机 3 字节 hex>`，如
 *   `acperr-20260820T184752Z-c-9f3a2b`。时间戳给出与日志/sidecar 时间列的粗对账，
 *   序号+随机保证同毫秒唯一；全文 grep `acperr-` 或具体 id 即可检索。id 只挂在
 *   error 对象与日志/落盘文案后缀上（`[acperr-…]`）；remote service 不把它
 *   拼进用户文案，而是通过 DSH `RemoteError.details.correlationId` 结构化
 *   传递（typed code/details 的契约由 integration test 钉死）。
 * - 中文文案的呈现层分工（测试钉死的协议层英文诊断 message 不动）：选择器/面板
 *   中文文案在 src/host/composition/llm-stub.ts 与 src/client/ui/locales.ts，
 *   恢复/中断说明在 provider runtime。
 * @module @zaimokuza/dsh-acp-adapter/protocol/v1/errors
 */
import type { AcpProcessExit } from '../../runtime/process/types.ts';
import type { AcpClientErrorDetails, AcpErrorCategory, AcpErrorKind, AcpProbePhase } from './types.ts';
/**
 * `AcpClientError.kind` → 稳定 code（前在 src/domain/session/agent.ts 私有，
 * 上移到本模块成为全包唯一真源；词表逐字节不变）。
 */
export declare const ACP_ERROR_CODES: Record<AcpErrorKind, string>;
/** kind → taxonomy 分类的默认映射（构造点可经 `AcpClientErrorDetails.category` 覆盖）。 */
export declare const ACP_ERROR_KIND_CATEGORY: Record<AcpErrorKind, AcpErrorCategory>;
/**
 * 生成一个 correlation id（规则见模块头注释）。`now`/`random` 可注入以便测试
 * 确定性；生产缺省 `new Date()` + `crypto.randomBytes(3)`。
 */
export declare function newAcpCorrelationId(now?: Date, random?: Buffer): string;
export declare class AcpClientError extends Error {
    readonly kind: AcpErrorKind;
    /** 稳定 code（`ACP_*`；kind → code 的唯一映射表 {@link ACP_ERROR_CODES}）。 */
    readonly code: string;
    /** taxonomy 分类（默认按 kind 映射；构造点可经 details.category 覆盖）。 */
    readonly category: AcpErrorCategory;
    /** correlation id（构造期生成或 details.correlationId 覆盖；规则见模块头注释）。 */
    readonly correlationId: string;
    readonly exit: AcpProcessExit | undefined;
    readonly stderrTail: readonly string[] | undefined;
    /** probe 失败阶段（仅 probe 路径标记；./types.ts `AcpProbePhase`）。 */
    readonly probePhase: AcpProbePhase | undefined;
    constructor(kind: AcpErrorKind, message: string, details?: AcpClientErrorDetails);
}
//# sourceMappingURL=errors.d.ts.map