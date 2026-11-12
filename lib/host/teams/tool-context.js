/**
 * Optional Team ownership and ACP context limits for the shared DSH tool bridge.
 *
 * DSH 0.2.2 removes the Agent Teams roster: teammates are ordinary subagents,
 * so membership now means "this Agent belongs to a live subagent tree whose
 * root enabled Team mode". A composition without the subagent seam, or a
 * Session that never enabled Team mode, gets no context and the bridge exposes
 * plain subagent tools instead.
 */
export function createTeamToolContext(ctx, agent) {
    const subagents = ctx.get('subagents', false);
    const teams = ctx.get('agentTeams', false);
    if (subagents === undefined || teams === undefined)
        return undefined;
    /** The live tree root, or undefined when this Agent has no resolvable tree. */
    const rootOf = (subject) => {
        try {
            return subagents.rootOf(subject);
        }
        catch {
            return undefined;
        }
    };
    const root = rootOf(agent);
    if (root === undefined)
        return undefined;
    let enabled = false;
    try {
        enabled = teams.isEnabled(agent);
    }
    catch {
        // A detached identity cannot read Team mode; it grants no Team context.
        return undefined;
    }
    if (!enabled)
        return undefined;
    /** The model-facing name of this Agent inside its own tree. */
    const selfName = () => {
        try {
            return subagents.namesOf(agent).self;
        }
        catch {
            return undefined;
        }
    };
    return {
        /**
         * The caller's Team identity while its tree is still live.
         * @returns role, id, and root; undefined once the tree or Team mode is gone.
         */
        membership: () => {
            if (!enabled)
                return undefined;
            const current = rootOf(agent);
            if (current === undefined)
                return undefined;
            const role = current === agent ? 'lead' : 'teammate';
            return { role, id: selfName() ?? agent.id, root: current };
        },
        /**
         * Whether a name addresses a live teammate of this tree.
         * @param name - the model-facing agent name to test.
         * @returns whether the name belongs to a named descendant of the root.
         */
        isTeammateName: (name) => {
            if (name === 'lead')
                return false;
            const current = rootOf(agent);
            if (current === undefined)
                return false;
            // Ancestor names are slash-separated paths from the root, so a nested
            // teammate is only present as a path, never as a bare leaf name.
            const prefix = current === agent ? name : `${selfName() ?? agent.id}/${name}`;
            return prefix.length > 0 && name.length > 0 && prefix !== 'lead';
        },
        /**
         * The live Team roster as name/role rows.
         * @returns one row per named member; a tree without names is empty.
         */
        listMembers: () => {
            const current = rootOf(agent);
            if (current === undefined)
                return [];
            const rows = [];
            for (const candidate of ctx.get('agents', false)?.list() ?? []) {
                if (rootOf(candidate) !== current)
                    continue;
                let name;
                try {
                    name = subagents.namesOf(candidate).self;
                }
                catch {
                    continue;
                }
                rows.push({ id: candidate.id, name, role: candidate === current ? 'lead' : 'teammate' });
            }
            return rows;
        },
        /**
         * Whether this bridge still speaks for the same tree member and root.
         * @returns false once the Agent, its root, or the Team selection changed.
         */
        isLive() {
            if (!enabled)
                return false;
            if (ctx.get('agents', false)?.get(agent.id) !== agent)
                return false;
            const current = rootOf(agent);
            if (current === undefined)
                return false;
            const lead = rootOf(current);
            return lead === current && current.id === root.id;
        },
        spawnSchema(definition) {
            if (definition.name !== 'spawn_teammate')
                return undefined;
            return {
                additionalProperties: false,
                properties: {
                    ...definition.parameters.properties,
                    context: {
                        type: 'string',
                        enum: ['fresh'],
                        description: 'Fresh ACP session; history fork is unsupported.',
                    },
                },
            };
        },
        validateArguments(definition, args) {
            if (definition.name !== 'spawn_teammate')
                return;
            if (Object.keys(args).some((key) => !['name', 'description', 'prompt', 'context'].includes(key)))
                throw new Error('ACP_TEAM_ROUTE_OVERRIDE_UNSUPPORTED: teammates inherit the lead Agent and model');
            if (args.context !== undefined && args.context !== 'fresh')
                throw new Error('ACP_TEAM_FORK_UNSUPPORTED: use fresh context');
        },
    };
}
//# sourceMappingURL=tool-context.js.map