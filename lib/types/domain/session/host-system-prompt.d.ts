import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
/** Read the host's effective prompt before current-step input filtering.
 * ACP does not declare in-history system updates: DSH normalizes its system
 * surface to the leading message. An empty prompt explicitly clears the
 * previously transmitted host instructions on the external conversation. */
export declare function hostSystemPrompt(options: Pick<GenerateOptions, 'system' | 'messages'>): string;
//# sourceMappingURL=host-system-prompt.d.ts.map