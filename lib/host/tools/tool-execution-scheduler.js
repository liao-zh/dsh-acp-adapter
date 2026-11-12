/** A session-local barrier for the ToolRuntime's native execution modes. */
export class ToolExecutionScheduler {
    waiting = [];
    activeParallel = 0;
    activeExclusive = false;
    acquire(classify, signal) {
        if (signal.aborted)
            return Promise.resolve(undefined);
        return new Promise((resolve) => {
            const waiter = { classify, signal, resolve };
            waiter.onAbort = () => {
                const index = this.waiting.indexOf(waiter);
                if (index < 0)
                    return;
                this.waiting.splice(index, 1);
                signal.removeEventListener('abort', waiter.onAbort);
                resolve(undefined);
                this.drain();
            };
            signal.addEventListener('abort', waiter.onAbort, { once: true });
            this.waiting.push(waiter);
            this.drain();
        });
    }
    drain() {
        if (this.activeExclusive)
            return;
        while (this.waiting.length > 0) {
            const waiter = this.waiting[0];
            if (waiter.signal.aborted) {
                this.waiting.shift();
                waiter.signal.removeEventListener('abort', waiter.onAbort);
                waiter.resolve(undefined);
                continue;
            }
            let mode;
            try {
                mode = waiter.classify();
            }
            catch {
                mode = 'exclusive';
            }
            if (mode !== 'parallel') {
                if (this.activeParallel > 0)
                    return;
                this.waiting.shift();
                waiter.signal.removeEventListener('abort', waiter.onAbort);
                this.activeExclusive = true;
                waiter.resolve(this.once(this.releaseExclusive));
                return;
            }
            this.waiting.shift();
            waiter.signal.removeEventListener('abort', waiter.onAbort);
            this.activeParallel += 1;
            waiter.resolve(this.once(this.releaseParallel));
        }
    }
    once(release) {
        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            release();
        };
    }
    releaseExclusive = () => {
        this.activeExclusive = false;
        this.drain();
    };
    releaseParallel = () => {
        this.activeParallel -= 1;
        this.drain();
    };
}
//# sourceMappingURL=tool-execution-scheduler.js.map