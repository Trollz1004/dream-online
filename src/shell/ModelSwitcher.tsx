/**
 * Model switcher: takes a list of lanes and reports the chosen one.
 *
 * Keyboard (menu button pattern): Enter, Space or Down on the trigger opens
 * the list with focus on the current lane; Up, Down, Home and End move;
 * Enter, Space or a click chooses, reports it through onChange, closes the
 * list and returns focus to the trigger; Escape closes without changing;
 * Tab closes and moves on.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { IconChevronDown } from './icons.tsx';
import { rovingIndex } from './keyboard.ts';
import type { ShellLane, ShellLaneStatus } from './types.ts';

export interface ModelSwitcherProps {
  lanes: readonly ShellLane[];
  /** Controlled chosen lane id. */
  value?: string;
  /** Uncontrolled starting lane id (defaults to the first lane). */
  defaultValue?: string;
  /** Called with the chosen lane and the one it replaced. */
  onChange?: (lane: ShellLane, previous: ShellLane | undefined) => void;
  /** Caption above the lane name, and the start of the trigger's name. */
  label?: string;
  /** Start with the list open (demo and tests). */
  defaultOpen?: boolean;
}

const STATUS_WORD: Record<ShellLaneStatus, string> = {
  ready: 'Ready',
  capped: 'Capped',
  off: 'Off',
};

export function ModelSwitcher({ lanes, value, defaultValue, onChange, label = 'Lane', defaultOpen = false }: ModelSwitcherProps) {
  const uid = useId();
  const menuId = `${uid}-lanes`;
  const [inner, setInner] = useState<string | undefined>(defaultValue ?? lanes[0]?.id);
  const chosenId = value ?? inner;
  const chosen = lanes.find((l) => l.id === chosenId) ?? lanes[0];
  const [open, setOpen] = useState(defaultOpen);
  const [focusIndex, setFocusIndex] = useState(() => Math.max(0, lanes.findIndex((l) => l.id === chosen?.id)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusOnOpen = useRef(false);

  const openMenu = useCallback(
    (at?: number) => {
      const idx = at ?? Math.max(0, lanes.findIndex((l) => l.id === chosen?.id));
      setFocusIndex(idx);
      focusOnOpen.current = true;
      setOpen(true);
    },
    [lanes, chosen?.id],
  );

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = (lane: ShellLane) => {
    const previous = chosen;
    if (value === undefined) setInner(lane.id);
    onChange?.(lane, previous);
    close(true);
  };

  useEffect(() => {
    if (open && focusOnOpen.current) {
      focusOnOpen.current = false;
      itemRefs.current[focusIndex]?.focus();
    }
  }, [open, focusIndex]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu(e.key === 'ArrowUp' ? lanes.length - 1 : undefined);
    }
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    const next = rovingIndex(e.key, focusIndex, lanes.length, 'vertical');
    if (next !== null) {
      e.preventDefault();
      setFocusIndex(next);
      itemRefs.current[next]?.focus();
    }
  };

  if (!chosen) return null;

  return (
    <div className="ds-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ds-btn ds-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${label}: ${chosen.label}. Change lane`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onTriggerKey}
        data-shell="model-switcher"
      >
        <span className="ds-switcher-text">
          <span className="ds-switcher-caption">{label}</span>
          <span className="ds-switcher-value">{chosen.label}</span>
        </span>
        <IconChevronDown />
      </button>
      {open && (
        <div className="ds-switcher-menu" id={menuId} role="menu" aria-label={`Choose a ${label.toLowerCase()}`} onKeyDown={onMenuKey}>
          <p className="ds-switcher-legend" aria-hidden="true">
            Choose a {label.toLowerCase()}
          </p>
          {lanes.map((lane, i) => (
            <button
              key={lane.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={lane.id === chosen.id}
              tabIndex={i === focusIndex ? 0 : -1}
              className="ds-lane"
              onClick={() => choose(lane)}
              onFocus={() => setFocusIndex(i)}
              data-lane={lane.id}
            >
              <span className="ds-lane-mark" aria-hidden="true" />
              <span className="ds-lane-text">
                <span className="ds-lane-label">{lane.label}</span>
                {lane.detail && <span className="ds-lane-detail">{lane.detail}</span>}
                {lane.status && <span className={`ds-status ds-status-${lane.status}`}>{STATUS_WORD[lane.status]}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
