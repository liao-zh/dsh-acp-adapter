/** ACP presentation facts become native Chat nodes; execution events remain untouched. */
import type { ChatConversationViewNode, AssistantBlock } from '@deepseek-ai/dsh-client-ui-chat/client';
import { type AcpActivityNodeData, type ActivityPresentationRow } from './AcpActivityNode.ts';
export interface ActivityWindow {
    readonly rows: readonly ActivityPresentationRow[];
    readonly unavailable: boolean;
}
export interface AcpNormalizationCacheEntry {
    readonly source: ChatConversationViewNode;
    readonly window: ActivityWindow;
    readonly nodes: readonly ChatConversationViewNode[];
    readonly contribution: {
        readonly turn: number;
        readonly tools: number;
        readonly answer: number | null;
        readonly step: number;
    };
}
export declare function activityWindowKey(data: AcpActivityNodeData, fallbackSessionId?: string): string;
export declare function activityData(node: ChatConversationViewNode): AcpActivityNodeData | undefined;
export declare function activityBoundaries(rows: readonly ActivityPresentationRow[], count: number, settled?: boolean): Map<number, ActivityPresentationRow[]>;
export declare function finalAnswerStart(blocks: readonly AssistantBlock[], boundaries: ReadonlyMap<number, unknown>): number;
export declare function normalizeAcpChatNodes(nodes: readonly ChatConversationViewNode[], windows: ReadonlyMap<string, ActivityWindow>, cache?: Map<string, AcpNormalizationCacheEntry>, previous?: ReadonlyMap<string, ChatConversationViewNode>, fallbackSessionId?: string): readonly ChatConversationViewNode[];
//# sourceMappingURL=acp-chat-normalization.d.ts.map