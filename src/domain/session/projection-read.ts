/**
 * Read a Session projection value across the two DSH 0.2.2 read faces.
 *
 * 0.2.2 deprecates the registry-level keyed read: `stateOf(session, key)`
 * returns `unknown` and narrows nothing. Two supported faces remain, and which
 * one applies depends on who registered the unit:
 *
 * - A unit this package registers returns a `ProjectionHandle` from `register()`,
 *   and `handle.stateOf(session)` yields the internal fold state that `apply`
 *   produces. Use {@link readProjectionState} for adapter-owned units.
 * - A unit the Host registers only exposes its declared client view through
 *   `snapshot(session, [key]).values[key]`. Use {@link readHostProjectionView}
 *   for Host-owned units such as `permissions` and `todos`.
 *
 * Reading a Host unit's internal state is not available by design: the view is
 * the published contract, and its `values` entry is absent when the unit is not
 * registered for this composition.
 * @module @deepseek-ai/dsh-acp-adapter/domain/session/projection-read
 */
import type { Context } from '@deepseek-ai/cordis'
import type { Session } from '@deepseek-ai/dsh-session'
import type {
  ProjectionHandle,
  SessionProjectionMap,
  SessionProjectionViewValues,
} from '@deepseek-ai/dsh-session-projection'

/** One registered client-visible projection key. */
type HostProjectionKey = Extract<keyof SessionProjectionMap, string>

/**
 * Read one adapter-registered unit's internal fold state.
 * @param handle - the registration handle captured when the unit was registered.
 * @param session - Session whose committed events are folded.
 * @returns the projection state at the Session's current cursor.
 */
export function readProjectionState<S>(handle: ProjectionHandle<S>, session: Session): S {
  return handle.stateOf(session)
}

/**
 * Read one Host-registered unit's published client view.
 * @param ctx - context that may carry the projection registry.
 * @param session - Session whose committed events are folded.
 * @param key - the Host's client-visible projection unit.
 * @returns the current view, or undefined when no registry or unit is available.
 */
export function readHostProjectionView<K extends HostProjectionKey>(
  ctx: Context,
  session: Session,
  key: K,
): SessionProjectionViewValues[K] | undefined {
  const projections = ctx.get('sessionProjections', false)
  if (projections === undefined) return undefined
  return projections.snapshot(session, [key]).values[key] as SessionProjectionViewValues[K] | undefined
}
