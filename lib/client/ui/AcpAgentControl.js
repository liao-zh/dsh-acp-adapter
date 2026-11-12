import { createElement as h, useEffect, useRef, useState } from 'react';
import css from './AcpAgentControl.module.css';
import { AgentSessionMenu } from "./AgentSessionMenu.js";
import { agentControlMenuGroups, agentControlLabel, agentControlFooter, } from "./agent-session-controls.js";
import { agentSessionStream } from "../data/agent-session-stream.js";
import { toolApprovalPolicyStream } from "../data/tool-approval-policy-stream.js";
import { toolApprovalPolicyGroup } from "./agent-session-controls.js";
function providerOf(value) {
    if (typeof value !== 'object' || value === null)
        return undefined;
    const provider = value.provider;
    return typeof provider === 'string' ? provider : undefined;
}
export function snapshotIsAcp(value, ownsRoute, fallbackProvider) {
    if (typeof value !== 'object' || value === null)
        return ownsRoute(fallbackProvider);
    const selection = value;
    const current = selection.next === undefined ? selection.lastUsed : selection.next;
    const selectedProvider = current === null || current === undefined
        ? selection.lastUsed == null
            ? fallbackProvider
            : undefined
        : providerOf(current);
    return ownsRoute(selectedProvider);
}
/** Small ACP-only control in DSH's native input-left extension point. */
export function AcpAgentControl({ sessionId, useProjection, useSession, useSessions, useAccess, t, remote, streamFactory, ownsRoute, getDefaultProvider, watchDefaultProvider, feedback, sessionAccessSource, }) {
    const projection = useProjection('modelSelection');
    // 0.2.2 removes the `title` projection; the Session list row is the published
    // title source, so read the current Session's own row instead.
    const sessionTitle = useSessions((sessions) => sessionId === undefined ? undefined : sessions.byId[sessionId]?.title);
    const running = useSession((state) => state.running);
    const optionWriteAllowed = useAccess('dshAcp/setAgentSessionOption');
    const policyWriteAllowed = useAccess('dshAcp/setToolApprovalPolicy');
    const [defaultProvider, setDefaultProvider] = useState();
    const [defaultGeneration, setDefaultGeneration] = useState(0);
    useEffect(() => watchDefaultProvider(() => {
        setDefaultProvider(undefined);
        setDefaultGeneration((value) => value + 1);
    }), [watchDefaultProvider]);
    useEffect(() => {
        let active = true;
        void getDefaultProvider()
            .then((provider) => {
            if (active)
                setDefaultProvider(provider);
        })
            .catch(() => {
            if (active)
                setDefaultProvider(undefined);
        });
        return () => {
            active = false;
        };
    }, [getDefaultProvider, defaultGeneration]);
    const isAcp = snapshotIsAcp(projection, ownsRoute, defaultProvider);
    const [snapshot, setSnapshot] = useState(null);
    const [policySnapshot, setPolicySnapshot] = useState(null);
    const [policyError, setPolicyError] = useState(null);
    const [policyStale, setPolicyStale] = useState(false);
    const [policyReadFailed, setPolicyReadFailed] = useState(false);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [readFailed, setReadFailed] = useState(false);
    const epoch = useRef(0);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const current = ++epoch.current;
        setOpen(false);
        setBusy(false);
        setError(null);
        setReadFailed(false);
        setSnapshot(null);
        setPolicySnapshot(null);
        setPolicyError(null);
        setPolicyStale(false);
        setPolicyReadFailed(false);
        if (!isAcp || sessionId === undefined)
            return;
        const stream = agentSessionStream(remote, streamFactory, sessionId, (value) => {
            if (current !== epoch.current)
                return;
            setSnapshot(value);
            setError(null);
            setReadFailed(false);
        }, () => {
            if (current !== epoch.current)
                return;
            setSnapshot((value) => (value === null ? null : { ...value, editable: false, freshness: 'stale' }));
            setError(t('agentControlUnavailable'));
            setReadFailed(true);
        });
        stream.start();
        return () => {
            ++epoch.current;
            void stream.dispose();
        };
    }, [epoch, isAcp, remote, streamFactory, sessionId, t, retry]);
    const policyEpoch = useRef(0);
    useEffect(() => {
        const current = ++policyEpoch.current;
        if (!isAcp || sessionId === undefined) {
            setPolicySnapshot(null);
            setPolicyError(null);
            setPolicyStale(false);
            setPolicyReadFailed(false);
            return;
        }
        setPolicySnapshot(null);
        setPolicyError(null);
        setPolicyStale(false);
        setPolicyReadFailed(false);
        const stream = toolApprovalPolicyStream(remote, streamFactory, sessionId, (value) => {
            if (current !== policyEpoch.current || value.sessionId !== sessionId)
                return;
            setPolicySnapshot(value);
            setPolicyError(null);
            setPolicyStale(false);
            setPolicyReadFailed(false);
        }, () => {
            if (current !== policyEpoch.current)
                return;
            setPolicyError(t('toolApprovalUnavailable'));
            setPolicyStale(true);
            setPolicyReadFailed(true);
        });
        stream.start();
        return () => {
            ++policyEpoch.current;
            void stream.dispose();
        };
    }, [isAcp, remote, streamFactory, sessionId, t, retry]);
    if (!isAcp ||
        (snapshot !== null && snapshot.sessionId !== sessionId) ||
        (policySnapshot !== null && policySnapshot.sessionId !== sessionId))
        return null;
    if (snapshot === null && policySnapshot === null) {
        if (policyError === null && error === null)
            return null;
        return h('button', {
            type: 'button',
            className: `${css.trigger} ${css.retryTrigger}`,
            onClick: () => setRetry((value) => value + 1),
            title: t(policyError !== null ? 'toolApprovalRetry' : 'agentControlRetry'),
        }, policyError ?? error);
    }
    // The native running projection also locks the small interval before ACP prompt begins.
    const visibleSnapshot = snapshot === null ? null : { ...snapshot, editable: snapshot.editable && !running && optionWriteAllowed };
    const label = snapshot === null ? t('toolApprovalSession') : agentControlLabel(snapshot, t);
    const groups = [
        ...(policySnapshot === null || policyStale
            ? []
            : [toolApprovalPolicyGroup({ ...policySnapshot, editable: policySnapshot.editable && policyWriteAllowed }, t)]),
        ...(visibleSnapshot === null ? [] : agentControlMenuGroups(visibleSnapshot, t)),
    ];
    const footer = [...(snapshot === null ? [] : agentControlFooter(snapshot, t))];
    // A read-only explanation must not create an empty menu before controls arrive.
    if (groups.length === 0 && footer.length === 0 && snapshot?.note == null && error === null && policyError === null)
        return null;
    if (snapshot !== null && (running || (!visibleSnapshot?.editable && snapshot.freshness === 'live')))
        footer.push({ type: 'label', id: 'read-only', text: t(running ? 'agentControlRunning' : 'agentControlReadOnly') });
    if (error !== null)
        footer.push({ type: 'label', id: 'error', text: error });
    if (policyError !== null)
        footer.push({ type: 'label', id: 'policy-error', text: policyError });
    const select = (item) => {
        if (sessionId === undefined)
            return;
        const current = epoch.current;
        // Submitted operations outlive this view; only their local error state is generation-scoped.
        const sourceSession = { id: sessionId, title: sessionTitle ?? null };
        setOpen(false);
        setBusy(true);
        if (item.write.kind === 'tool-approval-policy') {
            if (policySnapshot === null ||
                policyStale ||
                !policySnapshot.editable ||
                !policyWriteAllowed ||
                sessionAccessSource(sessionId, 'dshAcp/setToolApprovalPolicy')?.getSnapshot() !== true) {
                setBusy(false);
                return;
            }
            setPolicyError(null);
            void remote
                .setToolApprovalPolicy(sessionId, { policy: item.write.policy })
                .then((result) => {
                if (result.ok)
                    return;
                feedback.report('tool-approval-failed', current === epoch.current ? undefined : sourceSession);
                if (current === epoch.current)
                    setPolicyError(t('toolApprovalChangeFailed'));
            })
                .catch(() => {
                feedback.report('tool-approval-failed', current === epoch.current ? undefined : sourceSession);
                if (current === epoch.current)
                    setPolicyError(t('toolApprovalChangeFailed'));
            })
                .finally(() => {
                if (current === epoch.current)
                    setBusy(false);
            });
            return;
        }
        if (snapshot === null ||
            visibleSnapshot === null ||
            !visibleSnapshot.editable ||
            snapshot.freshness !== 'live' ||
            !optionWriteAllowed ||
            sessionAccessSource(sessionId, 'dshAcp/setAgentSessionOption')?.getSnapshot() !== true) {
            setBusy(false);
            return;
        }
        setError(null);
        void remote
            .setAgentSessionOption(sessionId, item.write)
            .then((result) => {
            if (result.ok)
                return;
            feedback.report('session-option-failed', current === epoch.current ? undefined : sourceSession);
            if (current === epoch.current)
                setError(result.error.message);
        })
            .catch((reason) => {
            feedback.report('session-option-failed', current === epoch.current ? undefined : sourceSession);
            if (current === epoch.current)
                setError(reason instanceof Error ? reason.message : String(reason));
        })
            .finally(() => {
            if (current === epoch.current)
                setBusy(false);
        });
    };
    return h(AgentSessionMenu, {
        groups,
        footer,
        label,
        t,
        open,
        disabled: busy,
        side: 'top',
        onOpenChange: (value) => {
            if (value && (readFailed || policyReadFailed))
                setRetry((current) => current + 1);
            setOpen(value);
        },
        onSelect: select,
    });
}
//# sourceMappingURL=AcpAgentControl.js.map