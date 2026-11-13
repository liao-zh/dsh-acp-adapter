function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Only the Host projection writes this field; provider metadata is not copied into it. */
export function activityHostToolControlOutcome(detail, row) {
    if (!record(detail) || !record(detail.hostControlOutcome) || row.status !== 'failed')
        return undefined;
    const value = detail.hostControlOutcome;
    if (value.source !== 'dsh-tool-bridge' ||
        value.kind !== 'deferred-team-message' ||
        value.dshSessionId !== row.ownerDshSessionId ||
        value.tool !== 'wait_agent' ||
        detail.toolName !== 'wait_agent' ||
        value.executed !== false ||
        typeof value.toolCallId !== 'string' ||
        value.toolCallId.length === 0 ||
        row.activityId !== `${row.promptAnchorMessageId}:tool:${value.toolCallId}`)
        return undefined;
    return value;
}
//# sourceMappingURL=tool-control-outcome.js.map