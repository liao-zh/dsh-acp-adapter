import type { Context } from '@deepseek-ai/cordis';
import type { ToolSchema } from '@deepseek-ai/dsh-llm';
import type * as acp from '@agentclientprotocol/sdk';
import type { AcpMcpLease } from '../../runtime/session/mcp-lease.ts';
/** Registry-owned identity keys track scoped tool and visible schema changes. */
export declare function createDshToolBridgeKey(): (ctx: Context, sessionId: string, schemas?: readonly ToolSchema[]) => unknown;
/** Discover native session tools without enabling any host plugin or Teams service. */
export declare function createDshToolBridge(ctx: Context, sessionId: string, capabilities: acp.AgentCapabilities | undefined, wireProfile?: string, resolveApprovalPolicy?: () => Promise<'auto' | 'ask'>, onPolicyContextChange?: () => void, schemas?: readonly ToolSchema[]): Promise<AcpMcpLease | undefined>;
//# sourceMappingURL=bridge.d.ts.map