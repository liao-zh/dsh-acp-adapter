import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
/** Native RemoteAccess answers; absent services never grant a write. */
export type SessionAccessSource = (sessionId: string, action: string) => HostObservable<boolean> | undefined;
/** Combine native sources without caching a grant or interpreting roles. */
export declare function sessionActionAccess(source: SessionAccessSource, sessionIds: readonly string[], action: string): {
    allows: (id: string) => boolean;
    getSnapshot: () => string;
    subscribe: (changed: () => void) => (() => void);
};
/** One subscription for a changing member set, with no Hooks inside its loop. */
export declare function useSessionActionAccess(source: SessionAccessSource, sessionIds: readonly string[], action: string): {
    allows: (id: string) => boolean;
    getSnapshot: () => string;
    subscribe: (changed: () => void) => (() => void);
};
//# sourceMappingURL=session-action-access.d.ts.map