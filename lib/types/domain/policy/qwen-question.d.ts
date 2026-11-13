/**
 * Qwen Code `ask_user_question` bridge.
 *
 * Qwen does not use ACP elicitation for its question tool. It sends an ordinary
 * `session/request_permission` whose tool call carries the questions
 * (`_meta.qwenInteractionKind: 'user_question'`, `rawInput.questions`) and
 * reads the answers from a non-standard top-level `answers` field of the
 * response: `{ "<question index>": "<label | custom text | labels joined by ', '>" }`.
 * A plain approval card would answer `proceed_once` without `answers`, which
 * Qwen reports to its model as "No valid answers were provided."
 */
import type * as acp from '@agentclientprotocol/sdk';
import type { AcpNativeUserQuestionService } from './elicitation.ts';
export interface QwenQuestionOption {
    readonly label: string;
    readonly description?: string;
}
export interface QwenQuestion {
    readonly question: string;
    readonly header?: string;
    readonly multiSelect: boolean;
    readonly options: readonly QwenQuestionOption[];
}
/** Qwen's permission response extension; the SDK forwards it verbatim. */
export type QwenQuestionResponse = acp.RequestPermissionResponse & {
    readonly answers?: Readonly<Record<string, string>>;
};
/** Whether a permission request is Qwen's question tool (never an approval). */
export declare function isQwenUserQuestion(params: acp.RequestPermissionRequest): boolean;
/** Strictly parse the questions; malformed input yields undefined (fail closed). */
export declare function qwenUserQuestions(params: acp.RequestPermissionRequest): readonly QwenQuestion[] | undefined;
export interface QwenQuestionDeps {
    readonly userQuestions?: AcpNativeUserQuestionService;
    readonly getAgent: () => unknown;
    readonly log?: (message: string) => void;
}
/** Encode one native answer the way Qwen's own TUI does. */
export declare function encodeQwenAnswer(question: QwenQuestion, answer: {
    readonly selected: readonly string[];
    readonly custom?: string;
}): string | undefined;
/**
 * Ask through the native DSH question card and answer Qwen with `answers`.
 * Cancel/failure answers `cancelled`, which Qwen reports as a declined question.
 */
export declare function createQwenQuestionHandler(deps: QwenQuestionDeps): (params: acp.RequestPermissionRequest, signal?: AbortSignal) => Promise<QwenQuestionResponse>;
//# sourceMappingURL=qwen-question.d.ts.map