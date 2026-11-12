/**
 * dshAcp Remote service。
 *
 * 登录遵循 external-login-only：用户只在 Agent 自带 CLI 中登录，面板仅展示
 * 探针状态和 loginHint。ACP 会话的控制面只通过 host-owned recovery/session-control 方法暴露；模型选择、
 * 权限和 elicitation 仍由 DSH 原生面或 host handler 处理。公开方法为 health、
 * backendOf、boundSessions、audit/activity timeline、recovery 和 agent session controls。
 * 所有调用都走宿主 typed Remote，不保留手写 HTTP 写旁路。
 *
 * 边界形态：
 * - `AcpRemoteService extends TypertRemoteService`（`super(ctx, 'dshAcp')`），方法
 *   以 `@Remote` 标注；strict descriptor/zod codec 由构建期
 *   `scripts/gen-typert.ts` 生成（lib/typert.host.{js,d.ts} +
 *   lib/typert.remote-client.{js,d.ts}），host 侧经 typert-loader 自动注册进
 *   `ctx.typert`，client 侧 `ctx.remote.$mount(contribution)` 挂载。
 * - wire 类型全部来自 src/contract/remote.ts 的收窄 contract（SDK v1 类型的
 *   `_meta: Record<string, unknown>` 过不了 strict boundary，且 client 本就只
 *   消费收窄字段）；SDK → contract 的显式映射在本文件（数据最小化：auth 的
 *   vars/env 键名、config option 的 `_meta` 不过线）。
 * - 会话身份只使用 JSON `sessionId: string` 参数；backend/recovery 由 Host 的
 *   binding、request header 与 recovery store 提供，不暴露 Agent 控制对象。
 * - 错误纪律：业务失败统一映射为 `dsh-acp/*` `RemoteError`，保留稳定的
 *   category 以及 ACP kind/correlationId；参数错误使用 Gateway 公共
 *   `gateway/bad-request`。Gateway 将 typed code/details 原样送到 Client，
 *   不再把可判别的 ACP 失败折叠为 `gateway/internal`。
 *
 * Subprocess seam（不变）：两个缺省实现（可执行预检 / `<command> --version`）
 * 全经宿主公共 seam `ctx.subprocess` 的解析产物（deps.subprocess 注入）——
 * 本模块不触碰 `node:child_process`。seam 缺席时缺省实现 fail closed：
 * executable=false、version=null。
 *
 * 本包 tsconfig 用 `types: []`（不含 node 全局类型）；本文件是 host 侧
 * 子进程模块，经下方 triple-slash reference 显式引入 @types/node
 * （src/protocol/v1/connection.ts 同款先例），不改动共享 tsconfig。
 * @module @zaimokuza/dsh-acp-adapter/remote/service
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
/// <reference types="node" />
import os from 'node:os';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { SessionId } from '@deepseek-ai/dsh-session';
import { acpRouteId, ACP_AGENT_ID_PATTERN } from "../domain/session/agent-config.js";
import { ACP_CONFIG_IDENTIFIER_MAX } from "../contract/config-options.js";
import { acpProbeConfigKey, acpVersionCompatibility, catalogIdOf } from "../domain/session/agent-config.js";
import { registryVersionOf } from "../domain/session/registry-versions.js";
import { deriveAcpAgentState } from "../domain/session/agent-state.js";
import { acpCapabilityMatrix } from "../domain/policy/capability-matrix.js";
import { ACP_SUBPROCESS_UNAVAILABLE_MESSAGE } from "../runtime/process/subprocess.js";
import { waitWithin } from "../runtime/process/timeout.js";
import { stopSubprocess } from "../runtime/process/cleanup.js";
import { AcpClientError } from "../protocol/v1/errors.js";
import { matchesDiagnosticView } from "../contract/diagnostics.js";
/** `<command> --version` 尽力而为的短超时（毫秒）。 */
export const DEFAULT_VERSION_PROBE_TIMEOUT_MS = 3_000;
function acpRemoteError(error) {
    return new RemoteError(`dsh-acp/${error.category}`, error.message, {
        kind: error.kind,
        correlationId: error.correlationId,
    }, { cause: error });
}
function acpRemoteFailure(category, message, cause) {
    return new RemoteError(`dsh-acp/${category}`, message, {
        kind: null,
        correlationId: null,
    }, cause === undefined ? undefined : { cause });
}
function badRequest(message) {
    return new RemoteError('gateway/bad-request', message, {});
}
async function preserveAcpFailure(operation) {
    try {
        return await operation();
    }
    catch (error) {
        if (error instanceof AcpClientError)
            throw acpRemoteError(error);
        throw error;
    }
}
// ---------- SDK → contract 收窄映射（数据最小化； strict boundary 前提） ----------
/**
 * 把 initialize 响应的 `AgentCapabilities` 实际值归一化为展示事实；
 * 未握手/未广告（undefined/null）归 null（UI 显示「未知」，绝不编造）。
 */
export function capabilityFactsOf(caps) {
    if (caps === undefined || caps === null)
        return null;
    return {
        loadSession: caps.loadSession === true,
        sessionList: caps.sessionCapabilities?.list != null,
        sessionClose: caps.sessionCapabilities?.close != null,
        sessionDelete: caps.sessionCapabilities?.delete != null,
        promptImage: caps.promptCapabilities?.image === true,
        promptAudio: caps.promptCapabilities?.audio === true,
        promptEmbeddedContext: caps.promptCapabilities?.embeddedContext === true,
        mcpHttp: caps.mcpCapabilities?.http === true,
        mcpSse: caps.mcpCapabilities?.sse === true,
    };
}
/** AuthMethod → 收窄三键（每个变体都有 id/name/description；vars/args/env/_meta 不过线）。 */
function contractAuthMethodOf(method) {
    return {
        id: method.id,
        name: method.name,
        ...(method.description === undefined ? {} : { description: method.description }),
    };
}
function healthyRecoveryView(sessionId) {
    return {
        dshSessionId: sessionId,
        kind: 'healthy',
        cause: null,
        detail: null,
        provider: null,
        acpSessionId: null,
        generation: null,
        interruptedTurnId: null,
        lastAttemptAt: null,
        lastUserAction: null,
        updatedAt: 0,
    };
}
// ---------- 缺省实现：executable / version（全经宿主 subprocess seam） ----------
/**
 * `<command> --version` 尽力而为：首行 stdout（空则 stderr 首行），截 200 字符；
 * 超时（terminate 升级，SIGKILL 必杀，不留孤儿）/spawn 失败/无输出 → null。
 * env 不传：provider 的 scrub 底座（去 credential 形名 + DSH_*，PATH/代理穿透）
 * 已够版本探针用，比旧「全量继承 process.env」更安全。
 */
async function acpQueryVersion(seam, command, timeoutMs = DEFAULT_VERSION_PROBE_TIMEOUT_MS) {
    let handle;
    try {
        handle = seam.spawn({
            argv: [command, '--version'],
            cwd: os.tmpdir(),
            // 超时后 terminate 的升级间隔：版本探针求快死，不铺 2s 的会话级礼貌窗口
            graceMs: VERSION_PROBE_TERM_GRACE_MS,
        });
    }
    catch {
        return null;
    }
    const done = handle.done.catch(() => null);
    const { stdin, stdout, stderr } = handle;
    if (stdin === undefined || stdout === undefined || stderr === undefined) {
        // pipe/pipe/pipe 由窄化适配器固定；缺场 = 实现违约，收回进程按失败处理
        await stopSubprocess(handle, { eofGraceMs: 0, exitWaitMs: VERSION_PROBE_TERM_GRACE_MS * 2 });
        return null;
    }
    stdin.on('error', () => { });
    let out = '';
    let err = '';
    stdout.setEncoding('utf8');
    stdout.on('data', (chunk) => {
        out += chunk;
    });
    stderr.setEncoding('utf8');
    stderr.on('data', (chunk) => {
        err += chunk;
    });
    try {
        stdin.end();
    }
    catch {
        // 对端抢跑退出不阻塞读取
    }
    const outcome = await waitWithin(done, timeoutMs);
    const gone = await stopSubprocess(handle, { eofGraceMs: 0, exitWaitMs: VERSION_PROBE_TERM_GRACE_MS * 2 });
    return !gone || outcome === undefined || outcome === null ? null : (firstLine(out) ?? firstLine(err));
}
/** 版本探针 terminate 的 SIGTERM → SIGKILL 升级间隔（毫秒）：探针求快死，不用会话级的 2s。 */
const VERSION_PROBE_TERM_GRACE_MS = 500;
function firstLine(text) {
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (line !== '')
            return line.length > 200 ? line.slice(0, 200) : line;
    }
    return null;
}
/**
 * dshAcp namespace 的 Remote service（构造即注册 cordis service，gateway 经
 * strict descriptor 找到实例并调用）。当前公开面：health/backendOf/boundSessions、
 * audit/activity timeline、recoverySnapshot/retryOriginal/rebindRecoveryBlank、
 * agentSessionSnapshot/setAgentSessionOption。
 * - `health()`                    ← GET /dsh-acp/health（provider 行 + 顶层
 *   健康快照；**密钥边界** 只回显 command/args/loginHint，
 * env 永不在响应里——钉版见 test/integration/host/health.spec.ts；每行携带五态
 *   `state`，派生规则见 src/domain/session/agent-state.ts）
 * - `recoverySnapshot(sessionId)` ←：读取 sidecar 的恢复闩锁，不解析旧 Agent
 * - `retryOriginal(sessionId)` ←：恢复原 ACP binding，不重发中断 prompt
 *
 * 全部依赖注入（{@link AcpRemoteServiceDeps}）；测试直接 new 实例驱动方法，
 * 不再经过 HTTP req/res 假件。
 */
let AcpRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _auditTimeline_decorators;
    let _activitySnapshot_decorators;
    let _activityDetail_decorators;
    let _activityPage_decorators;
    let _activityFollow_decorators;
    let _teamMembers_decorators;
    let _approvalChildren_decorators;
    let _teamMemberModels_decorators;
    let _setTeamMemberModel_decorators;
    let _setTeamMemberMode_decorators;
    let _ownedProviderRoutes_decorators;
    let _projectedSubagentIds_decorators;
    let _health_decorators;
    let _agentSessionSnapshot_decorators;
    let _agentSessionFollow_decorators;
    let _setAgentSessionOption_decorators;
    let _toolApprovalPolicy_decorators;
    let _setToolApprovalPolicy_decorators;
    let _toolApprovalPolicyFollow_decorators;
    let _recoverySnapshot_decorators;
    let _recoveryFollow_decorators;
    let _retryOriginal_decorators;
    let _rebindRecoveryBlank_decorators;
    let _backendOf_decorators;
    let _boundSessions_decorators;
    return class AcpRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _auditTimeline_decorators = [Remote];
            _activitySnapshot_decorators = [Remote];
            _activityDetail_decorators = [Remote];
            _activityPage_decorators = [Remote];
            _activityFollow_decorators = [Remote({ mode: 'stream' })];
            _teamMembers_decorators = [Remote({ resources: { session: (lead) => SessionId(lead) } })];
            _approvalChildren_decorators = [Remote({ resources: { session: (parent) => SessionId(parent) } })];
            _teamMemberModels_decorators = [Remote({ resources: { session: (lead, sessionId) => [SessionId(lead), SessionId(sessionId)] } })];
            _setTeamMemberModel_decorators = [Remote({ resources: { session: (lead, sessionId) => [SessionId(lead), SessionId(sessionId)] } })];
            _setTeamMemberMode_decorators = [Remote({ resources: { session: (lead, sessionId) => [SessionId(lead), SessionId(sessionId)] } })];
            _ownedProviderRoutes_decorators = [Remote('ownedProviderRoutes')];
            _projectedSubagentIds_decorators = [Remote('projectedSubagentIds')];
            _health_decorators = [Remote];
            _agentSessionSnapshot_decorators = [Remote];
            _agentSessionFollow_decorators = [Remote({ mode: 'stream' })];
            _setAgentSessionOption_decorators = [Remote];
            _toolApprovalPolicy_decorators = [Remote];
            _setToolApprovalPolicy_decorators = [Remote];
            _toolApprovalPolicyFollow_decorators = [Remote({ mode: 'stream' })];
            _recoverySnapshot_decorators = [Remote('recoverySnapshot')];
            _recoveryFollow_decorators = [Remote({ mode: 'stream' })];
            _retryOriginal_decorators = [Remote('retryOriginal')];
            _rebindRecoveryBlank_decorators = [Remote('rebindRecoveryBlank')];
            _backendOf_decorators = [Remote('backendOf')];
            _boundSessions_decorators = [Remote('boundSessions')];
            __esDecorate(this, null, _auditTimeline_decorators, { kind: "method", name: "auditTimeline", static: false, private: false, access: { has: obj => "auditTimeline" in obj, get: obj => obj.auditTimeline }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _activitySnapshot_decorators, { kind: "method", name: "activitySnapshot", static: false, private: false, access: { has: obj => "activitySnapshot" in obj, get: obj => obj.activitySnapshot }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _activityDetail_decorators, { kind: "method", name: "activityDetail", static: false, private: false, access: { has: obj => "activityDetail" in obj, get: obj => obj.activityDetail }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _activityPage_decorators, { kind: "method", name: "activityPage", static: false, private: false, access: { has: obj => "activityPage" in obj, get: obj => obj.activityPage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _activityFollow_decorators, { kind: "method", name: "activityFollow", static: false, private: false, access: { has: obj => "activityFollow" in obj, get: obj => obj.activityFollow }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _teamMembers_decorators, { kind: "method", name: "teamMembers", static: false, private: false, access: { has: obj => "teamMembers" in obj, get: obj => obj.teamMembers }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _approvalChildren_decorators, { kind: "method", name: "approvalChildren", static: false, private: false, access: { has: obj => "approvalChildren" in obj, get: obj => obj.approvalChildren }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _teamMemberModels_decorators, { kind: "method", name: "teamMemberModels", static: false, private: false, access: { has: obj => "teamMemberModels" in obj, get: obj => obj.teamMemberModels }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setTeamMemberModel_decorators, { kind: "method", name: "setTeamMemberModel", static: false, private: false, access: { has: obj => "setTeamMemberModel" in obj, get: obj => obj.setTeamMemberModel }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setTeamMemberMode_decorators, { kind: "method", name: "setTeamMemberMode", static: false, private: false, access: { has: obj => "setTeamMemberMode" in obj, get: obj => obj.setTeamMemberMode }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _ownedProviderRoutes_decorators, { kind: "method", name: "ownedProviderRoutes", static: false, private: false, access: { has: obj => "ownedProviderRoutes" in obj, get: obj => obj.ownedProviderRoutes }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _projectedSubagentIds_decorators, { kind: "method", name: "projectedSubagentIds", static: false, private: false, access: { has: obj => "projectedSubagentIds" in obj, get: obj => obj.projectedSubagentIds }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _health_decorators, { kind: "method", name: "health", static: false, private: false, access: { has: obj => "health" in obj, get: obj => obj.health }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _agentSessionSnapshot_decorators, { kind: "method", name: "agentSessionSnapshot", static: false, private: false, access: { has: obj => "agentSessionSnapshot" in obj, get: obj => obj.agentSessionSnapshot }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _agentSessionFollow_decorators, { kind: "method", name: "agentSessionFollow", static: false, private: false, access: { has: obj => "agentSessionFollow" in obj, get: obj => obj.agentSessionFollow }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setAgentSessionOption_decorators, { kind: "method", name: "setAgentSessionOption", static: false, private: false, access: { has: obj => "setAgentSessionOption" in obj, get: obj => obj.setAgentSessionOption }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toolApprovalPolicy_decorators, { kind: "method", name: "toolApprovalPolicy", static: false, private: false, access: { has: obj => "toolApprovalPolicy" in obj, get: obj => obj.toolApprovalPolicy }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setToolApprovalPolicy_decorators, { kind: "method", name: "setToolApprovalPolicy", static: false, private: false, access: { has: obj => "setToolApprovalPolicy" in obj, get: obj => obj.setToolApprovalPolicy }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _toolApprovalPolicyFollow_decorators, { kind: "method", name: "toolApprovalPolicyFollow", static: false, private: false, access: { has: obj => "toolApprovalPolicyFollow" in obj, get: obj => obj.toolApprovalPolicyFollow }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _recoverySnapshot_decorators, { kind: "method", name: "recoverySnapshot", static: false, private: false, access: { has: obj => "recoverySnapshot" in obj, get: obj => obj.recoverySnapshot }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _recoveryFollow_decorators, { kind: "method", name: "recoveryFollow", static: false, private: false, access: { has: obj => "recoveryFollow" in obj, get: obj => obj.recoveryFollow }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _retryOriginal_decorators, { kind: "method", name: "retryOriginal", static: false, private: false, access: { has: obj => "retryOriginal" in obj, get: obj => obj.retryOriginal }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _rebindRecoveryBlank_decorators, { kind: "method", name: "rebindRecoveryBlank", static: false, private: false, access: { has: obj => "rebindRecoveryBlank" in obj, get: obj => obj.rebindRecoveryBlank }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _backendOf_decorators, { kind: "method", name: "backendOf", static: false, private: false, access: { has: obj => "backendOf" in obj, get: obj => obj.backendOf }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _boundSessions_decorators, { kind: "method", name: "boundSessions", static: false, private: false, access: { has: obj => "boundSessions" in obj, get: obj => obj.boundSessions }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        resolved = __runInitializers(this, _instanceExtraInitializers);
        recoveryOperations = new Set();
        constructor(ctx, deps) {
            super(ctx, 'dshAcp');
            // seam 解析产物只驱动缺省实现；显式注入的 deps 原样优先（测试全注入假实现）。
            const subprocess = deps.subprocess ?? { ok: false, message: ACP_SUBPROCESS_UNAVAILABLE_MESSAGE };
            this.resolved = {
                registry: deps.registry,
                approvalChildren: deps.approvalChildren,
                teamManagement: deps.teamManagement,
                // host 未接线结构门事实时按兼容处理（纯模块单测路径；生产恒注入）
                hostCompatible: deps.hostCompatible ?? (() => true),
                checkExecutable: deps.checkExecutable ??
                    (subprocess.ok
                        ? // `command -v` 等价物：宿主 seam 的 PATH 解析（Windows 含 PATHEXT 语义），零 spawn 副作用
                            (command) => subprocess.seam.resolveExecutable(command).then(() => true, () => false)
                        : () => Promise.resolve(false)),
                queryVersion: deps.queryVersion ??
                    (subprocess.ok ? (command) => acpQueryVersion(subprocess.seam, command) : () => Promise.resolve(null)),
                listLiveSessions: deps.listLiveSessions ?? null,
                backendFacts: deps.backendFacts ?? null,
                bindingFacts: deps.bindingFacts ?? null,
                recoveryStateStore: deps.recoveryStateStore ?? null,
                recoveryAdapter: deps.recoveryAdapter ?? null,
                agentSessionControl: deps.agentSessionControl ?? null,
                agentSessionChanges: deps.agentSessionChanges ?? null,
                toolApprovalPolicy: deps.toolApprovalPolicy ?? null,
                toolApprovalPolicyChanges: deps.toolApprovalPolicyChanges ?? null,
                auditTimeline: deps.auditTimeline ?? null,
                activityTimeline: deps.activityTimeline ?? null,
                ownedSessionReadGate: deps.ownedSessionReadGate ?? deps.activityAccess ?? null,
                activityReadStatus: deps.activityReadStatus ?? null,
                projectedSubagentIds: deps.projectedSubagentIds ?? null,
                imageInputAvailable: deps.imageInputAvailable ?? false,
            };
        }
        /** Read a bounded sidecar page. Raw payloads never cross the Remote boundary. */
        async auditTimeline(sessionId, request) {
            const source = this.resolved.auditTimeline;
            if (source === null)
                throw acpRemoteFailure('config', 'ACP audit history is unavailable on this host');
            await this.requireOwnedSessionAccess(sessionId);
            const afterSeq = request?.afterSeq ?? 0;
            const limit = request?.limit ?? 50;
            if (!Number.isSafeInteger(afterSeq) || afterSeq < 0)
                throw badRequest('ACP audit cursor is invalid');
            if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
                throw badRequest('ACP audit page size is invalid');
            const requestedHead = request?.snapshotHead;
            if (requestedHead !== undefined && (!Number.isSafeInteger(requestedHead) || requestedHead < 0))
                throw badRequest('ACP audit snapshot head is invalid');
            if (requestedHead !== undefined && afterSeq > requestedHead)
                throw badRequest('ACP audit cursor exceeds the snapshot head');
            const snapshotHead = requestedHead ?? (request?.captureSnapshot === true ? await source.head(sessionId) : null);
            const view = request?.view;
            if (view !== undefined && !['issues', 'operations', 'technical'].includes(view))
                throw badRequest('ACP diagnostic view is invalid');
            if (view !== undefined) {
                // Filter on the host so routine checkpoints cannot hide a later error.
                // Bound each request; the cursor tracks scanned facts, even on empty pages.
                const entries = [];
                let scannedSeq = afterSeq;
                let scanned = 0;
                let hasMore = true;
                while (entries.length < limit && scanned < 1000 && hasMore) {
                    const page = await source.list(sessionId, scannedSeq, 100, snapshotHead ?? undefined);
                    if (page.length === 0) {
                        hasMore = false;
                        break;
                    }
                    for (const entry of page) {
                        scannedSeq = entry.seq;
                        scanned += 1;
                        if (matchesDiagnosticView(entry, view))
                            entries.push(entry);
                        if (entries.length === limit)
                            break;
                    }
                    hasMore = await source.hasMore(sessionId, scannedSeq, snapshotHead ?? undefined);
                }
                return {
                    sessionId,
                    entries,
                    snapshotHead,
                    scannedThrough: scannedSeq,
                    scannedRecords: null,
                    unreadableRecords: 0,
                    nextCursor: hasMore ? scannedSeq : null,
                    hasMore,
                };
            }
            if (snapshotHead !== null) {
                const page = await source.scanPage(sessionId, afterSeq, limit, snapshotHead);
                if (page.scannedThrough < afterSeq ||
                    page.scannedThrough > snapshotHead ||
                    page.unreadableRecords > page.scannedRecords ||
                    page.entries.length + page.unreadableRecords !== page.scannedRecords ||
                    page.scannedRecords > limit ||
                    (page.hasMore && page.scannedRecords === 0))
                    throw badRequest('ACP audit snapshot page is invalid');
                return {
                    sessionId,
                    entries: page.entries,
                    snapshotHead,
                    scannedThrough: page.scannedThrough,
                    scannedRecords: page.scannedRecords,
                    unreadableRecords: page.unreadableRecords,
                    nextCursor: page.hasMore ? page.scannedThrough : null,
                    hasMore: page.hasMore,
                };
            }
            const entries = await source.list(sessionId, afterSeq, limit, snapshotHead ?? undefined);
            const lastSeq = entries.at(-1)?.seq ?? afterSeq;
            const hasMore = entries.length === limit && (await source.hasMore(sessionId, lastSeq, snapshotHead ?? undefined));
            return {
                sessionId,
                entries,
                snapshotHead,
                scannedThrough: lastSeq,
                scannedRecords: null,
                unreadableRecords: 0,
                nextCursor: hasMore ? lastSeq : null,
                hasMore,
            };
        }
        /** Opening snapshot for the activity panel. Authorization is deliberately
         * separate from the sidecar query: a caller cannot turn an arbitrary string
         * into access to another DSH session's Agent trace. */
        async activitySnapshot(sessionId, request) {
            await this.requireActivityRead(sessionId);
            const source = this.resolved.activityTimeline;
            if (source === null)
                throw acpRemoteFailure('config', 'ACP activity history is unavailable on this host');
            const limit = request?.limit ?? 100;
            validateActivityReadRequest(limit, request?.filter);
            const activities = await source.snapshot(sessionId, limit, request?.filter);
            const head = await source.head(sessionId, request?.filter);
            return { sessionId, activities: activities.map(activitySummary), head };
        }
        /** Exact immutable revision; use the same ownership gate as journal reads. */
        async activityDetail(sessionId, request, signal) {
            signal?.throwIfAborted();
            await this.requireActivityRead(sessionId);
            const source = this.resolved.activityTimeline;
            if (source === null)
                throw acpRemoteFailure('config', 'ACP activity history is unavailable on this host');
            if (!Number.isSafeInteger(request.revisionSeq) ||
                request.revisionSeq < 1 ||
                !request.activityId ||
                !request.ownerDshSessionId)
                throw badRequest('ACP activity detail identity is invalid');
            const [row] = await source.page(sessionId, request.revisionSeq - 1, 1);
            signal?.throwIfAborted();
            if (row === undefined ||
                row.dshSessionId !== sessionId ||
                row.revisionSeq !== request.revisionSeq ||
                row.activityId !== request.activityId ||
                row.ownerDshSessionId !== request.ownerDshSessionId) {
                throw badRequest('ACP activity detail revision is unavailable');
            }
            return row;
        }
        /** Revision-cursor page used for reconnect/gap repair. The page contains
         * every committed revision, while the snapshot contains only current rows. */
        async activityPage(sessionId, request, signal) {
            signal?.throwIfAborted();
            await this.requireActivityRead(sessionId);
            const source = this.resolved.activityTimeline;
            if (source === null)
                throw acpRemoteFailure('config', 'ACP activity history is unavailable on this host');
            const afterRevision = request?.afterRevision ?? 0;
            const limit = request?.limit ?? 100;
            if (!Number.isSafeInteger(afterRevision) || afterRevision < 0)
                throw badRequest('ACP activity cursor is invalid');
            validateActivityReadRequest(limit, request?.filter);
            const requestedHead = request?.snapshotHead;
            if (requestedHead !== undefined && (!Number.isSafeInteger(requestedHead) || requestedHead < 0))
                throw badRequest('ACP activity snapshot head is invalid');
            if (requestedHead !== undefined && afterRevision > requestedHead)
                throw badRequest('ACP activity cursor exceeds the snapshot head');
            // The support exporter opts into an immutable opening watermark. Ordinary
            // activity paging retains its live-page behavior when this is omitted.
            const snapshotHead = requestedHead ?? (request?.captureSnapshot === true ? await source.head(sessionId, request?.filter) : undefined);
            const activities = await source.page(sessionId, afterRevision, limit, request?.filter, snapshotHead);
            signal?.throwIfAborted();
            const lastRevision = activities.at(-1)?.revisionSeq ?? afterRevision;
            const head = snapshotHead ?? (await source.head(sessionId, request?.filter));
            const hasMore = snapshotHead === undefined ? activities.length === limit && lastRevision < head : lastRevision < snapshotHead;
            return {
                sessionId,
                activities: activities.map(activitySummary),
                head,
                nextCursor: hasMore ? lastRevision : null,
                hasMore,
            };
        }
        /**
         * Snapshot-first live journal. The subscription is attached before the
         * opening read, so a revision committed during the opening window is either
         * present in the opening snapshot or remains queued for delivery. The
         * opening cursor is the unfiltered session head; clients filter activities
         * locally while retaining a contiguous reconnect cursor.
         */
        async *activityFollow(sessionId, request, signal) {
            if (this.resolved.activityReadStatus !== null) {
                let status = 'denied';
                try {
                    status = await this.resolved.activityReadStatus(sessionId);
                }
                catch {
                    status = 'denied';
                }
                if (status === 'binding-pending')
                    throw acpRemoteFailure('activity-binding-pending', 'ACP activity is waiting for the session binding');
                if (status !== 'owned')
                    throw acpRemoteFailure('user-rejected', 'ACP activity access is not authorized for this DSH session');
            }
            else if (!(await this.hasOwnedSessionAccess(sessionId))) {
                throw acpRemoteFailure('user-rejected', 'ACP activity access is not authorized for this DSH session');
            }
            const source = this.resolved.activityTimeline;
            if (source === null || source.subscribe === undefined)
                throw acpRemoteFailure('config', 'ACP activity live stream is unavailable on this host');
            const limit = request?.limit ?? 100;
            validateActivityReadRequest(limit, request?.filter);
            const queue = [];
            let wake;
            let openingHead = 0;
            let closed = false;
            // The production sidecar commits each revision under one synchronous
            // transaction and notifies subscribers immediately after commit. Those
            // notifications therefore arrive once, in strictly increasing revision
            // order. A high-water mark handles duplicate/stale delivery without
            // retaining every revision for the lifetime of this stream.
            let lastDeliveredRevision = 0;
            const wakeWaiter = () => {
                const resolve = wake;
                wake = undefined;
                resolve?.();
            };
            const onAbort = () => wakeWaiter();
            let unsubscribe;
            try {
                if (signal.aborted)
                    return;
                signal.addEventListener('abort', onAbort);
                unsubscribe = source.subscribe(sessionId, undefined, (activity) => {
                    if (closed)
                        return;
                    queue.push(activitySummary(activity));
                    wakeWaiter();
                });
                // Subscribe first, then rebuild the complete current-state projection
                // from bounded revision pages up to one fixed head.  A bounded snapshot
                // cannot safely advance to the full head: when a session owns more rows
                // than the opening limit, doing so permanently skips every undisclosed
                // revision.  Folding revision pages keeps transport bounded without
                // making the user-visible journal lossy.
                openingHead = await source.head(sessionId, undefined);
                if (signal.aborted)
                    return;
                lastDeliveredRevision = openingHead;
                const current = new Map();
                let cursor = 0;
                while (cursor < openingHead) {
                    const before = cursor;
                    const page = await source.page(sessionId, cursor, limit, undefined);
                    if (signal.aborted)
                        return;
                    if (page.length === 0)
                        break;
                    for (const activity of page) {
                        if (activity.revisionSeq > openingHead)
                            break;
                        current.set(activity.activityId, activitySummary(activity));
                        cursor = Math.max(cursor, activity.revisionSeq);
                    }
                    // A racing writer may make a backend page contain only revisions above
                    // the fixed opening head. No row was consumed in that case; stop the
                    // opening fold and let the already-subscribed queue deliver them.
                    if (cursor === before)
                        break;
                }
                const activities = [...current.values()].sort((left, right) => left.activitySeq - right.activitySeq);
                yield { type: 'opened', cursor: openingHead, activities, head: openingHead };
                while (!signal.aborted) {
                    while (queue.length > 0) {
                        const activity = queue.shift();
                        if (activity.revisionSeq <= lastDeliveredRevision)
                            continue;
                        lastDeliveredRevision = activity.revisionSeq;
                        yield { type: 'entry', activity };
                    }
                    if (signal.aborted)
                        break;
                    await new Promise((resolve) => {
                        wake = resolve;
                        if (signal.aborted)
                            wakeWaiter();
                    });
                }
            }
            finally {
                closed = true;
                signal.removeEventListener('abort', onAbort);
                try {
                    unsubscribe?.();
                }
                finally {
                    wakeWaiter();
                }
            }
        }
        async requireActivityRead(sessionId) {
            await this.requireOwnedSessionAccess(sessionId);
        }
        /** Validate identity and ownership before touching either sidecar source. */
        async requireOwnedSessionAccess(sessionId) {
            if (!(await this.hasOwnedSessionAccess(sessionId)))
                throw acpRemoteFailure('user-rejected', 'ACP activity access is not authorized for this DSH session');
        }
        async hasOwnedSessionAccess(sessionId) {
            if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 256)
                throw badRequest('ACP activity session id is invalid');
            const access = this.resolved.ownedSessionReadGate;
            return access !== null && (await access(sessionId));
        }
        async teamMembers(lead) {
            await this.requireOwnedSessionAccess(lead);
            if (this.resolved.teamManagement === undefined)
                throw badRequest('ACP Teams is unavailable');
            return await this.resolved.teamManagement.members(lead);
        }
        /** Authoritative eligible descendants; no approval is recreated or answered here. */
        async approvalChildren(parent) {
            if (typeof parent !== 'string' || parent.length === 0 || parent.length > 256)
                throw badRequest('Invalid parent session id');
            const read = this.resolved.approvalChildren;
            if (read === undefined)
                throw badRequest('Child approval discovery is unavailable');
            return read(parent).filter((child) => child.sessionId !== parent &&
                child.path.length > 0 &&
                child.path.every((entry) => this.callerCanReadSession(entry.sessionId)));
        }
        async teamMemberModels(lead, sessionId) {
            await this.teamMembers(lead);
            await this.requireOwnedSessionAccess(sessionId);
            const management = this.resolved.teamManagement;
            if (!management?.models)
                throw badRequest('Member models are unavailable');
            return await preserveAcpFailure(() => management.models(lead, sessionId));
        }
        async setTeamMemberModel(lead, sessionId, model) {
            await this.teamMembers(lead);
            await this.requireOwnedSessionAccess(sessionId);
            if (typeof model !== 'string' || !model || model.length > 512)
                throw badRequest('Invalid member model');
            const management = this.resolved.teamManagement;
            if (!management?.selectModel)
                throw badRequest('Member models are unavailable');
            return await preserveAcpFailure(() => management.selectModel(lead, sessionId, model));
        }
        async setTeamMemberMode(lead, sessionId, modeId) {
            const members = await this.teamMembers(lead);
            const member = members.find((member) => member.sessionId === sessionId);
            if (member?.profileId === null || member === undefined || member.status !== 'inactive')
                throw badRequest('The ACP member must be inactive');
            if (typeof modeId !== 'string' || !modeId || modeId.length > ACP_CONFIG_IDENTIFIER_MAX)
                throw badRequest('Invalid member mode');
            await this.requireOwnedSessionAccess(sessionId);
            const adapter = await this.agentSessionControlFor(sessionId);
            if (!adapter.setTeamMemberMode)
                throw badRequest('Member modes are unavailable');
            return await preserveAcpFailure(() => adapter.setTeamMemberMode(sessionId, modeId));
        }
        /** Exact ownership proof consumed by additive client observers. Historical
         * routes remain owned after profile removal so old Activity still renders;
         * an unrelated plugin merely using the `acp-` prefix is never claimed. */
        async ownedProviderRoutes() {
            const configured = [...this.resolved.registry.agents().keys()].map((key) => key.startsWith('acp-') ? key : acpRouteId(key));
            const durable = this.resolved.bindingFacts?.listBoundProviders === undefined
                ? []
                : await this.resolved.bindingFacts.listBoundProviders();
            return { providers: [...new Set([...configured, ...durable])].sort() };
        }
        async projectedSubagentIds() {
            const sessionIds = this.resolved.projectedSubagentIds === null ? [] : await this.resolved.projectedSubagentIds();
            return { sessionIds: sessionIds.filter((id) => this.callerCanReadSession(id)) };
        }
        /** Global discovery carries only the sessions allowed for this actual Remote caller. */
        callerCanReadSession(sessionId) {
            // Direct in-process consumers have no Remote caller. Gateway compositions
            // always mount remoteAccess; an invoked method without it fails closed.
            if (this.ctx.invocation === undefined)
                return true;
            const access = this.ctx.get('remoteAccess');
            return (access !== undefined &&
                'allows' in access &&
                typeof access.allows === 'function' &&
                access.allows({ kind: 'session', id: SessionId(sessionId) }) === true);
        }
        /**
         * 全部 provider 的健康行（executable/version/probe 快照收窄透传 + 五态
         * `state`）+ 沙箱/指标/活体会话连续性事实。`request.recheck === true` 时重探：
         * `agentId` 在场只检查并返回该 provider，缺席检查并返回全部。这样卡片操作
         * 不会为无关 Agent 运行 executable/version/protocol probe；缺省只读缓存视图
         * （面板打开不 spawn probe）。
         */
        async health(request) {
            const allEntries = [...this.resolved.registry.agents().entries()].sort(([left], [right]) => left.localeCompare(right));
            // 五态派生的宿主结构门输入（每行共享同一事实；deps 缺省恒 true）
            const hostCompatible = this.resolved.hostCompatible();
            const recheck = request?.recheck === true;
            const targetAgentId = request?.agentId;
            if (targetAgentId !== undefined) {
                if (!recheck)
                    throw badRequest('dsh-acp: health agentId requires recheck=true');
                if (!ACP_AGENT_ID_PATTERN.test(targetAgentId)) {
                    throw badRequest(`dsh-acp: invalid health agent id ${JSON.stringify(targetAgentId)}`);
                }
                if (!allEntries.some(([id]) => id === targetAgentId)) {
                    throw badRequest(`dsh-acp: unknown ACP agent ${JSON.stringify(targetAgentId)}`);
                }
            }
            const entries = targetAgentId === undefined ? allEntries : allEntries.filter(([id]) => id === targetAgentId);
            const providers = await Promise.all(entries.map(async ([id, config]) => {
                // The model picker and Settings health must address the same
                // registered profile adapter. A detached top-level stub would create
                // a second cache and can report a different readiness result.
                const probeCache = this.resolved.registry.probeCacheFor(id);
                if (probeCache === undefined) {
                    return {
                        id,
                        name: config.name,
                        command: config.command,
                        args: [...config.args],
                        loginHint: config.loginHint ?? null,
                        executable: false,
                        version: null,
                        probe: { status: 'never', at: null },
                        state: deriveAcpAgentState({ hostCompatible, configValid: true, probe: undefined }),
                    };
                }
                if (recheck && (targetAgentId === undefined || targetAgentId === id)) {
                    // 「重新检查」强制丢弃 probe cache 并重探（条文的接线路径）；重探
                    // 失败不抛出——失败条目落缓存，下方照常按新鲜度产出 unavailable 行。
                    const routeId = acpRouteId(id);
                    probeCache.invalidateProbe(routeId);
                    await probeCache.listModels(routeId).catch(() => undefined);
                }
                const snapshot = probeCache.probeSnapshot(acpRouteId(id));
                // Health is a last-explicit-check view, not the model catalogue's
                // runtime cache. Keep a result while it still belongs to the exact
                // saved configuration; configuration edits invalidate it by key.
                const matchingSnapshot = snapshot?.key === acpProbeConfigKey(config) ? snapshot : undefined;
                // Opening Settings is a read-only cache view: resolving PATH is
                // side-effect free, while `--version` is a subprocess and therefore
                // belongs exclusively to an explicit recheck. Never make a panel
                // mount spawn an ACP process (or a version helper).
                const executable = await this.resolved.checkExecutable(config.command);
                const cachedAgentVersion = matchingSnapshot?.result.kind === 'ok' && matchingSnapshot.result.agentInfo?.version !== undefined
                    ? matchingSnapshot.result.agentInfo.version
                    : null;
                const version = recheck && executable ? await this.resolved.queryVersion(config.command) : cachedAgentVersion;
                // Readiness is the last explicit outcome for this exact configuration.
                // Runtime consumers independently re-probe after their bounded TTL.
                // 版本参考共用同一绑定事实：runtime 绑定 → catalogIdOf → 快照
                // version；普通 profile 按 agent id 直查。
                const referenceVersion = registryVersionOf(catalogIdOf(id, config));
                return {
                    id,
                    name: config.name,
                    command: config.command,
                    args: [...config.args],
                    loginHint: config.loginHint ?? null,
                    executable,
                    version,
                    probe: probeRow(matchingSnapshot, referenceVersion, this.resolved.imageInputAvailable),
                    // registry 的 agents map 经 settings schema 校验（非法值根本写不进来），configValid 恒 true
                    state: deriveAcpAgentState({
                        hostCompatible,
                        configValid: true,
                        probe: matchingSnapshot === undefined ? undefined : probeStateView(matchingSnapshot),
                    }),
                };
            }));
            if (recheck)
                this.resolved.registry.modelsChanged?.(entries.map(([id]) => id));
            const liveSessions = this.resolved.listLiveSessions === null
                ? null
                : this.resolved
                    .listLiveSessions()
                    .filter((entry) => this.callerCanReadSession(entry.sessionId))
                    .map((entry) => ({ sessionId: entry.sessionId, continuity: entry.continuity }));
            return {
                providers,
                liveSessions,
            };
        }
        /** Additive Agent-owned controls/context surface. It intentionally does not
         * reuse the legacy live Agent/options service, model picker, or DSH usage. */
        async agentSessionSnapshot(sessionId) {
            await this.requireOwnedSessionAccess(sessionId);
            const adapter = await this.agentSessionControlFor(sessionId);
            return await preserveAcpFailure(() => adapter.agentSessionSnapshot(sessionId));
        }
        /** Subscribe before reading: creation or a config notification cannot fall into the opening gap. */
        async *agentSessionFollow(sessionId, signal) {
            const changes = this.resolved.agentSessionChanges;
            const facts = this.resolved.backendFacts;
            const resolver = this.resolved.agentSessionControl;
            if (changes === null || facts === null || resolver === null)
                throw acpRemoteFailure('config', 'ACP Agent session stream is unavailable');
            // Unlike the durable sidecar gate used by ACP-only controls, the stream
            // permits a live session before its first ACP binding so the client can
            // wait for the initial binding and receive a null baseline.
            if (sessionId.length === 0 || sessionId.length > 256 || !(await changes.canRead(sessionId))) {
                throw acpRemoteFailure('user-rejected', 'ACP Agent session access is not authorized');
            }
            let dirty = true;
            let wake;
            const notify = () => {
                dirty = true;
                wake?.();
            };
            const unsubscribe = changes.subscribe(sessionId, notify);
            signal.addEventListener('abort', notify, { once: true });
            let previous;
            try {
                while (!signal.aborted) {
                    if (!dirty)
                        await new Promise((resolve) => {
                            wake = resolve;
                        });
                    wake = undefined;
                    if (signal.aborted)
                        break;
                    dirty = false;
                    const provider = await facts.readBindingProvider(sessionId);
                    // No binding is a normal pending state. Never infer or create a runtime from a UI read.
                    const adapter = provider === undefined ? undefined : resolver(provider);
                    if (provider !== undefined && adapter === undefined)
                        throw acpRemoteFailure('config', 'The ACP Agent profile is unavailable');
                    const snapshot = adapter === undefined ? null : await preserveAcpFailure(() => adapter.agentSessionSnapshot(sessionId));
                    if (signal.aborted)
                        break;
                    const key = JSON.stringify(snapshot);
                    if (key === previous)
                        continue;
                    yield { type: previous === undefined ? 'opened' : 'changed', snapshot };
                    previous = key;
                }
            }
            finally {
                unsubscribe();
                signal.removeEventListener('abort', notify);
            }
        }
        async setAgentSessionOption(sessionId, request) {
            await this.requireOwnedSessionAccess(sessionId);
            const adapter = await this.agentSessionControlFor(sessionId);
            return await preserveAcpFailure(() => adapter.setAgentSessionOption(sessionId, request));
        }
        async toolApprovalPolicy(sessionId) {
            await this.requirePolicySessionAccess(sessionId);
            const store = this.resolved.toolApprovalPolicy;
            if (store === null)
                throw acpRemoteFailure('config', 'DSH tool approval controls are unavailable');
            return await store.read(sessionId);
        }
        async setToolApprovalPolicy(sessionId, request) {
            await this.requirePolicySessionAccess(sessionId);
            if (request === null || typeof request !== 'object' || (request.policy !== 'auto' && request.policy !== 'ask'))
                throw badRequest('Invalid DSH tool approval policy');
            const store = this.resolved.toolApprovalPolicy;
            if (store === null)
                throw acpRemoteFailure('config', 'DSH tool approval controls are unavailable');
            const snapshot = await store.write(sessionId, request.policy);
            this.resolved.toolApprovalPolicyChanges?.notify();
            return snapshot;
        }
        async *toolApprovalPolicyFollow(sessionId, signal) {
            await this.requirePolicySessionAccess(sessionId);
            const store = this.resolved.toolApprovalPolicy;
            const changes = this.resolved.toolApprovalPolicyChanges;
            if (store === null || changes === null)
                throw acpRemoteFailure('config', 'DSH tool approval stream is unavailable');
            let dirty = true;
            let wake;
            const notify = () => {
                dirty = true;
                wake?.();
            };
            const unsubscribe = changes.subscribe(notify);
            signal.addEventListener('abort', notify, { once: true });
            let previous;
            try {
                while (!signal.aborted) {
                    if (!dirty)
                        await new Promise((resolve) => {
                            wake = resolve;
                        });
                    wake = undefined;
                    if (signal.aborted)
                        break;
                    dirty = false;
                    await this.requirePolicySessionAccess(sessionId);
                    const snapshot = await store.read(sessionId);
                    if (signal.aborted)
                        break;
                    const key = JSON.stringify(snapshot);
                    if (key === previous)
                        continue;
                    yield { type: previous === undefined ? 'opened' : 'changed', snapshot };
                    previous = key;
                }
            }
            finally {
                unsubscribe();
                signal.removeEventListener('abort', notify);
            }
        }
        async requirePolicySessionAccess(sessionId) {
            const changes = this.resolved.agentSessionChanges;
            if (typeof sessionId !== 'string' ||
                sessionId.length === 0 ||
                sessionId.length > 256 ||
                changes === null ||
                !(await changes.canRead(sessionId))) {
                throw acpRemoteFailure('user-rejected', 'DSH tool approval access is not authorized');
            }
        }
        async agentSessionControlFor(sessionId) {
            const provider = this.resolved.backendFacts === null ? undefined : await this.resolved.backendFacts.readBindingProvider(sessionId);
            if (provider === undefined)
                throw acpRemoteFailure('resume-conflict', 'No established ACP Agent session is available');
            const resolver = this.resolved.agentSessionControl;
            if (resolver === null)
                throw acpRemoteFailure('config', 'ACP Agent session controls are unavailable on this host');
            const adapter = resolver(provider);
            if (adapter === undefined)
                throw acpRemoteFailure('resume-conflict', 'No plugin-owned ACP Agent session is available');
            return adapter;
        }
        /** Read Host-owned recovery facts, including its durable store and in-memory fallback. */
        async recoverySnapshot(sessionId) {
            // First-use ACP sessions can be projected before session/new writes a
            // durable binding. Return an empty healthy view in that case without
            // reading potentially sensitive recovery records for an unowned ID.
            if (!(await this.hasOwnedSessionAccess(sessionId)))
                return healthyRecoveryView(sessionId);
            const persisted = this.resolved.recoveryStateStore === null ? undefined : await this.resolved.recoveryStateStore.read(sessionId);
            if (persisted !== undefined)
                return persisted;
            return healthyRecoveryView(sessionId);
        }
        /** Subscribe before reading volatile and durable recovery facts; reads stay side-effect-free. */
        async *recoveryFollow(sessionId, signal) {
            const changes = this.resolved.agentSessionChanges;
            if (changes === null ||
                typeof sessionId !== 'string' ||
                sessionId.length === 0 ||
                sessionId.length > 256 ||
                !(await changes.canRead(sessionId))) {
                throw acpRemoteFailure('user-rejected', 'ACP recovery access is not authorized for this DSH session');
            }
            let dirty = true;
            let wake;
            const notify = () => {
                dirty = true;
                wake?.();
            };
            const unsubscribe = changes.subscribe(sessionId, notify);
            signal.addEventListener('abort', notify, { once: true });
            let previous;
            try {
                while (!signal.aborted) {
                    if (!dirty)
                        await new Promise((resolve) => {
                            wake = resolve;
                        });
                    wake = undefined;
                    if (signal.aborted)
                        break;
                    dirty = false;
                    const snapshot = await this.recoverySnapshot(sessionId);
                    if (signal.aborted)
                        break;
                    const key = JSON.stringify(snapshot);
                    if (key === previous)
                        continue;
                    yield { type: previous === undefined ? 'opened' : 'changed', snapshot };
                    previous = key;
                }
            }
            finally {
                unsubscribe();
                signal.removeEventListener('abort', notify);
            }
        }
        async recoveryAdapterFor(sessionId) {
            const provider = this.resolved.backendFacts === null ? undefined : await this.resolved.backendFacts.readBindingProvider(sessionId);
            if (provider === undefined)
                throw acpRemoteFailure('resume-conflict', `ACP recovery binding is unavailable for session "${sessionId}"`);
            const adapter = this.resolved.recoveryAdapter?.(provider);
            if (adapter === undefined)
                throw acpRemoteFailure('config', `ACP recovery profile is unavailable for provider "${provider}"`);
            return adapter;
        }
        /** Serialize destructive recovery choices for one owned session only. */
        async runRecoveryOperation(sessionId, operation) {
            await this.requireOwnedSessionAccess(sessionId);
            if (this.recoveryOperations.has(sessionId))
                throw acpRemoteFailure('resume-conflict', 'An ACP recovery action is already in progress for this session');
            this.recoveryOperations.add(sessionId);
            try {
                const adapter = await this.recoveryAdapterFor(sessionId);
                await preserveAcpFailure(() => operation(adapter));
                return await this.recoverySnapshot(sessionId);
            }
            finally {
                this.recoveryOperations.delete(sessionId);
            }
        }
        /** Retry the original durable Agent binding; never resends the interrupted prompt. */
        async retryOriginal(sessionId) {
            return await this.runRecoveryOperation(sessionId, (adapter) => adapter.retryOriginal(sessionId));
        }
        /** Rebind a blank ACP context and return recovery state without requiring an option snapshot. */
        async rebindRecoveryBlank(sessionId) {
            return await this.runRecoveryOperation(sessionId, (adapter) => adapter.rebindBlank(sessionId));
        }
        /**
         * Read the current backend from its durable binding, then request header.
         * A known live session without either fact is blank; an absent or unreadable
         * session without live existence evidence is rejected rather than guessed.
         */
        async backendOf(sessionId) {
            // This query intentionally includes native/blank sessions so the model
            // picker can decide whether an ACP switch must create a new DSH session.
            const facts = this.resolved.backendFacts;
            if (facts === null) {
                throw acpRemoteError(new AcpClientError('protocol-error', `dsh-acp: backend facts are not wired on this host; cannot determine the backend of session "${sessionId}"`, { category: 'config' }));
            }
            const bound = await facts.readBindingProvider(sessionId);
            if (bound !== undefined)
                return { state: 'established', provider: bound };
            try {
                const header = await facts.peekHeaderProvider(sessionId);
                return header === undefined ? { state: 'blank' } : { state: 'established', provider: header };
            }
            catch (error) {
                // 无日志可读时活体（任意 backend，含尚未落 header 的新 native 会话）仍是
                // 存在性证据：无 header 即 blank。
                if (facts.hasLiveAgent(sessionId))
                    return { state: 'blank' };
                throw acpRemoteError(new AcpClientError('protocol-error', `dsh-acp: cannot determine the execution backend of session "${sessionId}": the session does not exist or its log is unreadable (${error instanceof Error ? error.message : String(error)})`, { category: 'config' }));
            }
        }
        /**
         * boundSessions（删除确认提示）：该 profile（按 agent id）当前被多少个
         * 既有 DSH 会话的 sidecar binding 引用——删除 profile 后这些会话显示
         * backend-unavailable，面板在确认文案中如实预告。纯读零副作用；agent id
         * 非法或未接线一律 throw（不冒充 0）。
         */
        async boundSessions(agentId) {
            if (!ACP_AGENT_ID_PATTERN.test(agentId)) {
                throw acpRemoteError(new AcpClientError('protocol-error', `dsh-acp: invalid agent id ${JSON.stringify(agentId)} (must match ${String(ACP_AGENT_ID_PATTERN)})`, { category: 'config' }));
            }
            const facts = this.resolved.bindingFacts;
            if (facts === null) {
                throw acpRemoteError(new AcpClientError('protocol-error', `dsh-acp: binding facts are not wired on this host; cannot count sessions bound to "${agentId}"`, { category: 'config' }));
            }
            return { agentId, count: await facts.countBoundSessions(acpRouteId(agentId)) };
        }
    };
})();
export { AcpRemoteService };
function validateActivityReadRequest(limit, filter) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200)
        throw badRequest('ACP activity page size is invalid');
    if (filter === undefined)
        return;
    for (const [key, value] of Object.entries(filter)) {
        if (key !== 'ownerDshSessionId' && key !== 'promptAnchorMessageId')
            throw badRequest(`ACP activity filter field is invalid: ${key}`);
        if (value !== undefined && (typeof value !== 'string' || value.length === 0 || value.length > 256))
            throw badRequest('ACP activity filter value is invalid');
    }
}
/** 当前配置最后一次 probe → 五态派生的最小视图（ok 留目录事实，error 留分流 kind）。 */
function probeStateView(snapshot) {
    const { result } = snapshot;
    return result.kind === 'ok'
        ? {
            result: {
                kind: 'ok',
                modelCount: result.models.length,
                hasModelConfigOption: result.hasModelConfigOption === true,
            },
        }
        : { result: { kind: 'error', failureKind: result.failureKind } };
}
/** cleanup 三态词表收窄（结构面按 string 进；词表外值诚实归 null，不猜测）。 */
function contractCleanupOf(cleanup) {
    if (cleanup === undefined)
        return null;
    const steps = ['done', 'not-advertised', 'failed'];
    const close = steps.find((step) => step === cleanup.close);
    const del = steps.find((step) => step === cleanup.delete);
    if (close === undefined || del === undefined)
        return null;
    return { close, delete: del, message: cleanup.message ?? null };
}
function probeRow(snapshot, referenceVersion, imageInputAvailable) {
    if (snapshot === undefined)
        return { status: 'never', at: null };
    const { result, at } = snapshot;
    if (result.kind === 'ok') {
        const capabilities = capabilityFactsOf(result.agentCapabilities);
        return {
            status: 'ok',
            at,
            modelCount: result.models.length,
            authMethods: result.authMethods === undefined ? null : result.authMethods.map(contractAuthMethodOf),
            agentInfo: result.agentInfo == null ? null : { name: result.agentInfo.name, version: result.agentInfo.version },
            capabilities,
            cleanup: contractCleanupOf(result.cleanup),
            capabilityHash: result.capabilityHash ?? null,
            // readiness：协议版本 / 兼容状态（兼容状态由 agent-config.ts
            // 纯函数派生，比对握手 agentInfo.version 与 registry 快照版本参考）
            protocolVersion: result.protocolVersion ?? null,
            versionCompatibility: acpVersionCompatibility(referenceVersion, result.agentInfo?.version),
            // 端到端能力矩阵（广告 × adapter path；纯函数
            // 直通，形状与 contract `AcpCapabilityMatrixRow` 结构一致，无映射）
            matrix: acpCapabilityMatrix(capabilities, {
                imageInput: imageInputAvailable,
            }),
        };
    }
    return {
        status: 'error',
        at,
        failureKind: result.failureKind,
        message: result.error.message,
        phase: result.probePhase ?? null,
    };
}
/** Bound the ordinary journal payload without mistaking truncated diagnostics for full display data. */
function activitySummary(row) {
    const displaySize = JSON.stringify(row.display ?? {}).length;
    const rawSize = row.rawDetail?.length ?? 0;
    if (displaySize + rawSize <= 16_384)
        return row;
    const { display: _display, rawDetail: _rawDetail, ...summary } = row;
    return {
        ...summary,
        // Small diagnostic metadata keeps tool summaries and projection links available.
        ...(rawSize <= 16_384 && row.rawDetail !== undefined ? { rawDetail: row.rawDetail } : {}),
        detailDeferred: true,
        ...(row.display?.diffs === undefined
            ? {}
            : { detailPaths: [...new Set(row.display.diffs.map((diff) => diff.path))] }),
    };
}
//# sourceMappingURL=service.js.map