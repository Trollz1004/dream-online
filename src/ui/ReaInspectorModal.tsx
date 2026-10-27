/**
 * DREAM Engine Studio — REA (morluto/rea · Reverse Engineer Anything)
 * Binary & Asset Reverse-Engineering Inspector Workbench.
 * Connects AI agents (Gemini, Claude, Perplexity, Grok, OpenAI Codex, Hermes)
 * to binary header analysis, section/string extraction, MCP tool pipelines
 * (Ghidra, Binwalk, JADX, radare2), and direct 3D world synthesis.
 *
 * Built with Google Gemini — #UntilNoKidInNeed
 */

import React, { useState } from 'react';
import { DreamEngine } from '../engine/engine';
import {
  REA_SAMPLE_BINARIES,
  analyzeReaBinary,
  ReaBinaryAnalysis,
} from '../engine/studioConfig';
import {
  Cpu,
  Upload,
  Sparkles,
  Terminal,
  FileCode,
  Layers,
  PlusCircle,
  X,
  CheckCircle2,
} from 'lucide-react';

interface ReaInspectorModalProps {
  engine: DreamEngine | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReaInspectorModal: React.FC<ReaInspectorModalProps> = ({
  engine,
  isOpen,
  onClose,
}) => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(REA_SAMPLE_BINARIES[0].id);
  const [analysis, setAnalysis] = useState<ReaBinaryAnalysis>(() => {
    const s = REA_SAMPLE_BINARIES[0];
    return analyzeReaBinary(s.fileName, new TextEncoder().encode(s.payload));
  });
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [spawnedNotice, setSpawnedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectSample = async (sampleId: string) => {
    setSelectedSampleId(sampleId);
    setSpawnedNotice(null);
    const sample = REA_SAMPLE_BINARIES.find((s) => s.id === sampleId) || REA_SAMPLE_BINARIES[0];
    const localResult = analyzeReaBinary(
      sample.fileName,
      new TextEncoder().encode(sample.payload)
    );
    setAnalysis(localResult);

    setIsAiBusy(true);
    try {
      const res = await fetch('/api/studio/rea-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: sample.fileName, payload: sample.payload }),
      });
      const data = await res.json();
      if (data?.analysis) {
        setAnalysis(data.analysis);
      }
    } catch {
      // Keep local deterministic analysis
    } finally {
      setIsAiBusy(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSpawnedNotice(null);
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf.slice(0, 16384));
    const localResult = analyzeReaBinary(file.name, bytes);
    setAnalysis(localResult);
  };

  const handleSpawnReaArtifactInWorld = () => {
    if (!engine) return;
    const preset = analysis.suggestedEnginePreset;
    const rx = Number(((Math.random() - 0.5) * 16).toFixed(1));
    const rz = Number((-6 - Math.random() * 12).toFixed(1));
    const entity = engine.studio.addEntity({
      name: preset.name,
      type: 'rea-artifact',
      position: [rx, 0, rz],
      scale: preset.scale,
      rotationYDeg: 25,
      color: preset.color,
      emissiveIntensity: preset.emissiveIntensity,
      sourceNote: `${analysis.format} · Decompiled via morluto/rea`,
    });
    setSpawnedNotice(
      `Spawned "${entity.name}" into 3D World & Radar Minimap at (${rx}, 0, ${rz})!`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0A0B0D] border border-[#3A3F45] rounded-sm shadow-2xl flex flex-col overflow-hidden text-[#F4F1EA]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#020617] border-b border-[#3A3F45]">
          <div>
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                REA · Reverse Engineer Anything (morluto/rea Bridge)
              </h2>
              <span className="text-[11px] font-mono text-cyan-300">
                MCP + Ghidra / Binwalk / radare2 → DREAM 3D Runtime
              </span>
            </div>
            <p className="text-xs text-[#9DA3AA] mt-0.5">
              Inspect compiled binaries, legacy engine archives, and firmware—then synthesize directly into 100% AI-built DREAM Engine assets.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9DA3AA] hover:text-white rounded-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Binary Source Selector & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {REA_SAMPLE_BINARIES.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSample(s.id)}
                className={`p-3 rounded-xs border text-left transition cursor-pointer ${
                  selectedSampleId === s.id
                    ? 'bg-cyan-500/15 border-cyan-400 text-white'
                    : 'bg-[#0F172A]/80 border-[#3A3F45] text-[#C9CBCE] hover:bg-[#1E293B]'
                }`}
              >
                <div className="font-mono font-bold text-[11px] text-cyan-300 truncate">
                  {s.fileName}
                </div>
                <div className="text-[11px] font-semibold mt-0.5">{s.label}</div>
                <div className="text-[10px] text-[#9DA3AA] mt-1 line-clamp-2">{s.description}</div>
              </button>
            ))}

            <label className="p-3 rounded-xs border border-dashed border-[#FFD21E]/60 bg-[#0F172A]/50 hover:bg-[#1E293B]/60 flex flex-col items-center justify-center text-center cursor-pointer transition">
              <Upload className="w-4 h-4 text-[#FFD21E] mb-1" />
              <span className="font-semibold text-[#FFD21E] text-[11px]">
                Upload Custom Binary
              </span>
              <span className="text-[10px] text-[#9DA3AA] mt-0.5">
                .wasm, .glb, .pak, .elf, .exe, .bin
              </span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Binary Header & Entropy Telemetry */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono tabular-nums">
            <div className="p-3 bg-[#0F172A] border border-[#3A3F45] rounded-xs">
              <div className="text-[10px] text-[#9DA3AA]">DETECTED FORMAT</div>
              <div className="text-xs font-bold text-cyan-300 mt-1">{analysis.format}</div>
            </div>
            <div className="p-3 bg-[#0F172A] border border-[#3A3F45] rounded-xs">
              <div className="text-[10px] text-[#9DA3AA]">TARGET ARCHITECTURE</div>
              <div className="text-xs font-bold text-white mt-1">{analysis.architecture}</div>
            </div>
            <div className="p-3 bg-[#0F172A] border border-[#3A3F45] rounded-xs">
              <div className="text-[10px] text-[#9DA3AA]">MAGIC BYTES (HEX)</div>
              <div className="text-xs font-bold text-[#FFD21E] mt-1">{analysis.magicHex}</div>
            </div>
            <div className="p-3 bg-[#0F172A] border border-[#3A3F45] rounded-xs">
              <div className="text-[10px] text-[#9DA3AA]">SIZE & SHANNON ENTROPY</div>
              <div className="text-xs font-bold text-emerald-400 mt-1">
                {analysis.byteLength} B · {analysis.entropy} bits
              </div>
            </div>
          </div>

          {/* Two-Column Sections + Extracted Strings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Binary Section Table</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] tabular-nums">
                {analysis.sections.map((sec) => (
                  <div
                    key={sec.name}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-[#020617] border border-[#3A3F45]/60 rounded-xs"
                  >
                    <span className="text-cyan-300 font-semibold">{sec.name}</span>
                    <span className="text-[#9DA3AA]">{sec.offsetHex}</span>
                    <span className="text-white">{sec.sizeBytes} B</span>
                    <span className="text-emerald-400">{sec.permissions}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[#FFD21E]" />
                <span>Extracted Symbols & ASCII Strings</span>
              </div>
              <div className="p-2.5 bg-[#020617] border border-[#3A3F45]/60 rounded-xs font-mono text-[11px] text-amber-200 max-h-36 overflow-y-auto space-y-1">
                {analysis.extractedStrings.map((s, idx) => (
                  <div key={idx} className="truncate">
                    [{idx.toString().padStart(2, '0')}] "{s}"
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MCP Agent Commands (npx rea-agents) */}
          <div className="p-3.5 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>REA MCP Server & CLI Agent Pipelines (Alienware .40 / T5500 .15)</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {analysis.mcpCommands.map((cmd, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#020617] border border-[#3A3F45]/70 rounded-xs flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">{cmd.tool}</span>
                    <span className="text-[10px] text-[#9DA3AA] font-sans">{cmd.purpose}</span>
                  </div>
                  <code className="text-cyan-200 text-[10px]">{cmd.command}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Gemini Synthesis into 3D Engine */}
          <div className="p-4 bg-[#020617] border border-[#FFD21E]/60 rounded-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFD21E]" />
                <span className="font-bold text-white">
                  {isAiBusy
                    ? 'Google Gemini Decompiling Binary Structure...'
                    : `Synthesized 3D Engine Node: ${analysis.suggestedEnginePreset.name}`}
                </span>
              </div>
              <p className="text-xs text-[#C9CBCE]">
                {analysis.suggestedEnginePreset.summary}
              </p>
              {spawnedNotice && (
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{spawnedNotice}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleSpawnReaArtifactInWorld}
              className="px-4 py-2.5 bg-[#FFD21E] hover:bg-[#ffe055] text-[#0A0B0D] font-bold rounded-xs flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Spawn Decompiled Node in 3D World</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
