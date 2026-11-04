/**
 * Right dock: a tab list (terminal, files, git, browser, previews, ...) with
 * one panel per tab. Each panel is a region named by its tab. On phones the
 * dock becomes a bottom sheet with a handle that opens and closes it.
 *
 * Keyboard: Tab reaches the selected tab, arrows move between tabs and
 * select them, Home and End jump, Tab again enters the panel. Escape closes
 * the sheet on phones and returns focus to the handle.
 */
import React, { useRef } from 'react';
import { IconChevronDown, IconChevronUp } from './icons.tsx';
import { idFragment, rovingIndex } from './keyboard.ts';
import type { ShellDockPanel } from './types.ts';

export interface DockProps {
  id: string;
  label: string;
  panels: readonly ShellDockPanel[];
  activeId: string | undefined;
  onSelect: (panel: ShellDockPanel) => void;
  sheetOpen: boolean;
  onSheetToggle: (open: boolean) => void;
  isPhone: () => boolean;
  inert?: boolean;
}

export function dockTabId(dockId: string, panelId: string) {
  return `${dockId}-tab-${idFragment(panelId)}`;
}
export function dockPanelId(dockId: string, panelId: string) {
  return `${dockId}-panel-${idFragment(panelId)}`;
}

export function Dock({ id, label, panels, activeId, onSelect, sheetOpen, onSheetToggle, isPhone, inert }: DockProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const handleRef = useRef<HTMLButtonElement>(null);
  const active = panels.find((p) => p.id === activeId) ?? panels[0];
  const activeIndex = Math.max(0, panels.findIndex((p) => p.id === active?.id));
  const bodyId = `${id}-body`;

  const onTabKey = (e: React.KeyboardEvent) => {
    const next = rovingIndex(e.key, activeIndex, panels.length, 'both');
    if (next === null) return;
    e.preventDefault();
    onSelect(panels[next]);
    tabRefs.current[next]?.focus();
  };

  const onDockKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && sheetOpen && isPhone()) {
      e.preventDefault();
      onSheetToggle(false);
      handleRef.current?.focus();
    }
  };

  if (!active) return null;

  const handleSelectTab = (p: ShellDockPanel) => {
    onSelect(p);
    if (isPhone() && !sheetOpen) {
      onSheetToggle(true);
    }
  };

  return (
    <aside
      className="ds-dock"
      id={id}
      aria-label={label}
      tabIndex={-1}
      data-shell="dock"
      data-sheet={sheetOpen ? 'open' : 'closed'}
      onKeyDown={onDockKey}
      inert={inert || undefined}
    >
      <button
        ref={handleRef}
        type="button"
        className="ds-sheet-handle"
        aria-expanded={sheetOpen}
        aria-controls={bodyId}
        onClick={() => onSheetToggle(!sheetOpen)}
        data-shell="sheet-handle"
      >
        <span className="ds-sheet-grip" aria-hidden="true" />
        <span className="ds-sheet-label">
          {label}: {active.label}
        </span>
        <span className="ds-sheet-state">
          {sheetOpen ? 'Hide' : 'Show'}
          {sheetOpen ? <IconChevronDown /> : <IconChevronUp />}
        </span>
      </button>
      <div className="ds-dock-body" id={bodyId}>
        <div className="ds-dock-head">
          <h2 className="ds-dock-title">{label}</h2>
        </div>
        <div className="ds-tablist" role="tablist" aria-label={`${label} tabs`} aria-orientation="horizontal" onKeyDown={onTabKey}>
          {panels.map((p, i) => {
            const selected = p.id === active.id;
            return (
              <button
                key={p.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={dockTabId(id, p.id)}
                aria-selected={selected}
                aria-controls={dockPanelId(id, p.id)}
                tabIndex={selected ? 0 : -1}
                className="ds-tab"
                onClick={() => handleSelectTab(p)}
                data-tab={p.id}
              >
                {p.icon}
                <span>{p.label}</span>
                {p.needsYou && <span className="ds-tab-needs">needs you</span>}
              </button>
            );
          })}
        </div>
        {panels.map((p) => {
          const selected = p.id === active.id;
          const panelContent = typeof p.content === 'function' ? (selected ? p.content() : null) : p.content;
          return (
            <section
              key={p.id}
              className="ds-tabpanel"
              role="tabpanel"
              id={dockPanelId(id, p.id)}
              aria-labelledby={dockTabId(id, p.id)}
              aria-label={p.label}
              tabIndex={0}
              hidden={!selected}
              data-panel={p.id}
            >
              {panelContent}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
