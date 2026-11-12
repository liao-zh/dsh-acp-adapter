import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm';
/** One ACP execution may span native steps; only the outer stream is handed back to DSH. */
export declare class StreamHandoff {
    resume: ((options: GenerateOptions) => Promise<boolean>) | undefined;
    /** Called only when an active consumer closes before this segment ends. */
    abandon: (() => void) | undefined;
    /** Exact signal error recorded only by a cancelled local-settlement waiter. */
    localSettlementAbortReason: unknown;
    cancel: (() => void) | undefined;
    private iterator;
    private pending;
    private pendingValue;
    private requested;
    private wake;
    private draining;
    private terminalConsumerCallback;
    private readonly incompleteBlocks;
    private readonly remainder;
    suspended: boolean;
    ended: boolean;
    get closing(): boolean;
    get pendingIndex(): number | undefined;
    attach(stream: AsyncIterable<StreamChunk>): void;
    /** Run after the outer DSH consumer has received a terminal finish chunk. */
    afterTerminalFinish(callback: () => Promise<void> | void): void;
    acknowledgeTerminalFinish(): Promise<void>;
    request(): void;
    private next;
    segment(): AsyncGenerator<StreamChunk>;
    /** Release only the consumer-owned local waiter; draining still collects the remote remainder. */
    abandonConsumer(): void;
    /** Drain after releasing a local waiter, suppressing only that exact reason. */
    drainAfterAbandon(): Promise<void>;
    /** Stop the remote pull and collect its remainder; this does not abandon local settlement. */
    drain(): Promise<void>;
    /** A fallback consumer must deliver buffered output before its replacement prompt. */
    takeRemainder(): StreamChunk[];
}
//# sourceMappingURL=stream-handoff.d.ts.map