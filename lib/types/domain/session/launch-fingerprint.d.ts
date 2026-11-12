/**
 * launch fingerprint 的组装真源（resume 预检②的 blocking 指纹）。
 * 由 profile adapter 在每次会话建立/续接时计算一次，写入 binding
 * 并与既有 binding 做 canonical 哈希预检；只忽略已移除的目录版本参考字段，
 * 其他启动身份变化仍以 'profile-changed' 阻断。
 *
 * 分量清单（全部 secret-free）：
 * - `command`/`args`/`envKeys`： 既有分量（profile config 原文 + 排序键名）。
 * - `profileId`/`descriptorId`：profile 身份与 runtime 绑定（保留旧字段名）。
 * - `adapterVersion`/`wrappedCliVersion`：恒 null。
 * - `envRefs`：保留为 null，不接管 Agent 凭证。
 * - `executableOverride`：高级 CLI override env 的 `{name,present}` 或 null。
 * - `nativeStateEnv`：Agent 原生状态目录相关环境键的存在性与路径 hash；
 *   HOME/CODEX_HOME/XDG 等变化会阻止把旧 Agent 上下文交给新运行环境。
 *
 * 显式**不进** blocking 指纹的分量（保持既有语义）：
 * - canonical cwd：由 binding.canonicalCwd 与预检①（'cwd-changed'）覆盖。
 * - capability/config hash：保持 advisory（capabilityHash/configHash 字段
 *   只记录不阻断），保住热切换与 devin 既有行为。
 *
 * @module @zaimokuza/dsh-acp-adapter/domain/session/launch-fingerprint
 */
import { type AcpStubAgentConfig } from './agent-config.ts';
import { type AcpLaunchFingerprint } from '../../persistence/sidecar.ts';
/** {@link acpLaunchFingerprint} 的输入。 */
export interface AcpLaunchFingerprintInput {
    /** 注册表 profile id（路由 `acp-<id>` 的 `<id>` 部分）。 */
    readonly profileId: string;
    /** 该 profile 的当前配置。 */
    readonly config: AcpStubAgentConfig;
    /** Stable parent environment; profile overrides are applied before hashing. Defaults to process.env. */
    readonly env?: Record<string, string | undefined>;
}
export interface AcpLaunchEnvironmentInput {
    readonly config: AcpStubAgentConfig;
    /** Compatibility-only fields accepted from older embedders; ignored. */
    readonly [key: string]: unknown;
}
/**
 * One secret-free identity for a configured profile.  Both route registration
 * and the per-call runtime use this value, so runtime/launch edits
 * cannot drift into two different cache policies.  Environment values are
 * hashed individually; neither this identity nor its callers retain tokens in
 * an index, log, or sidecar record.
 */
export declare function profileLaunchIdentityHash(profileId: string, config: AcpStubAgentConfig, env?: Record<string, string | undefined>): string;
/**
 * Reconstruct the pre-spawn environment.
 *
 * The subprocess host supplies the scrubbed parent environment as the spawn
 * base.  This function therefore returns only profile-configured overrides;
 * copying `process.env` here would turn scrubbed credentials back into an
 * explicit opt-in. Profile values are the explicit final override and may
 * include credential-shaped variables because that is a user configuration
 * choice.
 */
export declare function acpLaunchEnvironment(input: AcpLaunchEnvironmentInput): Promise<Record<string, string>>;
/**
 * 组装完整 launch fingerprint（分量语义见模块头注释）。纯函数：相同输入恒等
 * 输出（所有列表排序固定），canonical 哈希因此稳定。
 */
export declare function acpLaunchFingerprint(input: AcpLaunchFingerprintInput): AcpLaunchFingerprint;
/** Ignore retired catalog versions and manual tool lists, retaining execution identity.
 * Saved bindings are never rewritten: fork evidence and mode intents still refer
 * to the exact persisted record. This does not relax runtime Agent identity checks.
 */
export declare function acpLaunchFingerprintsCompatible(saved: AcpLaunchFingerprint, current: AcpLaunchFingerprint): boolean;
//# sourceMappingURL=launch-fingerprint.d.ts.map