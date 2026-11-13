/** Live ACP routes derived from native volatile plugin configuration. */
import type { Context } from '@deepseek-ai/cordis';
import type { AcpProbeOptions } from '../../protocol/v1/types.ts';
import type { AcpAgentConfig, AcpResolvedAgent } from '../../domain/session/agent-config.ts';
import { acpProbeConfigKey } from './llm-stub.ts';
import type { SubprocessSeamResolution } from '../../runtime/process/subprocess.ts';
import type { AcpSidecar } from '../../persistence/sidecar.ts';
import type { AcpRecoveryView } from '../../contract/remote.ts';
import type { AcpRecoveryState } from '../../persistence/sidecar.ts';
export { acpProbeConfigKey };
export type ActivityReadStatus = 'owned' | 'binding-pending' | 'denied';
/**
 * Resolve the activity stream's strict read status. A confirmed owned live ACP
 * route with no durable binding returns a temporary pending signal for initial-
 * follow retry; it never grants access. Malformed records remain denied,
 * while storage failures propagate so callers can retry without seeing a false
 * healthy or unauthorized result.
 */
export declare function activityReadStatusOf(input: {
    readonly sessionId: string;
    readonly sidecar: Pick<AcpSidecar, 'hasDurableActivityOwner' | 'readLatestBinding'> | undefined;
    readonly liveProvider: string | undefined;
    readonly ownedProviders: ReadonlySet<string>;
}): Promise<ActivityReadStatus>;
/** Compose volatile settlement context over the recovery fact without persisting it. */
export declare function recoveryViewWithLocalStatus(sessionId: string, visibleState: AcpRecoveryState | undefined, localStatus: AcpRecoveryView['localStatus']): AcpRecoveryView | undefined;
export { acpSettingsSchema } from './config.ts';
export type { AcpSettings, AcpSettingsSchema } from './config.ts';
import type { Config } from './config.ts';
/** What the registry hands to `registerAdapter`/`replace`: route id plus the display name the selector shows. */
export interface AcpRegistrationFact {
    provider: string;
    displayName: string;
}
/**
 * Route facts captured by the LLM registry at registration time, sorted by
 * provider so a settings document that merely reorders its keys is not
 * mistaken for a route change (llm-pi-ai precedent). `displayName` rides along
 * because the registry snapshots `providerInfo().name` per route: a rename
 * that did not re-register would leave the old label showing.
 */
export declare function acpRegistrationFacts(agents: Record<string, AcpAgentConfig>): AcpRegistrationFact[];
/** Live face of the installed-profile route registry.
 * This is deliberately not the official ACP Registry catalog. */
export interface InstalledProfileRegistry {
    /**
     * Resolves after the initial settings snapshot has been applied to the LLM
     * route registry.  Session creation can race Cordis' inject callback during
     * startup; callers must await this barrier before resolving an `acp-*` route,
     * otherwise a configured ACP default can be mistaken for an unknown native
     * provider and fall through to DSH's LLM stub.
     */
    readonly ready: Promise<void>;
    /**
     * Current agents, keyed by agent id (detached snapshot). Writes go through
     * the settings service (`settings.update/mutate/replace` on `dsh-acp`); this
     * registry is the read + watch + route-registration side.
     */
    agents(): ReadonlyMap<string, AcpAgentConfig>;
    /** Resolve an LLM route id (`acp-<id>`) to its agent; undefined for foreign/unknown routes. */
    resolveRoute(provider: string): AcpResolvedAgent | undefined;
}
export interface InstalledProfileRegistryOptions {
    /** Mount the additive dshAcp activity Remote in the provider composition.
     * The additive provider composition mounts its own service when enabled. */
    installRemote?: boolean;
    /** Connection knobs forwarded to every probe (tests shorten the teardown ladder). */
    probeOptions?: AcpProbeOptions;
    /**
     * 加载期解析的 subprocess seam（host composition 经
     * ./subprocess.ts 的 `resolveSubprocessSeam` 解析一次后传入；probe 经它
     * spawn）。缺席 = 未接线，probe 以 spawn-failure fail closed。
     */
    subprocess?: SubprocessSeamResolution;
}
/** Release ACP producers alongside native jobs during owner-scope disposal.
 * session/disposed follows that scope's cleanup, so waiting for it alone
 * deadlocks when jobs are still waiting for the Agent process to stop. */
export declare function installAcpSessionRuntimeCleanup(ctx: Context, disposeSession: (session: {
    readonly id: string;
    readonly identity?: object;
}) => Promise<void>): () => Promise<void>;
/** Keep ACP routes synchronized with Loader-owned volatile Agent configuration. */
export declare function installInstalledProfileRegistry(ctx: Context, config: Config, options?: InstalledProfileRegistryOptions): InstalledProfileRegistry;
//# sourceMappingURL=installed-profile-registry.d.ts.map