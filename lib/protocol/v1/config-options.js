import { ACP_CONFIG_IDENTIFIER_MAX, normalizeAcpConfigOptionKey } from "../../contract/config-options.js";
const MAX_SELECTABLE_VALUES = 4_096;
const MAX_ID = ACP_CONFIG_IDENTIFIER_MAX;
const MAX_LABEL = 1_024;
const boundedLabel = (value) => (value.length > MAX_LABEL ? `${value.slice(0, MAX_LABEL)}…` : value);
/**
 * Keep only the protocol's known option shapes and cap both dimensions.
 * Agent-owned labels and values remain exact protocol data; oversized
 * selectable identifiers are discarded rather than rewritten.
 */
export function acpConfigOptionsSnapshot(options) {
    if (options === undefined || options === null)
        return undefined;
    const result = [];
    let selectableValues = 0;
    for (const option of options.slice(0, 128)) {
        if (option.id.length > MAX_ID ||
            option.name.length === 0 ||
            (option.category !== undefined && option.category !== null && option.category.length > MAX_ID))
            continue;
        if (option.type === 'boolean') {
            result.push({
                id: option.id,
                name: boundedLabel(option.name),
                type: 'boolean',
                currentValue: option.currentValue,
                ...(option.description === undefined
                    ? {}
                    : { description: option.description === null ? null : boundedLabel(option.description) }),
                ...(option.category === undefined ? {} : { category: option.category === null ? null : option.category }),
            });
            continue;
        }
        if (option.type !== 'select')
            continue;
        if (option.currentValue.length > MAX_ID)
            continue;
        const values = option.options
            .flatMap((entry) => ('options' in entry ? entry.options : [entry]))
            .filter((value) => value.value.length <= MAX_ID);
        selectableValues += values.length;
        // These values authorize actual configuration writes, not just display.
        // Truncating them made catalog models after position 256 impossible to select.
        if (selectableValues > MAX_SELECTABLE_VALUES)
            throw new Error('ACP configuration exceeds the selectable-value limit');
        result.push({
            id: option.id,
            name: boundedLabel(option.name),
            type: 'select',
            currentValue: option.currentValue,
            options: values.map((value) => ({
                value: value.value,
                name: boundedLabel(value.name),
                ...(value.description === undefined
                    ? {}
                    : { description: value.description === null ? null : boundedLabel(value.description) }),
            })),
            ...(option.description === undefined
                ? {}
                : { description: option.description === null ? null : boundedLabel(option.description) }),
            ...(option.category === undefined ? {} : { category: option.category === null ? null : option.category }),
        });
    }
    return result;
}
export function isModelConfigOption(option) {
    return [option.category ?? '', option.id].some((key) => normalizeAcpConfigOptionKey(key) === 'model');
}
export function advertisesIndependentModelControls(options) {
    return (options?.some((option) => {
        if (option.type !== 'select')
            return false;
        const category = normalizeAcpConfigOptionKey(option.category ?? '');
        const id = normalizeAcpConfigOptionKey(option.id);
        return (category === 'model_config' ||
            category === 'thought_level' ||
            category === 'reasoning_effort' ||
            id === 'thought_level' ||
            id === 'reasoning_effort');
    }) ?? false);
}
//# sourceMappingURL=config-options.js.map