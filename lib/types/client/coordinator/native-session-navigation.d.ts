/** Navigation through DSH's Session ownership and native resource presentation. */
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { ISidebarRight } from '@deepseek-ai/dsh-client-ui-sidebar-right/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SubagentAddress } from '@deepseek-ai/dsh-subagent/client';
export declare function isMainSession(sessions: ISessions, sessionId: SessionId): boolean;
/**
 * The alpha.2 ui-subagent resource provider owns retention, restoration and rendering.
 * Keep its wire address here; do not import the upstream private source helper or
 * mount another Conversation implementation. Both direct-parent identity and mode
 * are required so a restored tab cannot turn a read-only projection into a live child.
 */
export declare function openSubagentAside(sidebar: ISidebarRight, address: SubagentAddress): void;
//# sourceMappingURL=native-session-navigation.d.ts.map