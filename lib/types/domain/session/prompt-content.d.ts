import type { AttachmentStore, ImageAttachmentLimits } from '@deepseek-ai/dsh-attachment';
import type * as acp from '@agentclientprotocol/sdk';
import type { RequestMessage } from '@deepseek-ai/dsh-llm';
import type { UserMessage } from '@deepseek-ai/dsh-session';
import type { ModelContextSnapshot } from './model-context-snapshots.ts';
/** A prompt block that cannot be represented by the negotiated ACP bridge. */
export declare class AcpPromptContentError extends Error {
    constructor(message: string);
}
/** The skill route available in this exact model request. */
export type SkillRoute = 'direct' | 'ptc' | 'disabled';
/** Resolve the route from the final tool presentation for the current request. */
export declare function skillRouteForTools(tools: readonly {
    readonly name: string;
}[] | undefined): SkillRoute;
/**
 * Restore DSH-owned instructions only when explicitly creating a blank remote
 * session. The frozen request projection is authoritative: retain its ordered
 * baseline, replacement and removal messages without reading shadowed history
 * or replaying ordinary users. Already admitted messages are excluded.
 */
export declare function reboundAgentInstructions(admitted: readonly UserMessage[], projected: readonly RequestMessage[]): readonly UserMessage[];
/** Validate the image limits before accepting any attachment bytes. */
export declare function validImageLimits(limits: ImageAttachmentLimits): boolean;
/**
 * Resolve claimed DSH messages into ordered ACP prompt blocks. Images are read
 * only through DSH's durable attachment service; UI paths and arbitrary file
 * URLs are never trusted as attachment bytes.
 */
export declare function toAcpPrompt(messages: readonly UserMessage[], options: {
    /** ACP has no system role. Supply the host's current instructions as
     * explicitly labelled request context, including an empty replacement. */
    readonly system?: string;
    /** Current DSH-owned model context snapshots, already source-allow-listed. */
    readonly modelContextSnapshots?: readonly ModelContextSnapshot[];
    /** Effective frozen request history, supplied only for an explicit blank rebind. */
    readonly reboundAgentInstructions?: readonly RequestMessage[];
    /** Route exposed by the final tool presentation for this model request. */
    readonly skillRoute?: SkillRoute;
    /** Whether the current Agent scope has the Skill tool used by either route. */
    readonly skillCatalogAvailable?: boolean;
    readonly imageEnabled: boolean;
    readonly attachments?: Pick<AttachmentStore, 'readImage' | 'imageLimits'>;
    readonly signal: AbortSignal;
}): Promise<acp.ContentBlock[]>;
//# sourceMappingURL=prompt-content.d.ts.map