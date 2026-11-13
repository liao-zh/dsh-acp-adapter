/**
 * ACP 协议连接（自 acp-client.ts 切出的协议半；进程半——spawn、stdio 泵、
 * stderr 环、拆除梯子、托管范围清理——见 src/runtime/process/agent-process.ts）：
 * `client()` app、v1 initialize 协商、typed 会话方法 RPC、能力记录、probe、
 * 错误七分类。
 *
 * - 传输：`@agentclientprotocol/sdk` 1.5.1 的 `client()` API + `ndJsonStream`
 * （自 @deprecated 的 `ClientSideConnection` 迁入：handler 按方法名经
 *   `onRequest`/`onNotification` 注册，`connect(stream)` 拿长连接，向外 RPC 走
 * `conn.agent.request('<method>', params)`）。SDK 1.5.1 对无效 JSON 输入回送
 *   JSON-RPC parse error；未知 `_vendor` 通知仍被忽略，畸形行后的协议请求仍可用。
 *   连接关闭时挂起请求以
 *   `Error('ACP connection closed')` reject 且已流出 chunk 不丢。
 * - 结构化 spawn 规格（{@link AcpConnectionSpec}）：`spawnPlan` 承载已校验的
 *   原生访问启动参数，`wrapArgv` 是宿主进程层的可选包装插口；两者互斥，
 *   解析出的最终 argv/env 交给 `AcpAgentProcess`。
 * spec 必填 `subprocess`（`ctx.subprocess` 的窄化 seam）：spawn 与
 *   终止全经宿主服务（跨平台树级回收），无 seam 即构造即抛 spawn-failure
 *   （fail closed，不自制 child_process 回退）。
 * - 客户端能力固定最小化：只有 read/write 两个 FS handler 均已接线时才广告 fs；terminal
 *   只有完整 terminal host 接线时广告；MCP 与 form elicitation 在 host/client seam 完整接线时按协商事实广告（URL elicitation 未实现，永不广告）。
 *   `session/update` 在连接边界保留标准 v1 事件；仅宿主 runtime 明确开启
 *   Claude draft 扩展时，才额外接收/验证 native-subagent 草案事件。
 * - 全 RPC deadline：initialize/new/load/resume/list/set_config_option/
 * set_mode 各带预算常量（下方 `DEFAULT_*_TIMEOUT_MS`）， 增 close/delete
 *   清理类预算（`DEFAULT_SESSION_CLEANUP_TIMEOUT_MS` 10s），且全部接受
 *   {@link AcpRpcOptions}（`signal` + 单笔 `timeoutMs` 覆盖）；`session/prompt`
 *   无默认预算（turn 时长合法无界，由 AcpSessionRuntime 的取消升级梯子治理），只在显式
 *   传入时加闸。超预算/在飞中止 = **放弃该 RPC**（被弃 promise 挂 noop catch，
 *   迟到响应安全落地）并把连接标记 **poisoned**（{@link AcpClientConnection.poisonedBy}）：
 *   被弃 RPC 的迟到响应可能与后续帧交错，协议状态从此不可证——后台发起
 *   close()，此后所有 RPC 立即以 protocol-error 拒绝复用。prompt 的正常取消
 *   梯子（cancel 后 prompt 正常 settle）不 poison——只有 promise 被放弃才 poison。
 * - 拆除梯子由进程半持有：stdin EOF → `eofGraceMs`（默认 500ms）→ seam 的
 *   provider terminate → 有界 waitForExit；不能证明托管范围退出时报告告警。
 * Devin 不响应 stdin EOF，EOF 仅作礼貌窗口。
 * - 错误分类（{@link AcpErrorKind}）：spawn-failure / auth_required / timeout /
 * protocol-error / crash。spawn-failure
 * 的判定来源：seam spawn 同步抛错 / 明确 OS 启动错误的 `done`
 * reject（ENOENT 等）。每个错误另携带 taxonomy 分类
 *   （`AcpErrorCategory`，本构造点的 spec/seam 类失败覆盖为 `config`）与
 *   correlation id，见 ./errors.ts 模块头注释。
 *
 * 本包 tsconfig 用 `types: []`（不含 node 全局类型）；本文件是 host 侧协议/子进程
 * 接缝模块，经下方 triple-slash reference 显式引入 @types/node，不改动共享 tsconfig。
 * @module @zaimokuza/dsh-acp-adapter/protocol/v1/connection
 */
import * as acp from '@agentclientprotocol/sdk';
import type { AcpConnectionSpec, AcpProcessExit } from '../../runtime/process/types.ts';
import type { AcpConnectionOptions, AcpProbeOptions, AcpProbeResult, AcpRpcOptions, QwenActiveWorkSnapshot, SessionUpdateListener } from './types.ts';
export declare const DEFAULT_INITIALIZE_TIMEOUT_MS = 15000;
/**
 * 会话建立类 RPC 的默认预算（session/new、session/load、session/resume、session/list）：
 * load 要回放历史，给足 30s；其余沿用同一建立预算，调用方可经
 * {@link AcpRpcOptions.timeoutMs} 覆盖。
 */
export declare const DEFAULT_SESSION_SETUP_TIMEOUT_MS = 30000;
/** 会话写类 RPC 的默认预算（session/set_config_option、session/set_mode）。 */
export declare const DEFAULT_SESSION_WRITE_TIMEOUT_MS = 15000;
/** Provenance for a steering failure relative to the JSON-RPC send boundary. */
export declare class AcpSteeringRequestError extends Error {
    readonly remoteRequestSent: boolean;
    constructor(remoteRequestSent: boolean, cause: unknown);
}
/**
 * 会话清理类 RPC 的默认预算（session/close、session/delete）：probe 收尾
 * 的礼貌窗口——清理失败不阻塞进程强杀与临时目录删除，预算给得比建立类更紧。
 */
export declare const DEFAULT_SESSION_CLEANUP_TIMEOUT_MS = 10000;
/** Whether the negotiated Agent advertises the ACP unstable fork capability. */
export declare function supportsFork(capabilities: acp.AgentCapabilities | undefined): boolean;
/**
 * 一条到 ACP agent 子进程的连接：组合 {@link AcpAgentProcess}（进程生命周期）
 * 与 v1 initialize 协商、typed 会话方法及 probe；构造即 spawn（错误经
 * initialize 分类暴露）；用毕必须 {@link close}（幂等），否则子进程残留。
 */
export declare class AcpClientConnection {
    private readonly spec;
    private readonly command;
    private readonly process;
    private readonly conn;
    private readonly connectionFailure;
    private readonly clientInfo;
    private readonly initializeTimeoutMs;
    private readonly onPermissionRequest;
    private readonly onElicitationRequest;
    private readonly fileSystemHandlers;
    private readonly terminalHandlers;
    private readonly enableClaudeDraftSubagents;
    private readonly onCapabilityDegraded;
    private readonly onQwenTurnStart;
    private readonly onQwenTurnEnd;
    private readonly onQwenActiveWork;
    private qwenWorkSnapshot;
    /** Sessions running an Agent-initiated turn (Qwen background/cron) that the
     * host has adopted; permission requests and host operations are valid there too. */
    private readonly agentTurnSessionIds;
    private readonly onProcessWarn;
    private readonly activeSessionIds;
    /** Known session ids currently being restored. Some Agents consult host FS
     * while loading their own history; that is a setup operation, not a prompt. */
    private readonly stagingSessionIds;
    /** A terminal prompt response closes its Host-operation generation. It is
     * reopened only by the next prompt or an explicit session restore. */
    private readonly terminalPromptSessionIds;
    /** Host operations already admitted for a prompt. Retiring the prompt first
     * closes admission, then waits for these operations before its response can
     * be projected as terminal. */
    private readonly pendingPromptHostOperations;
    /** Sessions whose `session/prompt` RPC is currently in flight. Permission
     * requests are valid only inside this exact turn boundary. */
    private readonly activePromptSessionIds;
    private readonly updateListeners;
    private initializePromise;
    private connectionClosePromise;
    private negotiated;
    /**
     * connection poison：触发放弃的 RPC 操作名（未 poison 为 undefined）。
     * 一次性不信任声明——被弃 RPC 的迟到响应可能与后续帧交错，连接协议状态从此
     * 不可证；置位时已后台发起 close()，此后所有 RPC 立即拒绝（见 {@link rpc}）。
     */
    private poisonedByOp;
    private listenerFailureReported;
    constructor(spec: AcpConnectionSpec, options?: AcpConnectionOptions);
    /** 退出事实；进程仍在运行（或 spawn 失败从未存在）时为 null。 */
    get exited(): AcpProcessExit | null;
    /** Rejects once the Agent process fails or exits; never resolves. */
    get failed(): Promise<never>;
    /** Negotiated reporting cadence; absent means session activity is not covered. */
    get qwenActiveWorkIntervalMs(): number | undefined;
    get qwenActiveWorkSnapshot(): QwenActiveWorkSnapshot | undefined;
    /** Managed-range exit evidence, separate from merely starting close(). */
    get isCleanupConfirmed(): boolean;
    /** close 是否已发起。 */
    get isClosed(): boolean;
    /** Current transport facts, including idle process exit and provider failure. */
    get isTransportAvailable(): boolean;
    /** poison 事实：触发放弃的 RPC 操作名；未 poison 为 undefined。 */
    get poisonedBy(): string | undefined;
    /** initialize 协商记录的 agentInfo（未协商时为 undefined）。 */
    get agentInfo(): acp.Implementation | null | undefined;
    /** initialize 协商记录的 agent capabilities（未协商时为 undefined）。 */
    get agentCapabilities(): acp.AgentCapabilities | undefined;
    /** Only an advertised atomic idle refusal can safely share the original prompt response. */
    get supportsSteering(): boolean;
    steer(sessionId: string, prompt: acp.ContentBlock[], onDispatch?: () => void): Promise<'injected' | 'promptRequired'>;
    /** initialize 协商出的 ACP 协议版本（未协商时为 undefined；binding 预检比对用）。 */
    get protocolVersion(): number | undefined;
    /** initialize 协商记录的 authMethods（未协商或 agent 未提供时为空数组）。 */
    get authMethods(): acp.AuthMethod[];
    /** 脱敏后的 stderr 环形缓冲快照（供健康/诊断端点）。 */
    stderrLines(): string[];
    /**
     * ACP v1 initialize 握手：按实际接线生成最小 client capabilities（fs 只有 read/write
     * handler 同时存在时广告；terminal 只有完整 handler 接线时广告），
     * 记录 agentInfo/capabilities/authMethods。并发/重复调用共享同一次握手（幂等）；
     * `options` 只对真正发起握手的那次调用生效（后续共享调用忽略）。
     * 失败按 {@link AcpErrorKind} 分类，且拒绝前先把未公开的子进程拆除（无孤儿）。
     */
    initialize(options?: AcpRpcOptions): Promise<acp.InitializeResponse>;
    /** 建 ACP 会话；只透传调用方已验证且 Agent 已广告支持的 MCP 定义。 */
    newSession(params?: {
        cwd?: string;
        mcpServers?: readonly acp.McpServer[];
    }, options?: AcpRpcOptions): Promise<acp.NewSessionResponse>;
    /** 恢复 ACP 会话（agent 须广告 loadSession；回放更新走 session/update 通知）。 */
    loadSession(sessionId: string, params?: {
        cwd?: string;
        mcpServers?: readonly acp.McpServer[];
    }, options?: AcpRpcOptions): Promise<acp.LoadSessionResponse>;
    /**
     * 无回放地恢复 ACP 会话。调用方必须先确认 Agent 广告
     * `sessionCapabilities.resume`；成功响应表示 Agent 已恢复原语义上下文，历史展示
     * 继续以 DSH 日志为准。
     */
    resumeSession(sessionId: string, params?: {
        cwd?: string;
        mcpServers?: readonly acp.McpServer[];
    }, options?: AcpRpcOptions): Promise<acp.ResumeSessionResponse>;
    /**
     * Fork an ACP session using the draft/unstable capability. Callers must
     * gate this on the negotiated `sessionCapabilities.fork` capability; the
     * connection still owns timeout/abort/poison handling for the typed SDK
     * method.
     */
    forkSession(sessionId: string, params?: {
        cwd?: string;
        mcpServers?: readonly acp.McpServer[];
    }, options?: AcpRpcOptions): Promise<acp.ForkSessionResponse>;
    /** 列 ACP 会话（agent 须广告 sessionCapabilities.list）。 */
    listSessions(params?: {
        cwd?: string;
        cursor?: string;
    }, options?: AcpRpcOptions): Promise<acp.ListSessionsResponse>;
    /** 关闭 ACP 会话（agent 须广告 sessionCapabilities.close； probe 清理用）。 */
    closeSession(sessionId: string, options?: AcpRpcOptions): Promise<acp.CloseSessionResponse>;
    /** 删除 ACP 会话（agent 须广告 sessionCapabilities.delete；删除后不再出现在 session/list）。 */
    deleteSession(sessionId: string, options?: AcpRpcOptions): Promise<acp.DeleteSessionResponse>;
    /**
     * 配置项热切换（模型/模式/思考强度走这里）；响应为完整 configOptions 快照。
     * 类型保真：select 传 string 值 id；boolean 传原生 boolean（协议要求
     * 请求携带 `type: "boolean"` 判别字段），不把 boolean 编码成字符串。
     */
    setConfigOption(sessionId: string, configId: string, value: string | boolean, options?: AcpRpcOptions): Promise<acp.SetSessionConfigOptionResponse>;
    /** 会话模式切换。 */
    setMode(sessionId: string, modeId: string, options?: AcpRpcOptions): Promise<acp.SetSessionModeResponse>;
    /**
     * 发起一个 prompt turn。`onUpdate` 在本次调用期间注册为额外 session/update
     * 监听器（turn 结束自动摘除）；崩溃时已流出的 chunk 不丢（监听器先收，
     * 挂起的 prompt 后以 crash 分类 reject）。
     *
     * 无默认预算：turn 时长合法无界，正常取消由 AcpSessionRuntime 的取消升级梯子
     * 治理（cancel 帧 → 限时停稳 → terminate），那条路径 prompt 正常 settle、
     * 不 poison；只有调用方经 `options` 显式给 `timeoutMs`/`signal` 且竞速胜出
     * 时才按放弃处理（poison）。
     */
    prompt(sessionId: string, prompt: acp.ContentBlock[], onUpdate?: SessionUpdateListener, options?: AcpRpcOptions): Promise<acp.PromptResponse>;
    private trackPromptHostOperation;
    private drainPromptHostOperations;
    /** An autonomous turn has the same admitted native FS/terminal tail as a wire prompt. */
    drainAgentTurnHostOperations(sessionId: string): Promise<void>;
    /** Actual admitted work in this session, independent of provider liveness claims. */
    hasPendingAgentTurnHostOperations(sessionId: string): boolean;
    /** Mark an adopted Agent-initiated turn: it owns permission requests and
     * reopens the Host-operation generation like a prompt does. */
    setAgentTurnActive(sessionId: string, active: boolean): void;
    /** Agent-private extension request (e.g. Qwen `qwen/status/session/tasks`). */
    extRequest(method: string, params: Record<string, unknown>, options?: AcpRpcOptions): Promise<unknown>;
    /** 发送 `session/cancel` 通知。 */
    cancel(sessionId: string): Promise<void>;
    /**
     * 拆除梯子（进程半持有：stdin EOF → `eofGraceMs` → seam `terminate()`（SIGTERM →
     * provider 托管范围终止）→ 有界 waitForExit；不能确认退出时报告告警。
     */
    close(): Promise<void>;
    /**
     * 独立短生命周期 probe：spawn → initialize → `session/new`（临时 cwd）→
     * 收集 configOptions → capability-aware 会话清理→
     * 拆除（finally 保证）。清理次序 close 先 delete 后，各自独立 try/catch：
     * 失败记进结果的 `cleanup` 事实，**不翻转** probe 成败，也不阻塞 finally 的
     * 进程强杀与临时目录删除。失败携带 probe 阶段标记（
     * `AcpClientError.probePhase`，健康卡 initialize/session 分层的判据；到达
     * session 阶段即证明 initialize 已通过）。
     */
    static probe(spec: AcpConnectionSpec, options?: AcpProbeOptions): Promise<AcpProbeResult>;
    private runInitialize;
    private buildClientApp;
    private deliverSessionNotification;
    private rpc;
    /**
     * RPC 预算竞速：底层 RPC promise vs 超时臂 vs 中止臂。超时/中止竞速胜出
     * 而底层 promise 未 settle = **放弃该 RPC** 被弃 promise 挂 noop catch（迟到
     * rejection 安全落地，不泄漏 unhandled），连接置 poison 并后台发起 close    * （不等它）。无预算且无 signal 时零开销直通。
     */
    private raceBudget;
    /**
     * connection poison：任何 RPC 因 timeout/abort 被放弃后，记录触发 op
     * 并后台发起拆除。一次性闩锁；crash（进程消亡后 RPC 本就 reject）不需要
     * poison 概念，close 已发起时也不重复置位。
     */
    private poison;
    private assertNotPoisoned;
    /** 进场前已中止：不发帧直接拒（无 RPC 在飞，连接未污染、不 poison）。 */
    private assertNotAborted;
    private assertOpen;
    private assertInitialized;
    /** 把任意 thrown 值分类为结构化错误；已是 AcpClientError 的原样透传。 */
    private classify;
    private spawnFailureMessage;
    private crashMessage;
}
//# sourceMappingURL=connection.d.ts.map