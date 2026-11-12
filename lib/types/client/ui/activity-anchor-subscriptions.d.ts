import type { AcpActivityJournalHub } from '../data/activity-journal.ts';
type Hub = Pick<AcpActivityJournalHub, 'acquire'>;
type Handle = ReturnType<AcpActivityJournalHub['acquire']>;
export interface ActivityAnchorSubscription {
    readonly key: string;
    readonly ownerDshSessionId: string;
    readonly promptAnchorMessageId: string;
}
/** Retain unchanged per-anchor leases when the chat gains or loses markers. */
export declare class ActivityAnchorSubscriptions {
    private hub;
    private sessionId;
    private scope;
    private readonly leases;
    private onChange;
    reconcile(hub: Hub, sessionId: string, scope: unknown, desired: readonly ActivityAnchorSubscription[], onChange: (key: string, handle: Handle) => void): void;
    dispose(): void;
    private releaseAll;
}
export {};
//# sourceMappingURL=activity-anchor-subscriptions.d.ts.map