import { createContext, createElement as h, useContext, useLayoutEffect, useMemo } from 'react';
/** Copy for one ACP card whose result omitted output. Kept outside tool data
 * so native copy controls and persisted results retain their exact payload. */
export const NativeTerminalOutputNotice = createContext(undefined);
export function nativeOwner(props) {
    const { useDisclosure, useGroupAction, groupPart, cwd, openFile, inspectCall, forkAt, loadImage, turnProcess, node, } = props;
    return {
        useDisclosure,
        useGroupAction,
        ...(groupPart === undefined ? {} : { groupPart }),
        cwd,
        openFile,
        inspectCall,
        forkAt,
        loadImage,
        turnProcess,
        node,
    };
}
let generation = 0;
/** Preserve pinned DSH's semantic DOM anchors while private slots keep their
 * registry identities. DSH currently derives data-slot from the dispatch key;
 * its public render options expose no separate DOM name. This adapter depends
 * on that renderer detail and never changes dispatch, declarations or owners.
 * @param document - document receiving this native composition.
 * @param aliases - private dispatch keys owned by one mount and their native names.
 * @returns layout flushing and lifetime cleanup for this mount's observer.
 */
export function observeNativeSlotAnchors(document, aliases) {
    let disposed = false;
    let initialized = false;
    const correctElement = (element) => {
        const name = aliases.get(element.getAttribute('data-slot') ?? '');
        if (name !== undefined)
            element.setAttribute('data-slot', name);
    };
    const correctSubtree = (node) => {
        if (node.nodeType !== 1)
            return;
        const element = node;
        correctElement(element);
        for (const child of element.querySelectorAll('[data-slot]'))
            correctElement(child);
    };
    const correct = (records) => {
        if (disposed)
            return;
        for (const record of records) {
            if (record.type === 'attributes')
                correctElement(record.target);
            else
                for (const node of record.addedNodes)
                    correctSubtree(node);
        }
    };
    const observer = new MutationObserver(correct);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-slot'],
    });
    return {
        flush() {
            if (disposed)
                return;
            if (!initialized) {
                initialized = true;
                correctSubtree(document.documentElement);
            }
            correct(observer.takeRecords());
        },
        dispose() {
            disposed = true;
            observer.disconnect();
        },
    };
}
/** Compose a registered native component with its complete injection and child tree. */
export function mountNativeEntry(ctx, entry, destination, options = {}) {
    const register = ctx.slots.register.bind(ctx.slots);
    const factory = ctx.slots.registerFactory.bind(ctx.slots);
    const sourceEntries = (name) => ctx.slots.entriesOfSlot(name);
    const semanticAliases = new Map();
    const anchors = typeof document === 'undefined' ? undefined : observeNativeSlotAnchors(document, semanticAliases);
    const mount = (entry, destination, root) => {
        const aliases = new Map(Object.keys(entry.children ?? {}).map((key) => [key, `acp.native.${++generation}.${key}`]));
        for (const [name, alias] of aliases)
            semanticAliases.set(alias, name);
        const Native = entry.component;
        const Component = (props) => {
            useLayoutEffect(() => anchors?.flush());
            const outputNotice = useContext(NativeTerminalOutputNotice);
            const sourceTranslate = props.t;
            const translate = useMemo(() => outputNotice !== undefined && entry.locale === 'conversation' && typeof sourceTranslate === 'function'
                ? (key, ...args) => key === 'terminal.noOutput' ? outputNotice : sourceTranslate(key, ...args)
                : sourceTranslate, [outputNotice, sourceTranslate]);
            const renderSlot = useMemo(() => props.renderSlot === undefined
                ? undefined
                : (key, owner, options) => props.renderSlot(aliases.get(key) ?? key, owner, options), [props.renderSlot]);
            const renderSlotChain = useMemo(() => props.renderSlotChain === undefined
                ? undefined
                : (key, owner, options) => props.renderSlotChain(aliases.get(key) ?? key, owner, options), [props.renderSlotChain]);
            const render = root && options.wrap !== undefined
                ? options.wrap
                : (component, value) => h(component, value);
            return render(Native, {
                ...props,
                ...(translate === sourceTranslate ? {} : { t: translate }),
                ...(renderSlot === undefined
                    ? {}
                    : {
                        renderSlot,
                    }),
                ...(renderSlotChain === undefined
                    ? {}
                    : {
                        renderSlotChain,
                    }),
            });
        };
        const registration = {
            name: destination,
            ...(root && options.factory
                ? { scope: 'session' }
                : { ...entry.options, ...(entry.select === undefined ? {} : { select: entry.select }) }),
            ...(entry.inject === undefined ? {} : { inject: entry.inject }),
            ...(entry.store === undefined ? {} : { store: entry.store }),
            ...(entry.locale === undefined ? {} : { locale: entry.locale }),
            ...(entry.children === undefined
                ? {}
                : {
                    children: Object.fromEntries(Object.entries(entry.children).map(([key, spec]) => [aliases.get(key), spec])),
                }),
        };
        const dispose = (root && options.factory ? factory : register)({ ...registration, ...(root ? options.registration : {}) }, Component);
        const children = [...aliases].map(([source, target]) => {
            const mounted = new Map();
            const sync = () => {
                const entries = sourceEntries(source);
                for (const [old, release] of mounted)
                    if (!entries.includes(old)) {
                        release();
                        mounted.delete(old);
                    }
                for (const next of entries)
                    if (!mounted.has(next))
                        mounted.set(next, mount(next, target, false));
            };
            const unsubscribe = ctx.slots.subscribe(source, sync);
            sync();
            return () => {
                unsubscribe();
                for (const release of mounted.values())
                    release();
            };
        });
        return () => {
            anchors?.flush();
            children.forEach((release) => release());
            dispose();
            for (const alias of aliases.values())
                semanticAliases.delete(alias);
        };
    };
    let release;
    try {
        release = mount(entry, destination, true);
    }
    catch (error) {
        anchors?.dispose();
        throw error;
    }
    return () => {
        anchors?.dispose();
        semanticAliases.clear();
        release();
    };
}
/** Reuse the registered native Tool tree including its injected hooks, stores,
 * locale and third-party child renderers. Factories cannot redeclare an existing
 * slot, so give this presentation-only occurrence its own declaration names.
 * No component, classifier, CSS, execution event or approval is copied.
 */
export function installNativeToolRenderer(ctx) {
    ctx.slots.inject('conversation.chat.node', () => {
        let current;
        let release;
        const sync = () => {
            const entries = ctx.slots.entries('conversation.chat.node');
            const next = entries.find((entry) => entry.options.key === 'tool-call' && entry.registrant !== 'acp-chat-normalization');
            if (next === current)
                return;
            release?.();
            release = undefined;
            current = next;
            if (next !== undefined)
                release = mountNativeEntry(ctx, next, 'acp.native-tool', { factory: true });
        };
        const unsubscribe = ctx.slots.subscribe('conversation.chat.node', sync);
        sync();
        return () => {
            unsubscribe();
            release?.();
        };
    });
}
//# sourceMappingURL=native-tool-renderer.js.map