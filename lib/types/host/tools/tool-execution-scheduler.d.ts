/** A session-local barrier for the ToolRuntime's native execution modes. */
export declare class ToolExecutionScheduler {
    private readonly waiting;
    private activeParallel;
    private activeExclusive;
    acquire(classify: () => unknown, signal: AbortSignal): Promise<(() => void) | undefined>;
    private drain;
    private once;
    private readonly releaseExclusive;
    private readonly releaseParallel;
}
//# sourceMappingURL=tool-execution-scheduler.d.ts.map