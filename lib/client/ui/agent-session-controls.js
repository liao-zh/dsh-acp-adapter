import { isAcpModelOrReasoningOption } from "../../contract/config-options.js";
import { teamModeLabel } from "../../contract/session-modes.js";
function isModeConfigOption(option) {
    const id = option.id.trim().toLowerCase().replaceAll('-', '_');
    const category = option.category?.trim().toLowerCase().replaceAll('-', '_') ?? '';
    return id === 'mode' || category === 'mode';
}
/** Normalize ACP settings once; native Menu owns selection styling and keyboard navigation. */
export function agentControlMenuGroups(snapshot, t) {
    const groups = [];
    const disabled = !snapshot.editable || snapshot.freshness !== 'live';
    // configOptions is canonical; legacy modes are only a fallback.
    if (!(snapshot.configOptions ?? []).some(isModeConfigOption) && (snapshot.modes?.length ?? 0) > 0) {
        groups.push({
            kind: 'mode',
            id: 'mode',
            name: t('agentControlMode'),
            current: teamModeLabel(snapshot, t('agentControlDefault')),
            choices: (snapshot.modes ?? []).map((mode) => ({
                id: `mode:${mode.id}`,
                label: mode.name,
                current: mode.id === (snapshot.pendingModeId ?? snapshot.currentModeId),
                write: { kind: 'mode', id: mode.id },
                disabled,
            })),
        });
    }
    for (const option of snapshot.configOptions ?? []) {
        // Model and reasoning remain exclusively in DSH's native ModelPicker.
        if (isAcpModelOrReasoningOption(option))
            continue;
        const choices = option.type === 'boolean'
            ? [false, true].map((value) => ({
                id: `config:${option.id}:${value}`,
                label: t(value ? 'agentControlOn' : 'agentControlOff'),
                current: value === option.currentValue,
                write: { kind: 'config', id: option.id, value },
                disabled,
            }))
            : option.options.flatMap((entry) => ('value' in entry ? [entry] : entry.options).map((value) => ({
                id: `config:${option.id}:${value.value}`,
                label: value.name,
                ...(value.description == null ? {} : { description: value.description }),
                ...('group' in entry ? { group: entry.name } : {}),
                current: value.value ===
                    (isModeConfigOption(option) ? (snapshot.pendingModeId ?? option.currentValue) : option.currentValue),
                write: { kind: 'config', id: option.id, value: value.value },
                disabled,
            })));
        groups.push({
            kind: isModeConfigOption(option) ? 'mode' : 'config',
            id: `config:${option.id}`,
            name: option.name,
            current: choices.find((choice) => choice.current)?.label ?? String(option.currentValue),
            ...(option.description == null ? {} : { description: option.description }),
            choices,
        });
    }
    return groups;
}
export function toolApprovalPolicyGroup(snapshot, t) {
    const disabled = !snapshot.editable;
    const choices = ['auto', 'ask'].map((policy) => ({
        id: `tool-approval:${policy}`,
        label: t(policy === 'auto' ? 'toolApprovalAuto' : 'toolApprovalAsk'),
        current: snapshot.policy === policy,
        description: t(policy === 'auto' ? 'toolApprovalAutoDescription' : 'toolApprovalAskDescription'),
        write: { kind: 'tool-approval-policy', policy },
        disabled,
    }));
    return {
        kind: 'policy',
        id: 'tool-approval-policy',
        name: t('toolApprovalSession'),
        current: t(snapshot.policy === 'auto' ? 'toolApprovalAuto' : 'toolApprovalAsk'),
        description: snapshot.source === 'lead' ? t('toolApprovalInherited') : t('toolApprovalScope'),
        choices,
    };
}
export function agentControlLabel(snapshot, t) {
    return `${t('agentControlTitle')} · ${teamModeLabel(snapshot, t('agentControlDefault'))}`;
}
/** Compact ACP token counts without falling back to an unqualified raw count. */
export function formatContextTokenCount(value) {
    const unit = value >= 1_000_000 ? 'm' : 'k';
    const divisor = unit === 'm' ? 1_000_000 : 1_000;
    const scaled = value / divisor;
    // Match the host's compact context figures for ordinary K/M values while
    // retaining enough precision below 1k to avoid displaying a non-zero count
    // as zero. The raw count determines the unit, so rounding never promotes it.
    const fractionDigits = scaled < 1 ? 3 : scaled < 100 ? 1 : 0;
    const factor = 10 ** fractionDigits;
    return `${String(Math.round(scaled * factor) / factor)}${unit}`;
}
export function agentControlFooter(snapshot, t) {
    const footer = [];
    if (snapshot.contextUsage !== null) {
        footer.push({
            type: 'label',
            id: 'context-usage',
            text: t('agentContextUsage', {
                used: formatContextTokenCount(snapshot.contextUsage.used),
                size: formatContextTokenCount(snapshot.contextUsage.size),
                percent: snapshot.contextUsage.percent,
            }),
        });
        if (snapshot.contextUsage.cost !== null)
            footer.push({
                type: 'label',
                id: 'session-cost',
                text: t('agentSessionCost', {
                    amount: snapshot.contextUsage.cost.amount,
                    currency: snapshot.contextUsage.cost.currency,
                }),
            });
    }
    if (snapshot.freshness === 'stale')
        footer.push({ type: 'label', id: 'stale', text: t('agentStateStale') });
    return footer;
}
//# sourceMappingURL=agent-session-controls.js.map