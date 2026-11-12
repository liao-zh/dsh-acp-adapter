/** Resolve optional host jobs without creating a second registry or UI store. */
export function resolveTerminalJobs(ctx, sessionId) {
    const holder = ctx;
    const jobs = holder.get('jobs');
    if (jobs === undefined)
        return undefined;
    return (label, run) => {
        const owner = sessionId;
        let id;
        let settled = false;
        let released = false;
        const retireReleased = () => {
            if (!settled || !released)
                return;
            // Owner disposal may have already removed the row. A live or unconsumed
            // terminal stays observable; ACP's durable audit is independent of this
            // native presentation record.
            try {
                if (!jobs.list(owner).some((job) => job.id === id))
                    return;
                jobs.remove(id, owner);
            }
            catch (error) {
                // A presentation cleanup failure must not undo a released ACP handle.
                // Leave the native row in place and retain a Host diagnostic.
                ctx.logger.warn(`ACP terminal job record could not be retired: ${String(error)}`);
            }
        };
        id = jobs.start({
            kind: 'acp-terminal',
            label,
            owner,
            run: (job) => {
                const producer = run((text, channel) => job.append(text, { channel }));
                return {
                    ...producer,
                    done: producer.done.then((outcome) => {
                        // Arm the public result waiter before publishing the outcome to the
                        // registry. Settlement marks it reported before tool-jobs listeners
                        // run, so ACP remains the sole completion recipient. No background
                        // polling or timer-renewal gap can cause an extra model turn.
                        void jobs
                            .wait(id, 30_000, owner)
                            .then((view) => {
                            settled = view.status !== 'running' && view.status !== 'stopping';
                            retireReleased();
                        })
                            .catch((error) => {
                            ctx.logger.warn(`ACP terminal job completion could not be observed: ${String(error)}`);
                        });
                        return outcome;
                    }),
                };
            },
        });
        return {
            cancel: () => {
                jobs.kill(id, owner, 'ACP terminal cancellation');
            },
            release: () => {
                released = true;
                retireReleased();
            },
        };
    };
}
//# sourceMappingURL=terminal-jobs.js.map