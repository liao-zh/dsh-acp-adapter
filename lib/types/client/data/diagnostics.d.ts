/** Locale-safe formatting for host/transport diagnostics shown by plugin UI. */
/** Translation function narrowed by each caller's own locale-key union. */
export type DiagnosticTranslate<K extends string> = (key: K, params?: Record<string, string | number>) => string;
/**
 * Localize an operation failure without interpolating arbitrary host prose.
 * Agent-authored messages are not passed through this helper.
 */
export declare function localizedDiagnostic<K extends string>(t: DiagnosticTranslate<K>, key: K, rawMessage: string | undefined, params?: Record<string, string | number>): string;
//# sourceMappingURL=diagnostics.d.ts.map