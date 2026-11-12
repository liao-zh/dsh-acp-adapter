import type { SubprocessSeam } from '../../runtime/process/subprocess.ts';
import type { AcpMcpLease } from '../../runtime/session/mcp-lease.ts';
export declare const DEVIN_MCP_NAME = "dsh";
interface DevinMcpOptions {
    subprocess: SubprocessSeam;
    command: string;
    args: readonly string[];
    cwd: string;
    env: Record<string, string>;
    lease: AcpMcpLease;
}
export declare function prepareDevinMcp({ subprocess, command, args, cwd, env, lease, }: DevinMcpOptions): Promise<{
    env: Record<string, string>;
    lease: AcpMcpLease;
}>;
export {};
//# sourceMappingURL=devin-config.d.ts.map