/** Validated Agent configuration shared by Loader and the ACP settings editor. */
import z from '@deepseek-ai/schemastery';
import type { Volatile } from '@deepseek-ai/cordis';
import type { AcpAgentConfig } from '../../domain/session/agent-config.ts';
export type AcpToolApprovalPolicy = 'auto' | 'ask';
export interface AcpSettings {
    agents: Record<string, AcpAgentConfig>;
    toolApprovalDefault: AcpToolApprovalPolicy;
}
export interface Config {
    agents: Volatile<Record<string, AcpAgentConfig>>;
    toolApprovalDefault: Volatile<AcpToolApprovalPolicy>;
}
/**
 * Validating resolver for the `dsh-acp` namespace: an absent section resolves
 * to zero agents; an invalid one throws, which is how the settings service
 * refuses the write (or keeps the last good value on an external edit).
 */
export declare const acpSettingsSchema: ((value: unknown) => AcpSettings) & {
    toJSON(): unknown;
};
export declare const Config: z<unknown, Config>;
export type AcpSettingsSchema = typeof acpSettingsSchema;
//# sourceMappingURL=config.d.ts.map