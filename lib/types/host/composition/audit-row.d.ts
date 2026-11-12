import type { AcpSidecarEntry } from '../../persistence/sidecar.ts';
import type { AcpAuditTimelineEntry } from '../../contract/remote.ts';
/** Sidecar record → structured, locale-neutral audit row. */
export declare function auditTimelineRowOf(entry: AcpSidecarEntry): AcpAuditTimelineEntry;
//# sourceMappingURL=audit-row.d.ts.map