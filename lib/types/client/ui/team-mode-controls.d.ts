import type { AcpAgentSessionSnapshotView, AcpAgentSessionOptionWrite, AcpTeamMemberView } from '../data/acp-remote.ts';
import { type AgentControlGroup, type AgentControlTranslate } from './agent-session-controls.ts';
export { teamModeChoices } from '../../contract/session-modes.ts';
/** Same normalized menu as the composer, narrowed to canonical member modes.
 * Dormant modes can be writable even when the reported snapshot is stale.
 * That permission is supplied by the owning team, never inferred by the view.
 */
export declare function teamSessionMenuGroups(snapshot: AcpAgentSessionSnapshotView, t: AgentControlTranslate, writable: boolean): AgentControlGroup[];
export type TeamModeReason = 'Applied' | 'Inactive' | 'Missing' | 'Stale' | 'Unsupported' | 'Selected' | 'Changed' | 'Failed';
export interface TeamModeResult {
    readonly sessionId: string;
    readonly reason: TeamModeReason;
}
/** A click captures its targets; later members and other profiles never join the batch. */
export declare function applyTeamMode(input: {
    targets: readonly string[];
    profileId: string;
    mode: string;
    isCurrent(): boolean;
    canWrite?(id: string): boolean;
    members(): Promise<readonly AcpTeamMemberView[]>;
    snapshot(id: string): Promise<AcpAgentSessionSnapshotView>;
    write(id: string, value: AcpAgentSessionOptionWrite): Promise<unknown>;
}): Promise<{
    applied: number;
    skipped: number;
    failed: number;
    members: TeamModeResult[];
}>;
//# sourceMappingURL=team-mode-controls.d.ts.map