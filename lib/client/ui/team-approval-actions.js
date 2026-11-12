/** Cached lineage only selects candidates; Host runtime ownership still authorizes every action. */
export function pendingChildCandidates(parent, summaries, snapshot, readOnly = new Set()) {
    return [...snapshot].flatMap(([id, status]) => {
        if (id === parent || status.pendingInteraction === undefined || readOnly.has(id))
            return [];
        const visited = new Set();
        let current = id;
        while (current !== undefined && current !== parent) {
            if (visited.has(current) || readOnly.has(current))
                return [];
            visited.add(current);
            const row = summaries[current];
            if (row?.origin !== 'subagent')
                return [];
            current = row.parentId;
        }
        return current === parent ? [id] : [];
    });
}
const memberReadRetryDelays = [500, 1_000, 2_000, 4_000, 8_000];
const stableMemberReadErrorCodes = new Set([
    'dsh-acp/config',
    'dsh-acp/not-installed',
    'dsh-acp/auth-required',
    'dsh-acp/protocol-incompatible',
    'dsh-acp/user-rejected',
    'gateway/bad-request',
    'remote-access/denied',
]);
export function isStableTeamMemberReadError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string' &&
        stableMemberReadErrorCodes.has(error.code));
}
async function waitForMemberReadRetry(delayMs, signal) {
    if (signal?.aborted)
        return;
    await new Promise((resolve) => {
        let timer;
        const finish = () => {
            if (timer !== undefined)
                clearTimeout(timer);
            signal?.removeEventListener('abort', finish);
            resolve();
        };
        timer = setTimeout(finish, delayMs);
        signal?.addEventListener('abort', finish, { once: true });
        if (signal?.aborted)
            finish();
    });
}
/** Retry only the read while its captured session/request remains live. */
export async function readTeamMembersUntilAvailable(sessionId, loadMembers, active, options = {}) {
    let attempt = 0;
    while (!options.signal?.aborted && active()) {
        options.onAttempt?.();
        try {
            const members = await loadMembers(sessionId);
            return !options.signal?.aborted && active() ? members : undefined;
        }
        catch (error) {
            if (options.signal?.aborted || !active())
                return undefined;
            if (isStableTeamMemberReadError(error))
                throw error;
            options.onFailure?.();
            const delay = memberReadRetryDelays[Math.min(attempt, memberReadRetryDelays.length - 1)];
            attempt++;
            await waitForMemberReadRetry(delay, options.signal);
        }
    }
    return undefined;
}
export function teamApproval(value) {
    return value.kind === 'approval' &&
        'answer' in value &&
        typeof value.answer === 'function' &&
        'toolName' in value &&
        typeof value.toolName === 'string'
        ? value
        : undefined;
}
/** Settle only the captured, still-current requests. New arrivals never join a batch. */
export async function answerTeamRequests(requests, current, allowedMembers, active, inFlight) {
    const outcomes = await Promise.allSettled(requests.map(async (request) => {
        const pending = request.pending;
        if (!active() ||
            !allowedMembers.has(pending.sessionId) ||
            current().get(pending.sessionId)?.pendingInteraction !== pending ||
            ('answerable' in pending && pending.answerable === false) ||
            inFlight.has(pending))
            return;
        inFlight.add(pending);
        try {
            await request.answer();
        }
        finally {
            inFlight.delete(pending);
        }
    }));
    return outcomes.filter((outcome) => outcome.status === 'rejected').length;
}
//# sourceMappingURL=team-approval-actions.js.map