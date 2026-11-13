/** Native ACP permission bridge through DSH's user-question surface. */
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { isAntigravityInteractionCall } from "./antigravity-question.js";
import { permissionCopy } from "./permission-copy.js";
import { ACP_PERMISSION_AUDIT_KIND, createPermissionAskedAudit, createPermissionDecidedAudit, redactSecretText, } from "./events.js";
export const ACP_PERMISSION_OPTIONS_MAX = 128;
export const ACP_PERMISSION_ID_MAX_BYTES = 512;
const dshTeamPresentation = Symbol('dsh-team-permission-presentation');
/**
 * Only the live DSH bridge may attach this presentation hint after resolving
 * its own tool definition. Wire metadata and cached display names cannot forge
 * the symbol. It grants no authority and is deliberately absent from JSON.
 */
export function withDshTeamPermissionPresentation(call, presentation) {
    return Object.defineProperty({ ...call }, dshTeamPresentation, { value: Object.freeze({ ...presentation }) });
}
function cancelled() {
    return { outcome: { outcome: 'cancelled' } };
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function assertBounds(toolCallId, options) {
    if (Buffer.byteLength(toolCallId, 'utf8') > ACP_PERMISSION_ID_MAX_BYTES)
        throw new Error('toolCallId exceeds ACP permission identity limit');
    if (options.length > ACP_PERMISSION_OPTIONS_MAX)
        throw new Error('ACP permission option count exceeds limit');
    const ids = new Set();
    for (const option of options) {
        if (option.optionId.length === 0 || ids.has(option.optionId))
            throw new Error('ACP permission optionId is empty or duplicated');
        if (Buffer.byteLength(option.optionId, 'utf8') > ACP_PERMISSION_ID_MAX_BYTES)
            throw new Error('optionId exceeds ACP permission identity limit');
        ids.add(option.optionId);
    }
}
function safeText(value, max = 180) {
    const clean = redactSecretText(value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
/**
 * Keep the operation the user is approving complete while preventing control
 * characters (notably terminal escape sequences) from acting on the native
 * question surface. Unlike audit summaries, approval text must not redact or
 * truncate command arguments: doing either would make the displayed operation
 * differ from the one the Agent asked to execute.
 */
function visibleCommand(value) {
    return value.replace(/[\r\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, (character) => {
        const code = character.charCodeAt(0);
        return `\\x${code.toString(16).padStart(2, '0')}`;
    });
}
const commandKeys = ['command', 'cmd', 'CommandLine', 'argv'];
function commandOf(tool) {
    if (typeof tool.rawInput === 'string')
        return tool.rawInput;
    return firstString(recordValue(tool.rawInput), commandKeys);
}
function markdownCodeBlock(value) {
    let longestFence = 0;
    for (const match of value.matchAll(/`+/g))
        longestFence = Math.max(longestFence, match[0].length);
    const fence = '`'.repeat(Math.max(3, longestFence + 1));
    return `${fence}\n${value}\n${fence}`;
}
function recordValue(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
function firstString(record, keys) {
    if (record === undefined)
        return undefined;
    for (const key of keys) {
        if (/(?:token|secret|password|passwd|api[-_]?key|authorization|credential|private[-_]?key)/i.test(key))
            continue;
        const value = record[key];
        if (typeof value === 'string' && value.trim() !== '')
            return value;
    }
    return undefined;
}
/** Keep both input and target facts; neither is a replacement for the other. */
function permissionInputDetail(tool) {
    let input = tool.rawInput;
    const command = tool.kind === 'execute' ? commandOf(tool) : undefined;
    if (command !== undefined) {
        const record = recordValue(input);
        if (record === undefined)
            input = undefined; // The string command is displayed separately.
        else {
            const commandKey = commandKeys.find((key) => record[key] === command);
            const remaining = Object.fromEntries(Object.entries(record).filter(([key]) => key !== commandKey));
            input = Object.keys(remaining).length === 0 ? undefined : remaining;
        }
    }
    const details = tool.locations === undefined
        ? input
        : input === undefined
            ? tool.locations
            : { rawInput: input, locations: tool.locations };
    if (details === undefined)
        return undefined;
    return visibleCommand(typeof details === 'string' ? details : JSON.stringify(details, null, 2));
}
function permissionQuestionDetail(tool, copy) {
    const parts = [];
    if (tool.kind === 'execute') {
        const command = commandOf(tool);
        parts.push(command === undefined ? copy.unknownCommand : `${copy.command}:\n\n${markdownCodeBlock(visibleCommand(command))}`);
    }
    const detail = permissionInputDetail(tool);
    if (detail !== undefined)
        parts.push(`${copy.details}:\n\n${markdownCodeBlock(detail)}`);
    return parts.length === 0 ? undefined : parts.join('\n\n');
}
/** Native approval owns localized chrome. Only Agent-supplied operation facts cross to its reason field. */
function nativePermissionReason(tool, copy) {
    const title = tool.title ?? tool.name ?? tool.kind ?? 'ACP';
    const command = tool.kind === 'execute' ? commandOf(tool) : undefined;
    const displayTitle = command !== undefined && title === command ? undefined : safeText(title);
    const input = recordValue(tool.rawInput);
    const description = tool.kind === 'execute' && typeof input?.description === 'string' ? input.description : undefined;
    // Execute descriptions are prose, while unknown fields remain complete input
    // evidence. Keep the original payload unchanged for questions and audit.
    const detailTool = description === undefined
        ? tool
        : { ...tool, rawInput: Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'description')) };
    return [
        displayTitle,
        description === undefined ? undefined : visibleCommand(description),
        command === undefined ? undefined : visibleCommand(command),
        permissionInputDetail(detailTool),
        tool.kind === 'execute' && command === undefined ? copy.unknownCommand : undefined,
    ]
        .filter((value) => value !== undefined)
        .join('\n');
}
/** Keep targets and unknown scope visible; verified Team task prose stays in raw-request details. */
function permissionQuestionFacts(tool, copy, profile) {
    const command = tool.kind === 'execute' ? commandOf(tool) : undefined;
    const title = tool.title ?? tool.name;
    const lines = [];
    if (typeof title === 'string' && title.trim() !== '' && title !== command)
        lines.push(visibleCommand(title));
    else if (command === undefined)
        lines.push(copy.actions[tool.kind ?? ''] ?? copy.restrictedOperation);
    if (tool.kind === 'execute') {
        lines.push(command === undefined ? copy.unknownCommand : `${copy.command}: ${visibleCommand(command)}`);
    }
    let input = tool.rawInput;
    const record = recordValue(input);
    if (record !== undefined) {
        const team = tool[dshTeamPresentation];
        const presented = new Set();
        if (tool.kind === 'execute' && typeof record.description === 'string') {
            lines.push(visibleCommand(record.description));
            presented.add('description');
        }
        const field = (key, label) => {
            const value = record[key];
            if (typeof value !== 'string' || value.trim() === '')
                return false;
            lines.push(`${label}: ${visibleCommand(value)}`);
            presented.add(key);
            return true;
        };
        if (team?.tool === 'spawn_teammate' && field('name', copy.member)) {
            field('description', copy.responsibility);
            if (!field('context', copy.context) && record.context === undefined)
                lines.push(`${copy.context}: fresh`);
            field('provider', copy.provider);
            field('model', copy.model);
            field('agent', copy.agent);
            if (team.workspace !== undefined)
                lines.push(`${copy.workspace}: ${visibleCommand(team.workspace)}`);
            if (typeof record.prompt === 'string')
                presented.add('prompt');
        }
        else if (team?.tool === 'send_message' && field('target', copy.recipient)) {
            if (typeof record.message === 'string')
                presented.add('message');
        }
        const commandKey = command === undefined ? undefined : commandKeys.find((key) => record[key] === command);
        const directory = typeof record.cwd === 'string' ? record.cwd : undefined;
        if (directory !== undefined)
            lines.push(`${copy.directory}: ${visibleCommand(directory)}`);
        if (profile === 'antigravity' && tool.kind === 'execute') {
            // Presentation normalization retains the wire fields beside command/cwd.
            // Only remove exact duplicates; conflicting values remain approval facts.
            if (command !== undefined && record.command === command && record.CommandLine === command)
                presented.add('CommandLine');
            if (directory !== undefined && directory.trim() !== '' && record.Cwd === directory)
                presented.add('Cwd');
            const wait = record.WaitMsBeforeAsync;
            // Antigravity's run_command schema defines a synchronous wait before
            // backgrounding, up to 10000 ms; this is not a command execution deadline.
            if (typeof wait === 'number' && Number.isInteger(wait) && wait >= 0 && wait <= 10_000) {
                lines.push(copy.backgroundWait(wait));
                presented.add('WaitMsBeforeAsync');
            }
        }
        const fileContent = typeof record.file_path === 'string' && typeof record.content === 'string';
        if (fileContent) {
            lines.push(`${copy.filePath}: ${visibleCommand(record.file_path)}`);
            lines.push(`${copy.content}: ${visibleCommand(record.content)}`);
        }
        const remaining = Object.fromEntries(Object.entries(record).filter(([key]) => key !== commandKey &&
            !presented.has(key) &&
            !(key === 'cwd' && directory !== undefined) &&
            !(fileContent && (key === 'file_path' || key === 'content'))));
        input = Object.keys(remaining).length === 0 ? undefined : remaining;
    }
    else if (command !== undefined) {
        input = undefined;
    }
    if (tool.locations != null && tool.locations.length > 0) {
        lines.push(`${copy.locations}: ${tool.locations
            .map((location) => visibleCommand(`${location.path}${location.line == null ? '' : `:${location.line}`}`))
            .join('\n')}`);
    }
    // Unknown input can itself be the requested scope (for example Codex's
    // additional sandbox permissions). Never move it exclusively into a disclosure.
    if (input !== undefined)
        lines.push(`${copy.input}: ${visibleCommand(typeof input === 'string' ? input : JSON.stringify(input, null, 2))}`);
    return lines.join('\n');
}
function permissionRequestDetail(tool) {
    if (tool.rawInput === undefined && tool.locations === undefined)
        return undefined;
    return markdownCodeBlock(visibleCommand(JSON.stringify({ rawInput: tool.rawInput, locations: tool.locations }, null, 2)));
}
function requestId() {
    return `dsh-acp-permission-${randomUUID()}`;
}
/** Render names as user-facing text while keeping the response map exact. */
function optionLabels(options, copy) {
    // Option names can specify different authority at their end. Keep the complete
    // choice; audit redaction and display truncation must not erase that scope.
    const names = options.map((option) => visibleCommand(option.name).trim() || copy.agentOption);
    const counts = new Map();
    for (const name of names)
        counts.set(name, (counts.get(name) ?? 0) + 1);
    const seen = new Map();
    const labels = names.map((name) => {
        if (counts.get(name) === 1)
            return name;
        const ordinal = (seen.get(name) ?? 0) + 1;
        seen.set(name, ordinal);
        return `${name} · ${copy.option(ordinal)}`;
    });
    // An Agent name can equal another option's generated disambiguator. Prefix
    // the complete set on collision so every response still maps to one option.
    return new Set(labels).size === labels.length ? labels : labels.map((label, index) => `${index + 1}. ${label}`);
}
/** The native binary card must not discard an offered decision or authorization scope. */
function binaryApprovalOptions(options) {
    const allows = options.filter((option) => option.kind === 'allow_once');
    const rejects = options.filter((option) => option.kind === 'reject_once');
    if (allows.length !== 1 || rejects.length > 1 || options.length !== allows.length + rejects.length)
        return undefined;
    const names = options.map((option) => visibleCommand(option.name).trim());
    if (names.some((name) => name === '') || new Set(names).size !== names.length)
        return undefined;
    return { allow: allows[0], ...(rejects[0] === undefined ? {} : { reject: rejects[0] }) };
}
export function createAcpNativePermissionHandler(deps) {
    const copy = permissionCopy(deps.locale);
    return async (params, signal) => {
        const id = requestId();
        const nativeInteractionCall = deps.nativeQuestionProfile === 'antigravity' && isAntigravityInteractionCall(params.toolCall);
        const useExternalPolicy = !nativeInteractionCall &&
            deps.permissionProfile !== 'devin' &&
            deps.approval?.evaluateExternal !== undefined &&
            binaryApprovalOptions(params.options) === undefined;
        let agent = useExternalPolicy ? deps.getAgent() : undefined;
        try {
            assertBounds(params.toolCall.toolCallId, params.options);
            if (useExternalPolicy) {
                // Keep the policy facts, audit and eventual option mapping on the same
                // snapshot, including while the first durable append is pending.
                const team = params.toolCall[dshTeamPresentation];
                params = structuredClone(params);
                if (team !== undefined)
                    params.toolCall = withDshTeamPermissionPresentation(params.toolCall, team);
            }
        }
        catch (error) {
            deps.log?.(`dsh-acp native permission rejected by bounds: ${errorMessage(error)}`);
            return cancelled();
        }
        const append = async (data) => {
            if (deps.audit === undefined)
                return true;
            try {
                await deps.audit.append({ kind: ACP_PERMISSION_AUDIT_KIND, time: deps.now?.() ?? Date.now(), data });
                return true;
            }
            catch (error) {
                deps.log?.(`dsh-acp native permission audit failed: ${errorMessage(error)}`);
                return false;
            }
        };
        if (!(await append(createPermissionAskedAudit({
            requestId: id,
            agentSessionId: params.sessionId,
            toolCall: params.toolCall,
            options: params.options,
        }))))
            return cancelled();
        let presentation;
        const decide = async (init, decisionVia = 'native-question') => {
            const ok = await append(createPermissionDecidedAudit({
                requestId: id,
                agentSessionId: params.sessionId,
                toolCallId: params.toolCall.toolCallId,
                ...init,
                decisionVia,
                ...(presentation === undefined ? {} : { presentation }),
            }));
            if (!ok || init.outcome === 'cancelled' || (useExternalPolicy && (signal?.aborted || deps.getAgent() !== agent)))
                return cancelled();
            return { outcome: { outcome: 'selected', optionId: init.optionId } };
        };
        if (signal !== undefined && signal.aborted)
            return decide({ outcome: 'cancelled', note: 'cancelled' });
        if (!useExternalPolicy)
            agent = deps.getAgent();
        if (agent === undefined || (useExternalPolicy && deps.getAgent() !== agent))
            return decide({ outcome: 'cancelled', note: 'agent-unavailable' });
        const binary = binaryApprovalOptions(params.options);
        const nativeInteractionQuestion = nativeInteractionCall &&
            params.options.length > 0 &&
            params.options.every((option) => option.kind === 'allow_once');
        if (useExternalPolicy) {
            let outcome;
            try {
                outcome = await deps.approval.evaluateExternal({
                    agent,
                    requestId: id,
                    profile: deps.permissionProfile ?? 'generic',
                    params,
                    ...(signal === undefined ? {} : { signal }),
                });
            }
            catch {
                outcome = 'failed';
            }
            // Defensive normalization also covers non-TypeScript policy integrations.
            if (!['allow-once', 'deny-once', 'not-applicable', 'cancelled', 'failed'].includes(outcome))
                outcome = 'failed';
            if (signal?.aborted || deps.getAgent() !== agent)
                outcome = 'cancelled';
            if (outcome === 'failed') {
                try {
                    await deps.onUnavailable?.({
                        code: 'ACP_PERMISSION_POLICY_UNAVAILABLE',
                        message: copy.permissionPolicyUnavailable,
                    });
                }
                catch {
                    deps.log?.('dsh-acp permission policy failure reporting unavailable');
                }
            }
            if (outcome === 'cancelled' || outcome === 'failed')
                return decide({ outcome: 'cancelled', note: `policy-${outcome}` }, 'external-policy');
            if (outcome === 'allow-once' || outcome === 'deny-once') {
                const kind = outcome === 'allow-once' ? 'allow_once' : 'reject_once';
                const options = params.options.filter((option) => option.kind === kind);
                if (options.length === 1)
                    return decide({ outcome: 'selected', optionId: options[0].optionId, selectedOptionKind: kind }, 'external-policy');
                // An ambiguous allow needs the full human choice; an unrepresentable
                // denial must never offer a later human grant as a fallback.
                if (outcome === 'deny-once')
                    return decide({ outcome: 'cancelled', note: 'policy-deny-unrepresentable' }, 'external-policy');
            }
        }
        if (!nativeInteractionQuestion && deps.approval !== undefined && binary !== undefined) {
            try {
                const commandLine = params.toolCall.kind === 'execute' ? commandOf(params.toolCall) : undefined;
                const outcome = await deps.approval.request({
                    agent,
                    toolName: params.toolCall.name ?? params.toolCall.kind ?? copy.acpTool,
                    callId: params.toolCall.toolCallId,
                    ...(params.toolCall.rawInput === undefined ? {} : { toolArgs: params.toolCall.rawInput }),
                    ...(commandLine === undefined ? {} : { commandLine }),
                    reason: [
                        nativePermissionReason(params.toolCall, copy),
                        `${copy.allowOnce}: ${visibleCommand(binary.allow.name)}`,
                        ...(binary.reject === undefined ? [] : [`${copy.rejectOnce}: ${visibleCommand(binary.reject.name)}`]),
                    ].join('\n'),
                    ...(signal === undefined ? {} : { signal }),
                });
                if (outcome === 'allowed-once')
                    return decide({ outcome: 'selected', optionId: binary.allow.optionId, selectedOptionKind: binary.allow.kind }, 'native-approval');
                if (outcome === 'rejected' && binary.reject !== undefined)
                    return decide({ outcome: 'selected', optionId: binary.reject.optionId, selectedOptionKind: binary.reject.kind }, 'native-approval');
                return decide({ outcome: 'cancelled', note: outcome }, 'native-approval');
            }
            catch (error) {
                deps.log?.(`dsh-acp native approval unavailable: ${errorMessage(error)}`);
                // Continue to the generic native question only when it is available;
                // this preserves uncommon ACP option vocabularies without reviving a
                // plugin-owned permission surface.
            }
        }
        if (nativeInteractionCall && !nativeInteractionQuestion && binary !== undefined)
            return decide({ outcome: 'cancelled', note: 'native-approval-unavailable' }, 'native-approval');
        const questions = nativeInteractionCall ? deps.userQuestions : (deps.permissionQuestions ?? deps.userQuestions);
        if (questions === undefined)
            return decide({ outcome: 'cancelled', note: 'question-service-unavailable' });
        const questionId = `acp-permission:${id}`;
        const renderedLabels = optionLabels(params.options, copy);
        const labels = new Map(renderedLabels.map((label, index) => [label, params.options[index]]));
        try {
            const detail = nativeInteractionQuestion
                ? permissionQuestionDetail(params.toolCall, copy)
                : permissionRequestDetail(params.toolCall);
            const questionRequest = {
                agent,
                questions: [
                    {
                        id: questionId,
                        question: nativeInteractionQuestion
                            ? params.toolCall.title
                            : permissionQuestionFacts(params.toolCall, copy, deps.nativeQuestionProfile),
                        ...(nativeInteractionQuestion ? {} : { header: copy.permission }),
                        ...(detail === undefined ? {} : { detail }),
                        options: renderedLabels.map((label) => ({ label })),
                    },
                ],
                ...(signal === undefined ? {} : { signal }),
            };
            const answer = questions === deps.permissionQuestions
                ? await deps.permissionQuestions.ask(questionRequest, (value) => {
                    presentation = value;
                })
                : await questions.ask(questionRequest);
            if (signal !== undefined && signal.aborted)
                return decide({ outcome: 'cancelled', note: 'cancelled' });
            const selected = answer.answers.find((item) => item.id === questionId);
            if (selected === undefined || selected.custom !== undefined || selected.selected.length !== 1)
                return decide({
                    outcome: 'cancelled',
                    note: selected?.custom === undefined ? 'cancelled' : 'custom-option-unsupported',
                });
            const option = labels.get(selected.selected[0]);
            if (option === undefined)
                return decide({ outcome: 'cancelled', note: 'invalid-option-id' });
            return decide({ outcome: 'selected', optionId: option.optionId, selectedOptionKind: option.kind });
        }
        catch (error) {
            if (signal?.aborted)
                return decide({ outcome: 'cancelled', note: 'cancelled' });
            if (recordValue(error)?.code === 'DELEGATED_CALLER') {
                try {
                    await deps.onUnavailable?.({
                        code: 'ACP_DELEGATED_QUESTION_UNAVAILABLE',
                        message: nativeInteractionQuestion
                            ? copy.delegatedQuestionUnavailable
                            : copy.delegatedPermissionUnavailable,
                    });
                }
                catch (reportError) {
                    deps.log?.(`dsh-acp unavailable permission reporting failed: ${errorMessage(reportError)}`);
                }
                return decide({ outcome: 'cancelled', note: 'delegated-question-unavailable' });
            }
            deps.log?.(`dsh-acp native permission question cancelled: ${errorMessage(error)}`);
            return decide({ outcome: 'cancelled', note: 'question-error' });
        }
    };
}
//# sourceMappingURL=permissions.js.map