export class AcpAdmissionError extends Error {
    code;
    constructor(code) {
        super(code === 'ACP_SESSION_UNAVAILABLE'
            ? 'ACP cannot prove the live DSH session for this request'
            : code === 'ACP_NO_OPEN_STEP'
                ? 'ACP cannot prove a currently open DSH AgentLoop step'
                : 'the current DSH AgentLoop step contains no projected, logged input');
        this.code = code;
        this.name = 'AcpAdmissionError';
    }
}
/**
 * Admit the request's current step and return a durable provenance proof. The
 * callback is deliberately synchronous: callers must record the proof before
 * issuing the ACP RPC if they expose it to audit.
 */
export function admitCurrentStep(options, session, onProof) {
    if (options.purpose !== undefined)
        return [];
    // Do not gate on dsh-llm's process-local AgentLoop request marker here. The
    // LLM runtime is allowed to copy the request envelope while resolving model
    // defaults, projecting images, or filtering replay state, so exact object
    // identity does not survive to the final adapter boundary. The live session,
    // open step, and stable logged-input ids below are the durable proof.
    if (session === undefined)
        throw new AcpAdmissionError('ACP_SESSION_UNAVAILABLE');
    const step = session.facts.openSteps.at(-1);
    if (step === undefined)
        throw new AcpAdmissionError('ACP_NO_OPEN_STEP');
    const currentIds = step.messageIds;
    const messagesById = new Map(options.messages.map((message) => [String(message.id), message]));
    // Durable log order is authoritative. The projection order can differ after
    // middleware copies/reorders it, so never forward the projection's order.
    const admitted = currentIds
        .map((id) => messagesById.get(id))
        .filter((message) => message !== undefined && message.role === 'user');
    if (admitted.length === 0)
        throw new AcpAdmissionError('ACP_NO_CURRENT_INPUT');
    const proof = {
        turn: step.turn,
        step: step.step,
        startSeq: step.startSeq,
        endSeq: null,
        acceptedMessageIds: admitted.map((message) => String(message.id)),
        anchorMessageId: String((admitted.findLast((message) => message.source.kind === 'user') ?? admitted.at(-1)).id),
        projectionFiltered: options.messages.length !== admitted.length,
    };
    onProof?.(proof);
    return admitted;
}
//# sourceMappingURL=current-step-admission.js.map