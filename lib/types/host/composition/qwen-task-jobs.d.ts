import type { Context } from '@deepseek-ai/cordis';
import { type QwenTaskJobStarter } from '../../runtime/session/qwen-background.ts';
declare module '@deepseek-ai/dsh-jobs' {
    interface JobKindMap {
        'acp-qwen-task': 'acp-qwen-task';
    }
}
/**
 * Register Qwen background tasks with the host job registry. A silent outcome
 * arms the public waiter before the registry sees the settlement, so
 * `tool-jobs` treats it as collected and produces no wake-up; an unsilent one
 * is an ordinary completion notice that wakes the idle DSH agent.
 */
export declare function resolveQwenTaskJobs(ctx: Context, sessionId: string): QwenTaskJobStarter | undefined;
//# sourceMappingURL=qwen-task-jobs.d.ts.map