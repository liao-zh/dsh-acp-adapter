import { type SessionHeader } from '@deepseek-ai/dsh-session';
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence';
import type { AcpSidecar } from '../../persistence/sidecar.ts';
import { type ExternalDelegationObservation } from '../../domain/subagent/external-delegation.ts';
export declare const EXTERNAL_SUBAGENT_ACTIVITY_ANCHOR = "external-subagent-record";
export { EXTERNAL_SUBAGENT_DESCRIPTOR_PROVIDER } from '../../contract/external-subagent.ts';
export interface ExternalProjectionContext {
    readonly profileId: string;
    readonly bindingGeneration: number;
    readonly rootAcpSessionId: string;
    readonly parentDshSessionId: string;
    readonly parentCwd: string;
    readonly parentDelegationDepth?: number;
    readonly flushParent: () => Promise<boolean>;
}
export interface ExternalProjectionResult {
    readonly childSessionId: string;
    readonly created: boolean;
}
export interface ExternalProjectionRepairSummary {
    readonly committed: number;
    readonly repaired: number;
    readonly conflicted: number;
}
/** Idempotent read-only transcript projection for evidence-complete external delegations. */
export declare class ExternalSubagentProjector {
    private readonly persistence;
    private readonly sidecar;
    private readonly publishChild?;
    private accepting;
    private readonly pending;
    private closing;
    /** Stop new transactions and retain their dependencies through the final status write.
     * @returns resolves after every accepted transaction and borrowed batch settles.
     */
    close(): Promise<void>;
    private run;
    constructor(persistence: Pick<SessionPersistence, 'create' | 'open'>, sidecar: Pick<AcpSidecar, 'upsertActivity'> & Partial<Pick<AcpSidecar, 'listProjectedSubagentActivities'>>, publishChild?: ((header: SessionHeader, label: string) => Promise<void>) | undefined);
    /** Borrow one admitted batch; shutdown waits through every transaction and caller writeback.
     * @param operation - uses the supplied projector only within its awaited batch.
     * @returns resolves after the batch and its final caller writeback settle.
     */
    withProjection(operation: (project: (observation: ExternalDelegationObservation, context: ExternalProjectionContext) => Promise<ExternalProjectionResult | undefined>) => Promise<void>): Promise<void>;
    private inspect;
    private commit;
    private setProjectionStatus;
    /** Converge interrupted projection transactions after the persistence seam mounts. */
    repairInterrupted(): Promise<ExternalProjectionRepairSummary>;
    private repairAccepted;
    project(observation: ExternalDelegationObservation, context: ExternalProjectionContext): Promise<ExternalProjectionResult | undefined>;
    private projectAccepted;
}
//# sourceMappingURL=external-projector.d.ts.map