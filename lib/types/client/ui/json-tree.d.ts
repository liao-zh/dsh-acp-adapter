import type { JsonTreeLabels, JsonTreeProps } from '@deepseek-ai/dsh-client-ui-primitives';
import type { AcpLocaleKey } from './locales.ts';
export type AcpJsonStringWrapping = Omit<NonNullable<JsonTreeProps['stringWrapping']>, 'label'>;
type Translate = (key: AcpLocaleKey, params?: Record<string, string | number>) => string;
/** Shared copy for all ACP JSON inspectors. */
export declare function acpJsonTreeLabels(t: Translate): JsonTreeLabels;
/** Share the native expanded-string preference for one client registration. */
export declare function createAcpJsonStringWrapping(): AcpJsonStringWrapping;
export {};
//# sourceMappingURL=json-tree.d.ts.map