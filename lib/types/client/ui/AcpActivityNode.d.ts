import type { PropsRenderFactories } from '@deepseek-ai/dsh-client-ui-slots';
import type { ReactNode } from 'react';
import type { ToolCallBlock, ChatNodeViewProps, ChatConversationViewNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { AcpJsonStringWrapping } from './json-tree.ts';
import type { AcpActivityView } from '../data/acp-remote.ts';
import type { AcpActivityNodeData } from './activity-definitions.ts';
export { acpPromptAnchorDefinition, createAcpActivityDefinition, createAcpEffectiveRouteDefinition, createAcpLiveActivityDefinition, } from './activity-definitions.ts';
export type { AcpActivityNodeData } from './activity-definitions.ts';
import { AcpActivityJournalHub } from '../data/activity-journal.ts';
import type { AcpLocaleKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        acpActivity: import('./locales.ts').AcpLocaleKey;
    }
}
type ActivityNode = ChatConversationViewNode & {
    readonly kind: 'acp-activity';
    readonly data: AcpActivityNodeData;
};
export type ActivityNodeProps = {
    readonly node: ActivityNode;
    readonly sessionId: string;
    readonly t: (key: AcpLocaleKey, params?: Record<string, string | number>) => string;
    readonly journalHub: AcpActivityJournalHub;
    readonly onOpenProjectedChild?: (parentSessionId: string, childSessionId: string) => void;
    readonly jsonStringWrapping?: AcpJsonStringWrapping;
    readonly renderTool?: (row: AcpActivityView) => ReactNode;
} & Pick<ChatNodeViewProps, 'openFile' | 'useDisclosure'>;
/**
 * Activity is owned by the DSH session that committed the ACP replay payload.
 * A DSH fork may display that payload from a child session, so the current
 * conversation session is not necessarily the journal source. The Host Remote
 * still applies its managed-session access check to this owner id.
 */
export declare function activityJournalSessionId(data: Pick<AcpActivityNodeData, 'ownerDshSessionId'>, currentSessionId?: string): string;
export declare function completedProjectedChild(row: AcpActivityView): {
    readonly parentSessionId: string;
    readonly childSessionId: string;
} | undefined;
export type ActivityPresentationRow = AcpActivityView & {
    readonly projectedChild?: {
        readonly parentSessionId: string;
        readonly childSessionId: string;
    };
};
/** Unknown tool outcomes stay in the ACP activity surface; never fabricate a native result block. */
export declare function usesNativeActivityToolProjection(row: Pick<AcpActivityView, 'kind' | 'status'>): boolean;
/**
 * A projected child is navigation metadata for its source Tool call, not a
 * second operation in the parent transcript. Keep the source call, suppress
 * the link-only sidecar row, and suppress the content children already folded
 * into the source call. This leaves exactly one visible row per ACP Tool call.
 */
export declare function visibleActivityRows(rows: readonly AcpActivityView[]): readonly ActivityPresentationRow[];
/** Compact summary with explicitly read-only, sidecar-redacted details. */
export declare function activityRowElement({ row, t, onOpenProjectedChild, jsonStringWrapping, open, onToggle, }: {
    readonly row: AcpActivityView;
    readonly t: ActivityNodeProps['t'];
    readonly onOpenProjectedChild?: (parentSessionId: string, childSessionId: string) => void;
    readonly jsonStringWrapping?: AcpJsonStringWrapping;
    readonly open?: boolean;
    readonly onToggle?: () => void;
}): ReactNode;
export declare function ActivityRow(props: {
    readonly row: ActivityPresentationRow;
    readonly journalHub?: AcpActivityJournalHub;
    readonly t: ActivityNodeProps['t'];
    readonly openFile: ActivityNodeProps['openFile'];
    readonly onOpenProjectedChild?: (parentSessionId: string, childSessionId: string) => void;
    readonly jsonStringWrapping?: AcpJsonStringWrapping;
    readonly renderTool?: (row: AcpActivityView) => ReactNode;
    readonly useDisclosure: ChatNodeViewProps['useDisclosure'];
}): ReactNode;
/** Subscribe to native Step facts: a final marker retires the live journal view. */
export declare function AcpActivityNode(props: ActivityNodeProps & Omit<ChatNodeViewProps<'acp-activity'>, 't'> & PropsRenderFactories): ReactNode;
/** Additive ACP activity renderer. Agent-provided presentation is never translated. */
export declare function AcpActivityContent({ node, sessionId, journalHub, t, openFile, onOpenProjectedChild, jsonStringWrapping, renderTool, useDisclosure, }: ActivityNodeProps): ReactNode;
/** Presentation-only normalization. These blocks never enter the agent loop,
 * session event log, model context, tool execution or permission system. */
export declare function nativeActivityToolBlock(row: AcpActivityView, externalAgentLabel?: string, externalAgentStatusLabel?: (status: string) => string, translateOutput?: ActivityNodeProps['t']): ToolCallBlock;
export declare function renderNativeActivityTool(props: Omit<ChatNodeViewProps, 't'> & PropsRenderFactories, row: AcpActivityView, t: ActivityNodeProps['t']): ReactNode;
//# sourceMappingURL=AcpActivityNode.d.ts.map