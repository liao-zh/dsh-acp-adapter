export type AcpUiOutcome = 'saved' | 'save-failed' | 'deleted' | 'delete-failed' | 'session-option-failed' | 'tool-approval-failed';
export type AcpUiOutcomeSnapshot = {
    readonly sequence: number;
    readonly sourceSession?: {
        readonly id: string;
        readonly title: string | null;
    };
} & ({
    readonly outcome: AcpUiOutcome;
} | {
    readonly outcome: 'delegated-question-unavailable';
    readonly message: string;
});
/** One app-scoped outcome store read by the shell overlay and written by ACP surfaces. */
export declare class AcpUiFeedback {
    private snapshot;
    private sequence;
    private readonly listeners;
    readonly getSnapshot: () => AcpUiOutcomeSnapshot | null;
    readonly subscribe: (listener: () => void) => (() => void);
    readonly report: (outcome: AcpUiOutcome, sourceSession?: AcpUiOutcomeSnapshot["sourceSession"]) => void;
    /** Preserve the Host-localized limitation without recreating an approval. */
    readonly reportQuestionLimitation: (message: string, sourceSession: NonNullable<AcpUiOutcomeSnapshot["sourceSession"]>) => void;
    readonly dismiss: (sequence: number) => void;
}
/** Follow only the adapter's stable permission/question failure markers. */
export declare function followAcpQuestionLimitations(subscribe: (listener: (sessionId: string, message: string) => void) => () => void, feedback: AcpUiFeedback, titleOf: (sessionId: string) => string | null): () => void;
//# sourceMappingURL=feedback.d.ts.map