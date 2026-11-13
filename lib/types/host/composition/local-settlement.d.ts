export type AcpLocalSettlementStatus = 'saving-results' | 'storage-error';
export declare class AcpLocalSettlementError extends Error {
    readonly code = "ACP_LOCAL_SETTLEMENT_FAILED";
    constructor(cause?: unknown);
}
/** Register the current profile sink. Replaced owners cannot unregister a newer adapter. */
export declare function registerLocalSettlementSink(root: object, profileId: string, ownerToken: object, sink: object): () => Promise<void>;
/** Run a known-terminal response's local writes once, retaining failed work by Host/session. */
export declare function settleLocally<TSink extends object>(root: object, sessionId: string, key: string, task: (sink: TSink) => Promise<void>, observerOwner: object, onStatusChange: () => void, sink: TSink, profileId?: string): Promise<void>;
/** Retry this DSH session's retained local writes before its next remote prompt. */
export declare function settlePendingLocally<TSink extends object>(root: object, sessionId: string, sink: TSink, profileId?: string): Promise<void>;
/** Wait for an existing settlement to finish without starting or cancelling a batch. */
export declare function waitForLocalSettlement(root: object, sessionId: string, signal?: AbortSignal): Promise<void>;
export declare function localSettlementStatus(root: object, sessionId: string): AcpLocalSettlementStatus | undefined;
/** Let another provider adapter for the same Host/session refresh its status view. */
export declare function observeLocalSettlement(root: object, sessionId: string, owner: object, onStatusChange: () => void): void;
//# sourceMappingURL=local-settlement.d.ts.map