import { useMemo, useSyncExternalStore } from 'react';
/** Combine native sources without caching a grant or interpreting roles. */
export function sessionActionAccess(source, sessionIds, action) {
    const sources = new Map([...new Set(sessionIds)].map((id) => [id, source(id, action)]));
    return {
        allows: (id) => sources.get(id)?.getSnapshot() === true,
        getSnapshot: () => [...sources.values()].map((item) => (item?.getSnapshot() === true ? '1' : '0')).join(''),
        subscribe: (changed) => {
            const disposers = [...sources.values()].map((item) => item?.subscribe(changed));
            return () => {
                for (const dispose of disposers)
                    dispose?.();
            };
        },
    };
}
/** One subscription for a changing member set, with no Hooks inside its loop. */
export function useSessionActionAccess(source, sessionIds, action) {
    const identities = JSON.stringify([...new Set(sessionIds)]);
    const access = useMemo(() => sessionActionAccess(source, JSON.parse(identities), action), [source, identities, action]);
    useSyncExternalStore(access.subscribe, access.getSnapshot);
    return access;
}
//# sourceMappingURL=session-action-access.js.map