import type { Context } from '@deepseek-ai/cordis';
import { z } from 'zod';
import type { ProjectionHandle } from '@deepseek-ai/dsh-session-projection';
import type { AcpExecutionView } from '../../contract/external-subagent.ts';
import type { Session } from '@deepseek-ai/dsh-session';
import { applySessionFact, type SessionFacts, type SessionLike } from '../../domain/session/session-facts.ts';
declare module '@deepseek-ai/dsh-session-projection' {
    interface SessionProjectionStateMap {
        acpExecution: SessionFacts;
    }
}
export declare const acpExecutionProjection: {
    key: "acpExecution";
    stateVersion: number;
    stateSchema: z.ZodObject<{
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
    init: (_header: import("@deepseek-ai/dsh-session").SessionHeader, inheritedEventCount: import("@deepseek-ai/dsh-session").SessionLogOffset) => {
        turnOpen: boolean;
        turnSeen: boolean;
        hasSemanticHistory: boolean;
        priorSemanticHistory: boolean;
        openSteps: {
            turn: number;
            step: number;
            startSeq: number;
            messageIds: string[];
        }[];
        inheritedRemaining: number;
        externalSubagent: boolean;
        forkReplay: {
            kind: "dsh-acp";
            version: 1;
            ownerDshSessionId: string;
            profileId: string;
            profileGeneration: number;
            agentSessionId: string;
            bindingEpoch: number;
            launchFingerprint: string;
            committedPromptOrdinal: number;
            committedActivitySeq: number;
            activityAnchorMessageId?: string | undefined;
        } | null;
    };
    apply: typeof applySessionFact;
    wire: {
        viewSchema: z.ZodObject<{
            externalSubagent: z.ZodBoolean;
        }, z.core.$strip>;
        view: (state: NoInfer<{
            turnOpen: boolean;
            turnSeen: boolean;
            hasSemanticHistory: boolean;
            priorSemanticHistory: boolean;
            openSteps: {
                turn: number;
                step: number;
                startSeq: number;
                messageIds: string[];
            }[];
            inheritedRemaining: number;
            externalSubagent: boolean;
            forkReplay: {
                kind: "dsh-acp";
                version: 1;
                ownerDshSessionId: string;
                profileId: string;
                profileGeneration: number;
                agentSessionId: string;
                bindingEpoch: number;
                launchFingerprint: string;
                committedPromptOrdinal: number;
                committedActivitySeq: number;
                activityAnchorMessageId?: string | undefined;
            } | null;
        }>) => AcpExecutionView;
    };
};
/**
 * Publish the registered `acpExecution` handle for subsequent reads.
 * @param handle - the ready handle returned by `sessionProjections.register`.
 */
export declare function installExecutionProjectionHandle(handle: ProjectionHandle<SessionFacts>): void;
export declare function readSessionFacts(_ctx: Context, session: Session): SessionFacts;
/** Accessors always read the host's current cut, including after a policy append. */
export declare function acpSessionView(ctx: Context, session: Session | undefined): SessionLike | undefined;
//# sourceMappingURL=session-facts.d.ts.map