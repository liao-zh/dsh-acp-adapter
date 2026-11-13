import { LlmError } from '@deepseek-ai/dsh-llm';
import { readHostProjectionView } from "../../domain/session/projection-read.js";
import { readSessionFacts } from "./session-facts.js";
import { acpAgentIdFromRoute } from "../../domain/session/agent-config.js";
/** Classify one model transition without performing the transition. */
export function classifyBackendTransition(input) {
    const nextProfile = acpAgentIdFromRoute(input.next.provider);
    const previousProfile = acpAgentIdFromRoute(input.lastUsed?.provider ?? '');
    if (nextProfile === undefined) {
        // Native → native, including a model/provider change, never needs ACP
        // continuity and therefore cannot be affected by stale ACP state.
        if (input.lastUsed === null || previousProfile === undefined)
            return 'allow-native';
        return 'require-new-session';
    }
    if (input.lastUsed === null) {
        // An inconsistent projection must not let ACP adopt an existing transcript.
        return input.blank && !input.hasPriorSemanticHistory ? 'allow-blank-acp' : 'require-new-session';
    }
    if (previousProfile === undefined || previousProfile !== nextProfile)
        return 'require-new-session';
    return input.bindingProfileId === nextProfile ? 'allow-same-acp' : 'recovery-conflict';
}
function transitionError(code, message, cause) {
    return LlmError.fromFailure({ message: message, code: code }, cause instanceof Error ? { cause } : undefined);
}
async function blockWithRecovery(sidecar, sessionId, provider, cause, detail, binding) {
    const bindingData = binding?.status === 'ok' ? binding.binding : undefined;
    try {
        await sidecar.writeRecoveryState({
            dshSessionId: sessionId,
            kind: 'reconciliation-required',
            cause,
            detail,
            provider,
            ...(bindingData === undefined
                ? {}
                : { acpSessionId: bindingData.agentSessionId, generation: bindingData.generation }),
            updatedAt: Date.now(),
        });
    }
    catch (error) {
        throw transitionError('ACP_BACKEND_RECOVERY_REQUIRED', `ACP transition is blocked and its recovery state could not be persisted: ${detail}`, error);
    }
    throw transitionError('ACP_BACKEND_RECOVERY_REQUIRED', detail);
}
/** Install the additive, scoped request guard without replacing DSH's loop. */
export function installAcpBackendGuard(ctx, options) {
    ctx.inject(['sessionProjections'], (projectionCtx) => {
        projectionCtx.on('agent/request', async (payload, next) => {
            const resolved = await next();
            const session = payload.agent.session;
            const projection = readHostProjectionView(projectionCtx, session, 'modelSelection');
            const targetProfile = acpAgentIdFromRoute(resolved.provider);
            const priorHistory = readSessionFacts(projectionCtx, session).priorSemanticHistory;
            // The API controller contributes modelSelection for interactive hosts.
            // Headless AgentLoop hosts retain the same committed route in the native
            // Session request header. Do not require an API/UI plugin to continue ACP.
            const previous = projection === undefined ? (session.requestHeader()?.config ?? null) : projection.lastUsed;
            if (targetProfile === undefined && (previous === null || acpAgentIdFromRoute(previous.provider) === undefined))
                return resolved;
            const previousProfile = acpAgentIdFromRoute(previous?.provider ?? '');
            const baseInput = {
                lastUsed: previous,
                next: resolved,
                blank: !priorHistory,
                hasPriorSemanticHistory: priorHistory,
            };
            // ACP sidecar is consulted only for a same-profile continuation. This
            // keeps all native and cross-backend decisions independent of ACP I/O.
            if (targetProfile === undefined || previousProfile === undefined || previousProfile !== targetProfile) {
                const transition = classifyBackendTransition(baseInput);
                if (transition === 'allow-native' || transition === 'allow-blank-acp')
                    return resolved;
                if (transition === 'require-new-session')
                    throw transitionError('ACP_BACKEND_NEW_SESSION_REQUIRED', 'This selection changes the execution backend; create a new DSH session to continue');
                throw transitionError('ACP_BACKEND_RECOVERY_REQUIRED', 'The DSH model-selection state conflicts with the ACP backend; restore the session or create a new DSH session');
            }
            const sessionId = String(session.id);
            let binding;
            try {
                binding = await options.sidecar.readLatestBinding(session.id);
            }
            catch (error) {
                await blockWithRecovery(options.sidecar, sessionId, resolved.provider, 'binding-missing', 'ACP binding could not be read; restore the session or create a new DSH session', undefined);
                throw error;
            }
            // A native fork has no child ACP binding until its first dispatch. The
            // provider proves the inherited boundary before forking; a seeded child
            // that cannot preserve its history must fail instead of starting blank.
            if (binding === undefined && session.header.parentSession !== undefined && previousProfile === targetProfile) {
                return resolved;
            }
            const transition = classifyBackendTransition({
                ...baseInput,
                ...(binding?.status === 'ok' ? { bindingProfileId: binding.binding.profileId } : {}),
            });
            if (transition === 'allow-same-acp')
                return resolved;
            const cause = binding?.status === 'ok' && binding.binding.profileId !== targetProfile ? 'backend-conflict' : 'binding-missing';
            return await blockWithRecovery(options.sidecar, sessionId, resolved.provider, cause, 'ACP session binding is missing or belongs to another profile; restore the original profile or create a new DSH session', binding);
        });
    });
}
//# sourceMappingURL=backend-guard.js.map