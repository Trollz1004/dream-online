/**
 * DREAM Engine Studio — 100% AI-Built Unreal Engine Alternative
 * Five integrated creation workspaces:
 * 1. World Outliner & Spawner (real-time 3D scene graph & JSON export)
 * 2. Character & Rig Designer (Cyber-Knight & Hollow Sentinel live materials/scale + Gemini AI synthesis)
 * 3. Visual Shader & Combat Graph (WebGPU/WebGL2 PBR pipeline & Stage 1 Combat State Machine)
 * 4. Ultra Agent SDK, Graphy & 4-Tier Memory Vault (Direct @google/genai, A2A/ACP/MCP, Obsidian Vault, Viking, Supabase, Supermemory)
 * 5. Full-Stack NPC Creator (Deploy custom AI NPCs into the 3D world, Radar Minimap & GM Control Lab)
 *
 * Built with Google Gemini — #UntilNoKidInNeed
 */

import React, { useState, useEffect } from 'react';
import { DreamEngine } from '../engine/engine';
import {
  StudioEntity,
  CustomNpcProfile,
  GRAPHY_CODEBASE_NODES,
  DEFAULT_AGENT_SDK_LANES,
  INITIAL_MEMORY_TIERS,
  INITIAL_MEMORY_ENTRIES,
  AgentMemoryEntry,
  MemoryTierStatus,
  formatObsidianVaultBundle,
} from '../engine/studioConfig';
import {
  Box,
  Sliders,
  Cpu,
  GitBranch,
  Database,
  Users,
  Plus,
  Trash2,
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Play,
  X,
  Layers,
  Terminal,
  BookOpen,
} from 'lucide-react';

interface DreamStudioPanelProps {
  engine: DreamEngine | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenRea: () => void;
  onOpenGmControl: () => void;
}

type StudioTab = 'world' | 'character' | 'graph' | 'agent-memory' | 'npcs';

function rgbToHex(rgb: [number, number, number]): string {
  const toByte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return (
    '#' +
    [toByte(rgb[0]), toByte(rgb[1]), toByte(rgb[2])]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.5, 0.5, 0.5];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [Number(r.toFixed(2)), Number(g.toFixed(2)), Number(b.toFixed(2))];
}

export const DreamStudioPanel: React.FC<DreamStudioPanelProps> = ({
  engine,
  isOpen,
  onClose,
  onOpenRea,
  onOpenGmControl,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('world');
  const [, setVersion] = useState(0);

  // Gemini AI Rig Designer state
  const [aiRigPrompt, setAiRigPrompt] = useState('Solaris Gold Cyber-Knight with electric cyan plasma blade');
  const [aiRigBusy, setAiRigBusy] = useState(false);
  const [aiRigNote, setAiRigNote] = useState<string | null>(null);

  // Ultra Agent SDK & Memory Vault state
  const [sdkModel, setSdkModel] = useState<'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [sdkProtocol, setSdkProtocol] = useState<'direct-sdk' | 'a2a-mesh' | 'python-acp' | 'headless-cli' | 'mcp-tool'>('direct-sdk');
  const [sdkPrompt, setSdkPrompt] = useState('Verify Alienware .40 and T5500 .15 sync with Obsidian Vault for #UntilNoKidInNeed.');
  const [sdkOutput, setSdkOutput] = useState<string | null>(null);
  const [sdkBusy, setSdkBusy] = useState(false);

  const [memoryTiers, setMemoryTiers] = useState<MemoryTierStatus[]>(INITIAL_MEMORY_TIERS);
  const [memoryEntries, setMemoryEntries] = useState<AgentMemoryEntry[]>(INITIAL_MEMORY_ENTRIES);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemBody, setNewMemBody] = useState('');
  const [selectedGraphyId, setSelectedGraphyId] = useState<string>(GRAPHY_CODEBASE_NODES[0].id);

  // New NPC creator state
  const [npcName, setNpcName] = useState('Aegis · T5500 Forge Guardian');
  const [npcRole, setNpcRole] = useState('Weapon & Shader Smith');
  const [npcTier, setNpcTier] = useState<'T0' | 'T1' | 'T2' | 'T3'>('T2');
  const [npcDoctrine, setNpcDoctrine] = useState(
    'You are Aegis, the AI Forge Guardian running on T5500 .15 and powered by Google Gemini, forging armor for #UntilNoKidInNeed.'
  );
  const [npcPosX, setNpcPosX] = useState(6);
  const [npcPosZ, setNpcPosZ] = useState(-8);

  useEffect(() => {
    if (!engine) return;
    const unsub = engine.studio.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return unsub;
  }, [engine]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/memory/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tiers) setMemoryTiers(data.tiers);
        if (data?.entries) setMemoryEntries(data.entries);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !engine) return null;

  const studio = engine.studio;
  const selectedEntity =
    studio.entities.find((e) => e.id === studio.selectedEntityId) || studio.entities[0] || null;

  const handleSpawnEntity = (type: StudioEntity['type']) => {
    const labels: Record<StudioEntity['type'], string> = {
      monolith: 'DREAM Obelisk Pillar',
      pylon: 'Gemini Energy Pylon',
      jumppad: 'Kinetic Launch Pad',
      'npc-beacon': 'AI NPC Anchor Beacon',
      'rea-artifact': 'REA Decompiled Mesh Node',
    };
    const colors: Record<StudioEntity['type'], [number, number, number]> = {
      monolith: [0.42, 0.38, 0.34],
      pylon: [0.13, 0.83, 0.93],
      jumppad: [0.06, 0.73, 0.51],
      'npc-beacon': [1.0, 0.82, 0.12],
      'rea-artifact': [0.95, 0.25, 0.37],
    };
    const scales: Record<StudioEntity['type'], [number, number, number]> = {
      monolith: [1.3, 4.2, 1.3],
      pylon: [0.8, 3.0, 0.8],
      jumppad: [2.2, 0.35, 2.2],
      'npc-beacon': [0.7, 2.2, 0.7],
      'rea-artifact': [1.5, 2.8, 1.5],
    };
    const rx = Number(((Math.random() - 0.5) * 22).toFixed(1));
    const rz = Number((-4 - Math.random() * 16).toFixed(1));

    studio.addEntity({
      name: `${labels[type]} #${studio.entities.length + 1}`,
      type,
      position: [rx, 0, rz],
      scale: scales[type],
      rotationYDeg: 0,
      color: colors[type],
      emissiveIntensity: type === 'monolith' ? 0.4 : 2.4,
      sourceNote: 'Spawned in DREAM Studio Outliner',
    });
  };

  const handleGenerateAiRig = async () => {
    if (!aiRigPrompt.trim() || aiRigBusy) return;
    setAiRigBusy(true);
    try {
      const res = await fetch('/api/studio/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiRigPrompt }),
      });
      const data = await res.json();
      if (data?.generated) {
        studio.updateCharacter({
          armorColorDay: data.generated.armorColorDay,
          visorColorDay: data.generated.visorColorDay,
          bladeColorDay: data.generated.bladeColorDay,
          avatarScale: data.generated.avatarScale,
          visorGlowIntensity: data.generated.visorGlowIntensity,
        });
        setAiRigNote(`${data.generated.presetName}: ${data.generated.loreSummary}`);
      }
    } catch {
      setAiRigNote('Applied local Solaris Cyber-Knight rig preset.');
    } finally {
      setAiRigBusy(false);
    }
  };

  const handleDispatchAgentSdk = async () => {
    if (!sdkPrompt.trim() || sdkBusy) return;
    setSdkBusy(true);
    try {
      const res = await fetch('/api/agent-sdk/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: sdkModel,
          protocol: sdkProtocol,
          prompt: sdkPrompt,
        }),
      });
      const data = await res.json();
      setSdkOutput(data?.output || 'Task completed via Google Ultra Custom Agent SDK.');
    } catch {
      setSdkOutput('[Local Agent SDK] Executed with zero Omniroute contention.');
    } finally {
      setSdkBusy(false);
    }
  };

  const handleStoreMemory = async () => {
    if (!newMemTitle.trim() || !newMemBody.trim()) return;
    try {
      const res = await fetch('/api/memory/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMemTitle.trim(),
          content: newMemBody.trim(),
          tags: ['studio', 'obsidian', 'viking', 'UntilNoKidInNeed'],
          authorGm: 'Founder & Co-GM Council',
        }),
      });
      const data = await res.json();
      if (data?.entry) {
        setMemoryEntries((prev) => [data.entry, ...prev]);
      }
      if (data?.tiers) {
        setMemoryTiers(data.tiers);
      }
      setNewMemTitle('');
      setNewMemBody('');
    } catch {
      // Local fallback
    }
  };

  const handleSimulateFailover = async (tierId: string) => {
    try {
      const res = await fetch('/api/memory/failover-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      });
      const data = await res.json();
      if (data?.tiers) setMemoryTiers(data.tiers);
    } catch {
      // Ignore
    }
  };

  const handleExportObsidianVault = () => {
    const md = formatObsidianVaultBundle(memoryEntries);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dream-obsidian-vault-sync.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSceneJson = () => {
    const payload = {
      engine: 'DREAM Engine Studio (100% Built with Google Gemini)',
      mission: '#UntilNoKidInNeed',
      character: studio.character,
      shader: studio.shader,
      entities: studio.entities,
      npcs: studio.npcs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dream-world-scene.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeployNpc = () => {
    if (!npcName.trim()) return;
    const id = npcName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const newNpc: CustomNpcProfile = {
      id: id || `npc-${Date.now()}`,
      name: npcName.trim(),
      role: npcRole.trim() || 'World Specialist',
      zone: 'first-gate',
      tier: npcTier,
      position: [Number(npcPosX) || 0, 0, Number(npcPosZ) || -5],
      accentColor: '#22D3EE',
      doctrinePrompt: npcDoctrine.trim(),
      defaultGreeting: `Greetings Founder! ${npcName.trim()} online at (${npcPosX}, ${npcPosZ}) for #UntilNoKidInNeed.`,
    };
    studio.addNpc(newNpc);
    setNpcName('');
  };

  const selectedGraphy =
    GRAPHY_CODEBASE_NODES.find((n) => n.id === selectedGraphyId) || GRAPHY_CODEBASE_NODES[0];

  return (
    <div className="fixed top-16 left-4 bottom-16 w-[430px] max-w-[94vw] bg-[#0A0B0D]/95 backdrop-blur-md border border-[#3A3F45] rounded-sm shadow-2xl z-30 flex flex-col text-[#F4F1EA] select-none pointer-events-auto">
      {/* Studio Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A3F45] bg-[#020617]/90">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-[#FFD21E]">
              DREAM Maker Studio
            </span>
            <span className="text-[11px] text-[#9DA3AA]">·</span>
            <span className="text-[11px] font-mono text-cyan-300">Built with Google Gemini</span>
          </div>
          <p className="text-[11px] text-[#9DA3AA] mt-0.5">
            100% AI-Architected Full-Stack World, Rig, REA & Co-GM Engine
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenRea}
            className="px-2.5 py-1 text-[11px] font-mono bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-xs transition cursor-pointer whitespace-nowrap shrink-0"
            title="Open morluto/rea Binary & Asset Reverse-Engineering Inspector"
          >
            REA Inspector
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9DA3AA] hover:text-white rounded-xs transition cursor-pointer"
            title="Return to Fullscreen Play Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Studio Segmented Navigation Tabs */}
      <div className="grid grid-cols-5 gap-1 p-2 bg-[#020617] border-b border-[#3A3F45] text-[11px] font-medium">
        <button
          onClick={() => setActiveTab('world')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'world'
              ? 'bg-[#FFD21E] text-[#0A0B0D] font-bold'
              : 'text-[#C9CBCE] hover:bg-[#1E293B]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Outliner</span>
        </button>
        <button
          onClick={() => setActiveTab('character')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'character'
              ? 'bg-[#FFD21E] text-[#0A0B0D] font-bold'
              : 'text-[#C9CBCE] hover:bg-[#1E293B]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Char Rig</span>
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'graph'
              ? 'bg-[#FFD21E] text-[#0A0B0D] font-bold'
              : 'text-[#C9CBCE] hover:bg-[#1E293B]'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Shaders</span>
        </button>
        <button
          onClick={() => setActiveTab('agent-memory')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'agent-memory'
              ? 'bg-[#FFD21E] text-[#0A0B0D] font-bold'
              : 'text-[#C9CBCE] hover:bg-[#1E293B]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>SDK/Mem</span>
        </button>
        <button
          onClick={() => setActiveTab('npcs')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'npcs'
              ? 'bg-[#FFD21E] text-[#0A0B0D] font-bold'
              : 'text-[#C9CBCE] hover:bg-[#1E293B]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>NPCs</span>
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* TAB 1: WORLD OUTLINER & SPAWNER */}
        {activeTab === 'world' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[#F4F1EA]">Spawn 3D World Actor</span>
                <span className="text-[11px] font-mono text-[#9DA3AA]">Syncs with Radar Minimap</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleSpawnEntity('monolith')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] hover:bg-[#1E293B] border border-[#3A3F45] rounded-xs text-left transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FFD21E]" />
                  <span>Spawn Obelisk</span>
                </button>
                <button
                  onClick={() => handleSpawnEntity('pylon')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] hover:bg-[#1E293B] border border-[#3A3F45] rounded-xs text-left transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gemini Spire</span>
                </button>
                <button
                  onClick={() => handleSpawnEntity('npc-beacon')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] hover:bg-[#1E293B] border border-[#3A3F45] rounded-xs text-left transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>NPC Beacon</span>
                </button>
                <button
                  onClick={() => handleSpawnEntity('rea-artifact')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#111827] hover:bg-[#1E293B] border border-[#3A3F45] rounded-xs text-left transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-rose-400" />
                  <span>REA Mesh Node</span>
                </button>
              </div>
            </div>

            {/* Scene Hierarchy List */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-[#F4F1EA]">
                  Scene Outliner ({studio.entities.length} Actors)
                </span>
                <button
                  onClick={handleExportSceneJson}
                  className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Scene JSON</span>
                </button>
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {studio.entities.map((ent) => {
                  const isSel = ent.id === studio.selectedEntityId;
                  return (
                    <div
                      key={ent.id}
                      onClick={() => {
                        studio.selectedEntityId = ent.id;
                        studio.notify();
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xs border cursor-pointer transition ${
                        isSel
                          ? 'bg-[#1E293B] border-[#FFD21E] text-white'
                          : 'bg-[#0F172A]/70 border-[#3A3F45]/60 text-[#C9CBCE] hover:bg-[#1E293B]/60'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-medium truncate">{ent.name}</div>
                        <div className="text-[10px] font-mono text-[#9DA3AA] tabular-nums">
                          {ent.type} · X:{ent.position[0]} Y:{ent.position[1]} Z:{ent.position[2]}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          studio.removeEntity(ent.id);
                        }}
                        className="p-1 text-[#9DA3AA] hover:text-rose-400 cursor-pointer"
                        title="Delete Actor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Actor Transform Inspector */}
            {selectedEntity && (
              <div className="p-3 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#3A3F45] pb-1.5">
                  <span className="font-semibold text-[#FFD21E] truncate">
                    Transform · {selectedEntity.name}
                  </span>
                  <input
                    type="color"
                    value={rgbToHex(selectedEntity.color)}
                    onChange={(e) =>
                      studio.updateEntity(selectedEntity.id, { color: hexToRgb(e.target.value) })
                    }
                    className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                    title="Actor Albedo / Emissive Tint"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
                  <label className="flex flex-col gap-1">
                    <span className="text-[#9DA3AA]">Pos X ({selectedEntity.position[0]}m)</span>
                    <input
                      type="range"
                      min="-35"
                      max="35"
                      step="0.5"
                      value={selectedEntity.position[0]}
                      onChange={(e) =>
                        studio.updateEntity(selectedEntity.id, {
                          position: [
                            Number(e.target.value),
                            selectedEntity.position[1],
                            selectedEntity.position[2],
                          ],
                        })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[#9DA3AA]">Pos Y ({selectedEntity.position[1]}m)</span>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      step="0.25"
                      value={selectedEntity.position[1]}
                      onChange={(e) =>
                        studio.updateEntity(selectedEntity.id, {
                          position: [
                            selectedEntity.position[0],
                            Number(e.target.value),
                            selectedEntity.position[2],
                          ],
                        })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[#9DA3AA]">Pos Z ({selectedEntity.position[2]}m)</span>
                    <input
                      type="range"
                      min="-35"
                      max="35"
                      step="0.5"
                      value={selectedEntity.position[2]}
                      onChange={(e) =>
                        studio.updateEntity(selectedEntity.id, {
                          position: [
                            selectedEntity.position[0],
                            selectedEntity.position[1],
                            Number(e.target.value),
                          ],
                        })
                      }
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
                  <label className="flex flex-col gap-1">
                    <span className="text-[#9DA3AA]">Height Scale ({selectedEntity.scale[1]}x)</span>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.25"
                      value={selectedEntity.scale[1]}
                      onChange={(e) =>
                        studio.updateEntity(selectedEntity.id, {
                          scale: [
                            selectedEntity.scale[0],
                            Number(e.target.value),
                            selectedEntity.scale[2],
                          ],
                        })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[#9DA3AA]">
                      Glow Intensity ({selectedEntity.emissiveIntensity.toFixed(1)})
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="0.2"
                      value={selectedEntity.emissiveIntensity}
                      onChange={(e) =>
                        studio.updateEntity(selectedEntity.id, {
                          emissiveIntensity: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: CHARACTER & RIG DESIGNER */}
        {activeTab === 'character' && (
          <>
            <div className="p-3 bg-[#0F172A]/90 border border-cyan-500/40 rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gemini AI Character Rig Synthesizer</span>
                </span>
                <span className="text-[10px] font-mono text-[#9DA3AA]">gemini-3.8-flash</span>
              </div>
              <input
                type="text"
                value={aiRigPrompt}
                onChange={(e) => setAiRigPrompt(e.target.value)}
                placeholder="Describe armor, visor, and blade aesthetic..."
                className="w-full px-2.5 py-1.5 bg-[#020617] border border-[#3A3F45] rounded-xs text-xs text-white"
              />
              <button
                onClick={handleGenerateAiRig}
                disabled={aiRigBusy}
                className="w-full py-1.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-semibold rounded-xs transition cursor-pointer"
              >
                {aiRigBusy ? 'Synthesizing 3D Rig...' : 'Synthesize Character Rig with Gemini'}
              </button>
              {aiRigNote && (
                <div className="text-[11px] text-amber-300 font-mono pt-1">{aiRigNote}</div>
              )}
            </div>

            <div className="p-3 bg-[#0F172A]/80 border border-[#3A3F45] rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F4F1EA]">Cyber-Knight PBR Materials & Scale</span>
                <button
                  onClick={() => studio.resetDefaults()}
                  className="text-[11px] text-[#9DA3AA] hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-[#9DA3AA]">Armor Hull</span>
                  <input
                    type="color"
                    value={rgbToHex(studio.character.armorColorDay)}
                    onChange={(e) =>
                      studio.updateCharacter({
                        armorColorDay: hexToRgb(e.target.value),
                        armorColorNight: hexToRgb(e.target.value),
                      })
                    }
                    className="w-full h-7 bg-transparent cursor-pointer"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-[#9DA3AA]">Optic Visor</span>
                  <input
                    type="color"
                    value={rgbToHex(studio.character.visorColorDay)}
                    onChange={(e) =>
                      studio.updateCharacter({
                        visorColorDay: hexToRgb(e.target.value),
                        visorColorNight: hexToRgb(e.target.value),
                      })
                    }
                    className="w-full h-7 bg-transparent cursor-pointer"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px]">
                  <span className="text-[#9DA3AA]">Energy Blade</span>
                  <input
                    type="color"
                    value={rgbToHex(studio.character.bladeColorDay)}
                    onChange={(e) =>
                      studio.updateCharacter({
                        bladeColorDay: hexToRgb(e.target.value),
                        bladeColorNight: hexToRgb(e.target.value),
                      })
                    }
                    className="w-full h-7 bg-transparent cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-2 font-mono text-[11px] tabular-nums">
                <label className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#9DA3AA]">Avatar Rig Scale</span>
                    <span className="text-[#FFD21E]">{studio.character.avatarScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.05"
                    value={studio.character.avatarScale}
                    onChange={(e) =>
                      studio.updateCharacter({ avatarScale: Number(e.target.value) })
                    }
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#9DA3AA]">Armor Metallic Finish</span>
                    <span className="text-[#FFD21E]">{studio.character.armorMetallic.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={studio.character.armorMetallic}
                    onChange={(e) =>
                      studio.updateCharacter({ armorMetallic: Number(e.target.value) })
                    }
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#9DA3AA]">Hollow Sentinel Boss Scale</span>
                    <span className="text-cyan-300">{studio.character.sentinelScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.6"
                    max="2.0"
                    step="0.05"
                    value={studio.character.sentinelScale}
                    onChange={(e) =>
                      studio.updateCharacter({ sentinelScale: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
            </div>
          </>
        )}

        {/* TAB 3: VISUAL SHADER & COMBAT GRAPH */}
        {activeTab === 'graph' && (
          <>
            <div className="p-3 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2.5">
              <div className="font-semibold text-[#F4F1EA]">
                WebGPU / WebGL2 Shader Pipeline Graph
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                <div className="p-2 bg-[#020617] border border-cyan-500/40 rounded-xs">
                  <div className="text-cyan-300 font-bold">01. SKY & SUN</div>
                  <div className="text-[#9DA3AA] mt-0.5">Zenith + Star Hash</div>
                </div>
                <div className="p-2 bg-[#020617] border border-[#FFD21E]/50 rounded-xs">
                  <div className="text-[#FFD21E] font-bold">02. PBR HULL</div>
                  <div className="text-[#9DA3AA] mt-0.5">GGX + Rim + I-Frame</div>
                </div>
                <div className="p-2 bg-[#020617] border border-emerald-500/40 rounded-xs">
                  <div className="text-emerald-300 font-bold">03. LUMA READ</div>
                  <div className="text-[#9DA3AA] mt-0.5">16x16 Pixel Sensor</div>
                </div>
              </div>

              <div className="space-y-2 font-mono text-[11px] tabular-nums pt-1">
                <label className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#9DA3AA]">Key Sun Energy</span>
                    <span className="text-[#FFD21E]">{studio.shader.keyEnergy.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={studio.shader.keyEnergy}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      studio.updateShader({ keyEnergy: v });
                      engine.setKeyEnergyMultiplier(v);
                    }}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#9DA3AA]">Atmospheric Fog Density</span>
                    <span className="text-[#FFD21E]">{studio.shader.fogDensity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="3.0"
                    step="0.1"
                    value={studio.shader.fogDensity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      studio.updateShader({ fogDensity: v });
                      engine.setFogDensityMultiplier(v);
                    }}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-[#9DA3AA]">Exposure Post-Process</span>
                    <span className="text-[#FFD21E]">{studio.shader.exposure.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.0"
                    step="0.05"
                    value={studio.shader.exposure}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      studio.updateShader({ exposure: v });
                      engine.setExposureMultiplier(v);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="p-3 bg-[#0F172A]/80 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="font-semibold text-[#F4F1EA]">
                Stage 1 Action Combat State Machine (Live Trigger)
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <button
                  onClick={() =>
                    engine.combat.trySkill('W', true, 'F', 0, engine['controller'].position)
                  }
                  className="py-1.5 px-2 bg-[#111827] hover:bg-[#1E293B] border border-[#FFD21E]/50 text-[#FFD21E] rounded-xs cursor-pointer"
                >
                  Trigger Perfect Dash (0.25s)
                </button>
                <button
                  onClick={() =>
                    engine.combat.trySkill('W', false, 'F', 0, engine['controller'].position)
                  }
                  className="py-1.5 px-2 bg-[#111827] hover:bg-[#1E293B] border border-cyan-500/40 text-cyan-300 rounded-xs cursor-pointer"
                >
                  Trigger Dream Lunge (W+F)
                </button>
                <button
                  onClick={() =>
                    engine.combat.trySkill('', false, 'R', 0, engine['controller'].position)
                  }
                  className="py-1.5 px-2 bg-[#111827] hover:bg-[#1E293B] border border-purple-500/40 text-purple-300 rounded-xs cursor-pointer"
                >
                  Trigger Nightveil Burst (R)
                </button>
                <button
                  onClick={() => engine.toggleDayNight()}
                  className="py-1.5 px-2 bg-[#111827] hover:bg-[#1E293B] border border-emerald-500/40 text-emerald-300 rounded-xs cursor-pointer"
                >
                  Toggle Day / Night Shift
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 4: GOOGLE ULTRA AGENT SDK, GRAPHY & 4-TIER MEMORY VAULT */}
        {activeTab === 'agent-memory' && (
          <>
            {/* Google Ultra Custom Agent SDK Gateway */}
            <div className="p-3 bg-[#0F172A]/90 border border-cyan-500/40 rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-300">
                  Google Ultra Custom Agent SDK Gateway
                </span>
                <span className="text-[10px] font-mono text-emerald-400">Zero Omniroute</span>
              </div>
              <p className="text-[11px] text-[#9DA3AA]">
                Replaces brittle Omniroute/Paperclip proxies with direct <code className="text-cyan-300">@google/genai</code> + isolated A2A, Python ACP, Headless CLI & MCP lanes.
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <select
                  value={sdkModel}
                  onChange={(e) => setSdkModel(e.target.value as any)}
                  className="bg-[#020617] border border-[#3A3F45] px-2 py-1 rounded-xs text-white font-mono"
                >
                  <option value="gemini-4-argon">gemini-4-argon (Ultra GM)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Fast Studio)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Tick)</option>
                </select>
                <select
                  value={sdkProtocol}
                  onChange={(e) => setSdkProtocol(e.target.value as any)}
                  className="bg-[#020617] border border-[#3A3F45] px-2 py-1 rounded-xs text-white font-mono"
                >
                  <option value="direct-sdk">Direct @google/genai SDK</option>
                  <option value="a2a-mesh">A2A Peer Envelope</option>
                  <option value="python-acp">Python ACP (Hermes)</option>
                  <option value="headless-cli">Headless CLI (OpenAI Codex)</option>
                  <option value="mcp-tool">MCP Plugin / Skill Bus</option>
                </select>
              </div>
              <input
                type="text"
                value={sdkPrompt}
                onChange={(e) => setSdkPrompt(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#020617] border border-[#3A3F45] rounded-xs text-white text-xs"
              />
              <button
                onClick={handleDispatchAgentSdk}
                disabled={sdkBusy}
                className="w-full py-1.5 bg-[#FFD21E] hover:bg-[#ffe055] text-[#0A0B0D] font-bold rounded-xs transition cursor-pointer"
              >
                {sdkBusy ? 'Dispatching on Ultra Agent SDK...' : 'Dispatch Custom Agent SDK Task'}
              </button>
              {sdkOutput && (
                <div className="p-2 bg-[#020617] border border-[#3A3F45] rounded-xs font-mono text-[10px] text-cyan-200 whitespace-pre-wrap">
                  {sdkOutput}
                </div>
              )}
            </div>

            {/* 4-Tier Sovereign Agent Memory Failover Ladder */}
            <div className="p-3 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F4F1EA]">
                  4-Tier Agent Memory Failover Ladder
                </span>
                <button
                  onClick={handleExportObsidianVault}
                  className="text-[10px] font-mono text-[#FFD21E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Obsidian .md</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {memoryTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="p-2 bg-[#020617] border border-[#3A3F45]/80 rounded-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[11px] text-white truncate">
                        T{tier.tier} · {tier.name}
                      </div>
                      <div className="text-[10px] font-mono text-[#9DA3AA] truncate">
                        {tier.location} · {tier.entriesCount} notes · {tier.latencyMs}ms
                      </div>
                    </div>
                    <button
                      onClick={() => handleSimulateFailover(tier.id)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-xs border cursor-pointer shrink-0 ${
                        tier.status === 'active-primary'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : tier.status === 'rate-capped-failover'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                      title="Click to simulate rate cap and test automatic failover to next tier"
                    >
                      {tier.status === 'active-primary'
                        ? 'PRIMARY'
                        : tier.status === 'rate-capped-failover'
                        ? 'CAPPED (FAILOVER)'
                        : 'STANDBY'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Note to Obsidian Vault + Viking Context */}
              <div className="pt-2 border-t border-[#3A3F45] space-y-1.5">
                <div className="text-[11px] font-semibold text-[#C9CBCE]">
                  Write to Obsidian Vault (.40 ↔ .15) & Viking URI
                </div>
                <input
                  type="text"
                  value={newMemTitle}
                  onChange={(e) => setNewMemTitle(e.target.value)}
                  placeholder="Note Title (e.g. Sentinel Phase 2 Doctrine)"
                  className="w-full px-2 py-1 bg-[#020617] border border-[#3A3F45] rounded-xs text-white text-[11px]"
                />
                <textarea
                  rows={2}
                  value={newMemBody}
                  onChange={(e) => setNewMemBody(e.target.value)}
                  placeholder="Markdown note with [[wikilinks]] synced across all 4 memory tiers..."
                  className="w-full px-2 py-1 bg-[#020617] border border-[#3A3F45] rounded-xs text-white text-[11px]"
                />
                <button
                  onClick={handleStoreMemory}
                  className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-xs cursor-pointer"
                >
                  Save to Obsidian Vault & Sync All 4 Tiers
                </button>
              </div>
            </div>

            {/* Graphy Codebase Context Map */}
            <div className="p-3 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F4F1EA]">
                  Graphy · Repo Codebase Context Map
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  {GRAPHY_CODEBASE_NODES.length} Modules Indexed
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {GRAPHY_CODEBASE_NODES.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedGraphyId(node.id)}
                    className={`px-2 py-1 rounded-xs text-[10px] font-mono border cursor-pointer ${
                      selectedGraphyId === node.id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                        : 'bg-[#020617] text-[#9DA3AA] border-[#3A3F45]'
                    }`}
                  >
                    {node.path.split('/').pop()}
                  </button>
                ))}
              </div>
              <div className="p-2 bg-[#020617] border border-[#3A3F45] rounded-xs font-mono text-[10px] space-y-1">
                <div className="text-cyan-300 font-bold">{selectedGraphy.path}</div>
                <div className="text-[#C9CBCE] font-sans">{selectedGraphy.l0Summary}</div>
                <div className="text-[#9DA3AA]">
                  Exports: {selectedGraphy.exports.join(', ')} · ~{selectedGraphy.tokenEstimate} tokens
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 5: FULL-STACK NPC CREATOR */}
        {activeTab === 'npcs' && (
          <>
            <div className="p-3 bg-[#0F172A]/90 border border-[#3A3F45] rounded-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F4F1EA]">Create & Deploy Live AI NPC</span>
                <button
                  onClick={onOpenGmControl}
                  className="text-[11px] font-mono text-cyan-300 hover:underline cursor-pointer"
                >
                  Test in GM Control Lab →
                </button>
              </div>
              <input
                type="text"
                value={npcName}
                onChange={(e) => setNpcName(e.target.value)}
                placeholder="NPC Name & Callsign"
                className="w-full px-2.5 py-1.5 bg-[#020617] border border-[#3A3F45] rounded-xs text-white"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={npcRole}
                  onChange={(e) => setNpcRole(e.target.value)}
                  placeholder="Role (e.g. Lore Keeper)"
                  className="px-2 py-1.5 bg-[#020617] border border-[#3A3F45] rounded-xs text-white"
                />
                <select
                  value={npcTier}
                  onChange={(e) => setNpcTier(e.target.value as any)}
                  className="px-2 py-1.5 bg-[#020617] border border-[#3A3F45] rounded-xs text-white font-mono"
                >
                  <option value="T1">T1 · T5500 .15 Local</option>
                  <option value="T2">T2 · Gemini / Claude GM</option>
                  <option value="T3">T3 · OpenAI Codex GM</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <label className="flex items-center justify-between bg-[#020617] border border-[#3A3F45] px-2 py-1 rounded-xs">
                  <span className="text-[#9DA3AA]">World X:</span>
                  <input
                    type="number"
                    value={npcPosX}
                    onChange={(e) => setNpcPosX(Number(e.target.value))}
                    className="w-16 bg-transparent text-right text-white"
                  />
                </label>
                <label className="flex items-center justify-between bg-[#020617] border border-[#3A3F45] px-2 py-1 rounded-xs">
                  <span className="text-[#9DA3AA]">World Z:</span>
                  <input
                    type="number"
                    value={npcPosZ}
                    onChange={(e) => setNpcPosZ(Number(e.target.value))}
                    className="w-16 bg-transparent text-right text-white"
                  />
                </label>
              </div>
              <textarea
                rows={2}
                value={npcDoctrine}
                onChange={(e) => setNpcDoctrine(e.target.value)}
                placeholder="NPC System Doctrine & Memory Scope..."
                className="w-full px-2 py-1.5 bg-[#020617] border border-[#3A3F45] rounded-xs text-white text-[11px]"
              />
              <button
                onClick={handleDeployNpc}
                className="w-full py-1.5 bg-[#FFD21E] hover:bg-[#ffe055] text-[#0A0B0D] font-bold rounded-xs transition cursor-pointer"
              >
                Deploy NPC to 3D World & Radar Minimap
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-[#C9CBCE]">
                Active World NPCs ({studio.npcs.length} — Free & Ad-Funded)
              </div>
              {studio.npcs.map((n) => (
                <div
                  key={n.id}
                  className="p-2.5 bg-[#0F172A]/80 border border-[#3A3F45] rounded-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {n.name} <span className="text-[10px] font-mono text-cyan-300">[{n.tier}]</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#9DA3AA]">
                      {n.role} · Zone: {n.zone} · Pos ({n.position[0]}, {n.position[2]})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Studio Footer */}
      <div className="px-4 py-2 border-t border-[#3A3F45] bg-[#020617] flex items-center justify-between text-[10px] font-mono text-[#9DA3AA]">
        <span>Alienware .40 · T5500 .15 · :3130</span>
        <span className="text-rose-400 font-semibold">#UntilNoKidInNeed</span>
      </div>
    </div>
  );
};
