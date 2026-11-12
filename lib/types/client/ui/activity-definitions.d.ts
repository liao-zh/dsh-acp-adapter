import type { ConversationLocation, ConversationNodeDefinition } from '@deepseek-ai/dsh-client-ui-conversation/client';
declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
    interface ConversationStepDataMap {
        'acp-activity': AcpActivityNodeData;
        'acp-activity-live': AcpActivityNodeData;
    }
}
declare module '@deepseek-ai/dsh-client-ui-chat/client' {
    interface ChatNodeDataMap {
        'acp-activity': AcpActivityNodeData;
    }
}
export interface AcpActivityNodeData {
    readonly settled?: true;
    readonly ownerDshSessionId: string;
    readonly promptAnchorMessageId: string;
    readonly profileId: string;
    readonly agentSessionId: string;
    readonly committedActivitySeq: number;
}
interface AcpPromptAnchorState {
    readonly anchorMessageId: string;
    readonly lastDirectUserMessageId?: string;
    readonly seq: number;
    readonly location: ConversationLocation;
}
interface AcpActivityState extends AcpActivityNodeData {
    readonly seq: number;
    readonly location: ConversationLocation;
}
interface AcpEffectiveRouteChange {
    readonly seq: number;
    readonly turn?: number;
    readonly step?: number;
    readonly provider: string | undefined;
}
interface AcpEffectiveRouteState {
    readonly baselineProvider: string | undefined;
    readonly currentProvider: string | undefined;
    readonly changes: readonly AcpEffectiveRouteChange[];
}
type OwnsAcpRoute = (provider: string | undefined) => boolean;
export declare function createAcpEffectiveRouteDefinition(): ConversationNodeDefinition<AcpEffectiveRouteState>;
/** State-only admitted-input anchor consumed by subsequent ACP requests. */
export declare const acpPromptAnchorDefinition: ConversationNodeDefinition<AcpPromptAnchorState>;
/** An ACP request plus its durable replay marker produces a read-only activity view. */
export declare function createAcpActivityDefinition(ownsRoute: OwnsAcpRoute): ConversationNodeDefinition<AcpActivityState>;
/** Own an admitted user/message input's effective ACP route as a read-only live marker. */
export declare function createAcpLiveActivityDefinition(ownsRoute: OwnsAcpRoute): ConversationNodeDefinition<AcpActivityState>;
export {};
//# sourceMappingURL=activity-definitions.d.ts.map