/**
 * Transactional handoff between DSH execution backends.
 *
 * This module deliberately has no DSH settings or UI dependency.  The stock
 * session controller remains the authority for model selection: restoring the
 * source calls `session.selectModel(source)`, and selecting the destination
 * calls the same official operation after the destination exists.  That gives
 * the host its normal "selection becomes default" semantics without a second
 * plugin-owned default store.
 */
/** Client-safe model selection shape; intentionally independent of the legacy picker. */
export interface CrossBackendModelSelection {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
}
export interface CrossBackendLocation {
    readonly workspaceId?: string;
    readonly cwd?: string;
}
export interface CrossBackendTicket {
    readonly key: string;
    readonly sourceSessionId: string;
    readonly sourceSelection: CrossBackendModelSelection | undefined;
    readonly targetSelection: CrossBackendModelSelection;
    readonly location: CrossBackendLocation;
    readonly label?: string;
    /** The additive observer already compensated the stock picker's source
     * mutation before showing its confirmation UI. */
    readonly sourceAlreadyRestored?: true;
}
export type CrossBackendPhase = 'restore-source' | 'create-destination' | 'select-destination' | 'open-destination' | 'completed';
export interface CrossBackendFailure {
    readonly phase: CrossBackendPhase;
    readonly message: string;
    readonly destinationSessionId?: string;
}
export type CrossBackendResult = {
    readonly ok: true;
    readonly destinationSessionId: string;
} | {
    readonly ok: false;
    readonly failure: CrossBackendFailure;
};
export interface CrossBackendCreateResult {
    /** The host published the session even when workspace attachment failed. */
    readonly published: boolean;
    readonly message?: string;
}
export interface CrossBackendOperationResult {
    readonly ok: boolean;
    readonly message?: string;
}
export interface CrossBackendOperations {
    restoreSource(selection: CrossBackendModelSelection): Promise<CrossBackendOperationResult>;
    createDestination(input: {
        sessionId: string;
        location: CrossBackendLocation;
    }): Promise<CrossBackendCreateResult>;
    selectDestination(sessionId: string, selection: CrossBackendModelSelection): Promise<CrossBackendOperationResult>;
    openDestination(sessionId: string): Promise<CrossBackendOperationResult>;
}
/**
 * Resolves the only locations that are truthful for a new session.  Workspace
 * membership wins over cwd because it preserves DSH's grouping semantics.
 */
export declare function resolveCrossBackendLocation(sessionId: string, workspaces: readonly {
    workspaceId: string;
    sessionIds: readonly string[];
}[], cwd: string | undefined): CrossBackendLocation | undefined;
/**
 * Small stateful coordinator.  A ticket key identifies one user decision;
 * retries reuse its preallocated destination id and skip completed phases.
 * No phase after destination selection writes a separate default: the official
 * destination `selectModel` call is the sole default-producing operation.
 */
export declare class CrossBackendTransactionController {
    private readonly states;
    private stateFor;
    confirm(ticket: CrossBackendTicket, operations: CrossBackendOperations): Promise<CrossBackendResult>;
    /** Cancel restores the source only; it never creates or opens a destination. */
    cancel(ticket: CrossBackendTicket, operations: CrossBackendOperations): Promise<CrossBackendResult>;
    /** Explicitly discard a completed/failed transaction after the UI is done. */
    forget(key: string): void;
}
//# sourceMappingURL=cross-backend-controller.d.ts.map