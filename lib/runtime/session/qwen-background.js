/** Native job kind; also the marker the host uses to recognise the wake notice. */
export const QWEN_TASK_JOB_KIND = 'acp-qwen-task';
const TASK_KINDS = new Set(['agent', 'shell', 'monitor', 'workflow']);
const MAX_RESULT = 16 * 1024;
const CANCEL_OBSERVE_MS = 1_000;
function plain(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** A missing task or an unfamiliar status never proves its work has stopped. */
function snapshotOutcome(status) {
    if (status === 'completed')
        return 'completed';
    if (status === 'failed' || status === 'error')
        return 'failed';
    if (status === 'cancelled' || status === 'killed' || status === 'aborted')
        return 'killed';
    return undefined;
}
function firstLine(text) {
    const line = text.split(/\r?\n/, 1)[0]?.trim() ?? '';
    if (line === '')
        return undefined;
    return line.length > 120 ? `${line.slice(0, 119)}…` : line;
}
function bounded(text) {
    return text.length > MAX_RESULT ? `${text.slice(0, MAX_RESULT)}\n[truncated]` : text;
}
/** Parse a task notice; undefined means another notification type. An unknown
 * status retains the notice identity so routing cannot mistake it for an
 * automatic model turn, but it is not evidence that the task finished. */
export function qwenTaskCompletion(notification) {
    const update = notification.update;
    if (update.sessionUpdate !== 'agent_message_chunk' || !plain(update._meta))
        return undefined;
    // `background_notification` is the same display line re-emitted when Qwen
    // starts the notification turn; the model's reply is `..._response` (kept).
    if (update._meta.source !== 'background_task_completed' && update._meta.source !== 'background_notification')
        return undefined;
    const task = update._meta.backgroundTask;
    if (!plain(task) || typeof task.taskId !== 'string' || task.taskId.length === 0)
        return undefined;
    const status = snapshotOutcome(task.status);
    const content = update.content;
    const text = plain(content) && content.type === 'text' && typeof content.text === 'string' ? content.text : '';
    return {
        taskId: task.taskId,
        ...(typeof task.kind === 'string' ? { kind: task.kind } : {}),
        ...(typeof task.label === 'string'
            ? { label: task.label }
            : typeof task.description === 'string'
                ? { label: task.description }
                : {}),
        status,
        text,
    };
}
/** Parse `qwen/status/session/tasks`'s result defensively. */
export function qwenTaskSnapshots(value) {
    if (!plain(value) || !Array.isArray(value.tasks))
        return undefined;
    const tasks = [];
    for (const item of value.tasks) {
        if (!plain(item) || typeof item.id !== 'string' || typeof item.kind !== 'string' || typeof item.status !== 'string')
            continue;
        const label = typeof item.label === 'string' && item.label.trim() !== ''
            ? item.label
            : typeof item.description === 'string' && item.description.trim() !== ''
                ? item.description
                : item.id;
        tasks.push({ id: item.id, kind: item.kind, label, status: item.status });
    }
    return tasks;
}
export class QwenBackgroundTasks {
    deps;
    tasks = new Map();
    refreshing;
    closed = false;
    closing = false;
    cancelObservation;
    constructor(deps) {
        this.deps = deps;
    }
    /** Mirror running tasks and collect explicit cancelled-task outcomes. Never throws. */
    async refresh() {
        if (this.closed || this.closing)
            return;
        this.refreshing ??= (async () => {
            try {
                const snapshot = await this.deps.listTasks();
                if (snapshot === undefined || this.closed || this.closing)
                    return;
                for (const task of snapshot) {
                    const mirrored = this.tasks.get(task.id);
                    if (mirrored?.cancelRequested === true && !mirrored.settled && mirrored.kind === task.kind) {
                        const status = snapshotOutcome(task.status);
                        if (status !== undefined)
                            this.settle(mirrored, { status, detail: status, silent: true });
                    }
                    if ((task.status === 'running' || task.status === 'paused') && !this.tasks.has(task.id))
                        this.mirror(task.id, task.kind, task.label);
                }
            }
            catch (error) {
                this.deps.log?.(`Qwen task snapshot unavailable: ${error instanceof Error ? error.message : String(error)}`);
            }
            finally {
                this.refreshing = undefined;
            }
        })();
        await this.refreshing;
    }
    /**
     * Out-of-turn completion. Hold the settlement briefly: if Qwen announces a
     * turn for this task it becomes the wake-up, otherwise it settles silently.
     * @param promptActive - a host prompt is running; Qwen folds the result there.
     */
    complete(completion, promptActive) {
        if (this.closed || completion.status === undefined)
            return;
        const status = completion.status;
        const existing = this.tasks.get(completion.taskId);
        if (existing !== undefined && completion.kind !== undefined && existing.kind !== completion.kind)
            return;
        // Started and finished inside the same prompt: Qwen folds it into that
        // turn and nothing outlives it, so there is nothing to mirror.
        if (promptActive && existing === undefined)
            return;
        const task = existing ??
            this.mirror(completion.taskId, completion.kind ?? 'agent', completion.label ?? firstLine(completion.text) ?? completion.taskId);
        if (task === undefined || task.settled || task.completion !== undefined)
            return;
        const text = bounded(completion.text);
        if (promptActive || task.cancelRequested === true) {
            this.settle(task, {
                status,
                detail: status,
                ...(text === '' ? {} : { result: text }),
                silent: true,
            });
            return;
        }
        const timer = setTimeout(() => {
            if (task.completion?.timer !== timer)
                return;
            this.settle(task, {
                status,
                detail: status,
                ...(text === '' ? {} : { result: text }),
                silent: true,
            });
        }, this.deps.turnWaitMs ?? 3_000);
        timer.unref?.();
        task.completion = { status, text, timer };
    }
    /**
     * `_qwencode/start_turn` was accepted. Settle (or create and settle) the
     * task's job unawaited so DSH wakes the agent. Returns false when no job
     * registry is available, i.e. nothing will adopt the turn.
     */
    wake(turn) {
        if (this.closed || this.closing)
            return false;
        const existing = turn.taskId === undefined ? undefined : this.tasks.get(turn.taskId);
        if (existing !== undefined &&
            !existing.settled &&
            (existing.cancelRequested !== true || existing.completion !== undefined)) {
            const completion = existing.completion;
            if (completion !== undefined)
                clearTimeout(completion.timer);
            this.settle(existing, {
                status: completion?.status ?? 'completed',
                detail: completion?.status ?? 'completed',
                ...(completion === undefined || completion.text === '' ? {} : { result: completion.text }),
                silent: false,
            });
            return true;
        }
        // Already settled silently (Qwen queued it behind a prompt) or never seen:
        // a fresh, immediately settled job carries the wake-up.
        const label = turn.label ?? existing?.label ?? turn.taskId ?? 'Qwen background task';
        const started = this.deps.startJob(label, () => ({
            cancel: () => undefined,
            done: Promise.resolve({ status: 'completed', detail: 'completed', silent: false }),
        }));
        return started !== undefined;
    }
    /** Stop observation/admission while the owning connection performs its bounded cleanup. */
    beginClose() {
        this.closing = true;
        if (this.cancelObservation !== undefined)
            clearTimeout(this.cancelObservation);
        this.cancelObservation = undefined;
    }
    /** Called after managed-range cleanup, never merely after requesting cancellation. */
    close(exitConfirmed) {
        this.beginClose();
        this.closed = true;
        for (const task of this.tasks.values()) {
            const completion = task.completion;
            this.settle(task, completion === undefined
                ? {
                    status: exitConfirmed ? 'killed' : 'failed',
                    detail: exitConfirmed
                        ? 'ACP session closed; managed process exit confirmed'
                        : 'ACP session cleanup unconfirmed; background work may still be running',
                    silent: true,
                }
                : {
                    status: completion.status,
                    detail: completion.status,
                    ...(completion.text === '' ? {} : { result: completion.text }),
                    silent: true,
                });
        }
        this.tasks.clear();
    }
    observeCancellation() {
        if (this.closed || this.closing || this.cancelObservation !== undefined)
            return;
        if (![...this.tasks.values()].some((task) => task.cancelRequested === true && !task.settled))
            return;
        this.cancelObservation = setTimeout(() => {
            this.cancelObservation = undefined;
            // This timer only schedules observation. Elapsed time never settles a job.
            void this.refresh().finally(() => this.observeCancellation());
        }, CANCEL_OBSERVE_MS);
        this.cancelObservation.unref?.();
    }
    mirror(id, kind, label) {
        if (this.closing || this.closed)
            return undefined;
        const task = { id, kind, label, settled: false };
        let resolve;
        const done = new Promise((r) => {
            resolve = r;
        });
        task.settle = resolve;
        let started;
        try {
            started = this.deps.startJob(label, (updateProgress) => ({
                cancel: () => {
                    if (task.settled || task.cancelRequested === true || this.closing || this.closed)
                        return;
                    if (!TASK_KINDS.has(task.kind))
                        throw new Error(`Qwen task kind cannot be cancelled: ${task.kind}`);
                    task.cancelRequested = true;
                    updateProgress?.('Cancellation requested; awaiting task status');
                    // Acceptance is not completion (shell cancellation can reply while
                    // still running). Preserve native "stopping" until an explicit fact.
                    this.observeCancellation();
                    void Promise.resolve()
                        .then(() => this.deps.cancelTask(task.id, task.kind))
                        .then((response) => {
                        if (plain(response) && response.cancelled === false)
                            throw new Error('Qwen did not accept the task cancellation request');
                    })
                        .catch((error) => {
                        if (!task.settled && !this.closed)
                            updateProgress?.('Cancellation could not be confirmed; awaiting task status');
                        this.deps.log?.(`Qwen task cancel failed: ${error instanceof Error ? error.message : String(error)}`);
                    })
                        .finally(async () => {
                        await this.refresh();
                        this.observeCancellation();
                    });
                },
                done,
            }));
        }
        catch (error) {
            this.deps.log?.(`Qwen task job registration failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        if (started === undefined)
            return undefined;
        this.tasks.set(id, task);
        return task;
    }
    settle(task, outcome) {
        if (task.settled)
            return;
        task.settled = true;
        if (task.completion !== undefined)
            clearTimeout(task.completion.timer);
        task.settle?.(outcome);
    }
}
//# sourceMappingURL=qwen-background.js.map