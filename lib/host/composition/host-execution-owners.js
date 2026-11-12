const registryKey = Symbol.for('dsh-acp-adapter.host-execution-owners.v1');
const fallbackKey = Symbol.for('dsh-acp-adapter.recovery-fallbacks.v1');
const archiveKey = Symbol.for('dsh-acp-adapter.reconciled-feedback-owners.v1');
function registry() {
    const host = globalThis;
    return (host[registryKey] ??= new WeakMap());
}
function hostRoot(root) {
    return root.root ?? root;
}
function recoveryFallbacks() {
    const host = globalThis;
    return (host[fallbackKey] ??= new WeakMap());
}
function feedbackArchives() {
    const host = globalThis;
    return (host[archiveKey] ??= new WeakMap());
}
export function setSharedRecoveryFallback(root, state) {
    const key = hostRoot(root);
    let states = recoveryFallbacks().get(key);
    if (states === undefined)
        recoveryFallbacks().set(key, (states = new Map()));
    states.set(state.dshSessionId, state);
}
export function getSharedRecoveryFallback(root, sessionId) {
    return recoveryFallbacks().get(hostRoot(root))?.get(sessionId);
}
export function clearSharedRecoveryFallback(root, sessionId) {
    recoveryFallbacks().get(hostRoot(root))?.delete(sessionId);
}
function ownersFor(root) {
    const key = hostRoot(root);
    let owners = registry().get(key);
    if (owners === undefined) {
        owners = new Map();
        registry().set(key, owners);
    }
    return owners;
}
function ownerIsQuiescent(owner) {
    return (owner.hasPendingHostCalls?.() === false &&
        (owner.hasUncommittedHostFeedback === undefined || owner.hasUncommittedHostFeedback() === false) &&
        (owner.hasRetainedHostFeedback === undefined || owner.hasRetainedHostFeedback() === false));
}
/** Keep draining Host calls visible across profile adapter replacement and plugin reinstallation. */
export function retainHostExecutionOwner(root, sessionId, owner) {
    if (owner.hasPendingHostCalls?.() !== true &&
        owner.hasUncommittedHostFeedback?.() !== true &&
        owner.hasRetainedHostFeedback?.() !== true)
        return;
    const owners = ownersFor(root);
    let sessionOwners = owners.get(sessionId);
    if (sessionOwners === undefined)
        owners.set(sessionId, (sessionOwners = new Set()));
    let state = [...sessionOwners].find((candidate) => candidate.owner === owner);
    if (state === undefined)
        sessionOwners.add((state = { owner, failed: false }));
    const wait = owner.waitForHostCallsSettled;
    if (wait === undefined)
        return;
    void wait.call(owner).then(() => {
        if (owner.hasPendingHostCalls?.() === true)
            return;
        if (owner.hasUncommittedHostFeedback?.() === true)
            return;
        if (owner.hasRetainedHostFeedback?.() === true)
            return;
        sessionOwners.delete(state);
        if (sessionOwners.size === 0)
            owners.delete(sessionId);
    }, () => {
        // The observer may reject after the public tool state has already
        // settled (for example, a post-append inbox subscriber). Trust the
        // public pending/feedback facts before retaining an owner gate.
        if (ownerIsQuiescent(owner)) {
            sessionOwners.delete(state);
            if (sessionOwners.size === 0)
                owners.delete(sessionId);
        }
        else
            state.failed = true;
    });
}
/** Recovery must fail fast while an abandoned transport can still execute or report a tool. */
export function assertHostExecutionQuiescent(root, sessionId, allowSettledFailure = false) {
    const ownerMap = registry().get(hostRoot(root));
    const owners = ownerMap?.get(sessionId);
    if (owners === undefined)
        return;
    for (const state of [...owners]) {
        const pending = state.owner.hasPendingHostCalls?.() === true;
        const uncommittedFeedback = state.owner.hasUncommittedHostFeedback?.() === true;
        const quiescent = ownerIsQuiescent(state.owner);
        // A rejected observer promise is not permanent evidence of active work.
        // Recheck the owner's public state whenever the gate is consulted and
        // retire a previously failed owner once all work and feedback have settled.
        if (state.failed && quiescent) {
            owners.delete(state);
            continue;
        }
        if (pending || (!allowSettledFailure && (state.failed || uncommittedFeedback)))
            throw new Error('ACP_HOST_EXECUTION_STILL_ACTIVE');
    }
    if (owners.size === 0)
        ownerMap?.delete(sessionId);
}
/** Move feedback evidence out of the active gate after an explicit recovery action succeeds. */
export function clearHostExecutionOwners(root, sessionId) {
    const key = hostRoot(root);
    const owners = registry().get(key);
    const sessionOwners = owners?.get(sessionId);
    if (owners === undefined || sessionOwners === undefined)
        return;
    for (const state of sessionOwners) {
        if (state.owner.hasPendingHostCalls?.() === true)
            throw new Error('ACP_HOST_EXECUTION_STILL_ACTIVE');
        if (state.owner.hasRetainedHostFeedback?.() === true) {
            let sessions = feedbackArchives().get(key);
            if (sessions === undefined)
                feedbackArchives().set(key, (sessions = new Map()));
            let archive = sessions.get(sessionId);
            if (archive === undefined)
                sessions.set(sessionId, (archive = new Set()));
            archive.add(state.owner);
        }
    }
    owners.delete(sessionId);
}
//# sourceMappingURL=host-execution-owners.js.map