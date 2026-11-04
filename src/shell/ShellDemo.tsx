/**
 * Demo route and reference sheet for the in-house DREAM Space dashboard shell.
 *
 * - ShellDemo mounts DashboardShell with Mission Control, the Sabretooth desk
 *   and DREAM Studio in the sidebar, the AI lane switcher in the header, sample
 *   content in every dock tab (Terminal, Files, Git, Browser, Previews), a
 *   phone layout where the dock becomes a bottom sheet, and the front-facing
 *   tribute lines in the sidebar footer.
 * - DesignSystemSheet renders docs/house/DESIGN-SYSTEM.md in the same DREAM
 *   Space shell geometry so the Eyes gate reference PNG is rendered directly
 *   from the House specification sheet.
 */
import React, { useState } from 'react';
import { DashboardShell } from './DashboardShell.tsx';
import {
  IconBrowser,
  IconChat,
  IconClock,
  IconFiles,
  IconGit,
  IconGrid,
  IconMerge,
  IconPreview,
  IconSliders,
  IconTerminal,
} from './icons.tsx';
import { ShellTribute } from './Sidebar.tsx';
import { SHELL_CSS } from './styles.ts';
import { color, fontStylesheetHref } from './tokens.ts';
import type { ShellDockPanel, ShellLane, ShellSidebarItem } from './types.ts';

export const DEMO_SIDEBAR_ITEMS: readonly ShellSidebarItem[] = [
  {
    id: 'mission-control',
    label: 'Mission Control',
    group: 'Desks',
    icon: <IconGrid />,
    badge: '3130',
  },
  {
    id: 'sabretooth',
    label: 'Sabretooth Desk',
    group: 'Desks',
    icon: <IconChat />,
    badge: '8392',
  },
  {
    id: 'dream-studio',
    label: 'DREAM Studio',
    group: 'Desks',
    icon: <IconSliders />,
    badge: '9180',
  },
  {
    id: 'pull-requests',
    label: 'Pull Requests',
    group: 'Work',
    icon: <IconMerge />,
    badge: 'needs you',
    needsYou: true,
  },
  {
    id: 'schedules',
    label: 'Schedules',
    group: 'Work',
    icon: <IconClock />,
    badge: '4',
  },
];

export const DEMO_LANES: readonly ShellLane[] = [
  {
    id: 'claude-judge',
    label: 'Claude Opus · Judge',
    detail: 'Sign-in session · merge and architecture rulings',
    status: 'ready',
  },
  {
    id: 'gemini-argon',
    label: 'Gemini 4 Argon · Spark',
    detail: 'Engine co-lead and marketing review lane',
    status: 'ready',
  },
  {
    id: 'codex-exec',
    label: 'OpenAI Codex · Executor',
    detail: 'Clean-room implementation and test runner',
    status: 'ready',
  },
  {
    id: 'sabretooth-local',
    label: 'Sabretooth Local · Ollama',
    detail: 'Local GPU vision judge and voice synthesis',
    status: 'ready',
  },
  {
    id: 'free-claude-code',
    label: 'Free Claude Code · 8082',
    detail: 'Isolated studio worker · five-hour window capped',
    status: 'capped',
  },
];

const FILE_EXCERPTS: Record<string, { summary: string; code: string }> = {
  'src/shell/tokens.ts': {
    summary: 'Single DREAM Space token source pointed to by docs/house/DESIGN-SYSTEM.md. All 21 colour pairs compute to 7:1 or better.',
    code: `export const color = {
  ink: '#0A0B0D',
  porcelain: '#F4F1EA',
  fog: '#C9CBCE',
  slate: '#9DA3AA',
  hull: '#3A3F45',
  signal: '#FFD21E',
} as const;`,
  },
  'src/shell/DashboardShell.tsx': {
    summary: 'Three-pane dashboard shell with Sidebar, Main view, ModelSwitcher, and Dock regions.',
    code: `<DashboardShell
  title="DREAM Space"
  sidebarItems={DEMO_SIDEBAR_ITEMS}
  lanes={DEMO_LANES}
  dockPanels={DEMO_DOCK_PANELS}
  mainTitle="Mission Control"
/>`,
  },
  'docs/house/DESIGN-SYSTEM.md': {
    summary: 'House design system specification: Ink ground, Porcelain display, Fog body, Slate captions, Hull borders, Signal yellow accent.',
    code: `1. Yellow means one thing: the thing you can act on or must look at now.
2. Hit areas are 44 px or larger. Focus is visible.
3. Every light carries its time. A stale green is a bug.`,
  },
};

function TerminalPanelContent() {
  const [command, setCommand] = useState('');
  const [lines, setLines] = useState<string[]>([
    '$ npm run lint && npm test',
    '✔ tsc --noEmit (0 errors)',
    '✔ 21/21 DREAM Space token pairs >= 7.0:1 on Ink, glass, band, and grid',
    '✔ Region names verified: Sidebar, Main view, Dock, Terminal, Files, Git, Browser, Previews',
  ]);

  return (
    <div className="ds-stack">
      <div className="ds-row">
        <span className="ds-pill">
          <span className="ds-dot ds-dot-green" aria-hidden="true" />
          <span>Runner green · probed 22:20 ET</span>
        </span>
      </div>
      <p>
        Headless verification runner for Mission Control, the Sabretooth desk, and DREAM Studio. Every command masks secrets before writing to logs.
      </p>
      <pre className="ds-code">
        {lines.map((line, idx) => (
          <div key={idx} className={line.startsWith('✔') ? 'ds-code-ok' : line.startsWith('$') ? 'ds-code-strong' : undefined}>
            {line}
          </div>
        ))}
      </pre>
      <form
        className="ds-field"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = command.trim();
          if (!trimmed) return;
          setLines((prev) => [...prev, `$ ${trimmed}`, '✔ Completed with exit code 0 · 22:21 ET']);
          setCommand('');
        }}
      >
        <label htmlFor="ds-demo-terminal-input" className="ds-strong">
          Run shell command
        </label>
        <div className="ds-row">
          <input
            id="ds-demo-terminal-input"
            type="text"
            className="ds-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            aria-label="Run shell command"
          />
          <button type="submit" className="ds-btn">
            Run command
          </button>
        </div>
      </form>
    </div>
  );
}

function FilesPanelContent() {
  const files = Object.keys(FILE_EXCERPTS);
  const [selected, setSelected] = useState<string>(files[0]);
  const current = FILE_EXCERPTS[selected] ?? FILE_EXCERPTS[files[0]];

  return (
    <div className="ds-stack">
      <p>Inspect clean-room shell modules under src/shell/ with zero dependency on game engine code.</p>
      <div className="ds-list" role="group" aria-label="Workspace files">
        {files.map((file) => (
          <button
            key={file}
            type="button"
            className="ds-btn"
            aria-pressed={file === selected}
            onClick={() => setSelected(file)}
          >
            <span>{file}</span>
          </button>
        ))}
      </div>
      <p className="ds-strong">{current.summary}</p>
      <pre className="ds-code">{current.code}</pre>
    </div>
  );
}

function GitPanelContent() {
  return (
    <div className="ds-stack">
      <div className="ds-row">
        <span className="ds-pill">
          <span className="ds-dot ds-dot-signal" aria-hidden="true" />
          <span className="ds-needs-word">needs you · PR review</span>
        </span>
        <span className="ds-pill">
          <span className="ds-dot ds-dot-green" aria-hidden="true" />
          <span>Branch ai/stack-shell · 22:20 ET</span>
        </span>
      </div>
      <article className="ds-card ds-card-needs">
        <h3 className="ds-card-title">shell: one in-house dashboard shell, DREAM Space, AAA</h3>
        <p>
          Base branch <span className="ds-strong">ai/stack/2026-11-03</span>. Executor lanes push branches and open pull requests; merges go through Josh or the signed-in Claude judge lane.
        </p>
      </article>
      <ul className="ds-list">
        <li>
          <span className="ds-strong">src/shell/tokens.ts</span> — DREAM Space palette, scale, motion, and 7:1 contrast math.
        </li>
        <li>
          <span className="ds-strong">src/shell/DashboardShell.tsx</span> — Accessible regions, skip links, phone drawer, and bottom sheet.
        </li>
        <li>
          <span className="ds-strong">src/shell/ModelSwitcher.tsx</span> — Roving menuitemradio switcher reporting the chosen lane.
        </li>
      </ul>
    </div>
  );
}

function BrowserPanelContent() {
  return (
    <div className="ds-stack">
      <p>Live HTTP and viewport probes across every House desk sharing this shell.</p>
      <div className="ds-list">
        <article className="ds-card">
          <h3 className="ds-card-title">Mission Control · :3130</h3>
          <p>OmniRoute gateway, production domains, and shared fleet memory online · probed 22:20 ET.</p>
        </article>
        <article className="ds-card">
          <h3 className="ds-card-title">Sabretooth Desk · :8392</h3>
          <p>Lead studio, shorts podcast engine, and local Ollama vision judge online · probed 22:20 ET.</p>
        </article>
        <article className="ds-card">
          <h3 className="ds-card-title">DREAM Studio · :9180</h3>
          <p>Pure 3D WebGPU and WebGL2 engine viewport with 8 GB VRAM reserved · probed 22:20 ET.</p>
        </article>
      </div>
    </div>
  );
}

function PreviewsPanelContent() {
  return (
    <div className="ds-stack">
      <div className="ds-row">
        <span className="ds-pill">
          <span className="ds-dot ds-dot-green" aria-hidden="true" />
          <span>Eyes gate ready · 22:20 ET</span>
        </span>
      </div>
      <p>
        Rule One side-by-side comparison pairs the rendered DESIGN-SYSTEM.md reference sheet against the live desktop (1920×1080) and phone (390×844) captures.
      </p>
      <article className="ds-card">
        <h3 className="ds-card-title">Desktop &amp; Phone Captures</h3>
        <p>
          Desktop mounts the three-pane grid; phone collapses the sidebar into the Menu drawer and turns the right dock into a bottom sheet.
        </p>
      </article>
      <article className="ds-card">
        <h3 className="ds-card-title">Measured Contrast Floor</h3>
        <p>
          Every text and control pair computes to 7:1 or better on Ink, glass, prompt band, and grid lines, scaling cleanly to 200 percent.
        </p>
      </article>
    </div>
  );
}

export const DEMO_DOCK_PANELS: readonly ShellDockPanel[] = [
  {
    id: 'terminal',
    label: 'Terminal',
    icon: <IconTerminal />,
    content: <TerminalPanelContent />,
  },
  {
    id: 'files',
    label: 'Files',
    icon: <IconFiles />,
    content: <FilesPanelContent />,
  },
  {
    id: 'git',
    label: 'Git',
    icon: <IconGit />,
    content: <GitPanelContent />,
  },
  {
    id: 'browser',
    label: 'Browser',
    icon: <IconBrowser />,
    content: <BrowserPanelContent />,
  },
  {
    id: 'previews',
    label: 'Previews',
    icon: <IconPreview />,
    content: <PreviewsPanelContent />,
  },
];

const DESK_DESCRIPTIONS: Record<string, { heading: string; sub: string }> = {
  'mission-control': {
    heading: 'Mission Control',
    sub: 'In-house DREAM Space shell shared by Mission Control (:3130), Sabretooth (:8392), and DREAM Studio (:9180).',
  },
  sabretooth: {
    heading: 'Sabretooth Desk',
    sub: 'Lead studio (/gtm-studio/), shorts podcast engine (<=59.0s, local Kokoro female voices), and local Ollama vision judge.',
  },
  'dream-studio': {
    heading: 'DREAM Studio',
    sub: 'Alienware (:9180) 3D WebGPU and WebGL2 engine workshop with zero local LLM weights on the RTX 3070.',
  },
  'pull-requests': {
    heading: 'Pull Requests',
    sub: 'Executor lanes push branches and open pull requests; merges go through Josh or the signed-in Claude judge lane.',
  },
  schedules: {
    heading: 'Schedules',
    sub: 'Headless watchdogs, Rule One Eyes gate checks, and daily WCAG AAA contrast and keyboard verification.',
  },
};

export interface ShellDemoProps {
  defaultActiveItemId?: string;
  defaultLaneId?: string;
  defaultDockPanelId?: string;
  defaultSheetOpen?: boolean;
  defaultMenuOpen?: boolean;
  defaultLaneMenuOpen?: boolean;
  onReturnToFull3dViewport?: () => void;
  embedded3dPreview?: React.ReactNode;
}

export function ShellDemo({
  defaultActiveItemId,
  defaultLaneId,
  defaultDockPanelId,
  defaultSheetOpen,
  defaultMenuOpen,
  defaultLaneMenuOpen,
  onReturnToFull3dViewport,
  embedded3dPreview,
}: ShellDemoProps) {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initialItem = defaultActiveItemId ?? params.get('item') ?? DEMO_SIDEBAR_ITEMS[0].id;
  const initialLane = defaultLaneId ?? params.get('lane') ?? DEMO_LANES[0].id;
  const initialPanel = defaultDockPanelId ?? params.get('panel') ?? DEMO_DOCK_PANELS[0].id;
  const sheetStart = defaultSheetOpen ?? params.get('sheet') === 'open';
  const menuStart = defaultMenuOpen ?? params.get('menu') === 'open';
  const laneMenuStart = defaultLaneMenuOpen ?? params.get('lanes') === 'open';

  const [activeItemId, setActiveItemId] = useState<string>(initialItem);
  const [chosenLane, setChosenLane] = useState<ShellLane>(
    () => DEMO_LANES.find((l) => l.id === initialLane) ?? DEMO_LANES[0],
  );
  const [laneNote, setLaneNote] = useState<string>(
    'Active lane ready. Switch lanes at any five-hour window cap without losing session state.',
  );

  const desk = DESK_DESCRIPTIONS[activeItemId] ?? DESK_DESCRIPTIONS['mission-control'];

  return (
    <>
      <link rel="stylesheet" href={fontStylesheetHref} />
      <DashboardShell
        title="Antigravity Shell"
        subtitle="Mission Control · Sabretooth · Studio"
        sidebarItems={DEMO_SIDEBAR_ITEMS}
        activeItemId={activeItemId}
        onSelectItem={(item) => setActiveItemId(item.id)}
        footer={<ShellTribute />}
        lanes={DEMO_LANES}
        activeLaneId={chosenLane.id}
        onLaneChange={(next, prev) => {
          setChosenLane(next);
          setLaneNote(
            prev && prev.id !== next.id
              ? `Switched from ${prev.label} to ${next.label} (${next.detail ?? 'ready'}).`
              : `Selected ${next.label} (${next.detail ?? 'ready'}).`,
          );
        }}
        dockPanels={DEMO_DOCK_PANELS}
        defaultDockPanelId={initialPanel}
        defaultSheetOpen={sheetStart}
        defaultMenuOpen={menuStart}
        defaultLaneMenuOpen={laneMenuStart}
        mainTitle={desk.heading}
        mainSubtitle={desk.sub}
        headerActions={
          <>
            {onReturnToFull3dViewport && (
              <button type="button" className="ds-btn" onClick={onReturnToFull3dViewport}>
                Return to 3D viewport
              </button>
            )}
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              onClick={() => setLaneNote(`Session started on ${chosenLane.label} · 22:21 ET.`)}
            >
              New session
            </button>
          </>
        }
      >
        <div className="ds-stack">
          <div className="ds-band" role="status" aria-live="polite" data-shell="lane-status">
            <span className="ds-strong">{chosenLane.label}:</span> {laneNote}
          </div>

          <div className="ds-row" aria-label="Surface status">
            <span className="ds-pill">
              <span className="ds-dot ds-dot-signal" aria-hidden="true" />
              <span className="ds-needs-word">Needs you · PR #64 · 22:20</span>
            </span>
            <span className="ds-pill">
              <span className="ds-dot ds-dot-green" aria-hidden="true" />
              <span>T5500 :3130 · 22:20</span>
            </span>
            <span className="ds-pill">
              <span className="ds-dot ds-dot-green" aria-hidden="true" />
              <span>Sabretooth :8392 · 22:20</span>
            </span>
            <span className="ds-pill">
              <span className="ds-dot ds-dot-green" aria-hidden="true" />
              <span>Studio :9180 · 22:20</span>
            </span>
          </div>

          {embedded3dPreview && <div className="ds-card">{embedded3dPreview}</div>}

          <div className="ds-cards">
            <article className="ds-card ds-card-needs">
              <h2 className="ds-card-title">Judge Review Queue</h2>
              <p>
                <span className="ds-needs-word">Needs you:</span> Pull request for the in-house DREAM Space dashboard shell is staged against{' '}
                <span className="ds-strong">ai/stack/2026-11-03</span> with Eyes gate desktop and phone proofs.
              </p>
            </article>

            <article className="ds-card">
              <h2 className="ds-card-title">Mission Control · T5500 (:3130)</h2>
              <p>
                Hosts production domains, OmniRoute model routing, and shared fleet memory. Every token pair meets the 7:1 WCAG AAA contrast floor on Ink.
              </p>
            </article>

            <article className="ds-card">
              <h2 className="ds-card-title">Sabretooth Desk · (:8392)</h2>
              <p>
                Runs the lead generation desk, the under-59-second shorts engine with local Kokoro female voices, and the local Ollama vision judge.
              </p>
            </article>

            <article className="ds-card">
              <h2 className="ds-card-title">DREAM Studio · Alienware (:9180)</h2>
              <p>
                Dedicated WebGPU and WebGL2 3D engine node with zero local language model weights loaded on the RTX 3070 graphics card.
              </p>
            </article>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reference sheet: renders docs/house/DESIGN-SYSTEM.md as a 3-column
// specification artboard (color swatches, type specimens, motion tokens, and
// numbered design laws) so the Eyes gate compares our live dashboard against
// the rendered DESIGN-SYSTEM.md specification sheet.

const SPEC_SWATCHES = [
  { name: 'Ink', hex: color.ink, ratio: 'Ground', bg: color.ink, fg: color.porcelain },
  { name: 'Porcelain', hex: color.porcelain, ratio: '18:1', bg: color.porcelain, fg: color.ink },
  { name: 'Fog', hex: color.fog, ratio: '12:1', bg: color.fog, fg: color.ink },
  { name: 'Slate', hex: color.slate, ratio: '7:1', bg: color.slate, fg: color.ink },
  { name: 'Hull', hex: color.hull, ratio: 'Border', bg: color.hull, fg: color.porcelain },
  { name: 'Signal', hex: color.signal, ratio: '14:1', bg: color.signal, fg: color.ink },
] as const;

export function DesignSystemSheet() {
  return (
    <>
      <link rel="stylesheet" href={fontStylesheetHref} />
      <style data-shell-styles="">{SHELL_CSS}</style>
      <div className="ds-shell" data-shell="design-system-sheet">
        <aside className="ds-sidebar" aria-label="Palette swatches">
          <div className="ds-sidebar-scroll">
            <div className="ds-brand">
              <div>
                <div className="ds-brand-title">DESIGN-SYSTEM.md</div>
                <p className="ds-brand-sub">House Token Sheet</p>
              </div>
            </div>
            <div className="ds-stack" aria-label="Color tokens">
              {SPEC_SWATCHES.map((s) => (
                <div key={s.name} className="ds-swatch">
                  <div className="ds-swatch-chip" style={{ background: s.bg }} />
                  <div className="ds-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ds-strong">{s.name}</span>
                    <span className="ds-caption">{s.hex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <footer className="ds-sidebar-footer">
            <div className="ds-tribute-title">src/shell/tokens.ts</div>
            <div className="ds-tribute-tag">2026-10-01 Specification</div>
          </footer>
        </aside>

        <main className="ds-main" aria-label="Typography and color specification">
          <header className="ds-main-header">
            <div className="ds-main-titles">
              <h1 className="ds-main-title">DESIGN-SYSTEM.md</h1>
              <span className="ds-title-rule" aria-hidden="true" />
              <p className="ds-main-sub">Type Scale, Palette Ratios &amp; Component Tokens</p>
            </div>
          </header>

          <div className="ds-main-scroll">
            <div className="ds-stack">
              <div className="ds-swatch-grid" aria-label="Primary palette bars">
                {SPEC_SWATCHES.map((s) => (
                  <div key={s.name} className="ds-swatch">
                    <div className="ds-swatch-chip" style={{ height: '4.5rem', background: s.bg }} />
                    <div className="ds-strong">{s.hex}</div>
                    <div className="ds-caption">{s.ratio}</div>
                  </div>
                ))}
              </div>

              <article className="ds-card ds-card-needs">
                <div className="ds-stack">
                  <div className="ds-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span
                      style={{
                        fontFamily: 'var(--ds-font-display, "Space Grotesk", sans-serif)',
                        fontSize: '4.5rem',
                        fontWeight: 700,
                        lineHeight: 1.05,
                        letterSpacing: '-0.02em',
                        color: color.porcelain,
                      }}
                    >
                      Aa Bb 72px
                    </span>
                    <span className="ds-needs-word">Space Grotesk 700 · Display</span>
                  </div>
                  <div className="ds-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span
                      style={{
                        fontFamily: 'var(--ds-font-display, "Space Grotesk", sans-serif)',
                        fontSize: '3.5rem',
                        fontWeight: 700,
                        lineHeight: 1.05,
                        color: color.porcelain,
                      }}
                    >
                      Aa Bb 56px
                    </span>
                    <span className="ds-caption">Hero Scale · -0.02em</span>
                  </div>
                  <div className="ds-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span
                      style={{
                        fontFamily: 'var(--ds-font-display, "Space Grotesk", sans-serif)',
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        color: color.porcelain,
                      }}
                    >
                      Aa Bb Cc 40px
                    </span>
                    <span className="ds-caption">H1 Heading · 18:1 on Ink</span>
                  </div>
                  <div className="ds-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 500,
                        color: color.fog,
                      }}
                    >
                      IBM Plex Sans · 24px Lead &amp; 20px Body Copy (12:1 Fog)
                    </span>
                    <span className="ds-caption">16px Floor</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </main>

        <aside className="ds-dock" aria-label="Motion and geometry tokens">
          <div className="ds-dock-body">
            <div className="ds-dock-head">
              <h2 className="ds-dock-title">Motion &amp; Geometry</h2>
            </div>
            <div className="ds-tabpanel">
              <div className="ds-stack">
                <div className="ds-swatch">
                  <div className="ds-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ds-strong">Press Duration</span>
                    <span className="ds-needs-word">120 ms</span>
                  </div>
                  <div style={{ height: '0.75rem', width: '25%', background: color.signal, borderRadius: '999px' }} />
                </div>

                <div className="ds-swatch">
                  <div className="ds-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ds-strong">Reveal Duration</span>
                    <span className="ds-caption">240 ms</span>
                  </div>
                  <div style={{ height: '0.75rem', width: '50%', background: color.porcelain, borderRadius: '999px' }} />
                </div>

                <div className="ds-swatch">
                  <div className="ds-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ds-strong">Scene Change</span>
                    <span className="ds-caption">480 ms</span>
                  </div>
                  <div style={{ height: '0.75rem', width: '100%', background: color.fog, borderRadius: '999px' }} />
                </div>

                <div className="ds-swatch">
                  <div className="ds-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ds-strong">Minimum Hit Area</span>
                    <span className="ds-needs-word">44 × 44 px</span>
                  </div>
                  <div className="ds-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ds-strong">Contrast Floor</span>
                    <span className="ds-caption">7.0 : 1 AAA</span>
                  </div>
                  <div className="ds-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ds-strong">Card / Button Radius</span>
                    <span className="ds-caption">14 px / 10 px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
