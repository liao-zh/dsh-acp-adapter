import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconChevronDownOutlineMedium, IconChevronRightOutlineMedium, IconChevronLeftOutlineMedium, Menu, Tooltip, focusWithoutRing, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './AcpAgentControl.module.css';
/** One native menu for main sessions, member modes and batch modes.
 * Callers supply visible choices and write permissions; presentation never
 * derives authority from whether the menu is shown in a team or composer.
 */
export function AgentSessionMenu({ groups, footer, label, t, open, disabled, side = 'top', align = 'start', onOpenChange, onSelect, }) {
    const [pane, setPane] = useState(null);
    const anchor = useRef(null);
    const firstContent = useRef(null);
    const group = groups.find((candidate) => candidate.id === pane);
    useEffect(() => {
        if (!open)
            setPane(null);
    }, [open]);
    useLayoutEffect(() => {
        if (!open)
            return;
        // The list is portaled to avoid clipping inside the team panel. Focus its
        // first native row after replacing a pane, retaining native arrow keys.
        const first = firstContent.current
            ?.closest('[role=menu]')
            ?.querySelector('[role=menuitem]:not(:disabled)');
        if (first !== null && first !== undefined)
            focusWithoutRing(first);
    }, [open, group?.id]);
    const items = group === undefined
        ? groups.map((item, index) => ({
            id: item.id,
            label: h('span', {
                className: css.settingRow,
                ref: index === 0 ? firstContent : undefined,
                title: item.description ?? undefined,
            }, h('span', { className: css.settingName }, item.name), h('span', { className: css.currentValue, title: item.current }, item.current), h(IconChevronRightOutlineMedium, null)),
            disabled: item.choices.length === 0,
        }))
        : [
            {
                id: 'back',
                label: h('span', { ref: firstContent }, t('agentControlBack')),
                icon: h(IconChevronLeftOutlineMedium, null),
            },
            { type: 'label', id: 'setting-title', text: group.name },
            ...(group.description
                ? [{ type: 'label', id: 'setting-description', text: group.description }]
                : []),
            ...group.choices.flatMap((choice, index) => [
                ...(choice.group !== undefined && choice.group !== group.choices[index - 1]?.group
                    ? [{ type: 'label', id: `group:${index}`, text: choice.group }]
                    : []),
                {
                    id: choice.id,
                    disabled: choice.disabled,
                    label: h('span', { className: css.choice }, choice.label, choice.description ? h('span', { className: css.choiceDescription }, choice.description) : null),
                },
            ]),
        ];
    if (items.length === 0)
        items.push({
            id: 'unavailable',
            label: h('span', null, t('agentControlUnavailable')),
            disabled: true,
        });
    return h('span', { ref: anchor, className: css.menuAnchor }, h(Menu, {
        open,
        portal: true,
        autoFocus: true,
        side,
        align,
        items,
        listClassName: css.menuList,
        // 0.2.2 anchors menus to the trigger element through `anchor` and drops
        // the measured-rectangle callback; the anchor re-measures per render.
        selectedId: group?.choices.find((choice) => choice.current)?.id,
        onClose: () => onOpenChange(false),
        onSelect: (id) => {
            if (id === 'back') {
                setPane(null);
                return;
            }
            if (group === undefined) {
                if (groups.some((candidate) => candidate.id === id))
                    setPane(id);
                return;
            }
            const choice = group.choices.find((candidate) => candidate.id === id);
            if (choice === undefined || choice.disabled || disabled)
                return;
            onOpenChange(false);
            onSelect(choice);
        },
        anchor: h(Tooltip, {
            label: t('agentControlTooltip'),
            portal: true,
            side: 'top',
            disabled: open,
            children: h('button', {
                type: 'button',
                className: css.trigger,
                disabled,
                'aria-haspopup': 'menu',
                'aria-expanded': open,
                onClick: () => {
                    setPane(null);
                    onOpenChange(!open);
                },
            }, h('span', { className: css.triggerLabel }, label), h(IconChevronDownOutlineMedium, { className: `${css.chevron}${open ? ` ${css.chevronOpen}` : ''}` })),
        }),
        ...(footer === undefined || footer.length === 0 ? {} : { footer }),
    }));
}
//# sourceMappingURL=AgentSessionMenu.js.map