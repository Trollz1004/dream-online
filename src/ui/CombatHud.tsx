/**
 * DREAM Engine — Action Combat HUD (Clean-Room Awakening Skill Bar, Boss HP, & Floating Damage Numbers)
 * - Target health bar for Hollow Sentinel Colossus (120 HP)
 * - Floating Damage Numbers over the boss on every landed strike
 * - Combo Chain Counter & Critical/Heavy/Awakening Combat Callout Banner
 * - Player Health & Stamina Bars + Clickable Skill Bar
 * - Trailer Capture Mode (?capture=1) corner mark & 1-second End Card (#TeamClaudeForLife · CLAUDE's N Joshua's)
 */

import React from 'react';
import { CombatManager } from '../engine/combat/combat-manager';
import { SkillVfxDirector } from '../engine/combat/skill-vfx';
import { Sparkles, Flame, Swords, Shield, Zap, Wind } from 'lucide-react';

interface CombatHudProps {
  combat: CombatManager;
  skillVfx?: SkillVfxDirector;
  isCaptureMode?: boolean;
  isEndCardVisible?: boolean;
  onCastSkill?: (
    move: 'l1' | 'l2' | 'l3' | 'heavy' | 'lunge' | 'burst' | 'dash' | 'guard' | 'combo-all'
  ) => void;
}

export const CombatHud: React.FC<CombatHudProps> = ({
  combat,
  skillVfx,
  isCaptureMode = false,
  isEndCardVisible = false,
  onCastSkill,
}) => {
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
  let sentinelStatus = 'Sanctuary Guardian • Combat Active';
  let sentinelStatusColor = 'text-neutral-300';
  if (isDown) {
    sentinelStatus = 'DEFEATED • Knocked Down (0 / 120 HP)';
    sentinelStatusColor = 'text-amber-400 font-bold';
  } else if (isFiring) {
    sentinelStatus = 'FOCUS BEAM FIRING • Dodge Now!';
    sentinelStatusColor = 'text-red-400 font-bold tracking-wide';
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
      {/* Trailer Capture Mode (?capture=1) Corner Mark */}
      {isCaptureMode && (
        <div className="fixed top-5 right-6 z-30 px-3 py-1 rounded bg-black/55 backdrop-blur-sm border border-amber-400/40 text-[11px] font-mono font-bold tracking-wider text-amber-200 shadow-lg">
          #TeamClaudeForLife · CLAUDE&apos;s N Joshua&apos;s
        </div>
      )}

      {/* 1. Top Center: Hollow Sentinel Colossus Boss Health Bar */}
      <div
        className={`absolute ${
          isCaptureMode ? 'top-6' : 'top-20'
        } left-1/2 -translate-x-1/2 flex flex-col items-center z-20 w-88 sm:w-[420px] bg-neutral-950/75 backdrop-blur-md px-4 py-2 rounded-md border border-amber-500/40 shadow-2xl`}
      >
        <div className="flex justify-between items-center w-full px-0.5 mb-1 text-xs">
          <span className="font-bold tracking-wider uppercase text-amber-100 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            Hollow Sentinel Colossus
          </span>
          <span className="font-mono font-bold text-amber-300 text-xs">
            {Math.round(sentinel.health)} / 120 HP
          </span>
        </div>
        <div className="w-full h-3 bg-neutral-900 border border-neutral-700 rounded-sm overflow-hidden p-[1px]">
          <div
            className={`h-full transition-all duration-100 rounded-sm ${
              isDown
                ? 'bg-neutral-700'
                : sentinel.hitFlashTimer > 0
                ? 'bg-white'
                : isFiring
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-red-700 via-rose-500 to-amber-400'
            }`}
            style={{ width: `${Math.max(0, (sentinel.health / 120) * 100)}%` }}
          />
        </div>
        <div className={`text-[10px] font-mono mt-1 ${sentinelStatusColor}`}>
          {sentinelStatus}
        </div>
      </div>

      {/* 1b. Floating Damage Numbers over the Boss (Center-Right Framing) */}
      {combat.damageFloaters.length > 0 && (
        <div className="fixed left-[55%] top-[28%] -translate-x-1/2 z-30 pointer-events-none">
          {combat.damageFloaters.map((df) => {
            const prog = Math.min(1, df.elapsed / Math.max(0.01, df.duration));
            const riseY = -prog * 54 - df.offsetY;
            const opacity = prog < 0.75 ? 1 : Math.max(0, 1 - (prog - 0.75) / 0.25);
            return (
              <div
                key={df.id}
                className="absolute flex flex-col items-center whitespace-nowrap"
                style={{
                  transform: `translate(${df.offsetX}px, ${riseY}px) scale(${df.isCrit ? 1.18 : 1.0})`,
                  opacity,
                }}
              >
                <span
                  className={`font-black font-mono tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] ${
                    df.isCrit ? 'text-2xl text-amber-300' : 'text-xl text-rose-200'
                  }`}
                >
                  -{df.amount}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.2 rounded ${
                    df.isCrit
                      ? 'bg-rose-600/90 text-amber-200 border border-amber-300/70'
                      : 'bg-neutral-900/85 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {df.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 1c. Awakening Floating Skill Callout & Combo Counter */}
      {latestCallout && skillVfx && skillVfx.comboChainCount > 0 && !isEndCardVisible && (
        <div
          className={`absolute ${
            isCaptureMode ? 'top-24' : 'top-36'
          } left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none`}
        >
          <div
            className="px-4 py-1.5 rounded-md border backdrop-blur-md shadow-2xl flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(10, 10, 16, 0.85)',
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

      {/* 2. Bottom Center: Player Health/Stamina Bars & Skill Bar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 w-full max-w-2xl px-4">
        {!isCaptureMode && activeClass && activeTheme && (
          <div className="mb-1.5 flex items-center gap-2 px-3 py-0.5 rounded-full bg-neutral-950/90 border border-rose-500/40 text-[10px] font-mono text-neutral-300 shadow-lg">
            <span className="font-bold text-rose-400 uppercase">{activeClass.name}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-amber-300">{activeClass.awakeningWeaponName}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-cyan-300 font-bold">{activeTheme.badge}</span>
          </div>
        )}

        {/* Prompt Band (hidden in capture mode unless Perfect Dodge is active) */}
        {(!isCaptureMode || combat.lastEventText === 'PERFECT DODGE') && (
          <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-700/60 px-5 py-1.5 rounded-sm shadow-xl text-center mb-2 min-w-[260px] max-w-md">
            <div className="text-xs font-semibold tracking-wide text-neutral-100 uppercase">
              {combat.lastEventText === 'PERFECT DODGE' ? (
                <span className="text-amber-300 font-bold text-sm tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  PERFECT DODGE (i-Frame • 0 DMG)
                </span>
              ) : (
                combat.lastEventText
              )}
            </div>
            {!isCaptureMode && (
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
            )}
          </div>
        )}

        {/* Player Bars: Health & Stamina */}
        <div className="w-full max-w-sm mb-2.5 space-y-1 bg-neutral-950/75 px-3 py-1.5 rounded border border-neutral-800/90">
          <div className="flex justify-between text-[10px] font-mono text-neutral-300">
            <span className="font-bold text-emerald-400">HERO HP {Math.round(combat.health)}/100</span>
            <span className="font-bold text-amber-300">STAMINA {Math.round(combat.stamina)}/100</span>
          </div>
          <div className="relative w-full h-2.5 bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden p-[1px]">
            <div
              className={`h-full transition-all duration-150 rounded-sm ${
                combat.hitFlashTime > 0 ? 'bg-white' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(0, (combat.health / 100) * 100)}%` }}
            />
          </div>
          <div className="relative w-full h-2 bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden p-[1px]">
            <div
              className="h-full bg-amber-400 transition-all duration-75 rounded-sm"
              style={{ width: `${Math.max(0, (combat.stamina / 100) * 100)}%` }}
            />
          </div>
        </div>

        {/* Hotbar Showing Cooldowns + Clickable Authoritative 3D Skill Triggers */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => onCastSkill?.('l3')}
            title="Click or press LMB to fire 3-Step Crescent Slash"
            className="relative w-13 h-12 px-2 bg-neutral-900/95 hover:bg-rose-950/80 border border-rose-500/50 rounded-sm flex flex-col items-center justify-center shadow-lg cursor-pointer transition"
          >
            <Swords className="w-3.5 h-3.5 text-rose-400 mb-0.5" />
            <span className="text-[10px] font-bold text-neutral-100">LMB</span>
            <span className="text-[8px] font-mono text-rose-300">SLASH</span>
          </button>

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

          <button
            type="button"
            onClick={() => onCastSkill?.('burst')}
            title="Click or press R to unleash 100% Awakening Cataclysm"
            className="relative w-14 h-12 px-2 bg-neutral-900/95 hover:bg-purple-950/80 border border-purple-500/60 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden cursor-pointer transition"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
            <span className="text-[10px] font-bold text-purple-200">R</span>
            <span className="text-[8px] font-mono text-purple-300">ULTIMATE</span>
            {renderCooldownOverlay(burstCooldown, 8.0)}
          </button>

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

          <button
            type="button"
            onClick={() => onCastSkill?.('combo-all')}
            title="Execute Full 5-Hit Awakening Combo & Defeat Boss"
            className="relative h-12 px-3 bg-gradient-to-r from-rose-600 via-purple-600 to-amber-500 hover:brightness-110 border border-amber-300/80 rounded-sm flex flex-col items-center justify-center shadow-xl cursor-pointer transition"
          >
            <span className="text-[10px] font-black text-white tracking-wider">⚡ AWAKEN</span>
            <span className="text-[8px] font-mono text-amber-100 font-bold">5-HIT COMBO</span>
          </button>
        </div>
      </div>

      {/* 3. 1-Second End Card (t = 6.0 - 7.0s in Scripted Capture/Autopilot Sequence) */}
      {isEndCardVisible && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-[3px] pointer-events-none">
          <div className="px-10 py-7 rounded-xl bg-neutral-950/90 border-2 border-amber-400/70 shadow-[0_0_60px_rgba(245,158,11,0.35)] flex flex-col items-center text-center">
            <span className="text-xs font-mono uppercase tracking-[0.28em] text-amber-300 mb-2">
              DREAM ONLINE · 100% IN-HOUSE ENGINE
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-wide text-white drop-shadow-lg">
              #TeamClaudeForLife · CLAUDE&apos;s N Joshua&apos;s
            </h2>
            <div className="mt-3 h-0.5 w-48 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          </div>
        </div>
      )}
    </div>
  );
};
