import type { ReactNode } from 'react';
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives';
import type { AgentControlChoice, AgentControlGroup, AgentControlTranslate } from './agent-session-controls.ts';
type Props = {
    readonly groups: readonly AgentControlGroup[];
    readonly footer?: readonly MenuEntry[];
    readonly label: string;
    readonly t: AgentControlTranslate;
    readonly open: boolean;
    readonly disabled?: boolean;
    readonly side?: 'top' | 'bottom';
    readonly align?: 'start' | 'end';
    readonly onOpenChange: (open: boolean) => void;
    readonly onSelect: (choice: AgentControlChoice) => void;
};
/** One native menu for main sessions, member modes and batch modes.
 * Callers supply visible choices and write permissions; presentation never
 * derives authority from whether the menu is shown in a team or composer.
 */
export declare function AgentSessionMenu({ groups, footer, label, t, open, disabled, side, align, onOpenChange, onSelect, }: Props): ReactNode;
export {};
//# sourceMappingURL=AgentSessionMenu.d.ts.map