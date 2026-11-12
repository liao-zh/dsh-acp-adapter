import type { ReactNode } from 'react';
import type { GlobalStandardProps, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { AcpRemoteLike, AcpTeamMemberModelsView, AcpTeamMemberView } from '../data/acp-remote.ts';
import type { SessionAccessSource } from './session-action-access.ts';
type Copy = PropsLocale<'acpActivity'>['t'];
type ModelView = AcpTeamMemberModelsView;
type Props = {
    readonly lead: SessionId;
    readonly member: AcpTeamMemberView;
    readonly initialModel: string | null;
    readonly sessionReady: boolean;
    readonly remote: AcpRemoteLike;
    readonly t: Copy;
    readonly isCurrent: (sessionId: SessionId) => boolean;
    readonly onMenuOpen: (owner: string, value: boolean) => void;
    readonly useSessionAccess: GlobalStandardProps['useSessionAccess'];
    readonly sessionAccessSource: SessionAccessSource;
};
type MemberModelFacts = AcpTeamMemberView;
export declare function reconcileMemberModelView(previous: ModelView | null, member: MemberModelFacts): ModelView | null;
/** Resolve display names when the member card mounts, so the trigger, menu
 * and pending notice use the same catalog even before the first click. */
export declare function TeamMemberModelControl({ lead, member, initialModel, sessionReady, remote, t, isCurrent, onMenuOpen, useSessionAccess, sessionAccessSource, }: Props): ReactNode;
export {};
//# sourceMappingURL=TeamMemberModelControl.d.ts.map