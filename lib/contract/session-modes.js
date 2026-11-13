import { normalizeAcpConfigOptionKey } from "./config-options.js";
export function teamModeChoices(snapshot) {
    const option = snapshot.configOptions?.find((option) => normalizeAcpConfigOptionKey(option.id) === 'mode' ||
        normalizeAcpConfigOptionKey(option.category ?? '') === 'mode');
    if (option !== undefined) {
        if (option.type !== 'select')
            return [];
        return option.options
            .flatMap((entry) => ('options' in entry ? entry.options : [entry]))
            .map((value) => ({
            id: value.value,
            name: value.name,
            label: `${option.name}: ${value.name}`,
            current: value.value === option.currentValue,
            write: { kind: 'config', id: option.id, value: value.value },
        }));
    }
    return (snapshot.modes ?? []).map((mode) => ({
        id: mode.id,
        name: mode.name,
        label: mode.name,
        current: mode.id === snapshot.currentModeId,
        write: { kind: 'mode', id: mode.id },
    }));
}
/** Display the effective ACP mode, including an uncommitted next-run choice. */
export function teamModeLabel(snapshot, fallback) {
    const choices = teamModeChoices(snapshot);
    const selected = (snapshot.pendingModeId === undefined || snapshot.pendingModeId === null
        ? undefined
        : choices.find((choice) => choice.id === snapshot.pendingModeId)) ?? choices.find((choice) => choice.current);
    if (selected !== undefined)
        return selected.name;
    const modeOption = snapshot.configOptions?.find((option) => normalizeAcpConfigOptionKey(option.id) === 'mode' ||
        normalizeAcpConfigOptionKey(option.category ?? '') === 'mode');
    if (modeOption?.type === 'select' && modeOption.currentValue !== '')
        return modeOption.currentValue;
    return snapshot.currentModeId ?? fallback;
}
//# sourceMappingURL=session-modes.js.map