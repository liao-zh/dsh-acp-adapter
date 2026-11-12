import type { AcpTerminalFailureFacts } from '../../domain/policy/events.ts';
/** Never retain argv, environment values, paths from errors, or OS display text. */
export declare function terminalFailureFacts(error: unknown, command: string, args: readonly string[], attempt: AcpTerminalFailureFacts['attempt'], phase: AcpTerminalFailureFacts['phase']): AcpTerminalFailureFacts;
//# sourceMappingURL=terminal-failure.d.ts.map