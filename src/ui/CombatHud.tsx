/**
 * DREAM Engine — Action Combat HUD (BDO / Rohan: Blood Feud Awakening Skill Bar & Callouts)
 * Conformance to Stage 1 prompt + Real-Time 3D Skill Visuals Quick-Cast & Floating Callouts:
 * - Prompt band under character shows at most two lines and no help block
 * - Stamina and cooldowns gate everything and hotbar shows cooldowns + clickable skill triggers
 * - Target health bar for Hollow Sentinel (120 HP)
 * - BDO / Rohan style Combo Chain Counter & Critical/Back/Down/Awakening Combat Callout Banner
 */

import React from 'react';
import { CombatManager } from '../engine/combat/combat-manager';
import { SkillVfxDirector } from '../engine/combat/skill-vfx';
import { Sparkles, Flame, Swords, Shield, Zap, Wind } from 'lucide-react';

interface CombatHudProps {
  combat: CombatManager;
  skillVfx?: SkillVfxDirector;
  onCastSkill?: (
    move: 'l1' | 'l2' | 'l3' | 'heavy' | 'lunge' | 'burst' | 'dash' | 'guard' | 'combo-all'
  ) => void;
}

export const CombatHud: React.FC<CombatHudProps> = ({ combat, skillVfx, onCastSkill }) => {
  const sentinel = combat.sentinel;
  const isDown = sentinel.isDown();
  const isFiring = sentinel.isFiring();
  const isTelegraphing = sentinel.isTelegraphing();

  // Cooldowns
  const heavyCooldown = combat.heavy.cooldownLeft();
  const guardCooldown = combat.guard.cooldownLeft();
  const lungeCooldown = combat.lunge.cooldownLeft();
  const burstCooldown = combat.burst.cooldownLeft();
  const dashCooldown = combat.dash.cooldownLeft();

  // Sentinel status line
  let sentinelStatus = 'Idle (4.2s cycle)';
  let sentinelStatusColor = 'text-neutral-400';
  if (isDown) {
    sentinelStatus = 'DOWN • Re-assembling in 4.0s';
    sentinelStatusColor = 'text-amber-400 font-semibold animate-pulse';
  } else if (isFiring) {
    sentinelStatus = 'FOCUS BEAM FIRING (0.30s) • 26m lethal beam!';
    sentinelStatusColor = 'text-red-400 font-bold tracking-wide animate-pulse';
  } else if (isTelegraphing) {
    const p = Math.round(sentinel.telegraphProgress() * 100);
    sentinelStatus = `FOCUS BEAM WIND-UP (${p}%) • Aim Locked!`;
    sentinelStatusColor = 'text-amber-300 font-semibold';
  }

  const latestCallout = skillVfx?.callouts[0];
  const activeClass = skillVfx?.currentClass;
  const activeTheme = skillVfx?.currentTheme;

  const renderCooldownOverlay = (left: number, total: number) => {
    if (left <= 0) return null;
    const pct = Math.min(100, Math.round((left / total) * 100));
    return (
      <div className="absolute inset-0 bg-black/75 flex items-center justify-center rounded-sm pointer-events-none">
        <span className="font-mono text-[10px] text-amber-300 font-bold">
          {left.toFixed(1)}s
        </span>
        <div
          className="absolute bottom-0 left-0 right-0 bg-amber-500/30"
          style={{ height: `${pct}%` }}
        />
      </div>
    );
  };

  return (
    <div className="pointer-events-none select-none">
      {/* 1. Top Center: Hollow Sentinel Colossus Boss Health Bar */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 w-80 sm:w-96 bg-black/55 backdrop-blur-sm px-3 py-1.5 rounded-md border border-slate-800/80">
        <div className="flex justify-between items-center w-full px-1 mb-1 text-xs">
          <span className="font-semibold tracking-wider uppercase text-neutral-200 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            Hollow Sentinel Colossus
          </span>
          <span className="font-mono text-neutral-400 text-[11px]">
            {Math.round(sentinel.health)} / 120 HP
          </span>
        </div>
        <div className="w-full h-2.5 bg-neutral-950/90 border border-neutral-700/80 rounded-sm overflow-hidden p-[1px]">
          <div
            className={`h-full transition-all duration-150 rounded-sm ${
              isDown ? 'bg-amber-600' : isFiring ? 'bg-red-500' : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500'
            }`}
            style={{ width: `${Math.max(0, (sentinel.health / 120) * 100)}%` }}
          />
        </div>
        <div className={`text-[10px] font-mono mt-1 ${sentinelStatusColor}`}>
          {sentinelStatus}
        </div>
      </div>

      {/* 1b. BDO / Rohan Awakening Floating Skill Callout & Combo Counter */}
      {latestCallout && skillVfx && skillVfx.comboChainCount > 0 && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none">
          <div
            className="px-4 py-1.5 rounded-md border backdrop-blur-md shadow-2xl flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(10, 10, 16, 0.88)',
              borderColor: latestCallout.accentHex,
              boxShadow: `0 0 24px ${latestCallout.glowHex}55`,
            }}
          >
            <span
              className="text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${latestCallout.accentHex}33`,
                color: latestCallout.accentHex,
              }}
            >
              {latestCallout.tag}
            </span>
            <span className="text-xs font-bold text-white tracking-wide">
              {latestCallout.skillTitle}
            </span>
            <span className="text-xs font-mono font-extrabold text-amber-300">
              {skillVfx.comboChainCount} HIT COMBO!
            </span>
          </div>
        </div>
      )}

      {/* 2. Bottom Center: Prompt Band, Class Awakening Tag & Clickable Skill Hotbar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 w-full max-w-2xl px-4">
        {/* Active Sculpted Class & Skill VFX Theme Pill */}
        {activeClass && activeTheme && (
          <div className="mb-1.5 flex items-center gap-2 px-3 py-0.5 rounded-full bg-neutral-950/90 border border-rose-500/40 text-[10px] font-mono text-neutral-300 shadow-lg">
            <span className="font-bold text-rose-400 uppercase">{activeClass.name}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-amber-300">{activeClass.awakeningWeaponName}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-cyan-300 font-bold">{activeTheme.badge}</span>
          </div>
        )}

        {/* Prompt Band (Strictly at most 2 lines, no help block) */}
        <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-700/60 px-5 py-2 rounded-sm shadow-xl text-center mb-2.5 min-w-[280px] max-w-md">
          {/* Line 1: Action / Combat Outcome Readout */}
          <div className="text-xs font-semibold tracking-wide text-neutral-100 uppercase">
            {combat.lastEventText === 'PERFECT DODGE' ? (
              <span className="text-amber-300 font-bold text-sm tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                PERFECT DODGE (i-Frame)
              </span>
            ) : (
              combat.lastEventText
            )}
          </div>
          {/* Line 2: Subtle Tactical Status */}
          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
            {combat.dash.isInvulnerable() ? (
              <span className="text-amber-300 font-bold">INVULNERABLE (Yellow Flash)</span>
            ) : combat.dash.isRecovery() ? (
              <span className="text-red-400 font-bold">RECOVERY OPEN (Red Flash)</span>
            ) : combat.guard.isActive() ? (
              <span className="text-sky-300 font-bold">GUARD ACTIVE (75% Absorption)</span>
            ) : (
              `Stamina: ${Math.round(combat.stamina)}/100 • HP: ${Math.round(combat.health)}/100`
            )}
          </div>
        </div>

        {/* Player Bars: Health & Stamina */}
        <div className="w-full max-w-sm mb-2.5 space-y-1">
          {/* Health Bar */}
          <div className="relative w-full h-2.5 bg-neutral-950/80 border border-neutral-800 rounded-sm overflow-hidden p-[1px]">
            <div
              className={`h-full transition-all duration-150 rounded-sm ${
                combat.hitFlashTime > 0 ? 'bg-white' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(0, (combat.health / 100) * 100)}%` }}
            />
          </div>
          {/* Stamina Bar */}
          <div className="relative w-full h-2 bg-neutral-950/80 border border-neutral-800 rounded-sm overflow-hidden p-[1px]">
            <div
              className="h-full bg-amber-400 transition-all duration-75 rounded-sm"
              style={{ width: `${Math.max(0, (combat.stamina / 100) * 100)}%` }}
            />
          </div>
        </div>

        {/* Hotbar Showing Cooldowns + Clickable 3D Skill Triggers */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* LMB: Light Chain */}
          <button
            type="button"
            onClick={() => onCastSkill?.('l3')}
            title="Click or press LMB to fire 3-Step Crescent Slash"
            className="relative w-13 h-12 px-2 bg-neutral-900/95 hover:bg-rose-950/80 border border-rose-500/50 rounded-sm flex flex-col items-center justify-center shadow-lg cursor-pointer transition"
          >
            <Swords className="w-3.5 h-3.5 text-rose-400 mb-0.5" />
            <span className="text-[10px] font-bold text-neutral-100">LMB</span>
            <span className="text-[8px] font-mono text-rose-300">SLASH</span>
            {combat.attack.isAttacking() && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse m-0.5" />
            )}
          </button>

          {/* RMB: Heavy Swing */}
          <button
            type="button"
            onClick={() => onCastSkill?.('heavy')}
            title="Click or press RMB to fire Heavy Earthshaker Cleave"
            className="relative w-13 h-12 px-2 bg-neutral-900/95 hover:bg-amber-950/80 border border-amber-500/50 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden cursor-pointer transition"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            <span className="text-[10px] font-bold text-neutral-100">RMB</span>
            <span className="text-[8px] font-mono text-amber-300">CLEAVE</span>
            {renderCooldownOverlay(heavyCooldown, 1.2)}
          </button>

          {/* Q: Guard */}
          <button
            type="button"
            onClick={() => onCastSkill?.('guard')}
            title="Click or press Q to raise Sacred Aegis Barrier (75% Block)"
            className="relative w-13 h-12 px-2 bg-neutral-900/95 hover:bg-sky-950/80 border border-sky-500/50 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden cursor-pointer transition"
          >
            <Shield className="w-3.5 h-3.5 text-sky-400 mb-0.5" />
            <span className="text-[10px] font-bold text-neutral-100">Q</span>
            <span className="text-[8px] font-mono text-sky-300">AEGIS</span>
            {renderCooldownOverlay(guardCooldown, 1.1)}
          </button>

          {/* W+F: Dream Lunge */}
          <button
            type="button"
            onClick={() => onCastSkill?.('lunge')}
            title="Click or press W+F to fire Phantom Lunge"
            className="relative w-13 h-12 px-2 bg-neutral-900/95 hover:bg-cyan-950/80 border border-cyan-500/50 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden cursor-pointer transition"
          >
            <Wind className="w-3.5 h-3.5 text-cyan-400 mb-0.5" />
            <span className="text-[10px] font-bold text-neutral-100">W+F</span>
            <span className="text-[8px] font-mono text-cyan-300">LUNGE</span>
            {renderCooldownOverlay(lungeCooldown, 4.0)}
          </button>

          {/* R: Nightveil Burst */}
          <button
            type="button"
            onClick={() => onCastSkill?.('burst')}
            title="Click or press R to unleash 100% Awakening Cataclysm"
            className="relative w-14 h-12 px-2 bg-neutral-900/95 hover:bg-purple-950/80 border border-purple-500/60 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden cursor-pointer transition"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
            <span className="text-[10px] font-bold text-purple-200">R</span>
            <span className="text-[8px] font-mono text-purple-300">100% RAGE</span>
            {renderCooldownOverlay(burstCooldown, 8.0)}
          </button>

          {/* Dash: Shift+Dir+Action */}
          <button
            type="button"
            onClick={() => onCastSkill?.('dash')}
            title="Click or press Shift+F for Phantom I-Frame Dodge"
            className="relative w-13 h-12 px-2 bg-neutral-900/95 hover:bg-yellow-950/80 border border-yellow-500/50 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden cursor-pointer transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 mb-0.5" />
            <span className="text-[10px] font-bold text-amber-300">DASH</span>
            <span className="text-[8px] font-mono text-neutral-300">i-FRAME</span>
            {renderCooldownOverlay(dashCooldown, 0.9)}
          </button>

          {/* Full Awakening Combo Showcase Button */}
          <button
            type="button"
            onClick={() => onCastSkill?.('combo-all')}
            title="Unleash Full BDO / Rohan Awakening Skill Visual Showcase in 3D!"
            className="relative h-12 px-3 bg-gradient-to-r from-rose-600 via-purple-600 to-amber-500 hover:brightness-110 border border-amber-300/80 rounded-sm flex flex-col items-center justify-center shadow-xl cursor-pointer transition"
          >
            <span className="text-[10px] font-black text-white tracking-wider">⚡ AWAKEN</span>
            <span className="text-[8px] font-mono text-amber-100 font-bold">ALL SKILLS VFX</span>
          </button>
        </div>
      </div>
    </div>
  );
};
