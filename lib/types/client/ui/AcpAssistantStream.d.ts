import type { Context } from '@deepseek-ai/cordis';
import type { ChatSnapshot, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ConversationGroupDefinition, ConversationViewDefinition, ConversationGroupData, GroupSnapshot, GroupKey } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ActivityNodeProps, ActivityPresentationRow } from './AcpActivityNode.ts';
export { uniqueViewTabs } from './native-header-views.ts';
import { type ActivityWindow, type AcpNormalizationCacheEntry } from './acp-chat-normalization.ts';
export { activityBoundaries, finalAnswerStart } from './acp-chat-normalization.ts';
type Dependencies = Pick<ActivityNodeProps, 'journalHub' | 't' | 'onOpenProjectedChild' | 'jsonStringWrapping'>;
declare class SnapshotSource<T> {
    private value;
    private listeners;
    constructor(value: T);
    readonly getSnapshot: () => T;
    readonly subscribe: (listener: () => void) => (() => void);
    set(value: T): boolean;
    publish(): void;
}
export interface ChatProjection {
    readonly view: ConversationViewDefinition<ChatConversationViewNode, ChatSnapshot>;
    readonly group: ConversationGroupDefinition | undefined;
    readonly builder: ReturnType<ConversationViewDefinition<ChatConversationViewNode, ChatSnapshot>['create']>;
    readonly chatSource: SnapshotSource<ChatSnapshot>;
    readonly groupRevision: SnapshotSource<number>;
    readonly snapshots: Map<GroupKey, GroupSnapshot<ConversationGroupData<'chat'>>>;
    readonly groupSources: Map<GroupKey, SnapshotSource<GroupSnapshot<ConversationGroupData<'chat'>> | undefined>>;
    groupedView: {
        readonly entries: readonly unknown[];
        groupSource(key: GroupKey): SnapshotSource<GroupSnapshot<ConversationGroupData<'chat'>> | undefined>;
    };
    initial: boolean;
    groupState: unknown;
    groupedEntries: readonly unknown[] | undefined;
    nodes: Map<string, ChatConversationViewNode>;
    timeline: ChatSnapshot['timeline'] | undefined;
    dirtySources: Set<SnapshotSource<unknown>>;
    normalizationCache: Map<string, AcpNormalizationCacheEntry>;
}
export interface ChatProjectionChange {
    readonly nodes: ChatConversationViewNode[];
    readonly upserts: ChatConversationViewNode[];
    readonly replace: boolean;
    readonly changed: boolean;
    readonly timeline: ChatSnapshot['timeline'];
    readonly normalizationCache: Map<string, AcpNormalizationCacheEntry>;
}
export declare function createChatProjection(view: ConversationViewDefinition, group: ConversationGroupDefinition | undefined): ChatProjection;
/** Render-phase work is pure; builder and group mutation happens after commit. */
export declare function stageChatProjection(projection: ChatProjection, original: ChatSnapshot, windows: ReadonlyMap<string, ActivityWindow>, fallbackSessionId?: string): ChatProjectionChange;
export declare function commitChatProjection(projection: ChatProjection, change: ChatProjectionChange): void;
declare module '@deepseek-ai/dsh-client-ui-chat/client' {
    interface ChatNodeDataMap {
        'acp-inline-activity': ActivityPresentationRow;
    }
}
export declare function installAcpAssistantStream(ctx: Context, dependencies: Dependencies): void;
//# sourceMappingURL=AcpAssistantStream.d.ts.map