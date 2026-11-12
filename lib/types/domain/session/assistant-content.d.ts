/** Shared visible fallbacks for ACP assistant content DSH cannot render natively. */
import type * as acp from '@agentclientprotocol/sdk';
export type AcpNonTextContent = Exclude<acp.ContentBlock, {
    readonly type: 'text';
}>;
/** Native text fallback for ACP output kinds DSH cannot render directly. */
export declare function nonTextContentFallback(content: AcpNonTextContent): string;
//# sourceMappingURL=assistant-content.d.ts.map