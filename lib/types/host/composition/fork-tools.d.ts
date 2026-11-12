import type { Context } from '@deepseek-ai/cordis';
/**
 * Reject a known ACP child target when an active parent can only offer a
 * completed-history prefix. Tool definitions do not expose their configured
 * child route, so omitted targets retain native route validation and the ACP
 * provider's final seeded-fork gate. Keep the schema visible for native routes.
 * @param ctx - Host composition owning the projection and execution guard.
 */
export declare function installAcpForkTools(ctx: Context): void;
//# sourceMappingURL=fork-tools.d.ts.map