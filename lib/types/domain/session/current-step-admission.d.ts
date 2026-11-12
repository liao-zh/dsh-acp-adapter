/**
 * Current-step admission for the ordinary DSH AgentLoop request.
 *
 * `GenerateOptions.messages` is a projection and may contain the entire
 * conversation. It is not safe to send every direct user message to ACP. The
 * native Session projection of committed events is the authority: only user/message events between
 * the currently open step/start and its step/end are admitted, and only when
 * their stable ids also occur in the request projection. These include plugin
 * inputs and runtime context; their source must not make an admitted input vanish.
 */
import type { GenerateOptions, UserMessage } from '@deepseek-ai/dsh-llm';
import type { SessionLike } from './session-facts.ts';
export type { SessionLike, SessionEventLike } from './session-facts.ts';
export interface CurrentStepProof {
    readonly turn: number;
    readonly step: number;
    readonly startSeq: number;
    readonly endSeq: number | null;
    readonly acceptedMessageIds: readonly string[];
    readonly anchorMessageId: string;
    /** Whether the request projection contained anything other than the logged
     * inputs admitted for this step. This is a bounded diagnostic fact; the
     * live event-log check above remains the actual admission boundary. */
    readonly projectionFiltered: boolean;
}
export declare class AcpAdmissionError extends Error {
    readonly code: 'ACP_SESSION_UNAVAILABLE' | 'ACP_NO_OPEN_STEP' | 'ACP_NO_CURRENT_INPUT';
    constructor(code: 'ACP_SESSION_UNAVAILABLE' | 'ACP_NO_OPEN_STEP' | 'ACP_NO_CURRENT_INPUT');
}
/**
 * Admit the request's current step and return a durable provenance proof. The
 * callback is deliberately synchronous: callers must record the proof before
 * issuing the ACP RPC if they expose it to audit.
 */
export declare function admitCurrentStep(options: GenerateOptions, session: SessionLike | undefined, onProof?: (proof: CurrentStepProof) => void): readonly UserMessage[];
//# sourceMappingURL=current-step-admission.d.ts.map