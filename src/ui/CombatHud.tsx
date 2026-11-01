/**
 * DREAM Engine — Action Combat HUD (Clean-Room Awakening Skill Bar, Boss HP, Movable PvP GUI & Oathcall/Township/Regalia Overlay)
 * - Target health bar for Hollow Sentinel Colossus (120 HP)
 * - Floating Damage Numbers over the boss on every landed strike
 * - Combo Chain Counter & Critical/Heavy/Awakening Combat Callout Banner
 * - Movable/Scalable Player Health, Stamina & Skill Action Bars (`PvpTacticalCoordinator`)
 * - Shift + Right-Click Tactical Map Ping & Squad Focus Target Coordinator
 * - Oathcall + Townships + Champion Regalia Live & Capture Demo Overlay (`?oathcallDemo=1`)
 */

import React, { useState, useRef } from 'react';
import { CombatManager } from '../engine/combat/combat-manager';
import { SkillVfxDirector } from '../engine/combat/skill-vfx';
import { PvpTacticalCoordinator, HudWidgetId, TacticalPingKind } from '../engine/combat/pvp-tactical-ping';
import { OathcallDemoState } from '../engine/combat/oathcall-system';
import {
  Sparkles,
  Flame,
  Swords,
  Shield,
  Zap,
  Wind,
  Move,
  Lock,
  Unlock,
  Crosshair,
  Users,
  Crown,
  RotateCcw,
} from 'lucide-react';

interface CombatHudProps {
  combat: CombatManager;
  skillVfx?: SkillVfxDirector;
  pvpTactical?: PvpTacticalCoordinator;
  oathcallDemoState?: OathcallDemoState;
  isChampionRegaliaEquipped?: boolean;
  onToggleChampionRegalia?: () => void;
  isCaptureMode?: boolean;
  isEndCardVisible?: boolean;
  onCastSkill?: (
    move: 'l1' | 'l2' | 'l3' | 'heavy' | 'lunge' | 'burst' | 'dash' | 'guard' | 'combo-all'
  ) => void;
}

export const CombatHud: React.FC<CombatHudProps> = ({
  combat,
  skillVfx,
  pvpTactical,
  oathcallDemoState,
  isChampionRegaliaEquipped = false,
  onToggleChampionRegalia,
  isCaptureMode = false,
  isEndCardVisible = false,
  onCastSkill,
}) => {
  const [, setLayoutTick] = useState(0);
  const dragRef = useRef<{
    widgetId: HudWidgetId;
    startX: number;
    startY: number;
  } | null>(null);

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

  const isHudUnlocked = pvpTactical ? !pvpTactical.layout.locked : false;
  const bossTargetOffset = pvpTactical?.getWidget('bossTarget') || { offsetX: 0, offsetY: 0, scale: 1 };
  const vitalsOffset = pvpTactical?.getWidget('playerVitals') || { offsetX: 0, offsetY: 0, scale: 1 };
  const actionBarOffset = pvpTactical?.getWidget('actionBar') || { offsetX: 0, offsetY: 0, scale: 1 };
  const teamFightOffset = pvpTactical?.getWidget('teamFightHud') || { offsetX: 0, offsetY: 0, scale: 1 };

  const startDragWidget = (widgetId: HudWidgetId, e: React.MouseEvent) => {
    if (!pvpTactical || pvpTactical.layout.locked) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { widgetId, startX: e.clientX, startY: e.clientY };

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current || !pvpTactical) return;
      const dx = me.clientX - dragRef.current.startX;
      const dy = me.clientY - dragRef.current.startY;
      dragRef.current.startX = me.clientX;
      dragRef.current.startY = me.clientY;
      pvpTactical.moveWidgetByDelta(dragRef.current.widgetId, dx, dy);
      setLayoutTick((t) => t + 1);
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

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

  const isOathDemo = Boolean(oathcallDemoState?.active);

  return (
    <div className="pointer-events-none select-none">
      {/* Kid-Safe Knockout Flash of Light (Zero Blood / Zero Gore) */}
      {isOathDemo && oathcallDemoState && oathcallDemoState.knockoutFlashAlpha > 0.01 && (
        <div
          className="fixed inset-0 z-30 pointer-events-none transition-opacity duration-75"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 250, 220, 0.92) 0%, rgba(56, 189, 248, 0.45) 55%, rgba(10, 12, 20, 0) 100%)',
            opacity: oathcallDemoState.knockoutFlashAlpha,
          }}
        />
      )}

      {/* Trailer Capture Mode (?capture=1) Corner Mark */}
      {isCaptureMode && !isOathDemo && (
        <div className="fixed top-5 right-6 z-30 px-3 py-1 rounded bg-black/55 backdrop-blur-sm border border-amber-400/40 text-[11px] font-mono font-bold tracking-wider text-amber-200 shadow-lg">
          #TeamClaudeForLife · CLAUDE&apos;s N Joshua&apos;s
        </div>
      )}

      {/* OATHCALL + TOWNSHIPS + CHAMPION REGALIA DEMO HEADER & LIVE BANNERS (`?oathcallDemo=1`) */}
      {isOathDemo && oathcallDemoState && (
        <>
          {/* Top-Left Design Brief Stage Banner */}
          <div className="fixed top-4 left-4 z-30 max-w-xl bg-neutral-950/90 backdrop-blur-md border-2 border-cyan-400/70 rounded-md px-4 py-2.5 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-300 mb-0.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>DREAM ENGINE · CLEAN-ROOM PVP DESIGN DEMO · STAGE {oathcallDemoState.phase}/4</span>
            </div>
            <div className="text-sm font-black tracking-wide text-white">
              {oathcallDemoState.phaseTitle}
            </div>
            <div className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
              {oathcallDemoState.phaseSubtitle}
            </div>
          </div>

          {/* Top-Right Township & Rules Compliance Ledger */}
          <div className="fixed top-4 right-4 z-30 w-80 bg-neutral-950/90 backdrop-blur-md border border-amber-400/60 rounded-md px-3.5 py-2.5 shadow-2xl font-mono text-[11px]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-1 mb-1.5">
              <span className="text-amber-300 font-bold uppercase tracking-wider">
                🏰 {oathcallDemoState.townshipSummary.name}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                IN-GAME GOLD ONLY
              </span>
            </div>
            <div className="space-y-1 text-[10px] text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-400">Holding Guild:</span>
                <span className="text-white font-bold">{oathcallDemoState.townshipSummary.holdingGuild}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Township Trade Tax:</span>
                <span className="text-amber-300 font-bold">{oathcallDemoState.townshipSummary.taxRatePct}% (Cap 33%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Guild Bank Vault:</span>
                <span className="text-yellow-300 font-bold">{oathcallDemoState.townshipSummary.guildBankGold} Gold</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Next Defense:</span>
                <span className="text-cyan-300">{oathcallDemoState.townshipSummary.nextBattleWindow}</span>
              </div>
            </div>
          </div>

          {/* Phase 1: Victim Oathcall Mark & Zero-Loss Protection Card */}
          {oathcallDemoState.phase === 1 && (
            <div className="fixed top-32 left-1/2 -translate-x-1/2 z-30 bg-neutral-950/92 border-2 border-amber-400/80 rounded-lg px-6 py-3.5 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex flex-col items-center text-center max-w-lg">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 mb-1">
                ⚡ KID-SAFE FLASH OF LIGHT KNOCKOUT · 0 XP / 0 GOLD / 0 ITEM LOSS
              </div>
              <div className="text-base font-black text-white">
                OATHCALL MARK PLACED ON {oathcallDemoState.attackerName.toUpperCase()} (Lv.{oathcallDemoState.attackerLevel} · Gear {oathcallDemoState.attackerGear})
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-rose-500/25 border border-rose-400/50 text-rose-200 font-bold">
                  Bully Rule Active (+61 Lv / +370 Gear)
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 font-bold">
                  Timer: {oathcallDemoState.markDurationLabel}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 font-bold">
                  +{oathcallDemoState.valorBuffPct}% Ally Valor
                </span>
              </div>
              <div className="mt-2 text-[11px] text-neutral-300 font-mono">
                Victim <strong className="text-white">{oathcallDemoState.victimName} (Lv.{oathcallDemoState.victimLevel})</strong> selects 3 trusted allies: <span className="text-cyan-300 font-bold">Kaelen [Guild], Lyra [Party], Vex [Friend]</span> (Max 5 · Never Strangers)
              </div>
            </div>
          )}

          {/* Phase 2 & 3: Dramatic Attacker Warning Banner ("Oathcall answered: 3 incoming") */}
          {oathcallDemoState.warningBannerText && (
            <div className="fixed top-32 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-rose-950/95 via-neutral-950/95 to-rose-950/95 border-2 border-rose-500/90 rounded-lg px-7 py-3 shadow-[0_0_45px_rgba(244,63,94,0.45)] flex flex-col items-center text-center">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-rose-300 font-bold">
                ⚠️ SERVER-AUTHORITATIVE OATHCALL ALERT ⚠️
              </div>
              <div className="text-xl sm:text-2xl font-black tracking-wide text-white mt-0.5">
                {oathcallDemoState.warningBannerText}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-amber-200">
                <span>🛡️ Arrival Shield: {oathcallDemoState.arrivalShieldRemainingSec.toFixed(1)}s / 2.0s</span>
                <span>•</span>
                <span>⚔️ Bully Valor Buff: +{oathcallDemoState.valorBuffPct}%</span>
                <span>•</span>
                <span>📍 Destination: Attacker Open-PvP Zone</span>
              </div>
            </div>
          )}

          {/* Phase 4: Champion Regalia & Blue-Flame Holographic Floor Sigil Callout */}
          {oathcallDemoState.phase === 4 && (
            <div className="fixed top-32 left-1/2 -translate-x-1/2 z-30 bg-neutral-950/92 border-2 border-sky-400/90 rounded-lg px-7 py-3.5 shadow-[0_0_50px_rgba(56,189,248,0.45)] flex flex-col items-center text-center max-w-xl">
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-sky-300 font-bold">
                👑 PART 3 — EARNED-ONLY CHAMPION REGALIA (ZERO PAY-TO-WIN)
              </div>
              <div className="text-xl font-black text-white mt-0.5">
                DREAM SOVEREIGN AETHER-PLATE + BLUE-FLAME HOLOGRAPHIC FLOOR SIGIL
              </div>
              <div className="mt-1.5 flex flex-wrap justify-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 font-bold">
                  +0 ATK · +0 DEF · +0 HP · +0 SPD (Status, Not Power)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold">
                  Never Sold in Mall · Never Tradeable · Never Token Reward
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* 1. Top Center: Hollow Sentinel / Bully Attacker Target Health Bar (Draggable when HUD Unlocked) */}
      <div
        onMouseDown={(e) => startDragWidget('bossTarget', e)}
        style={{
          transform: `translate(calc(-50% + ${bossTargetOffset.offsetX}px), ${bossTargetOffset.offsetY}px) scale(${bossTargetOffset.scale})`,
        }}
        className={`fixed ${
          isCaptureMode ? (isOathDemo ? 'top-4' : 'top-6') : 'top-24'
        } left-1/2 flex flex-col items-center z-20 w-88 sm:w-[420px] bg-neutral-950/80 backdrop-blur-md px-4 py-2 rounded-md border ${
          isHudUnlocked
            ? 'border-cyan-400 ring-2 ring-cyan-400/40 cursor-move pointer-events-auto'
            : 'border-amber-500/40'
        } shadow-2xl`}
      >
        <div className="flex justify-between items-center w-full px-0.5 mb-1 text-xs">
          <span className="font-bold tracking-wider uppercase text-amber-100 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            {isOathDemo && oathcallDemoState
              ? `${oathcallDemoState.attackerName} (Lv.${oathcallDemoState.attackerLevel} Bully Target)`
              : 'Hollow Sentinel Colossus'}
            {isHudUnlocked && <Move className="w-3 h-3 text-cyan-300 ml-1" />}
          </span>
          <span className="font-mono font-bold text-amber-300 text-xs">
            {isOathDemo && oathcallDemoState
              ? `${oathcallDemoState.attackerHpPct}% HP`
              : `${Math.round(sentinel.health)} / 120 HP`}
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
            style={{
              width: `${
                isOathDemo && oathcallDemoState
                  ? oathcallDemoState.attackerHpPct
                  : Math.max(0, (sentinel.health / 120) * 100)
              }%`,
            }}
          />
        </div>
        <div className={`text-[10px] font-mono mt-1 ${sentinelStatusColor}`}>
          {isOathDemo && oathcallDemoState
            ? oathcallDemoState.attackerHpPct <= 0
              ? 'DEFEATED BY OATHCALL SQUAD • Sunspire Justice Settled'
              : `Oathcall Mark Active (${oathcallDemoState.markDurationLabel}) • +${oathcallDemoState.valorBuffPct}% Ally Valor`
            : sentinelStatus}
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
      {latestCallout && skillVfx && skillVfx.comboChainCount > 0 && !isEndCardVisible && !isOathDemo && (
        <div
          className={`fixed ${
            isCaptureMode ? 'top-24' : 'top-40'
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

      {/* 1d. Team-Fight Squad & Shift+Right-Click Tactical Ping Coordinator (Left Dock — Movable) */}
      {pvpTactical && (!isCaptureMode || (isOathDemo && oathcallDemoState?.phase === 3)) && (
        <div
          onMouseDown={(e) => startDragWidget('teamFightHud', e)}
          style={{
            transform: `translate(${teamFightOffset.offsetX}px, ${teamFightOffset.offsetY}px) scale(${teamFightOffset.scale})`,
          }}
          className={`fixed ${isOathDemo ? 'top-36' : 'top-28'} left-4 z-20 w-64 bg-neutral-950/85 backdrop-blur-md border ${
            isHudUnlocked
              ? 'border-cyan-400 ring-2 ring-cyan-400/40 cursor-move'
              : 'border-neutral-800'
          } rounded-md p-2.5 shadow-xl pointer-events-auto`}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              PvP Team-Fight Focus
              {isHudUnlocked && <Move className="w-3 h-3 text-cyan-300" />}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Shift+RMB Ping
            </span>
          </div>

          {/* Active Focus Target Banner */}
          <div className="bg-neutral-900/90 border border-rose-500/40 rounded px-2 py-1.5 mb-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <Crosshair className="w-3 h-3" /> FOCUS:
              </span>
              <span className="text-white font-bold truncate">{pvpTactical.focusTarget.targetName}</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-400 mt-0.5 flex justify-between">
              <span>Called by {pvpTactical.focusTarget.calledBy}</span>
              <span className="text-amber-300 font-bold">{pvpTactical.focusTarget.healthPct}% HP</span>
            </div>
          </div>

          {/* Quick Ping Type Selector */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {(['focus', 'attack', 'regroup', 'danger'] as TacticalPingKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  pvpTactical.activePingKind = kind;
                  pvpTactical.triggerShiftRightClickPing({
                    worldX: 0,
                    worldZ: -10,
                    kind,
                    senderName: 'Joshua',
                    targetEntityName: 'Hollow Sentinel',
                  });
                  setLayoutTick((t) => t + 1);
                }}
                className={`px-1 py-1 rounded text-[9px] font-mono uppercase font-bold border cursor-pointer transition ${
                  pvpTactical.activePingKind === kind
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                {kind}
              </button>
            ))}
          </div>

          {/* Squad Members & Oathcall Status */}
          <div className="space-y-1">
            {pvpTactical.squad.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between text-[10px] font-mono bg-neutral-900/70 px-2 py-1 rounded border border-neutral-800/80"
              >
                <span className="text-neutral-200 font-semibold">{m.name}</span>
                <span className="text-emerald-400 text-[9px]">{m.role} · {m.hpPct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Bottom Center: Movable Player Health/Stamina Bars & Action Bar */}
      <div
        style={{
          transform: `translate(calc(-50% + ${actionBarOffset.offsetX}px), ${actionBarOffset.offsetY}px) scale(${actionBarOffset.scale})`,
        }}
        className="fixed bottom-5 left-1/2 flex flex-col items-center z-20 w-full max-w-2xl px-4"
      >
        {/* Top Control Strip on the Action Bar: Unlock/Move GUI, Presets, & Champion Regalia Toggle */}
        {!isCaptureMode && pvpTactical && (
          <div className="mb-1.5 flex flex-wrap items-center justify-center gap-1.5 pointer-events-auto">
            {activeClass && activeTheme && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-950/90 border border-rose-500/40 text-[10px] font-mono text-neutral-300 shadow-lg">
                <span className="font-bold text-rose-400 uppercase">{activeClass.name}</span>
                <span className="text-neutral-600">•</span>
                <span className="text-cyan-300 font-bold">{activeTheme.badge}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                pvpTactical.setLocked(!pvpTactical.layout.locked);
                setLayoutTick((t) => t + 1);
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border cursor-pointer transition ${
                isHudUnlocked
                  ? 'bg-cyan-500 text-neutral-950 border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                  : 'bg-neutral-950/90 text-cyan-300 border-cyan-500/40 hover:bg-neutral-900'
              }`}
              title="Unlock HUD bars to drag Action Bar, Vitals, Boss Target, and Squad Frame anywhere on screen"
            >
              {isHudUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{isHudUnlocked ? 'DRAG GUI BARS (UNLOCKED)' : 'Move GUI Bars'}</span>
            </button>

            {isHudUnlocked && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    pvpTactical.applyPreset('pvp-centered');
                    setLayoutTick((t) => t + 1);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-neutral-950/95 border border-amber-400/80 text-amber-300 text-[10px] font-mono font-bold cursor-pointer hover:bg-neutral-900 shadow"
                >
                  PvP Centered Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pvpTactical.resetLayout();
                    setLayoutTick((t) => t + 1);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 text-[10px] font-mono cursor-pointer hover:text-white"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Reset
                </button>
              </>
            )}

            {onToggleChampionRegalia && (
              <button
                type="button"
                onClick={onToggleChampionRegalia}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border cursor-pointer transition ${
                  isChampionRegaliaEquipped
                    ? 'bg-sky-500/30 text-sky-200 border-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]'
                    : 'bg-neutral-950/90 text-sky-300 border-sky-500/40 hover:bg-neutral-900'
                }`}
                title="Preview Earned-Only Champion Regalia & Rotating Blue-Flame Floor Sigil (0 Stats)"
              >
                <Crown className="w-3 h-3 text-amber-300" />
                <span>{isChampionRegaliaEquipped ? 'Champion Regalia: ON (0 Stats)' : 'Champion Regalia Sigil'}</span>
              </button>
            )}
          </div>
        )}

        {/* Prompt Band */}
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

        {/* Player Bars: Health & Stamina (Draggable via playerVitals or actionBar) */}
        <div
          onMouseDown={(e) => startDragWidget('playerVitals', e)}
          style={{
            transform: `translate(${vitalsOffset.offsetX}px, ${vitalsOffset.offsetY}px) scale(${vitalsOffset.scale})`,
          }}
          className={`w-full max-w-sm mb-2.5 space-y-1 bg-neutral-950/80 px-3 py-1.5 rounded border ${
            isHudUnlocked
              ? 'border-cyan-400 ring-2 ring-cyan-400/40 cursor-move pointer-events-auto'
              : 'border-neutral-800/90'
          }`}
        >
          <div className="flex justify-between text-[10px] font-mono text-neutral-300">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              HERO HP {Math.round(combat.health)}/100
              {isHudUnlocked && <Move className="w-2.5 h-2.5 text-cyan-300" />}
            </span>
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

        {/* Hotbar Showing Cooldowns + Clickable Authoritative 3D Skill Triggers (Draggable when unlocked) */}
        <div
          onMouseDown={(e) => startDragWidget('actionBar', e)}
          className={`flex ${
            pvpTactical?.layout.actionBarOrientation === 'vertical'
              ? 'flex-col space-y-1.5'
              : pvpTactical?.layout.actionBarOrientation === 'compact-2row'
              ? 'flex-wrap justify-center gap-1.5 max-w-xs'
              : 'items-center space-x-2'
          } pointer-events-auto p-1 rounded ${
            isHudUnlocked ? 'ring-2 ring-cyan-400 bg-cyan-950/30 cursor-move' : ''
          }`}
        >
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
      {isEndCardVisible && !isOathDemo && (
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
