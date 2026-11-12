import { agentControlMenuGroups } from "./agent-session-controls.js";
import { teamModeChoices } from "../../contract/session-modes.js";
export { teamModeChoices } from "../../contract/session-modes.js";
/** Same normalized menu as the composer, narrowed to canonical member modes.
 * Dormant modes can be writable even when the reported snapshot is stale.
 * That permission is supplied by the owning team, never inferred by the view.
 */
export function teamSessionMenuGroups(snapshot, t, writable) {
    const modes = teamModeChoices(snapshot);
    return agentControlMenuGroups(snapshot, t)
        .filter((group) => group.kind === 'mode')
        .map((group) => ({
        ...group,
        choices: group.choices
            .filter((choice) => choice.write.kind !== 'tool-approval-policy' &&
            modes.some((mode) => mode.write.kind === choice.write.kind && mode.write.id === choice.write.id))
            .map((choice) => ({ ...choice, disabled: !writable })),
    }))
        .filter((group) => group.choices.length > 0);
}
/** A click captures its targets; later members and other profiles never join the batch. */
export async function applyTeamMode(input) {
    const result = { applied: 0, skipped: 0, failed: 0, members: [] };
    const skip = (sessionId, reason) => {
        result.skipped++;
        result.members.push({ sessionId, reason });
    };
    for (const id of new Set(input.targets)) {
        try {
            if (!input.isCurrent()) {
                skip(id, 'Changed');
                continue;
            }
            if (input.canWrite?.(id) === false) {
                skip(id, 'Stale');
                continue;
            }
            const member = (await input.members()).find((member) => member.sessionId === id && member.profileId === input.profileId);
            if (member === undefined) {
                skip(id, 'Missing');
                continue;
            }
            if (member.status !== 'inactive') {
                skip(id, 'Inactive');
                continue;
            }
            if (input.canWrite?.(id) === false) {
                skip(id, 'Stale');
                continue;
            }
            const snapshot = await input.snapshot(id);
            const choice = teamModeChoices(snapshot).find((choice) => choice.id === input.mode);
            const writable = (snapshot.editable && snapshot.freshness === 'live') || snapshot.modeWritable === true;
            const selected = snapshot.pendingModeId ?? (choice?.current ? choice.id : null);
            if (!input.isCurrent()) {
                skip(id, 'Changed');
                continue;
            }
            if (snapshot.profileId !== input.profileId) {
                skip(id, 'Missing');
                continue;
            }
            if (!writable) {
                skip(id, 'Stale');
                continue;
            }
            if (choice === undefined) {
                skip(id, 'Unsupported');
                continue;
            }
            if (selected === input.mode) {
                skip(id, 'Selected');
                continue;
            }
            if (input.canWrite?.(id) === false) {
                skip(id, 'Stale');
                continue;
            }
            await input.write(id, choice.write);
            result.applied++;
            result.members.push({ sessionId: id, reason: 'Applied' });
        }
        catch {
            result.failed++;
            result.members.push({ sessionId: id, reason: 'Failed' });
        }
    }
    return result;
}
//# sourceMappingURL=team-mode-controls.js.map