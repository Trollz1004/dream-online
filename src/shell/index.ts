/**
 * Public barrel for the in-house DREAM Space dashboard shell (src/shell/).
 * Zero dependency on game engine code or third-party UI kits.
 */
export {
  DashboardShell,
  DEFAULT_SHELL_LABELS,
  type DashboardShellProps,
  type ShellLabels,
} from './DashboardShell.tsx';
export { Sidebar, ShellTribute, groupItems, type SidebarProps } from './Sidebar.tsx';
export { Dock, dockPanelId, dockTabId, type DockProps } from './Dock.tsx';
export { ModelSwitcher, type ModelSwitcherProps } from './ModelSwitcher.tsx';
export type {
  ShellDockPanel,
  ShellLane,
  ShellLaneStatus,
  ShellSidebarItem,
} from './types.ts';
export {
  AAA_RATIO,
  MIN_FONT_PX,
  SHELL_COLOR_PAIRS,
  color,
  colorNotUsed,
  contrastRatio,
  fill,
  font,
  fontSize,
  fontStylesheetHref,
  fontWeight,
  groundHex,
  hexToRgb,
  letterSpacing,
  lineHeight,
  motion,
  overInk,
  pairRatio,
  radius,
  relativeLuminance,
  rem,
  rgbToHex,
  rgba,
  size,
  space,
  type ColorPair,
  type ColorToken,
  type Ground,
  type PairKind,
} from './tokens.ts';
export { SHELL_CSS, buildShellCss } from './styles.ts';
export { idFragment, rovingIndex, type Orientation } from './keyboard.ts';
export {
  IconBrowser,
  IconChat,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconClose,
  IconFiles,
  IconGit,
  IconGrid,
  IconMenu,
  IconMerge,
  IconPreview,
  IconSliders,
  IconTerminal,
} from './icons.tsx';
export {
  DEMO_DOCK_PANELS,
  DEMO_LANES,
  DEMO_SIDEBAR_ITEMS,
  DesignSystemSheet,
  ShellDemo,
  type ShellDemoProps,
} from './ShellDemo.tsx';
export {
  FIVE_HOUR_CAP_MODELS,
  GOOGLE_FLOW_VISION_ZONES,
  redactWorkspaceSecrets,
  swapModelOnFiveHourCap,
  type GoogleFlowVisionZone,
  type WorkspaceModelOption,
} from './workspaceConfig.ts';
