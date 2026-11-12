import type { AcpTeamMemberView } from '../data/acp-remote.ts';
/** Capture the visible team, then refresh membership before sending native
 * interrupts. The native endpoint authorizes each durable parent address.
 * Its receipt means accepted, not that execution has already stopped.
 */
export declare function interruptTeam(input: {
    lead: string;
    targets: readonly string[];
    isCurrent(): boolean;
    members(): Promise<readonly AcpTeamMemberView[]>;
    interrupt(id: string): Promise<void>;
}): Promise<{
    accepted: number;
    skipped: number;
    failed: number;
}>;
//# sourceMappingURL=team-interrupt.d.ts.map