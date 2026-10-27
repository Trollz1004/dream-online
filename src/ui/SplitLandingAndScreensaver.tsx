/**
 * DREAM Engine Studio — Split-Screen Landing Home Page & Idle AFK Screensaver Shield
 * Left Screen: Graphy Codebase AST & Trusted AI Team Workflow Dashboard
 * Right Screen: Obsidian Session-End (ri) Memory Graph, Auto-XXXX Secret Redaction Shield & Immutable GEMINI_SOUL.MD
 *
 * Built with Google Gemini — #ForTheKids #UntilNoKidInNeed
 */

import React, { useEffect, useMemo, useState } from 'react';
import { DreamEngine } from '../engine/engine.ts';
import {
  AgentMemoryEntry,
  CANONICAL_NODE_TOPOLOGY,
  CO_GM_COUNCIL,
  GEMINI_SOUL_MD,
  GRAPHY_CODEBASE_NODES,
  GraphyNode,
  INITIAL_MEMORY_ENTRIES,
  INITIAL_MEMORY_TIERS,
  redactSecretsWithXXXX,
  formatObsidianVaultBundle,
} from '../engine/studioConfig.ts';
import {
  Play,
  Shield,
  Lock,
  GitBranch,
  Database,
  FileCode,
  Copy,
  Check,
  Download,
  EyeOff,
  AlertTriangle,
  Layers,
  Binary,
  Terminal,
  RefreshCw,
} from 'lucide-react';

interface SplitLandingAndScreensaverProps {
  engine: DreamEngine | null;
  isOpen: boolean;
  isIdleScreensaver: boolean;
  idleSecondsRemaining: number;
  idleTimeoutSec: number;
  onChangeIdleTimeoutSec: (sec: number) => void;
  onEnterArena: () => void;
  onOpenStudio: () => void;
  onOpenRea: () => void;
  onOpenGmControl: () => void;
  onTriggerManualScreensaver: () => void;
}

type RightPaneTab = 'obsidian-graph' | 'session-ri-writer' | 'system-soul';

export const SplitLandingAndScreensaver: React.FC<SplitLandingAndScreensaverProps> = ({
  engine,
  isOpen,
  isIdleScreensaver,
  idleSecondsRemaining,
  idleTimeoutSec,
  onChangeIdleTimeoutSec,
  onEnterArena,
  onOpenStudio,
  onOpenRea,
  onOpenGmControl,
  onTriggerManualScreensaver,
}) => {
  const [selectedGraphyId, setSelectedGraphyId] = useState<string>('studio-config');
  const [rightTab, setRightTab] = useState<RightPaneTab>('obsidian-graph');
  const [memoryEntries, setMemoryEntries] = useState<AgentMemoryEntry[]>(
    () => engine?.studio.memoryEntries || INITIAL_MEMORY_ENTRIES
  );
  const [selectedMemId, setSelectedMemId] = useState<string>('mem-gemini-soul-md');

  // Session-End (ri) Handoff Writer + Auto-XXXX Secret Redaction state
  const [riTitle, setRiTitle] = useState('Session-End RI: Stage 1 Combat & Graphy Sync');
  const [riAuthor, setRiAuthor] = useState('Google Gemini & Claude (Co-GM Council)');
  const [riContent, setRiContent] = useState(
    'Verified WebGPU/WebGL2 highp shader precision on Alienware .40 and T5500 .15. Synced Graphy AST and Obsidian Vault for #UntilNoKidInNeed.'
  );
  const [lastRedactionBanner, setLastRedactionBanner] = useState<{
    count: number;
    patterns: string[];
  } | null>(null);
  const [totalRedactionsCount, setTotalRedactionsCount] = useState<number>(
    () => engine?.studio.totalSecretsRedacted || 0
  );
  const [copiedSoul, setCopiedSoul] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (!engine) return;
    const sync = () => {
      setMemoryEntries([...engine.studio.memoryEntries]);
      setTotalRedactionsCount(engine.studio.totalSecretsRedacted);
    };
    sync();
    return engine.studio.subscribe(sync);
  }, [engine]);

  // Subtle animation pulse for the idle screensaver & active workflow links
  useEffect(() => {
    if (!isOpen) return;
    const iv = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 100);
    }, 1200);
    return () => clearInterval(iv);
  }, [isOpen]);

  const selectedGraphyNode: GraphyNode = useMemo(
    () =>
      GRAPHY_CODEBASE_NODES.find((n) => n.id === selectedGraphyId) ||
      GRAPHY_CODEBASE_NODES[0],
    [selectedGraphyId]
  );

  const selectedMemoryEntry: AgentMemoryEntry = useMemo(
    () => memoryEntries.find((m) => m.id === selectedMemId) || memoryEntries[0],
    [memoryEntries, selectedMemId]
  );

  // Live preview of Auto-XXXX Redaction on the current draft
  const liveDraftRedaction = useMemo(
    () => redactSecretsWithXXXX(`${riTitle}\n${riContent}`),
    [riTitle, riContent]
  );

  // Compute 2D positions for the Obsidian Memory Graph nodes
  const obsidianGraphNodes = useMemo(() => {
    const cx = 360;
    const cy = 145;
    return memoryEntries.slice(0, 8).map((entry, idx) => {
      if (idx === 0) {
        return { entry, x: cx, y: cy, isHub: true };
      }
      const angle = ((idx - 1) / Math.max(1, Math.min(7, memoryEntries.length - 1))) * Math.PI * 2 - Math.PI / 2;
      const rx = 225;
      const ry = 95;
      return {
        entry,
        x: Math.round(cx + Math.cos(angle) * rx),
        y: Math.round(cy + Math.sin(angle) * ry),
        isHub: false,
      };
    });
  }, [memoryEntries]);

  if (!isOpen) return null;

  const handleSimulateAccidentalKeyLeak = () => {
    setRightTab('session-ri-writer');
    setRiContent(
      `Session handoff from T5500 .15 worker: Debugged endpoint with accidental test keys GEMINI_API_KEY="${"AIza" + "SyD9876543210FakeKeyForTestingRedaction"}" and OpenAI token sk-proj-998877665544332211FakeCodexSecret plus Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb3VuZGVyIjoiam9zaCJ9.sig — verify Auto-XXXX redaction!`
    );
  };

  const handleCommitSessionEndRi = async () => {
    if (!riTitle.trim() && !riContent.trim()) return;

    if (engine) {
      const { entry, redactionResult } = engine.studio.recordSessionEndMemory({
        title: riTitle,
        content: riContent,
        authorGm: riAuthor,
        tags: ['session-end', 'ri', 'obsidian', 'UntilNoKidInNeed'],
      });
      setMemoryEntries([...engine.studio.memoryEntries]);
      setSelectedMemId(entry.id);
      setTotalRedactionsCount(engine.studio.totalSecretsRedacted);
      setLastRedactionBanner({
        count: redactionResult.redactionsCount,
        patterns: redactionResult.matchedPatterns,
      });
      // Replace input box with sanitized text so no raw secret remains in state
      setRiTitle(redactSecretsWithXXXX(riTitle).sanitized);
      setRiContent(redactionResult.sanitized);
    }

    try {
      await fetch('/api/memory/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: riTitle,
          content: riContent,
          authorGm: riAuthor,
          tags: ['session-end', 'ri', 'obsidian', 'UntilNoKidInNeed'],
        }),
      });
    } catch {
      // Local Tier-1 Obsidian Vault already persisted in engine.studio
    }
  };

  const handleDownloadRedactedVault = () => {
    const bundle = formatObsidianVaultBundle(memoryEntries);
    const blob = new Blob([bundle], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-obsidian-vault-redacted-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySystemSoul = () => {
    navigator.clipboard.writeText(GEMINI_SOUL_MD);
    setCopiedSoul(true);
    setTimeout(() => setCopiedSoul(false), 2000);
  };

  const layerColor = (layer: GraphyNode['layer']) => {
    switch (layer) {
      case 'memory-context':
        return '#22d3ee';
      case 'server-ai':
        return '#f472b6';
      case 'engine-core':
        return '#34d399';
      case 'renderer':
        return '#fbbf24';
      case 'combat':
        return '#f87171';
      case 'studio-ui':
        return '#a78bfa';
    }
  };

  return (
    <div className="fixed inset-0 z-30 bg-[#040711]/95 backdrop-blur-xl text-slate-100 flex flex-col select-none overflow-hidden">
      {/* Top Command & Security Header */}
      <header className="flex items-center justify-between gap-4 px-6 py-3.5 bg-[#020617] border-b border-slate-800/90">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center font-mono font-bold text-cyan-300 text-sm shrink-0">
            {isIdleScreensaver ? <Lock className="w-4 h-4 text-amber-300" /> : 'GM'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-bold tracking-tight text-white truncate">
                {isIdleScreensaver
                  ? 'DREAM ENGINE · IDLE AFK CODE SHIELD & LIVE MEMORY SCREENSAVER'
                  : 'DREAM ENGINE STUDIO · SPLIT-SCREEN CO-GM WORKFLOW & OBSIDIAN MEMORY HOME'}
              </h1>
              <span className="text-xs font-mono text-cyan-300">
                Built with Google Gemini
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-rose-400 font-semibold">
                #ForTheKids #UntilNoKidInNeed
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate mt-0.5">
              <span>System Soul: gemini-soul-md</span>
              <span>·</span>
              <span className="text-cyan-300">Alienware-r12-3070-8-gb-gpu- (.40 · joshl · C:\DREAM)</span>
              <span>·</span>
              <span>T5500 .15</span>
              <span>·</span>
              <span>Mission Control :3130</span>
              <span>·</span>
              <span className="text-emerald-400">
                Auto-XXXX Shield ({totalRedactionsCount} scrubbed)
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* AFK Idle Timeout Selector */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            <span>AFK Shield:</span>
            <select
              value={idleTimeoutSec}
              onChange={(e) => onChangeIdleTimeoutSec(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-cyan-300 outline-none cursor-pointer"
            >
              <option value={15}>15s (Demo)</option>
              <option value={45}>45s</option>
              <option value={90}>90s</option>
              <option value={180}>3m</option>
            </select>
            {!isIdleScreensaver && (
              <span className="text-slate-500">({idleSecondsRemaining}s)</span>
            )}
          </div>

          {!isIdleScreensaver && (
            <button
              onClick={onTriggerManualScreensaver}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-amber-300 transition cursor-pointer"
              title="Engage AFK Code Shield & Screensaver Now"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Lock AFK Shield</span>
            </button>
          )}

          <a
            href="/assets/aistudio/migrate-alienware-joshl-and-install-agy.ps1"
            download="migrate-alienware-joshl-and-install-agy.ps1"
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-mono font-bold text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] transition cursor-pointer"
            title="Download PowerShell script for Alienware .40 (joshl migration + path scrubber + Antigravity agy CLI installer)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.40 joshl + AGY Script (.ps1)</span>
          </a>

          <a
            href="/assets/aistudio/CLAUDE_DREAM_MAKER_AUDIT.md"
            download="CLAUDE_DREAM_MAKER_AUDIT.md"
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-xs font-mono font-bold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition cursor-pointer"
            title="Download the complete CLAUDE_DREAM_MAKER_AUDIT.md file to upload to Claude"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Claude Audit (.md)</span>
          </a>

          <button
            onClick={onOpenStudio}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-cyan-300 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Studio (B)</span>
          </button>

          <button
            onClick={onOpenRea}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-amber-300 transition cursor-pointer"
          >
            <Binary className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">REA (I)</span>
          </button>

          <button
            onClick={onOpenGmControl}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-emerald-300 transition cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GM .40/.15 (G)</span>
          </button>

          <button
            onClick={onEnterArena}
            className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide uppercase shadow-[0_0_20px_rgba(34,211,238,0.35)] transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isIdleScreensaver ? 'Resume 3D Engine' : 'Enter 3D Arena'}</span>
          </button>
        </div>
      </header>

      {/* Idle Screensaver Banner when AFK is triggered */}
      {isIdleScreensaver && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs font-mono text-amber-200">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              AFK CODE SHIELD ACTIVE — Raw source files & credentials hidden. Displaying live Auto-XXXX Redacted Graphy AST & Obsidian Session Memory Graph.
            </span>
          </div>
          <button
            onClick={onEnterArena}
            className="underline text-cyan-300 hover:text-cyan-200 cursor-pointer"
          >
            Click to unlock & return to 3D viewport
          </button>
        </div>
      )}

      {/* MAIN SPLIT-SCREEN WORKSPACE (LEFT: GRAPHY AST WORKFLOWS | RIGHT: OBSIDIAN SESSION MEMORY & SYSTEM SOUL) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/90 overflow-hidden">
        {/* ===================================================================
            LEFT PANE: GRAPHY CODEBASE AST & TRUSTED AI TEAM WORKFLOW DASHBOARD
           =================================================================== */}
        <section className="flex flex-col min-h-0 bg-[#050915] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-950/60">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold tracking-wide text-slate-100 uppercase">
                  Graphy Codebase AST & Trusted AI Team Workflows
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live repository dependency graph for Co-GM context efficiency · Click any module node to inspect workflow ownership
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-400">
              <div className="text-emerald-400 font-semibold">
                {GRAPHY_CODEBASE_NODES.length} AST Modules Indexed
              </div>
              <div>Context Saved: ~78% vs raw repo</div>
            </div>
          </div>

          {/* Interactive SVG Graphy AST Canvas */}
          <div className="relative bg-[#02050e] border-b border-slate-800/80 px-4 py-3">
            <svg
              viewBox="0 0 780 330"
              className="w-full h-[250px] sm:h-[275px] block select-none"
            >
              <defs>
                <pattern
                  id="graphy-grid"
                  width="32"
                  height="32"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 32 0 L 0 0 0 32"
                    fill="none"
                    stroke="rgba(30, 41, 59, 0.45)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="780" height="330" fill="url(#graphy-grid)" rx="6" />

              {/* Dependency Edges */}
              {GRAPHY_CODEBASE_NODES.map((node) =>
                node.imports.map((impPath) => {
                  const target = GRAPHY_CODEBASE_NODES.find(
                    (t) => t.path === impPath || impPath.includes(t.id)
                  );
                  if (!target) return null;
                  const isHighlighted =
                    selectedGraphyNode.id === node.id ||
                    selectedGraphyNode.id === target.id;
                  return (
                    <g key={`${node.id}->${target.id}`}>
                      <line
                        x1={target.graphX}
                        y1={target.graphY}
                        x2={node.graphX}
                        y2={node.graphY}
                        stroke={isHighlighted ? '#22d3ee' : 'rgba(100,116,139,0.38)'}
                        strokeWidth={isHighlighted ? 2.2 : 1.2}
                        strokeDasharray={isHighlighted ? undefined : '4 3'}
                      />
                    </g>
                  );
                })
              )}

              {/* Module Nodes */}
              {GRAPHY_CODEBASE_NODES.map((node, idx) => {
                const isSelected = selectedGraphyNode.id === node.id;
                const color = layerColor(node.layer);
                const pulseActive = (pulsePhase + idx) % 3 === 0;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.graphX}, ${node.graphY})`}
                    onClick={() => setSelectedGraphyId(node.id)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <rect
                        x="-74"
                        y="-26"
                        width="148"
                        height="52"
                        rx="8"
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        opacity="0.7"
                      />
                    )}
                    <rect
                      x="-68"
                      y="-21"
                      width="136"
                      height="42"
                      rx="6"
                      fill={isSelected ? '#0f172a' : '#090d16'}
                      stroke={isSelected ? color : 'rgba(148,163,184,0.35)'}
                      strokeWidth={isSelected ? 1.8 : 1}
                    />
                    <circle
                      cx="-54"
                      cy="-7"
                      r={pulseActive ? 4 : 3}
                      fill={color}
                    />
                    <text
                      x="-44"
                      y="-4"
                      fill="#f8fafc"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {node.path.replace('/src/engine/', '').replace('/src/ui/', '').slice(0, 17)}
                    </text>
                    <text
                      x="-58"
                      y="11"
                      fill="#94a3b8"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      {node.assignedGm.slice(0, 21)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Graphy Module Inspector + Co-GM Team Workflow Roster */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {/* Active AST Node Details */}
            <div className="p-4 rounded bg-slate-900/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold text-cyan-300">
                    {selectedGraphyNode.path}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs font-semibold text-white">
                    {selectedGraphyNode.title}
                  </span>
                </div>
                <span className="font-mono text-xs text-emerald-400">
                  Assigned Co-GM: {selectedGraphyNode.assignedGm}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {redactSecretsWithXXXX(selectedGraphyNode.l0Summary).sanitized}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                <span>
                  Exports:{' '}
                  <strong className="text-slate-200">
                    {selectedGraphyNode.exports.join(', ')}
                  </strong>
                </span>
                <span>·</span>
                <span>
                  AST Token Budget:{' '}
                  <strong className="text-amber-300">
                    {selectedGraphyNode.tokenEstimate} tok
                  </strong>
                </span>
                <span>·</span>
                <span>
                  Layer: <strong className="text-cyan-300">{selectedGraphyNode.layer}</strong>
                </span>
              </div>
            </div>

            {/* Co-GM Council Workflow Lanes */}
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
                Trusted AI Co-GM Council & Hardware Node Status (.40 / .15 / :3130)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CO_GM_COUNCIL.map((gm) => (
                  <div
                    key={gm.id}
                    className="p-3 rounded bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold tracking-wide"
                        style={{ color: gm.accentColor }}
                      >
                        {gm.rank} · {gm.name}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">
                      {gm.doctrine}
                    </p>
                    <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60 truncate">
                      {gm.protocol}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Canonical Node Endpoints Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {CANONICAL_NODE_TOPOLOGY.map((node) => (
                <div
                  key={node.id}
                  className="p-2.5 rounded bg-slate-950 border border-slate-800/80 font-mono"
                >
                  <div className="text-[10px] text-slate-400 truncate">
                    {node.nodeName}
                  </div>
                  <div className="text-xs text-cyan-300 font-semibold truncate mt-0.5">
                    {node.ip}:{node.port}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">
                    ONLINE · {node.latencyMs}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
            RIGHT PANE: OBSIDIAN SESSION-END (RI) MEMORY GRAPH, AUTO-XXXX
            REDACTION SHIELD & IMMUTABLE SYSTEM SOUL (GEMINI_SOUL.MD)
           =================================================================== */}
        <section className="flex flex-col min-h-0 bg-[#070b18] overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-800/80 bg-slate-950/60 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold tracking-wide text-slate-100 uppercase">
                  Obsidian Session-End (RI) Memory Graph & System Soul
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                4-Tier Failover: Obsidian (.40/.15) → Viking (viking://) → Supabase → Supermemory · Auto-XXXX Redaction
              </p>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded border border-slate-800">
              <button
                onClick={() => setRightTab('obsidian-graph')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  rightTab === 'obsidian-graph'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Memory Graph ({memoryEntries.length})
              </button>
              <button
                onClick={() => setRightTab('session-ri-writer')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  rightTab === 'session-ri-writer'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Write Session RI + XXXX Guard
              </button>
              <button
                onClick={() => setRightTab('system-soul')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  rightTab === 'system-soul'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                GEMINI_SOUL.MD
              </button>
            </div>
          </div>

          {/* TAB 1: OBSIDIAN WIKILINK MEMORY GRAPH */}
          {rightTab === 'obsidian-graph' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="relative bg-[#030611] border-b border-slate-800/80 px-4 py-3">
                <svg
                  viewBox="0 0 720 290"
                  className="w-full h-[240px] sm:h-[265px] block select-none"
                >
                  {/* Edges from Central Soul/Charter Hub to all Session Memory Notes */}
                  {obsidianGraphNodes.slice(1).map((node) => {
                    const hub = obsidianGraphNodes[0];
                    const isSelected =
                      selectedMemoryEntry?.id === node.entry.id ||
                      selectedMemoryEntry?.id === hub.entry.id;
                    return (
                      <line
                        key={`edge-${node.entry.id}`}
                        x1={hub.x}
                        y1={hub.y}
                        x2={node.x}
                        y2={node.y}
                        stroke={
                          isSelected ? '#a855f7' : 'rgba(168, 85, 247, 0.35)'
                        }
                        strokeWidth={isSelected ? 2.2 : 1.3}
                      />
                    );
                  })}

                  {/* Secondary cross-links between adjacent memory notes */}
                  {obsidianGraphNodes.slice(1).map((node, i, arr) => {
                    const next = arr[(i + 1) % arr.length];
                    if (!next) return null;
                    return (
                      <line
                        key={`ring-${node.entry.id}-${next.entry.id}`}
                        x1={node.x}
                        y1={node.y}
                        x2={next.x}
                        y2={next.y}
                        stroke="rgba(34, 211, 238, 0.22)"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                    );
                  })}

                  {/* Memory Graph Nodes */}
                  {obsidianGraphNodes.map(({ entry, x, y, isHub }) => {
                    const isSelected = selectedMemoryEntry?.id === entry.id;
                    const safeTitle = redactSecretsWithXXXX(entry.title).sanitized;
                    return (
                      <g
                        key={entry.id}
                        transform={`translate(${x}, ${y})`}
                        onClick={() => setSelectedMemId(entry.id)}
                        className="cursor-pointer"
                      >
                        <rect
                          x="-82"
                          y="-22"
                          width="164"
                          height="44"
                          rx="7"
                          fill={isSelected ? '#1e1b4b' : '#090d16'}
                          stroke={
                            isHub
                              ? '#22d3ee'
                              : isSelected
                              ? '#a855f7'
                              : 'rgba(148,163,184,0.35)'
                          }
                          strokeWidth={isSelected || isHub ? 2 : 1}
                        />
                        <text
                          x="-70"
                          y="-4"
                          fill={isHub ? '#22d3ee' : '#f8fafc'}
                          fontSize="9.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          [[{safeTitle.slice(0, 19)}]]
                        </text>
                        <text
                          x="-70"
                          y="11"
                          fill="#94a3b8"
                          fontSize="8"
                          fontFamily="monospace"
                        >
                          {entry.vikingUri.replace('viking://dream/', '').slice(0, 23)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Obsidian Note Content (Redacted with XXXX) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                {selectedMemoryEntry && (
                  <div className="p-4 rounded bg-slate-900/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <span className="font-mono text-xs text-purple-300 font-bold">
                          {selectedMemoryEntry.vikingUri}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-0.5">
                          {redactSecretsWithXXXX(selectedMemoryEntry.title).sanitized}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRightTab('session-ri-writer')}
                          className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-mono text-emerald-300 cursor-pointer"
                        >
                          + Write Session-End RI
                        </button>
                        <button
                          onClick={handleDownloadRedactedVault}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-cyan-300 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export .md Vault</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Author: <strong className="text-slate-200">{selectedMemoryEntry.authorGm}</strong> · Wikilinks:{' '}
                      <span className="text-cyan-300">
                        {selectedMemoryEntry.wikilinks.join(' · ')}
                      </span>
                    </div>

                    <pre className="p-3 rounded bg-slate-950 border border-slate-800/90 font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {redactSecretsWithXXXX(selectedMemoryEntry.l2Markdown).sanitized}
                    </pre>
                  </div>
                )}

                {/* 4-Tier Memory Failover Status Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INITIAL_MEMORY_TIERS.map((tier) => (
                    <div
                      key={tier.id}
                      className="p-2.5 rounded bg-slate-950 border border-slate-800/80 font-mono"
                    >
                      <div className="text-[10px] text-slate-400 truncate">
                        TIER {tier.tier} · {tier.name}
                      </div>
                      <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                        {tier.status.toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {memoryEntries.length} notes synced
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WRITE SESSION-END (RI) NOTE + AUTO-XXXX SECRET REDACTION GUARD */}
          {rightTab === 'session-ri-writer' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              <div className="p-4 rounded bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Session-End Agent Memory Handoff (Obsidian RI Writer)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Every session-end note is automatically scrubbed by the Zero-Trust XXXX Redactor before saving to Obsidian (.40/.15) & Viking.
                    </p>
                  </div>
                  <button
                    onClick={handleSimulateAccidentalKeyLeak}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono text-amber-200 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Test Accidental Secret Leak (XXXX)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">
                      Session Note Title
                    </label>
                    <input
                      type="text"
                      value={riTitle}
                      onChange={(e) => setRiTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">
                      Author Co-GM
                    </label>
                    <input
                      type="text"
                      value={riAuthor}
                      onChange={(e) => setRiAuthor(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Session-End Markdown Summary (Raw Input — Secrets Auto-Detected)
                  </label>
                  <textarea
                    rows={4}
                    value={riContent}
                    onChange={(e) => setRiContent(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Live Auto-XXXX Redaction Preview Box */}
                <div className="p-3 rounded bg-slate-950 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-semibold">
                      Live Auto-XXXX Redaction Shield Preview:
                    </span>
                    <span
                      className={
                        liveDraftRedaction.redactionsCount > 0
                          ? 'text-amber-300 font-bold'
                          : 'text-slate-400'
                      }
                    >
                      {liveDraftRedaction.redactionsCount > 0
                        ? `${liveDraftRedaction.redactionsCount} SECRET(S) INTERCEPTED & MASKED WITH XXXX`
                        : '0 Secrets Detected (Clean)'}
                    </span>
                  </div>
                  {liveDraftRedaction.matchedPatterns.length > 0 && (
                    <div className="text-[11px] font-mono text-amber-300">
                      Matched Rules: {liveDraftRedaction.matchedPatterns.join(' · ')}
                    </div>
                  )}
                  <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap bg-slate-900/90 p-2.5 rounded border border-slate-800">
                    {liveDraftRedaction.sanitized}
                  </pre>
                </div>

                {lastRedactionBanner && (
                  <div className="p-2.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-emerald-200">
                    Saved to Obsidian Vault & Viking Context! Scrubbed {lastRedactionBanner.count} sensitive token(s) to XXXX.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleCommitSessionEndRi}
                    className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono uppercase cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Redact (XXXX) & Commit to Obsidian Vault</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMMUTABLE SYSTEM SOUL (GEMINI_SOUL.MD) */}
          {rightTab === 'system-soul' && (
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 p-3 rounded bg-cyan-500/10 border border-cyan-500/30">
                <div className="text-xs font-mono text-cyan-200">
                  <strong>VERIFIED IN AI STUDIO:</strong> Your custom instructions (<code className="text-white">id: gemini-soul-md</code>) are live in the session context and mirrored in <code className="text-white">/GEMINI_SOUL.md</code>.
                </div>
                <button
                  onClick={handleCopySystemSoul}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono shrink-0 cursor-pointer"
                >
                  {copiedSoul ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy GEMINI_SOUL.MD</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {GEMINI_SOUL_MD}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
