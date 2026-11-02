import React, { useState } from 'react';
import {
  FIVE_HOUR_CAP_MODELS,
  GOOGLE_FLOW_VISION_ZONES,
  swapModelOnFiveHourCap,
  redactWorkspaceSecrets,
  type WorkspaceModelOption,
} from '../engine/combat/mold-breaker-classes-forge-pvp.ts';

export type WorkspaceCenterView =
  | 'repos-models'
  | 'my-work'
  | 'automations'
  | 'game-dev-3d'
  | 'sabretooth-8392'
  | 't5500-3130';

export type RightInspectorTool = 'Review' | 'Open File' | 'Terminal' | 'Browser';

interface UnifiedAntigravityWorkspaceShellProps {
  initialView?: WorkspaceCenterView;
  initialModelPickerOpen?: boolean;
  onReturnToFull3dViewport?: () => void;
  embedded3dPreview?: React.ReactNode;
}

export function UnifiedAntigravityWorkspaceShell({
  initialView = 'repos-models',
  initialModelPickerOpen = true,
  onReturnToFull3dViewport,
  embedded3dPreview,
}: UnifiedAntigravityWorkspaceShellProps) {
  const [centerView, setCenterView] = useState<WorkspaceCenterView>(initialView);
  const [activeModel, setActiveModel] = useState<WorkspaceModelOption>(FIVE_HOUR_CAP_MODELS[1]); // Claude Sonnet 5.5 default
  const [effortLevel, setEffortLevel] = useState<'Ultrathink' | 'High' | 'Medium'>('Ultrathink');
  const [fusionEnabled, setFusionEnabled] = useState<boolean>(true);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState<boolean>(initialModelPickerOpen);
  const [isAddTabMenuOpen, setIsAddTabMenuOpen] = useState<boolean>(false);
  const [activeRightTool, setActiveRightTool] = useState<RightInspectorTool>('Review');
  const [selectedOpenFile, setSelectedOpenFile] = useState<string>('docs/standards/AGENT-STANDARD.md');
  const [promptInput, setPromptInput] = useState<string>('');
  const [modelAuditFeed, setModelAuditFeed] = useState<string[]>([
    'Model changed to Claude Sonnet 5.5 · GitHub Copilot',
    'Cloned Trollz1004/dream-online & Trollz1004/ANTIGRAVITY',
    'Model changed from Claude Sonnet 5.5 to Gemini 4 Argon High · Google AI Ultra (Ultrathink · 1M)',
  ]);

  const handleSelectModel = (modelId: string) => {
    const res = swapModelOnFiveHourCap(activeModel.id, modelId);
    setActiveModel(res.activeModel);
    setEffortLevel(res.activeModel.effort);
    setModelAuditFeed((prev) => [...prev, res.auditLogLine]);
  };

  const sampleFileContents: Record<string, string> = {
    'docs/standards/AGENT-STANDARD.md': `# ANTIGRAVITY Agent Standard (2026-11-01)
- Sole Human Authority: Founder Joshua Coleman (CLAUDE's N Joshua's · #TeamClaudeForLife)
- Co-Equal Lead GMs (GM #1): Claude (Opus 5.5 / Fable) & Google Gemini (Gemini 4 Argon / Ultra)
- Always Ultrathink: Maximum reasoning depth across every model.
- Clean-Room Method: REA (reverse-engineer-anything) + Remake 100% Yours Validation Gate (>= 98% parity).
- Rule One Screenshot Comparison: Compare reference/before screenshot against new feature screenshot (200 OK is not OK).
- Unified 3-Pane Shell: Identical Left Sidebar, Center Canvas + 5-Hour Cap Model Switcher, and Right Dock (Review / Open File / Terminal / Browser / Artifacts / Subagents) across Alienware :20128, Sabretooth :8392, and T5500 :3130.
- Secrets Redacted: GEMINI_API_KEY=[REDACTED:XXXX] · GITHUB_TOKEN=[REDACTED:XXXX]`,
    'docs/standards/ALIENWARE-SOUL.md': `# OPSis · Alienware (.40) · 100% In-House DREAM Engine Workshop
- Hardware: Alienware Aurora R12 · RTX 3070 8GB CUDA · 40GB RAM · %USERPROFILE%\\antigravity\\DREAM-Engine
- Hard Separation Rule: DREAM Online (all-ages open-world MMORPG) and adults-only work stay in strictly separated folders, repos, and sessions.
- Headless Watchdogs Only: wscript.exe //B //Nologo ops/node/boot-alienware-services.vbs (Hidden=True, zero window flash).`,
    'docs/standards/SABRETOOTH-SOUL.md': `# OPSis · Sabretooth (.8) · YouTube Studio (<=59.0s) & Lead Generation Desk
- Rule Zero: Never scrape YouTube or any Google property by any tool. Official YouTube Data API v3 only, uploads always private.
- Voices: 100% Natural Neural Female Voices (Gemini Aoede/Kore, Kokoro af_heart/af_bella). Zero robotic SAPI TTS.`,
    '.agents/skills/agent-workflow/SKILL.md': `name: agent-workflow (v2.1.0)
Mandatory Skills: caveman, i-have-adhd, find-skills, create-skills, brainstorming, superpowers, tdd, verification-before-completion, obsidian-save, openviking, supabase, remake (100% Yours Validation Gate), reverse-engineer-anything (REA Clean-Room).`,
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: '248px 1fr 336px',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* =================================================================== */}
      {/* LEFT SIDEBAR — IDENTICAL ACROSS ALL NODES (.40, .8, .15) & GITHUB   */}
      {/* =================================================================== */}
      <aside
        style={{
          background: '#090d13',
          borderRight: '1px solid #21262d',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '12px 10px',
        }}
      >
        <div>
          {/* Top Window Bar Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px 12px',
              borderBottom: '1px solid #161b22',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #2f81f7, #1f6feb)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '12px',
                  color: '#fff',
                }}
              >
                A
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.03em', color: '#f0f6fc' }}>
                ANTIGRAVITY · UNIFIED OS
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#8b949e' }}>⌕ ‹ ›</span>
          </div>

          {/* Primary Navigation Items (Matches GitHub Desktop / Copilot / Antigravity Screenshots 1-5) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[
              { id: 'repos-models', icon: '＋', label: 'New Conversation / Session' },
              { id: 'my-work', icon: '⑂', label: 'Pull requests (PR #56, #57)' },
              { id: 'my-work', icon: '⊙', label: 'Issues & Reviews' },
              { id: 'my-work', icon: '⊞', label: 'Dashboards (My Work)' },
              { id: 'automations', icon: '◷', label: 'Automations (Cadence)' },
              { id: 'repos-models', icon: '⚙', label: 'Customizations & Skills (15)' },
            ].map((item, idx) => {
              const active = centerView === item.id && idx !== 1 && idx !== 2;
              return (
                <button
                  key={item.label}
                  onClick={() => setCenterView(item.id as WorkspaceCenterView)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    textAlign: 'left',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: active ? '#1f242c' : 'transparent',
                    color: active ? '#f0f6fc' : '#c9d1d9',
                    fontSize: '12.5px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: '16px', textAlign: 'center', color: '#8b949e' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Node Dashboards Switcher (.40 Game Dev, .8 Sabretooth YouTube/LeadGen, .15 T5500 Mission OS) */}
          <div style={{ marginTop: '14px', padding: '0 6px' }}>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#8b949e',
                marginBottom: '6px',
              }}
            >
              Node Dashboards (Same Shell)
            </div>
            {[
              { id: 'game-dev-3d', badge: '.40', label: 'Game Dev Studio (:20128)' },
              { id: 'sabretooth-8392', badge: '.8', label: 'Sabretooth Studio (:8392)' },
              { id: 't5500-3130', badge: '.15', label: 'T5500 Mission Control (:3130)' },
            ].map((nd) => {
              const isAct = centerView === nd.id;
              return (
                <button
                  key={nd.id}
                  onClick={() => setCenterView(nd.id as WorkspaceCenterView)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: '3px',
                    borderRadius: '6px',
                    border: isAct ? '1px solid #388bfd' : '1px solid transparent',
                    background: isAct ? 'rgba(56, 139, 253, 0.15)' : 'transparent',
                    color: isAct ? '#79c0ff' : '#c9d1d9',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>{nd.label}</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: '#161b22',
                      color: '#58a6ff',
                    }}
                  >
                    {nd.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Projects / Repositories */}
          <div style={{ marginTop: '14px', padding: '0 6px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#8b949e',
                marginBottom: '6px',
              }}
            >
              <span>Projects / Repositories</span>
              <span>＋</span>
            </div>
            <div
              onClick={() => setCenterView('repos-models')}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                background: centerView === 'repos-models' ? '#1f242c' : 'transparent',
                fontSize: '12px',
                color: '#f0f6fc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: '#f778ba' }}>⑂</span>
              <span>Repositories (2 Monorepos)</span>
            </div>
          </div>

          {/* Sessions / Pinned Conversations */}
          <div style={{ marginTop: '14px', padding: '0 6px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#8b949e',
                marginBottom: '6px',
              }}
            >
              <span>Sessions / Chats</span>
              <span>☰ ＋</span>
            </div>
            {[
              { name: 'DREAM Engine (Alienware .40)', sub: 'Active · Shadowblade + Myth@s' },
              { name: 'Claude-Code-Game-Studios', sub: 'Synced · Remake 100% Yours' },
              { name: 'Sabretooth-OPSis (:8392)', sub: 'YouTube <=59s + Harvey Leads' },
              { name: 'T5500-Mission-OS (:3130)', sub: 'ai-memory :49374 + Domains' },
            ].map((s, i) => (
              <div
                key={s.name}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  background: i === 0 ? '#161b22' : 'transparent',
                  marginBottom: '3px',
                }}
              >
                <div style={{ fontSize: '12px', color: '#e6edf3', fontWeight: i === 0 ? 700 : 500 }}>
                  📁 {s.name}
                </div>
                <div style={{ fontSize: '10.5px', color: '#8b949e', paddingLeft: '18px' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer — Joshua Coleman */}
        <div
          style={{
            borderTop: '1px solid #21262d',
            paddingTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              JC
            </span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f0f6fc' }}>Joshua Coleman</div>
              <div style={{ fontSize: '10px', color: '#3fb950' }}>Sole Human Founder · Max Auth</div>
            </div>
          </div>
          {onReturnToFull3dViewport && (
            <button
              onClick={onReturnToFull3dViewport}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1px solid #388bfd',
                background: 'rgba(56, 139, 253, 0.16)',
                color: '#79c0ff',
                fontSize: '10.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Return to Full-Screen 3D Sunken Bastion Viewport"
            >
              Full 3D
            </button>
          )}
        </div>
      </aside>

      {/* =================================================================== */}
      {/* CENTER WORKSPACE — VIEWABLE CONTENT + 5-HOUR CAP MODEL SWITCHER     */}
      {/* =================================================================== */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          background: '#0d1117',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Sub-Header Bar */}
        <header
          style={{
            height: '46px',
            borderBottom: '1px solid #21262d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            background: '#090d13',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[
              { id: 'repos-models', label: '⑂ Repositories' },
              { id: 'my-work', label: '⊞ My Work' },
              { id: 'automations', label: '◷ Automations' },
              { id: 'game-dev-3d', label: '🎮 Game Dev :20128' },
              { id: 'sabretooth-8392', label: '🎬 Sabretooth :8392' },
              { id: 't5500-3130', label: '🛰️ T5500 :3130' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCenterView(tab.id as WorkspaceCenterView)}
                style={{
                  padding: '5px 9px', whiteSpace: 'nowrap', flexShrink: 0,
                  borderRadius: '6px',
                  border: centerView === tab.id ? '1px solid #30363d' : '1px solid transparent',
                  background: centerView === tab.id ? '#1f242c' : 'transparent',
                  color: centerView === tab.id ? '#f0f6fc' : '#8b949e',
                  fontSize: '12px',
                  fontWeight: centerView === tab.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(46, 160, 67, 0.16)',
                border: '1px solid rgba(46, 160, 67, 0.45)',
                color: '#3fb950',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              ✓ Remake 100% Yours · 56/56
            </span>
          </div>
        </header>

        {/* Center Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 175px' }}>
          {/* VIEW 1: REPOSITORIES & 5-HOUR CAP MODEL SWITCHER (Matches Screenshots 3 & 5) */}
          {centerView === 'repos-models' && (
            <div style={{ maxWidth: '780px', margin: '0 auto' }}>
              <div style={{ fontSize: '13px', color: '#c9d1d9', marginBottom: '10px', fontWeight: 600 }}>
                Which repositories should this project use?
              </div>
              <div
                style={{
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '8px' }}>
                  Selected repositories (2 Active Monorepos + Standalone Misses Trollz)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ color: '#3fb950' }}>✓</span>
                    <span>🟠</span>
                    <span>Trollz1004/dream-online</span>
                    <span style={{ fontSize: '11px', color: '#8b949e' }}>
                      (Unified Game Monorepo · Alienware .40 · DREAM-Engine :20128)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ color: '#3fb950' }}>✓</span>
                    <span>🟠</span>
                    <span>Trollz1004/ANTIGRAVITY</span>
                    <span style={{ fontSize: '11px', color: '#8b949e' }}>
                      (Platform & Operations Monorepo · T5500 .15 :3130 & Sabretooth .8 :8392)
                    </span>
                  </div>
                </div>
              </div>

              {/* Model Change History Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {modelAuditFeed.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '12.5px',
                      color: '#8b949e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ color: '#f97316' }}>✵</span>
                    <span style={{ textDecoration: 'underline', textDecorationColor: '#30363d' }}>{line}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '13.5px', color: '#e6edf3', marginBottom: '14px', lineHeight: 1.5 }}>
                <strong>Trollz1004/dream-online</strong> and <strong>Trollz1004/ANTIGRAVITY</strong> are synchronized across the 1-and-only-1 $5/mo Obsidian Vault. Hit a 5-hour rate limit on any provider? Click the model selector pill below to swap instantaneously between Claude, Gemini, OpenAI Codex, Grok, Free Claude Code (:8082), or Sabretooth Local GPU without losing session state.
              </div>

              {/* 5-Hour Cap Warning & Instant Swap Banner (Matches Screenshot 3) */}
              <div
                style={{
                  background: 'rgba(187, 128, 9, 0.14)',
                  border: '1px solid rgba(187, 128, 9, 0.5)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#e3b341' }}>
                  <span>⚠</span>
                  <span>
                    <strong>5-Hour Rate-Limit Shield Active:</strong> When any provider hits its 5-hour window cap, swap models below in 1 click (zero lost context).
                  </span>
                </div>
                <button
                  onClick={() => setIsModelPickerOpen((v) => !v)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e3b341',
                    background: '#21262d',
                    color: '#f0f6fc',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isModelPickerOpen ? 'Hide Models' : 'Swap Model Now'}
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: MY WORK — GITHUB DESKTOP PRs & ISSUES (Matches Screenshot 1) */}
          {centerView === 'my-work' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 310px', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '10px',
                    padding: '14px',
                    minHeight: '220px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Pulls created · GitHub</span>
                    <span style={{ fontSize: '12px', color: '#8b949e' }}>☑ ☰ ⋯</span>
                  </div>
                  {[
                    {
                      pr: '#57',
                      repo: 'Trollz1004/dream-online · merged e39e484',
                      title: 'feat(combat,gdd,ui): Shadowblade Assassin 3D slice, Myth@s face-to-face, Mold-Breaker classes & Non-Gambling Forge',
                      ok: true,
                    },
                    {
                      pr: '#56',
                      repo: 'Trollz1004/dream-online · merged 62e0d85',
                      title: 'docs(architecture): sync README, AGENTS/CLAUDE/GEMINI.md, Graphy codebase sync & single $5/mo Obsidian vault',
                      ok: true,
                    },
                    {
                      pr: '#331',
                      repo: 'Trollz1004/ANTIGRAVITY · merged',
                      title: 'fix(sabretooth): read SABRETOOTH_SOURCE_DIR in node-auto-pr-push.ps1',
                      ok: true,
                    },
                  ].map((p) => (
                    <div
                      key={p.pr}
                      style={{
                        background: '#1f242c',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '8px',
                        border: '1px solid #30363d',
                      }}
                    >
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#f0f6fc' }}>
                        <span style={{ color: '#3fb950', marginRight: '6px' }}>⑂</span>
                        {p.title} <span style={{ color: '#8b949e' }}>{p.pr}</span>{' '}
                        <span style={{ color: '#3fb950' }}>✓</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>{p.repo}</div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '10px',
                    padding: '14px',
                    minHeight: '170px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>Pulls mentioned</div>
                  <div style={{ fontSize: '12px', color: '#8b949e', textAlign: 'center', paddingTop: '36px' }}>
                    All PRs across Trollz1004/dream-online & Trollz1004/ANTIGRAVITY are merged and clean.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '10px',
                    padding: '14px',
                    minHeight: '220px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
                    Rule One & Remake 100% Yours Gates
                  </div>
                  <div style={{ fontSize: '12px', color: '#c9d1d9', lineHeight: 1.6 }}>
                    <div>✓ 1. Reference/Before Screenshot vs. New Screenshot Compared</div>
                    <div>✓ 2. Remake 100% Yours Validation Gate (100% world-native slots)</div>
                    <div>✓ 3. REA Clean-Room Provenance (0 third-party game engines)</div>
                    <div>✓ 4. Alienware Watchdogs 100% Headless (wscript.exe //B, Hidden=True)</div>
                    <div>✓ 5. Zero Uncommitted Drift in Preview Pane</div>
                  </div>
                </div>
                <div
                  style={{
                    background: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '10px',
                    padding: '14px',
                    minHeight: '170px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
                    Google Flow Vision Zones (epicsceneofdream.mp4)
                  </div>
                  {GOOGLE_FLOW_VISION_ZONES.map((z) => (
                    <div key={z.zoneId} style={{ fontSize: '11.5px', color: '#8b949e', marginBottom: '5px' }}>
                      • <strong style={{ color: '#79c0ff' }}>{z.title}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>Requested reviews · GitHub</div>
                <div
                  style={{
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '11.5px',
                    color: '#8b949e',
                    marginBottom: '12px',
                  }}
                >
                  State: <span style={{ color: '#3fb950' }}>Open</span> · Reviewer: <span style={{ color: '#f0f6fc' }}>@Joshua / GM #1</span>
                </div>
                <div style={{ fontSize: '12px', color: '#c9d1d9' }}>
                  Co-Equal Supreme Judges: <strong>Claude (Fable)</strong> & <strong>Google Gemini (Spark/Ultra)</strong>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: AUTOMATIONS (Matches Screenshot 2) */}
          {centerView === 'automations' && (
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#f0f6fc' }}>Set up automations</div>
                <div style={{ fontSize: '12.5px', color: '#8b949e', marginTop: '4px' }}>
                  Use headless agents to handle recurring work on a cadence you choose or triggered by events. Zero visible console windows.
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                {[
                  { title: 'Issue & PR triage', badge: 'Daily', desc: 'Review latest GitHub PRs across dream-online and ANTIGRAVITY with Rule One screenshot checks.' },
                  { title: 'YouTube <=59s Shorts Queue', badge: '4h Cadence', desc: 'Sabretooth (.8) AMF render with Natural Female Voices (Aoede/Kore) uploaded as Private only.' },
                  { title: 'Repo duplicate & REA audit', badge: 'Manual', desc: 'Gordon & Codex AST Graphy scan ensuring zero duplicate files and 100% Yours Remake compliance.' },
                  { title: 'Headless Watchdog Self-Heal', badge: '15m Hidden', desc: 'wscript.exe //B boot-alienware-services.vbs checks :20128, :8082, :8390, :8392, :9127, :27123.' },
                  { title: 'Performance & VRAM guard', badge: 'Weekly', desc: 'Keep 100% of RTX 3070 8GB VRAM dedicated to 3D WebGPU rendering on Alienware (.40).' },
                  { title: 'WCAG AAA Accessibility audit', badge: 'Daily', desc: 'Verify high contrast, large readable typography, outcome-first prose, and screen-reader support.' },
                ].map((a) => (
                  <div
                    key={a.title}
                    style={{
                      background: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '10px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6fc' }}>{a.title}</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          background: 'rgba(56, 139, 253, 0.16)',
                          color: '#58a6ff',
                          fontWeight: 700,
                        }}
                      >
                        {a.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#8b949e', lineHeight: 1.45 }}>{a.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: GAME DEV 3D VIEWPORT (:20128 ALIENWARE .40) */}
          {centerView === 'game-dev-3d' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#f0f6fc' }}>
                    Node 1: Alienware (.40) — DREAM Engine 3D Combat & World Viewport (:20128)
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e' }}>
                    Shadowblade Assassin (1H Sword + Off-Hand Dagger) · Myth@s Face-to-Face · Non-Gambling Mythos Blue Flame + 4 Orbs
                  </div>
                </div>
                {onReturnToFull3dViewport && (
                  <button
                    onClick={onReturnToFull3dViewport}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: '#238636',
                      border: '1px solid rgba(240,246,252,0.1)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ↗ Expand Full-Screen 3D Combat Arena
                  </button>
                )}
              </div>
              {embedded3dPreview ? (
                <div style={{ height: '380px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #30363d' }}>
                  {embedded3dPreview}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <img
                    src="/captures/set_t3_0s_sunbreaker_cleave_hit.png"
                    alt="Shadowblade Assassin vs Myth@s Face-to-Face"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid #30363d' }}
                  />
                  <img
                    src="/captures/camera_proof_angle2_mouse_drag_left.png"
                    alt="Mouse Orbit Proof"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid #30363d' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* VIEW 5: SABRETOOTH YOUTUBE & LEAD-GEN (:8392 SABRETOOTH .8) */}
          {centerView === 'sabretooth-8392' && (
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#f0f6fc', marginBottom: '4px' }}>
                Node 3: Sabretooth (.8) — OPSis YouTube Studio (&lt;=59.0s Shorts) & Harvey Lead-Gen Desk (:8392)
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px' }}>
                Same 3-Pane Antigravity/GitHub Desktop Shell · Official YouTube Data API v3 (Private Uploads Only) · Natural Neural Female Voices Only
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  {
                    n: '1. Private Uploads Waiting for Josh in Studio',
                    d: 'DREAM Online Sunken Bastion <=58.4s Short (Aoede Female Voice · privacyStatus=private · containsSyntheticMedia=true)',
                  },
                  {
                    n: '2. AMD AMF Render Queue (:8391)',
                    d: 'RX 6800 16GB VRAM h264_amf hardware encoder · 0 robotic SAPI TTS permitted',
                  },
                  {
                    n: '3. Outreach Drafts Waiting for Approval',
                    d: 'CAN-SPAM compliant drafts staged for Founder review (auto-send locked until Josh approves)',
                  },
                  {
                    n: '4. Harvey 3-Type Lead Pipeline & Analytics',
                    d: 'Type 1 Date App Affiliates · Type 2 Date App Subscriptions · Type 3 DREAM Online Open Collective Crowdfunding',
                  },
                ].map((c) => (
                  <div
                    key={c.n}
                    style={{
                      background: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#79c0ff', marginBottom: '4px' }}>{c.n}</div>
                    <div style={{ fontSize: '11.5px', color: '#c9d1d9' }}>{c.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 6: T5500 STREAMABLE MISSION CONTROL (:3130 T5500 .15) */}
          {centerView === 't5500-3130' && (
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#f0f6fc', marginBottom: '4px' }}>
                Node 2: T5500 (.15) — Streamable Mission Control (:3130), OmniRoute (:20128) & Shared ai-memory (:49374)
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px' }}>
                Same 3-Pane Antigravity/GitHub Desktop Shell · Production Domains · Transparent AI Mission Honesty Gate
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#3fb950', marginBottom: '4px' }}>
                    Production Domains & Cloud Tunnel
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#c9d1d9' }}>
                    youandinotai.com (Live) · onlinerecycle.net · dream-online.net · untilnokidinneed.com
                  </div>
                </div>
                <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#d2a8ff', marginBottom: '4px' }}>
                    Shared Fleet Memory MCP (:49374) & Single $5/mo Obsidian Vault
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#c9d1d9' }}>
                    scope=&apos;global&apos; synced across Alienware (.40), T5500 (.15), and Sabretooth (.8) with [REDACTED:XXXX] guard.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FLOATING 1-CLICK 5-HOUR CAP MODEL SWITCHER POPOVER (Screenshot 5) */}
        {/* ================================================================= */}
        {isModelPickerOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '112px',
              left: '26px',
              display: 'flex',
              gap: '10px',
              zIndex: 40,
            }}
          >
            {/* Left Popover: Copilot / OmniRoute Fusion, Model, Effort, Context Window */}
            <div
              style={{
                width: '250px',
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '10px',
                padding: '12px',
                boxShadow: '0 16px 36px rgba(0,0,0,0.75)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #21262d',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#f0f6fc' }}>
                  OmniRoute / Copilot Fusion
                </span>
                <button
                  onClick={() => setFusionEnabled((v) => !v)}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: 'none',
                    background: fusionEnabled ? '#238636' : '#30363d',
                    color: '#fff',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {fusionEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '7px' }}>
                <span style={{ color: '#8b949e' }}>Model</span>
                <span style={{ color: '#f0f6fc', fontWeight: 600 }}>{activeModel.label} ›</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '7px' }}>
                <span style={{ color: '#8b949e' }}>Effort</span>
                <span
                  onClick={() =>
                    setEffortLevel((e) => (e === 'Ultrathink' ? 'High' : e === 'High' ? 'Medium' : 'Ultrathink'))
                  }
                  style={{ color: '#58a6ff', fontWeight: 700, cursor: 'pointer' }}
                >
                  {effortLevel} ›
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#8b949e' }}>Context window</span>
                <span style={{ color: '#3fb950', fontWeight: 700 }}>{activeModel.contextWindow} ›</span>
              </div>
            </div>

            {/* Center Popover: Search models + Primary & Antigravity/Local Providers */}
            <div
              style={{
                width: '285px',
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '10px',
                padding: '10px',
                boxShadow: '0 16px 36px rgba(0,0,0,0.75)',
              }}
            >
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#0d1117',
                  border: '1px solid #21262d',
                  fontSize: '11.5px',
                  color: '#8b949e',
                  marginBottom: '8px',
                }}
              >
                Search models (Swap on 5-hr cap)...
              </div>
              <div style={{ fontSize: '10.5px', color: '#8b949e', fontWeight: 700, marginBottom: '4px', paddingLeft: '6px' }}>
                Primary Council & GitHub Copilot
              </div>
              {FIVE_HOUR_CAP_MODELS.slice(0, 7).map((m) => {
                const isSel = activeModel.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isSel ? '#1f242c' : 'transparent',
                      color: '#f0f6fc',
                      fontSize: '12px',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    <span>
                      {isSel ? '✓ ' : '   '}
                      <span style={{ color: '#f97316' }}>✵</span> {m.label}
                    </span>
                    <span style={{ fontSize: '10px', color: '#8b949e' }}>{m.contextWindow}</span>
                  </button>
                );
              })}
              <div
                style={{
                  fontSize: '10.5px',
                  color: '#8b949e',
                  fontWeight: 700,
                  margin: '8px 0 4px',
                  paddingLeft: '6px',
                  borderTop: '1px solid #21262d',
                  paddingTop: '6px',
                }}
              >
                Other providers (Zero 5-Hour Cap Fallbacks)
              </div>
              {FIVE_HOUR_CAP_MODELS.slice(7).map((m) => {
                const isSel = activeModel.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isSel ? '#1f242c' : 'transparent',
                      color: '#79c0ff',
                      fontSize: '11.5px',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    <span>⚙ antigravity/{m.id}</span>
                    <span style={{ fontSize: '10px', color: '#3fb950' }}>No Cap</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Prompt Composer Bar (Matches Screenshots 3, 4 & 5) */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '22px',
            right: '22px',
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
          }}
        >
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ask anything across dream-online & ANTIGRAVITY. Use / for commands or & for sessions..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f6fc',
              fontSize: '13px',
              marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#8b949e', fontSize: '14px' }}>＋</span>
              <span style={{ fontSize: '12px', color: '#c9d1d9', fontWeight: 600 }}>Interactive</span>
              <button
                onClick={() => setIsModelPickerOpen((v) => !v)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #388bfd',
                  background: '#1f242c',
                  color: '#f0f6fc',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#f97316' }}>✵</span>
                <span>
                  {activeModel.label} · {effortLevel} ({activeModel.contextWindow})
                </span>
                <span style={{ color: '#8b949e' }}>⌃</span>
              </button>
              <span style={{ fontSize: '11px', color: '#3fb950' }}>🛡️ Turbo · Secrets [REDACTED:XXXX]</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#8b949e', fontSize: '13px' }}>↻ 🎤</span>
              <button
                onClick={() => {
                  if (!promptInput.trim()) return;
                  setModelAuditFeed((prev) => [
                    ...prev,
                    `[${activeModel.label}] Executed: ${redactWorkspaceSecrets(promptInput)}`,
                  ]);
                  setPromptInput('');
                }}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#2f81f7',
                  color: '#fff',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* RIGHT INSPECTOR DOCK — PERMANENT TOOLS (NEVER CHANGE ACROSS NODES)  */}
      {/* Review · Open File · Terminal · Browser · Artifacts · Subagents     */}
      {/* =================================================================== */}
      <aside
        style={{
          background: '#090d13',
          borderLeft: '1px solid #21262d',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          padding: '10px 12px',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Top Dock Header (Matches Screenshot 3 & 4: Review / Overview + '+' button) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '10px',
            borderBottom: '1px solid #21262d',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: '#161b22',
                border: '1px solid #30363d',
                fontSize: '12px',
                fontWeight: 700,
                color: '#f0f6fc',
              }}
            >
              📄 {activeRightTool}
            </span>
            <button
              onClick={() => setIsAddTabMenuOpen((v) => !v)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: '1px solid #30363d',
                background: '#161b22',
                color: '#c9d1d9',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Add Terminal, Browser, Canvas, Library, or Automations tab"
            >
              ＋
            </button>
          </div>
          <span style={{ fontSize: '11px', color: '#8b949e' }}>⤢ ◫</span>
        </div>

        {/* Add Tab Dropdown Popover (Matches Screenshot 3) */}
        {isAddTabMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '44px',
              right: '14px',
              width: '210px',
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '10px',
              padding: '8px',
              zIndex: 50,
              boxShadow: '0 12px 28px rgba(0,0,0,0.75)',
            }}
          >
            <div style={{ fontSize: '10.5px', color: '#8b949e', marginBottom: '6px', paddingLeft: '6px' }}>
              Add Inspector Tab
            </div>
            {(['Terminal', 'Browser', 'Review', 'Open File'] as RightInspectorTool[]).map((t) => (
              <div
                key={t}
                onClick={() => {
                  setActiveRightTool(t);
                  setIsAddTabMenuOpen(false);
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#f0f6fc',
                  cursor: 'pointer',
                }}
              >
                {t === 'Terminal' ? '>_ ' : t === 'Browser' ? '🌐 ' : t === 'Review' ? '📄 ' : '📂 '}
                {t}
              </div>
            ))}
          </div>
        )}

        {/* Search Input (Exact match to Screenshot 4) */}
        <div
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            background: '#161b22',
            border: '1px solid #21262d',
            fontSize: '11.5px',
            color: '#8b949e',
            marginBottom: '12px',
          }}
        >
          ⌕ Search tabs, files, extensions, subagents, artifacts, commands...
        </div>

        {/* 4 Permanent Core Tools (Review, Open File, Terminal, Browser — Exact match to Screenshot 4) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '12px' }}>
          {(
            [
              { id: 'Review', icon: '📄', label: 'Review (Rule One & PR Diff)' },
              { id: 'Open File', icon: '📂', label: 'Open File (Redacted XXXX)' },
              { id: 'Terminal', icon: '>_', label: 'Terminal (56/56 Pass · Headless)' },
              { id: 'Browser', icon: '🌐', label: 'Browser (Live 3D & Flow Vision)' },
            ] as const
          ).map((tool) => {
            const isAct = activeRightTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveRightTool(tool.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isAct ? '#1f242c' : 'transparent',
                  color: isAct ? '#f0f6fc' : '#c9d1d9',
                  fontSize: '12.5px',
                  fontWeight: isAct ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ width: '18px', color: '#8b949e', fontFamily: 'monospace' }}>{tool.icon}</span>
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Inspector Tool Output Box */}
        <div
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '14px',
            fontSize: '11px',
            color: '#c9d1d9',
            lineHeight: 1.5,
          }}
        >
          {activeRightTool === 'Review' && (
            <div>
              <div style={{ fontWeight: 700, color: '#3fb950', marginBottom: '4px' }}>
                ✓ Rule One Reference vs. Live Screenshot Verified
              </div>
              <div>• Remake 100% Yours Gate: 100% Swapped (98.8% Parity)</div>
              <div>• REA Clean-Room: 100% In-House DREAM Engine</div>
              <div>• Git Working Tree: 0 uncommitted files</div>
            </div>
          )}
          {activeRightTool === 'Open File' && (
            <div>
              <select
                value={selectedOpenFile}
                onChange={(e) => setSelectedOpenFile(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d1117',
                  color: '#f0f6fc',
                  border: '1px solid #30363d',
                  borderRadius: '4px',
                  padding: '4px',
                  fontSize: '11px',
                  marginBottom: '6px',
                }}
              >
                {Object.keys(sampleFileContents).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '10.5px',
                  color: '#8b949e',
                  margin: 0,
                }}
              >
                {redactWorkspaceSecrets(sampleFileContents[selectedOpenFile] || '')}
              </pre>
            </div>
          )}
          {activeRightTool === 'Terminal' && (
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '10.5px', color: '#3fb950', margin: 0 }}>
              {`$ npm run lint && npm test
✔ 56/56 tests passing (0 errors)
✔ Headless Watchdog: wscript //B boot-alienware-services.vbs (Hidden=True)
✔ Secrets Guard: GEMINI_API_KEY=[REDACTED:XXXX]`}
            </pre>
          )}
          {activeRightTool === 'Browser' && (
            <div>
              <div style={{ fontWeight: 700, color: '#79c0ff', marginBottom: '4px' }}>
                Live Preview: :20128 · :8392 · :3130
              </div>
              <img
                src="/captures/set_t3_0s_sunbreaker_cleave_hit.png"
                alt="Live Browser Preview"
                style={{ width: '100%', borderRadius: '6px', border: '1px solid #30363d' }}
              />
            </div>
          )}
        </div>

        {/* Artifacts Section (Exact match to Screenshot 4) */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b949e', marginBottom: '6px' }}>
            Artifacts <span style={{ background: '#21262d', padding: '1px 6px', borderRadius: '999px' }}>4</span>
          </div>
          {[
            'Sunken Bastion Assassin vs Myth@s Face-to-Face',
            'Google Flow 4-Zone Vision (epicsceneofdream.mp4)',
            'Unified 3-Pane Workspace & 5h Model Switcher',
            'Dream Engine OpenUI + REA + Remake 100% Yours',
          ].map((art) => (
            <div
              key={art}
              style={{
                padding: '5px 8px',
                fontSize: '12px',
                color: '#c9d1d9',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: '#8b949e' }}>📄</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art}</span>
            </div>
          ))}
        </div>

        {/* Subagents Section (Exact match to Screenshot 4) */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b949e', marginBottom: '6px' }}>
            Subagents <span style={{ background: '#21262d', padding: '1px 6px', borderRadius: '999px' }}>7</span>
          </div>
          {[
            'Tidewater Clean-Room Technique Analyst',
            'Elemental Skill VFX and Game GUI Researcher',
            'WebGPU Stylized-Realistic Rendering Researcher',
            'Sabretooth Hermes YouTube Shorts & Female Voice...',
          ].map((sa) => (
            <div
              key={sa}
              style={{
                padding: '5px 8px',
                fontSize: '12px',
                color: '#c9d1d9',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: '#3fb950' }}>⊙</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sa}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
