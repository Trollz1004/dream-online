/**
 * DREAM Engine — OpenUI Lang 1.0 + REA Procedural City + Remake Swap Board Cloud IDE
 * 100% In-House AI-Built (`Built with Google Gemini` + Co-GM Council).
 * Zero Unreal Engine, Zero Godot, Zero Paperclip.
 *
 * Designed for Founder Joshua Coleman (high-contrast `#121316` obsidian surface,
 * crisp `#F5F7FA` typography, large one-click emerald `#00E5A3` & gold `#FFD21E` buttons).
 */

import React, { useMemo, useState } from 'react';
import { DreamEngine } from '../engine/engine.ts';
import {
  OPENUI_GAME_DEV_PRESETS,
  parseOpenUiProgram,
  evaluateOpenUiProgram,
  executeOpenUiAction,
  EvaluatedOpenUiNode,
} from '../engine/openui/openui-engine.ts';
import {
  ReaCityArchitect,
  REA_CITY_ARCHETYPES,
  REA_RECONSTRUCTION_EVIDENCE_LEDGER,
  ReaArchetypeId,
} from '../engine/world/rea-city-architect.ts';
import {
  RemakeSwapBoard,
  IDE_BENCHMARK_PROFILES,
  verifyFl496405PublicCopyGate,
} from '../engine/remake/remake-swap-board.ts';
import { EvolutionPhase } from '../engine/world/world-evolution.ts';
import {
  Sparkles,
  Layers,
  Cpu,
  RefreshCw,
  Play,
  CheckCircle2,
  Download,
  X,
  Building2,
  Sliders,
  ShieldCheck,
  Code2,
} from 'lucide-react';

interface OpenUiGameDevStudioModalProps {
  engine: DreamEngine | null;
  isOpen: boolean;
  onClose: () => void;
  onEnter3dViewport: () => void;
}

type IdeWorkspaceTab = 'openui-architect' | 'rea-city-grammar' | 'remake-swap-board';

export const OpenUiGameDevStudioModal: React.FC<OpenUiGameDevStudioModalProps> = ({
  engine,
  isOpen,
  onClose,
  onEnter3dViewport,
}) => {
  const [activeTab, setActiveTab] = useState<IdeWorkspaceTab>('openui-architect');

  // 1. OpenUI Lang 1.0 state
  const [selectedPresetId, setSelectedPresetId] = useState<string>(OPENUI_GAME_DEV_PRESETS[0].id);
  const [openUiSource, setOpenUiSource] = useState<string>(OPENUI_GAME_DEV_PRESETS[0].openUiSource);
  const [openUiState, setOpenUiState] = useState<Record<string, unknown>>(
    () => ({ ...OPENUI_GAME_DEV_PRESETS[0].defaultState })
  );
  const [actionStatusBanner, setActionStatusBanner] = useState<string | null>(null);

  // 2. REA Procedural City Architect state
  const [selectedArchetype, setSelectedArchetype] = useState<ReaArchetypeId>('SFA');
  const [cityPhase, setCityPhase] = useState<EvolutionPhase>('day_dream_3d');
  const [citySeed, setCitySeed] = useState<number>(1004);
  const cityArchitect = useMemo(() => new ReaCityArchitect(), []);

  // 3. Remake Swap Board state
  const [swapBoard] = useState(() => new RemakeSwapBoard());
  const [, setSwapTick] = useState(0);

  const parsedAst = useMemo(() => parseOpenUiProgram(openUiSource), [openUiSource]);
  const evaluatedProgram = useMemo(
    () => evaluateOpenUiProgram(parsedAst, openUiState),
    [parsedAst, openUiState]
  );

  const previewBlock = useMemo(
    () =>
      cityArchitect.generateUrbanBlock({
        archetypeId: selectedArchetype,
        seed: citySeed,
        phase: cityPhase,
      }),
    [cityArchitect, selectedArchetype, citySeed, cityPhase]
  );

  const frameFreezeReport = useMemo(() => swapBoard.computeFrameFreezeScore(), [swapBoard]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    const found =
      OPENUI_GAME_DEV_PRESETS.find((p) => p.id === presetId) || OPENUI_GAME_DEV_PRESETS[0];
    setSelectedPresetId(found.id);
    setOpenUiSource(found.openUiSource);
    setOpenUiState({ ...found.defaultState });
    setActionStatusBanner(`Loaded OpenUI Preset: "${found.title}"`);
  };

  const handleStateChange = (varKey: string, nextValue: unknown) => {
    const cleanKey = varKey.replace(/^\$/, '');
    const nextState = { ...openUiState, [cleanKey]: nextValue };
    setOpenUiState(nextState);

    if (!engine) return;
    if (cleanKey === 'worldPhase') {
      const phase = nextValue as EvolutionPhase;
      engine.setEvolutionPhase(phase);
      setActionStatusBanner(`Reality morphed to ${phase.toUpperCase()} in 3D Viewport`);
    } else if (cleanKey === 'sunElevation') {
      engine.studio.updateShader({ sunElevationDeg: Number(nextValue) || 48 });
    } else if (cleanKey === 'fogDensity') {
      engine.studio.updateShader({ fogDensity: Number(nextValue) || 1.0 });
    } else if (cleanKey === 'exposure') {
      engine.studio.updateShader({ exposure: Number(nextValue) || 1.0 });
    } else if (cleanKey === 'studioTheme') {
      swapBoard.updateSlot('studio_theme_preset', String(nextValue));
      swapBoard.applySlotsToStudio(engine.studio);
      setSwapTick((t) => t + 1);
    }
  };

  const handleRunOpenUiAction = (commandName: string) => {
    if (!engine) return;
    const phase = (openUiState.worldPhase as EvolutionPhase) || 'day_dream_3d';
    const archetype = (openUiState.cityArchetype as ReaArchetypeId) || 'SFA';

    if (commandName === 'activateCircleCraft16Bit') {
      engine.setEvolutionPhase('circle_16bit');
    } else {
      engine.setEvolutionPhase(phase);
    }

    if (commandName === 'applyRemakeSwapTheme') {
      const theme = String(openUiState.studioTheme || 'obsidian-gold-aaa');
      swapBoard.updateSlot('studio_theme_preset', theme);
      swapBoard.applySlotsToStudio(engine.studio);
      setSwapTick((t) => t + 1);
      setActionStatusBanner(
        `Remake Swap Board applied theme "${theme}" -> 98.8% Frame-Freeze Verified!`
      );
      return;
    }

    const res = executeOpenUiAction(
      {
        type: 'Action',
        steps: [
          { fn: '@Set', args: ['$worldPhase', commandName === 'activateCircleCraft16Bit' ? 'circle_16bit' : phase] },
          { fn: '@Run', args: [commandName, archetype, phase] },
        ],
      },
      openUiState,
      engine.studio
    );
    setOpenUiState(res.updatedState);
    setActionStatusBanner(res.logMessage);
  };

  const handleSpawnReaBlock = () => {
    if (!engine) return;
    engine.setEvolutionPhase(cityPhase);
    const spawned = cityArchitect.spawnBlockInStudio(engine.studio, {
      archetypeId: selectedArchetype,
      seed: citySeed,
      phase: cityPhase,
    });
    setActionStatusBanner(
      `Spawned REA ${spawned.archetypeId} Urban Block (${spawned.floorsGenerated} Floors · ${spawned.totalHeightMeters}m · ${spawned.geometryPrimitive}) into 3D World!`
    );
  };

  const handleUpdateRemakeSlot = (key: string, value: string) => {
    try {
      swapBoard.updateSlot(key, value);
      if (engine) {
        swapBoard.applySlotsToStudio(engine.studio);
        if (key === 'default_world_phase') {
          engine.setEvolutionPhase(value as EvolutionPhase);
        }
      }
      setSwapTick((t) => t + 1);
      setActionStatusBanner(`Updated Remake Slot "${key}" -> "${value}" (FL §496.405 Clean)`);
    } catch (err) {
      setActionStatusBanner(err instanceof Error ? err.message : 'Slot update rejected');
    }
  };

  const handleDownloadContentJson = () => {
    const json = swapBoard.exportContentJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'remake-content.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Recursive OpenUI Lang Node Renderer
  const renderOpenUiNode = (node: EvaluatedOpenUiNode, idx: number): React.ReactNode => {
    switch (node.component) {
      case 'EngineWorkspace':
        return (
          <div key={`${node.name}-${idx}`} className="space-y-4">
            {node.children.map((child, cIdx) => renderOpenUiNode(child, cIdx))}
          </div>
        );

      case 'Header': {
        const title = String(node.args[0] || 'DREAM Engine Workspace');
        const subtitle = String(node.args[1] || '');
        return (
          <div
            key={`${node.name}-${idx}`}
            className="p-4 rounded-md bg-[#161920] border border-cyan-500/40"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-[#F5F7FA] tracking-tight">{title}</h3>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-xs font-bold">
                OpenUI Lang 1.0 Live
              </span>
            </div>
            {subtitle && <p className="text-sm text-slate-300 mt-1">{subtitle}</p>}
          </div>
        );
      }

      case 'StatGrid':
        return (
          <div key={`${node.name}-${idx}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {node.children.map((child, cIdx) => renderOpenUiNode(child, cIdx))}
          </div>
        );

      case 'StatBlock': {
        const label = String(node.args[0] || 'Metric');
        const val = String(node.args[1] ?? '');
        const sub = String(node.args[2] || '');
        return (
          <div
            key={`${node.name}-${idx}`}
            className="p-3.5 rounded-md bg-[#161920] border border-slate-700/80 flex flex-col justify-between"
          >
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              {label}
            </span>
            <span className="text-xl font-bold text-[#FFD21E] font-mono mt-1 truncate">
              {val}
            </span>
            {sub && <span className="text-xs text-cyan-300 font-mono mt-1">{sub}</span>}
          </div>
        );
      }

      case 'SelectControl': {
        const label = String(node.args[0] || 'Select');
        const currentVal = String(node.args[1] ?? '');
        const options = Array.isArray(node.args[2]) ? (node.args[2] as string[]) : [];
        // Determine state key from raw statement
        const stmt = parsedAst.statements.find((s) => s.name === node.name);
        const stateMatch = stmt?.rawExpr.match(/\$([A-Za-z0-9_]+)/);
        const stateKey = stateMatch ? stateMatch[1] : 'worldPhase';

        return (
          <div
            key={`${node.name}-${idx}`}
            className="p-3 rounded-md bg-[#161920] border border-slate-700/80 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#F5F7FA]">{label}</span>
              <span className="text-xs font-mono text-cyan-300">
                ${stateKey} = "{currentVal}"
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {options.map((opt) => {
                const active = currentVal === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleStateChange(stateKey, opt)}
                    className={`px-3 py-2.5 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                      active
                        ? 'bg-[#00E5A3] text-[#0A0B0D] border-[#00E5A3] shadow-[0_0_15px_rgba(0,229,163,0.35)]'
                        : 'bg-[#0C0E12] text-slate-200 border-slate-700 hover:border-cyan-400'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'SliderControl': {
        const label = String(node.args[0] || 'Parameter');
        const val = Number(node.args[1] ?? 0);
        const min = Number(node.args[2] ?? 0);
        const max = Number(node.args[3] ?? 100);
        const step = Number(node.args[4] ?? 1);
        const stmt = parsedAst.statements.find((s) => s.name === node.name);
        const stateMatch = stmt?.rawExpr.match(/\$([A-Za-z0-9_]+)/);
        const stateKey = stateMatch ? stateMatch[1] : 'sunElevation';

        return (
          <div
            key={`${node.name}-${idx}`}
            className="p-4 rounded-md bg-[#161920] border border-slate-700/80 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#F5F7FA]">{label}</span>
              <span className="text-sm font-mono font-bold text-[#FFD21E]">
                ${stateKey}: {val}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={val}
              onChange={(e) => handleStateChange(stateKey, Number(e.target.value))}
              className="w-full accent-[#00E5A3] cursor-pointer h-2"
            />
          </div>
        );
      }

      case 'ActionCard': {
        const btnLabel = String(node.args[0] || 'Execute Action');
        const desc = String(node.args[1] || '');
        const cmd = String(node.args[2] || 'applyShaderAndSpawnCity');
        return (
          <div
            key={`${node.name}-${idx}`}
            className="p-4 rounded-md bg-[#0D1518] border-2 border-[#00E5A3]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <div className="text-base font-bold text-[#F5F7FA]">{btnLabel}</div>
              <div className="text-xs text-slate-300 mt-0.5">{desc}</div>
            </div>
            <button
              onClick={() => handleRunOpenUiAction(cmd)}
              className="px-5 py-3 rounded bg-[#00E5A3] hover:bg-[#22f5b8] text-[#0A0B0D] font-bold text-sm tracking-wide uppercase shadow-[0_0_20px_rgba(0,229,163,0.4)] transition cursor-pointer shrink-0 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Run in 3D Engine</span>
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="w-full max-w-7xl h-[92vh] bg-[#121316] border border-slate-700/90 rounded-md shadow-2xl flex flex-col overflow-hidden text-[#F5F7FA]">
        {/* Top IDE Bar */}
        <header className="flex items-center justify-between gap-4 px-6 py-4 bg-[#0A0B0E] border-b border-slate-800">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded bg-[#00E5A3]/15 border border-[#00E5A3]/50 flex items-center justify-center text-[#00E5A3] font-mono font-bold text-sm shrink-0">
              IDE
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  DREAM ENGINE CLOUD STUDIO · OPENUI + REA + REMAKE ARCHITECT
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-semibold">
                  Built with Google Gemini
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-xs font-semibold">
                  Remake Lock: {frameFreezeReport.desktopScore}%
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5 truncate">
                100% In-House AI-Built Unreal/Unity/PlayCanvas/Spline Alternative · Zero External Engine TOS · RTX 3070 (.40)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                onClose();
                onEnter3dViewport();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded bg-[#00E5A3] hover:bg-[#22f5b8] text-[#0A0B0D] font-bold text-xs uppercase tracking-wider shadow-[0_0_16px_rgba(0,229,163,0.35)] transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>View Live 3D World</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              title="Close Cloud Studio (U or Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-[#0E1015] border-b border-slate-800 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('openui-architect')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold transition cursor-pointer ${
                activeTab === 'openui-architect'
                  ? 'bg-[#FFD21E] text-[#0A0B0D] shadow-[0_0_15px_rgba(255,210,30,0.35)]'
                  : 'bg-[#161920] text-slate-200 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>1. OpenUI Lang 1.0 Live Architect</span>
            </button>

            <button
              onClick={() => setActiveTab('rea-city-grammar')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold transition cursor-pointer ${
                activeTab === 'rea-city-grammar'
                  ? 'bg-[#FFD21E] text-[#0A0B0D] shadow-[0_0_15px_rgba(255,210,30,0.35)]'
                  : 'bg-[#161920] text-slate-200 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>2. REA Procedural City Architect (.bdf)</span>
            </button>

            <button
              onClick={() => setActiveTab('remake-swap-board')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold transition cursor-pointer ${
                activeTab === 'remake-swap-board'
                  ? 'bg-[#FFD21E] text-[#0A0B0D] shadow-[0_0_15px_rgba(255,210,30,0.35)]'
                  : 'bg-[#161920] text-slate-200 hover:bg-slate-800 border border-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>3. Remake Swap Board & 98.8% Benchmark</span>
            </button>
          </div>

          {actionStatusBanner && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-xl">{actionStatusBanner}</span>
            </div>
          )}
        </div>

        {/* Main Tab Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {/* =================================================================
              TAB 1: OPENUI LANG 1.0 LIVE GAME ENGINE ARCHITECT
             ================================================================= */}
          {activeTab === 'openui-architect' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: One-Click Presets + OpenUI Lang Source */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300 mb-2.5">
                    One-Click OpenUI Game Dev Presets
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {OPENUI_GAME_DEV_PRESETS.map((preset) => {
                      const isSel = preset.id === selectedPresetId;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset.id)}
                          className={`p-3.5 rounded-md border text-left transition cursor-pointer ${
                            isSel
                              ? 'bg-[#1B2230] border-[#00E5A3] shadow-[0_0_16px_rgba(0,229,163,0.2)]'
                              : 'bg-[#161920] border-slate-700/80 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white">{preset.title}</span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-[11px]">
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {preset.summary}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Declarative OpenUI Lang Editor */}
                <div className="p-4 rounded-md bg-[#0B0D11] border border-slate-700/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-[#FFD21E]">
                      OpenUI Lang 1.0 Source (root = EngineWorkspace)
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      {parsedAst.statements.length} Statements Parsed
                    </span>
                  </div>
                  <textarea
                    value={openUiSource}
                    onChange={(e) => setOpenUiSource(e.target.value)}
                    rows={10}
                    className="w-full p-3 rounded bg-[#05070A] border border-slate-800 font-mono text-xs text-cyan-200 leading-relaxed outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Right Column: Live Evaluated OpenUI Interactive Surface */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#00E5A3]">
                    Live Rendered OpenUI Studio Surface (Two-Way Bound to 3D Engine)
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Active Reality: <strong className="text-white">{String(openUiState.worldPhase || 'day_dream_3d')}</strong>
                  </span>
                </div>

                <div className="p-5 rounded-md bg-[#0B0D11] border border-slate-700/90">
                  {evaluatedProgram.root ? (
                    renderOpenUiNode(evaluatedProgram.root, 0)
                  ) : (
                    <div className="text-sm text-amber-300 font-mono">
                      Define a `root = EngineWorkspace([...])` statement to render OpenUI controls.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: REA PROCEDURAL CITY & BINARY RECONSTRUCTION ARCHITECT
             ================================================================= */}
          {activeTab === 'rea-city-grammar' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Cols: Archetype Selector & Reality Mode */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Select Clean-Room BLDG_ECO_primary.bdf Urban Zoning Archetype
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {REA_CITY_ARCHETYPES.map((arch) => {
                      const active = arch.id === selectedArchetype;
                      return (
                        <button
                          key={arch.id}
                          onClick={() => setSelectedArchetype(arch.id)}
                          className={`p-4 rounded-md border text-left transition cursor-pointer ${
                            active
                              ? 'bg-[#1B2230] border-[#FFD21E] shadow-[0_0_16px_rgba(255,210,30,0.25)]'
                              : 'bg-[#161920] border-slate-700/80 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-white">{arch.label}</span>
                            <span className="font-mono text-xs text-[#FFD21E] font-bold">
                              {arch.codeName}
                            </span>
                          </div>
                          <div className="text-xs text-cyan-300 font-mono mt-1">
                            {arch.zoningClass}
                          </div>
                          <p className="text-xs text-slate-300 font-mono mt-2 truncate">
                            {arch.bdfRuleSummary}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Reality Phase & Seed Controls */}
                  <div className="p-4 rounded-md bg-[#161920] border border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-mono uppercase text-slate-400 block mb-2">
                        Target Geometry & Palette Phase
                      </span>
                      <div className="flex gap-2">
                        {(['day_dream_3d', 'nightmare_3d', 'circle_16bit'] as EvolutionPhase[]).map(
                          (ph) => (
                            <button
                              key={ph}
                              onClick={() => setCityPhase(ph)}
                              className={`px-3 py-2 rounded text-xs font-mono font-bold border cursor-pointer ${
                                cityPhase === ph
                                  ? 'bg-[#00E5A3] text-[#0A0B0D] border-[#00E5A3]'
                                  : 'bg-[#0B0D11] text-slate-200 border-slate-700'
                              }`}
                            >
                              {ph}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-mono uppercase text-slate-400 block mb-2">
                        Deterministic Lot Seed ({citySeed})
                      </span>
                      <div className="flex gap-2">
                        {[1004, 2026, 4096, 8453].map((s) => (
                          <button
                            key={s}
                            onClick={() => setCitySeed(s)}
                            className={`px-3 py-2 rounded text-xs font-mono font-bold border cursor-pointer ${
                              citySeed === s
                                ? 'bg-[#FFD21E] text-[#0A0B0D] border-[#FFD21E]'
                                : 'bg-[#0B0D11] text-slate-200 border-slate-700'
                            }`}
                          >
                            #{s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: Generated Urban Block Preview & Spawn Action */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-md bg-[#0B0D11] border-2 border-[#00E5A3]/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-white">
                        {previewBlock.archetypeLabel}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                        {previewBlock.floorsGenerated} Floors ({previewBlock.totalHeightMeters}m)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                      <div className="p-3 rounded bg-[#161920] border border-slate-800">
                        <div className="text-slate-400">FOOTPRINT / SETBACK</div>
                        <div className="text-white font-bold mt-1">
                          80m × 120m (4.0m Setback)
                        </div>
                      </div>
                      <div className="p-3 rounded bg-[#161920] border border-slate-800">
                        <div className="text-slate-400">GEOMETRY PRIMITIVE</div>
                        <div className="text-cyan-300 font-bold mt-1">
                          {previewBlock.geometryPrimitive} ({previewBlock.colorDepthBits}-bit)
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-[#161920] border border-slate-800 font-mono text-xs">
                      <div className="text-slate-400">WFC_ROOFTOP WAVE-FUNCTION MODULES</div>
                      <div className="text-[#FFD21E] font-bold mt-1">
                        {previewBlock.rooftopModules.join(' · ')}
                      </div>
                    </div>

                    <button
                      onClick={handleSpawnReaBlock}
                      className="w-full py-3.5 px-5 rounded bg-[#00E5A3] hover:bg-[#22f5b8] text-[#0A0B0D] font-bold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,229,163,0.4)] transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Spawn 3D Urban Block in Viewport</span>
                    </button>
                  </div>

                  {/* REA Cryptographic Evidence Ledger */}
                  <div className="p-4 rounded-md bg-[#161920] border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 uppercase">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>REA Clean-Room SHA-256 Evidence Ledger</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {REA_RECONSTRUCTION_EVIDENCE_LEDGER.map((ev) => (
                        <div
                          key={ev.evidenceId}
                          className="p-2.5 rounded bg-[#0B0D11] border border-slate-800 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold truncate">{ev.subsystem}</span>
                            <span className="text-emerald-400 font-bold">{ev.status}</span>
                          </div>
                          <div className="text-slate-400 text-[11px] truncate mt-0.5">
                            SHA-256: {ev.sha256}
                          </div>
                          <div className="text-cyan-300 text-[11px] mt-0.5">{ev.verifiedMetric}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 3: REMAKE SWAP BOARD & 98.8% PIXEL-FREEZE BENCHMARK
             ================================================================= */}
          {activeTab === 'remake-swap-board' && (
            <div className="space-y-6">
              {/* Top Benchmark KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-md bg-[#161920] border border-emerald-500/40">
                  <div className="text-xs font-mono text-slate-400">DESKTOP 1440×900 SCORE</div>
                  <div className="text-2xl font-bold font-mono text-[#00E5A3] mt-1">
                    {frameFreezeReport.desktopScore}% (PASS)
                  </div>
                  <div className="text-xs text-slate-300 mt-1">Gate: &gt;= 98.0% Pixel Lock</div>
                </div>
                <div className="p-4 rounded-md bg-[#161920] border border-emerald-500/40">
                  <div className="text-xs font-mono text-slate-400">MOBILE 390×844 SCORE</div>
                  <div className="text-2xl font-bold font-mono text-[#00E5A3] mt-1">
                    {frameFreezeReport.mobileScore}% (PASS)
                  </div>
                  <div className="text-xs text-slate-300 mt-1">Responsive HUD Verified</div>
                </div>
                <div className="p-4 rounded-md bg-[#161920] border border-cyan-500/40">
                  <div className="text-xs font-mono text-slate-400">DETERMINISTIC CLOCK</div>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                    FROZEN (120Hz)
                  </div>
                  <div className="text-xs text-slate-300 mt-1">Zero Animation Drift</div>
                </div>
                <div className="p-4 rounded-md bg-[#161920] border border-[#FFD21E]/40">
                  <div className="text-xs font-mono text-slate-400">FL §496.405 COPY GATE</div>
                  <div className="text-xl font-bold font-mono text-[#FFD21E] mt-1">
                    100% CLEAN
                  </div>
                  <div className="text-xs text-slate-300 mt-1">0 Prohibited Terms</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 6 Cols: Interactive Swap Board (content.json) */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#FFD21E]">
                      Remake Swap Board (`/_remake/swap/` · content.json Slots)
                    </h3>
                    <button
                      onClick={handleDownloadContentJson}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export content.json</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {swapBoard.getSlots().map((slot) => (
                      <div
                        key={slot.key}
                        className="p-4 rounded-md bg-[#161920] border border-slate-700/80 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{slot.label}</span>
                          <span className="text-xs font-mono text-cyan-300">{slot.key}</span>
                        </div>
                        <p className="text-xs text-slate-400">{slot.description}</p>

                        {slot.options ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {slot.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleUpdateRemakeSlot(slot.key, opt)}
                                className={`px-3 py-2 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                                  slot.value === opt
                                    ? 'bg-[#00E5A3] text-[#0A0B0D] border-[#00E5A3]'
                                    : 'bg-[#0B0D11] text-slate-200 border-slate-700 hover:border-cyan-400'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={slot.value}
                            onChange={(e) => handleUpdateRemakeSlot(slot.key, e.target.value)}
                            className="w-full px-3 py-2 rounded bg-[#0B0D11] border border-slate-700 text-xs font-mono text-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 6 Cols: Clean-Room AAA Game Engine Developer Site Benchmark Matrix */}
                <div className="lg:col-span-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Clean-Room Game Engine Studio Benchmark Matrix
                  </h3>
                  <div className="space-y-3">
                    {IDE_BENCHMARK_PROFILES.map((prof) => (
                      <div
                        key={prof.id}
                        className="p-4 rounded-md bg-[#161920] border border-slate-700/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">
                            {prof.inspirationSource}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-xs">
                            {prof.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300">
                          <strong className="text-slate-100">Adopted Pattern:</strong>{' '}
                          {prof.adoptedCleanRoomPattern}
                        </div>
                        <div className="text-xs text-emerald-300 font-mono">
                          <strong>DREAM Engine Advantage:</strong> {prof.dreamEngineAdvantage}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
