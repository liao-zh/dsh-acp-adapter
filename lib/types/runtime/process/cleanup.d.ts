import type { AcpSubprocessHandle } from './subprocess.ts';
export declare function stopSubprocess(handle: AcpSubprocessHandle, options: {
    eofGraceMs: number;
    exitWaitMs: number;
    signal?: AbortSignal | undefined;
    warn?: ((message: string) => void) | undefined;
}): Promise<boolean>;
//# sourceMappingURL=cleanup.d.ts.map