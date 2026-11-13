import type { Context } from '@deepseek-ai/cordis';
import type { Session } from '@deepseek-ai/dsh-session';
import type { AcpSidecar } from '../../persistence/sidecar.ts';
import type { AcpToolApprovalPolicySnapshot } from '../../contract/remote.ts';
/** ACP transport approval preferences are separate from native delegated tool authority. */
export declare function createToolApprovalPolicyReader(ctx: Context, dependencies: {
    readonly sidecar: AcpSidecar | undefined;
    readonly sessionOf: (id: string) => Session | undefined;
    readonly ownsProvider: (profileId: string) => boolean;
    readonly defaultPolicy: () => 'auto' | 'ask';
}): (sessionId: string) => Promise<AcpToolApprovalPolicySnapshot>;
//# sourceMappingURL=tool-approval-policy.d.ts.map