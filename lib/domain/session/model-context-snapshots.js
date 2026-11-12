const snapshotSources = ['runtime-context', 'skill-catalog'];
/**
 * Return the newest valid runtime-context and skill-catalog messages, in source
 * order. A malformed newest snapshot suppresses that source instead of falling
 * back to stale content. Empty clear snapshots remain present when they contain
 * the source's explicit clearing text.
 */
export function currentModelContextSnapshots(messages, skillEntryPointAvailable = true) {
    const latest = new Map();
    for (const message of messages) {
        const source = message.source;
        if (typeof source !== 'object' || source === null)
            continue;
        const kind = source.kind;
        if (snapshotSources.includes(kind))
            latest.set(kind, message);
    }
    const result = [];
    for (const kind of snapshotSources) {
        if (kind === 'skill-catalog' && !skillEntryPointAvailable)
            continue;
        const message = latest.get(kind);
        if (message === undefined || message.role !== 'user')
            continue;
        const source = message.source;
        if (kind === 'skill-catalog') {
            if (source.form !== 'catalog' || !Array.isArray(source.entries))
                continue;
            if (source.entries.some((entry) => {
                if (typeof entry !== 'object' || entry === null)
                    return true;
                const value = entry;
                return typeof value.name !== 'string' || value.name.length === 0 || typeof value.description !== 'string';
            }))
                continue;
        }
        if (!Array.isArray(message.content) || message.content.length === 0)
            continue;
        const blocks = message.content;
        if (blocks.some((block) => typeof block !== 'object' || block === null || block.type !== 'text'))
            continue;
        const text = blocks.map((block) => block.text);
        if (text.every((value) => typeof value === 'string')) {
            result.push({
                source: kind,
                ...(typeof message.id === 'string' ? { id: message.id } : {}),
                text: text.join('\n'),
            });
        }
    }
    return result;
}
//# sourceMappingURL=model-context-snapshots.js.map