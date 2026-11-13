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
import { defineStore } from '@deepseek-ai/dsh-client-store';
const initialPanelState = () => ({
    // 与 controller 的首投影同形：scope 尚未 ready 时面板显示 loading（attach
    // 时的 resync 会立刻把真实投影灌进来，这只是工厂播种值）。
    settings: {
        status: 'loading',
        writable: false,
        agents: {},
        toolApprovalDefault: 'auto',
        revision: undefined,
    },
    health: {
        status: 'idle',
        rows: [],
        fetchedAt: undefined,
        message: undefined,
        checkingAgentIds: [],
        agentErrors: {},
    },
});
/** The panel's complete write set — every glue publish routes through one of these. */
const panelActions = {
    /** Mirror the settings scope's current projection (scope subscription + attach resync). */
    settingsMirrored(draft, settings) {
        draft.settings = settings;
    },
    /** A health refresh started (concurrent refreshes fold in the glue). */
    healthLoading(draft) {
        draft.health.status = 'loading';
        draft.health.message = undefined;
        draft.health.checkingAgentIds = [];
        draft.health.agentErrors = {};
    },
    /** A refresh landed: rows replace wholesale, the error clears. */
    healthReady(draft, rows, fetchedAt) {
        draft.health = {
            status: 'ready',
            rows,
            fetchedAt,
            message: undefined,
            checkingAgentIds: [],
            agentErrors: {},
        };
    },
    /** A refresh failed (network/HTTP/malformed): keep the last good rows, surface the message. */
    healthUnreachable(draft, message) {
        draft.health.status = 'unreachable';
        draft.health.message = message;
        draft.health.checkingAgentIds = [];
    },
    /** One card started a targeted probe; other cards remain interactive. */
    agentHealthLoading(draft, agentId) {
        if (!draft.health.checkingAgentIds.includes(agentId)) {
            draft.health.checkingAgentIds.push(agentId);
            draft.health.checkingAgentIds.sort();
        }
        delete draft.health.agentErrors[agentId];
    },
    /** Merge only the checked row so concurrent checks cannot overwrite each other. */
    agentHealthReady(draft, agentId, row, fetchedAt) {
        draft.health.status = 'ready';
        draft.health.message = undefined;
        draft.health.checkingAgentIds = draft.health.checkingAgentIds.filter((id) => id !== agentId);
        delete draft.health.agentErrors[agentId];
        const index = draft.health.rows.findIndex((candidate) => candidate.id === agentId);
        draft.health.rows =
            index < 0
                ? [...draft.health.rows, row].sort((left, right) => left.id.localeCompare(right.id))
                : draft.health.rows.map((candidate, candidateIndex) => (candidateIndex === index ? row : candidate));
        draft.health.fetchedAt = fetchedAt;
    },
    /** A targeted transport/contract failure belongs to that card, not the whole panel. */
    agentHealthFailed(draft, agentId, message) {
        draft.health.checkingAgentIds = draft.health.checkingAgentIds.filter((id) => id !== agentId);
        draft.health.agentErrors[agentId] = message;
    },
    /**
     * Wholesale projection resync: the attach path replays the glue's
     * authoritative state into a fresh store in one publish.
     */
    resync(draft, next) {
        draft.settings = next.settings;
        draft.health = next.health;
    },
};
/**
 * The exclusive-factory registration currency of the panel's store seat.
 * @returns a fresh handle (one per entry — never share at module level).
 */
export function createAcpPanelStore() {
    return defineStore({ init: initialPanelState, actions: panelActions });
}
//# sourceMappingURL=panel-store.js.map