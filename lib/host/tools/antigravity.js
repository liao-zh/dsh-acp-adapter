export function toPlainRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : undefined;
}
export function resolveAntigravityNativeTool(call) {
    const input = toPlainRecord(call.rawInput);
    // Exact displayed names win before any presentation-only inference. In
    // particular, an edit named explicitly by Antigravity stays an edit even if
    // its payload happens to include fields used by another presentation hint.
    if (call.name === 'bash')
        return 'bash';
    if (call.name === 'read' || call.name === 'view_file')
        return 'read';
    if (call.name === 'edit' ||
        call.name === 'client_edit_file' ||
        call.name === 'write_to_file' ||
        call.name === 'replace_file_content' ||
        call.name === 'multi_replace')
        return 'edit';
    if (call.name === 'ask_question')
        return 'ask_question';
    if (call.title === 'ask_question' || (input !== undefined && 'questions' in input)) {
        return 'ask_question';
    }
    if (call.kind === 'execute' || (input !== undefined && 'CommandLine' in input))
        return 'bash';
    if (call.kind === 'read' || (input !== undefined && 'AbsolutePath' in input))
        return 'read';
    if (call.kind === 'edit' || (input !== undefined && ('TargetFile' in input || 'TargetContent' in input)))
        return 'edit';
    return undefined;
}
function formatAnswers(answers) {
    if (!Array.isArray(answers))
        return undefined;
    return answers
        .map((entry, index) => {
        const a = toPlainRecord(entry);
        const selected = Array.isArray(a?.selected) ? a.selected.map(String) : [];
        const custom = typeof a?.custom === 'string' && a.custom.trim().length > 0 ? [a.custom.trim()] : [];
        const chosen = [...selected, ...custom].join(', ');
        return `A${index + 1}: ${chosen}`;
    })
        .join('\n');
}
export function formatAntigravityAskQuestionResult(result) {
    if (result == null)
        return '';
    if (typeof result === 'string') {
        try {
            const parsed = toPlainRecord(JSON.parse(result));
            if (parsed !== undefined)
                return formatQuestionResultRecord(parsed, result);
        }
        catch {
            return result;
        }
        return result;
    }
    if (typeof result !== 'object')
        return String(result);
    return formatQuestionResultRecord(result, '');
}
function formatQuestionResultRecord(record, fallback) {
    const hasError = record.isError === true || (record.error !== undefined && record.error !== null);
    const error = typeof record.error === 'string' ? record.error : toPlainRecord(record.error)?.message;
    const textBlocks = Array.isArray(record.content)
        ? record.content.flatMap((block) => {
            if (typeof block !== 'object' || block === null || block.type !== 'text' || typeof block.text !== 'string')
                return [];
            const rawText = block.text;
            if (hasError)
                return [rawText];
            try {
                const parsed = toPlainRecord(JSON.parse(rawText));
                if (parsed === undefined)
                    return [rawText];
                if (Object.keys(parsed).some((key) => !['answers', 'text', 'isError', 'error'].includes(key)))
                    return [rawText];
                const hasNestedError = parsed.isError === true || (parsed.error !== undefined && parsed.error !== null);
                if (hasNestedError) {
                    const nestedError = typeof parsed.error === 'string' ? parsed.error : toPlainRecord(parsed.error)?.message;
                    const details = [parsed.text, nestedError].filter((part) => typeof part === 'string' && part.length > 0);
                    return details.length === 0 ? [rawText] : details;
                }
                const answer = formatAnswers(parsed.answers);
                const nested = [answer, typeof parsed.text === 'string' ? parsed.text : undefined].filter((part) => part !== undefined && part.length > 0);
                return nested.length === 0 ? [rawText] : nested;
            }
            catch {
                return [rawText];
            }
        })
        : [];
    const visible = [
        ...(hasError ? [] : [formatAnswers(record.answers)]),
        typeof record.text === 'string' ? record.text : undefined,
        ...textBlocks,
        typeof error === 'string' ? error : undefined,
    ].filter((part) => part !== undefined && part.length > 0);
    return visible.length > 0 ? visible.join('\n') : fallback;
}
function firstString(record, keys) {
    if (record === undefined)
        return undefined;
    for (const key of keys) {
        const val = record[key];
        if (typeof val === 'string' && val.length > 0)
            return val;
    }
    return undefined;
}
function firstNumber(record, keys) {
    if (record === undefined)
        return undefined;
    for (const key of keys) {
        const val = record[key];
        if (typeof val === 'number')
            return val;
    }
    return undefined;
}
export function normalizeAntigravityPresentation(rawInput, rawOutput, content, name) {
    const input = toPlainRecord(rawInput);
    const output = toPlainRecord(rawOutput);
    let nextInput = rawInput;
    let nextOutput = rawOutput;
    let nextContent = content;
    let title;
    if (name === 'bash') {
        const command = firstString(input, ['command', 'CommandLine', 'command_line']);
        const cwd = firstString(input, ['cwd', 'Cwd', 'working_dir']);
        if (command !== undefined || cwd !== undefined) {
            nextInput = {
                ...(input ?? {}),
                ...(command !== undefined ? { command } : {}),
                ...(cwd !== undefined ? { cwd } : {}),
            };
        }
        if (command !== undefined && command.trim().length > 0) {
            title = command;
        }
        else {
            const outCommand = firstString(output, ['commandLine', 'command']);
            if (outCommand !== undefined && outCommand.trim().length > 0)
                title = outCommand;
        }
        const formatted_output = firstString(output, ['formatted_output', 'combinedOutput']);
        const exit_code = firstNumber(output, ['exit_code', 'exitCode']);
        if (formatted_output !== undefined || exit_code !== undefined) {
            nextOutput = {
                ...(output ?? {}),
                ...(formatted_output !== undefined ? { formatted_output } : {}),
                ...(exit_code !== undefined ? { exit_code, exitCode: exit_code } : {}),
            };
            if ((!Array.isArray(nextContent) || nextContent.length === 0) && formatted_output !== undefined) {
                nextContent = [{ type: 'content', content: { type: 'text', text: formatted_output } }];
            }
        }
    }
    else if (name === 'read') {
        const path = firstString(input, ['path', 'file_path', 'AbsolutePath', 'absolute_path']);
        if (path !== undefined) {
            nextInput = { ...(input ?? {}), path, file_path: path };
        }
    }
    else if (name === 'edit') {
        const path = firstString(input, ['path', 'file_path', 'TargetFile', 'target_file']);
        if (path !== undefined) {
            nextInput = { ...(input ?? {}), path, file_path: path };
        }
    }
    else if (name === 'ask_question') {
        if (output !== undefined && (!Array.isArray(nextContent) || nextContent.length === 0)) {
            const formatted = formatAntigravityAskQuestionResult(output);
            if (formatted.length > 0) {
                nextContent = [{ type: 'content', content: { type: 'text', text: formatted } }];
            }
        }
    }
    return {
        rawInput: nextInput,
        rawOutput: nextOutput,
        content: nextContent,
        ...(title !== undefined ? { title } : {}),
    };
}
//# sourceMappingURL=antigravity.js.map