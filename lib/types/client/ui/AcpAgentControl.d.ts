import type { ReactNode } from 'react';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { AcpRemoteLike } from '../data/acp-remote.ts';
import type { OwnsAcpRoute } from '../coordinator/cross-backend-coordinator.ts';
import type { RemoteStreamFactory } from '@deepseek-ai/dsh-api-gateway/client';
import type { AcpUiFeedback } from '../data/feedback.ts';
import type { SessionAccessSource } from './session-action-access.ts';
type AgentControlProps = PropsRuntime<'conversation.input.left'> & PropsLocale<'acpActivity'> & {
    readonly remote: AcpRemoteLike;
    readonly streamFactory: RemoteStreamFactory;
    readonly ownsRoute: OwnsAcpRoute;
    readonly getDefaultProvider: () => Promise<string | undefined>;
    readonly watchDefaultProvider: (changed: () => void) => () => void;
    readonly feedback: Pick<AcpUiFeedback, 'report'>;
    readonly sessionAccessSource: SessionAccessSource;
};
export declare function snapshotIsAcp(value: unknown, ownsRoute: OwnsAcpRoute, fallbackProvider?: string): boolean;
/** Small ACP-only control in DSH's native input-left extension point. */
export declare function AcpAgentControl({ sessionId, useProjection, useSession, useSessions, useAccess, t, remote, streamFactory, ownsRoute, getDefaultProvider, watchDefaultProvider, feedback, sessionAccessSource, }: AgentControlProps): ReactNode;
export {};
//# sourceMappingURL=AcpAgentControl.d.ts.map