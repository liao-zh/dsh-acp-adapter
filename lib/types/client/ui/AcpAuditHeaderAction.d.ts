import type { ReactNode } from 'react';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-store';
import type { SessionSnapshot, UseProjection } from '@deepseek-ai/dsh-api-session-controller/client';
import type { UseSessionRetainInfo } from '@deepseek-ai/dsh-client-ui-session/client';
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { AcpAuditTimelineEntry } from '../data/acp-remote.ts';
import type { AcpRemoteLike } from '../data/acp-remote.ts';
import type { AcpLocaleKey } from './locales.ts';
import type { OwnsAcpRoute } from '../coordinator/cross-backend-coordinator.ts';
import type { AcpDiagnosticView } from '../../contract/remote.ts';
import { type AcpJsonStringWrapping } from './json-tree.ts';
type Translate = (key: AcpLocaleKey, params?: Record<string, string | number>) => string;
type Filter = AcpDiagnosticView;
export interface AcpAuditVisibilityGateProps {
    sessionId?: string;
    useSession?: SnapshotSelectorHook<SessionSnapshot>;
    useSessionRetainInfo: UseSessionRetainInfo;
    useProjection: UseProjection;
    remote?: AcpRemoteLike;
    ownsRoute: OwnsAcpRoute;
    onVisibilityChange(sessionId: string, visible: boolean): void;
}
export interface AcpAuditViewProps extends ConvViewProps {
    remote?: AcpRemoteLike;
    t?: Translate;
    jsonStringWrapping?: AcpJsonStringWrapping;
}
export declare function auditHeaderVisible(backend: {
    readonly state: string;
    readonly provider?: string;
} | null | undefined, ownsRoute: OwnsAcpRoute): boolean;
/** 原生模型会话在本地投影门直接旁路，不发 ACP Remote 请求。 */
export declare function auditProjectionIsAcp(selection: unknown, ownsRoute: OwnsAcpRoute): boolean;
/** 首轮建立 binding 或宿主恢复后触发一次可见性复核。 */
export declare function auditSessionRefreshKeyOf(snapshot: {
    readonly blank: boolean;
    readonly promptAttempted: boolean;
    readonly awaitingFirstTurn: boolean;
    readonly running: boolean;
    readonly openState: string;
    readonly lastAgentError: string | null;
} | null | undefined): string;
export declare function auditEntryMatchesFilter(entry: AcpAuditTimelineEntry, filter: Filter): boolean;
/** Search only user-meaningful audit facts; compact raw JSON stays in details. */
export declare function auditEntryMatchesQuery(t: Translate, entry: AcpAuditTimelineEntry, query: string): boolean;
/** Display only explicit recorded reasons, never infer a cause from an outcome. */
export declare function auditRecordedCause(entry: AcpAuditTimelineEntry): string | null;
export declare function auditSummaryOf(t: Translate, entry: AcpAuditTimelineEntry): string;
/**
 * 只由 mainView 决定 ACP 诊断 Tab；侧栏引用不能夺取或撤销主区域入口。
 * `conversation.view` 仍是全局 roster，以主区域的标准投影决定可见性，
 * 避免原生会话被插件增加无意义的 Tab。
 */
export declare function AcpAuditVisibilityGate(props: AcpAuditVisibilityGateProps): ReactNode;
export declare function createAcpAuditView(remote: AcpRemoteLike, jsonStringWrapping?: AcpJsonStringWrapping): (props: AcpAuditViewProps) => ReactNode;
export {};
//# sourceMappingURL=AcpAuditHeaderAction.d.ts.map