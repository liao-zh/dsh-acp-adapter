import type { ReactNode } from 'react';
import type { ComposerChainProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { HostObservable, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
export declare function selectExternalSubagentRecord(owner: ComposerChainProps, records: ReadonlySet<SessionId>): true | null;
/** Refresh only the narrow claim when native, Host-pushed ownership facts change. */
export declare function followExternalSubagentRecords(source: HostObservable<ReturnType<ISessions['list']['getSnapshot']>>, mount: (records: ReadonlySet<SessionId>) => () => void): () => void;
/** The external Agent owns its private history; this local record cannot accept input. */
export declare function AcpExternalSubagentComposer({ t }: PropsLocale<'acpActivity'>): ReactNode;
//# sourceMappingURL=AcpExternalSubagentComposer.d.ts.map