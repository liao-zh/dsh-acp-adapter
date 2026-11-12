/**
 * Pure classification for the stock DSH model-selection transition.
 *
 * Classification remains pure; the Host contribution below only observes the
 * final request and checks ACP continuity.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { AcpSidecar } from '../../persistence/sidecar.ts';
export interface ModelSelectionValue {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
}
export interface BackendTransitionInput {
    /** The durable last-used selection, or null before the first selection. */
    readonly lastUsed: ModelSelectionValue | null;
    /** The final selection produced by the stock DSH request waterfall. */
    readonly next: ModelSelectionValue;
    /** True only when the DSH session has no semantic history to preserve. */
    readonly blank: boolean;
    /** Defensive signal for a contradictory/legacy projection. */
    readonly hasPriorSemanticHistory: boolean;
    /** ACP profile represented by the existing binding, when one is present. */
    readonly bindingProfileId?: string;
}
export type BackendTransition = 'allow-native' | 'allow-blank-acp' | 'allow-same-acp' | 'require-new-session' | 'recovery-conflict';
/** Classify one model transition without performing the transition. */
export declare function classifyBackendTransition(input: BackendTransitionInput): BackendTransition;
export interface AcpBackendGuardOptions {
    readonly sidecar: AcpSidecar;
}
/** Install the additive, scoped request guard without replacing DSH's loop. */
export declare function installAcpBackendGuard(ctx: Context, options: AcpBackendGuardOptions): void;
//# sourceMappingURL=backend-guard.d.ts.map