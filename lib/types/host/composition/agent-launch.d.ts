/** Prepare a native Agent process, including the optional Devin native MCP registration. */
import type * as acp from '@agentclientprotocol/sdk';
import type { AcpAgentId, AcpStubAgentConfig } from '../../contract/agent-config.ts';
import type { AcpRuntimeLaunch } from '../../runtime/session/session-runtime.ts';
import type { SubprocessSeam } from '../../runtime/process/subprocess.ts';
import type { AcpMcpLease } from '../../runtime/session/mcp-lease.ts';
export declare function prepareAgentLaunch(runtime: AcpAgentId | undefined, config: AcpStubAgentConfig, cwd: string, subprocess: SubprocessSeam, createMcpLease: ((capabilities: acp.AgentCapabilities) => Promise<AcpMcpLease | undefined>) | undefined): Promise<AcpRuntimeLaunch>;
//# sourceMappingURL=agent-launch.d.ts.map