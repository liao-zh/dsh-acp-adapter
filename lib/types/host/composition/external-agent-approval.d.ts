import type { Context } from '@deepseek-ai/cordis';
import { type Agent } from '@deepseek-ai/dsh-agent';
import type { AcpNativeApprovalService } from '../../domain/policy/permissions.ts';
/**
 * ACP owns these requests and their durable audit. Reuse the public native
 * answerer chain and pending card, without changing the Session policy that
 * DSH tools execute under. This is never installed as the Host approval service.
 */
export declare function externalAgentApproval(ctx: Context, getAgent: () => Agent | undefined): AcpNativeApprovalService;
//# sourceMappingURL=external-agent-approval.d.ts.map