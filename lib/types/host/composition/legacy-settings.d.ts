/** Import the former ACP settings section into this profile without replacing existing configuration. */
import type { Context } from '@deepseek-ai/cordis';
import { type AcpSettings } from './config.ts';
/** Read either side of the native import's atomic rename; never modify its source or backup. */
export declare function readLegacyAcpSettings(home: string): Promise<AcpSettings | undefined>;
/** Run after Loader settles so ConfigEditor can address the installed bundle entry. */
export declare function installLegacySettingsImport(ctx: Context): void;
//# sourceMappingURL=legacy-settings.d.ts.map