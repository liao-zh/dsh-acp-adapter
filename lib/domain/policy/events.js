/**
 * ACP 审批与运行边界的 sidecar 审计载荷。
 * `asked`/`decided` 配对记录 ACP agent 的选项列表（经过有界脱敏）与最终决定。
 *
 * 另有 `degradation`（{@link AcpDegradationAuditData}）：tool result 内容降级
 * （非文本项按占位/摘要落盘或截断）的事实记录，每次降级一条。
 *
 * 当前事件 contract 支持 `ignorable` 扩展事件，但审计仍不是对话事件：把权限/文件诊断
 * 混入 session log 会改变事件序列、历史导出和前端投影，却没有用户可见收益。
 * 因此本模块只产出纯 payload，由 ./permissions.ts（kind `permission`）包成
 * sidecar entry 经 `AcpSidecar.append` 落盘；不会向 session log 写自定义事件。
 *
 * 两阶段保留可追溯审计：插件 ACP UI 的 `selectedOptionKind`/`decisionVia` 记录
 * 原始选项语义；旧 DSH 双按钮 fallback 无法精确对应时仍只选择 once-kind，
 * 绝不把一次选择升格为 always 类 optionId。`asked` 里的 optionId 保持精确，
 * 其余外部字段按持久化边界有界化。
 *
 * @module @zaimokuza/dsh-acp-adapter/domain/policy/events
 */
import { createHash } from 'node:crypto';
import { redactSecretText as redactCommonSecretText } from "../observability/redaction.js";
/** 审批审计 entry 在 sidecar 里的 `kind`（src/persistence/sidecar.ts entry 联合的判别值之一）。 */
export const ACP_PERMISSION_AUDIT_KIND = 'permission';
/** rawInput 审计摘要按字段名脱敏的 key 词表（命中键的值替换为 `<redacted>`，永不落盘）。 */
export const AUDIT_SECRET_KEY_PATTERN = /(?:token|secret|password|passwd|api[-_]?key|authorization|credential|private[-_]?key)/i;
/** rawInput 审计摘要的截断上限（单行可读性；与审批 reason 摘要同口径）。 */
export const RAW_INPUT_AUDIT_SUMMARY_MAX_CHARS = 300;
/** Bounds for ACP permission audit fields supplied by an external Agent. */
export const ACP_PERMISSION_AUDIT_OPTIONS_MAX = 32;
export const ACP_PERMISSION_AUDIT_FIELD_MAX_CHARS = 512;
/** 脱敏遍历界限：嵌套深度 / 数组条数 / 单字符串长度（防巨型 rawInput 放大审计体积）。 */
const REDACT_DEPTH_MAX = 6;
const REDACT_ARRAY_MAX = 32;
const REDACT_STRING_MAX = 200;
const SHELL_SECRET_VALUE = `(?:"[^"]*"|'[^']*'|[^\\s'"]+)`;
const SECRET_JSON_PROPERTY_PATTERN = new RegExp(`((?:["']?)(?:token|secret|password|passwd|api[-_]?key|authorization|credential|private[-_]?key)(?:["']?)\\s*[:=]\\s*)(?:"[^"]*"|'[^']*'|[^,\\s}\\]]+(?=\\s*[,}\\]]))`, 'gi');
const SECRET_ENV_ASSIGNMENT_PATTERN = new RegExp(`(\\b(?:[A-Za-z][A-Za-z0-9_-]*(?:token|secret|password|passwd|api[-_]?key|authorization|credential|private[-_]?key)[A-Za-z0-9_-]*|token|secret|password|passwd|api[-_]?key|authorization|credential|private[-_]?key)\\b)\\s*=\\s*${SHELL_SECRET_VALUE}`, 'gi');
const SECRET_OPTION_PATTERN = new RegExp(`(--?[A-Za-z0-9_-]*(?:token|secret|password|passwd|api[-_]?key|authorization|credential|private[-_]?key)[A-Za-z0-9_-]*)(?:\\s*=\\s*|\\s+)${SHELL_SECRET_VALUE}`, 'gi');
const SECRET_HEADER_PATTERN = new RegExp(`(\\b(?:authorization|proxy-authorization|x-api-key|api-key)\\b\\s*:\\s*(?:bearer\\s+)?)(?:"[^"]*"|'[^']*'|[^\\s'"]+)`, 'gi');
/**
 * 跨审计摘要与审批展示共用的 secret-text 脱敏规则。
 *
 * 对象字段由 {@link redactForAudit} 按 key 脱敏；但 command/header/env 等
 * 字符串内部仍可能携带 secret，因此这里也处理常见的文本形态。调用方
 * 必须在 raw input canonical hash 之外使用本函数，不能用脱敏值替代完整性哈希。
 */
export function redactSecretText(value) {
    return redactCommonSecretText(value)
        .replace(SECRET_HEADER_PATTERN, '$1<redacted>')
        .replace(SECRET_JSON_PROPERTY_PATTERN, '$1<redacted>')
        .replace(SECRET_ENV_ASSIGNMENT_PATTERN, '$1=<redacted>')
        .replace(SECRET_OPTION_PATTERN, '$1=<redacted>');
}
function isPlainObjectValue(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** 递归脱敏：secret 词表命中的键值换 `<redacted>`；深度/数组/字符串各有界。 */
function redactForAudit(value, depth) {
    if (depth > REDACT_DEPTH_MAX)
        return '…';
    if (typeof value === 'string') {
        const redacted = redactSecretText(value);
        return redacted.length > REDACT_STRING_MAX ? `${redacted.slice(0, REDACT_STRING_MAX)}…` : redacted;
    }
    if (Array.isArray(value)) {
        const items = value.slice(0, REDACT_ARRAY_MAX).map((item) => redactForAudit(item, depth + 1));
        if (value.length > REDACT_ARRAY_MAX)
            items.push(`… +${String(value.length - REDACT_ARRAY_MAX)} items`);
        return items;
    }
    if (isPlainObjectValue(value)) {
        const out = {};
        for (const key of Object.keys(value)) {
            out[key] = AUDIT_SECRET_KEY_PATTERN.test(key) ? '<redacted>' : redactForAudit(value[key], depth + 1);
        }
        return out;
    }
    return value;
}
function boundedAuditText(value, max = ACP_PERMISSION_AUDIT_FIELD_MAX_CHARS) {
    const sanitized = redactSecretText(value).replace(/[\u0000-\u001f\u007f]/g, ' ');
    return sanitized.length <= max ? sanitized : `${sanitized.slice(0, max - 1)}…`;
}
/** canonical JSON（对象键排序递归）：哈希与摘要的稳定输入（与生产者键序无关）。 */
function canonicalJson(value) {
    if (Array.isArray(value))
        return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
    if (isPlainObjectValue(value)) {
        const body = Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',');
        return `{${body}}`;
    }
    return JSON.stringify(value) ?? 'null';
}
/**
 * rawInput 的审计落盘形态：`hash` 是**原文** canonical JSON 的
 * sha256-16（完整性证据，不可逆、不含秘密字节）；`summary` 是**脱敏后**的
 * canonical 单行，超界截断并标注原始长度。summary 不含任何 secret 键的值。
 */
export function summarizeRawInputForAudit(rawInput) {
    const hash = createHash('sha256').update(canonicalJson(rawInput)).digest('hex').slice(0, 16);
    const redacted = canonicalJson(redactForAudit(rawInput, 0));
    const summary = redacted.length > RAW_INPUT_AUDIT_SUMMARY_MAX_CHARS
        ? `${redacted.slice(0, RAW_INPUT_AUDIT_SUMMARY_MAX_CHARS)}…(+${String(redacted.length - RAW_INPUT_AUDIT_SUMMARY_MAX_CHARS)} chars)`
        : redacted;
    return { summary, hash };
}
/** Copy only diagnostic facts; the inspected response can contain a capability option ID. */
export function createPermissionCheckAudit(check, agentSessionId, toolCallId) {
    return {
        phase: 'bridge',
        reason: check.reason,
        agentSessionId: boundedAuditText(agentSessionId),
        toolCallId: boundedAuditText(toolCallId),
        ...(check.toolName === undefined ? {} : { toolName: boundedAuditText(check.toolName) }),
        ...(check.identitySource === undefined ? {} : { identitySource: check.identitySource }),
        ...(check.structuredIdentityPresent === undefined
            ? {}
            : { structuredIdentityPresent: check.structuredIdentityPresent }),
        ...(check.titleMatchesCurrentTool === undefined ? {} : { titleMatchesCurrentTool: check.titleMatchesCurrentTool }),
    };
}
/**
 * Build the `asked` audit payload: a bounded, redacted record of the question
 * as the agent posed it. The option id remains exact because it is the ACP
 * response identity used to answer the request; labels and collection size
 * are bounded for durable storage.
 * @param init - the ACP permission request's identity and option list.
 * @returns the sidecar-ready `asked` payload.
 */
export function createPermissionAskedAudit(init) {
    const { toolCall } = init;
    const rawInput = toolCall.rawInput == null ? undefined : summarizeRawInputForAudit(toolCall.rawInput);
    const optionCount = init.options.length;
    const locationCount = toolCall.locations?.length ?? 0;
    return {
        phase: 'asked',
        requestId: init.requestId,
        agentSessionId: init.agentSessionId,
        toolCall: {
            toolCallId: boundedAuditText(toolCall.toolCallId),
            ...(toolCall.title == null ? {} : { title: boundedAuditText(toolCall.title, 200) }),
            ...(toolCall.kind == null ? {} : { kind: boundedAuditText(toolCall.kind, 64) }),
            ...(toolCall.locations == null
                ? {}
                : {
                    locations: toolCall.locations.slice(0, 4).map((location) => ({
                        path: boundedAuditText(location.path),
                        ...(location.line == null ? {} : { line: location.line }),
                    })),
                }),
            ...(rawInput === undefined ? {} : { rawInputSummary: rawInput.summary, rawInputHash: rawInput.hash }),
        },
        options: init.options.slice(0, ACP_PERMISSION_AUDIT_OPTIONS_MAX).map((option) => ({
            ...option,
            optionId: option.optionId,
            name: boundedAuditText(option.name, 200),
        })),
        optionCount,
        omittedOptionCount: Math.max(0, optionCount - ACP_PERMISSION_AUDIT_OPTIONS_MAX),
        locationCount,
        omittedLocationCount: Math.max(0, locationCount - 4),
    };
}
/**
 * Build the `decided` audit payload: the answer returned to the agent plus the
 * facts needed to audit why (approval outcome / fail-closed note).
 * @param init - the answered decision.
 * @returns the sidecar-ready `decided` payload.
 */
export function createPermissionDecidedAudit(init) {
    return {
        phase: 'decided',
        requestId: init.requestId,
        agentSessionId: init.agentSessionId,
        toolCallId: init.toolCallId,
        outcome: init.outcome,
        ...(init.optionId === undefined ? {} : { optionId: init.optionId }),
        ...(init.approvalOutcome === undefined ? {} : { approvalOutcome: init.approvalOutcome }),
        ...(init.selectedOptionKind === undefined ? {} : { selectedOptionKind: init.selectedOptionKind }),
        ...(init.decisionVia === undefined ? {} : { decisionVia: init.decisionVia }),
        ...(init.presentation === undefined
            ? {}
            : {
                presentation: {
                    rootSessionId: init.presentation.rootSessionId,
                    path: [...init.presentation.path],
                },
            }),
        ...(init.note === undefined ? {} : { note: init.note }),
    };
}
//# sourceMappingURL=events.js.map