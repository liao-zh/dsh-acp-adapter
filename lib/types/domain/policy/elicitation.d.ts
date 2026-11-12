/** ACP 补充信息请求桥接层。
 *
 * broker 会一直保持 ACP 请求待处理，直到用户明确作出选择。请求按会话隔离，
 * 表单值会依据协商得到的基础 schema 校验，提交值不会持久化。SDK 目前仍将
 * 这部分协议标记为不稳定，因此未知或格式错误的变体会被拒绝，不做猜测性兼容。
 */
import type * as acp from '@agentclientprotocol/sdk';
import type { AcpPermissionPresentation } from './events.ts';
export interface AcpElicitationFieldView {
    readonly name: string;
    readonly type: string;
    readonly title?: string;
    readonly description?: string;
    readonly required: boolean;
    readonly options?: readonly {
        readonly value: string;
        readonly title?: string;
        readonly description?: string;
    }[];
    readonly defaultValue?: string | number | boolean | readonly string[];
    readonly minimum?: number;
    readonly maximum?: number;
    readonly minItems?: number;
    readonly maxItems?: number;
    readonly format?: 'email' | 'uri' | 'date' | 'date-time';
}
/** The narrow structural face of DSH's native user-question service. */
export interface AcpNativeUserQuestionService {
    ask(request: {
        readonly questions: readonly {
            readonly id: string;
            readonly question: string;
            readonly detail?: string;
            readonly header?: string;
            readonly options?: readonly {
                readonly label: string;
                readonly description?: string;
            }[];
            readonly multiSelect?: boolean;
        }[];
        readonly agent?: unknown;
        readonly signal?: AbortSignal;
    }): Promise<{
        readonly answers: readonly {
            readonly id: string;
            readonly selected: readonly string[];
            readonly custom?: string;
        }[];
    }>;
}
/** Native question presentation with optional Host-only attribution; never sent on the wire. */
export interface AcpPermissionQuestionService {
    ask(request: Parameters<AcpNativeUserQuestionService['ask']>[0], onPresentation?: (presentation: AcpPermissionPresentation) => void): ReturnType<AcpNativeUserQuestionService['ask']>;
}
/** A host interaction limitation, distinct from a user's rejection or cancellation. */
export interface AcpNativeQuestionUnavailable {
    readonly code: 'ACP_DELEGATED_QUESTION_UNAVAILABLE' | 'ACP_PERMISSION_POLICY_UNAVAILABLE';
    readonly message: string;
}
export interface AcpNativeElicitationDeps {
    readonly userQuestions?: AcpNativeUserQuestionService;
    /** Available only for verified external permission forms, never arbitrary questions. */
    readonly permissionQuestions?: AcpPermissionQuestionService;
    readonly getAgent: () => unknown;
    readonly locale?: string;
    /** Supplied only by the live host bridge after exact request/call correlation. */
    readonly hostToolName?: string;
    /** Native child approval for an exactly correlated DSH tool; never answers arbitrary forms. */
    readonly approveDelegatedOnce?: (signal?: AbortSignal) => Promise<boolean>;
    readonly log?: (message: string) => void;
    readonly onUnavailable?: (issue: AcpNativeQuestionUnavailable) => void | Promise<void>;
}
/**
 * Bridge ACP form elicitation to DSH's native question waterfall. URL
 * elicitation is deliberately declined: this plugin has no public, safe host
 * URL-opener seam and must never open or prefetch an Agent-supplied URL.
 */
export declare function createAcpNativeElicitationHandler(deps: AcpNativeElicitationDeps): (params: acp.CreateElicitationRequest, signal?: AbortSignal) => Promise<acp.CreateElicitationResponse>;
//# sourceMappingURL=elicitation.d.ts.map