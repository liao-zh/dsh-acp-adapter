/**
 * Pure settings-panel validation and defensive Remote payload decoding.
 *
 * No DOM, fetch, React, or Host implementation imports. Profile identities and
 * wire shapes follow the shared browser-safe contracts; decoders reject
 * malformed payloads before they reach the view.
 * @module @zaimokuza/dsh-acp-adapter/client/logic
 */
import type { AcpAgentConfig, AcpAgentId as AcpAgentRuntimeId } from '../../contract/agent-config.ts';
import type { AcpAgentConfigState } from '../../contract/remote.ts';
export { ACP_AGENT_IDS as ACP_AGENT_RUNTIME_IDS, ACP_AGENT_ID_PATTERN, ACP_SETTINGS_NS, effectiveRuntimeOf, } from '../../contract/agent-config.ts';
export type { AcpAgentConfig, AcpAgentId as AcpAgentRuntimeId } from '../../contract/agent-config.ts';
export type { AcpAgentConfigState } from '../../contract/remote.ts';
/** Resolved `dsh-acp-adapter` settings section. */
export interface AcpSettings {
    agents: Record<string, AcpAgentConfig>;
    /** Default policy snapshotted by newly initialized ACP sessions. */
    toolApprovalDefault?: 'auto' | 'ask';
}
/** Env var name: POSIX shell identifier. */
export declare const ACP_ENV_KEY_PATTERN: RegExp;
/**
 * Mask likely secret env values in the editor. Existing values travel through
 * `maskedEnv` and are preserved on save unless explicitly replaced or removed.
 * This display rule does not control the Host subprocess environment.
 */
export declare const ACP_SECRET_ENV_KEY_PATTERN: RegExp;
/** The agent editor's staged text: what is on screen is exactly what a save parses. */
export interface AgentDraft {
    id: string;
    name: string;
    command: string;
    /** One argument per line. */
    argsText: string;
    /** One `KEY=VALUE` per line（疑似 secret 的键不进文本框——见 `maskedEnv`）。 */
    envText: string;
    loginHint: string;
    /**
     * 疑似 secret（键名命中 {@link ACP_SECRET_ENV_KEY_PATTERN}）的存量 env 值
     * **不回显**——文本框只放非疑似键，疑似键由 UI 以「键名 + 已配置」
     * 行展示；原值在此携带过站，保存时与用户显式重填的同名行合并（显式行优先，
     * 即同名重填 = 轮换值；UI 移除行 = 删除该键）。仅「编辑存量 agent」路径会
     * 带上本字段。
     */
    maskedEnv?: Record<string, string>;
    /**
     * 存量 agent 的 runtime 绑定（边界）原样过站：编辑器不暴露本
     * 字段，但保存时必须挂回——否则面板保存会静默解除 runtime 绑定。
     * 仅「编辑存量 agent 且其配置带 runtime」路径携带本字段。
     */
    runtime?: AcpAgentRuntimeId;
    catalogId?: string;
}
/** A blank draft for the manual-add flow. */
export declare function emptyDraft(): AgentDraft;
/** Display-only guidance: preserve saved hints and fall back to catalog metadata. */
export declare function agentLoginHint(id: string, config: Pick<AcpAgentConfig, 'runtime' | 'catalogId' | 'loginHint'>): string | undefined;
/**
 * Seed the editor from a catalog entry（add-menu 按 {@link ACP_CATALOG_ENTRIES}
 * 逐条渲染；catalog 条目来自 data/catalog.ts，见该模块头注释）。未知 id
 * 返回 undefined——菜单只从列表渲染，正常不可达；调用方据此不打开编辑器。
 */
export declare function draftFromCatalogEntry(entryId: string): AgentDraft | undefined;
/** Seed the editor from a stored agent (the row's 编辑 button)。 */
export declare function draftFromAgent(id: string, config: AcpAgentConfig): AgentDraft;
/**
 * 移除草稿里一条掩码 env 键（UI 的「移除」按钮）。返回新草稿对象；
 * 移除最后一个键时 `maskedEnv` 字段整体缺席（保持「无掩码 = 字段不在」的
 * 单一形态，validate/序列化两侧都不用特判空对象）。
 */
export declare function dropMaskedEnvKey(draft: AgentDraft, key: string): AgentDraft;
/**
 * Parse the args textarea: one argument per line, each line trimmed, blank
 * lines dropped. A line's interior whitespace is the user's to keep.
 */
export declare function parseArgsText(text: string): string[];
/** Render stored args as the editor's one-per-line text. */
export declare function formatArgsText(args: readonly string[]): string;
/** Why one env line failed to parse. */
export type EnvParseFailure = {
    readonly line: number;
    readonly reason: 'key';
} | {
    readonly line: number;
    readonly reason: 'duplicate';
};
/**
 * Parse the env textarea: one `KEY=VALUE` per line (split on the FIRST `=`),
 * blank lines ignored, key trimmed and required to be a shell identifier,
 * value kept verbatim after the line trim.
 * @param text - the staged env text.
 * @returns the env map, or the first offending line (1-based).
 */
export declare function parseEnvText(text: string): {
    ok: true;
    env: Record<string, string>;
} | {
    ok: false;
    failure: EnvParseFailure;
};
/** Render a stored env map as the editor's `KEY=VALUE` text (insertion order). */
export declare function formatEnvText(env: Record<string, string>): string;
/** Locale key of one validation failure (the component maps it through `t`). */
export type DraftErrorKey = 'errorIdRequired' | 'errorIdInvalid' | 'errorIdTaken' | 'errorNameRequired' | 'errorCommandRequired' | 'errorEnvKey' | 'errorEnvDuplicate' | 'errorRuntimeTaken';
/** One validation failure: locale key plus template params (e.g. the env line number). */
export interface DraftError {
    readonly key: DraftErrorKey;
    readonly params?: Record<string, string | number>;
}
/** Per-field validation outcome; `config` is present exactly when nothing failed. */
export interface DraftValidation {
    readonly id?: DraftError;
    readonly name?: DraftError;
    readonly command?: DraftError;
    readonly env?: DraftError;
    /**
     * （内置 runtime 唯一性）内置 runtime singleton 冲突：草稿的生效 runtime 已被另一个
     * 存量 profile 绑定。params 携带 `{runtime, id, name}` 点名已有 profile——
     * UI 据此展示「打开已有配置」出口，不自动覆盖/删除。
     */
    readonly runtime?: DraftError;
    /** The parsed, storage-ready config; undefined while any error stands. */
    readonly config?: AcpAgentConfig;
}
/**
 * Validate a staged draft against the host schema's rules plus id uniqueness
 * and the built-in runtime singleton（同一内置 runtime 至多一个 profile，
 * client 侧先检——host schema 的同款跨条目拒绝兜底绕过 UI 的直写）。
 * The row being edited keeps its own id/runtime (`editingId`) without tripping
 * the taken checks.
 * @param draft - the staged text.
 * @param agents - the stored agents map（id 唯一性与 runtime 冲突的共同事实源）.
 * @param editingId - the id whose row is being edited, undefined while adding.
 * @returns per-field errors and, when clean, the parsed config.
 */
export declare function validateAgentDraft(draft: AgentDraft, agents: Record<string, AcpAgentConfig>, editingId: string | undefined): DraftValidation;
/** Agent ids in the registry's canonical display order. */
export declare function sortedAgentIds(agents: Record<string, AcpAgentConfig>): string[];
/** Structural face of the Alpha client settings-scope snapshot. */
export interface AcpScopeSnapshot {
    status: 'loading' | 'ready' | 'unavailable';
    value: AcpSettings | undefined;
    revision: number | undefined;
    writable: boolean;
}
/** The panel's view of its settings scope. */
export interface PanelSettingsState {
    /**
     * `invalid` covers a section the scope served but the decoder refused: the
     * scope leaves `status` at 'loading' on a decode miss while `revision`
     * proves a read landed — that pair is the invalid state, not a slow load.
     */
    status: 'loading' | 'invalid' | 'unavailable' | 'ready';
    writable: boolean;
    agents: Record<string, AcpAgentConfig>;
    toolApprovalDefault: 'auto' | 'ask';
    revision: number | undefined;
}
/** Project one scope snapshot into the panel's settings state. */
export declare function panelSettingsOf(snapshot: AcpScopeSnapshot): PanelSettingsState;
/** ACP schema v1 AuthMethod (the initialize response's advertised methods; every variant carries id + name). */
export interface AcpAuthMethod {
    id: string;
    name: string;
    description?: string | null;
}
/** initialize 握手能力的展示事实（镜像 src/contract/remote.ts `AcpCapabilityFacts`）。 */
export interface AcpCapabilityFacts {
    loadSession: boolean;
    sessionList: boolean;
    /** `session/close`（清理事实展示用）。 */
    sessionClose: boolean;
    /** `session/delete`（清理事实展示用）。 */
    sessionDelete: boolean;
    promptImage: boolean;
    promptAudio: boolean;
    promptEmbeddedContext: boolean;
    mcpHttp: boolean;
    mcpSse: boolean;
}
/** probe 会话清理事实（镜像 src/contract/remote.ts `AcpProbeCleanupView`）。 */
export interface AcpProbeCleanup {
    close: 'done' | 'not-advertised' | 'failed';
    delete: 'done' | 'not-advertised' | 'failed';
    message: string | null;
}
/** 端到端能力矩阵一行的三值状态（镜像 src/contract/remote.ts `AcpCapabilityMatrixStatus`）。 */
export type AcpCapabilityMatrixStatus = 'supported' | 'degraded' | 'unsupported';
/**
 * 端到端能力矩阵的一行（镜像 src/contract/remote.ts
 * `AcpCapabilityMatrixRow`）：advertised/adapterPath/hostSeam 三列事实 +
 * 派生 status + 可选 note（host 侧事实陈述原文，次级展示不过 locale）。
 */
export interface AcpCapabilityMatrixRow {
    id: string;
    advertised: boolean | null;
    adapterPath: string;
    hostSeam: string | null;
    status: AcpCapabilityMatrixStatus;
    note?: string;
}
/** Probe failure stage, matching `AcpProbePhase` in src/protocol/v1/types.ts. */
export type AcpProbePhase = 'initialize' | 'session';
/** One provider row of the dshAcp Remote `health` view (src/contract/remote.ts). */
export interface AcpProviderHealth {
    id: string;
    name: string;
    command: string;
    args: string[];
    loginHint: string | null;
    executable: boolean;
    version: string | null;
    /** Configuration state derived by the Host. */
    state: AcpAgentConfigState;
    probe: {
        status: 'never';
        at: null;
    } | {
        status: 'ok';
        at: number;
        modelCount: number;
        authMethods: readonly AcpAuthMethod[] | null;
        agentInfo: {
            name: string;
            version: string;
        } | null;
        capabilities: AcpCapabilityFacts | null;
        /** probe 会话清理事实（delete 未广告/失败 = 降级，面板须如实展示）。 */
        cleanup: AcpProbeCleanup | null;
        /** initialize 握手能力的 sha256-16 指纹（旧条目缺席归 null）。 */
        capabilityHash: string | null;
        /** 协商的 ACP 协议版本（readiness；旧缓存条目/握手未给出归 null）。 */
        protocolVersion: number | null;
        /** 兼容状态（边界；无版本参考/握手无版本归 null，快照无版本 'unknown'）。 */
        versionCompatibility: 'current' | 'different' | 'unknown' | null;
        /** 端到端能力矩阵（host 计算的交集结论，UI 只展示它，不直译 capabilities 布尔）。 */
        matrix: readonly AcpCapabilityMatrixRow[];
    } | {
        status: 'error';
        at: number;
        failureKind: string;
        message: string;
        phase: AcpProbePhase | null;
    };
}
/**
 * Validate a dshAcp Remote `health` view payload. Wire boundary: the whole
 * payload is refused (undefined) rather than partially shown when any row
 * violates the contract.
 */
export declare function decodeHealthResponse(body: unknown): readonly AcpProviderHealth[] | undefined;
/** `boundSessions(agentId)` 的应答（删除确认提示；client 侧镜像 src/contract/remote.ts `AcpBoundSessionsView`）。 */
export interface AcpBoundSessionsView {
    readonly agentId: string;
    readonly count: number;
}
/**
 * boundSessions 应答的严格解码（wire 边界纪律与 decodeHealthResponse 同款：
 * 畸形/错型整体拒绝归 undefined——计数是删除确认的增强提示，缺失时面板退回
 * 无计数的基础文案，绝不拿解码失败冒充 0）。
 */
export declare function decodeBoundSessions(body: unknown): AcpBoundSessionsView | undefined;
/** Match one health row to a settings agent id (undefined when the response does not cover it). */
export declare function healthRowOf(rows: readonly AcpProviderHealth[], id: string): AcpProviderHealth | undefined;
/** Any thrown value → a displayable message. */
export declare function errorMessageOf(error: unknown): string;
//# sourceMappingURL=logic.d.ts.map