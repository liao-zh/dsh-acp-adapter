/** Publish durable external-child discovery through DSH's parent-owned catalog. */
import type { Context } from '@deepseek-ai/cordis';
import type { Session, SessionHeader } from '@deepseek-ai/dsh-session';
export declare function installExternalChildCatalog(ctx: Context, store: {
    get(id: string): Session | undefined;
    flush(session: Session): Promise<boolean>;
}): (header: SessionHeader, label: string) => Promise<void>;
//# sourceMappingURL=catalog-publication.d.ts.map