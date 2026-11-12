class ExternalPermissionQuestionError extends Error {
    code;
    constructor(code) {
        super(`ACP permission presentation unavailable: ${code}`);
        this.code = code;
        this.name = 'ExternalPermissionQuestionError';
    }
}
function sourceText(value) {
    return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim();
}
function shortSessionId(id, ids) {
    let length = Math.min(8, id.length);
    while (length < id.length && ids.some((other) => other !== id && other.startsWith(id.slice(0, length))))
        length++;
    return id.slice(0, length);
}
/**
 * Present an external ACP permission on its live runtime root. The root owns
 * only this native question; the caller retains the child ACP request and its
 * exact option/value mapping and audit. Ordinary child questions never use it.
 *
 * The pinned Gateway sends scoped waterfalls only to owner Peers (which can
 * access every Session), and rejects non-owner replies. No request payload is
 * broadcast as a notification or exposed through a new approval endpoint.
 */
export function externalAgentPermissionQuestions(ctx, getAgent, native, locale) {
    return {
        async ask(request, onPresentation) {
            const agents = ctx.get('agents', false);
            const subagents = ctx.get('subagents', false);
            const child = getAgent();
            if (agents === undefined ||
                subagents === undefined ||
                child === undefined ||
                request.agent !== child ||
                agents.get(child.id) !== child)
                throw new ExternalPermissionQuestionError('CALLER_NOT_LIVE');
            if (request.signal?.aborted)
                throw new ExternalPermissionQuestionError('ASK_ABORTED');
            /** The runtime owner is authoritative; a detached identity has no live tree. */
            const isRoot = (agent) => {
                try {
                    return subagents.rootOf(agent) === agent;
                }
                catch {
                    return false;
                }
            };
            const isOwnedBy = (subject, owner) => {
                if (subject.session.header.parentSession !== owner.id)
                    return false;
                try {
                    return subagents.rootOf(subject) === subagents.rootOf(owner);
                }
                catch {
                    return false;
                }
            };
            if (isRoot(child))
                return native.ask(request);
            const projections = ctx.get('sessionProjections', false);
            if (projections === undefined)
                throw new ExternalPermissionQuestionError('DELEGATED_CALLER');
            const zh = locale?.toLowerCase().startsWith('zh') === true;
            const path = [];
            const seen = new Set();
            let root = child;
            while (!isRoot(root)) {
                if (seen.has(root) || agents.get(root.id) !== root || root.session.header.origin !== 'subagent')
                    throw new ExternalPermissionQuestionError('DELEGATED_CALLER');
                seen.add(root);
                const view = projections.snapshot(root.session, ['subagent', 'acpExecution']).values;
                const identity = view.subagent;
                if (identity == null || !root.session.isOwnSeq(identity.seq) || view.acpExecution?.externalSubagent === true)
                    throw new ExternalPermissionQuestionError('DELEGATED_CALLER');
                path.unshift({
                    agent: root,
                    name: sourceText(identity.label ?? '') || (zh ? '子 Agent' : 'Subagent'),
                });
                // The runtime owner is authoritative. Persisted parentSession is not a
                // permission to route a restored independent fork to an old parent.
                const owners = agents.list().filter((candidate) => isOwnedBy(root, candidate));
                if (owners.length !== 1)
                    throw new ExternalPermissionQuestionError('DELEGATED_CALLER');
                root = owners[0];
            }
            const chain = [root, ...path.map((entry) => entry.agent)];
            const current = () => getAgent() === child &&
                child.status === 'running' &&
                isRoot(root) &&
                chain.every((agent, index) => agents.get(agent.id) === agent && (index === 0 || isOwnedBy(agent, chain[index - 1])));
            if (!current())
                throw new ExternalPermissionQuestionError('ASK_ABORTED');
            const lifetime = new AbortController();
            const signal = request.signal === undefined ? lifetime.signal : AbortSignal.any([request.signal, lifetime.signal]);
            const finished = Promise.withResolvers();
            const cancelled = Promise.withResolvers();
            const abort = () => cancelled.resolve(null);
            const releases = [];
            signal.addEventListener('abort', abort, { once: true });
            try {
                // Keep no pending approval registry. These effects own only the link
                // between one live ACP request and the native question's lifetime.
                for (const owner of new Set([ctx, ...chain.map((agent) => agent.ctx)])) {
                    releases.push(owner.effect(() => async () => {
                        lifetime.abort();
                        await finished.promise;
                    }, 'dsh-acp: delegated permission presentation'));
                }
                releases.push(ctx.on('agent/disposed', ({ agent }) => {
                    if (chain.includes(agent))
                        lifetime.abort();
                }, { global: true }));
                if (signal.aborted || !current())
                    throw new ExternalPermissionQuestionError('ASK_ABORTED');
                const liveIds = agents.list().map((agent) => agent.id);
                const names = path.map((entry) => `${entry.name} · ${shortSessionId(entry.agent.id, liveIds)}`).join(' → ');
                const source = path.map((entry) => `${entry.name} (${entry.agent.id})`).join(' → ');
                let delimiterLength = 1;
                for (const match of source.matchAll(/`+/g))
                    delimiterLength = Math.max(delimiterLength, match[0].length + 1);
                const delimiter = '`'.repeat(delimiterLength);
                const detail = `${zh ? '来源子会话' : 'Source child session'}: ${delimiter} ${source} ${delimiter}`;
                onPresentation?.({ rootSessionId: root.id, path: path.map((entry) => entry.agent.id) });
                const question = native.ask({
                    agent: root,
                    questions: request.questions.map((item) => ({
                        ...item,
                        ...(item.header === undefined
                            ? { question: `${zh ? '子会话授权' : 'Child permission'}: ${names}\n${item.question}` }
                            : { header: `${zh ? '子会话授权' : 'Child permission'}: ${names}` }),
                        detail: item.detail === undefined ? detail : `${detail}\n\n${item.detail}`,
                    })),
                    signal,
                });
                const answer = await Promise.race([question, cancelled.promise]);
                if (answer === null || signal.aborted || !current())
                    throw new ExternalPermissionQuestionError('ASK_ABORTED');
                return answer;
            }
            finally {
                finished.resolve();
                signal.removeEventListener('abort', abort);
                await Promise.allSettled(releases.map((release) => release()));
            }
        },
    };
}
//# sourceMappingURL=external-agent-questions.js.map