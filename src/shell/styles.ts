/**
 * The shell's stylesheet, generated from src/shell/tokens.ts so there is one
 * source for every value. No UI kit and no utility framework: plain CSS with
 * DREAM Space custom properties, scoped under .ds-shell.
 *
 * AAA rules this sheet keeps (tests/shell-a11y.test.ts reads it):
 * - every text surface is opaque Ink (or the Signal primary button), so the
 *   pairs in SHELL_COLOR_PAIRS are the only pairs that can be drawn;
 * - all type in rem, never under 16 px; no fixed heights on text, no
 *   overflow:hidden or ellipsis on text, so text can grow to 200 percent;
 * - a 3 px Signal focus ring on everything focusable, drawn on Ink;
 * - every hit area at least 44 px; reduced motion turns movement into fades.
 */
import {
  color,
  fill,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  motion,
  radius,
  rem,
  rgba,
  size,
} from './tokens.ts';

const v = {
  ink: 'var(--ds-ink)',
  porcelain: 'var(--ds-porcelain)',
  fog: 'var(--ds-fog)',
  slate: 'var(--ds-slate)',
  hull: 'var(--ds-hull)',
  signal: 'var(--ds-signal)',
  signalHover: 'var(--ds-signal-hover)',
};

const press = `${motion.press}ms ${motion.easeOut}`;
const reveal = `${motion.reveal}ms ${motion.easeOut}`;
const phone = `(max-width: ${size.phoneMaxWidth}px)`;
const hit = rem(size.hit);

export function buildShellCss(): string {
  return `
html:has(.ds-shell), body:has(.ds-shell) {
  margin: 0;
  padding: 0;
  background: ${color.ink};
  color: ${color.fog};
}
.ds-shell {
  --ds-ink: ${color.ink};
  --ds-porcelain: ${color.porcelain};
  --ds-fog: ${color.fog};
  --ds-slate: ${color.slate};
  --ds-hull: ${color.hull};
  --ds-signal: ${color.signal};
  --ds-signal-hover: ${color.signalHover};
  --ds-green: ${color.statusGreen};
  --ds-amber: ${color.statusAmber};
  --ds-red: ${color.statusRed};
  --ds-glass: ${rgba(fill.glass)};
  --ds-band: ${rgba(fill.band)};
  --ds-grid: ${rgba(fill.gridLine)};
  --ds-handle-h: 4rem;
  position: relative;
  box-sizing: border-box;
  height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: minmax(14rem, 16vw) minmax(0, 1fr) minmax(20rem, 28vw);
  grid-template-areas: "side main dock";
  background: ${v.ink};
  color: ${v.fog};
  font-family: ${font.text};
  font-size: ${rem(fontSize.body)};
  font-weight: ${fontWeight.text};
  line-height: ${lineHeight.text};
  overflow-wrap: anywhere;
}
.ds-shell *, .ds-shell *::before, .ds-shell *::after { box-sizing: border-box; }
.ds-shell :where(h1, h2, h3, h4, p, ul, ol, li, pre, figure, dl, dd, dt) { margin: 0; padding: 0; }
.ds-shell :where(ul, ol) { list-style: none; }
.ds-shell :where(button, input, select, textarea) { font: inherit; color: inherit; letter-spacing: inherit; }
.ds-shell :where(a) { color: ${v.porcelain}; text-decoration: underline; text-underline-offset: 0.2em; }
.ds-shell :where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: ${size.focusRing}px solid ${v.signal};
  outline-offset: ${size.focusOffset}px;
}
.ds-shell :where(a, button, input, select, textarea, [tabindex]):focus:not(:focus-visible) { outline: none; }
.ds-shell ::placeholder { color: ${v.slate}; opacity: 1; }
.ds-shell ::selection { background: ${v.signal}; color: ${v.ink}; }
.ds-icon { flex: 0 0 auto; width: 1.25em; height: 1.25em; }
.ds-visually-hidden {
  position: absolute !important; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
}

/* Skip links: first in the keyboard order, shown on focus. */
.ds-skip {
  position: absolute; z-index: 100; left: 0.75rem; top: 0.75rem;
  display: inline-flex; align-items: center; min-height: ${hit}; padding: 0.5rem 1rem;
  background: ${v.ink}; color: ${v.porcelain}; border: 2px solid ${v.slate}; border-radius: ${radius.button}px;
  font-weight: ${fontWeight.textStrong}; text-decoration: none;
  transform: translateY(-300%);
  transition: transform ${press};
}
.ds-skip:focus { transform: none; }
.ds-skip + .ds-skip { left: 12rem; }

/* ---------------------------------------------------------------- Sidebar */
.ds-sidebar {
  grid-area: side; display: flex; flex-direction: column; min-height: 0; min-width: 0;
  background: ${v.ink}; border-right: 1px solid ${v.hull};
}
.ds-sidebar-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 1.25rem 0.75rem; display: flex; flex-direction: column; gap: 1.5rem; }
.ds-brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; padding: 0 0.5rem; }
.ds-brand-title {
  font-family: ${font.display}; font-weight: ${fontWeight.display}; font-size: ${rem(fontSize.h3)};
  line-height: ${lineHeight.display}; letter-spacing: ${letterSpacing.displayLarge}; color: ${v.porcelain};
}
.ds-brand-sub { margin-top: 0.375rem; font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textStrong}; color: ${v.slate}; }
.ds-nav { display: flex; flex-direction: column; gap: 1.25rem; }
.ds-nav-group-title {
  padding: 0 0.75rem; margin-bottom: 0.375rem;
  font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textStrong}; letter-spacing: 0.06em; text-transform: uppercase;
  color: ${v.slate};
}
.ds-nav-list { display: flex; flex-direction: column; gap: 0.25rem; }
.ds-nav-item {
  display: flex; align-items: center; gap: 0.75rem; width: 100%; min-height: ${hit};
  padding: 0.5rem 0.75rem; border: 0; border-radius: ${radius.button}px;
  background: ${v.ink}; color: ${v.fog}; text-align: left; text-decoration: none; cursor: pointer;
  font-size: ${rem(fontSize.body)}; font-weight: ${fontWeight.textMedium}; line-height: 1.3;
  transition: color ${press}, box-shadow ${press};
}
.ds-nav-item:hover { color: ${v.porcelain}; box-shadow: inset 0 0 0 1px ${v.slate}; }
.ds-nav-item[aria-current="page"] { color: ${v.porcelain}; font-weight: ${fontWeight.textStrong}; box-shadow: inset ${size.edge}px 0 0 ${v.signal}; }
.ds-nav-item[aria-current="page"]:hover { box-shadow: inset ${size.edge}px 0 0 ${v.signal}, inset 0 0 0 1px ${v.slate}; }
.ds-nav-label { flex: 1 1 auto; min-width: 0; }
.ds-badge {
  flex: 0 0 auto; min-width: 1.75rem; padding: 0 0.5rem; text-align: center;
  border: 1px solid ${v.slate}; border-radius: ${radius.pill}px;
  font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textStrong}; color: ${v.fog};
}
.ds-badge-needs { border-color: ${v.signal}; color: ${v.signal}; }
.ds-sidebar-footer { flex: 0 0 auto; display: flex; flex-direction: column; gap: 0.25rem; padding: 1rem 1.25rem 1.25rem; border-top: 1px solid ${v.hull}; }
.ds-tribute-title { font-family: ${font.display}; font-weight: ${fontWeight.display}; font-size: ${rem(fontSize.body)}; line-height: 1.2; color: ${v.porcelain}; }
.ds-tribute-tag { font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textMedium}; color: ${v.fog}; }
.ds-shell .ds-drawer-close, .ds-shell .ds-menu-toggle, .ds-shell .ds-scrim { display: none; }

/* ------------------------------------------------------------------- Main */
.ds-main { grid-area: main; position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; background: ${v.ink}; }
.ds-main::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: linear-gradient(var(--ds-grid) 1px, transparent 1px), linear-gradient(90deg, var(--ds-grid) 1px, transparent 1px);
  background-size: 3rem 3rem;
  opacity: 0.55;
  animation: ds-breathe 9.6s ${motion.easeInOut} infinite;
}
.ds-main-header {
  position: relative; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.5rem;
  padding: 1.25rem 2rem; background: var(--ds-glass); backdrop-filter: blur(${size.blur}px);
  border-bottom: 1px solid ${v.hull};
}
.ds-main-titles { flex: 1 1 18rem; min-width: 0; }
.ds-main-title {
  font-family: ${font.display}; font-weight: ${fontWeight.display}; font-size: ${rem(fontSize.h1)};
  line-height: ${lineHeight.display}; letter-spacing: ${letterSpacing.displayLarge}; color: ${v.porcelain};
}
.ds-title-rule { display: block; width: 3.5rem; height: ${size.edge}px; margin-top: 0.75rem; background: ${v.signal}; border-radius: 2px; }
.ds-main-sub { margin-top: 0.625rem; color: ${v.fog}; }
.ds-main-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
.ds-main-scroll { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 2rem; }
.ds-main-scroll:focus-visible { outline-offset: -${size.focusRing}px; }

/* ---------------------------------------------------------------- Buttons */
.ds-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-height: ${hit}; min-width: ${hit}; padding: 0.5rem 1rem;
  border: 2px solid ${v.slate}; border-radius: ${radius.button}px; background: ${v.ink}; color: ${v.porcelain};
  font-weight: ${fontWeight.textStrong}; line-height: 1.2; text-decoration: none; cursor: pointer;
  transition: border-color ${press}, background-color ${press}, transform ${press};
}
.ds-btn:hover { border-color: ${v.fog}; }
.ds-btn:active { transform: translateY(1px); }
.ds-btn-primary { background: ${v.signal}; border-color: ${v.signal}; color: ${v.ink}; font-weight: ${fontWeight.display}; }
.ds-btn-primary:hover { background: ${v.signalHover}; border-color: ${v.signalHover}; }
.ds-btn-quiet { border-color: transparent; color: ${v.slate}; }
.ds-btn-quiet:hover { border-color: ${v.slate}; color: ${v.porcelain}; }

/* --------------------------------------------------------- Model switcher */
.ds-switcher { position: relative; }
.ds-switcher-trigger { justify-content: flex-start; gap: 0.75rem; padding: 0.375rem 0.75rem 0.375rem 1rem; text-align: left; }
.ds-switcher-text { display: flex; flex-direction: column; }
.ds-switcher-caption { font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textStrong}; color: ${v.slate}; line-height: 1.25; }
.ds-switcher-value { font-size: ${rem(fontSize.body)}; font-weight: ${fontWeight.textStrong}; color: ${v.porcelain}; line-height: 1.25; }
.ds-switcher-menu {
  position: absolute; right: 0; top: calc(100% + 0.5rem); z-index: 30;
  width: min(28rem, calc(100vw - 2rem)); max-height: min(70vh, 40rem); overflow-y: auto;
  padding: 0.5rem; background: ${v.ink}; border: 1px solid ${v.hull}; border-radius: ${radius.card}px;
  box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.6);
  animation: ds-rise ${reveal};
}
.ds-switcher-legend { padding: 0.5rem 0.75rem 0.375rem; font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textStrong}; color: ${v.slate}; letter-spacing: 0.06em; text-transform: uppercase; }
.ds-lane {
  display: flex; align-items: flex-start; gap: 0.75rem; width: 100%; min-height: ${hit};
  padding: 0.625rem 0.75rem; border: 0; border-radius: ${radius.button}px;
  background: ${v.ink}; color: ${v.fog}; text-align: left; cursor: pointer;
  transition: box-shadow ${press}, color ${press};
}
.ds-lane:hover { box-shadow: inset 0 0 0 1px ${v.slate}; color: ${v.porcelain}; }
.ds-lane[aria-checked="true"] { color: ${v.porcelain}; box-shadow: inset ${size.edge}px 0 0 ${v.signal}; }
.ds-lane[aria-checked="true"]:hover { box-shadow: inset ${size.edge}px 0 0 ${v.signal}, inset 0 0 0 1px ${v.slate}; }
.ds-lane-mark { position: relative; flex: 0 0 1.25rem; height: 1.25rem; margin-top: 0.25rem; border: 2px solid ${v.slate}; border-radius: ${radius.pill}px; }
.ds-lane[aria-checked="true"] .ds-lane-mark { border-color: ${v.porcelain}; }
.ds-lane[aria-checked="true"] .ds-lane-mark::after { content: ""; position: absolute; inset: 0.1875rem; border-radius: ${radius.pill}px; background: ${v.porcelain}; }
.ds-lane-text { display: flex; flex-direction: column; min-width: 0; }
.ds-lane-label { font-weight: ${fontWeight.textStrong}; color: ${v.porcelain}; line-height: 1.3; }
.ds-lane-detail { font-size: ${rem(fontSize.caption)}; color: ${v.fog}; }
.ds-status { font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textStrong}; }
.ds-status-ready { color: var(--ds-green); }
.ds-status-capped { color: var(--ds-amber); }
.ds-status-off { color: var(--ds-red); }

/* ------------------------------------------------------------------- Dock */
.ds-dock {
  grid-area: dock; display: flex; flex-direction: column; min-height: 0; min-width: 0;
  background: ${v.ink}; border-left: 1px solid ${v.hull};
}
.ds-sheet-handle { display: none; }
.ds-dock-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.ds-dock-head { padding: 1.25rem 1.25rem 0; }
.ds-dock-title { font-family: ${font.display}; font-weight: ${fontWeight.subhead}; font-size: ${rem(fontSize.h3)}; line-height: 1.2; color: ${v.porcelain}; }
.ds-tablist { display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.75rem 0.75rem 0; border-bottom: 1px solid ${v.hull}; }
.ds-tab {
  display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;
  min-height: ${hit}; min-width: ${hit}; padding: 0.5rem 0.625rem 0.625rem;
  border: 0; border-radius: ${radius.button}px ${radius.button}px 0 0; background: ${v.ink}; color: ${v.fog};
  font-weight: ${fontWeight.textMedium}; line-height: 1.2; cursor: pointer;
  box-shadow: inset 0 -${size.edge}px 0 transparent;
  transition: color ${press}, box-shadow ${press};
}
.ds-tab:hover { color: ${v.porcelain}; box-shadow: inset 0 -1px 0 ${v.slate}; }
.ds-tab[aria-selected="true"] { color: ${v.porcelain}; font-weight: ${fontWeight.textStrong}; box-shadow: inset 0 -${size.edge}px 0 ${v.signal}; }
.ds-tab:focus-visible { outline-offset: -${size.focusRing}px; }
.ds-tab-needs { font-size: ${rem(fontSize.caption)}; color: ${v.signal}; }
.ds-tabpanel { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 1.25rem; animation: ds-fade ${reveal}; }
.ds-tabpanel:focus-visible { outline-offset: -${size.focusRing}px; }

/* --------------------------------------------- Content parts for consumers */
.ds-stack { display: flex; flex-direction: column; gap: 1rem; }
.ds-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
.ds-card {
  position: relative; padding: 1.5rem; background: var(--ds-glass); border: 1px solid ${v.hull}; border-radius: ${radius.card}px;
  transition: transform ${press}, border-color ${press};
}
.ds-card:hover { transform: translateY(-2px); border-color: ${v.slate}; }
.ds-card-needs { box-shadow: inset ${size.edge}px 0 0 ${v.signal}; }
.ds-card-title { font-family: ${font.display}; font-weight: ${fontWeight.subhead}; font-size: ${rem(fontSize.h3)}; line-height: 1.2; color: ${v.porcelain}; margin-bottom: 0.5rem; }
.ds-h2 { font-family: ${font.display}; font-weight: ${fontWeight.display}; font-size: ${rem(fontSize.h2)}; line-height: ${lineHeight.display}; letter-spacing: ${letterSpacing.displayLarge}; color: ${v.porcelain}; }
.ds-lead { font-size: ${rem(fontSize.lead)}; color: ${v.fog}; max-width: 46rem; }
.ds-strong { color: ${v.porcelain}; font-weight: ${fontWeight.textStrong}; }
.ds-caption { font-size: ${rem(fontSize.caption)}; font-weight: ${fontWeight.textStrong}; color: ${v.slate}; }
.ds-needs-word { color: ${v.signal}; font-weight: ${fontWeight.textStrong}; }
.ds-pill {
  display: inline-flex; align-items: center; gap: 0.5rem; min-height: 2.25rem; padding: 0.25rem 0.875rem;
  border: 1px solid ${v.hull}; border-radius: ${radius.pill}px; font-size: ${rem(fontSize.caption)}; color: ${v.fog};
}
.ds-dot { flex: 0 0 auto; width: ${size.dot}px; height: ${size.dot}px; border-radius: ${radius.pill}px; background: ${v.slate}; }
.ds-dot-green { background: var(--ds-green); }
.ds-dot-amber { background: var(--ds-amber); }
.ds-dot-red { background: var(--ds-red); }
.ds-dot-signal { background: ${v.signal}; }
.ds-band { padding: 1rem 1.25rem; background: var(--ds-band); border-radius: ${radius.card}px; font-size: ${rem(fontSize.caption)}; color: ${v.porcelain}; text-align: center; }
.ds-code {
  margin: 0; padding: 1rem; background: ${v.ink}; border: 1px solid ${v.hull}; border-radius: ${radius.button}px;
  font-family: ${font.mono}; font-size: ${rem(fontSize.caption)}; line-height: 1.55; color: ${v.fog};
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.ds-code-strong { color: ${v.porcelain}; }
.ds-code-ok { color: var(--ds-green); }
.ds-list { display: flex; flex-direction: column; gap: 0.5rem; }
.ds-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; }
.ds-kbd { display: inline-block; padding: 0 0.375rem; border: 1px solid ${v.slate}; border-radius: 6px; font-family: ${font.mono}; font-size: ${rem(fontSize.caption)}; color: ${v.porcelain}; }
.ds-field { display: flex; flex-direction: column; gap: 0.375rem; }
.ds-input {
  min-height: ${hit}; padding: 0.5rem 0.75rem; background: ${v.ink}; color: ${v.porcelain};
  border: 2px solid ${v.slate}; border-radius: ${radius.button}px; width: 100%;
}
.ds-input:hover { border-color: ${v.fog}; }
.ds-swatch-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.75rem; }
.ds-swatch {
  display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem;
  background: ${v.ink}; border: 1px solid ${v.hull}; border-radius: ${radius.button}px;
}
.ds-swatch-chip { height: 2.25rem; border-radius: 6px; border: 1px solid ${v.hull}; }
.ds-spec-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border: 1px solid ${v.hull}; border-radius: 8px; background: ${v.ink}; }

/* -------------------------------------------------------- Phone layout */
@media ${phone} {
  .ds-shell { grid-template-columns: minmax(0, 1fr); grid-template-areas: "main"; }
  .ds-sidebar {
    position: fixed; z-index: 50; top: 0; bottom: 0; left: 0; width: min(22rem, 88vw);
    box-shadow: 1rem 0 2.5rem rgba(0, 0, 0, 0.6);
    transform: translateX(-100%); visibility: hidden;
    transition: transform ${reveal}, visibility 0s linear ${motion.reveal}ms;
  }
  .ds-shell[data-menu="open"] .ds-sidebar { transform: none; visibility: visible; transition: transform ${reveal}; }
  .ds-shell[data-menu="open"] .ds-scrim {
    display: block; position: fixed; inset: 0; z-index: 45; border: 0; padding: 0;
    background: var(--ds-glass); cursor: pointer;
  }
  .ds-shell .ds-drawer-close, .ds-shell .ds-menu-toggle { display: inline-flex; }
  .ds-cards { grid-template-columns: minmax(0, 1fr); }
  .ds-swatch-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ds-main-header { padding: 0.75rem 1rem; gap: 0.5rem; }
  .ds-main-title { font-size: ${rem(fontSize.h2)}; }
  .ds-title-rule { margin-top: 0.375rem; }
  .ds-main-sub { margin-top: 0.375rem; }
  .ds-main-tools { flex: 1 1 100%; }
  .ds-switcher-menu { left: 0; right: auto; }
  .ds-main-scroll { padding: 1rem 1rem calc(var(--ds-handle-h) + 1.5rem); }
  .ds-band { padding: 0.625rem 0.875rem; }
  .ds-row { gap: 0.375rem 0.5rem; }
  .ds-pill { min-height: 2rem; padding: 0.125rem 0.625rem; }
  .ds-card { padding: 1rem 1.125rem; }
  .ds-dock {
    position: fixed; z-index: 40; left: 0; right: 0; bottom: 0; max-height: 82dvh;
    border-left: 0; border-top: 2px solid ${v.slate}; border-radius: ${radius.card}px ${radius.card}px 0 0;
    box-shadow: 0 -1rem 2.5rem rgba(0, 0, 0, 0.6);
  }
  .ds-dock[data-sheet="open"] { height: 78dvh; }
  .ds-dock[data-sheet="closed"] .ds-dock-body { display: none; }
  .ds-dock[data-sheet="open"] .ds-dock-body { animation: ds-rise ${reveal}; }
  .ds-dock-head { display: none; }
  .ds-sheet-handle {
    display: flex; align-items: center; gap: 0.75rem; width: 100%; min-height: var(--ds-handle-h);
    padding: 0.75rem 1rem; border: 0; border-radius: ${radius.card}px ${radius.card}px 0 0;
    background: ${v.ink}; color: ${v.porcelain}; text-align: left; cursor: pointer;
  }
  .ds-sheet-handle:focus-visible { outline-offset: -${size.focusRing}px; }
  .ds-sheet-grip { flex: 0 0 auto; width: 2.5rem; height: 4px; border-radius: 2px; background: ${v.slate}; }
  .ds-sheet-label { flex: 1 1 auto; font-weight: ${fontWeight.textStrong}; }
  .ds-sheet-state { font-size: ${rem(fontSize.caption)}; color: ${v.fog}; display: inline-flex; align-items: center; gap: 0.25rem; }
}

/* ---------------------------------------------------------------- Motion */
@keyframes ds-breathe { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.75; } }
@keyframes ds-rise { from { opacity: 0; transform: translateY(0.75rem); } to { opacity: 1; transform: none; } }
@keyframes ds-fade { from { opacity: 0; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .ds-shell *, .ds-shell *::before, .ds-shell *::after {
    transition-property: opacity, color, background-color, border-color, box-shadow, visibility !important;
    animation-name: ds-fade !important;
    animation-iteration-count: 1 !important;
  }
  .ds-main::before { animation: none !important; opacity: 0.55; }
  .ds-card:hover, .ds-btn:active { transform: none; }
}
@media ${phone} and (prefers-reduced-motion: reduce) {
  .ds-sidebar { transform: none !important; opacity: 0; transition: opacity ${reveal}, visibility 0s linear ${motion.reveal}ms !important; }
  .ds-shell[data-menu="open"] .ds-sidebar { opacity: 1; transition: opacity ${reveal} !important; }
}
`;
}

export const SHELL_CSS = buildShellCss();
