/**
 * The ACP configuration page's store seat: the `plugins.bundle.config`
 * registration declares `store: createAcpPanelStore` (exclusive factory — the
 * framework mints the handle per entry; nothing module-level), and the glue
 * controller publishes through the baked actions it receives at attach time.
 *
 * State and its semantic write set live here (the store IS the view-facing
 * audit face); the controller keeps the authoritative private projection
 * (scope guards and revision fencing read it) and mirrors every transition
 * through these actions, resyncing wholesale on attach so a re-created entry
 * store catches up in one publish.
 * @module @zaimokuza/dsh-acp-adapter/client/stores/panel-store
 */
import type { AcpProviderHealth, PanelSettingsState } from '../logic.ts';
import type { BakedActions, StoreHandle } from '@deepseek-ai/dsh-client-store';
/** The panel's health state: the last good rows ride through later failures so a refresh error erases nothing. */
export interface HealthState {
    /** 'idle' until the panel first mounts; 'unreachable' = the dshAcp Remote namespace cannot be reached (host half absent/down). */
    status: 'idle' | 'loading' | 'ready' | 'unreachable';
    rows: readonly AcpProviderHealth[];
    fetchedAt: number | undefined;
    message: string | undefined;
    /** 正在执行卡片级检查的 agent；不同 agent 可并行，同一 agent 自动去重。 */
    checkingAgentIds: string[];
    /** 卡片级检查的传输/载荷错误；成功重检或全量刷新会清除对应错误。 */
    agentErrors: Record<string, string>;
}
/** The panel store's published snapshot. */
export interface AcpPanelSnapshot {
    settings: PanelSettingsState;
    health: HealthState;
}
/** The panel's complete write set — every glue publish routes through one of these. */
declare const panelActions: {
    /** Mirror the settings scope's current projection (scope subscription + attach resync). */
    settingsMirrored(draft: AcpPanelSnapshot, settings: PanelSettingsState): void;
    /** A health refresh started (concurrent refreshes fold in the glue). */
    healthLoading(draft: AcpPanelSnapshot): void;
    /** A refresh landed: rows replace wholesale, the error clears. */
    healthReady(draft: AcpPanelSnapshot, rows: readonly AcpProviderHealth[], fetchedAt: number): void;
    /** A refresh failed (network/HTTP/malformed): keep the last good rows, surface the message. */
    healthUnreachable(draft: AcpPanelSnapshot, message: string): void;
    /** One card started a targeted probe; other cards remain interactive. */
    agentHealthLoading(draft: AcpPanelSnapshot, agentId: string): void;
    /** Merge only the checked row so concurrent checks cannot overwrite each other. */
    agentHealthReady(draft: AcpPanelSnapshot, agentId: string, row: AcpProviderHealth, fetchedAt: number): void;
    /** A targeted transport/contract failure belongs to that card, not the whole panel. */
    agentHealthFailed(draft: AcpPanelSnapshot, agentId: string, message: string): void;
    /**
     * Wholesale projection resync: the attach path replays the glue's
     * authoritative state into a fresh store in one publish.
     */
    resync(draft: AcpPanelSnapshot, next: AcpPanelSnapshot): void;
};
/** Baked (draft-stripped) form the glue receives at attach time. */
export type AcpPanelStoreActions = BakedActions<AcpPanelSnapshot, typeof panelActions>;
/**
 * The exclusive-factory registration currency of the panel's store seat.
 * @returns a fresh handle (one per entry — never share at module level).
 */
export declare function createAcpPanelStore(): StoreHandle<AcpPanelSnapshot, typeof panelActions>;
export {};
//# sourceMappingURL=panel-store.d.ts.map