import type { AcpAgentSessionSnapshotView, AcpAgentSessionOptionWrite } from './remote.ts';
export declare function teamModeChoices(snapshot: AcpAgentSessionSnapshotView): {
    id: string;
    name: string;
    label: string;
    current: boolean;
    write: AcpAgentSessionOptionWrite;
}[];
/** Display the effective ACP mode, including an uncommitted next-run choice. */
export declare function teamModeLabel(snapshot: AcpAgentSessionSnapshotView, fallback: string): string;
//# sourceMappingURL=session-modes.d.ts.map