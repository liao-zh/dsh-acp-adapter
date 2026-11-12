import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-store';
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionPendingInteractionBase } from '@deepseek-ai/dsh-client-ui-session/client';
interface AcpPermissionQuestionOption {
    readonly label: string;
}
interface AcpPermissionQuestionItem {
    readonly id: string;
    readonly question: string;
    readonly header?: string;
    readonly detail?: string;
    readonly options?: readonly AcpPermissionQuestionOption[];
    readonly multiSelect?: boolean;
}
interface AcpPermissionAnswer {
    answers: {
        id: string;
        selected: string[];
        custom?: string;
    }[];
}
interface AcpPermissionSnapshot {
    readonly channel: 'waterfall' | 'rpc' | 'none';
    readonly closed: boolean;
}
/** Public capability surface used here; no PendingQuestion class dependency. */
interface AcpPermissionPendingQuestion extends SessionPendingInteractionBase {
    readonly kind: 'question';
    readonly questions: readonly AcpPermissionQuestionItem[];
    readonly callId: unknown;
    readonly review: unknown;
    subscribe(listener: () => void): () => void;
    snapshot(): AcpPermissionSnapshot;
    answer(answer: AcpPermissionAnswer): Promise<void>;
    dismiss(): Promise<void>;
}
interface PermissionQuestionDraft {
    selectedByQuestion: Record<string, string | undefined>;
}
interface PermissionQuestionState {
    byRequest: Record<string, PermissionQuestionDraft>;
}
type PermissionQuestionActions = {
    select: (draft: PermissionQuestionState, questionId: string, label: string) => void;
    clear: (draft: PermissionQuestionState, questionId: string) => void;
};
/** Session-scoped choices keyed by the Host request ID, which survives client reconnects. */
export declare function createAcpPermissionQuestionStore(): EngineStoreHandle<PermissionQuestionState, PermissionQuestionActions>;
/** Match only the blocking, fixed-option questions created by this adapter. */
export declare function isAcpPermissionQuestion(value: unknown): value is AcpPermissionPendingQuestion;
type Props = PropsRuntime<'conversation.composer'> & PropsStore<ReturnType<typeof createAcpPermissionQuestionStore>> & PropsLocale<'acpActivity'> & {
    matched: AcpPermissionPendingQuestion;
};
/** An explicit, fixed-option answer surface; no free-text or implicit choice. */
export declare function AcpPermissionQuestion(props: Props): import("react").DetailedReactHTMLElement<{
    className: string | undefined;
}, HTMLElement>;
export {};
//# sourceMappingURL=acp-permission-question.d.ts.map