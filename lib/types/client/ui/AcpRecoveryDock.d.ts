import type { ReactNode } from 'react';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { RemoteStreamFactory } from '@deepseek-ai/dsh-api-gateway/client';
import type { AcpRecoveryView, AcpRemoteLike } from '../data/acp-remote.ts';
import type { OwnsAcpRoute } from '../coordinator/cross-backend-coordinator.ts';
import type { AcpLocaleKey } from './locales.ts';
import type { SessionAccessSource } from './session-action-access.ts';
type RecoveryDockProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'acpActivity'> & {
    readonly remote: AcpRemoteLike;
    readonly streamFactory: RemoteStreamFactory;
    readonly createNewSession: (sourceSessionId: string) => Promise<void>;
    readonly ownsRoute: OwnsAcpRoute;
    readonly sessionAccessSource: SessionAccessSource;
};
type Translate = (key: AcpLocaleKey, params?: Record<string, unknown>) => string;
/** The stock modelSelection projection is deliberately read-only here. */
export declare function projectionIsAcp(value: unknown, ownsRoute: OwnsAcpRoute): boolean;
export declare function recoveryText(t: Translate, recovery: AcpRecoveryView): string;
/** Temporary settlement is shown only while the durable recovery outcome is healthy. */
export declare function localSettlementText(t: Translate, recovery: AcpRecoveryView): string | null;
/** Publish the recovery view returned by the completed action without a second snapshot read. */
export declare function publishRecoveryActionResult(result: AcpRecoveryView | void, isCurrent: () => boolean, publish: (snapshot: AcpRecoveryView) => void): boolean;
export declare function AcpRecoveryDock({ sessionId, useSession, useProjection, useAccess, useSessions, useWorkspaces, useRemoteAccess, useWorkspaceAccess, t, remote, streamFactory, createNewSession, ownsRoute, sessionAccessSource, }: RecoveryDockProps): ReactNode;
export {};
//# sourceMappingURL=AcpRecoveryDock.d.ts.map