/** A Host-proven control reply. It records non-execution, never tool success. */
export interface AcpHostToolControlOutcome {
    readonly source: 'dsh-tool-bridge';
    readonly kind: 'deferred-team-message';
    readonly dshSessionId: string;
    readonly toolCallId: string;
    readonly tool: 'wait_agent';
    readonly executed: false;
}
/** Only the Host projection writes this field; provider metadata is not copied into it. */
export declare function activityHostToolControlOutcome(detail: unknown, row: {
    readonly ownerDshSessionId: string;
    readonly promptAnchorMessageId: string;
    readonly activityId: string;
    readonly status: string;
}): AcpHostToolControlOutcome | undefined;
//# sourceMappingURL=tool-control-outcome.d.ts.map