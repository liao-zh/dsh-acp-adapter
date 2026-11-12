import type * as acp from '@agentclientprotocol/sdk';
export declare function toPlainRecord(value: unknown): Record<string, unknown> | undefined;
export type AntigravityNativeToolName = 'bash' | 'read' | 'edit' | 'ask_question';
export declare function resolveAntigravityNativeTool(call: Pick<acp.ToolCallUpdate, 'kind' | 'name' | 'title' | 'rawInput'>): AntigravityNativeToolName | undefined;
export declare function formatAntigravityAskQuestionResult(result: unknown): string;
export declare function normalizeAntigravityPresentation(rawInput: unknown, rawOutput: unknown, content: acp.ToolCallUpdate['content'], name: string): {
    rawInput: unknown;
    rawOutput: unknown;
    content: acp.ToolCallUpdate['content'];
    title?: string;
};
//# sourceMappingURL=antigravity.d.ts.map