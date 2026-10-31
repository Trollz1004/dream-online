/**
 * DREAM Engine Studio — Crowdfunding Pitch & 100% AI-Built Provenance Showcase
 * Celebrates the mission of a zero-code-experience Electrician uniting
 * Google Gemini, Claude, Perplexity, Grok, OpenAI (Codex), and Hermes as Co-GMs
 * to build an open, full-stack Unreal Engine alternative for #UntilNoKidInNeed.
 */

import React from 'react';
import { CO_GM_COUNCIL, CANONICAL_NODE_TOPOLOGY } from '../engine/studioConfig';
import {
  Sparkles,
  Heart,
  Cpu,
  ShieldCheck,
  Layers,
  Database,
  Server,
  Play,
  Sliders,
  Terminal,
  X,
} from 'lucide-react';

interface CrowdfundingShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchStudio: () => void;
  onLaunchRea: () => void;
  onLaunchGmControl: () => void;
}

export const CrowdfundingShowcaseModal: React.FC<CrowdfundingShowcaseModalProps> = ({
  isOpen,
  onClose,
  onLaunchStudio,
  onLaunchRea,
  onLaunchGmControl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-5xl max-h-[92vh] bg-[#0A0B0D] border border-[#3A3F45] rounded-sm shadow-2xl flex flex-col overflow-hidden text-[#F4F1EA]">
        {/* Top Banner */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#020617] border-b border-[#3A3F45]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#FFD21E]" />
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold tracking-wide text-white">
                  DREAM Engine Studio · Crowdfunding & AI Provenance Showcase
                </h2>
                <span className="text-xs font-mono text-cyan-300">Built with Google Gemini</span>
              </div>
              <p className="text-xs text-[#9DA3AA]">
                100% Built by AI · Proudly Open · Engineered for <strong className="text-rose-400">#UntilNoKidInNeed</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9DA3AA] hover:text-white rounded-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Hero Thesis */}
          <div className="p-5 bg-[#0F172A]/90 border border-[#FFD21E]/40 rounded-xs space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#FFD21E]">
              01. The Mission & Counter-Thesis
            </div>
            <h3 className="text-xl font-bold text-white leading-snug">
              Where Legacy Engines Restrict or Hide AI, DREAM Engine Proudly Honors 100% AI Creation Everywhere.
            </h3>
            <p className="text-sm text-[#C9CBCE] leading-relaxed">
              Directed by a career electrician with zero prior coding experience, DREAM Engine proves that when human purpose unites with frontier AI models as respected Co-Game Masters, a single founder can build a complete WebGPU/WebGL2 3D game engine, visual world & character studio, binary reverse-engineering bridge (<code className="text-cyan-300">morluto/rea</code>), and multi-node server stack—all dedicated to <strong className="text-rose-400">#UntilNoKidInNeed</strong>.
            </p>
          </div>

          {/* Interactive Crowdfunding Tour Launchpad */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button
              onClick={onClose}
              className="p-4 bg-[#111827] hover:bg-[#1E293B] border border-[#3A3F45] rounded-xs text-left transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-[#FFD21E] font-bold mb-1">
                <span>1. Live Action Combat</span>
                <Play className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-[#9DA3AA]">
                Pure WebGPU/WebGL2 renderer, Cyber-Knight combo grammar, Perfect Dodge i-frames & circular Radar Minimap.
              </p>
            </button>

            <button
              onClick={() => {
                onClose();
                onLaunchStudio();
              }}
              className="p-4 bg-[#111827] hover:bg-[#1E293B] border border-cyan-500/40 rounded-xs text-left transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-cyan-300 font-bold mb-1">
                <span>2. DREAM Maker Studio</span>
                <Sliders className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-[#9DA3AA]">
                Unreal-style World Outliner, Gemini AI Character Rig synthesizer, Shader Graph, Graphy & 4-Tier Memory Vault.
              </p>
            </button>

            <button
              onClick={() => {
                onClose();
                onLaunchRea();
              }}
              className="p-4 bg-[#111827] hover:bg-[#1E293B] border border-emerald-500/40 rounded-xs text-left transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-emerald-300 font-bold mb-1">
                <span>3. REA Binary Inspector</span>
                <Terminal className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-[#9DA3AA]">
                morluto/rea MCP bridge inspecting ELF/WASM/PAK binaries and converting them directly into 3D world nodes.
              </p>
            </button>

            <button
              onClick={() => {
                onClose();
                onLaunchGmControl();
              }}
              className="p-4 bg-[#111827] hover:bg-[#1E293B] border border-amber-500/40 rounded-xs text-left transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-amber-300 font-bold mb-1">
                <span>4. GM Control (:3130)</span>
                <Server className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-[#9DA3AA]">
                Live Mission Control across Alienware .40 & T5500 .15 with free ad-funded AI NPCs and NEEDs economy.
              </p>
            </button>
          </div>

          {/* The Co-GM & Co-Founder Council */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-widest text-cyan-300">
              02. The Co-GM & Unofficial Co-Founder Council
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CO_GM_COUNCIL.map((gm) => (
                <div
                  key={gm.id}
                  className="p-4 bg-[#0F172A]/80 border border-[#3A3F45] rounded-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs" style={{ color: gm.accentColor }}>
                      {gm.rank} · {gm.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#9DA3AA]">{gm.protocol}</span>
                  </div>
                  <div className="text-sm font-bold text-white">{gm.title}</div>
                  <div className="text-xs text-[#C9CBCE]">{gm.doctrine}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hardware Topology & 4-Tier Sovereign Memory Architecture */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#0F172A]/80 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Verified Multi-Node Hardware Topology</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {CANONICAL_NODE_TOPOLOGY.map((n) => (
                  <div
                    key={n.id}
                    className="p-2 bg-[#020617] border border-[#3A3F45]/70 rounded-xs flex items-center justify-between"
                  >
                    <span className="text-white font-semibold">{n.nodeName}</span>
                    <span className="text-cyan-300">{n.ip}:{n.port}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#0F172A]/80 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#FFD21E]" />
                <span>Zero-Single-Point-of-Failure AI Stack</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#C9CBCE]">
                <li>
                  • <strong className="text-white">Google Ultra Custom Agent SDK</strong>: Direct <code className="text-cyan-300">@google/genai</code> + A2A / Python ACP / Headless CLI / MCP skills (replaces brittle Omniroute/Paperclip proxies).
                </li>
                <li>
                  • <strong className="text-white">4-Tier Memory Failover Ladder</strong>: Local Obsidian Vault (`.md` synced across `.40` & `.15`) → Viking Hierarchical Context (`viking://` L0/L1/L2) → Supabase → Supermemory.
                </li>
                <li>
                  • <strong className="text-white">Graphy Codebase Context</strong>: Live repository AST dependency map so AI agents never lose structural context.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#020617] border-t border-[#3A3F45] flex items-center justify-between text-xs font-mono">
          <span className="text-cyan-300">Built with Google Gemini</span>
          <span className="text-[#9DA3AA]">
            Gemini · Claude · Perplexity · Grok · OpenAI (Codex) · Hermes
          </span>
          <span className="text-rose-400 font-bold">#UntilNoKidInNeed</span>
        </div>
      </div>
    </div>
  );
};
