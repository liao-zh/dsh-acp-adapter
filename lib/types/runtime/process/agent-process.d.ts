/** ACP protocol streams, command outcomes and bounded host-managed process cleanup. */
import type { Readable, Writable } from 'node:stream';
import type { SubprocessSeam } from './subprocess.ts';
import type { AcpProcessExit, AcpProcessOptions } from './types.ts';
/** 拆除梯子第 1 级缺省：stdin EOF 后的等待窗口（毫秒）。 */
export declare const DEFAULT_EOF_GRACE_MS = 500;
/** 拆除梯子第 2 级缺省：provider 的终止宽限（spawn spec 的 graceMs，毫秒）。 */
export declare const DEFAULT_TERM_GRACE_MS = 2000;
/**
 * 拆除梯子末级缺省：terminate 之后等待托管范围退出证明的上限（毫秒）。
 * 无法证明范围退出时告警后 resolve，
 * 绝不为退出证明挂死 DSH shutdown。
 */
export declare const DEFAULT_EXIT_WAIT_MS = 10000;
/**
 * 一条 ACP agent 子进程：经 {@link SubprocessSeam} spawn，拥有 stdio/stderr 环/
 * 退出事实与拆除梯子。协议面（initialize 协商、typed RPC、错误分类、probe）由
 * src/protocol/v1/connection.ts 的 `AcpClientConnection` 在本类之上组合。
 * 用毕必须 {@link close}（幂等），否则子进程残留（宿主服务 dispose 另有兜底，
 * 但那不是本类放弃拆除的理由）。
 */
export declare class AcpAgentProcess {
    /** 最终 argv[0]（调用方解析 wrapArgv/spawnPlan 后的可执行文件）。 */
    readonly command: string;
    /** spawn 同步抛错时无句柄；流违约仍保留句柄用于清理。 */
    private readonly handle;
    /** 协议层接管的 stdin（spawn 失败路径上是 PassThrough 哑流：SDK 接线不炸，帧流入黑洞）。 */
    private readonly stdinStream;
    /** 协议层接管的 stdout（同上失败路径为哑流）。 */
    private readonly stdoutStream;
    private readonly eofGraceMs;
    private readonly termGraceMs;
    private readonly exitWaitMs;
    /** 进程半的响亮告警通道（缺省落 console.error——无 hook 也要响亮）。 */
    private readonly onWarn;
    private readonly stderrRing;
    private readonly stderrLeftoverCap;
    private stderrFrame;
    private stderrFrameBytes;
    private stderrFrameOverflow;
    private stderrLineScanner;
    private stderrVisibleFrameStartMarker;
    private stderrPendingCarriageReturn;
    private stderrLineActive;
    private processFailureError;
    private syncSpawnFailure;
    private exitInfo;
    private readonly exitPromise;
    /**
     * 启动或 provider 失败臂（同步抛错或 done reject）：协议层所有 RPC
     * 与之竞速。构造时已挂兜底 catch，未被竞速消费不触发 unhandledRejection。
     */
    readonly failureArm: Promise<never>;
    private cleanupConfirmed;
    private closing;
    private closePromise;
    constructor(args: {
        argv: readonly string[];
        cwd: string;
        env: Record<string, string>;
        subprocess: SubprocessSeam;
    }, options?: AcpProcessOptions);
    /** 协议层接管 stdio 的缝：子进程 stdin（SDK ndJsonStream 的可写端）。 */
    get stdin(): Writable;
    /** 协议层接管 stdio 的缝：子进程 stdout（SDK ndJsonStream 的可读端）。 */
    get stdout(): Readable;
    /** 退出事实；进程仍在运行（或 spawn 失败从未存在）时为 null。 */
    get exited(): AcpProcessExit | null;
    /** True only after the provider confirms that the entire managed range exited. */
    get isCleanupConfirmed(): boolean;
    /** close 是否已发起。 */
    get isClosed(): boolean;
    /** 拆除梯子是否已进场（close 首段同步置位；crash 分类据此区分主动拆除）。 */
    get isClosing(): boolean;
    /** Provider failure remains observable even after successful ACP initialization. */
    get failure(): Error | undefined;
    /** Only synchronous launch or explicit OS executable failures prove a spawn failure. */
    get spawnFailure(): Error | undefined;
    /** 脱敏后的 stderr 环形缓冲快照（供健康/诊断端点与 crash 分类）。 */
    stderrLines(): string[];
    /** Idempotent EOF → provider termination → bounded managed-range exit observation. */
    close(): Promise<void>;
    /** stdout EOF 后退出事实通常紧随；给上限等待收割 exit code + signal。 */
    harvestExit(): Promise<AcpProcessExit | undefined>;
    private teardown;
    private ingestStderr;
    private flushStderrLeftover;
    private scannerForStderrLine;
    private appendStderrText;
    private startStderrFrameAfterCarriageReturn;
    private finishStderrLine;
}
//# sourceMappingURL=agent-process.d.ts.map