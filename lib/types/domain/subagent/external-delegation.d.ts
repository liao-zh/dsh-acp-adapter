/** Provider-specific ACP delegation evidence normalized without creating UI or DSH sessions. */
export type ExternalDelegationProfileKind = 'devin' | 'claude' | 'kimi' | 'codex' | string;
export interface ExternalDelegationObservation {
    readonly profileKind: ExternalDelegationProfileKind;
    readonly vendorDelegationKey: string;
    readonly sourceToolCallId?: string;
    readonly vendorChildId?: string;
    readonly label: string;
    readonly task: {
        readonly text: string;
        readonly source: 'structured-tool-input' | 'vendor-meta';
    };
    readonly result: {
        readonly text: string;
        readonly source: 'verbatim-child-final' | 'agent-summary' | 'tool-result';
        readonly completeness: 'final-output' | 'summary';
    };
    readonly status: 'completed' | 'failed' | 'cancelled';
    readonly model?: {
        readonly id: string;
        readonly source: 'agent-structured-live';
    };
    readonly usage?: {
        readonly inputTokens?: number;
        readonly outputTokens?: number;
        readonly cacheReadTokens?: number;
        readonly cacheWriteTokens?: number;
        readonly totalTokens?: number;
        readonly source: 'agent-structured-live';
    };
    readonly timing: {
        readonly observedStartedAt: number;
        readonly observedCompletedAt: number;
        readonly agentReportedDurationMs?: number;
        readonly source: 'client-observed' | 'agent-structured-live' | 'mixed';
    };
    /** Only observations whose identity contract has passed its product gate may be projected. */
    readonly projectionEligible: boolean;
}
/** Small read-only fact for the originating tool activity. It never identifies
 * a DSH child session and deliberately excludes child output. */
export interface ExternalDelegationLiveFact {
    readonly profileKind: ExternalDelegationProfileKind;
    readonly vendorDelegationKey: string;
    readonly vendorChildId?: string;
    readonly sourceToolCallId?: string;
    readonly label: string;
    readonly status: 'running' | 'completed' | 'failed' | 'cancelled' | 'unfinished';
    readonly observedStartedAt: number;
    readonly observedAt: number;
    readonly sourceToolStatus?: 'completed' | 'failed' | 'cancelled';
}
export declare const EXTERNAL_CHILD_RESULT_PREVIEW_LIMIT = 4000;
export declare const EXTERNAL_DELEGATION_PENDING_LIMIT = 64;
/** Stateful live-frame normalizer. Load/replay frames must never be fed here. */
export declare class ExternalDelegationNormalizer {
    readonly profileKind: ExternalDelegationProfileKind;
    private readonly pending;
    constructor(profileKind: ExternalDelegationProfileKind);
    /** A bounded snapshot keyed by the exact origin tool call. */
    liveForToolCall(toolCallId: string): readonly ExternalDelegationLiveFact[];
    /** A tool ending does not prove that its child ended. Resolve the live row
     * as unfinished while preserving the tool's own independent terminal state.
     * Keep the bounded pending identity until the child reports its own terminal
     * state or the parent prompt ends; a launcher can return before its child. */
    resolveToolCall(toolCallId: string, sourceToolStatus: 'completed' | 'failed' | 'cancelled', observedAt: number): readonly ExternalDelegationLiveFact[];
    /** The parent prompt can end while an external child is still running. Keep
     * that uncertainty explicit and release the turn-local tracker. */
    finishPrompt(observedAt: number): readonly ExternalDelegationLiveFact[];
    private liveFact;
    private track;
    /** Normalize one complete notification. Claude's negotiated native child
     * lifecycle uses the notification session id to route child transcript
     * updates, so update-only normalization cannot represent it truthfully. */
    acceptNotification(notificationValue: unknown, observedAt: number): ExternalDelegationObservation | undefined;
    accept(updateValue: unknown, observedAt: number): ExternalDelegationObservation | undefined;
    private acceptDevin;
    private acceptClaude;
    private acceptKimi;
}
//# sourceMappingURL=external-delegation.d.ts.map