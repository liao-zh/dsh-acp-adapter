import { createContext, createElement as h, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, } from 'react';
import { ActivityRow, visibleActivityRows, activityJournalSessionId, renderNativeActivityTool, } from "./AcpActivityNode.js";
import { mountNativeEntry } from "./native-tool-renderer.js";
import { nativeHeaderViewRegistration, ownsNativeHeaderViews } from "./native-header-views.js";
export { uniqueViewTabs } from "./native-header-views.js";
import { ActivityAnchorSubscriptions } from "./activity-anchor-subscriptions.js";
import { activityData, activityWindowKey, normalizeAcpChatNodes, } from "./acp-chat-normalization.js";
export { activityBoundaries, finalAnswerStart } from "./acp-chat-normalization.js";
class SnapshotSource {
    value;
    listeners = new Set();
    constructor(value) {
        this.value = value;
    }
    getSnapshot = () => this.value;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
    set(value) {
        if (Object.is(this.value, value))
            return false;
        this.value = value;
        return true;
    }
    publish() {
        for (const listener of this.listeners)
            listener();
    }
}
function groupSource(projection, key) {
    let source = projection.groupSources.get(key);
    if (source === undefined) {
        source = new SnapshotSource(projection.snapshots.get(key));
        projection.groupSources.set(key, source);
    }
    return source;
}
const emptyChatSource = new SnapshotSource(null);
const emptyNodeSource = new SnapshotSource(undefined);
const emptyProcessSource = new SnapshotSource(undefined);
const emptyBottomSource = new SnapshotSource(false);
const emptyGroupSource = new SnapshotSource(undefined);
const emptyGroupRevisionSource = new SnapshotSource(0);
// One binding per rendered Chat view, including two viewports of the same Session.
// Native flow entries inject their own sources, so root prop overrides alone do
// not reach their keyed rows. Context crosses the complete native slot tree.
const ProjectionContext = createContext(undefined);
const emptyProjectionBinding = {
    projectionRef: { current: undefined },
    projectionModeSource: emptyGroupRevisionSource,
};
export function createChatProjection(view, group) {
    const typedView = view;
    const builder = typedView.create();
    const projection = {
        view: typedView,
        group,
        builder,
        chatSource: new SnapshotSource(builder.empty),
        groupRevision: new SnapshotSource(0),
        snapshots: new Map(),
        groupSources: new Map(),
        groupedView: undefined,
        initial: true,
        groupState: group?.create(),
        groupedEntries: undefined,
        nodes: new Map(),
        timeline: undefined,
        dirtySources: new Set(),
        normalizationCache: new Map(),
    };
    projection.groupedView = {
        get entries() {
            return projection.groupedEntries ?? [];
        },
        groupSource: (key) => groupSource(projection, key),
    };
    return projection;
}
/** Render-phase work is pure; builder and group mutation happens after commit. */
export function stageChatProjection(projection, original, windows, fallbackSessionId) {
    const normalizationCache = new Map(projection.normalizationCache);
    const nodes = [
        ...normalizeAcpChatNodes(original.nodes.values(), windows, normalizationCache, projection.nodes, fallbackSessionId),
    ];
    const nextNodes = new Map(nodes.map((node) => [node.key, node]));
    const upserts = nodes.filter((node) => projection.nodes.get(node.key) !== node);
    const removed = [...projection.nodes.keys()].some((key) => !nextNodes.has(key));
    return {
        nodes,
        upserts,
        replace: projection.initial || removed,
        changed: projection.initial || removed || upserts.length > 0 || projection.timeline !== original.timeline,
        timeline: original.timeline,
        normalizationCache,
    };
}
export function commitChatProjection(projection, change) {
    projection.normalizationCache = change.normalizationCache;
    if (!change.changed)
        return;
    let chat;
    if (change.replace) {
        chat = projection.builder.replace({ nodes: change.nodes, timeline: change.timeline });
    }
    else if (change.upserts.length > 0 || projection.timeline !== change.timeline) {
        chat = projection.builder.apply({ upserts: change.upserts, timeline: change.timeline });
    }
    else
        chat = projection.chatSource.getSnapshot();
    projection.initial = false;
    projection.nodes = new Map(change.nodes.map((node) => [node.key, node]));
    projection.timeline = change.timeline;
    const dirty = projection.chatSource.set(chat);
    let groupsChanged = false;
    const removedSourceKeys = [];
    const input = projection.builder.groupInput?.();
    const state = projection.groupState;
    const updatedState = projection.group !== undefined && input !== undefined ? projection.group.update({ state }, input) : state;
    if (projection.group !== undefined && input !== undefined) {
        projection.groupState = updatedState;
        const update = projection.group.buildGroups({ state: updatedState });
        if (update !== null && update !== undefined) {
            groupsChanged = true;
            if (update.groups.kind === 'replace') {
                for (const key of projection.snapshots.keys())
                    projection.snapshots.delete(key);
                for (const snapshot of update.groups.snapshots)
                    projection.snapshots.set(snapshot.key, snapshot);
            }
            else {
                for (const key of update.groups.removes)
                    projection.snapshots.delete(key);
                for (const snapshot of update.groups.upserts)
                    projection.snapshots.set(snapshot.key, snapshot);
            }
            if (update.entries !== undefined)
                projection.groupedEntries = update.entries;
            for (const [key, source] of projection.groupSources) {
                if (source.set(projection.snapshots.get(key)))
                    projection.dirtySources.add(source);
                if (!projection.snapshots.has(key))
                    removedSourceKeys.push(key);
            }
            for (const key of projection.snapshots.keys())
                groupSource(projection, key);
        }
    }
    projection.builder.publish?.();
    if (dirty)
        projection.chatSource.publish();
    for (const source of projection.dirtySources)
        source.publish();
    projection.dirtySources.clear();
    for (const key of removedSourceKeys)
        projection.groupSources.delete(key);
    if (groupsChanged) {
        projection.groupRevision.set(projection.groupRevision.getSnapshot() + 1);
        projection.groupRevision.publish();
    }
}
function NormalizedChat({ Native, props, ctx, dependencies, }) {
    const selectedChat = props.useChat((value) => ({ nodes: value.nodes.values(), timeline: value.timeline }), (left, right) => left.nodes === right.nodes && left.timeline === right.timeline);
    const original = useMemo(() => ({ nodes: { values: () => selectedChat.nodes }, timeline: selectedChat.timeline }), [selectedChat.nodes, selectedChat.timeline]);
    const [windows, setWindows] = useState(new Map());
    const projectionRef = useRef(undefined);
    const projectionModeRef = useRef(undefined);
    if (projectionModeRef.current === undefined)
        projectionModeRef.current = new SnapshotSource(0);
    const projectionModeSource = projectionModeRef.current;
    const subscriptionsRef = useRef(undefined);
    if (subscriptionsRef.current === undefined)
        subscriptionsRef.current = new ActivityAnchorSubscriptions();
    const subscriptions = subscriptionsRef.current;
    const anchors = new Map(original.nodes.values().flatMap((node) => {
        const data = activityData(node);
        return data === undefined ? [] : [[activityWindowKey(data, props.sessionId), data]];
    }));
    const signature = JSON.stringify([...anchors].map(([key, data]) => [key, data.ownerDshSessionId, data.promptAnchorMessageId]));
    useEffect(() => {
        const activeKeys = new Set(anchors.keys());
        setWindows((current) => {
            const next = new Map([...current].filter(([key]) => activeKeys.has(key)));
            return next.size === current.size ? current : next;
        });
        subscriptions.reconcile(dependencies.journalHub, props.sessionId, dependencies, [...anchors].map(([key, data]) => ({
            key,
            ownerDshSessionId: activityJournalSessionId(data, props.sessionId),
            promptAnchorMessageId: data.promptAnchorMessageId,
        })), (key, handle) => {
            const rows = handle.snapshot();
            setWindows((current) => {
                const nextWindow = {
                    rows: visibleActivityRows(rows),
                    unavailable: !handle.ready() || handle.error() !== undefined,
                };
                const previous = current.get(key);
                if (previous !== undefined &&
                    previous.unavailable === nextWindow.unavailable &&
                    previous.rows.length === nextWindow.rows.length &&
                    previous.rows.every((row, index) => row === nextWindow.rows[index]))
                    return current;
                const next = new Map([...current].filter(([activeKey]) => activeKeys.has(activeKey)));
                next.set(key, nextWindow);
                return next;
            });
        });
    }, [signature, props.sessionId, dependencies, subscriptions]);
    useEffect(() => () => subscriptions.dispose(), [subscriptions]);
    const visibleWindows = useMemo(() => new Map([...windows].filter(([key]) => anchors.has(key))), [windows, signature]);
    const view = ctx.uiConversation.views.entries().find((value) => value.target === 'chat');
    const group = ctx.uiConversation.groups.forTarget('chat');
    const hasAcp = anchors.size > 0 && view !== undefined;
    const committedProjection = projectionRef.current;
    const projection = !hasAcp
        ? undefined
        : committedProjection?.view === view && committedProjection.group === group
            ? committedProjection
            : createChatProjection(view, group);
    const change = useMemo(() => projection === undefined ? undefined : stageChatProjection(projection, original, visibleWindows, props.sessionId), [projection, original, visibleWindows, props.sessionId]);
    useLayoutEffect(() => {
        if (projection !== undefined && change !== undefined)
            commitChatProjection(projection, change);
        if (projectionRef.current !== projection) {
            projectionRef.current = projection;
            projectionModeSource.set(projectionModeSource.getSnapshot() + 1);
            projectionModeSource.publish();
        }
    }, [projection, change, props]);
    const binding = useMemo(() => ({ projectionRef, projectionModeSource }), []);
    const adapters = useProjectedChatHooks(props, binding);
    return h(ProjectionContext.Provider, { value: binding }, h(Native, { ...props, ...adapters }));
}
/** Replace only Session data hooks; native viewport behavior stays on the flow. */
function useProjectedChatHooks(props, { projectionRef, projectionModeSource }) {
    const nativePropsRef = useRef(props);
    useLayoutEffect(() => {
        nativePropsRef.current = props;
    }, [props]);
    return useMemo(() => {
        const useChat = (selector, equal) => {
            const native = nativePropsRef.current.useChat((snapshot) => selector(projectionRef.current?.chatSource.getSnapshot() ?? snapshot), equal);
            useSyncExternalStore(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
            const current = projectionRef.current;
            const source = current?.chatSource ?? emptyChatSource;
            const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot);
            return current === undefined ? native : selector(snapshot);
        };
        const useConversation = (selector, equal) => {
            void equal;
            const base = nativePropsRef.current.useConversation((snapshot) => snapshot);
            useSyncExternalStore(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
            const current = projectionRef.current;
            const chatSource = current?.chatSource ?? emptyChatSource;
            const chatSnapshot = useSyncExternalStore(chatSource.subscribe, chatSource.getSnapshot);
            const groupRevision = current?.groupRevision ?? emptyGroupRevisionSource;
            const groupsSnapshot = useSyncExternalStore(groupRevision.subscribe, groupRevision.getSnapshot);
            const conversation = useMemo(() => {
                const active = current;
                const conversation = base;
                if (active === undefined || base == null)
                    return base;
                void chatSnapshot;
                void groupsSnapshot;
                return {
                    ...conversation,
                    views: {
                        ...conversation.views,
                        get: (target) => target === 'chat' ? active.chatSource.getSnapshot() : conversation.views.get(target),
                        grouped: (target) => target === 'chat'
                            ? active.group === undefined
                                ? undefined
                                : active.groupedView
                            : conversation.views.grouped(target),
                    },
                };
            }, [base, current, chatSnapshot, groupsSnapshot]);
            return conversation == null ? conversation : selector(conversation);
        };
        const useChatNode = (key, selector) => {
            const nativeSelector = selector === undefined
                ? undefined
                : (node) => {
                    const current = projectionRef.current;
                    return selector(current === undefined ? node : current.chatSource.getSnapshot().nodes.get(key));
                };
            const native = nativePropsRef.current.useChatNode(key, nativeSelector);
            useSyncExternalStore(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
            const current = projectionRef.current;
            const source = current?.chatSource.getSnapshot().nodes.source(key) ?? emptyNodeSource;
            const value = useSyncExternalStore(source.subscribe, source.getSnapshot);
            return current === undefined ? native : selector === undefined ? value : selector(value);
        };
        const useChatNodeProcess = (key, selector) => {
            const nativeSelector = selector === undefined
                ? undefined
                : (value) => {
                    const current = projectionRef.current;
                    return selector(current === undefined ? value : current.chatSource.getSnapshot().nodes.processSource(key).getSnapshot());
                };
            const native = nativePropsRef.current.useChatNodeProcess(key, nativeSelector);
            useSyncExternalStore(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
            const current = projectionRef.current;
            const source = current?.chatSource.getSnapshot().nodes.processSource(key) ?? emptyProcessSource;
            const value = useSyncExternalStore(source.subscribe, source.getSnapshot);
            return current === undefined ? native : selector === undefined ? value : selector(value);
        };
        const useChatGroup = (key, selector) => {
            const nativeSelector = selector === undefined
                ? undefined
                : (value) => {
                    const current = projectionRef.current;
                    return selector(current === undefined ? value : current.groupedView.groupSource(key).getSnapshot());
                };
            const native = nativePropsRef.current.useChatGroup(key, nativeSelector);
            useSyncExternalStore(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
            const source = projectionRef.current?.groupedView.groupSource(key) ?? emptyGroupSource;
            const value = useSyncExternalStore(source.subscribe, source.getSnapshot);
            return projectionRef.current === undefined ? native : selector === undefined ? value : selector(value);
        };
        const useChatNodeBottom = (key) => {
            const native = nativePropsRef.current.useChatNodeBottom(key);
            useSyncExternalStore(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
            const source = projectionRef.current?.chatSource.getSnapshot().nodes.bottomSource(key) ?? emptyBottomSource;
            const value = useSyncExternalStore(source.subscribe, source.getSnapshot);
            return projectionRef.current === undefined ? native : value;
        };
        return { useChat, useConversation, useChatNode, useChatNodeBottom, useChatNodeProcess, useChatGroup };
    }, [projectionRef, projectionModeSource]);
}
function NormalizedChatFlow({ Native, props }) {
    const binding = useContext(ProjectionContext) ?? emptyProjectionBinding;
    // Subscribe at the bridge as well as in keyed hooks: the first projection is
    // committed after render, and may not change the flow's owner entries.
    useSyncExternalStore(binding.projectionModeSource.subscribe, binding.projectionModeSource.getSnapshot);
    const adapters = useProjectedChatHooks(props, binding);
    return h(Native, { ...props, ...adapters });
}
/** Shadow a native entry through the public slot API, preserving its full tree. */
function composeSlot(ctx, name, select, wrap, registration) {
    ctx.slots.inject(name, () => {
        let current;
        let release;
        const sync = () => {
            const next = ctx.slots
                .entries(name)
                .find((entry) => entry.registrant !== 'acp-chat-normalization' && select(entry));
            if (next === current)
                return;
            const oldRelease = release;
            release = undefined;
            current = next;
            oldRelease?.();
            if (next !== undefined)
                release = mountNativeEntry(ctx, next, name, {
                    registration: {
                        priority: (next.options.priority ?? 0) - 1,
                        registrant: 'acp-chat-normalization',
                        ...registration?.(next),
                    },
                    wrap,
                });
        };
        const unsubscribe = ctx.slots.subscribe(name, sync);
        sync();
        return () => {
            unsubscribe();
            release?.();
        };
    });
}
export function installAcpAssistantStream(ctx, dependencies) {
    composeSlot(ctx, 'conversation.view', (entry) => entry.options.id === 'chat', (Native, props) => h(NormalizedChat, {
        key: props.sessionId,
        Native,
        props: props,
        ctx,
        dependencies,
    }));
    composeSlot(ctx, 'conversation.chat.flow', () => true, (Native, props) => h(NormalizedChatFlow, { Native, props }));
    composeSlot(ctx, 'conversation.session.header', ownsNativeHeaderViews, (Native, props) => h(Native, props), nativeHeaderViewRegistration);
    // Native tool nodes still use the native Tool tree. Only their sidecar detail
    // loader/inspector and external-child navigation belong to ACP.
    composeSlot(ctx, 'conversation.chat.node', (entry) => entry.options.key === 'tool-call', (Native, props) => {
        const owner = props;
        const row = owner.node.data.acpActivity;
        return row === undefined
            ? h(Native, props)
            : h(ActivityRow, {
                ...dependencies,
                row,
                openFile: owner.openFile,
                useDisclosure: owner.useDisclosure,
                renderTool: (full) => renderNativeActivityTool(owner, full, dependencies.t),
            });
    });
    ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
        name: 'conversation.chat.node',
        key: 'acp-inline-activity',
        locale: 'acpActivity',
    }, (props) => h(ActivityRow, {
        ...dependencies,
        row: props.node.data,
        openFile: props.openFile,
        useDisclosure: props.useDisclosure,
    })));
    // Standalone ACP markers remain the fallback for unavailable journals or turns
    // with no assistant message. They must not suppress their own activity rows.
}
//# sourceMappingURL=AcpAssistantStream.js.map