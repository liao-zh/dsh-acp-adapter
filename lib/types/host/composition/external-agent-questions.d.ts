import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { AcpNativeUserQuestionService, AcpPermissionQuestionService } from '../../domain/policy/elicitation.ts';
/**
 * Present an external ACP permission on its live runtime root. The root owns
 * only this native question; the caller retains the child ACP request and its
 * exact option/value mapping and audit. Ordinary child questions never use it.
 *
 * The pinned Gateway sends scoped waterfalls only to owner Peers (which can
 * access every Session), and rejects non-owner replies. No request payload is
 * broadcast as a notification or exposed through a new approval endpoint.
 */
export declare function externalAgentPermissionQuestions(ctx: Context, getAgent: () => Agent | undefined, native: AcpNativeUserQuestionService, locale?: string): AcpPermissionQuestionService;
//# sourceMappingURL=external-agent-questions.d.ts.map