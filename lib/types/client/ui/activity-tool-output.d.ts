import type { AcpLocaleKey } from './locales.ts';
type Translate = (key: AcpLocaleKey, params?: Record<string, string | number>) => string;
export interface ActivityToolOutputItem {
    readonly kind: 'text' | 'image' | 'audio' | 'resource' | 'diff' | 'terminal' | 'unknown';
    readonly text: string;
}
export interface ActivityToolOutput {
    /** Ordered content atoms; equal kinds or equal text do not imply duplicate content. */
    readonly items: readonly ActivityToolOutputItem[];
    /** Plain text only: this is not Markdown, a link, or a saved DSH attachment reference. */
    readonly text: string;
    /** Native read/diff/terminal cards do not render these resource descriptions themselves. */
    readonly hasUnrepresentedSupplement: boolean;
}
export declare function joinActivityToolOutput(items: readonly ActivityToolOutputItem[]): string;
/** ACP text content is the user-facing representation. Raw output is its fallback,
 * not a second copy; resource-only content still retains the raw textual result.
 * MCP raw results may themselves carry a content array or a known Codex envelope.
 * A dedicated native card must additionally render the returned resource atoms
 * inside the same tool row, because its body bypasses generic output text.
 */
export declare function activityToolOutput(rawOutput: unknown, content: unknown, t: Translate, terminal?: {
    readonly output?: string | undefined;
    readonly exitCode?: number | null | undefined;
}): ActivityToolOutput;
export {};
//# sourceMappingURL=activity-tool-output.d.ts.map