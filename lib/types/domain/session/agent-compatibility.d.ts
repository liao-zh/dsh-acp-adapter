/** Narrow compatibility rules for confirmed vendor behavior; no catalog or launch defaults. */
import type * as acp from '@agentclientprotocol/sdk';
import type { AcpAgentId } from '../../contract/agent-config.ts';
export declare function executableOverrideEnvFor(runtime: AcpAgentId | undefined): string | undefined;
/** These Agents advertise different reasoning choices after selecting each model. */
export declare function modelProbeOptions(runtime: AcpAgentId | undefined): {
    probeModelConfigOptions: boolean;
    probeModelConfigConcurrency: number;
};
/** Opt into Claude's draft subagent notifications only for an explicitly bound runtime. */
export declare function sessionProtocolExtensions(runtime: AcpAgentId | undefined): {
    enableClaudeDraftSubagents: boolean;
};
/** Kimi may resume `high` as `on`; accept only the live Agent-confirmed equivalent.
 * All other values still require exact equality or normal option validation.
 */
export declare function reasoningRequestIsCurrent(runtime: AcpAgentId | undefined, option: Extract<acp.SessionConfigOption, {
    type: 'select';
}>, requested: string): boolean;
//# sourceMappingURL=agent-compatibility.d.ts.map