/**
 * dshAcp Remote 边界的 wire contract：host 与 client 共享的收窄载荷
 * 类型词汇，typert strict codec 的生成输入。本层是零 import 叶子（分层守卫见
 * test/contracts/architecture.spec.ts）——刻意不从 ACP SDK 取类型：SDK v1 的
 * `AuthMethod`/`SessionConfigOption` 携带 `_meta?: Record<string, unknown> | null`，
 * `unknown` 被 strict boundary 拒绝（spike 实证：本机兼容性探针），
 * 且 client 本就只消费这里的字段；host 侧负责 SDK → contract 的显式映射（src/remote/service.ts），
 * 映射同时是数据最小化（auth 的 vars/env 等键名不过线）。
 *
 * 形状纪律：全部字段只含 string/number/boolean/字面量联合/null/readonly 数组与
 * `Record<string, string>` 标签——strict 生成已验证保真（readonly/union/literal/
 * null 联合/z.record）。改这里的形状必须重跑 `pnpm gen:typert` 并全绿门禁。
 * @module @zaimokuza/dsh-acp-adapter/contract/remote
 */
/** ACP agent 配置的五态 wire 词表；消费层从此 client-safe contract 派生。 */
export const ACP_AGENT_CONFIG_STATES = [
    'saved-unverified',
    'ready',
    'auth-required',
    'unavailable',
    'incompatible',
];
//# sourceMappingURL=remote.js.map