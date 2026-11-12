/** Classification and bounded detached copies of ACP session configuration options. */
import type * as acp from '@agentclientprotocol/sdk';
/**
 * Keep only the protocol's known option shapes and cap both dimensions.
 * Agent-owned labels and values remain exact protocol data; oversized
 * selectable identifiers are discarded rather than rewritten.
 */
export declare function acpConfigOptionsSnapshot(options: readonly acp.SessionConfigOption[] | null | undefined): acp.SessionConfigOption[] | undefined;
export declare function isModelConfigOption(option: acp.SessionConfigOption): boolean;
export declare function advertisesIndependentModelControls(options: readonly acp.SessionConfigOption[] | undefined): boolean;
//# sourceMappingURL=config-options.d.ts.map