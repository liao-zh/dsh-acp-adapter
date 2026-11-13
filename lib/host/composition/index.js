import { installLegacySettingsImport } from "./legacy-settings.js";
import { Config } from "./config.js";
export { Config };
import { installInstalledProfileRegistry } from "./installed-profile-registry.js";
export const name = 'dsh-acp-adapter';
// Wait for the host-owned seams before creating routes. This avoids freezing a
// missing sessions/subprocess service during an early composition pass.
// Attachment storage is required because ACP image capability is only true
// when DSH can read its durable image references.  Waiting for this seam at
// composition time prevents a health probe from freezing a false
// `promptImage: unsupported` result before the host finishes booting.
// Permission facts are read from the host preset projection before ACP dispatch.
export const inject = [
    'llm',
    'sessions',
    'subprocess',
    'dshHomePath',
    'attachments',
    'sessionProjections',
    'permissionPresets',
];
export function apply(ctx, config) {
    ctx.inject(['settings'], (child) => {
        child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
    });
    installInstalledProfileRegistry(ctx, config, { installRemote: true });
    installLegacySettingsImport(ctx);
}
export { installInstalledProfileRegistry } from "./installed-profile-registry.js";
//# sourceMappingURL=index.js.map