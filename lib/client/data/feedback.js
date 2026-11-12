/** One app-scoped outcome store read by the shell overlay and written by ACP surfaces. */
export class AcpUiFeedback {
    snapshot = null;
    sequence = 0;
    listeners = new Set();
    getSnapshot = () => this.snapshot;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };
    report = (outcome, sourceSession) => {
        this.snapshot = { outcome, sequence: ++this.sequence, ...(sourceSession === undefined ? {} : { sourceSession }) };
        for (const listener of [...this.listeners])
            listener();
    };
    /** Preserve the Host-localized limitation without recreating an approval. */
    reportQuestionLimitation = (message, sourceSession) => {
        this.snapshot = { outcome: 'delegated-question-unavailable', message, sourceSession, sequence: ++this.sequence };
        for (const listener of [...this.listeners])
            listener();
    };
    dismiss = (sequence) => {
        if (this.snapshot?.sequence !== sequence)
            return;
        this.snapshot = null;
        for (const listener of [...this.listeners])
            listener();
    };
}
/** Follow only the adapter's stable permission/question failure markers. */
export function followAcpQuestionLimitations(subscribe, feedback, titleOf) {
    // api-session/error is a string channel. Recognize only the exact terminal
    // marker emitted by our Host callback; generic Agent errors stay native.
    const suffixes = [' (ACP_DELEGATED_QUESTION_UNAVAILABLE)', ' (ACP_PERMISSION_POLICY_UNAVAILABLE)'];
    return subscribe((sessionId, error) => {
        const suffix = suffixes.find((value) => error.endsWith(value));
        if (sessionId === '' || suffix === undefined)
            return;
        const message = error.slice(0, -suffix.length).trim();
        if (message === '')
            return;
        feedback.reportQuestionLimitation(message, { id: sessionId, title: titleOf(sessionId) });
    });
}
//# sourceMappingURL=feedback.js.map