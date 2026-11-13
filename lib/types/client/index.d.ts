/** Native browser integration for ACP sessions and activity. */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        acpActivity: import('./ui/locales.ts').AcpLocaleKey;
        'settings.acp': import('./ui/locales.ts').AcpLocaleKey;
    }
}
export declare const inject: readonly ["uiConversation", "slots", "locale", "remote", "remoteAccess", "sessions", "workspaces", "uiWorkspace", "sidebarRight", "configForms", "remote.settings", "remote.session"];
/** Mount the generated namespace before starting the fiber that consumes it. */
export declare function apply(ctx: ClientContext): Promise<() => Promise<void>>;
export type * from '../contract/remote.ts';
//# sourceMappingURL=index.d.ts.map