/** Additive coordinator for stock DSH model selection transitions. */
import type { Context } from '@deepseek-ai/cordis';
import type { CrossBackendFailure, CrossBackendModelSelection, CrossBackendTicket } from '../data/cross-backend-controller.ts';
export interface CrossBackendPending {
    readonly ticket: CrossBackendTicket;
    readonly failure: CrossBackendFailure | null;
    readonly blockingReason?: 'no-location';
    readonly confirmable: boolean;
    readonly busy: boolean;
}
export interface CrossBackendCoordinatorSnapshot {
    readonly pending: CrossBackendPending | null;
}
export type OwnsAcpRoute = (provider: string | undefined) => boolean;
/** Pure observation decision, independent of React and side effects. */
export declare function shouldConfirmBackendTransition(input: {
    readonly lastUsed: CrossBackendModelSelection | null;
    readonly next: CrossBackendModelSelection | null;
    readonly blank: boolean;
}, ownsRoute: OwnsAcpRoute): boolean;
export declare class CrossBackendCoordinator {
    private readonly ctx;
    private readonly ownsRoute;
    private readonly tx;
    private readonly listeners;
    private readonly unsubscribers;
    private readonly observed;
    private readonly queued;
    private pending;
    private snapshot;
    private disposed;
    constructor(ctx: Context, ownsRoute: OwnsAcpRoute);
    start(): () => void;
    subscribe(listener: () => void): () => void;
    getSnapshot(): CrossBackendCoordinatorSnapshot;
    confirm(): Promise<void>;
    cancel(): Promise<void>;
    private observe;
    private stagePending;
    private operationsFor;
    private emit;
    private suppressSelection;
    private dispose;
}
//# sourceMappingURL=cross-backend-coordinator.d.ts.map