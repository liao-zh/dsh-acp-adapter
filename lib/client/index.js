import { isMainSession, openSubagentAside } from "./coordinator/native-session-navigation.js";
import { AcpActivityNode } from "./ui/AcpActivityNode.js";
import { acpPromptAnchorDefinition, createAcpActivityDefinition, createAcpEffectiveRouteDefinition, createAcpLiveActivityDefinition, } from "./ui/activity-definitions.js";
import { installNativeToolRenderer } from "./ui/native-tool-renderer.js";
import { installAcpAssistantStream } from "./ui/AcpAssistantStream.js";
import { AcpActivityJournalHub } from "./data/activity-journal.js";
import { AcpUiFeedback, followAcpQuestionLimitations } from "./data/feedback.js";
import { CrossBackendCoordinator } from "./coordinator/cross-backend-coordinator.js";
import { CrossBackendModal } from "./ui/CrossBackendModal.js";
import { AcpOutcomeToast } from "./ui/AcpOutcomeToast.js";
import { AcpRecoveryDock } from "./ui/AcpRecoveryDock.js";
import { AcpAgentControl } from "./ui/AcpAgentControl.js";
import { AcpExternalSubagentComposer, followExternalSubagentRecords, selectExternalSubagentRecord, } from "./ui/AcpExternalSubagentComposer.js";
import { AcpTeamApprovals } from "./ui/AcpTeamApprovals.js";
import { followNativeTeamUi } from "./ui/native-team-ui-lifecycle.js";
import { resolveCrossBackendLocation } from "./data/cross-backend-controller.js";
import { AcpPanelController } from "./data/controller.js";
import { ManagedAcpRouteCatalog } from "./data/managed-routes.js";
import { createAcpPanelStore } from "./data/stores/panel-store.js";
import { AcpSection } from "./ui/AcpSection.js";
import { AcpPermissionQuestion, createAcpPermissionQuestionStore, isAcpPermissionQuestion, } from "./ui/acp-permission-question.js";
import { ACP_SETTINGS_NS } from "./data/logic.js";
import { AcpAuditVisibilityGate, createAcpAuditView } from "./ui/AcpAuditHeaderAction.js";
import { createAcpJsonStringWrapping } from "./ui/json-tree.js";
import { en, zh } from "./ui/locales.js";
import contribution from '../../lib/typert.remote-client.js';
export const inject = [
    'uiConversation',
    'slots',
    'locale',
    'remote',
    'remoteAccess',
    'sessions',
    'workspaces',
    'uiWorkspace',
    'sidebarRight',
    'configForms',
    'remote.settings',
    'remote.session',
];
/** Normalize ACP presentation facts and compose the registered native UI. */
async function registerUi(ctx) {
    const acpRemote = ctx.remote.dshAcp;
    const sessionAccessSource = (sessionId, action) => {
        // Host and Client merge different RemoteAccess faces into Cordis Context.
        // This UI reads only the published Client source, and never grants on absence.
        const access = ctx.get('remoteAccess');
        return typeof access?.source === 'function' ? access.source('session', sessionId, action) : undefined;
    };
    const journalHub = new AcpActivityJournalHub(acpRemote, ctx.remote);
    const sessions = ctx.get('sessions');
    const workspaces = ctx.get('workspaces');
    const openProjectedChild = (parentSessionId, childSessionId) => {
        openSubagentAside(ctx.sidebarRight, {
            parentSessionId: parentSessionId,
            childSessionId: childSessionId,
            mode: 'one-shot',
        });
    };
    const settingsScope = ctx.configForms.get(ACP_SETTINGS_NS);
    const ownedRoutes = await acpRemote.ownedProviderRoutes().catch(() => undefined);
    const managedRoutes = new ManagedAcpRouteCatalog(settingsScope, ownedRoutes?.ok === true ? ownedRoutes.value.providers : []);
    const panelController = new AcpPanelController({
        scope: settingsScope,
        mutate: (ops, revision) => settingsScope.mutate(ops, revision),
        refusedMessage: () => ctx.locale.bind('settings.acp')('settingsWriteRefused'),
        remote: acpRemote,
    });
    const feedback = new AcpUiFeedback();
    ctx.effect(() => followAcpQuestionLimitations((listener) => ctx.remote.$on('api-session/error', listener), feedback, (id) => {
        const summary = sessions.list.getSnapshot().byId[id];
        return summary?.title ?? summary?.displayTitle ?? null;
    }), 'dsh-acp: child question limitation feedback');
    const jsonStringWrapping = createAcpJsonStringWrapping();
    const panelWire = {
        refreshHealth: (recheck) => {
            void panelController.refreshHealth(recheck);
        },
        refreshAgentHealth: (agentId) => {
            void panelController.refreshAgentHealth(agentId);
        },
        saveAgent: (editingId, draft) => panelController.saveAgent(editingId, draft),
        deleteAgent: (id) => panelController.deleteAgent(id),
        notifyOutcome: feedback.report,
        setToolApprovalDefault: (policy) => panelController.setToolApprovalDefault(policy),
        countBoundSessions: (id) => panelController.countBoundSessions(id),
    };
    const settingsT = ctx.locale.bind('settings.acp');
    ctx.uiConversation.events.register(createAcpEffectiveRouteDefinition());
    ctx.uiConversation.events.register(createAcpLiveActivityDefinition(managedRoutes.owns));
    ctx.uiConversation.events.register(acpPromptAnchorDefinition);
    ctx.uiConversation.events.register(createAcpActivityDefinition(managedRoutes.owns));
    ctx.effect(() => ctx.locale.register('acpActivity', { zh, en }), 'dsh-acp: activity dictionaries');
    ctx.effect(() => ctx.locale.register('settings.acp', { zh, en }), 'dsh-acp: settings dictionaries');
    ctx.slots.inject('conversation.composer', () => followExternalSubagentRecords(sessions.list, (records) => ctx.slots.register({
        name: 'conversation.composer',
        priority: -11,
        select: (owner) => selectExternalSubagentRecord(owner, records),
        locale: 'acpActivity',
    }, AcpExternalSubagentComposer)));
    ctx.slots.inject('conversation.composer', () => ctx.slots.register({
        name: 'conversation.composer',
        priority: -1,
        select: ({ pendingInteraction }) => isAcpPermissionQuestion(pendingInteraction) ? pendingInteraction : null,
        locale: 'acpActivity',
        store: createAcpPermissionQuestionStore,
    }, AcpPermissionQuestion));
    ctx.effect(() => () => {
        panelController.dispose();
    }, 'dsh-acp: settings controller');
    ctx.effect(() => () => {
        managedRoutes.dispose();
    }, 'dsh-acp: managed route catalogue');
    ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        key: '@zaimokuza/dsh-acp-adapter',
        locale: 'settings.acp',
        store: createAcpPanelStore,
        inject: (actions) => {
            panelController.attach(actions);
            return { panel: panelWire };
        },
    }, AcpSection));
    let setAuditViewVisible = () => undefined;
    ctx.slots.inject('conversation.view', () => {
        let disposeView;
        let ownerSessionId;
        setAuditViewVisible = (sessionId, visible) => {
            if (!visible) {
                if (ownerSessionId !== sessionId)
                    return;
                disposeView?.();
                disposeView = undefined;
                ownerSessionId = undefined;
                return;
            }
            if (ownerSessionId === sessionId && disposeView !== undefined)
                return;
            disposeView?.();
            ownerSessionId = sessionId;
            disposeView = ctx.slots.register({
                name: 'conversation.view',
                id: 'dsh-acp-audit',
                order: 20,
                label: () => settingsT('auditOpen'),
                locale: 'acpActivity',
                inject: () => ({ remote: acpRemote }),
            }, createAcpAuditView(acpRemote, jsonStringWrapping));
        };
        return () => {
            setAuditViewVisible = () => undefined;
            disposeView?.();
        };
    });
    // Keep the non-rendering session gate so only bound ACP sessions contribute
    // the diagnostic tab; ordinary model sessions retain the native tab set.
    ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'dsh-acp-audit-visibility',
        order: 100,
        inject: () => ({
            remote: acpRemote,
            ownsRoute: managedRoutes.owns,
            onVisibilityChange: (sessionId, visible) => {
                setAuditViewVisible(sessionId, visible);
            },
        }),
    }, AcpAuditVisibilityGate));
    installNativeToolRenderer(ctx);
    installAcpAssistantStream(ctx, {
        journalHub,
        t: ctx.locale.bind('acpActivity'),
        jsonStringWrapping,
        onOpenProjectedChild: openProjectedChild,
    });
    ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
        name: 'conversation.chat.node',
        key: 'acp-activity',
        locale: 'acpActivity',
        inject: () => ({
            journalHub,
            onOpenProjectedChild: openProjectedChild,
            jsonStringWrapping,
        }),
    }, AcpActivityNode));
    const coordinator = new CrossBackendCoordinator(ctx, managedRoutes.owns);
    // DSH 0.2.2 removes the Agent Teams roster and the parent-authorized
    // interrupt endpoint. The ACP Team panel was built entirely from that
    // membership view, so mounting it would render an empty control that can
    // neither list nor interrupt members. Teammates are ordinary subagents now
    // and keep their native subagent UI; the shared task board is unaffected.
    void followNativeTeamUi;
    ctx.inject(['uiSession'], (approvalCtx) => {
        const actions = {
            status: approvalCtx.uiSession.sessionStatus,
            isCurrent: (sessionId) => isMainSession(sessions, sessionId),
            async loadChildren(parent) {
                const result = await acpRemote.approvalChildren(parent);
                if (!result.ok)
                    throw Object.assign(new Error(result.error.message), { code: result.error.code });
                return result.value;
            },
            async openMember(parent, child) {
                if (!isMainSession(sessions, parent))
                    return;
                const children = await actions.loadChildren(parent);
                const current = children.find((entry) => entry.sessionId === child.sessionId &&
                    entry.parentSessionId === child.parentSessionId &&
                    entry.mode === child.mode);
                if (!isMainSession(sessions, parent) || current === undefined)
                    return;
                openSubagentAside(ctx.sidebarRight, {
                    parentSessionId: current.parentSessionId,
                    childSessionId: current.sessionId,
                    mode: current.mode,
                });
            },
            resolveReason: (reason) => (reason === undefined ? undefined : ctx.locale.resolveText(reason)),
        };
        approvalCtx.slots.inject('conversation.input.dock', () => approvalCtx.slots.register({
            name: 'conversation.input.dock',
            id: 'acp-team-approvals',
            order: 95,
            locale: 'acpActivity',
            inject: () => actions,
        }, AcpTeamApprovals));
    });
    ctx.effect(() => coordinator.start(), 'dsh-acp: model transition coordinator');
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dsh-acp-cross-backend-confirmation',
        locale: 'acpActivity',
        inject: () => ({ coordinator }),
    }, CrossBackendModal));
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'dsh-acp-operation-outcomes',
        locale: 'acpActivity',
        inject: () => ({ feedback }),
    }, AcpOutcomeToast));
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
        name: 'conversation.input.dock',
        id: 'dsh-acp-recovery',
        order: 90,
        locale: 'acpActivity',
        inject: () => ({
            remote: acpRemote,
            sessionAccessSource,
            streamFactory: ctx.remote,
            ownsRoute: managedRoutes.owns,
            createNewSession: async (sourceSessionId) => {
                const row = sessions.list.getSnapshot().byId[sourceSessionId];
                const location = resolveCrossBackendLocation(sourceSessionId, workspaces.list.getSnapshot().items, row?.cwd);
                if (location === undefined)
                    throw new Error('The original session workspace is unavailable');
                const child = await sessions.create({
                    ...(location.cwd === undefined ? {} : { cwd: location.cwd }),
                    ...(location.workspaceId === undefined ? {} : { workspaceId: location.workspaceId }),
                });
                ctx.uiWorkspace.openSession(child);
            },
        }),
    }, AcpRecoveryDock));
    ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
        name: 'conversation.input.left',
        id: 'dsh-acp-agent-control',
        order: 80,
        locale: 'acpActivity',
        inject: () => ({
            remote: acpRemote,
            sessionAccessSource,
            streamFactory: ctx.remote,
            ownsRoute: managedRoutes.owns,
            feedback,
            getDefaultProvider: async () => {
                const result = await ctx.remote.session.modelCatalog();
                return result.ok ? result.value.default.provider : undefined;
            },
            watchDefaultProvider: (changed) => {
                const disposers = [
                    ctx.remote.$on('settings/document-updated', changed),
                    ctx.remote.$on('llm/adapters-updated', changed),
                    ctx.remote.$on('credentials/record-updated', changed),
                    ctx.remote.$on('credentials/reference-updated', changed),
                    ctx.on('connection/reset', changed),
                ];
                return () => {
                    for (const dispose of disposers)
                        dispose();
                };
            },
        }),
    }, AcpAgentControl));
}
/** Mount the generated namespace before starting the fiber that consumes it. */
export async function apply(ctx) {
    const disposeRemote = await ctx.remote.$mount(contribution);
    const ui = ctx.inject([...inject, 'remote.dshAcp'], registerUi);
    try {
        await ui;
    }
    catch (error) {
        await ui.dispose();
        await disposeRemote();
        throw error;
    }
    return async () => {
        await ui.dispose();
        await disposeRemote();
    };
}
//# sourceMappingURL=index.js.map