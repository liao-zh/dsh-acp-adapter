const MAX_QUESTIONS = 8;
const MAX_OPTIONS = 16;
const MAX_TEXT = 4_096;
function plain(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function bounded(value) {
    if (typeof value !== 'string')
        return undefined;
    const text = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
    if (text.length === 0)
        return undefined;
    return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}
/** Whether a permission request is Qwen's question tool (never an approval). */
export function isQwenUserQuestion(params) {
    const meta = params.toolCall._meta;
    return plain(meta) && (meta.qwenInteractionKind === 'user_question' || meta.toolName === 'ask_user_question');
}
/** Strictly parse the questions; malformed input yields undefined (fail closed). */
export function qwenUserQuestions(params) {
    if (!isQwenUserQuestion(params))
        return undefined;
    const meta = params.toolCall._meta;
    const raw = params.toolCall.rawInput;
    const source = Array.isArray(meta.qwenQuestions)
        ? meta.qwenQuestions
        : plain(raw) && Array.isArray(raw.questions)
            ? raw.questions
            : undefined;
    if (source === undefined || source.length === 0 || source.length > MAX_QUESTIONS)
        return undefined;
    const questions = [];
    for (const item of source) {
        if (!plain(item))
            return undefined;
        const question = bounded(item.question);
        if (question === undefined || !Array.isArray(item.options) || item.options.length > MAX_OPTIONS)
            return undefined;
        const seen = new Set();
        const options = [];
        for (const option of item.options) {
            if (!plain(option))
                return undefined;
            const label = bounded(option.label);
            // DSH returns the selected label; duplicates would make the answer ambiguous.
            if (label === undefined || seen.has(label))
                return undefined;
            seen.add(label);
            const description = bounded(option.description);
            options.push({ label, ...(description === undefined ? {} : { description }) });
        }
        const header = bounded(item.header);
        questions.push({
            question,
            multiSelect: item.multiSelect === true,
            options,
            ...(header === undefined ? {} : { header }),
        });
    }
    return questions;
}
/** Encode one native answer the way Qwen's own TUI does. */
export function encodeQwenAnswer(question, answer) {
    const custom = answer.custom?.trim();
    const known = answer.selected.filter((label) => question.options.some((option) => option.label === label));
    const parts = question.multiSelect
        ? [...known, ...(custom ? [custom] : [])]
        : [known[0] ?? custom].filter((v) => v !== undefined && v.length > 0);
    return parts.length === 0 ? undefined : parts.join(', ');
}
/**
 * Ask through the native DSH question card and answer Qwen with `answers`.
 * Cancel/failure answers `cancelled`, which Qwen reports as a declined question.
 */
export function createQwenQuestionHandler(deps) {
    return async (params, signal) => {
        const cancelled = { outcome: { outcome: 'cancelled' } };
        const questions = qwenUserQuestions(params);
        const submit = params.options.find((option) => option.optionId === 'proceed_once') ??
            params.options.find((option) => option.kind === 'allow_once');
        if (questions === undefined || submit === undefined || deps.userQuestions === undefined || signal?.aborted === true)
            return cancelled;
        const agent = deps.getAgent();
        if (agent === undefined)
            return cancelled;
        try {
            const reply = await deps.userQuestions.ask({
                agent,
                questions: questions.map((question, index) => ({
                    id: `qwen-question:${String(index)}`,
                    question: question.question,
                    ...(question.header === undefined ? {} : { header: question.header }),
                    options: question.options.map((option) => ({
                        label: option.label,
                        ...(option.description === undefined ? {} : { description: option.description }),
                    })),
                    ...(question.multiSelect ? { multiSelect: true } : {}),
                })),
                ...(signal === undefined ? {} : { signal }),
            });
            if (signal?.aborted)
                return cancelled;
            const answers = {};
            for (const [index, question] of questions.entries()) {
                const item = reply.answers.find((candidate) => candidate.id === `qwen-question:${String(index)}`);
                const value = item === undefined ? undefined : encodeQwenAnswer(question, item);
                if (value !== undefined)
                    answers[String(index)] = value;
            }
            if (Object.keys(answers).length === 0)
                return cancelled;
            return { outcome: { outcome: 'selected', optionId: submit.optionId }, answers };
        }
        catch (error) {
            deps.log?.(`dsh-acp Qwen question cancelled: ${error instanceof Error ? error.message : String(error)}`);
            return cancelled;
        }
    };
}
//# sourceMappingURL=qwen-question.js.map