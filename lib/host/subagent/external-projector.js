var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/// <reference types="node" />
import { createHash } from 'node:crypto';
import { SESSION_FORMAT_VERSION, Session, SessionId, SessionLogOffset, SessionSeq, } from '@deepseek-ai/dsh-session';
import { createSessionFormatCatalogWithChildren } from '@deepseek-ai/dsh-session-format-catalog';
import { releasedV3SessionFormatCodec } from '@deepseek-ai/dsh-session-format-v3-to-v4';
import { foldSubagentDescriptor, SUBAGENT_DESCRIPTOR_VERSION } from '@deepseek-ai/dsh-subagent';
import { AssistantStreamAccumulator } from '@deepseek-ai/dsh-llm';
import { MessageId } from '@deepseek-ai/dsh-llm/brand';
import { SessionAlreadyExistsError, SessionPersistenceNotFoundError } from '@deepseek-ai/dsh-session-persistence';
import { EXTERNAL_CHILD_RESULT_PREVIEW_LIMIT, } from "../../domain/subagent/external-delegation.js";
import { redactSecretText } from "../../domain/observability/redaction.js";
import { EXTERNAL_SUBAGENT_DESCRIPTOR_PROVIDER } from "../../contract/external-subagent.js";
export const EXTERNAL_SUBAGENT_ACTIVITY_ANCHOR = 'external-subagent-record';
export { EXTERNAL_SUBAGENT_DESCRIPTOR_PROVIDER } from "../../contract/external-subagent.js";
function canonical(value) {
    if (Array.isArray(value))
        return `[${value.map(canonical).join(',')}]`;
    if (value !== null && typeof value === 'object') {
        return `{${Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}
function digest(value) {
    return createHash('sha256').update(canonical(value)).digest('hex');
}
function bounded(value, limit = EXTERNAL_CHILD_RESULT_PREVIEW_LIMIT) {
    return value.length <= limit ? value : `${value.slice(0, limit)}… [truncated]`;
}
/** Canonicalize persisted/display text before both projection and digesting.
 * Sidecar Activity redaction must not mutate an authenticated projection later. */
function safeObservation(observation) {
    return {
        ...observation,
        label: bounded(redactSecretText(observation.label), 256),
        task: { ...observation.task, text: bounded(redactSecretText(observation.task.text)) },
        result: { ...observation.result, text: bounded(redactSecretText(observation.result.text)) },
        ...(observation.model === undefined
            ? {}
            : { model: { ...observation.model, id: redactSecretText(observation.model.id) } }),
    };
}
function childId(context, observation) {
    const key = {
        profileId: context.profileId,
        bindingGeneration: context.bindingGeneration,
        rootAcpSessionId: context.rootAcpSessionId,
        vendorDelegationKey: observation.vendorDelegationKey,
    };
    return `session-dsh-acp-${digest(key).slice(0, 32)}`;
}
function recordDetail(childSessionId, context, observation, projected) {
    const evidence = {
        profileId: context.profileId,
        bindingGeneration: context.bindingGeneration,
        rootAcpSessionId: context.rootAcpSessionId,
        vendorDelegationKey: observation.vendorDelegationKey,
        sourceToolCallId: observation.sourceToolCallId,
        vendorChildId: observation.vendorChildId,
        task: observation.task,
        result: observation.result,
        status: observation.status,
        model: observation.model,
        usage: observation.usage,
        timing: observation.timing,
    };
    return {
        kind: 'dsh-acp-external-subagent',
        version: 5,
        childSessionId,
        parentDshSessionId: context.parentDshSessionId,
        profileId: context.profileId,
        profileKind: observation.profileKind,
        task: { ...observation.task, text: bounded(observation.task.text) },
        result: { ...observation.result, text: bounded(observation.result.text) },
        ...(observation.model === undefined ? {} : { model: observation.model }),
        ...(observation.usage === undefined ? {} : { usage: observation.usage }),
        timing: observation.timing,
        evidenceDigest: digest(evidence),
        projectionHeader: projected.header,
        projectionLabel: (projected.events[0]?.data).label,
        projectionStartedAt: projected.events[0]?.time ?? projected.header.createdAt,
        projectionCompletedAt: projected.events.at(-1)?.time ?? projected.header.createdAt,
        projectionDigest: digest(projected),
    };
}
function transcriptLog(header, label, startedAt, completedAt, detail) {
    const user = {
        id: MessageId(`${header.id}:external-task`),
        role: 'user',
        content: [{ type: 'text', text: detail.task.text }],
        source: { kind: 'user' },
    };
    const reported = detail.result.completeness === 'summary' ? `Agent-reported summary:\n\n${detail.result.text}` : detail.result.text;
    const assistant = {
        id: MessageId(`${header.id}:external-result`),
        role: 'assistant',
        content: [{ type: 'text', text: reported }],
        source: {
            kind: 'model',
            provider: EXTERNAL_SUBAGENT_DESCRIPTOR_PROVIDER,
            model: detail.model?.id ?? `${detail.profileKind}-external-subagent`,
        },
    };
    const usage = detail.usage?.inputTokens !== undefined && detail.usage.outputTokens !== undefined
        ? {
            inputTokens: detail.usage.inputTokens,
            outputTokens: detail.usage.outputTokens,
            ...(detail.usage.totalTokens === undefined ? {} : { totalTokens: detail.usage.totalTokens }),
            ...(detail.usage.cacheReadTokens === undefined ? {} : { cacheReadTokens: detail.usage.cacheReadTokens }),
            ...(detail.usage.cacheWriteTokens === undefined ? {} : { cacheWriteTokens: detail.usage.cacheWriteTokens }),
        }
        : undefined;
    // This is a projection of the reported result, not a reconstructed external
    // token timeline. All synthetic chunks use the result observation time.
    const stream = new AssistantStreamAccumulator();
    stream.push({ time: completedAt, chunk: { type: 'block-start', index: 0, blockType: 'text' } });
    stream.push({ time: completedAt, chunk: { type: 'text-delta', index: 0, text: reported } });
    stream.push({ time: completedAt, chunk: { type: 'block-end', index: 0, block: { type: 'text', text: reported } } });
    if (usage !== undefined)
        stream.push({ time: completedAt, chunk: { type: 'usage', usage } });
    stream.push({ time: completedAt, chunk: { type: 'finish', reason: { kind: 'stop' } } });
    const events = [
        {
            type: 'subagent/descriptor',
            seq: SessionSeq(0),
            time: startedAt,
            // This is a read-only local transcript, not a resumable activation or an
            // external catalog leaf. The released historical descriptor remains readable.
            data: {
                version: SUBAGENT_DESCRIPTOR_VERSION,
                mode: 'one-shot',
                provider: EXTERNAL_SUBAGENT_DESCRIPTOR_PROVIDER,
                label,
            },
        },
        { type: 'turn/start', seq: SessionSeq(1), time: startedAt, data: { turn: 1 } },
        { type: 'step/start', seq: SessionSeq(2), time: startedAt, data: { turn: 1, step: 1 } },
        { type: 'user/message', seq: SessionSeq(3), time: startedAt, data: user, surfaceOp: 'append' },
        {
            type: 'assistant/message',
            seq: SessionSeq(4),
            time: completedAt,
            data: {
                turn: 1,
                step: 1,
                message: assistant,
                ...(usage === undefined ? {} : { usage }),
                stream: [...stream.snapshot()],
            },
            surfaceOp: 'append',
        },
        { type: 'step/end', seq: SessionSeq(5), time: completedAt, data: { turn: 1, step: 1 } },
        { type: 'turn/end', seq: SessionSeq(6), time: completedAt, data: { turn: 1, reason: { kind: 'completed' } } },
    ];
    if (foldSubagentDescriptor(events)?.mode !== 'one-shot')
        throw new Error('ACP_SUBAGENT_TRANSCRIPT_INVALID: projected child must remain read-only');
    if (header.version === SESSION_FORMAT_VERSION) {
        const validated = Session.fromRestore(header.id, events, header, SessionLogOffset(0), 'detached');
        if (validated.deriveMessages().length !== 2)
            throw new Error('ACP_SUBAGENT_TRANSCRIPT_INVALID: projected task/result were not admitted');
    }
    return { header, events };
}
function projectionLog(context, observation, id) {
    const startedAt = Math.trunc(observation.timing.observedStartedAt);
    const completedAt = Math.max(startedAt, Math.trunc(observation.timing.observedCompletedAt));
    const label = bounded(redactSecretText(observation.label), 256);
    const header = {
        version: SESSION_FORMAT_VERSION,
        isSeeded: false,
        id: SessionId(id),
        createdAt: startedAt,
        cwd: context.parentCwd,
        parentSession: SessionId(context.parentDshSessionId),
        origin: 'subagent',
        delegationDepth: (context.parentDelegationDepth ?? 0) + 1,
    };
    return transcriptLog(header, label, startedAt, completedAt, {
        profileKind: observation.profileKind,
        task: { ...observation.task, text: bounded(observation.task.text) },
        result: { ...observation.result, text: bounded(observation.result.text) },
        ...(observation.model === undefined ? {} : { model: observation.model }),
        ...(observation.usage === undefined ? {} : { usage: observation.usage }),
    });
}
function sameProjection(existing, expected) {
    if (canonical(existing.meta) !== canonical(expected.header))
        return false;
    // The complete current projection must match, including the durable stream.
    return canonical(existing.events) === canonical(expected.events);
}
function object(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Recognize only the current authenticated envelope when it cannot be rebuilt. */
function isCurrentProjectionEnvelope(row) {
    if (row.rawDetail === undefined)
        return false;
    try {
        const value = JSON.parse(row.rawDetail);
        return (object(value) &&
            value.kind === 'dsh-acp-external-subagent' &&
            value.version === 5 &&
            value.childSessionId === row.dshSessionId &&
            object(value.projectionHeader) &&
            (value.projectionHeader.version === 3 || value.projectionHeader.version === SESSION_FORMAT_VERSION));
    }
    catch {
        return false;
    }
}
function storedProjection(row) {
    if (row.rawDetail === undefined)
        return undefined;
    let value;
    try {
        value = JSON.parse(row.rawDetail);
    }
    catch {
        return undefined;
    }
    if (!object(value) ||
        value.kind !== 'dsh-acp-external-subagent' ||
        value.version !== 5 ||
        value.childSessionId !== row.dshSessionId)
        return undefined;
    if (!object(value.projectionHeader) ||
        typeof value.projectionLabel !== 'string' ||
        typeof value.projectionStartedAt !== 'number' ||
        typeof value.projectionCompletedAt !== 'number' ||
        typeof value.projectionDigest !== 'string')
        return undefined;
    const header = value.projectionHeader;
    if (![3, SESSION_FORMAT_VERSION].includes(header.version) ||
        header.id !== row.dshSessionId ||
        header.parentSession !== value.parentDshSessionId)
        return undefined;
    let expected;
    try {
        expected = transcriptLog(header, value.projectionLabel, value.projectionStartedAt, value.projectionCompletedAt, {
            profileKind: String(value.profileKind),
            task: value.task,
            result: value.result,
            ...(object(value.model) ? { model: value.model } : {}),
            ...(object(value.usage) ? { usage: value.usage } : {}),
        });
    }
    catch {
        return undefined;
    }
    if (value.projectionDigest !== digest(expected))
        return undefined;
    // Authenticate the original transaction before using the host's released
    // migration catalog. Never "upgrade" durable data by changing only its version.
    if (Number(header.version) === 3) {
        try {
            // The authenticated seven-event read-only transcript cannot own children.
            const codec = releasedV3SessionFormatCodec;
            const restore = createSessionFormatCatalogWithChildren([]).createRestore(codec.encodeHeader(header, 0), { recovery: 'strict', validation: 'current' });
            for (const event of expected.events)
                restore.decodeRow(codec.encodeEvent(event));
            const migrated = restore.finish();
            expected = {
                header: migrated.header,
                events: migrated.events,
            };
        }
        catch {
            return undefined;
        }
    }
    return { detail: value, expected };
}
/** Idempotent read-only transcript projection for evidence-complete external delegations. */
export class ExternalSubagentProjector {
    persistence;
    sidecar;
    publishChild;
    accepting = true;
    pending = new Set();
    closing;
    /** Stop new transactions and retain their dependencies through the final status write.
     * @returns resolves after every accepted transaction and borrowed batch settles.
     */
    close() {
        this.accepting = false;
        return (this.closing ??= (async () => {
            while (this.pending.size > 0)
                await Promise.allSettled([...this.pending]);
        })());
    }
    run(operation) {
        if (!this.accepting)
            return Promise.reject(new Error('ACP_SUBAGENT_PERSISTENCE_UNAVAILABLE'));
        // Reserve ownership before synchronous staging can notify a reentrant disposer.
        const completion = Promise.withResolvers();
        this.pending.add(completion.promise);
        const release = () => {
            this.pending.delete(completion.promise);
        };
        void completion.promise.then(release, release);
        try {
            void operation().then(completion.resolve, completion.reject);
        }
        catch (error) {
            completion.reject(error);
        }
        return completion.promise;
    }
    constructor(persistence, sidecar, publishChild) {
        this.persistence = persistence;
        this.sidecar = sidecar;
        this.publishChild = publishChild;
    }
    /** Borrow one admitted batch; shutdown waits through every transaction and caller writeback.
     * @param operation - uses the supplied projector only within its awaited batch.
     * @returns resolves after the batch and its final caller writeback settle.
     */
    withProjection(operation) {
        return this.run(() => operation((observation, context) => this.projectAccepted(observation, context)));
    }
    async inspect(id) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            let handle;
            try {
                handle = await this.persistence.open(SessionId(id), 'read');
            }
            catch (error) {
                if (error instanceof SessionPersistenceNotFoundError)
                    return undefined;
                throw error;
            }
            const reader = __addDisposableResource(env_1, handle, true);
            return { meta: reader.header, events: (await reader.read()).events };
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            const result_1 = __disposeResources(env_1);
            if (result_1)
                await result_1;
        }
    }
    async commit(expected) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
            let handle;
            let created = false;
            try {
                handle = await this.persistence.create(expected.header);
                created = true;
            }
            catch (error) {
                if (!(error instanceof SessionAlreadyExistsError))
                    throw error;
                handle = await this.persistence.open(expected.header.id, 'write');
            }
            const writer = __addDisposableResource(env_2, handle, true);
            const { events } = await writer.read();
            const prefix = { header: expected.header, events: expected.events.slice(0, events.length) };
            if (events.length > expected.events.length || !sameProjection({ meta: writer.header, events }, prefix)) {
                throw new Error(`ACP_SUBAGENT_PROJECTION_CONFLICT: ${expected.header.id}`);
            }
            const remaining = expected.events.slice(events.length);
            if (remaining.length > 0)
                await writer.append(remaining);
            // Read visibility does not imply crash durability. Publish the sidecar
            // completion only after this barrier and the writer's teardown succeed.
            await writer.flush();
            return created || remaining.length > 0;
        }
        catch (e_2) {
            env_2.error = e_2;
            env_2.hasError = true;
        }
        finally {
            const result_2 = __disposeResources(env_2);
            if (result_2)
                await result_2;
        }
    }
    async setProjectionStatus(row, status) {
        await this.sidecar.upsertActivity({
            dshSessionId: row.dshSessionId,
            ownerDshSessionId: row.ownerDshSessionId,
            promptAnchorMessageId: row.promptAnchorMessageId,
            activityId: row.activityId,
            time: Date.now(),
            kind: row.kind,
            status,
            presentation: row.presentation,
            ...(row.rawDetail === undefined ? {} : { rawDetail: row.rawDetail }),
            ...(row.rawDetailRef === undefined ? {} : { rawDetailRef: row.rawDetailRef }),
        });
    }
    /** Converge interrupted projection transactions after the persistence seam mounts. */
    repairInterrupted() {
        return this.run(() => this.repairAccepted());
    }
    async repairAccepted() {
        const rows = (await this.sidecar.listProjectedSubagentActivities?.()) ?? [];
        let committed = 0;
        let repaired = 0;
        let conflicted = 0;
        for (const row of rows) {
            const stored = storedProjection(row);
            if (stored === undefined) {
                // Historical projections follow the host migration policy. Never
                // rewrite unsupported generations or synthesize missing history.
                // A current v5 running envelope that fails authentication is a conflict,
                // not an interrupted transaction to retry forever; keep its raw evidence.
                if (row.status === 'running' && isCurrentProjectionEnvelope(row)) {
                    conflicted += 1;
                    await this.setProjectionStatus(row, 'failed').catch(() => undefined);
                }
                continue;
            }
            try {
                const parent = await this.inspect(stored.detail.parentDshSessionId);
                if (parent === undefined ||
                    parent.meta.id !== stored.expected.header.parentSession ||
                    parent.meta.cwd !== stored.expected.header.cwd) {
                    throw new Error(`ACP_SUBAGENT_PARENT_NOT_DURABLE: ${stored.detail.parentDshSessionId}`);
                }
                const created = await this.commit(stored.expected);
                await this.publishChild?.(stored.expected.header, stored.detail.projectionLabel);
                await this.setProjectionStatus(row, 'completed');
                committed += 1;
                if (created)
                    repaired += 1;
            }
            catch {
                conflicted += 1;
                await this.setProjectionStatus(row, 'failed').catch(() => undefined);
            }
        }
        return { committed, repaired, conflicted };
    }
    project(observation, context) {
        return this.run(() => this.projectAccepted(observation, context));
    }
    async projectAccepted(observation, context) {
        if (!observation.projectionEligible || observation.status !== 'completed')
            return undefined;
        const id = childId(context, observation);
        const safe = safeObservation(observation);
        const expected = projectionLog(context, safe, id);
        const detail = recordDetail(id, context, safe, expected);
        // Stage the complete canonical transaction first. If the process crashes
        // at any later boundary, startup repair can converge without reconstructing
        // identity or display evidence from Agent text.
        const staged = await this.sidecar.upsertActivity({
            dshSessionId: id,
            ownerDshSessionId: id,
            promptAnchorMessageId: EXTERNAL_SUBAGENT_ACTIVITY_ANCHOR,
            activityId: 'external-subagent-record',
            time: Date.now(),
            kind: 'delegated',
            status: 'running',
            presentation: safe.label,
            rawDetail: JSON.stringify(detail),
        });
        // Parent durable history must precede child publication. A host without a
        // persistence listener cannot truthfully publish lineage.
        try {
            if (!(await context.flushParent()))
                throw new Error('ACP_SUBAGENT_PARENT_NOT_DURABLE');
            const created = await this.commit(expected);
            await this.publishChild?.(expected.header, detail.projectionLabel);
            await this.setProjectionStatus(staged, 'completed');
            return { childSessionId: id, created };
        }
        catch (error) {
            await this.setProjectionStatus(staged, 'failed').catch(() => undefined);
            throw error;
        }
    }
}
//# sourceMappingURL=external-projector.js.map