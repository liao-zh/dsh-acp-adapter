/**
 * ACP 原生访问策略。
 *
 * Agent 自己管理工具、凭证、skills 与 data home。插件不会在 ACP 子进程外再模拟
 * 一层沙箱；ACP 会话只接受 `danger-full-access`，产品界面显示为“原生 Agent
 * 访问”。DSH 权限投影只承担会话模式的一致性校验，避免 ACP backend 在错误的
 * 宿主模式下意外启动。
 */
/// <reference types="node" />
import { AcpSpawnPlanError } from "./errors.js";
export { AcpSpawnPlanError } from "./errors.js";
export const ACP_NATIVE_DATA_HOME_ENV_KEYS = ['CODEX_HOME', 'KIMI_CODE_HOME', 'CLAUDE_CONFIG_DIR'];
export const ACP_NATIVE_XDG_ENV_KEYS = [
    'XDG_CONFIG_HOME',
    'XDG_DATA_HOME',
    'XDG_CACHE_HOME',
    'XDG_STATE_HOME',
];
/** 生成原生启动计划；不包装 argv，也不重定向 Agent data home。 */
export function buildAcpSpawnPlan(options) {
    if (options.argv.length === 0) {
        throw new AcpSpawnPlanError('ACP_SPAWN_CONFIG', 'spawn plan requires a non-empty argv (argv[0] is the executable)');
    }
    if (options.mode !== 'danger-full-access') {
        throw new AcpSpawnPlanError('ACP_SPAWN_CONFIG', `ACP sessions require Native Agent Access; received DSH permission mode "${options.mode}"`);
    }
    return {
        argv: [...options.argv],
        env: { ...options.env },
    };
}
//# sourceMappingURL=sandbox.js.map