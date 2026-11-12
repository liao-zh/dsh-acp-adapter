/**
 * Qwen Code background tasks mirrored as native DSH jobs.
 *
 * Qwen runs shells (`is_background`), subagents (`run_in_background`),
 * monitors and workflows past the end of a `session/prompt`. When one
 * finishes it emits an out-of-turn `agent_message_chunk`
 * (`_meta.source: 'background_task_completed'`) and, once idle, starts a turn
 * by itself announced with `_qwencode/start_turn`.
 *
 * DSH only runs a turn when the native AgentLoop asks the provider, so each
 * running task is registered with `ctx.jobs` (visible, killable, keeps the
 * session's work accounted for). A completion that Qwen turns into its own
 * turn settles the job *unawaited*: the native `tool-jobs` plugin then wakes
 * the idle DSH agent, whose provider call adopts the already-running Qwen
 * turn instead of sending a new prompt. Completions Qwen folds into an active
 * prompt settle *awaited*, so no extra wake-up is produced.
 */
import type { AcpSessionNotification } from '../../protocol/v1/types.ts';
/** Native job kind; also the marker the host uses to recognise the wake notice. */
export declare const QWEN_TASK_JOB_KIND = "acp-qwen-task";
export interface QwenTaskJobOutcome {
    readonly status: 'completed' | 'killed' | 'failed';
    readonly detail: string;
    readonly result?: string;
    /** true = settle as already collected (no completion notice / wake-up). */
    readonly silent: boolean;
}
export interface QwenTaskJobHooks {
    cancel(): void;
    done: Promise<QwenTaskJobOutcome>;
}
/** Host seam over `ctx.jobs`; undefined result = registration refused. */
export type QwenTaskJobStarter = (label: string, run: (updateProgress?: (line: string) => void) => QwenTaskJobHooks) => {
    cancel(): void;
} | undefined;
export interface QwenTaskSnapshot {
    readonly id: string;
    readonly kind: string;
    readonly label: string;
    readonly status: string;
}
export interface QwenBackgroundDeps {
    readonly startJob: QwenTaskJobStarter;
    /** `qwen/status/session/tasks`; resolves undefined when unavailable. */
    readonly listTasks: () => Promise<readonly QwenTaskSnapshot[] | undefined>;
    /** `qwen/control/session/task/cancel`. */
    readonly cancelTask: (taskId: string, kind: string) => Promise<unknown>;
    /** How long a completion waits for `_qwencode/start_turn` before settling silently. */
    readonly turnWaitMs?: number;
    readonly log?: (message: string) => void;
}
/** Parse a task notice; undefined means another notification type. An unknown
 * status retains the notice identity so routing cannot mistake it for an
 * automatic model turn, but it is not evidence that the task finished. */
export declare function qwenTaskCompletion(notification: AcpSessionNotification): {
    taskId: string;
    kind?: string;
    status: QwenTaskJobOutcome['status'] | undefined;
    label?: string;
    text: string;
} | undefined;
/** Parse `qwen/status/session/tasks`'s result defensively. */
export declare function qwenTaskSnapshots(value: unknown): readonly QwenTaskSnapshot[] | undefined;
export declare class QwenBackgroundTasks {
    private readonly deps;
    private readonly tasks;
    private refreshing;
    private closed;
    private closing;
    private cancelObservation;
    constructor(deps: QwenBackgroundDeps);
    /** Mirror running tasks and collect explicit cancelled-task outcomes. Never throws. */
    refresh(): Promise<void>;
    /**
     * Out-of-turn completion. Hold the settlement briefly: if Qwen announces a
     * turn for this task it becomes the wake-up, otherwise it settles silently.
     * @param promptActive - a host prompt is running; Qwen folds the result there.
     */
    complete(completion: NonNullable<ReturnType<typeof qwenTaskCompletion>>, promptActive: boolean): void;
    /**
     * `_qwencode/start_turn` was accepted. Settle (or create and settle) the
     * task's job unawaited so DSH wakes the agent. Returns false when no job
     * registry is available, i.e. nothing will adopt the turn.
     */
    wake(turn: {
        readonly taskId?: string;
        readonly kind?: string;
        readonly label?: string;
    }): boolean;
    /** Stop observation/admission while the owning connection performs its bounded cleanup. */
    beginClose(): void;
    /** Called after managed-range cleanup, never merely after requesting cancellation. */
    close(exitConfirmed: boolean): void;
    private observeCancellation;
    private mirror;
    private settle;
}
//# sourceMappingURL=qwen-background.d.ts.map