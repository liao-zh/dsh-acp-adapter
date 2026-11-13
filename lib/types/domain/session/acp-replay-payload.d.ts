import { z } from 'zod';
/** Small opaque marker carried by a DSH assistant ReplayEnvelope. Unknown response fields are not retained. */
export declare const acpReplayPayloadSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type AcpReplayPayloadV1 = z.infer<typeof acpReplayPayloadSchema>;
/** Extract the latest ACP marker from a seeded assistant message. */
export declare function acpReplayPayloadOf(event: {
    readonly type: string;
    readonly data: unknown;
}): AcpReplayPayloadV1 | undefined;
//# sourceMappingURL=acp-replay-payload.d.ts.map