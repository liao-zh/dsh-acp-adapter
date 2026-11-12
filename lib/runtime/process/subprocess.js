/**
 * `ctx.subprocess` 公共 seam 的结构化窄化与 spawn 规格组装。
 *
 * dsh 通过宿主服务 `ctx.subprocess` 管理子进程（Service Definition
 * `@deepseek-ai/dsh-subprocess`，本地实现 `@deepseek-ai/dsh-subprocess-local`，
 * dsh-base 默认装配）：spawn 全显式 spec、terminate 是唯一的终止动词
 * 。terminate 和 waitForExit 面向同一 provider 托管范围，平台限制由宿主定义。
 * 本模块只消费必要的结构面，不加载第二份宿主服务。
 *
 * env 纪律：provider 的 spawn 底座是 `scrubbedParentEnv()`——去 credential
 * 形名与 DSH_*，PATH/HOME/代理变量等保留。本包
 * 现行语义是 profile 显式条目，宿主 subprocess service 将其合并到 scrubbed
 * parent env；本包不再自制 tombstone 或第二套 allowlist。
 *
 * 本包 tsconfig 用 `types: []`；本文件需要 node stream 类型，经 triple-slash
 * reference 显式引入 @types/node（同层 agent-process.ts 同款先例）。
 * @module @zaimokuza/dsh-acp-adapter/runtime/process/subprocess
 */
/**
 * 结构化窄化：候选值必须具备 spawn/resolveExecutable 两个方法（其余上游成员
 * ——spawnTerminal/collected 等——本包不消费，不参与窄化）。返回的 seam 在
 * spawn 调用点固定填入 pipe/pipe/pipe stdio（本包唯一 stdio 形态）；候选缺
 * 方法面时返回 undefined（调用方 fail closed）。
 */
export function narrowSubprocessSeam(candidate) {
    if (typeof candidate !== 'object' || candidate === null)
        return undefined;
    const face = candidate;
    if (typeof face.spawn !== 'function' || typeof face.resolveExecutable !== 'function')
        return undefined;
    const service = candidate;
    return {
        spawn: (spec) => service.spawn({ ...spec, stdio: { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' } }),
        resolveExecutable: (command, env, signal) => service.resolveExecutable(command, env, signal),
    };
}
/**
 * seam 缺席的统一文案（解析失败与「未接线」共用同一诊断）：宿主 composition
 * 缺 subprocess-local provider 是部署错误，ACP 路由 fail closed，native 路由不受影响。
 */
export const ACP_SUBPROCESS_UNAVAILABLE_MESSAGE = 'the host provides no subprocess service (ctx.subprocess): the ACP adapter requires the dsh-base subprocess-local provider; ' +
    'refusing to spawn ACP agents on this host (native dsh routes are unaffected)';
/** Distinguish OS launch failures from provider observation/I/O errors. */
export function isSubprocessLaunchFailure(error) {
    if (typeof error !== 'object' || error === null)
        return false;
    const { code, syscall } = error;
    return (typeof code === 'string' &&
        ['ENOENT', 'EACCES', 'ENOEXEC'].includes(code) &&
        typeof syscall === 'string' &&
        (syscall.startsWith('spawn ') || syscall === 'execve'));
}
//# sourceMappingURL=subprocess.js.map