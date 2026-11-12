import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-subagent'
import type {} from '@deepseek-ai/dsh-agent-team'
import type {} from '../../contract/external-subagent.ts'
import type { AcpApprovalChildView } from '../../contract/remote.ts'

/** Discover only live, descriptor-backed descendants; persisted lineage alone grants nothing. */
export function createApprovalChildrenReader(ctx: Context, owns: (provider: string) => boolean) {
  return (parentId: string): readonly AcpApprovalChildView[] => {
    const agents = ctx.get('agents', false)
    const projections = ctx.get('sessionProjections', false)
    const subagents = ctx.get('subagents', false)
    const root = agents?.get(parentId as SessionId)
    if (agents === undefined || projections === undefined || subagents === undefined || root === undefined) return []
    /** The runtime owner is authoritative: a recorded parent grants lineage only inside one live tree. */
    const isOwnedBy = (child: Agent, parent: Agent): boolean => {
      if (child.session.header.parentSession !== parent.id) return false
      try {
        return subagents.rootOf(child) === subagents.rootOf(parent)
      } catch {
        // A detached or non-resident identity owns no live tree; it grants no lineage.
        return false
      }
    }
    const identityOf = (child: Agent) => {
      if (child.session.header.origin !== 'subagent') return undefined
      const view = projections.snapshot(child.session, ['subagent', 'acpExecution']).values
      const identity = view.subagent
      if (view.acpExecution?.externalSubagent === true || identity == null || !child.session.isOwnSeq(identity.seq))
        return undefined
      return identity
    }
    const result: AcpApprovalChildView[] = []
    const labelOf = (child: Agent, label: string | undefined): string => {
      // Team mode keeps the caller's model-facing name; roster identity is no
      // longer readable in 0.2.2, so fall back to the subagent name.
      const teams = ctx.get('agentTeams', false)
      if (teams !== undefined) {
        try {
          if (teams.isEnabled(child)) return subagents.namesOf(child).self
        } catch {
          // An agent outside a resolvable tree keeps the descriptor label.
        }
      }
      return label ?? child.id
    }
    for (const child of agents.list()) {
      const provider = child.session.requestHeader()?.config.provider ?? child.options.provider
      if (provider === undefined || !owns(provider) || agents.get(child.id) !== child) continue
      const identity = identityOf(child)
      if (identity === undefined) continue
      const path: { sessionId: string; name: string }[] = []
      const visited = new Set<SessionId>()
      let current: Agent | undefined = child
      while (current !== undefined && current !== root) {
        if (visited.has(current.id) || agents.get(current.id) !== current) break
        visited.add(current.id)
        const currentIdentity = identityOf(current)
        const parent: Agent | undefined =
          current.session.header.parentSession === undefined
            ? undefined
            : agents.get(current.session.header.parentSession)
        if (currentIdentity === undefined || parent === undefined || !isOwnedBy(current, parent)) break
        path.unshift({ sessionId: current.id, name: labelOf(current, currentIdentity.label) })
        current = parent
      }
      if (current !== root || path.length === 0 || agents.get(root.id) !== root) continue
      result.push({
        sessionId: child.id,
        parentSessionId: child.session.header.parentSession!,
        name: labelOf(child, identity.label),
        mode: identity.mode,
        path,
      })
    }
    return result
  }
}
