export class AcpHostSettlementError extends Error {
    code;
    remoteOutcomeKnown;
    remoteResponse;
    constructor(code, options) {
        super(code);
        this.code = code;
        this.remoteOutcomeKnown = options?.remoteOutcomeKnown;
        this.remoteResponse = options?.remoteResponse;
        this.name = 'AcpHostSettlementError';
    }
}
//# sourceMappingURL=mcp-lease.js.map