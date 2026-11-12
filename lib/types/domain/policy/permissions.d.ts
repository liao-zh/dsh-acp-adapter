import type * as acp from '@agentclientprotocol/sdk';
import type { AcpExternalPolicyDecision, AcpExternalPolicyRequest } from '../../contract/permission-policy.ts';
import type { AcpNativeQuestionUnavailable, AcpNativeUserQuestionService, AcpPermissionQuestionService } from './elicitation.ts';
import { ACP_PERMISSION_AUDIT_KIND, type AcpPermissionAuditData } from './events.ts';
export type { AcpApprovalOutcome } from './events.ts';
export declare const ACP_PERMISSION_OPTIONS_MAX = 128;
export declare const ACP_PERMISSION_ID_MAX_BYTES = 512;
interface DshTeamPermissionPresentation {
    readonly tool: 'spawn_teammate' | 'send_message';
    readonly workspace?: string;
}
/**
 * Only the live DSH bridge may attach this presentation hint after resolving
 * its own tool definition. Wire metadata and cached display names cannot forge
 * the symbol. It grants no authority and is deliberately absent from JSON.
 */
export declare function withDshTeamPermissionPresentation<T extends acp.ToolCallUpdate>(call: T, presentation: DshTeamPermissionPresentation): T;
export interface AcpPermissionAuditRecord {
    readonly kind: typeof ACP_PERMISSION_AUDIT_KIND;
    readonly time: number;
    readonly data: AcpPermissionAuditData;
}
export interface AcpPermissionAuditChannel {
    append(record: AcpPermissionAuditRecord): Promise<void>;
}
export type AcpNativeQuestionProfile = 'antigravity';
/** The Host boundary validates the live Agent before entering the public policy service. */
export interface AcpExternalPermissionPolicyRequest extends Omit<AcpExternalPolicyRequest, 'agent'> {
    readonly agent: unknown;
}
export interface AcpNativeApprovalService {
    evaluateExternal?(request: AcpExternalPermissionPolicyRequest): Promise<AcpExternalPolicyDecision>;
    request(req: {
        readonly agent: unknown;
        readonly toolName: string;
        readonly callId?: unknown;
        readonly reason?: string;
        readonly signal?: AbortSignal;
        /** Tool input at the approval boundary, after runtime normalization; absent when not supplied here. */
        readonly toolArgs?: unknown;
        /** Recognized string command from execute input at this boundary; absent for other or unrecognized inputs. */
        readonly commandLine?: string;
    }): Promise<'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'>;
}
export interface AcpNativePermissionBridgeDeps {
    readonly userQuestions?: AcpNativeUserQuestionService;
    /** External permission-only presentation; ordinary interaction calls keep their native owner. */
    readonly permissionQuestions?: AcpPermissionQuestionService;
    readonly approval?: AcpNativeApprovalService;
    readonly nativeQuestionProfile?: AcpNativeQuestionProfile;
    /** Resolved by the adapter runtime, never from Agent-supplied metadata. */
    readonly permissionProfile?: string;
    readonly getAgent: () => unknown;
    readonly locale?: string;
    readonly log?: (message: string) => void;
    readonly onUnavailable?: (issue: AcpNativeQuestionUnavailable) => void | Promise<void>;
    readonly audit?: AcpPermissionAuditChannel;
    readonly now?: () => number;
}
export declare function createAcpNativePermissionHandler(deps: AcpNativePermissionBridgeDeps): (params: acp.RequestPermissionRequest, signal?: AbortSignal) => Promise<acp.RequestPermissionResponse>;
//# sourceMappingURL=permissions.d.ts.map