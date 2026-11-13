import type { ReactNode } from 'react';
import type { CrossBackendCoordinator } from '../coordinator/cross-backend-coordinator.ts';
import type { AcpLocaleKey } from './locales.ts';
type Translate = (key: AcpLocaleKey, params?: Record<string, string | number>) => string;
export declare function CrossBackendModal({ coordinator, t, }: {
    coordinator: CrossBackendCoordinator;
    t: Translate;
}): ReactNode;
export {};
//# sourceMappingURL=CrossBackendModal.d.ts.map