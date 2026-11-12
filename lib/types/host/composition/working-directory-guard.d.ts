import type { Context } from '@deepseek-ai/cordis';
/** The native guard also covers PTC inner calls, before any Git or cwd side effect. */
export declare function installWorkingDirectoryGuard(ctx: Context, adapterFor: (profileId: string) => {
    workingDirectoryChangeDenial(sessionId: string, owner: object): string | undefined;
} | undefined): void;
//# sourceMappingURL=working-directory-guard.d.ts.map