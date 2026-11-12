/**
 * Additive ACP composition root. DSH owns the AgentLoop, native ModelPicker,
 * and conversation surface, including model search and selection.
 * This plugin also contributes ACP LLM routes and its existing settings/
 * sidecar services through public seams.
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.ts';
export { Config };
export declare const name = "dsh-acp-adapter";
export declare const inject: string[];
export declare function apply(ctx: Context, config: Config): void;
export { installInstalledProfileRegistry } from './installed-profile-registry.ts';
//# sourceMappingURL=index.d.ts.map