/**
 * Left sidebar: brand, grouped items, footer. On phones it becomes a drawer
 * opened from the main header's Menu button.
 */
import React from 'react';
import { IconClose } from './icons.tsx';
import type { ShellSidebarItem } from './types.ts';

export interface SidebarProps {
  id: string;
  label: string;
  title: string;
  subtitle?: string;
  items: readonly ShellSidebarItem[];
  activeId: string | undefined;
  onSelect: (item: ShellSidebarItem) => void;
  footer: React.ReactNode;
  onCloseDrawer: () => void;
  closeRef: React.Ref<HTMLButtonElement>;
  inert?: boolean;
}

/** Items grouped by their `group`, keeping first-seen order. */
export function groupItems(items: readonly ShellSidebarItem[]): Array<{ group: string | undefined; items: ShellSidebarItem[] }> {
  const out: Array<{ group: string | undefined; items: ShellSidebarItem[] }> = [];
  for (const item of items) {
    const g = out.find((x) => x.group === item.group);
    if (g) g.items.push(item);
    else out.push({ group: item.group, items: [item] });
  }
  return out;
}

export function Sidebar({ id, label, title, subtitle, items, activeId, onSelect, footer, onCloseDrawer, closeRef, inert }: SidebarProps) {
  const groups = groupItems(items);
  return (
    <aside className="ds-sidebar" id={id} aria-label={label} data-shell="sidebar" inert={inert || undefined}>
      <div className="ds-sidebar-scroll">
        <div className="ds-brand">
          <div>
            <p className="ds-brand-title">{title}</p>
            {subtitle && <p className="ds-brand-sub">{subtitle}</p>}
          </div>
          <button ref={closeRef} type="button" className="ds-btn ds-btn-quiet ds-drawer-close" aria-label="Close menu" onClick={onCloseDrawer}>
            <IconClose />
          </button>
        </div>
        <nav className="ds-nav" aria-label={`${label} sections`}>
          {groups.map((g, gi) => {
            const headingId = `${id}-g${gi}`;
            return (
              <div key={g.group ?? `g${gi}`}>
                {g.group && (
                  <h2 className="ds-nav-group-title" id={headingId}>
                    {g.group}
                  </h2>
                )}
                <ul className="ds-nav-list" aria-labelledby={g.group ? headingId : undefined}>
                  {g.items.map((item) => {
                    const current = item.id === activeId;
                    const inner = (
                      <>
                        {item.icon}
                        <span className="ds-nav-label">{item.label}</span>
                        {item.needsYou && (
                          <span className="ds-badge ds-badge-needs">
                            {item.badge ?? 'needs you'}
                            {item.badge && <span className="ds-visually-hidden">, needs you</span>}
                          </span>
                        )}
                        {!item.needsYou && item.badge && <span className="ds-badge">{item.badge}</span>}
                      </>
                    );
                    return (
                      <li key={item.id}>
                        {item.href ? (
                          <a
                            className="ds-nav-item"
                            href={item.href}
                            aria-current={current ? 'page' : undefined}
                            onClick={() => onSelect(item)}
                            data-item={item.id}
                          >
                            {inner}
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="ds-nav-item"
                            aria-current={current ? 'page' : undefined}
                            onClick={() => onSelect(item)}
                            data-item={item.id}
                          >
                            {inner}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
      {footer && <footer className="ds-sidebar-footer">{footer}</footer>}
    </aside>
  );
}

/** The front-facing tribute lines for the sidebar footer. */
export function ShellTribute() {
  return (
    <>
      <p className="ds-tribute-title">CLAUDE's N Joshua's</p>
      <p className="ds-tribute-tag">#TeamClaudeForLife</p>
    </>
  );
}
