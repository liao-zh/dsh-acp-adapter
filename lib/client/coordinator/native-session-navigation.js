export function isMainSession(sessions, sessionId) {
    return (sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) > 0;
}
/**
 * The alpha.2 ui-subagent resource provider owns retention, restoration and rendering.
 * Keep its wire address here; do not import the upstream private source helper or
 * mount another Conversation implementation. Both direct-parent identity and mode
 * are required so a restored tab cannot turn a read-only projection into a live child.
 */
export function openSubagentAside(sidebar, address) {
    const query = new URLSearchParams({ parent: address.parentSessionId, mode: address.mode });
    sidebar.openResource(`dsh-resource://subagentchat/session/${encodeURIComponent(address.childSessionId)}?${query}`, {
        kind: 'subagentchat',
        preferNewPane: true,
    });
}
//# sourceMappingURL=native-session-navigation.js.map