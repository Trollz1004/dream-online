/**
 * The one in-house dashboard shell: left sidebar, main view with the model
 * switcher in its header, and a right dock of tabs. Mission Control, the
 * Sabretooth desk and DREAM Studio all mount this. No game code, no UI kit;
 * every value comes from src/shell/tokens.ts.
 *
 * Regions a screen reader hears: "Sidebar", "Main view", "Dock", and one
 * region per dock tab named by the tab. Names can be changed with `labels`.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Dock } from './Dock.tsx';
import { IconMenu } from './icons.tsx';
import { ModelSwitcher } from './ModelSwitcher.tsx';
import { Sidebar, ShellTribute } from './Sidebar.tsx';
import { SHELL_CSS } from './styles.ts';
import { size } from './tokens.ts';
import type { ShellDockPanel, ShellLane, ShellSidebarItem } from './types.ts';

export interface ShellLabels {
  sidebar: string;
  main: string;
  dock: string;
  lane: string;
}

export const DEFAULT_SHELL_LABELS: ShellLabels = {
  sidebar: 'Sidebar',
  main: 'Main view',
  dock: 'Dock',
  lane: 'Lane',
};

export interface DashboardShellProps {
  /** Product name at the top of the sidebar. */
  title: string;
  subtitle?: string;

  sidebarItems: readonly ShellSidebarItem[];
  activeItemId?: string;
  defaultActiveItemId?: string;
  onSelectItem?: (item: ShellSidebarItem) => void;
  /** Sidebar footer. Defaults to the front-facing tribute lines; pass null for internal tools. */
  footer?: React.ReactNode;

  lanes: readonly ShellLane[];
  activeLaneId?: string;
  defaultLaneId?: string;
  onLaneChange?: (lane: ShellLane, previous: ShellLane | undefined) => void;

  dockPanels: readonly ShellDockPanel[];
  activeDockPanelId?: string;
  defaultDockPanelId?: string;
  onDockPanelChange?: (panel: ShellDockPanel) => void;
  /** Phone bottom sheet starts open. */
  defaultSheetOpen?: boolean;
  /** Phone drawer starts open. */
  defaultMenuOpen?: boolean;
  /** Model switcher list starts open. */
  defaultLaneMenuOpen?: boolean;

  /** Heading of the main view. */
  mainTitle: string;
  mainSubtitle?: React.ReactNode;
  /** Extra controls at the right of the main header, after the model switcher. */
  headerActions?: React.ReactNode;
  children?: React.ReactNode;

  labels?: Partial<ShellLabels>;
  /** Render the stylesheet (on by default; turn off if the host already includes SHELL_CSS once). */
  includeStyles?: boolean;
}

function useControllable<T>(controlled: T | undefined, initial: T): [T, (v: T) => void] {
  const [inner, setInner] = useState<T>(initial);
  const value = controlled !== undefined ? controlled : inner;
  const set = useCallback(
    (v: T) => {
      if (controlled === undefined) setInner(v);
    },
    [controlled],
  );
  return [value, set];
}

const PHONE_QUERY = `(max-width: ${size.phoneMaxWidth}px)`;
const matchesPhone = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;

function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return phone;
}

export function DashboardShell(props: DashboardShellProps) {
  const {
    title,
    subtitle,
    sidebarItems,
    activeItemId,
    defaultActiveItemId,
    onSelectItem,
    footer = <ShellTribute />,
    lanes,
    activeLaneId,
    defaultLaneId,
    onLaneChange,
    dockPanels,
    activeDockPanelId,
    defaultDockPanelId,
    onDockPanelChange,
    defaultSheetOpen = false,
    defaultMenuOpen = false,
    defaultLaneMenuOpen = false,
    mainTitle,
    mainSubtitle,
    headerActions,
    children,
    includeStyles = true,
  } = props;
  const labels = { ...DEFAULT_SHELL_LABELS, ...props.labels };
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = {
    sidebar: `ds-${uid}-sidebar`,
    main: `ds-${uid}-main`,
    mainTitle: `ds-${uid}-main-title`,
    dock: `ds-${uid}-dock`,
  };

  const [itemId, setItemId] = useControllable(activeItemId, defaultActiveItemId ?? sidebarItems[0]?.id);
  const [panelId, setPanelId] = useControllable(activeDockPanelId, defaultDockPanelId ?? dockPanels[0]?.id);
  const [sheetOpen, setSheetOpen] = useState(defaultSheetOpen);
  const [menuOpen, setMenuOpen] = useState(defaultMenuOpen);
  const isPhone = useIsPhone();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const mainTitleRef = useRef<HTMLHeadingElement>(null);
  const drawerOpenedByUser = useRef(false);

  // Leaving the phone layout closes the drawer so nothing stays inert.
  useEffect(() => {
    if (!isPhone) setMenuOpen(false);
  }, [isPhone]);

  useEffect(() => {
    if (menuOpen && drawerOpenedByUser.current) {
      drawerOpenedByUser.current = false;
      drawerCloseRef.current?.focus();
    }
  }, [menuOpen]);

  const openMenu = () => {
    drawerOpenedByUser.current = true;
    setMenuOpen(true);
  };
  const closeMenu = (refocus = true) => {
    setMenuOpen(false);
    if (refocus) menuButtonRef.current?.focus();
  };

  const selectItem = (item: ShellSidebarItem) => {
    setItemId(item.id);
    onSelectItem?.(item);
    if (menuOpen && matchesPhone()) {
      setMenuOpen(false);
      mainTitleRef.current?.focus();
    }
  };

  const selectPanel = (panel: ShellDockPanel) => {
    setPanelId(panel.id);
    onDockPanelChange?.(panel);
  };

  const drawerModal = menuOpen && isPhone;

  return (
    <div
      className="ds-shell"
      data-menu={menuOpen ? 'open' : 'closed'}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && menuOpen && matchesPhone()) {
          e.preventDefault();
          closeMenu();
        }
      }}
    >
      {includeStyles && <style>{SHELL_CSS}</style>}
      <a className="ds-skip" href={`#${ids.main}`}>
        Skip to {labels.main.toLowerCase()}
      </a>
      <a className="ds-skip" href={`#${ids.dock}`}>
        Skip to {labels.dock.toLowerCase()}
      </a>

      <Sidebar
        id={ids.sidebar}
        label={labels.sidebar}
        title={title}
        subtitle={subtitle}
        items={sidebarItems}
        activeId={itemId}
        onSelect={selectItem}
        footer={footer}
        onCloseDrawer={() => closeMenu()}
        closeRef={drawerCloseRef}
      />
      <button type="button" className="ds-scrim" tabIndex={-1} aria-label="Close menu" onClick={() => closeMenu(false)} />

      <main className="ds-main" aria-label={labels.main} data-shell="main" inert={drawerModal || undefined}>
        <header className="ds-main-header">
          <button
            ref={menuButtonRef}
            type="button"
            className="ds-btn ds-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls={ids.sidebar}
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
            data-shell="menu-toggle"
          >
            <IconMenu />
            <span>Menu</span>
          </button>
          <div className="ds-main-titles">
            <h1 className="ds-main-title" id={ids.mainTitle} ref={mainTitleRef} tabIndex={-1}>
              {mainTitle}
            </h1>
            <span className="ds-title-rule" aria-hidden="true" />
            {mainSubtitle && <p className="ds-main-sub">{mainSubtitle}</p>}
          </div>
          <div className="ds-main-tools">
            <ModelSwitcher
              lanes={lanes}
              value={activeLaneId}
              defaultValue={defaultLaneId}
              onChange={onLaneChange}
              label={labels.lane}
              defaultOpen={defaultLaneMenuOpen}
            />
            {headerActions}
          </div>
        </header>
        <div className="ds-main-scroll" id={ids.main} tabIndex={0} aria-labelledby={ids.mainTitle} role="region" data-shell="main-scroll">
          {children}
        </div>
      </main>

      <Dock
        id={ids.dock}
        label={labels.dock}
        panels={dockPanels}
        activeId={panelId}
        onSelect={selectPanel}
        sheetOpen={sheetOpen}
        onSheetToggle={setSheetOpen}
        isPhone={matchesPhone}
        inert={drawerModal}
      />
    </div>
  );
}
