/** Fixed-choice composer for ACP permission questions carried by DSH. */
import { createElement as h, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Button, DisclosureRow, IconInfoOutlineMedium, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { defineStore } from '@deepseek-ai/dsh-client-store';
import css from './AcpPermissionQuestion.module.css';
const MAX_PERMISSION_DRAFTS = 128;
/** Session-scoped choices keyed by the Host request ID, which survives client reconnects. */
export function createAcpPermissionQuestionStore() {
    return defineStore({
        init: () => ({ byRequest: {} }),
        persist: 'dsh.acp-permission.questions.v1',
        actions: {
            select: (draft, questionId, label) => {
                // Native unnamed card keys change on reload. Drop those legacy entries;
                // retain bounded drafts for requests whose closure the client missed.
                const recent = Object.entries(draft.byRequest)
                    .filter(([key]) => key.startsWith('acp-permission:') && key !== questionId)
                    .slice(-(MAX_PERMISSION_DRAFTS - 1));
                draft.byRequest = Object.fromEntries([...recent, [questionId, { selectedByQuestion: { [questionId]: label } }]]);
            },
            clear: (draft, questionId) => {
                delete draft.byRequest[questionId];
            },
        },
    });
}
/** Match only the blocking, fixed-option questions created by this adapter. */
export function isAcpPermissionQuestion(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const pending = value;
    const isRecord = (input) => typeof input === 'object' && input !== null && !Array.isArray(input);
    return (pending.kind === 'question' &&
        typeof pending.key === 'string' &&
        pending.key.length > 0 &&
        Array.isArray(pending.questions) &&
        pending.questions.length === 1 &&
        pending.questions.every((question) => {
            if (!isRecord(question) || typeof question.id !== 'string' || !question.id.startsWith('acp-permission:'))
                return false;
            if (!Array.isArray(question.options) || question.options.length === 0 || question.multiSelect === true)
                return false;
            return question.options.every((option) => isRecord(option) && typeof option.label === 'string' && option.label.length > 0);
        }) &&
        pending.callId === undefined &&
        pending.review === undefined &&
        typeof pending.subscribe === 'function' &&
        typeof pending.snapshot === 'function' &&
        typeof pending.answer === 'function' &&
        typeof pending.dismiss === 'function');
}
function answerable(pending) {
    const snapshot = pending.snapshot();
    return snapshot.channel !== 'none' && !snapshot.closed && pending.review === undefined;
}
/** An explicit, fixed-option answer surface; no free-text or implicit choice. */
export function AcpPermissionQuestion(props) {
    // A native slot may present a different request; temporary UI state belongs
    // to the Host question, just like its persisted selection.
    return h('div', { className: css.frame }, h(PermissionQuestionSurface, { ...props, key: props.matched.questions[0].id }));
}
function PermissionQuestionSurface(props) {
    const pending = props.matched;
    const question = pending.questions[0];
    const snapshot = useSyncExternalStore(pending.subscribe, pending.snapshot, pending.snapshot);
    const draft = props.useStore((state) => state.byRequest[question.id]);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const canAnswer = snapshot.channel !== 'none' && !snapshot.closed && pending.review === undefined;
    const selected = draft?.selectedByQuestion ?? {};
    const optionRefs = useRef([]);
    // Older in-flight questions carry the operation only in detail. Keep that
    // content open; current producers put the complete operation in question.
    const [detailsOpen, setDetailsOpen] = useState(question.header === undefined);
    const options = question.options ?? [];
    const selectedIndex = options.findIndex((option) => selected[question.id] === option.label);
    const [focusedIndex, setFocusedIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
    const complete = pending.questions.every((question) => question.options?.some((option) => option.label === selected[question.id]) === true);
    useEffect(() => {
        if (snapshot.closed) {
            props.actions.clear(question.id);
            setBusy(false);
        }
    }, [question.id, props.actions, snapshot.closed]);
    const submit = async () => {
        if (busy || !complete || !answerable(pending))
            return;
        const answers = pending.questions.map((question) => ({
            id: question.id,
            selected: [selected[question.id]],
        }));
        setBusy(true);
        setFailed(false);
        try {
            await pending.answer({ answers });
            props.actions.clear(question.id);
        }
        catch {
            setFailed(true);
            setBusy(false);
        }
    };
    const cancel = async () => {
        if (busy || !answerable(pending))
            return;
        setBusy(true);
        setFailed(false);
        try {
            await pending.dismiss();
            props.actions.clear(question.id);
        }
        catch {
            setFailed(true);
            setBusy(false);
        }
    };
    const moveFocus = (index, event) => {
        if (!canAnswer || busy || options.length === 0)
            return;
        event.preventDefault();
        const next = (index + options.length) % options.length;
        const option = options[next];
        setFocusedIndex(next);
        props.actions.select(question.id, option.label);
        setFailed(false);
        optionRefs.current[next]?.focus();
    };
    const onOptionKeyDown = (index, event) => {
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                moveFocus(index + 1, event);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                moveFocus(index - 1, event);
                break;
            case 'Home':
                moveFocus(0, event);
                break;
            case 'End':
                moveFocus(options.length - 1, event);
                break;
        }
    };
    return h('section', {
        className: css.card,
        'aria-label': question.header ?? question.question,
        'data-question-key': pending.key,
    }, h('header', { className: css.header }, question.header === undefined
        ? null
        : h('h2', { className: css.source, 'data-question-source': '' }, question.header), h('div', { className: css.heading, 'data-question-operation': '' }, question.question)), h('div', { className: css.content, 'data-question-scroll': '' }, ...pending.questions.map((question) => h('div', { className: css.question, key: question.id }, question.detail
        ? h(DisclosureRow, {
            className: css.detail,
            icon: h(IconInfoOutlineMedium),
            title: props.t('acpQuestionDetails'),
            open: detailsOpen,
            expandable: true,
            expandOnRowClick: true,
            onToggle: () => setDetailsOpen((open) => !open),
        }, h('div', { 'data-question-detail': '' }, h(MarkdownText, {
            text: question.detail,
            variant: 'compact',
            labels: {
                code: {
                    copyLabel: props.t('acpQuestionCopy'),
                    copiedLabel: props.t('acpQuestionCopied'),
                },
                footnotes: props.t('acpQuestionFootnotes'),
            },
        })))
        : null, h('div', { className: css.options, role: 'radiogroup', 'aria-label': props.t('acpQuestionChoices') }, ...(question.options ?? []).map((option, optionIndex) => {
        const checked = selected[question.id] === option.label;
        return h('button', {
            key: `${option.label}:${optionIndex}`,
            type: 'button',
            className: css.option,
            role: 'radio',
            'aria-checked': checked,
            'aria-label': option.label,
            tabIndex: optionIndex === focusedIndex ? 0 : -1,
            ref: (element) => {
                optionRefs.current[optionIndex] = element;
            },
            disabled: !canAnswer || busy,
            onClick: () => {
                setFocusedIndex(optionIndex);
                props.actions.select(question.id, option.label);
                setFailed(false);
            },
            onFocus: () => setFocusedIndex(optionIndex),
            onKeyDown: (event) => onOptionKeyDown(optionIndex, event),
        }, h('span', { className: css.number, 'aria-hidden': true }, String(optionIndex + 1)), h('span', { className: css.optionLabel }, option.label));
    }))))), h('footer', { className: css.footer }, h('p', { className: css.status, role: 'status' }, failed ? props.t('acpQuestionFailed') : canAnswer ? '' : props.t('acpQuestionUnavailable')), h('div', { className: css.actions }, h(Button, { variant: 'ghost', disabled: !canAnswer || busy, onClick: () => void cancel() }, props.t('acpQuestionCancel')), h(Button, {
        variant: 'primary',
        disabled: !canAnswer || busy || !complete,
        onClick: () => void submit(),
    }, busy ? props.t('acpQuestionSubmitting') : props.t('acpQuestionSubmit')))));
}
//# sourceMappingURL=acp-permission-question.js.map