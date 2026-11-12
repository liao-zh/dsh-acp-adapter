import type { AcpHostTerminalOutcome } from '../../contract/terminal-outcome.ts';
import type { AcpTerminalAuditData } from '../../domain/policy/events.ts';
/** One runtime's bounded process facts, retained after terminal/release until
 * its explicit tool reference is projected. No command/time guessing or I/O. */
export declare class HostTerminalOutcomes {
    private readonly dshSessionId;
    private readonly profileId;
    private readonly limit;
    private readonly facts;
    private readonly listeners;
    constructor(dshSessionId: string, profileId: string, limit?: number);
    observe(event: AcpTerminalAuditData): void;
    resolve(acpSessionId: string | undefined, content: unknown): AcpHostTerminalOutcome | undefined;
    subscribe(listener: () => void): () => void;
}
//# sourceMappingURL=terminal-outcomes.d.ts.map