import type { ReactNode } from 'react';
import type { AgentDraft } from '../data/logic.ts';
import type { AcpLocaleKey } from './locales.ts';
import type { AcpPanelSnapshot } from '../data/stores/panel-store.ts';
/** The section's translate seat (slot renderer binds it from the entry's `locale` declaration). */
export type AcpTranslate = (key: AcpLocaleKey, params?: Record<string, string | number>) => string;
/** The framework-synthesized selector hook over the entry's store (PropsStore share). */
export type UsePanelStore = <S>(selector: (snapshot: AcpPanelSnapshot) => S, equal?: (a: S, b: S) => boolean) => S;
/** The controller wire handed to the section (bound in apply; plain callbacks). */
export interface AcpSectionWire {
    /** recheck = true 即「重新检查」（收尾：丢弃 probe 缓存并重探）；省略 = 只读缓存视图。 */
    refreshHealth(recheck?: boolean): void;
    refreshAgentHealth(agentId: string): void;
    saveAgent(editingId: string | undefined, draft: AgentDraft): Promise<string | undefined>;
    deleteAgent(id: string): Promise<string | undefined>;
    notifyOutcome?(outcome: 'saved' | 'save-failed' | 'deleted' | 'delete-failed'): void;
    setToolApprovalDefault(policy: 'auto' | 'ask'): Promise<string | undefined>;
    /**
     * 删除确认提示：该 profile 的既有会话 binding 计数；undefined = 计数不可
     * 得（RPC 失败/畸形），确认块退回无计数的基础文案（不冒充 0）。
     */
    countBoundSessions(id: string): Promise<number | undefined>;
}
/** Injected props of the section; Partial because the renderer erases the share boundary. */
export interface AcpSectionProps {
    t?: AcpTranslate | undefined;
    useStore?: UsePanelStore | undefined;
    panel?: AcpSectionWire | undefined;
}
/**
 * Render the ACP section content column.
 * @param props - slot-delivered inject face.
 * @returns the section, or null while the shell has not injected yet (ModelsSection precedent).
 */
export declare function AcpSection(props: AcpSectionProps): ReactNode;
//# sourceMappingURL=AcpSection.d.ts.map