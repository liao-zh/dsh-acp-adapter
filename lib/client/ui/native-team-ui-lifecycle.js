const TEAM_ACTION_SLOT = 'conversation.session.header.actions';
/** Follow the official Team UI owner; cached rosters do not imply it is enabled. */
export function followNativeTeamUi(slots, mount) {
    let stopped = false;
    let owner;
    let unmount;
    const reconcile = () => {
        if (stopped)
            return;
        const next = slots.entries(TEAM_ACTION_SLOT).find((entry) => entry.options.id === 'agent-team');
        if (next === owner)
            return;
        owner = next;
        const previous = unmount;
        unmount = undefined;
        previous?.();
        if (next !== undefined)
            unmount = mount();
    };
    const unsubscribe = slots.subscribe(TEAM_ACTION_SLOT, reconcile);
    try {
        reconcile();
    }
    catch (error) {
        unsubscribe();
        throw error;
    }
    return () => {
        if (stopped)
            return;
        stopped = true;
        unsubscribe();
        owner = undefined;
        const previous = unmount;
        unmount = undefined;
        previous?.();
    };
}
//# sourceMappingURL=native-team-ui-lifecycle.js.map