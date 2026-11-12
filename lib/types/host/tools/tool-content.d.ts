import type { AttachmentStore } from '@deepseek-ai/dsh-attachment';
import { type ContentBlock } from '@deepseek-ai/dsh-llm';
import type { CallToolResult } from '@modelcontextprotocol/server';
/** Preserve model-facing tool output; unsupported blocks are disclosed, never silently dropped. */
export declare function toolContent(blocks: readonly ContentBlock[], signal: AbortSignal, imageEnabled: boolean, attachments?: Pick<AttachmentStore, 'readImage' | 'imageLimits'>): Promise<CallToolResult['content']>;
//# sourceMappingURL=tool-content.d.ts.map