/**
 * Client-safe reader for the ACP replay marker carried by DSH assistant
 * messages.  This intentionally does not import the host session domain: the
 * marker is a wire datum used only to identify an additive activity node.
 */
export interface AcpReplayPayloadV1 {
    readonly kind: 'dsh-acp';
    readonly version: 1;
    readonly ownerDshSessionId: string;
    readonly profileId: string;
    readonly profileGeneration: number;
    readonly agentSessionId: string;
    readonly bindingEpoch: number;
    readonly launchFingerprint: string;
    readonly committedPromptOrdinal: number;
    readonly committedActivitySeq: number;
    readonly activityAnchorMessageId?: string;
}
/** Extract an ACP marker from a DSH assistant/message event. */
export declare function acpReplayPayloadOf(event: {
    readonly type: string;
    readonly data: unknown;
}): AcpReplayPayloadV1 | undefined;
//# sourceMappingURL=acp-replay-payload.d.ts.map