import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
/** Shared copy for all ACP JSON inspectors. */
export function acpJsonTreeLabels(t) {
    return {
        copyValue: t('auditCopyValue'),
        copyJson: t('auditCopyJson'),
        copyPath: t('auditCopyPath'),
        copyPrettyJson: t('auditCopyPrettyJson'),
        copyCompactJson: t('auditCopyCompactJson'),
        copied: t('auditCopied'),
        copyFailed: t('auditCopyFailed'),
        collapseNode: t('auditCollapseNode'),
        expandNode: t('auditExpandNode'),
        copyButtonTitle: (action) => t('auditCopyOptions', { action }),
    };
}
/** Share the native expanded-string preference for one client registration. */
export function createAcpJsonStringWrapping() {
    const store = createSnapshotStore(true);
    return {
        getDefault: store.getSnapshot,
        setDefault: (value) => {
            store.set(value);
        },
    };
}
//# sourceMappingURL=json-tree.js.map