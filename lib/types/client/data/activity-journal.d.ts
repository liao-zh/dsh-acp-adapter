import { type RemoteStreamFactory } from '@deepseek-ai/dsh-api-gateway/client';
import type { AcpActivityView } from '../../contract/remote.ts';
import type { AcpRemoteLike } from './acp-remote.ts';
/** Client-side projection of the unfiltered, contiguous host journal. */
export declare class AcpActivityJournalStore {
    private readonly rows;
    private readonly rowsByAnchor;
    private cursor;
    replace(head: number, activities: readonly AcpActivityView[]): void;
    append(activity: AcpActivityView): void;
    values(ownerDshSessionId: string, promptAnchorMessageId: string): readonly AcpActivityView[];
    private anchorKey;
    private insert;
}
export type ActivityJournalFeedback = 'quiet' | 'initial-read-retrying' | 'reconnecting' | 'unavailable';
/** Only a recognized first-binding wait is silent; other read failures remain visible. */
export declare function activityJournalFeedback(input: {
    readonly ready: boolean;
    readonly error: unknown;
    readonly stableFailure: boolean;
    readonly retrying: boolean;
}): ActivityJournalFeedback;
/** One live ACP journal per DSH session. Nodes only subscribe to projections. */
export declare class AcpActivityJournalHub {
    private readonly remote;
    /** Root `ctx.remote`, not the mounted dshAcp namespace. */
    private readonly streamFactory;
    private readonly entries;
    constructor(remote: AcpRemoteLike, 
    /** Root `ctx.remote`, not the mounted dshAcp namespace. */
    streamFactory: RemoteStreamFactory);
    /** In-flight deduplication only; full details live with the expanded component. */
    private readonly detailRequests;
    detail(row: AcpActivityView): Promise<AcpActivityView>;
    acquire(sessionId: string, ownerDshSessionId: string, promptAnchorMessageId: string, listener: () => void): {
        readonly snapshot: () => readonly AcpActivityView[];
        readonly ready: () => boolean;
        readonly error: () => unknown;
        readonly canRetry: () => boolean;
        readonly retrying: () => boolean;
        readonly loading: () => boolean;
        readonly feedback: () => ActivityJournalFeedback;
        readonly retry: () => void;
        readonly release: () => void;
    };
    private createEntry;
    /**
     * The conversation node can mount before the Agent startup commits its
     * durable ACP binding. Retry transient open and terminal read failures for
     * as long as a node subscribes; the delay is bounded, the retry count is not.
     * Carrier reconnect remains owned by DSH's RemoteJournalStream.
     */
    private startEntry;
    private noteFailure;
    private terminalFailure;
    private notifyActivities;
    private notifyAll;
    private anchorKey;
}
//# sourceMappingURL=activity-journal.d.ts.map