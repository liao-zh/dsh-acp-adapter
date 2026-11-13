import type { AcpHostToolControlOutcome } from '../../contract/tool-control-outcome.ts';
export declare const DEFERRED_WAIT_META = "zaimokuza.dsh/acp-control";
export declare const DEFERRED_WAIT_TEXT = "DSH_WAIT_DEFERRED_TEAM_MESSAGE: A Team message is already queued for this caller, so DSH did not execute wait_agent. End this ACP response now; DSH will deliver the queued message for you to handle.";
/** Scoped to one bridge prompt. Opaque receipts correlate actual replies, not
 * timestamps, arguments, provider labels, or MCP/ACP request-id coincidences. */
export declare class DeferredWaitReceipts {
    private readonly dshSessionId;
    private readonly limit;
    private readonly receipts;
    private readonly claims;
    private readonly receiptByCall;
    constructor(dshSessionId: string, limit?: number);
    clear(): void;
    issue(): Record<string, string> | undefined;
    observe(toolCallId: string, rawOutput: unknown): void;
    outcome(toolCallId: string): AcpHostToolControlOutcome | undefined;
    revoke(toolCallId: string): void;
}
//# sourceMappingURL=deferred-wait-receipts.d.ts.map