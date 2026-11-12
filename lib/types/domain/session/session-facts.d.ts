import { z } from 'zod';
import type { AcpActivityPresentation } from '../policy/activity-presentation.ts';
import type { ModelContextSnapshot } from './model-context-snapshots.ts';
export interface SessionEventLike {
    readonly type: string;
    /** Exact native inherited prefix length; absence must not be inferred as an empty seed. */
    readonly inheritedEventCount?: number;
    readonly seq: number;
    readonly data: unknown;
}
/** ACP-only execution facts; the host owns folding, persistence and invalidation. */
export declare const sessionFactsSchema: z.ZodObject<{
    turnOpen: z.ZodBoolean;
    turnSeen: z.ZodBoolean;
    hasSemanticHistory: z.ZodBoolean;
    priorSemanticHistory: z.ZodBoolean;
    openSteps: z.ZodArray<z.ZodObject<{
        turn: z.ZodNumber;
        step: z.ZodNumber;
        startSeq: z.ZodNumber;
        messageIds: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    inheritedRemaining: z.ZodNumber;
    externalSubagent: z.ZodBoolean;
    forkReplay: z.ZodNullable<z.ZodObject<{
        kind: z.ZodLiteral<"dsh-acp">;
        version: z.ZodLiteral<1>;
        ownerDshSessionId: z.ZodString;
        profileId: z.ZodString;
        profileGeneration: z.ZodNumber;
        agentSessionId: z.ZodString;
        bindingEpoch: z.ZodNumber;
        launchFingerprint: z.ZodString;
        committedPromptOrdinal: z.ZodNumber;
        committedActivitySeq: z.ZodNumber;
        activityAnchorMessageId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SessionFacts = z.infer<typeof sessionFactsSchema>;
export declare function initialSessionFacts(inheritedEventCount?: number): SessionFacts;
/** One committed event; unrelated events retain identity and no transcript is cached. */
export declare function applySessionFact(previous: SessionFacts, event: SessionEventLike): SessionFacts;
/** Live read face backed by native Session and projection services, not a log copy. */
export interface SessionLike {
    /** Observe committed directory changes without treating them as user steering. */
    watchWorkingDirectory?(listener: (cwd: string) => void): () => void;
    /** Observe pending next-step user input without claiming or copying the inbox. */
    watchSteering?(listener: () => void): () => void;
    /** Release a suspended execution if native admission ends its owning turn. */
    watchTurnEnd?(listener: () => void): () => void;
    watchRouteChange?(provider: string, listener: () => Promise<void>): () => void;
    /** Capture a native Agent cancellation action for the exact admitted DSH step.
     * ACP uses it only after a confirmed remote `cancelled` response and after
     * the partial response has crossed the stream consumer boundary. */
    captureRemoteCancelledTurn?(scope: {
        readonly turn: number;
        readonly step: number;
        readonly startSeq: number;
    }): (() => boolean) | undefined;
    /** Publish an observed Agent plan through the optional native todo projection. */
    publishPlan?(plan: NonNullable<AcpActivityPresentation['plan']>): void;
    /** Original host object used to match disposal, even when this read face is recreated. */
    readonly identity?: object;
    /** Effective execution directory owned by DSH's workingDirectory service.
     * Missing directory state must fail closed; header.cwd is the immutable project origin. */
    readonly workingDirectory?: string | undefined;
    readonly header?: {
        readonly id?: string;
        readonly cwd?: string;
        readonly parentSession?: string;
        readonly origin?: string;
        readonly isSeeded?: boolean;
        readonly delegationDepth?: number;
    };
    /** Exact native inherited prefix length; absence must not be inferred as an empty seed. */
    readonly inheritedEventCount?: number;
    readonly seq: number;
    readonly facts: SessionFacts;
    /** Current effective DSH model-facing snapshots, without replaying ordinary history. */
    currentModelContextSnapshots?(): readonly ModelContextSnapshot[];
    readonly permissions: {
        readonly currentValue: string;
    };
    append?(type: string, data: unknown): unknown;
}
//# sourceMappingURL=session-facts.d.ts.map