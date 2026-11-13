import { Context, Service } from '@deepseek-ai/cordis';
import { agentCarrier } from '@deepseek-ai/dsh-agent';
import type { AcpExternalPolicyDecision, AcpExternalPolicyRequest } from '../../contract/permission-policy.ts';
export type { AcpExternalPolicyDecision, AcpExternalPolicyRequest, AcpPermissionFacts, } from '../../contract/permission-policy.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        acpPermissionPolicy: AcpPermissionPolicy;
    }
    interface Events {
        /**
         * Opt-in machine policy. Call `next()` to defer; never open UI here.
         * This event has no connection to the native `approval/request` chain.
         * @mode waterfall
         */
        'dsh-acp/permission-policy'(this: ReturnType<typeof agentCarrier>, request: AcpExternalPolicyRequest, next: () => Promise<AcpExternalPolicyDecision>): Promise<AcpExternalPolicyDecision>;
    }
}
/**
 * Host-local dispatch only. The existing permission handler owns asked/decided
 * audit, response mapping, and complete human fallback; this service owns no
 * authorization state or persistence.
 */
export default class AcpPermissionPolicy extends Service {
    private accepting;
    private readonly lifetime;
    private readonly active;
    constructor(ctx: Context);
    evaluate(request: AcpExternalPolicyRequest): Promise<AcpExternalPolicyDecision>;
}
//# sourceMappingURL=external-permission-policy.d.ts.map