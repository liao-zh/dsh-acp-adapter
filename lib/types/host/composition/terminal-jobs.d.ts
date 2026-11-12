import type { Context } from '@deepseek-ai/cordis';
import type { AcpTerminalJobStarter } from '../../runtime/client-capabilities/terminal-job.ts';
declare module '@deepseek-ai/dsh-jobs' {
    interface JobKindMap {
        'acp-terminal': 'acp-terminal';
    }
}
/** Resolve optional host jobs without creating a second registry or UI store. */
export declare function resolveTerminalJobs(ctx: Context, sessionId: string): AcpTerminalJobStarter | undefined;
//# sourceMappingURL=terminal-jobs.d.ts.map