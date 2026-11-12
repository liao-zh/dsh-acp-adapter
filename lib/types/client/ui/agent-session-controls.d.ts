import type { AcpAgentSessionSnapshotView, AcpAgentSessionOptionWrite } from '../data/acp-remote.ts';
import type { ToolApprovalPolicySnapshot } from '../data/tool-approval-policy-stream.ts';
import type { AcpLocaleKey } from './locales.ts';
export type AgentControlTranslate = (key: AcpLocaleKey, params?: Record<string, unknown>) => string;
type Translate = AgentControlTranslate;
export interface AgentControlChoice {
    readonly id: string;
    readonly label: string;
    readonly description?: string | null;
    readonly group?: string;
    readonly current: boolean;
    readonly write: AcpAgentSessionOptionWrite | {
        readonly kind: 'tool-approval-policy';
        readonly policy: 'auto' | 'ask';
    };
    readonly disabled: boolean;
}
export interface AgentControlGroup {
    readonly kind: 'mode' | 'config' | 'policy';
    readonly id: string;
    readonly name: string;
    readonly current: string;
    readonly description?: string | null;
    readonly choices: readonly AgentControlChoice[];
}
/** Normalize ACP settings once; native Menu owns selection styling and keyboard navigation. */
export declare function agentControlMenuGroups(snapshot: AcpAgentSessionSnapshotView, t: Translate): AgentControlGroup[];
export declare function toolApprovalPolicyGroup(snapshot: ToolApprovalPolicySnapshot, t: Translate): AgentControlGroup;
export declare function agentControlLabel(snapshot: AcpAgentSessionSnapshotView, t: Translate): string;
/** Compact ACP token counts without falling back to an unqualified raw count. */
export declare function formatContextTokenCount(value: number): string;
export declare function agentControlFooter(snapshot: AcpAgentSessionSnapshotView, t: Translate): readonly {
    readonly type: 'label';
    readonly id: string;
    readonly text: string;
}[];
export {};
//# sourceMappingURL=agent-session-controls.d.ts.map