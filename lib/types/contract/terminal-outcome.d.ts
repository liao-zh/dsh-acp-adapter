/** Host-observed process termination attached to an explicitly referenced ACP
 * terminal. This is separate from the Agent's tool status and raw output. */
export interface AcpHostTerminalOutcome {
    readonly source: 'acp-client-terminal';
    readonly dshSessionId: string;
    readonly acpSessionId: string;
    readonly terminalId: string;
    readonly exitCode: number | null;
    readonly signal: string | null;
}
/** More than one terminal entry is ambiguous, even if its ids repeat. */
export declare function singleActivityTerminalId(content: unknown): string | undefined;
/** Validate the Host-only field again at the persisted presentation boundary. */
export declare function activityHostTerminalOutcome(detail: unknown, ownerDshSessionId: string): AcpHostTerminalOutcome | undefined;
//# sourceMappingURL=terminal-outcome.d.ts.map