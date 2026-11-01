/**
 * DREAM Engine — System, Movable PvP GUI Layout, & Oathcall/Township Tuning Settings Modal
 * Calm, dark, see-through HUD interface with sliders for Graphics, Camera, Controls,
 * Movable PvP GUI Action Bars & Shift+Right-Click Map Pings, and Founder Oathcall/Township Tuning.
 */

import React, { useState } from 'react';
import {
  Sliders,
  Sun,
  Eye,
  Volume2,
  VolumeX,
  Compass,
  Cpu,
  X,
  RotateCcw,
  Swords,
  Move,
  Lock,
  Unlock,
} from 'lucide-react';
import { DreamEngine } from '../engine/engine.ts';
import { RenderMetrics } from '../engine/renderer/types.ts';
import { DEFAULT_OATHCALL_TUNING, OathcallTuningConfig } from '../engine/combat/oathcall-system.ts';

export interface SettingsState {
  // Graphics
  exposure: number;
  fogDensity: number;
  sunIntensity: number;
  ambientIntensity: number;
  // Camera
  fov: number;
  cameraDistance: number;
  // Controls
  invertNorthSouth: boolean;
  invertLeftRight: boolean;
  invertMouseX: boolean;
  invertMouseY: boolean;
  mouseSensitivity: number;
  gamepadSensitivity: number;
  gamepadDeadzone: number;
  // Audio
  audioEnabled: boolean;
  masterVolume: number;
  ambientVolume: number;
}

export const DEFAULT_SETTINGS: SettingsState = {
  exposure: 1.0,
  fogDensity: 1.0,
  sunIntensity: 1.0,
  ambientIntensity: 1.0,
  fov: 60,
  cameraDistance: 5.0,
  invertNorthSouth: false,
  invertLeftRight: false,
  invertMouseX: false,
  invertMouseY: false,
  mouseSensitivity: 0.0022,
  gamepadSensitivity: 2.2,
  gamepadDeadzone: 0.15,
  audioEnabled: false,
  masterVolume: 0.6,
  ambientVolume: 0.7,
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: DreamEngine | null;
  metrics: RenderMetrics;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  engine,
  metrics,
}) => {
  const [activeTab, setActiveTab] = useState<
    'graphics' | 'pvp_hud' | 'camera' | 'controls' | 'audio' | 'system'
  >('pvp_hud');
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [tuning, setTuning] = useState<OathcallTuningConfig>(
    engine?.oathcallServer.tuning || DEFAULT_OATHCALL_TUNING
  );
  const [, setHudTick] = useState(0);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (!engine) return;

    switch (key) {
      case 'exposure':
        engine.setExposureMultiplier(value as number);
        break;
      case 'fogDensity':
        engine.setFogDensityMultiplier(value as number);
        break;
      case 'sunIntensity':
        engine.setKeyEnergyMultiplier(value as number);
        break;
      case 'ambientIntensity':
        engine.setAmbientEnergyMultiplier(value as number);
        break;
      case 'fov':
        engine.setFov(value as number);
        break;
      case 'cameraDistance':
        engine.setCameraDistance(value as number);
        break;
      case 'mouseSensitivity':
        engine.setMouseSensitivity(value as number);
        break;
      case 'gamepadSensitivity':
        engine.setGamepadSensitivity(value as number);
        break;
      case 'gamepadDeadzone':
        engine.setGamepadDeadzone(value as number);
        break;
      case 'invertNorthSouth':
        engine.setInvertNorthSouth(value as boolean);
        break;
      case 'invertLeftRight':
        engine.setInvertLeftRight(value as boolean);
        break;
      case 'invertMouseX':
        engine.setInvertMouseX(value as boolean);
        break;
      case 'invertMouseY':
        engine.setInvertMouseY(value as boolean);
        break;
      case 'audioEnabled':
        engine.setAudioEnabled(value as boolean);
        break;
      case 'masterVolume':
        engine.setMasterVolume(value as number);
        break;
      case 'ambientVolume':
        engine.setAmbientVolume(value as number);
        break;
    }
  };

  const updateOathcallTuning = <K extends keyof OathcallTuningConfig>(
    key: K,
    value: OathcallTuningConfig[K]
  ) => {
    const next = { ...tuning, [key]: value };
    setTuning(next);
    engine?.oathcallServer.updateTuning({ [key]: value });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setTuning(DEFAULT_OATHCALL_TUNING);
    if (!engine) return;
    engine.oathcallServer.updateTuning(DEFAULT_OATHCALL_TUNING);
    engine.pvpTactical.resetLayout();
    engine.setExposureMultiplier(DEFAULT_SETTINGS.exposure);
    engine.setFogDensityMultiplier(DEFAULT_SETTINGS.fogDensity);
    engine.setKeyEnergyMultiplier(DEFAULT_SETTINGS.sunIntensity);
    engine.setAmbientEnergyMultiplier(DEFAULT_SETTINGS.ambientIntensity);
    engine.setFov(DEFAULT_SETTINGS.fov);
    engine.setCameraDistance(DEFAULT_SETTINGS.cameraDistance);
    engine.setMouseSensitivity(DEFAULT_SETTINGS.mouseSensitivity);
    engine.setGamepadSensitivity(DEFAULT_SETTINGS.gamepadSensitivity);
    engine.setGamepadDeadzone(DEFAULT_SETTINGS.gamepadDeadzone);
    engine.setInvertNorthSouth(DEFAULT_SETTINGS.invertNorthSouth);
    engine.setInvertLeftRight(DEFAULT_SETTINGS.invertLeftRight);
    engine.setInvertMouseX(DEFAULT_SETTINGS.invertMouseX);
    engine.setInvertMouseY(DEFAULT_SETTINGS.invertMouseY);
    engine.setAudioEnabled(DEFAULT_SETTINGS.audioEnabled);
    engine.setMasterVolume(DEFAULT_SETTINGS.masterVolume);
    engine.setAmbientVolume(DEFAULT_SETTINGS.ambientVolume);
    setHudTick((t) => t + 1);
  };

  const pvpTactical = engine?.pvpTactical;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-neutral-700/80 rounded-sm shadow-2xl overflow-hidden flex flex-col text-neutral-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wider uppercase">
              DREAM System, Movable PvP GUI & Oathcall Tuning
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 rounded-sm transition cursor-pointer"
              title="Reset all settings to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-sm transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-neutral-800 bg-neutral-950/40 px-6 pt-2 space-x-1">
          {[
            { id: 'pvp_hud', label: 'PvP GUI & Oathcall', icon: Swords },
            { id: 'graphics', label: 'Graphics', icon: Sun },
            { id: 'camera', label: 'Camera', icon: Eye },
            { id: 'controls', label: 'Controls', icon: Compass },
            { id: 'audio', label: 'Atmosphere', icon: Volume2 },
            { id: 'system', label: 'System', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 text-emerald-400 bg-neutral-800/40'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* PvP GUI Layout & Founder Oathcall/Township Tuning Tab */}
          {activeTab === 'pvp_hud' && pvpTactical && (
            <div className="space-y-6">
              {/* Section 1: Movable Action Bars & HUD Presets */}
              <div className="p-4 bg-neutral-950/80 border border-cyan-500/40 rounded-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5" />
                      Movable GUI Action Bars & PvP Layout Presets
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      Unlock HUD bars to drag the Action Bar, Vitals, Boss Target, and Squad Focus frame anywhere on screen.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      pvpTactical.setLocked(!pvpTactical.layout.locked);
                      setHudTick((t) => t + 1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold border cursor-pointer transition ${
                      !pvpTactical.layout.locked
                        ? 'bg-cyan-500 text-neutral-950 border-cyan-300'
                        : 'bg-neutral-900 text-cyan-300 border-cyan-500/50'
                    }`}
                  >
                    {!pvpTactical.layout.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{!pvpTactical.layout.locked ? 'UNLOCKED (Drag on Screen)' : 'Unlock GUI Bars'}</span>
                  </button>
                </div>

                {/* Layout Presets */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['default', 'pvp-centered', 'minimalist'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        pvpTactical.applyPreset(preset);
                        setHudTick((t) => t + 1);
                      }}
                      className="px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-[11px] uppercase font-semibold cursor-pointer transition"
                    >
                      Preset: {preset}
                    </button>
                  ))}
                </div>

                {/* Action Bar Orientation */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                  <span className="text-neutral-300 font-medium">Action Bar Orientation:</span>
                  <div className="flex gap-1.5">
                    {(['horizontal', 'compact-2row', 'vertical'] as const).map((ori) => (
                      <button
                        key={ori}
                        type="button"
                        onClick={() => {
                          pvpTactical.setActionBarOrientation(ori);
                          setHudTick((t) => t + 1);
                        }}
                        className={`px-2.5 py-1 rounded font-mono text-[10px] uppercase cursor-pointer border ${
                          pvpTactical.layout.actionBarOrientation === ori
                            ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                        }`}
                      >
                        {ori}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 2: Founder Tunable Numbers for Oathcall & Townships */}
              <div className="p-4 bg-neutral-950/80 border border-amber-500/40 rounded-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div>
                    <div className="font-bold text-amber-300 uppercase tracking-wider">
                      ⚔️ Founder Tunable Values — Oathcall, Bully Rule & Townships
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Live server-authoritative parameters (`OathcallTuningConfig`). Zero pay-to-win, kid-safe zero-loss protection.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between mb-1 text-neutral-300">
                      <span>Base Oathcall Mark Timer</span>
                      <span className="font-mono text-amber-300">{tuning.baseMarkDurationSec}s ({Math.round(tuning.baseMarkDurationSec / 60)}m)</span>
                    </div>
                    <input
                      type="range"
                      min="180"
                      max="1800"
                      step="60"
                      value={tuning.baseMarkDurationSec}
                      onChange={(e) => updateOathcallTuning('baseMarkDurationSec', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 bg-neutral-800 rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-neutral-300">
                      <span>Max Allies Per Oathcall</span>
                      <span className="font-mono text-amber-300">{tuning.maxAlliesPerCall} Allies</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={tuning.maxAlliesPerCall}
                      onChange={(e) => updateOathcallTuning('maxAlliesPerCall', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 bg-neutral-800 rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-neutral-300">
                      <span>Arrival Shield Duration</span>
                      <span className="font-mono text-cyan-300">{tuning.arrivalShieldDurationSec.toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.5"
                      value={tuning.arrivalShieldDurationSec}
                      onChange={(e) => updateOathcallTuning('arrivalShieldDurationSec', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 bg-neutral-800 rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-neutral-300">
                      <span>Bully Ally Valor Buff</span>
                      <span className="font-mono text-emerald-400">+{tuning.bullyAllyValorBuffPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="40"
                      step="1"
                      value={tuning.bullyAllyValorBuffPct}
                      onChange={(e) => updateOathcallTuning('bullyAllyValorBuffPct', parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-neutral-300">
                      <span>Bully Level Gap Threshold</span>
                      <span className="font-mono text-rose-300">+{tuning.bullyLevelDeltaThreshold} Levels</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      step="1"
                      value={tuning.bullyLevelDeltaThreshold}
                      onChange={(e) => updateOathcallTuning('bullyLevelDeltaThreshold', parseInt(e.target.value, 10))}
                      className="w-full accent-rose-400 bg-neutral-800 rounded h-1 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-neutral-300">
                      <span>Township Trade Tax Cap</span>
                      <span className="font-mono text-amber-300">{tuning.townshipMaxTaxRatePct}% (In-Game Gold Only)</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="33"
                      step="1"
                      value={tuning.townshipMaxTaxRatePct}
                      onChange={(e) => updateOathcallTuning('townshipMaxTaxRatePct', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 bg-neutral-800 rounded h-1 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Graphics Tab */}
          {activeTab === 'graphics' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Brightness / Exposure</span>
                  <span className="font-mono text-emerald-400">{settings.exposure.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.05"
                  value={settings.exposure}
                  onChange={(e) => updateSetting('exposure', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Atmospheric Fog Density</span>
                  <span className="font-mono text-emerald-400">{settings.fogDensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.05"
                  value={settings.fogDensity}
                  onChange={(e) => updateSetting('fogDensity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Sun / Key Light Energy</span>
                  <span className="font-mono text-emerald-400">{settings.sunIntensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={settings.sunIntensity}
                  onChange={(e) => updateSetting('sunIntensity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Hemisphere Ambient Energy</span>
                  <span className="font-mono text-emerald-400">{settings.ambientIntensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={settings.ambientIntensity}
                  onChange={(e) => updateSetting('ambientIntensity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200 flex items-center gap-2">
                    <span>Motion Blur</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      GAMER STANDARD
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Permanently banished. 100% crystal-clear raw pixel fidelity, zero smearing, zero nausea.
                  </div>
                </div>
                <div className="px-3 py-1 bg-neutral-900 border border-emerald-500/40 text-emerald-400 rounded text-xs font-mono font-semibold tracking-wider">
                  OFF
                </div>
              </div>
            </div>
          )}

          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Field of View (FOV)</span>
                  <span className="font-mono text-emerald-400">{settings.fov}°</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="95"
                  step="1"
                  value={settings.fov}
                  onChange={(e) => updateSetting('fov', parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Follow Distance</span>
                  <span className="font-mono text-emerald-400">{settings.cameraDistance.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="12.0"
                  step="0.5"
                  value={settings.cameraDistance}
                  onChange={(e) => updateSetting('cameraDistance', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Mouse Look Sensitivity</span>
                  <span className="font-mono text-emerald-400">{(settings.mouseSensitivity * 1000).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.0008"
                  max="0.0055"
                  step="0.0002"
                  value={settings.mouseSensitivity}
                  onChange={(e) => updateSetting('mouseSensitivity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200">Invert North / South (W / S)</div>
                  <div className="text-[10px] text-neutral-400">Flips forward and backward movement direction.</div>
                </div>
                <button
                  onClick={() => updateSetting('invertNorthSouth', !settings.invertNorthSouth)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.invertNorthSouth
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.invertNorthSouth ? 'REVERSED' : 'STANDARD'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200">Invert Left / Right (A / D)</div>
                  <div className="text-[10px] text-neutral-400">Flips strafe direction relative to camera angle.</div>
                </div>
                <button
                  onClick={() => updateSetting('invertLeftRight', !settings.invertLeftRight)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.invertLeftRight
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.invertLeftRight ? 'REVERSED' : 'STANDARD'}
                </button>
              </div>
            </div>
          )}

          {/* Atmosphere / Audio Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div className="flex items-center space-x-2.5">
                  {settings.audioEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-400" />
                  )}
                  <div>
                    <div className="font-medium text-neutral-200">Procedural Atmosphere Sound</div>
                    <div className="text-[10px] text-neutral-400">Pure Web Audio synthesizer wind and nocturnal resonance.</div>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting('audioEnabled', !settings.audioEnabled)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.audioEnabled
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.audioEnabled ? 'ACTIVE' : 'MUTED'}
                </button>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Master Volume</span>
                  <span className="font-mono text-emerald-400">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
                  disabled={!settings.audioEnabled}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Active Renderer</div>
                  <div className="text-sm font-semibold text-neutral-200 mt-0.5">{metrics.backend}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">Direct hardware pipeline</div>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Render Profile</div>
                  <div className="text-sm font-semibold text-neutral-200 capitalize mt-0.5">{metrics.worldMode} Dream</div>
                  <div className="text-[10px] text-neutral-400 mt-1">Press N in-game to switch</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 text-[11px] text-neutral-400">
          <span>Settings & Oathcall tuning persist for current session</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm font-medium transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
