import type { ReactNode } from 'react';
import type { PropsLocale, PropsRuntime, HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { AcpApprovalChildView } from '../data/acp-remote.ts';
import { teamApproval } from './team-approval-actions.ts';
export interface AcpTeamApprovalActions {
    readonly status: HostObservable<SessionStatusSnapshot>;
    loadChildren(sessionId: SessionId): Promise<readonly AcpApprovalChildView[]>;
    isCurrent(sessionId: SessionId): boolean;
    openMember(parent: SessionId, child: AcpApprovalChildView): Promise<void>;
    resolveReason(reason: NonNullable<ReturnType<typeof teamApproval>>['displayReason']): string | undefined;
}
/** Present and answer the original member-owned carriers without changing the active conversation. */
export declare function AcpTeamApprovals({ sessionId, useSessions, t, status, loadChildren, openMember, isCurrent, resolveReason, }: PropsRuntime<'conversation.input.dock'> & PropsLocale<'acpActivity'> & AcpTeamApprovalActions): ReactNode;
//# sourceMappingURL=AcpTeamApprovals.d.ts.map