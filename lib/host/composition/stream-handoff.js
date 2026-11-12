/** One ACP execution may span native steps; only the outer stream is handed back to DSH. */
export class StreamHandoff {
    resume;
    /** Called only when an active consumer closes before this segment ends. */
    abandon;
    /** Exact signal error recorded only by a cancelled local-settlement waiter. */
    localSettlementAbortReason;
    cancel;
    iterator;
    pending;
    pendingValue;
    requested = false;
    wake;
    draining;
    terminalConsumerCallback;
    incompleteBlocks = new Set();
    remainder = [];
    suspended = false;
    ended = false;
    get closing() {
        return this.draining !== undefined;
    }
    get pendingIndex() {
        const chunk = this.pendingValue?.value;
        return chunk !== undefined && 'index' in chunk ? chunk.index : undefined;
    }
    attach(stream) {
        this.iterator = stream[Symbol.asyncIterator]();
    }
    /** Run after the outer DSH consumer has received a terminal finish chunk. */
    afterTerminalFinish(callback) {
        this.terminalConsumerCallback = callback;
    }
    async acknowledgeTerminalFinish() {
        if (!this.ended)
            return;
        const callback = this.terminalConsumerCallback;
        this.terminalConsumerCallback = undefined;
        await callback?.();
    }
    request() {
        if (this.ended)
            return;
        this.requested = true;
        this.wake?.();
    }
    next() {
        return (this.pending ??= this.iterator.next().then((result) => {
            this.pendingValue = result;
            return result;
        }));
    }
    async *segment() {
        this.suspended = false;
        this.localSettlementAbortReason = undefined;
        try {
            while (!this.ended) {
                // Keep a single outstanding pull. Never race two consumers of the ACP stream.
                const changed = new Promise((resolve) => {
                    this.wake = () => resolve('handoff');
                });
                const canHandoff = this.incompleteBlocks.size === 0;
                const result = this.requested && canHandoff
                    ? 'handoff'
                    : canHandoff
                        ? await Promise.race([this.next(), changed])
                        : await this.next();
                this.wake = undefined;
                if (result === 'handoff') {
                    this.requested = false;
                    this.suspended = true;
                    // The native loop commits this assistant segment, then owns pre-step,
                    // input rewriting and user/message before resume is allowed to steer.
                    yield { type: 'finish', reason: { kind: 'stop' } };
                    return;
                }
                this.pending = undefined;
                this.pendingValue = undefined;
                if (result.done) {
                    this.ended = true;
                    return;
                }
                if (result.value.type === 'block-start' && !['text', 'reasoning'].includes(result.value.blockType))
                    this.incompleteBlocks.add(result.value.index);
                if (result.value.type === 'block-end')
                    this.incompleteBlocks.delete(result.value.index);
                if (result.value.type === 'finish')
                    this.ended = true;
                yield result.value;
            }
        }
        finally {
            this.wake = undefined;
            if (!this.suspended) {
                if (!this.ended)
                    await this.drainAfterAbandon();
                else
                    await this.drain();
            }
        }
    }
    /** Release only the consumer-owned local waiter; draining still collects the remote remainder. */
    abandonConsumer() {
        this.abandon?.();
    }
    /** Drain after releasing a local waiter, suppressing only that exact reason. */
    async drainAfterAbandon() {
        this.abandonConsumer();
        try {
            await this.drain();
        }
        catch (error) {
            if (this.localSettlementAbortReason === undefined || error !== this.localSettlementAbortReason)
                throw error;
        }
    }
    /** Stop the remote pull and collect its remainder; this does not abandon local settlement. */
    drain() {
        return (this.draining ??= (async () => {
            this.cancel?.();
            try {
                for (;;) {
                    const result = await this.next();
                    this.pending = undefined;
                    this.pendingValue = undefined;
                    if (result.done)
                        break;
                    this.remainder.push(result.value);
                }
            }
            finally {
                this.ended = true;
                this.suspended = false;
            }
        })());
    }
    /** A fallback consumer must deliver buffered output before its replacement prompt. */
    takeRemainder() {
        return this.remainder.splice(0);
    }
}
//# sourceMappingURL=stream-handoff.js.map