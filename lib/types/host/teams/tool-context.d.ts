import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
/**
 * Optional Team ownership and ACP context limits for the shared DSH tool bridge.
 *
 * DSH 0.2.2 removes the Agent Teams roster: teammates are ordinary subagents,
 * so membership now means "this Agent belongs to a live subagent tree whose
 * root enabled Team mode". A composition without the subagent seam, or a
 * Session that never enabled Team mode, gets no context and the bridge exposes
 * plain subagent tools instead.
 */
export declare function createTeamToolContext(ctx: Context, agent: Agent): {
    /**
     * The caller's Team identity while its tree is still live.
     * @returns role, id, and root; undefined once the tree or Team mode is gone.
     */
    membership: () => {
        readonly role: "lead" | "teammate";
        readonly id: string;
        readonly root: Agent;
    } | undefined;
    /**
     * Whether a name addresses a live teammate of this tree.
     * @param name - the model-facing agent name to test.
     * @returns whether the name belongs to a named descendant of the root.
     */
    isTeammateName: (name: string) => boolean;
    /**
     * The live Team roster as name/role rows.
     * @returns one row per named member; a tree without names is empty.
     */
    listMembers: () => readonly {
        readonly id: string;
        readonly name: string;
        readonly role: "lead" | "teammate";
    }[];
    /**
     * Whether this bridge still speaks for the same tree member and root.
     * @returns false once the Agent, its root, or the Team selection changed.
     */
    isLive(): boolean;
    spawnSchema(definition: ToolDefinition): {
        additionalProperties: boolean;
        properties: {
            context: {
                type: string;
                enum: string[];
                description: string;
            };
        };
    } | undefined;
    validateArguments(definition: ToolDefinition, args: Record<string, unknown>): void;
} | undefined;
//# sourceMappingURL=tool-context.d.ts.map