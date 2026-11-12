/** Pure, prompt-scoped reducer for ACP tool_call patches. */
export type AcpToolCallStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AcpToolCallPatchStatus = AcpToolCallStatus | 'in_progress';
export interface AcpToolCallPatch {
    readonly callId: string;
    readonly title?: string | null;
    readonly name?: string | null;
    readonly kind?: string | null;
    readonly rawInput?: unknown;
    readonly rawOutput?: unknown;
    readonly locations?: readonly unknown[] | null;
    readonly content?: readonly unknown[] | null;
    readonly status?: AcpToolCallPatchStatus | null;
}
export interface AcpToolCallCancellationContext {
    /** True only when the caller's external Stop signal was already aborted. */
    readonly externalSignalAborted?: boolean;
}
export interface AcpToolCallSnapshot extends AcpToolCallPatch {
    readonly status: AcpToolCallStatus;
    /** Original provider status when an external Stop caused a running call to fail. */
    readonly providerStatus?: 'failed';
}
/** A bounded-in-scope reducer: one instance belongs to one DSH turn. */
export declare class AcpToolCallReducer {
    private readonly calls;
    apply(patch: AcpToolCallPatch, context?: AcpToolCallCancellationContext): AcpToolCallSnapshot;
}
//# sourceMappingURL=tool-call-reducer.d.ts.map