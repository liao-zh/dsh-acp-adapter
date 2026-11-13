import { QWEN_TASK_JOB_KIND } from "../../runtime/session/qwen-background.js";
/**
 * Register Qwen background tasks with the host job registry. A silent outcome
 * arms the public waiter before the registry sees the settlement, so
 * `tool-jobs` treats it as collected and produces no wake-up; an unsilent one
 * is an ordinary completion notice that wakes the idle DSH agent.
 */
export function resolveQwenTaskJobs(ctx, sessionId) {
    const holder = ctx;
    const jobs = holder.get('jobs');
    if (jobs === undefined)
        return undefined;
    return (label, run) => {
        const owner = sessionId;
        let id;
        try {
            id = jobs.start({
                kind: QWEN_TASK_JOB_KIND,
                label,
                owner,
                run: (handle) => {
                    const producer = run((line) => handle.updateProgress(line));
                    return {
                        cancel: () => {
                            producer.cancel();
                        },
                        done: producer.done.then((outcome) => {
                            if (outcome.silent) {
                                void jobs.wait(id, 30_000, owner).catch((error) => {
                                    ctx.logger.warn(`ACP Qwen task completion could not be observed: ${String(error)}`);
                                });
                            }
                            return {
                                status: outcome.status,
                                detail: outcome.detail,
                                ...(outcome.result === undefined ? {} : { result: outcome.result }),
                            };
                        }),
                    };
                },
            });
        }
        catch (error) {
            ctx.logger.warn(`ACP Qwen task job was not registered: ${String(error)}`);
            return undefined;
        }
        return {
            cancel: () => {
                jobs.kill(id, owner, 'ACP Qwen task cancellation');
            },
        };
    };
}
//# sourceMappingURL=qwen-task-jobs.js.map