import type { AcpAuditTimelineEntry, AcpRemoteLike } from './acp-remote.ts';
import type { AcpActivityView, AcpRecoveryView } from '../../contract/remote.ts';
export declare const ACP_SUPPORT_EXPORT_SCHEMA = "dsh-acp-support";
export declare const ACP_SUPPORT_EXPORT_SCHEMA_VERSION = 1;
export declare const ACP_SUPPORT_EXPORT_PAGE_SIZE = 100;
export declare const ACP_SUPPORT_EXPORT_MAX_AUDIT_ROWS = 5000;
export declare const ACP_SUPPORT_EXPORT_MAX_ACTIVITY_ROWS = 5000;
/** Bounded, content-free audit row for a user-selected ACP session. */
export interface AcpSupportAuditRow {
    readonly session: 'session-1';
    readonly sequence: number;
    readonly time: number;
    readonly kind: string;
    readonly severity: AcpAuditTimelineEntry['severity'];
    readonly category: AcpAuditTimelineEntry['category'];
    readonly summaryCode: AcpAuditTimelineEntry['summaryCode'];
    readonly status: string | null;
}
/** Safe summary of one activity revision; tool text, paths, and raw ids are omitted. */
export interface AcpSupportActivityRow {
    readonly session: 'session-1';
    readonly activity: string;
    readonly revision: number;
    readonly time: number;
    readonly kind: AcpActivityView['kind'];
    readonly status: AcpActivityView['status'];
}
export interface AcpSupportExport {
    readonly schema: typeof ACP_SUPPORT_EXPORT_SCHEMA;
    readonly schemaVersion: typeof ACP_SUPPORT_EXPORT_SCHEMA_VERSION;
    readonly adapterVersion: string;
    readonly captureStartedAt: number;
    readonly exportedAt: number;
    readonly runtimeHostVersion: null;
    readonly sessionAlias: 'session-1';
    readonly recovery: {
        readonly status: 'available' | 'unavailable';
        readonly capturedAt: number;
        readonly kind: AcpRecoveryView['kind'] | null;
        readonly cause: string | null;
        readonly localStatus: NonNullable<AcpRecoveryView['localStatus']> | null;
        readonly updatedAt: number | null;
    };
    readonly audit: {
        readonly snapshotHead: number;
        readonly rows: readonly AcpSupportAuditRow[];
        readonly unreadableRecords: number;
        readonly storedRecordsReachedHead: boolean;
        readonly truncated: boolean;
        readonly possibleHistoricalLoss: true;
    };
    readonly activity: {
        readonly snapshotHead: number;
        readonly rows: readonly AcpSupportActivityRow[];
        readonly storedRecordsReachedHead: boolean;
        readonly truncated: boolean;
        readonly historicalLoss: 'unknown';
    };
    readonly unavailable: {
        readonly providerPromptTrace: true;
        readonly providerUsage: true;
        readonly nativeSessionLog: true;
        readonly crossMemberCorrelation: true;
    };
}
export declare class AcpSupportExportError extends Error {
    readonly code: 'unavailable' | 'invalid-page' | 'session-changed';
    constructor(code: 'unavailable' | 'invalid-page' | 'session-changed');
}
/** Read a fixed, bounded snapshot of safe ACP diagnostics for local preview/export. */
export declare function collectAcpSupportExport(remote: Pick<AcpRemoteLike, 'auditTimeline' | 'activityPage' | 'recoverySnapshot'>, sessionId: string, adapterVersion: string, isCurrent?: () => boolean, now?: () => number, signal?: AbortSignal): Promise<AcpSupportExport>;
/** JSON filename does not contain the host session id. */
export declare function acpSupportExportFilename(at: number): string;
/** Start a local browser download in response to the user's explicit export action. */
export declare function downloadAcpSupportExport(value: AcpSupportExport): void;
//# sourceMappingURL=acp-support-export.d.ts.map