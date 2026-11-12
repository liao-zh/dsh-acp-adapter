/** Build-time registry catalog. No runtime network or host-platform assumptions. */
import { type AcpAgentId } from '../../contract/agent-config.ts';
interface RegistryAgent {
    readonly id: string;
    readonly name: string;
    readonly version?: string | undefined;
    readonly website?: string | undefined;
    readonly distribution?: {
        readonly npx?: {
            readonly package?: string | undefined;
            readonly args?: readonly string[] | undefined;
        } | undefined;
        readonly uvx?: {
            readonly package?: string | undefined;
            readonly args?: readonly string[] | undefined;
        } | undefined;
        readonly binary?: {
            readonly [platform: string]: {
                readonly archive?: string | undefined;
                readonly cmd?: string | undefined;
                readonly args?: readonly string[] | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
}
interface ExecutableEntry {
    readonly kind: string;
    readonly manualReason?: string;
    readonly env: Readonly<Record<string, string>>;
    readonly version: string;
    readonly command: string;
    readonly args: readonly string[];
}
/** One add-menu catalog entry: directory facts plus the PATH prefill it carries. */
export interface AcpCatalogEntry {
    /** Registry agent id (doubles as the seeded draft id; user-editable). */
    readonly id: string;
    /** Display name. */
    readonly name: string;
    /** Registry-published upstream version (sidecar double-checked; undefined when neither has it). */
    readonly version: string | undefined;
    /** Install guidance derived from the registry distribution (npx/uvx/binary facts). */
    readonly installHint: string;
    /** PATH executable name prefill; empty when the snapshot lacks this agent (manual entry remains). */
    readonly command: string;
    /** Adapter verification scope is independent of the advertised registry version. */
    readonly verification: 'adapter-tested' | 'unverified';
    /** Prepend argv prefill (empty when unknown). */
    readonly args: readonly string[];
    readonly env: Readonly<Record<string, string>>;
    readonly requiresCommand: boolean;
    /** Specialized runtime identity seeded only when adding this catalog entry. */
    readonly runtime?: AcpAgentId;
    readonly loginHint?: string;
}
/**
 * 全量 catalog：已验证适配条目排前，其余按 registry 顺序。合成是
 * 纯数据变换，模块加载时执行一次。
 */
export declare const ACP_CATALOG_ENTRIES: readonly AcpCatalogEntry[];
export declare function buildCatalogEntries(registryAgents: readonly RegistryAgent[], executableEntries: Readonly<Record<string, ExecutableEntry>>): AcpCatalogEntry[];
/** Look up one catalog entry by registry agent id (the add-menu rows are rendered from the list). */
export declare function catalogEntryOf(id: string): AcpCatalogEntry | undefined;
export {};
//# sourceMappingURL=catalog.d.ts.map