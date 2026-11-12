import type { TeamProjection } from '@deepseek-ai/dsh-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/**
 * Roster state for the ACP Team panel.
 *
 * DSH 0.2.2 removes the Agent Teams roster: teammates are ordinary subagents,
 * and the `agentTeam` projection now carries only the saved mode and the task
 * board. The panel therefore reports `unavailable` rather than reconstructing a
 * membership view from data the Host no longer publishes.
 */
export type TeamRoster =
  | { readonly kind: 'loading'; readonly members: readonly [] }
  | { readonly kind: 'unavailable'; readonly members: readonly [] }
  | {
      readonly kind: 'failed'
      readonly message: string
      readonly members: readonly []
      readonly memberIds: readonly SessionId[]
    }
  | { readonly kind: 'empty'; readonly members: readonly [] }
  | { readonly kind: 'ready'; readonly members: readonly never[] }

/**
 * Interpret the shared Team projection for the panel.
 * @param projection - the Host's `agentTeam` projection, when available.
 * @param loading - whether the projection is still being read.
 * @returns the roster state; 0.2.2 exposes no member rows, so a loaded
 *   projection without a failure is `empty`, not `ready`.
 */
export function teamRoster(projection: TeamProjection | undefined, loading: boolean): TeamRoster {
  if (projection === undefined) return loading ? { kind: 'loading', members: [] } : { kind: 'unavailable', members: [] }
  if (projection.failure !== undefined)
    return {
      kind: 'failed',
      message: projection.failure,
      members: [],
      // No roster survives in this projection, so a failure cannot name members.
      memberIds: [],
    }
  return { kind: 'empty', members: [] }
}

/**
 * A revision string that changes whenever the projected Team state changes.
 * @param projection - the Host's `agentTeam` projection, when available.
 * @returns a stable encoding of the mode, failure, and task board.
 */
export function projectionRevision(projection: TeamProjection | undefined): string {
  if (projection === undefined) return ''
  return JSON.stringify([
    projection.failure,
    projection.enabled,
    projection.tasks.map((task) => [task.id, task.revision, task.status, task.ownerId, task.ownerName]),
  ])
}
