/** Adapter-owned approval text; Agent commands, titles and options stay intact. */
declare const en: {
    actions: Record<string, string>;
    restrictedOperation: string;
    permission: string;
    command: string;
    directory: string;
    backgroundWait: (milliseconds: number) => string;
    filePath: string;
    content: string;
    locations: string;
    input: string;
    details: string;
    member: string;
    responsibility: string;
    recipient: string;
    workspace: string;
    context: string;
    provider: string;
    model: string;
    agent: string;
    unknownCommand: string;
    agentOption: string;
    option: (ordinal: number) => string;
    acpTool: string;
    allowOnce: string;
    rejectOnce: string;
    delegatedPermissionUnavailable: string;
    delegatedQuestionUnavailable: string;
    permissionPolicyUnavailable: string;
};
export type PermissionCopy = typeof en;
/** Host locale preference is optional; browser-only detection is unavailable here. */
export declare function permissionCopy(locale: string | undefined): PermissionCopy;
export {};
//# sourceMappingURL=permission-copy.d.ts.map