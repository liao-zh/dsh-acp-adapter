/**
 * Minimal ACP session owner used by the provider adapter.
 *
 * This is deliberately not a DSH Agent or AgentLoop.  It owns one ACP
 * connection and one ACP session for one DSH model route, while the stock DSH
 * loop remains responsible for turns, history, cancellation and UI.
 */
import type * as acp from '@agentclientprotocol/sdk';
import type { AcpSpawnPlanView } from '../process/types.ts';
import type { SubprocessSeam } from '../process/subprocess.ts';
import type { AcpFileSystemHandlers } from '../client-capabilities/filesystem.ts';
import type { AcpSessionNotification, AcpTerminalHandlers } from '../../protocol/v1/types.ts';
import type { AcpMcpLease } from './mcp-lease.ts';
import type { AcpPermissionCheck } from '../../domain/policy/permission-check.ts';
import { AcpClientError } from '../../protocol/v1/errors.ts';
import { type QwenTaskJobStarter } from './qwen-background.ts';
/** Deliberately protocol-local: runtime restoration does not own persistence. */
export interface AcpRuntimeBindingRef {
    readonly agentSessionId: string;
}
export interface AcpRuntimeConfig {
    readonly command: string;
    readonly args: readonly string[];
    readonly env: Record<string, string>;
}
export interface AcpRuntimeLaunch {
    readonly mcpLease?: AcpMcpLease;
    readonly argv: readonly string[];
    readonly env: Record<string, string>;
    readonly spawnPlan: AcpSpawnPlanView;
}
export interface AcpRuntimeContextUsage {
    readonly used: number;
    readonly size: number;
    readonly cost?: {
        readonly amount: number;
        readonly currency: string;
    } | null;
}
export interface AcpSessionRuntimeOptions {
    /** DSH session id used only by the opt-in live-test diagnostic observer. */
    readonly diagnosticDshSessionId?: string;
    readonly mcpKey?: () => unknown;
    readonly createMcpLease?: (capabilities: acp.AgentCapabilities | undefined) => Promise<AcpMcpLease | undefined>;
    readonly profileId: string;
    /** Explicit runtime-bound gate for Claude's private draft extension. */
    readonly enableClaudeDraftSubagents?: boolean;
    readonly config: AcpRuntimeConfig;
    readonly subprocess: SubprocessSeam;
    readonly cwd: string;
    readonly prepareLaunch: (config: AcpRuntimeConfig, cwd: string) => Promise<AcpRuntimeLaunch>;
    /** Optional host capability handlers, created after the native launch environment is known. */
    readonly createFileSystemHandlers?: (context: {
        readonly cwd: string;
        readonly env: Readonly<Record<string, string>>;
    }) => AcpFileSystemHandlers;
    readonly createTerminalHandlers?: (context: {
        readonly cwd: string;
        readonly env: Readonly<Record<string, string>>;
    }) => AcpTerminalHandlers;
    /** Replay/load notifications are staging-only; the DSH log remains authoritative. */
    readonly onSessionUpdate?: (notification: AcpSessionNotification) => void;
    /** Host-owned approval bridge. The optional signal is the active prompt lifetime. */
    readonly onPermissionRequest?: (params: acp.RequestPermissionRequest, signal?: AbortSignal) => Promise<acp.RequestPermissionResponse>;
    readonly onPermissionCheck?: (check: AcpPermissionCheck, request: acp.RequestPermissionRequest) => Promise<void>;
    /** Host-owned form elicitation bridge; URL elicitation is intentionally not advertised. */
    readonly onElicitationRequest?: (params: acp.CreateElicitationRequest, signal?: AbortSignal, hostToolName?: string, hostToolCall?: acp.ToolCallUpdate) => Promise<acp.CreateElicitationResponse>;
    /** One-shot diagnostic for optional private capability degradation. */
    readonly onCapabilityDegraded?: (message: string) => void;
    /** Best-effort notification when a terminal ACP response is waiting on Host settlement. */
    readonly onHostSettlementChanged?: () => void;
    /** Reopen a confirmed-cancelled native session before its next bound prompt. */
    readonly refreshSessionAfterCancelledPrompt?: boolean;
    /** Grace period after `session/cancel` before the Agent process is closed. */
    readonly cancelGraceMs?: number;
    /** Qwen `ask_user_question` bridge (permission request carrying questions + `answers`). */
    readonly onQwenQuestion?: (params: acp.RequestPermissionRequest, signal?: AbortSignal) => Promise<acp.RequestPermissionResponse>;
    /** Host job registry seam. Enables Qwen background-task mirroring and adoption of Qwen-initiated turns. */
    readonly qwenTaskJobs?: QwenTaskJobStarter;
    /** How long an adopting host call waits for Qwen to announce its turn. */
    readonly agentTurnWaitMs?: number;
    /** Internal automatic-turn reporting watchdog seam; never a total execution deadline. */
    readonly unannouncedIdleMs?: number;
    /** Internal seam for an automatic turn that no Host call has adopted. */
    readonly agentTurnAdoptionMs?: number;
}
export type AcpForkPreDispatchCode = 'ACP_FORK_UNSUPPORTED' | 'ACP_FORK_PRECONDITION_FAILED' | 'ACP_FORK_INTENT_FAILED';
/** A fork failure established before RPC dispatch; matching display text is not such proof. */
export declare class AcpForkPreDispatchError extends Error {
    readonly code: AcpForkPreDispatchCode;
    constructor(code: AcpForkPreDispatchCode, cause?: unknown);
}
/** Options for one `prompt()` call. */
export interface AcpPromptOptions {
    /** Host execution lifetime, distinct from directory/input handoff cancellation. */
    readonly hostBodySignal?: AbortSignal;
    /**
     * The host turn was woken by a Qwen background-task notice: run the turn
     * Qwen has started by itself instead of sending `session/prompt`. Falls back
     * to an ordinary prompt when no such turn is announced in time.
     */
    readonly adoptAgentTurn?: boolean;
    /** Already-admitted non-Qwen input, dispatched after a confirmed adopted terminal response. */
    readonly followupContent?: acp.ContentBlock[];
}
/** An automatic turn must retain uncertainty until an explicit terminal outcome. */
export declare class AcpAgentTurnOutcomeError extends AcpClientError {
    readonly reason: 'unrecognized-end-reason' | 'missing-terminal' | 'incomplete-turn';
    constructor(reason: 'unrecognized-end-reason' | 'missing-terminal' | 'incomplete-turn');
}
/** A failed automatic turn must reach native settlement before this owner can be discarded. */
export interface AcpPendingAgentTurnFailure {
    readonly acpSessionId: string;
    readonly turnId: string;
    readonly error: AcpAgentTurnOutcomeError;
}
/** Transient failure while refreshing an already-settled, cancelled session. */
export declare class AcpSessionRefreshRetryError extends Error {
    readonly code = "ACP_SESSION_REFRESH_FAILED";
    constructor(cause: unknown);
}
/** The runtime was explicitly closed while refreshing a cancelled session. */
export declare class AcpSessionRefreshAbortedError extends Error {
    readonly code = "ACP_SESSION_REFRESH_ABORTED";
    constructor(cause?: unknown);
}
/** A bounded, detached ACP session configuration snapshot. */
/** One reusable ACP connection/session, lazily started on the first prompt. */
export declare class AcpSessionRuntime {
    private readonly options;
    private connection;
    private mcpLease;
    private mcpKey;
    private sessionId;
    private starting;
    /** Keep restore/new initialization behind process teardown. Lease shutdown is
     * allowed its own grace, but must not shorten the subprocess close ladder. */
    private closing;
    private cancelledRefreshController;
    private launch;
    private replayHandler;
    private restoringSessionId;
    private connectionAbort;
    private sessionCreationGeneration;
    private sessionCreation;
    private promptAbort;
    private promptPhaseAbort;
    private promptSignal;
    private configSnapshot;
    private currentMode;
    private modeSnapshot;
    private usageSnapshot;
    private promptOrdinal;
    private configWrite;
    /** Claim the complete prompt lifecycle, including lazy session setup. This is
     * distinct from promptActive, which gates Agent callbacks only after the
     * session/prompt request has actually been dispatched. */
    private promptClaimed;
    private hostSettlementPendingValue;
    private refreshBeforeRestore;
    private refreshBindingSessionId;
    private lastRestoreRefreshedCancelledSessionValue;
    private promptActive;
    /** One map per active prompt. Tool call ids are only meaningful inside this
     * lifetime for permission enrichment and must never leak into another turn. */
    private promptToolSnapshots;
    private readonly cancelGraceMs;
    private readonly retiredMcpLeases;
    constructor(options: AcpSessionRuntimeOptions);
    get acpSessionId(): string | undefined;
    get pendingAgentTurnFailure(): AcpPendingAgentTurnFailure | undefined;
    /** Close a vendor process after a cancelled response and its local settlement
     * complete, keeping the same-session refresh marker for the next user input.
     * This is deliberately not a prompt retry. */
    retireCancelledSession(): Promise<void>;
    get agentCapabilities(): acp.AgentCapabilities | undefined;
    /** Positive image-input proof belongs to the current live connection only. */
    get inputImageSupported(): boolean | undefined;
    get agentInfo(): acp.Implementation | null | undefined;
    get protocolVersion(): number | undefined;
    /** Latest detached options advertised by this ACP session. */
    get configOptions(): readonly acp.SessionConfigOption[] | undefined;
    get currentModeId(): string | undefined;
    /** Complete detached legacy mode state advertised by this ACP session. */
    get modes(): acp.SessionModeState | undefined;
    /** ACP context occupancy/cumulative cost; intentionally not DSH TokenUsage. */
    get contextUsage(): AcpRuntimeContextUsage | undefined;
    get lastRestoreRefreshedCancelledSession(): boolean;
    get cancelledSessionRefreshPending(): boolean;
    get cancelledSessionRefreshBindingId(): string | undefined;
    get isBusy(): boolean;
    get hostSettlementPending(): boolean;
    toolControlOutcome(toolCallId: string): import("../../contract/tool-control-outcome.ts").AcpHostToolControlOutcome | undefined;
    private setHostSettlementPending;
    hasPendingHostCalls(): boolean;
    hasUncommittedHostFeedback(): boolean;
    flushHostFeedback(): Promise<void>;
    hasRetainedHostFeedback(): boolean;
    waitForHostCallsSettled(): Promise<void>;
    private pendingQuestions;
    /** Qwen-initiated turns, oldest first; the last one may still be live. */
    private agentTurns;
    /** Sticky for this owner, including transport teardown; only its Host can settle/discard it. */
    private agentTurnFailure;
    private readonly agentTurnWaiters;
    /** A host prompt() is waiting to adopt an Agent-initiated turn. */
    private awaitingAgentTurn;
    /** `session/prompt` RPC is on the wire (updates arrive through its listener). */
    private wirePromptActive;
    private qwenTasks;
    get canSteer(): boolean;
    steer(content: acp.ContentBlock[], onDispatch?: () => void): Promise<'injected' | 'promptRequired'>;
    start(signal?: AbortSignal): Promise<void>;
    /** Initialize and negotiate capabilities without creating session/new. */
    initialize(signal?: AbortSignal): Promise<void>;
    private beginStartup;
    /**
     * Restore an already-bound ACP session. `session/resume` is preferred because
     * it does not replay presentation history. `session/load` is an explicit
     * staging path: notifications are forwarded to the caller but never written
     * to DSH history by this runtime.
     */
    restore(binding: AcpRuntimeBindingRef, signal?: AbortSignal, onReplay?: (notification: AcpSessionNotification) => void): Promise<'reused' | 'resumed' | 'loaded'>;
    private waitForCancelledSessionSettlement;
    private refreshCancelledSession;
    private closeForCancelledRefresh;
    private restoreCold;
    /**
     * Create a child ACP session from an already-bound parent. This is kept
     * separate from start(): a successful fork owns the returned child id and
     * must never first create an unrelated session/new.
     * AcpForkPreDispatchError proves no fork RPC was sent; every other failure
     * retains an unknown remote outcome. The runtime owns intent-error wrapping.
     * The final synchronous validator runs after intent persistence and directly
     * before dispatch; it must throw AcpForkPreDispatchError for a known refusal.
     */
    fork(parentSessionId: string, signal?: AbortSignal, expected?: {
        readonly agent?: {
            readonly name?: string;
            readonly version?: string;
        };
        readonly protocolVersion?: number;
    }, beforeDispatch?: () => Promise<void>, validateBeforeDispatch?: () => void): Promise<acp.ForkSessionResponse>;
    prompt(content: acp.ContentBlock[], onUpdate: (notification: AcpSessionNotification) => void, signal?: AbortSignal, onTeamReport?: () => void, onTurnConcluded?: () => void, onSuccessfulToolResult?: () => void, promptOptions?: AcpPromptOptions): Promise<acp.PromptResponse>;
    /** Set one ACP option for this runtime's session; writes are serialized and never cross sessions. */
    setConfigOption(configId: string, value: string | boolean, signal?: AbortSignal): Promise<void>;
    /** Set a legacy ACP mode for this runtime's session. */
    setMode(modeId: string, signal?: AbortSignal): Promise<void>;
    /** Cancel initialization and await acquired resources and late setup cleanup before reuse. */
    close(): Promise<void>;
    private closeInternal;
    private closeResources;
    private createSession;
    private stageSessionCreationUpdate;
    private createConnection;
    private applySessionSnapshot;
    private applyUpdate;
    private ensureQwenTasks;
    private notifyAgentTurnWaiters;
    /** Resolve on the next Agent-turn state change or after `ms`. */
    private agentTurnChange;
    private liveAgentTurn;
    private startAgentTurn;
    private createAgentTurn;
    private endAgentTurn;
    private finishAgentTurn;
    private routeAgentTurnUpdate;
    private unannouncedSeq;
    private startUnannouncedTurn;
    /** Request/usage markers end model rounds, not the tool/Stop-hook work after them. */
    private trackAgentTurnUpdate;
    private ownsAgentTurn;
    private agentTurnHasHostWork;
    private failAgentTurnReporting;
    private armAgentTurnAdoptionWatchdog;
    private armAgentTurnWatchdog;
    private updateAgentTurnWork;
    private waitForAdoption;
    /** Oldest unadopted Agent turn, waiting briefly for Qwen's announcement. */
    private nextAgentTurn;
    /** Present an Agent-initiated turn as the current prompt until it ends. */
    private adoptAgentTurn;
    private releaseAgentTurn;
    private throwPendingAgentTurnFailure;
    private permissionSignal;
    private handlePermissionRequest;
}
//# sourceMappingURL=session-runtime.d.ts.map