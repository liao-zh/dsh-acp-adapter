export function executableOverrideEnvFor(runtime) {
    return runtime === 'claude' ? 'CLAUDE_CODE_EXECUTABLE' : runtime === 'antigravity' ? 'REFINED_AGY_ACP_BIN' : undefined;
}
/** These Agents advertise different reasoning choices after selecting each model. */
export function modelProbeOptions(runtime) {
    return {
        probeModelConfigOptions: runtime === 'devin' || runtime === 'kimi' || runtime === 'codex' || runtime === 'antigravity',
        probeModelConfigConcurrency: runtime === 'devin' ? 8 : 1,
    };
}
/** Opt into Claude's draft subagent notifications only for an explicitly bound runtime. */
export function sessionProtocolExtensions(runtime) {
    return { enableClaudeDraftSubagents: runtime === 'claude' };
}
/** Kimi may resume `high` as `on`; accept only the live Agent-confirmed equivalent.
 * All other values still require exact equality or normal option validation.
 */
export function reasoningRequestIsCurrent(runtime, option, requested) {
    if (option.currentValue === requested)
        return true;
    if (runtime !== 'kimi' || requested !== 'high' || option.currentValue !== 'on')
        return false;
    const values = new Set(option.options.flatMap((entry) => ('options' in entry ? entry.options : [entry])).map((entry) => entry.value));
    return values.has('on') && !values.has('high');
}
//# sourceMappingURL=agent-compatibility.js.map