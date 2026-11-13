import type { Context } from '@deepseek-ai/cordis';
import type { AcpApprovalChildView } from '../../contract/remote.ts';
/** Discover only live, descriptor-backed descendants; persisted lineage alone grants nothing. */
export declare function createApprovalChildrenReader(ctx: Context, owns: (provider: string) => boolean): (parentId: string) => readonly AcpApprovalChildView[];
//# sourceMappingURL=approval-children.d.ts.map