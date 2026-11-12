import { createElement as h } from 'react';
import css from './AcpExternalSubagentComposer.module.css';
export function selectExternalSubagentRecord(owner, records) {
    return owner.sessionId !== undefined &&
        owner.session?.subagent?.address.mode === 'one-shot' &&
        records.has(owner.sessionId)
        ? true
        : null;
}
/** Refresh only the narrow claim when native, Host-pushed ownership facts change. */
export function followExternalSubagentRecords(source, mount) {
    let key = '';
    let stopped = false;
    let unmount;
    const reconcile = () => {
        if (stopped)
            return;
        const ids = Object.entries(source.getSnapshot().projectionsBySession)
            .filter(([, projection]) => projection.values.acpExecution?.externalSubagent === true)
            .map(([id]) => id)
            .sort();
        const next = JSON.stringify(ids);
        if (next === key)
            return;
        key = next;
        const previous = unmount;
        unmount = undefined;
        previous?.();
        unmount = ids.length === 0 ? undefined : mount(new Set(ids));
    };
    const unsubscribe = source.subscribe(reconcile);
    try {
        reconcile();
    }
    catch (error) {
        stopped = true;
        unsubscribe();
        throw error;
    }
    return () => {
        if (stopped)
            return;
        stopped = true;
        unsubscribe();
        unmount?.();
        unmount = undefined;
    };
}
/** The external Agent owns its private history; this local record cannot accept input. */
export function AcpExternalSubagentComposer({ t }) {
    return h('div', { className: css.frame, role: 'status', 'data-acp-external-record-notice': '' }, h('strong', null, t('subagent.readOnlyTitle')), h('span', null, t('subagent.readOnlyBody')));
}
//# sourceMappingURL=AcpExternalSubagentComposer.js.map