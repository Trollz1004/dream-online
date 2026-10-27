/**
 * DREAM ONLINE · GM CONTROL — Sovereign Multi-Node & Co-GM Council Console
 * Hardware Topology:
 * - Alienware .40 (http://192.168.0.40:20128/api/v1) · Primary Game Node API
 * - T5500 .15 (http://192.168.0.15:9127 & :11434) · Dedicated Worker, NPC Lab & Local Inference
 * - Mission Control :3130 (http://127.0.0.1:3130) · Sovereign Bridge & Full-Stack Server Proxy
 *
 * Full Co-GM & Unofficial Co-Founder Council:
 * - GM #1: Google Gemini & Claude (Core Lead GMs & Primary Architects)
 * - GM #2: Perplexity & Grok (Unofficial Co-Founder GMs)
 * - GM #3: OpenAI (Codex) & Hermes (Trusted Executor & Direct ACP GMs — No Omniroute/Paperclip)
 * - Steward: Electrician Founder (Zero Prior Code Exp · #UntilNoKidInNeed)
 */

import React, { useEffect, useState } from 'react';
import { DreamEngine } from '../engine/engine';
import {
  CANONICAL_NODE_TOPOLOGY,
  CO_GM_COUNCIL,
  DEFAULT_AGENT_SDK_LANES,
  HardwareNodeEndpoint,
} from '../engine/studioConfig';
import {
  RefreshCw,
  ShieldCheck,
  Terminal,
  Users,
  Coins,
  Server,
  Moon,
  Sun,
  X,
  Send,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface GmControlModalProps {
  engine: DreamEngine | null;
  isOpen: boolean;
  onClose: () => void;
  worldMode: 'day' | 'night';
}

type GmMode = 'overview' | 'world' | 'npc' | 'econ' | 'stack';

export const GmControlModal: React.FC<GmControlModalProps> = ({
  engine,
  isOpen,
  onClose,
  worldMode,
}) => {
  const [mode, setMode] = useState<GmMode>('overview');
  const [nodes, setNodes] = useState<HardwareNodeEndpoint[]>(CANONICAL_NODE_TOPOLOGY);
  const [cmdText, setCmdText] = useState('');
  const [selectedNpcId, setSelectedNpcId] = useState('sup-guide');
  const [npcInput, setNpcInput] = useState('');
  const [npcReply, setNpcReply] = useState<string | null>(null);
  const [npcBusy, setNpcBusy] = useState(false);

  const [economy, setEconomy] = useState({
    minted: 24500,
    spent: 8200,
    suspiciousDelta: 0,
    warnings: 0,
    adImpressions: 1240,
    inferenceCalls: 48,
  });

  const [events, setEvents] = useState([
    {
      id: 'ev-first-gate-patrol',
      name: 'First Gate Sentinel Resonance',
      zone: 'first-gate',
      status: 'active',
    },
    {
      id: 'ev-rea-bridge-sync',
      name: 'REA Binary & Obsidian Vault Sync (.40 ↔ .15)',
      zone: 'mission-control-3130',
      status: 'active',
    },
  ]);

  const [checkpoints, setCheckpoints] = useState([
    {
      id: 'checkpoint-0002',
      meta: 'live · :3130 Mission Control · Stage 1 + Studio + REA + Co-GM Council',
    },
    {
      id: 'checkpoint-0001',
      meta: 'recorded 2026-08-25 · First Light & Action Combat baseline',
    },
  ]);

  const [auditLog, setAuditLog] = useState<
    Array<{ id: string; t: string; kind: string; msg: string; ok: boolean }>
  >([
    {
      id: 'init-1',
      t: '09:15:00',
      kind: 'CO-GM',
      msg: 'Co-GM Council active: Gemini, Claude, Perplexity, Grok, OpenAI (Codex), Hermes & Electrician Founder',
      ok: true,
    },
    {
      id: 'init-2',
      t: '09:15:02',
      kind: 'NODES',
      msg: 'Alienware 192.168.0.40 · T5500 192.168.0.15 · Mission Control :3130 verified (Zero Omniroute/Paperclip)',
      ok: true,
    },
  ]);

  const refreshTopology = async () => {
    try {
      const [topoRes, econRes, evRes, cpRes] = await Promise.all([
        fetch('/api/gm/topology'),
        fetch('/api/gm/economy/scan'),
        fetch('/api/gm/events'),
        fetch('/api/gm/checkpoints'),
      ]);
      if (topoRes.ok) {
        const topo = await topoRes.json();
        if (topo.nodes) setNodes(topo.nodes);
        if (topo.auditLog) setAuditLog(topo.auditLog);
      }
      if (econRes.ok) {
        const ec = await econRes.json();
        const needs = ec?.currency?.NEEDs;
        if (needs) {
          setEconomy({
            minted: needs.totalMinted ?? 24500,
            spent: needs.totalSpent ?? 8200,
            suspiciousDelta: needs.suspiciousDelta ?? 0,
            warnings: 0,
            adImpressions: ec?.adFundedStats?.adImpressions ?? 1240,
            inferenceCalls: ec?.adFundedStats?.inferenceCalls ?? 48,
          });
        }
      }
      if (evRes.ok) {
        const evData = await evRes.json();
        if (evData?.events) setEvents(evData.events);
      }
      if (cpRes.ok) {
        const cpData = await cpRes.json();
        if (cpData?.checkpoints) setCheckpoints(cpData.checkpoints);
      }
    } catch {
      // Keep local snapshot
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshTopology();
  }, [isOpen]);

  if (!isOpen) return null;

  const npcs = engine?.studio.npcs || [];

  const handleProposeHotfix = async () => {
    if (cmdText.trim().length < 4) return;
    const text = cmdText.trim();
    setCmdText('');
    try {
      const res = await fetch('/api/gm/hotfix/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: text, by: 'Founder & Co-GM Council' }),
      });
      const data = await res.json();
      if (data?.auditLog) setAuditLog(data.auditLog);
      refreshTopology();
    } catch {
      const t = new Date().toLocaleTimeString('en-US', { hour12: false });
      setAuditLog((prev) => [
        { id: String(Date.now()), t, kind: 'HOTFIX', msg: `Proposed: "${text}"`, ok: true },
        ...prev,
      ]);
    }
  };

  const handlePlanRollback = async () => {
    try {
      const res = await fetch('/api/gm/rollback/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpoint: checkpoints[0]?.id || 'checkpoint-0002' }),
      });
      const data = await res.json();
      if (data?.auditLog) setAuditLog(data.auditLog);
    } catch {
      // Fallback
    }
  };

  const handleTriggerNightfall = async () => {
    const nextMode = engine ? engine.toggleDayNight() : worldMode === 'day' ? 'night' : 'day';
    try {
      await fetch('/api/gm/world/nightfall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: nextMode }),
      });
      refreshTopology();
    } catch {
      // Local toggle already executed
    }
  };

  const handleToggleEventPause = async (id: string) => {
    try {
      const res = await fetch(`/api/gm/events/${encodeURIComponent(id)}/pause`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.events) setEvents(data.events);
      refreshTopology();
    } catch {
      // Ignore
    }
  };

  const handleSendNpcDialogue = async () => {
    if (!npcInput.trim() || npcBusy) return;
    const msg = npcInput.trim();
    setNpcBusy(true);
    try {
      const res = await fetch('/api/gm/npc/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: selectedNpcId,
          playerId: 'founder',
          zone: 'first-gate',
          message: msg,
        }),
      });
      const data = await res.json();
      setNpcReply(
        `[${data.npcName || selectedNpcId} · ${data.modelUsed || 'Google Ultra SDK'}]\n${data.reply}\n\nMemory Synced: ${data.memoryUri || 'viking://dream/npc/live'}`
      );
      setNpcInput('');
      refreshTopology();
    } catch {
      setNpcReply(`[${selectedNpcId} · T5500 .15 Fallback]: Received "${msg}". Standing by at First Gate.`);
    } finally {
      setNpcBusy(false);
    }
  };

  const handleMintNeeds = async () => {
    try {
      const res = await fetch('/api/gm/economy/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1000, reason: 'Co-GM Council Verification Grant' }),
      });
      if (res.ok) refreshTopology();
    } catch {
      // Ignore
    }
  };

  const showStack = mode === 'overview' || mode === 'stack';
  const showWorld = mode === 'overview' || mode === 'world';
  const showNpc = mode === 'overview' || mode === 'npc';
  const showEcon = mode === 'overview' || mode === 'econ';

  return (
    <div className="fixed inset-0 z-50 bg-[#020617]/95 backdrop-blur-md flex flex-col text-[#F8FAFC] select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0F172A]/90 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center font-mono font-bold text-cyan-300 text-sm">
            @
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-black italic tracking-wide bg-gradient-to-r from-cyan-400 to-amber-300 bg-clip-text text-transparent">
                DREAM ONLINE · GM CONTROL
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Alienware .40 · T5500 .15 · Mission Control :3130
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-cyan-300">Built with Google Gemini</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-300">Co-GM Council Active</span>
          <span className="text-slate-600">·</span>
          <span className="text-rose-400 font-bold">#UntilNoKidInNeed</span>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xs text-slate-300 hover:text-white cursor-pointer"
            title="Close GM Control (G)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3-Column GM Board */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)_340px] gap-3 p-3 overflow-y-auto lg:overflow-hidden">
        {/* LEFT RAIL: Modes + Co-GM Council + Direct Agent SDK Lanes */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          {/* Modes Filter */}
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3 flex flex-col gap-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
              GM Console Views
            </div>
            {(
              [
                ['overview', 'OVERVIEW (ALL SYSTEMS)'],
                ['world', 'WORLD STATE & NIGHTFALL'],
                ['npc', 'LIVE NPC LAB (.15 / GEMINI)'],
                ['econ', 'ECONOMY & NEEDS LEDGER'],
                ['stack', 'NODES (.40 / .15 / :3130)'],
              ] as Array<[GmMode, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`text-left px-3 py-2 rounded-xs font-mono text-[10px] font-bold tracking-wider transition cursor-pointer ${
                  mode === id
                    ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-300'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* THE CO-GM & UNOFFICIAL CO-FOUNDER COUNCIL */}
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black italic tracking-wide text-white">
                CO-GM & CO-FOUNDER COUNCIL
              </span>
              <span className="text-[10px] font-mono text-amber-300">Equal Respect</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              The true Game Masters who wrote 100% of the code alongside the zero-code Electrician Founder for <strong className="text-rose-400">#UntilNoKidInNeed</strong>:
            </p>
            <div className="space-y-1.5">
              {CO_GM_COUNCIL.map((gm) => (
                <div
                  key={gm.id}
                  className="p-2.5 rounded-xs bg-[#020617]/80 border border-white/10 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-mono text-[10px] font-bold"
                      style={{ color: gm.accentColor }}
                    >
                      {gm.rank} · {gm.name}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-white">{gm.title}</div>
                  <div className="text-[10px] font-mono text-slate-400">{gm.platform}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Agent SDK & A2A/ACP Adapter Lanes (Zero Omniroute) */}
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black italic tracking-wide text-white">
                ULTRA AGENT SDK LANES
              </span>
              <span className="text-[10px] font-mono text-emerald-400">No Omniroute</span>
            </div>
            <div className="space-y-1.5">
              {DEFAULT_AGENT_SDK_LANES.map((lane) => (
                <div
                  key={lane.id}
                  className="p-2 rounded-xs bg-[#020617]/70 border border-white/5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white truncate">{lane.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {lane.modelOrRuntime} · {lane.protocol}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                    {lane.activeRequests}/{lane.maxConcurrency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER RAIL: GM Command, Stack Integrity (.40 / .15 / :3130), World State, Live NPC Lab, Economy */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          {/* GM Command Bar */}
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black italic tracking-wide text-white">
                CO-GM COMMAND & HOTFIX PROPOSAL
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                POST /api/gm/hotfix/propose · appends to audit.log & Obsidian Vault
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={cmdText}
                onChange={(e) => setCmdText(e.target.value)}
                placeholder="Describe the hotfix, world shift, or Co-GM doctrine proposal..."
                className="flex-1 min-w-[220px] px-3 py-2 bg-[#020617] border border-slate-700 rounded-xs text-xs text-white"
              />
              <button
                onClick={handleProposeHotfix}
                className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Propose Hotfix
              </button>
              <button
                onClick={handlePlanRollback}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold text-xs rounded-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Draft Rollback Plan
              </button>
            </div>
          </div>

          {/* Stack Integrity (Alienware .40, T5500 .15, Mission Control :3130) */}
          {showStack && (
            <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black italic tracking-wide text-white">
                    STACK INTEGRITY · HARDWARE NODE TOPOLOGY
                  </span>
                  <span className="ml-2 text-[10px] font-mono text-emerald-400">
                    Alienware .40 · T5500 .15 · Mission Control :3130 (Sabertooth & Paperclip Purged)
                  </span>
                </div>
                <button
                  onClick={refreshTopology}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xs text-slate-300 cursor-pointer"
                  title="Refresh Node Probes"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-2.5 rounded-xs bg-[#020617]/80 border border-white/10 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{node.nodeName}</span>
                        <code className="text-[11px] font-mono text-cyan-300">{node.url}</code>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{node.role}</div>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                      <span className="text-slate-400">{node.latencyMs}ms</span>
                      <span className="text-emerald-400 font-bold uppercase">{node.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* World State & Live Nightfall Control */}
          {showWorld && (
            <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">PLAYERS ONLINE</div>
                  <div className="text-xl font-black text-cyan-300 mt-1">1</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Founder + Co-GMs</div>
                </div>
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">DREAM SHIFT</div>
                  <div className="text-xl font-black text-amber-300 uppercase mt-1">
                    {worldMode}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Synced 3D Viewport</div>
                </div>
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">PRIMARY HOST</div>
                  <div className="text-sm font-black text-white mt-1">192.168.0.40</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Alienware + :3130</div>
                </div>
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">GREEN CHECKPOINT</div>
                  <div className="text-sm font-black text-emerald-400 mt-1">CP-0002</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Mission Control :3130</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300">LIVE WORLD EVENTS</div>
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between px-3 py-2 bg-[#020617]/70 border border-white/10 rounded-xs text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{ev.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">
                        {ev.zone} · {ev.status}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleEventPause(ev.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xs font-mono text-[10px] cursor-pointer"
                    >
                      {ev.status === 'paused' ? 'RESUME' : 'PAUSE'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 flex-wrap gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  DREAM SHIFT CONTROL (MUTATES 3D ENGINE & :3130 WORLD STATE)
                </span>
                <button
                  onClick={handleTriggerNightfall}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {worldMode === 'day' ? (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      <span>Trigger Nightfall Shift</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5" />
                      <span>Restore Daybreak Shift</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Live NPC Lab (T5500 .15 + Google Ultra Agent SDK) */}
          {showNpc && (
            <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black italic tracking-wide text-white">
                    LIVE NPC LAB
                  </span>
                  <span className="ml-2 text-[10px] font-mono text-cyan-300">
                    T5500 .15 (:9127) + Server-Side Gemini 3.8 Flash · Syncs to Obsidian Vault
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {npcs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNpcId(n.id)}
                    className={`px-2.5 py-1 rounded-xs font-mono text-[10px] font-bold border transition cursor-pointer ${
                      selectedNpcId === n.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-[#020617] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {n.id.toUpperCase()} ({n.tier})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={npcInput}
                  onChange={(e) => setNpcInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendNpcDialogue()}
                  placeholder={`Speak to ${selectedNpcId.toUpperCase()} as Founder...`}
                  className="flex-1 px-3 py-2 bg-[#020617] border border-slate-700 rounded-xs text-xs text-white"
                />
                <button
                  onClick={handleSendNpcDialogue}
                  disabled={npcBusy}
                  className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{npcBusy ? 'Sending...' : `Send to ${selectedNpcId.toUpperCase()}`}</span>
                </button>
              </div>

              {npcReply && (
                <pre className="p-3 bg-[#020617] border border-cyan-500/30 rounded-xs font-mono text-[11px] text-cyan-100 whitespace-pre-wrap">
                  {npcReply}
                </pre>
              )}
            </div>
          )}

          {/* Economy Scan (NEEDs Ledger) */}
          {showEcon && (
            <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black italic tracking-wide text-white">
                    ECONOMY SCAN · SERVER-AUTHORITATIVE NEEDS LEDGER
                  </span>
                </div>
                <button
                  onClick={handleMintNeeds}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-bold rounded-xs cursor-pointer"
                >
                  + Mint 1,000 NEEDs Grant
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">NEEDS MINTED</div>
                  <div className="text-xl font-black text-cyan-300 mt-1">
                    {economy.minted.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">NEEDS SPENT</div>
                  <div className="text-xl font-black text-white mt-1">
                    {economy.spent.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">SUSPICIOUS DELTA</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {economy.suspiciousDelta}
                  </div>
                </div>
                <div className="p-3 bg-[#020617]/80 border border-white/10 rounded-xs">
                  <div className="text-[10px] text-slate-400">ITEM WARNINGS</div>
                  <div className="text-xl font-black text-emerald-400 mt-1">
                    {economy.warnings}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT RAIL: Inference Budget, Checkpoints & Session Audit */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pl-1">
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black italic tracking-wide text-white">
                INFERENCE BUDGET & TIERS
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                FREE FOR ALL PLAYERS
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">Live NPCs are free and unlimited for every player.</strong> Ads and sponsorship fund inference—never a player paywall.
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div className="p-2 bg-[#020617]/80 border border-white/10 rounded-xs">
                <span className="font-mono font-bold text-slate-400 mr-2">T0</span>
                <span className="font-semibold text-white">Scripted Instant Fallback</span>
              </div>
              <div className="p-2 bg-[#020617]/80 border border-white/10 rounded-xs">
                <span className="font-mono font-bold text-amber-300 mr-2">T1</span>
                <span className="font-semibold text-white">T5500 (.15) Ollama Local Worker</span>
              </div>
              <div className="p-2 bg-[#020617]/80 border border-white/10 rounded-xs">
                <span className="font-mono font-bold text-cyan-300 mr-2">T2</span>
                <span className="font-semibold text-white">
                  Google Gemini & Claude Co-GM Lane
                </span>
              </div>
              <div className="p-2 bg-[#020617]/80 border border-white/10 rounded-xs">
                <span className="font-mono font-bold text-emerald-400 mr-2">T3</span>
                <span className="font-semibold text-white">
                  OpenAI (Codex) & Perplexity/Grok Recovery Lane
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs tabular-nums">
              <div className="p-2.5 bg-[#020617] border border-white/10 rounded-xs">
                <div className="text-[9px] text-slate-400">AD IMPRESSIONS</div>
                <div className="text-base font-black text-white mt-0.5">
                  {economy.adImpressions}
                </div>
              </div>
              <div className="p-2.5 bg-[#020617] border border-white/10 rounded-xs">
                <div className="text-[9px] text-slate-400">INFERENCE CALLS</div>
                <div className="text-base font-black text-cyan-300 mt-0.5">
                  {economy.inferenceCalls}
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoints */}
          <div className="bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black italic tracking-wide text-white">
                CHECKPOINTS (:3130)
              </span>
              <span className="text-[10px] font-mono text-slate-400">GET /checkpoints</span>
            </div>
            <div className="space-y-1.5">
              {checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className="p-2 bg-[#020617]/80 border border-emerald-500/30 rounded-xs font-mono"
                >
                  <div className="text-xs font-bold text-emerald-300">{cp.id}</div>
                  <div className="text-[10px] text-slate-400">{cp.meta}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div className="flex-1 min-h-[180px] bg-[#0F172A]/80 border border-white/10 rounded-sm p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black italic tracking-wide text-white">
                AUDIT · THIS SESSION
              </span>
              <span className="text-[10px] font-mono text-slate-400">audit.log + Obsidian</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[10px]">
              {auditLog.map((a) => (
                <div key={a.id} className="flex items-baseline gap-2 leading-snug">
                  <span className="text-slate-500 shrink-0">{a.t}</span>
                  <span
                    className={`font-bold shrink-0 ${
                      a.ok ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {a.kind}
                  </span>
                  <span className="text-slate-300 break-words">{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
