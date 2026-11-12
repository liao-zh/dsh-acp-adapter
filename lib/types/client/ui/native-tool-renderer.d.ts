import type { ComponentType, ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { ChatNodeViewProps, ChatNodeOwnerProps, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
type NativeOwner = ChatNodeOwnerProps & Pick<ChatNodeViewProps, 'useDisclosure' | 'useGroupAction'> & {
    node: ChatConversationViewNode;
};
export type NativeToolOwner = NativeOwner & {
    node: ChatNodeViewProps<'tool-call'>['node'];
};
/** Copy for one ACP card whose result omitted output. Kept outside tool data
 * so native copy controls and persisted results retain their exact payload. */
export declare const NativeTerminalOutputNotice: import("react").Context<string | undefined>;
export declare function nativeOwner(props: NativeOwner): NativeOwner;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotFactoryMap {
        'acp.native-tool': {
            scope: 'session';
            props: NativeToolOwner;
        };
    }
}
export type EntryProps = Record<string, unknown> & {
    renderSlot?: (key: string, owner: unknown, options?: unknown) => ReactNode;
    renderSlotChain?: (key: string, owner: unknown, options?: unknown) => ReactNode;
};
/** Preserve pinned DSH's semantic DOM anchors while private slots keep their
 * registry identities. DSH currently derives data-slot from the dispatch key;
 * its public render options expose no separate DOM name. This adapter depends
 * on that renderer detail and never changes dispatch, declarations or owners.
 * @param document - document receiving this native composition.
 * @param aliases - private dispatch keys owned by one mount and their native names.
 * @returns layout flushing and lifetime cleanup for this mount's observer.
 */
export declare function observeNativeSlotAnchors(document: Document, aliases: ReadonlyMap<string, string>): {
    flush(): void;
    dispose(): void;
};
/** Compose a registered native component with its complete injection and child tree. */
export declare function mountNativeEntry(ctx: Context, entry: StoredEntry, destination: string, options?: {
    factory?: boolean;
    registration?: Record<string, unknown>;
    wrap?: (Native: ComponentType<EntryProps>, props: EntryProps) => ReactNode;
}): () => void;
/** Reuse the registered native Tool tree including its injected hooks, stores,
 * locale and third-party child renderers. Factories cannot redeclare an existing
 * slot, so give this presentation-only occurrence its own declaration names.
 * No component, classifier, CSS, execution event or approval is copied.
 */
export declare function installNativeToolRenderer(ctx: Context): void;
export {};
//# sourceMappingURL=native-tool-renderer.d.ts.map