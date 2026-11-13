import { z } from 'zod';
import { readHostProjectionView, readProjectionState } from "../../domain/session/projection-read.js";
import { applySessionFact, initialSessionFacts, sessionFactsSchema, } from "../../domain/session/session-facts.js";
import { currentModelContextSnapshots } from "../../domain/session/model-context-snapshots.js";
const externalRecordView = { externalSubagent: true };
const ordinarySessionView = { externalSubagent: false };
export const acpExecutionProjection = {
    key: 'acpExecution',
    stateVersion: 2,
    stateSchema: sessionFactsSchema,
    init: (_header, inheritedEventCount) => initialSessionFacts(inheritedEventCount),
    apply: applySessionFact,
    wire: {
        viewSchema: z.object({ externalSubagent: z.boolean() }),
        view: (state) => (state.externalSubagent ? externalRecordView : ordinarySessionView),
    },
};
/**
 * The registration handle for this package's own `acpExecution` unit.
 *
 * DSH 0.2.2 reads a registered unit's fold state through the handle returned by
 * `register()`, and that handle is only available to the composition that
 * registered it. The adapter registers exactly one such unit per profile
 * registry, so the composition publishes its handle here before serving reads;
 * a read before publication fails closed instead of folding a second time.
 */
let executionProjectionHandle;
/**
 * Publish the registered `acpExecution` handle for subsequent reads.
 * @param handle - the ready handle returned by `sessionProjections.register`.
 */
export function installExecutionProjectionHandle(handle) {
    executionProjectionHandle = handle;
}
export function readSessionFacts(_ctx, session) {
    if (executionProjectionHandle === undefined)
        throw new Error('ACP execution projection is unavailable');
    return readProjectionState(executionProjectionHandle, session);
}
/** Accessors always read the host's current cut, including after a policy append. */
export function acpSessionView(ctx, session) {
    if (session === undefined)
        return undefined;
    return {
        identity: session,
        header: session.header,
        inheritedEventCount: session.inheritedEventCount,
        get workingDirectory() {
            return ctx.get('workingDirectory')?.get(session);
        },
        get seq() {
            return session.seq;
        },
        get facts() {
            return readSessionFacts(ctx, session);
        },
        captureRemoteCancelledTurn: (scope) => {
            const registry = ctx.get('agents', false);
            const owner = registry?.get(session.id);
            const matchesScope = () => {
                const facts = readSessionFacts(ctx, session);
                return (facts.turnOpen &&
                    facts.openSteps.some((step) => step.turn === scope.turn && step.step === scope.step && step.startSeq === scope.startSeq));
            };
            if (owner?.session !== session || owner.status !== 'running' || !matchesScope())
                return undefined;
            return () => {
                const current = ctx.get('agents', false)?.get(session.id);
                if (current !== owner || current.session !== session || current.status !== 'running' || !matchesScope())
                    return false;
                current.cancel({ kind: 'hook', reason: 'acp-remote-cancelled' }, { keepInbox: true });
                return true;
            };
        },
        currentModelContextSnapshots: () => {
            const agent = ctx.get('agents', false)?.get(session.id);
            const tools = ctx.get('tools', false);
            const skillEntryPointAvailable = agent !== undefined && tools?.schemas(agent).some((schema) => schema.name === 'skill') === true;
            return currentModelContextSnapshots(session.deriveMessages(), skillEntryPointAvailable);
        },
        get permissions() {
            const state = readHostProjectionView(ctx, session, 'permissions');
            if (state === undefined)
                throw new Error('DSH permission projection is unavailable');
            return state;
        },
        append: (type, data) => session.append(type, data),
        watchTurnEnd: (listener) => ctx.on('session/event', (owner, event) => {
            if (owner.id === session.id && event.type === 'turn/end')
                listener();
        }),
        watchWorkingDirectory: (listener) => ctx.on('session/event', (owner, event) => {
            if (owner === session && event.type === 'working-directory/change')
                listener(event.data.cwd);
        }),
        watchRouteChange: (provider, listener) => ctx.on('agent/request', async ({ agent }, next) => {
            const config = await next();
            if (agent.id === session.id && config.provider !== provider)
                await listener();
            return config;
        }),
        watchSteering: (listener) => {
            let disposed = false;
            const check = () => {
                if (disposed)
                    return;
                const agent = ctx.get('agents')?.get(session.id);
                if (agent?.inbox.nextStep.some((message) => message.source.kind === 'user' || message.source.kind === 'user-question-reply'))
                    listener();
            };
            // Re-read after the mutation's synchronous listeners have run: an edit or
            // removal in the same task must not interrupt an otherwise valid prompt.
            const off = ctx.on('agent/inbox/inserted', ({ agent }) => {
                if (agent.id === session.id)
                    queueMicrotask(check);
            });
            queueMicrotask(check);
            return () => {
                disposed = true;
                off();
            };
        },
        publishPlan: (todos) => {
            // tool-todo is optional. Its projection owns current plan state and the native dock.
            if (readHostProjectionView(ctx, session, 'todos') === undefined)
                return;
            session.append('todo/write', { todos: [...todos] });
        },
    };
}
//# sourceMappingURL=session-facts.js.map