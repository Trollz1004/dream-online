/**
 * Unified Antigravity Workspace Shell — thin adapter over src/shell/ with
 * zero dependency on game code or third-party UI kits.
 */
import React from 'react';
import {
  DashboardShell,
  DEMO_DOCK_PANELS,
  DEMO_LANES,
  DEMO_SIDEBAR_ITEMS,
  ModelSwitcher,
  ShellDemo,
  ShellTribute,
  type DashboardShellProps,
  type ModelSwitcherProps,
  type ShellDockPanel,
  type ShellLane,
  type ShellSidebarItem,
} from '../shell/index.ts';

export {
  DashboardShell,
  DEMO_DOCK_PANELS,
  DEMO_LANES,
  DEMO_SIDEBAR_ITEMS,
  ModelSwitcher,
  ShellDemo,
  ShellTribute,
  type DashboardShellProps,
  type ModelSwitcherProps,
  type ShellDockPanel,
  type ShellLane,
  type ShellSidebarItem,
};

export type WorkspaceCenterView =
  | 'repos-models'
  | 'my-work'
  | 'automations'
  | 'game-dev-3d'
  | 'sabretooth-8392'
  | 't5500-3130';

export type RightInspectorTool = 'Review' | 'Open File' | 'Terminal' | 'Browser';

export interface UnifiedAntigravityWorkspaceShellProps {
  initialView?: WorkspaceCenterView;
  initialModelPickerOpen?: boolean;
  onReturnToFull3dViewport?: () => void;
  embedded3dPreview?: React.ReactNode;
}

const VIEW_TO_ITEM_ID: Record<WorkspaceCenterView, string> = {
  'repos-models': 'mission-control',
  'my-work': 'pull-requests',
  automations: 'schedules',
  'game-dev-3d': 'dream-studio',
  'sabretooth-8392': 'sabretooth',
  't5500-3130': 'mission-control',
};

export function UnifiedAntigravityWorkspaceShell({
  initialView = 'repos-models',
  initialModelPickerOpen = false,
  onReturnToFull3dViewport,
  embedded3dPreview,
}: UnifiedAntigravityWorkspaceShellProps) {
  return (
    <ShellDemo
      defaultActiveItemId={VIEW_TO_ITEM_ID[initialView] ?? 'mission-control'}
      defaultLaneMenuOpen={initialModelPickerOpen}
      onReturnToFull3dViewport={onReturnToFull3dViewport}
      embedded3dPreview={embedded3dPreview}
    />
  );
}
