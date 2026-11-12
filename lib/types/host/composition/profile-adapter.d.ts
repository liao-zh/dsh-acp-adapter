/** ACP profile as an ordinary DSH LLM provider route. */
import type * as acp from '@agentclientprotocol/sdk';
import type { Context } from '@deepseek-ai/cordis';
import type { AttachmentStore } from '@deepseek-ai/dsh-attachment';
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, ToolSchema, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, ResolvedRetryPolicy, StreamChunk, UserMessage } from '@deepseek-ai/dsh-llm';
import type { AcpProbeCacheEntry } from './llm-stub.ts';
import type { AcpStubAgentConfig } from '../../domain/session/agent-config.ts';
import type { SubprocessSeamResolution } from '../../runtime/process/subprocess.ts';
import { AcpSessionRuntime } from '../../runtime/session/session-runtime.ts';
import type { AcpPendingAgentTurnFailure, AcpRuntimeContextUsage } from '../../runtime/session/session-runtime.ts';
import type { DispatchLedgerStore } from '../../runtime/session/dispatch-ledger.ts';
import type { SessionLike } from '../../domain/session/current-step-admission.ts';
import { type ExternalDelegationObservation } from '../../domain/subagent/external-delegation.ts';
import type { AcpBindingData, AcpRecoveryState, AcpSidecar } from '../../persistence/sidecar.ts';
import { type AcpHostToolControlOutcome } from '../../contract/tool-control-outcome.ts';
import type { AcpTerminalJobStarter } from '../../runtime/client-capabilities/terminal-job.ts';
import { type AcpNativeApprovalService } from '../../domain/policy/permissions.ts';
import { type QwenTaskJobStarter } from '../../runtime/session/qwen-background.ts';
import type { AcpPromptOptions } from '../../runtime/session/session-runtime.ts';
import type { AcpNativeQuestionUnavailable, AcpNativeUserQuestionService } from '../../domain/policy/elicitation.ts';
import type { AcpSessionNotification } from '../../protocol/v1/types.ts';
import type { AcpLocalSettlementStatus } from './local-settlement.ts';
export type AcpLocalSettlementViewStatus = AcpLocalSettlementStatus | 'finishing-tools';
type AcpAttachmentStore = Pick<AttachmentStore, 'readImage' | 'imageLimits'> & Partial<Pick<AttachmentStore, 'saveImages'>>;
interface AgentSessionModeView {
    readonly id: string;
    readonly name: string;
    readonly description?: string | null;
}
interface AgentSessionSelectValueView {
    readonly value: string;
    readonly name: string;
    readonly description?: string | null;
}
interface AgentSessionSelectGroupView {
    readonly group: string;
    readonly name: string;
    readonly options: readonly AgentSessionSelectValueView[];
}
type AgentSessionConfigOptionView = {
    readonly type: 'select';
    readonly id: string;
    readonly name: string;
    readonly description?: string | null;
    readonly category?: string | null;
    readonly currentValue: string;
    readonly options: readonly (AgentSessionSelectValueView | AgentSessionSelectGroupView)[];
} | {
    readonly type: 'boolean';
    readonly id: string;
    readonly name: string;
    readonly description?: string | null;
    readonly category?: string | null;
    readonly currentValue: boolean;
};
interface AgentSessionSnapshotView {
    readonly sessionId: string;
    readonly profileId: string;
    readonly modeWritable?: boolean;
    readonly pendingModeId?: string | null;
    readonly freshness: 'live' | 'stale';
    readonly editable: boolean;
    readonly configOptions: readonly AgentSessionConfigOptionView[] | null;
    readonly modes: readonly AgentSessionModeView[] | null;
    readonly currentModeId: string | null;
    readonly contextUsage: {
        readonly used: number;
        readonly size: number;
        readonly percent: number;
        readonly cost: {
            readonly amount: number;
            readonly currency: string;
        } | null;
    } | null;
    readonly note: string | null;
}
type AgentSessionOptionWrite = {
    readonly kind: 'config';
    readonly id: string;
    readonly value: string | boolean;
} | {
    readonly kind: 'mode';
    readonly id: string;
};
interface ProfileGeneration {
    readonly id: string;
    readonly config: AcpStubAgentConfig;
    readonly probe: {
        listModels(provider: string): Promise<readonly LlmModelInfo[]>;
        probeSnapshot?(provider: string): AcpProbeCacheEntry | undefined;
        invalidateProbe?(provider: string): void;
        configOptions?(provider: string): readonly acp.SessionConfigOption[] | undefined;
        configOptionsForModel?(provider: string, model: string): readonly acp.SessionConfigOption[] | undefined;
    };
}
export interface AcpProfileRuntime {
    /** Negotiate capabilities without creating session/new. */
    initialize?(signal?: AbortSignal): Promise<void>;
    start(signal?: AbortSignal): Promise<void>;
    /**
     * Fork a parent ACP session; absent means the Agent cannot fork.
     * AcpForkPreDispatchError establishes that no remote fork was dispatched.
     * validateBeforeDispatch runs synchronously after durable intent persistence.
     */
    fork?(parentSessionId: string, signal?: AbortSignal, expected?: {
        readonly agent?: AcpBindingData['agent'];
        readonly protocolVersion?: number;
    }, beforeDispatch?: () => Promise<void>, validateBeforeDispatch?: () => void): Promise<acp.ForkSessionResponse>;
    /** Restore an existing binding; absent implementations fail closed. */
    restore?(binding: Pick<AcpBindingData, 'agentSessionId'>, signal?: AbortSignal, onReplay?: (notification: AcpSessionNotification) => void): Promise<'reused' | 'resumed' | 'loaded'>;
    /** Retire a cancelled vendor process after its response and local settlement complete. */
    retireCancelledSession?(): Promise<void>;
    readonly acpSessionId?: string | undefined;
    readonly agentInfo?: acp.Implementation | null | undefined;
    readonly agentCapabilities?: acp.AgentCapabilities | undefined;
    /** Negotiated image input; absent when the owning connection is unavailable. */
    readonly inputImageSupported?: boolean | undefined;
    readonly protocolVersion?: number | undefined;
    /** Latest ACP session-scoped configuration used for configuration convergence. */
    readonly configOptions?: readonly acp.SessionConfigOption[] | undefined;
    readonly currentModeId?: string | undefined;
    readonly modes?: acp.SessionModeState | undefined;
    readonly contextUsage?: AcpRuntimeContextUsage | undefined;
    readonly lastRestoreRefreshedCancelledSession?: boolean | undefined;
    /** A failed automatic turn retained by this exact runtime until Host settlement. */
    readonly pendingAgentTurnFailure?: AcpPendingAgentTurnFailure | undefined;
    readonly cancelledSessionRefreshPending?: boolean | undefined;
    readonly cancelledSessionRefreshBindingId?: string | undefined;
    readonly isBusy?: boolean;
    hasPendingHostCalls?(): boolean;
    toolControlOutcome?(toolCallId: string): AcpHostToolControlOutcome | undefined;
    hasUncommittedHostFeedback?(): boolean;
    hasRetainedHostFeedback?(): boolean;
    waitForHostCallsSettled?(): Promise<void>;
    readonly hostSettlementPending?: boolean;
    flushHostFeedback?(): Promise<void>;
    readonly canSteer?: boolean;
    /**
     * Implementations that send steering must call `onDispatch` immediately
     * before the RPC request is handed to the transport. Returning `injected`
     * without calling it is treated as acceptance-unknown; a response-time call
     * is too late to project intervening notifications safely.
     */
    steer?(content: acp.ContentBlock[], onDispatch?: () => void): Promise<'injected' | 'promptRequired'>;
    /** ACP session-scoped writes. Implementations must confirm the resulting snapshot. */
    setConfigOption?(configId: string, value: string | boolean, signal?: AbortSignal): Promise<void>;
    setMode?(modeId: string, signal?: AbortSignal): Promise<void>;
    prompt(content: acp.ContentBlock[], onUpdate: (notification: AcpSessionNotification) => void, signal?: AbortSignal, onTeamReport?: () => void, onTurnConcluded?: () => void, onSuccessfulToolResult?: () => void, options?: AcpPromptOptions): Promise<acp.PromptResponse>;
    close(): Promise<void>;
}
/**
 * Separate native Qwen job wake notices from the rest of an admitted step.
 * A mixed step still has to adopt Qwen's already-running turn before sending
 * its other messages; switching straight to session/prompt would overlap it.
 */
export declare function qwenTaskWakeInput(messages: readonly UserMessage[]): readonly UserMessage[] | undefined;
export declare function isQwenTaskWakeStep(messages: readonly UserMessage[]): boolean;
/** Only an identical, previously delivered native replacement can be omitted. */
export declare function qwenTaskFollowupInput(messages: readonly UserMessage[], snapshots: readonly {
    readonly source: string;
    readonly text: string;
}[], contextUnchanged: boolean): readonly UserMessage[];
/** Host-owned DSH user-question seam resolved for the current DSH session. */
export interface AcpNativeQuestionBinding {
    readonly userQuestions?: AcpNativeUserQuestionService;
    readonly permissionQuestions?: import('../../domain/policy/elicitation.ts').AcpPermissionQuestionService;
    readonly approval?: AcpNativeApprovalService;
    readonly getAgent: () => unknown;
    readonly locale?: string;
    readonly onUnavailable?: (issue: AcpNativeQuestionUnavailable) => void | Promise<void>;
}
/** One independent adapter and runtime per configured ACP profile. */
export declare class AcpProfileAdapter extends LlmAdapter {
    readonly profileId: string;
    private readonly readConfig;
    private readonly subprocess;
    private readonly sessionOf;
    private readonly probeFactory;
    private readonly runtimeFactory;
    private readonly sidecar?;
    private readonly attachments?;
    private readonly resolveQuestions?;
    private readonly projectExternalDelegation?;
    private readonly log?;
    private readonly terminalJobs?;
    private readonly createMcpLease?;
    private readonly mcpKey?;
    private readonly controlsChanged?;
    private readonly hostRoot?;
    private readonly qwenTaskJobs?;
    private probeGeneration;
    private readonly runtimes;
    private readonly terminalOutcomes;
    private readonly runtimeOwners;
    private readonly runtimeBindings;
    private readonly nextGenerations;
    private readonly admittedToolSchemas;
    private readonly admittedToolSchemaOwners;
    /** Explicit user choices survive a same-process CodeBuddy cancel/reload only. */
    private readonly confirmedUserModes;
    private claudeDraftDegradationReported;
    private projectionAdmissionClosed;
    private readonly pendingExternalProjections;
    private readonly ledger;
    private readonly settlementSink;
    private settlementOwnerDisposer;
    private readonly settlementCloseController;
    private readonly settlementSessionWaitControllers;
    private readonly handoffs;
    private readonly inMemoryRecoveryRequired;
    private readonly inMemoryRecoveryStates;
    private readonly sessionControlWrites;
    private readonly deliveredQwenContexts;
    private readonly deliveredHostInstructions;
    constructor(profileId: string, readConfig: () => AcpStubAgentConfig | undefined, subprocess: SubprocessSeamResolution, sessionOf: ((sessionId: string) => SessionLike | undefined) | undefined, ledgerStore: DispatchLedgerStore, probeFactory?: (config: AcpStubAgentConfig) => ProfileGeneration['probe'], runtimeFactory?: (options: ConstructorParameters<typeof AcpSessionRuntime>[0]) => AcpProfileRuntime, sidecar?: AcpSidecar | undefined, attachments?: AcpAttachmentStore | undefined, resolveQuestions?: ((dshSessionId: string) => AcpNativeQuestionBinding | undefined) | undefined, projectExternalDelegation?: ((operation: (project: (observation: ExternalDelegationObservation, context: {
        readonly profileId: string;
        readonly bindingGeneration: number;
        readonly rootAcpSessionId: string;
        readonly parentDshSessionId: string;
        readonly parentCwd: string;
        readonly parentDelegationDepth?: number;
    }) => Promise<string | undefined>) => Promise<void>) => Promise<void>) | undefined, log?: ((message: string) => void) | undefined, terminalJobs?: ((sessionId: string) => AcpTerminalJobStarter | undefined) | undefined, createMcpLease?: ((sessionId: string, capabilities: acp.AgentCapabilities | undefined, wireProfile?: string, schemas?: readonly ToolSchema[]) => Promise<import("../../runtime/session/mcp-lease.ts").AcpMcpLease | undefined>) | undefined, mcpKey?: ((sessionId: string, schemas?: readonly ToolSchema[]) => unknown) | undefined, controlsChanged?: ((sessionId: string) => void) | undefined, hostRoot?: Context | undefined, qwenTaskJobs?: ((sessionId: string) => QwenTaskJobStarter | undefined) | undefined);
    providerInfo(provider: string): LlmProviderInfo;
    /** Directory-changing native tools require a context-preserving ACP handoff. */
    workingDirectoryChangeDenial(sessionId: string, owner: object): string | undefined;
    /** Display-only: a settled Stop handoff needs Continue, not recovery clicks. */
    isAutomaticDirectoryHandoff(sessionId: string, state: AcpRecoveryState): Promise<boolean>;
    /** A confirmed terminal precedes this operation; never fork an active prompt or start blank. */
    private forkWorkingDirectory;
    providerRetryPolicy(_provider: string): ResolvedRetryPolicy;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    /** The profile adapter is the single probe cache owner for both ModelPicker and health. */
    probeSnapshot(routeId: string): AcpProbeCacheEntry | undefined;
    invalidateProbe(routeId: string): void;
    resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    /**
     * ACP advertises connection capabilities, not a per-model modality catalog.
     * Only the exact live caller and confirmed current model can turn that
     * handshake into native image admission. Unknown remains unspecified: a
     * text-only declaration would make DSH erase images before ACP can validate
     * them, including continuations resolved against an earlier model selection.
     */
    private currentInputModalities;
    /** Capture the current profile generation before model dispatch. */
    prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<{
        model: LlmResolvedModelInfo;
        stream: (options: GenerateOptions) => AsyncIterable<StreamChunk>;
    }>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
    private generationOf;
    /** Resolve the picker/probe catalogue against the latest saved profile.
     * Existing ACP runtimes retain their immutable generation; only catalogue
     * discovery moves to the new launch fingerprint. */
    private currentProbeGeneration;
    private generationOfSnapshot;
    private resolveModelForGeneration;
    /** Narrow session-scoped control/read surface for the additive Agent dock. */
    agentSessionSnapshot(sessionId: string): Promise<AgentSessionSnapshotView>;
    private readAgentSessionSnapshotView;
    /** In-memory fail-closed fallback exposed through the existing recovery snapshot seam. */
    recoveryStateFallback(sessionId: string): AcpRecoveryState | undefined;
    /** Read-only UI state for local writes after a confirmed remote terminal. */
    localSettlementStatus(sessionId: string): AcpLocalSettlementViewStatus | undefined;
    /** Mode changes for dormant members are durable settings; they never create a session or send a prompt. */
    setTeamMemberMode(sessionId: string, modeId: string): Promise<AgentSessionSnapshotView>;
    private applyMemberMode;
    private readAgentSessionSnapshot;
    setAgentSessionOption(sessionId: string, request: AgentSessionOptionWrite): Promise<AgentSessionSnapshotView>;
    private modeSelectionForRequest;
    private readBindingForUserMode;
    private rememberConfirmedUserMode;
    private markConfirmedUserModeForRestore;
    private confirmedModeSelection;
    private restoreConfirmedUserMode;
    private restoreCancelledRuntimeForControl;
    private serializeSessionControlWrite;
    private waitForSessionControlWrite;
    private runtimeForSession;
    private liveAgentSessionSnapshot;
    private persistRuntimeSnapshot;
    /** Flatten ACP select values without assuming whether the agent groups them. */
    private selectValues;
    private findSelectOption;
    /**
     * Align the stock DSH request with the live ACP session before the durable
     * dispatch WAL. This is intentionally a narrow session-scoped adapter seam:
     * it never changes native routes or DSH permission presets.
     */
    private convergeConfig;
    private streamWithGeneration;
    private detachHandoffOwner;
    private executionStream;
    private canonicalCwd;
    private launchFingerprint;
    private blockRecovery;
    private refreshBindingHead;
    private readBindingSettlementTarget;
    private localSettlementSink;
    private settlementWaitSignal;
    /** Explicitly discard only ACP-side continuity; DSH history is untouched. */
    rebindBlank(sessionId: string): Promise<void>;
    /** Allow a user-selected retry to reuse the original durable ACP binding. */
    retryOriginal(sessionId: string): Promise<void>;
    private startExternalProjection;
    close(): Promise<void>;
    private releaseRuntime;
    /** Preserve an unconsumed failure before retiring its only in-memory owner. */
    private preservePendingAgentTurnFailure;
    private assertNoQuarantinedHostCalls;
    private rememberRecoveryFallback;
    /** Release only the disposed host session's runtimes; keep its durable history. */
    disposeSession(session: {
        readonly id: string;
        readonly identity?: object;
    }): Promise<void>;
    private closeSessionRuntime;
    /** Build one immutable native launch/capability surface for every lifecycle path. */
    private createRuntime;
    private runtimeOptionsFor;
}
export {};
//# sourceMappingURL=profile-adapter.d.ts.map