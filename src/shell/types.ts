/**
 * Public types for the in-house dashboard shell. No game code, no UI kit.
 */
import type { ReactNode } from 'react';

/** One entry in the left sidebar. */
export interface ShellSidebarItem {
  id: string;
  /** Visible label, also the accessible name. */
  label: string;
  /** Inline stroke SVG (see src/shell/icons.tsx). Decorative; hidden from screen readers. */
  icon?: ReactNode;
  /** Heading the item sits under. Items with the same group are listed together, in order. */
  group?: string;
  /** Short count or word shown at the right, for example "3". */
  badge?: string;
  /** Marks the item with the Signal "needs you" word. Yellow means one thing. */
  needsYou?: boolean;
  /** When set the item is a real link; otherwise it is a button that reports the choice. */
  href?: string;
}

/** One tab in the dock (terminal, files, git, browser, previews, ...). */
export interface ShellDockPanel {
  id: string;
  /** Tab label; the tab panel's region name is the same text. */
  label: string;
  icon?: ReactNode;
  /** Panel content. A function is called only while the panel is shown. */
  content: ReactNode | (() => ReactNode);
  needsYou?: boolean;
}

export type ShellLaneStatus = 'ready' | 'capped' | 'off';

/** One AI lane the model switcher can choose. */
export interface ShellLane {
  id: string;
  label: string;
  /** Where it runs or who provides it, one short line. */
  detail?: string;
  status?: ShellLaneStatus;
}
