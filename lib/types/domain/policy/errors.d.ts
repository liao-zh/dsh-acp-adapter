/**
 * 策略域错误叶子模块：spawn 计划组装共享的配置错误类型，保持 host
 * composition 与 session domain 之间的依赖边界简单。
 *
 * 本包 tsconfig 用 `types: []`；本文件不触碰 node 全局（correlation id 生成
 * 在 src/protocol/v1/errors.ts），无需 triple-slash reference。
 * @module @zaimokuza/dsh-acp-adapter/domain/policy/errors
 */
import type { AcpErrorCategory } from '../../protocol/v1/types.ts';
/** spawn 计划组装的配置类错误码。 */
export type AcpSpawnPlanErrorCode = 'ACP_SPAWN_CONFIG';
/** spawn 计划组装的配置类失败。 */
export declare class AcpSpawnPlanError extends Error {
    readonly code: AcpSpawnPlanErrorCode;
    /** taxonomy 分类：恒为 `config`（配置/部署类失败）。 */
    readonly category: AcpErrorCategory;
    /** correlation id（生成规则见 src/protocol/v1/errors.ts 模块头注释）。 */
    readonly correlationId: string;
    constructor(code: AcpSpawnPlanErrorCode, message: string, correlationId?: string);
}
//# sourceMappingURL=errors.d.ts.map