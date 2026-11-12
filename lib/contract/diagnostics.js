/** Presentation scopes do not change the durable audit or recovery policy. */
export function matchesDiagnosticView(entry, view) {
    if (view === 'issues')
        return entry.severity !== 'info';
    const operation = entry.kind === 'permission' || entry.kind === 'filesystem' || entry.kind === 'terminal';
    return view === 'operations' ? operation : !operation && entry.severity === 'info';
}
//# sourceMappingURL=diagnostics.js.map