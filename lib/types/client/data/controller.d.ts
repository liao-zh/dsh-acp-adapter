/**
 * The ACP settings panel's controller: the one impure seam between the
 * pure logic module and the component tree. It owns the settings-scope
 * subscription and the dshAcp Remote calls (the bypass-endpoint
 * fetches are gone). Every decision is
 * delegated to logic.ts; this file only moves data.
 *
 * store discipline: the controller is glue, not a store. It keeps the
 * authoritative private projection (revision fencing and refresh guards read
 * it) and publishes every transition through the baked store actions bound at
 * `attach` time — the plugin bundle configuration entry declares `store:
 * createAcpPanelStore`, and the inject factory receives the framework-baked
 * actions and hands them here. Attach replays the full projection (`resync`)
 * so a re-created entry store catches up in one publish; while unattached the
 * controller still tracks state and simply has no mirror.
 * @module @zaimokuza/dsh-acp-adapter/client/controller
 */
import type { AcpScopeSnapshot, AgentDraft } from './logic.ts';
import type { AcpRemoteLike } from './acp-remote.ts';
import type { AcpPanelStoreActions } from './stores/panel-store.ts';
/** Structural face of the Alpha client settings scope, narrowed to what the panel reads. */
export interface SettingsScopeLike {
    getSnapshot(): AcpScopeSnapshot;
    subscribe(listener: () => void): () => void;
}
/** One path-addressed settings edit (Alpha Generated Remote settings operation). */
export type AcpSettingsOp = import('@deepseek-ai/dsh-settings/types').SettingsPathOpView;
export interface AcpPanelControllerDeps {
    /** The native plugin configuration form, including its revision and write capability. */
    scope: SettingsScopeLike;
    /** Settings wire face (write side: path-addressed mutate with revision fencing). */
    mutate(ops: AcpSettingsOp[], expectedRevision?: number): Promise<boolean>;
    refusedMessage: () => string;
    /** The mounted dshAcp remote namespace; see ./acp-remote.ts. */
    remote: AcpRemoteLike;
}
export declare class AcpPanelController {
    private scopeSnapshot;
    private health;
    private sink;
    private readonly unsubscribeScope;
    private readonly remote;
    private readonly write;
    private readonly refusedMessage;
    constructor(deps: AcpPanelControllerDeps);
    /**
     * Bind the framework-baked store actions (inject factory) and replay the
     * authoritative projection into the fresh store. Re-attach replaces the
     * sink and resyncs again (entry reload path).
     * @param actions - the panel store's baked write set.
     */
    attach(actions: AcpPanelStoreActions): void;
    /** Drop the scope subscription and the mirror; the controller publishes nothing afterwards. */
    dispose(): void;
    /**
     * Call the `dshAcp/health` Remote method. Concurrent refreshes fold into the
     * in-flight one; any failure — transport, host-side throw, or a
     * contract-violating payload — lands in 'unreachable' with its message, the
     * graceful-degradation posture for an absent host half.
     * @param recheck - true = 「重新检查」（收尾：host 丢弃 probe 缓存并重探，
     *   面板按钮路径）；false/省略 = 只读缓存视图（面板打开路径，不 spawn probe）。
     */
    refreshHealth(recheck?: boolean): Promise<void>;
    /**
     * Re-probe exactly one configured agent. Different agents may run in
     * parallel; the same agent and a panel-wide refresh are deduplicated. Only
     * the returned target row is merged, preventing out-of-order concurrent
     * responses from rolling another agent back to an older snapshot.
     */
    refreshAgentHealth(agentId: string): Promise<void>;
    /**
     * Write one agent (add, edit, or rename) through the settings wire, fenced
     * by the revision the panel read at. A rename is one atomic mutate (unset +
     * set), so a refused pair cannot strand a half-moved entry. The draft MUST
     * already pass validation — the form gates its save button on it; a failure
     * here is a wiring bug and throws rather than degrading into a silent no-op.
     * @param editingId - the row being edited (undefined while adding).
     * @param draft - the staged form text.
     * @returns the host's refusal message, or undefined once the write landed.
     */
    saveAgent(editingId: string | undefined, draft: AgentDraft): Promise<string | undefined>;
    /**
     * Remove one agent. The unset names its path, so a stale panel cannot delete
     * a row it is not looking at beyond the revision fence.
     * @param id - the agent to remove.
     * @returns the host's refusal message, or undefined once the removal landed.
     */
    deleteAgent(id: string): Promise<string | undefined>;
    /** Persist the default approval behavior for DSH native tools in new sessions. */
    setToolApprovalDefault(policy: 'auto' | 'ask'): Promise<string | undefined>;
    /**
     * 删除确认提示：该 profile 的既有会话 binding 计数（dshAcp/boundSessions）。
     * RPC 失败/载荷畸形/应答张冠李戴一律归 undefined——计数是确认的增强提示
     * 而非删除门，缺失时面板退回无计数的基础文案（绝不把失败冒充成 0）。
     */
    countBoundSessions(id: string): Promise<number | undefined>;
    private mutate;
    private failHealth;
    private failAgentHealth;
    private project;
}
//# sourceMappingURL=controller.d.ts.map