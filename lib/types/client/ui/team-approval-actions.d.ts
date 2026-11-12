import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SessionPendingInteractionBase, SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client';
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client';
/** Cached lineage only selects candidates; Host runtime ownership still authorizes every action. */
export declare function pendingChildCandidates(parent: SessionId, summaries: Readonly<Record<SessionId, Pick<SessionSummary, 'parentId' | 'origin'>>>, snapshot: SessionStatusSnapshot, readOnly?: ReadonlySet<SessionId>): SessionId[];
export declare function isStableTeamMemberReadError(error: unknown): boolean;
/** Retry only the read while its captured session/request remains live. */
export declare function readTeamMembersUntilAvailable<T>(sessionId: SessionId, loadMembers: (sessionId: SessionId) => Promise<readonly T[]>, active: () => boolean, options?: {
    readonly signal?: AbortSignal;
    readonly onAttempt?: () => void;
    readonly onFailure?: () => void;
}): Promise<readonly T[] | undefined>;
/** Structural subsets of the host's public pending carriers; no second approval broker. */
export interface TeamApproval extends SessionPendingInteractionBase {
    readonly kind: 'approval';
    readonly reason?: string;
    readonly toolName: string;
    readonly answerable?: boolean;
    readonly displayReason?: {
        readonly en: string;
        readonly [locale: string]: string;
    };
    answer(outcome: 'allowed-once' | 'rejected'): Promise<void>;
}
export declare function teamApproval(value: SessionPendingInteractionBase): TeamApproval | undefined;
/** Settle only the captured, still-current requests. New arrivals never join a batch. */
export declare function answerTeamRequests(requests: readonly {
    pending: SessionPendingInteractionBase;
    answer: () => Promise<void>;
}[], current: () => SessionStatusSnapshot, allowedMembers: ReadonlySet<SessionId>, active: () => boolean, inFlight: Set<SessionPendingInteractionBase>): Promise<number>;
//# sourceMappingURL=team-approval-actions.d.ts.map