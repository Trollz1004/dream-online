/**
 * DREAM Engine — Equipment & Costume Panoply Window (`src/ui/EquipmentAndCostumeModal.tsx`)
 *
 * Designed new in our own three-column architectural ledger layout following:
 *  - docs/gdd/09-interface-style.md (calm, dark, see-through panel over blurred world;
 *    large thin light title top-left with fine rule under it; three columns; one Back
 *    control bottom centre; white on dark; high-contrast large type for low vision).
 *  - RULINGS-2026-11-12.md (sections 2, 3, and 7: weapons, armor, 6 gem-socketed accessories,
 *    costume overlay layer, full combat 8-slot costume incl. 3 weapon skins, 2-slot life-skill
 *    costume on helm & chest, free mixing including fish head + swimsuit bottom, configurable
 *    whole-set requirement, crystal recovery totals, per-piece hide/show, gear vs costume toggle).
 *  - GEMINI-JEWLS-ACCESSORIES-PROPOSAL-2026-11-10.md (6 accessories, 10 sockets, 4 gem tiers).
 *  - FORGE-CRYSTALS-PROPOSAL-2026-11-10.md (15 crystal stages, 4 recovery stats, wings & aura).
 */

import React, { useEffect, useState } from 'react';
import {
  ACCESSORY_MAX_GEM_SOCKETS,
  ACCESSORY_SLOT_IDS,
  ARMOR_SLOT_IDS,
  COMBAT_COSTUME_SLOTS,
  COSTUME_PIECES,
  COSTUME_SETS,
  COSTUME_SLOT_IDS,
  COSTUME_SLOT_META,
  CRYSTAL_RECOVERY_STAT_IDS,
  CRYSTAL_STAT_CAPS,
  CRYSTAL_STAT_LABELS,
  CRYSTAL_STAT_STEP_PERCENTS,
  DEFAULT_COSTUME_SET_RULE_CONFIG,
  DEFAULT_REQUIRE_WHOLE_COSTUME_SET,
  FULL_COMBAT_GEAR_LOADOUT,
  GEAR_SLOT_IDS,
  GEAR_SLOT_META,
  GEM_DEFINITIONS,
  GEM_ELEMENT_CAP_PERCENT,
  GEM_TIER_BONUS_PERCENTS,
  LIFE_SKILL_COSTUME_SLOTS,
  MAX_CRYSTAL_STAGE,
  TOTAL_MAX_ACCESSORY_GEM_SOCKETS,
  WEAPON_SLOT_IDS,
  computeEquipmentTotals,
  createCostumeSetRuleConfig,
  createEmptyEquipmentState,
  createFishHeadSwimsuitMixState,
  createFullEquippedState,
  createLifeSkillAnglerState,
  createStateFromPreset,
  equipCostumePiece,
  evaluateCostumeSets,
  formatArmorWingMetalLabel,
  getCostumePieceById,
  getCostumePiecesForSlot,
  resolveArmorWingMetalTier,
  resolveVisibleCharacterAppearance,
  setCharacterDisplayMode,
  toggleCostumeSlotVisibility,
  toggleGearSlotEquipped,
  type AccessoryGemSocketState,
  type AccessorySlotId,
  type ArmorSlotId,
  type CharacterAppearanceDisplayMode,
  type CostumePiece,
  type CostumeSetEvaluation,
  type CostumeSetRuleConfig,
  type CostumeSlotId,
  type CrystalRecoveryStatId,
  type EquipmentPresetId,
  type EquipmentTotalsSummary,
  type EquipmentWindowState,
  type GearItem,
  type GearSlotId,
  type WeaponSlotId,
} from '../game/equipment/index.ts';

export {
  ACCESSORY_MAX_GEM_SOCKETS,
  ACCESSORY_SLOT_IDS,
  ARMOR_SLOT_IDS,
  COMBAT_COSTUME_SLOTS,
  COSTUME_PIECES,
  COSTUME_SETS,
  COSTUME_SLOT_IDS,
  COSTUME_SLOT_META,
  CRYSTAL_RECOVERY_STAT_IDS,
  CRYSTAL_STAT_CAPS,
  CRYSTAL_STAT_LABELS,
  CRYSTAL_STAT_STEP_PERCENTS,
  DEFAULT_COSTUME_SET_RULE_CONFIG,
  DEFAULT_REQUIRE_WHOLE_COSTUME_SET,
  FULL_COMBAT_GEAR_LOADOUT,
  GEAR_SLOT_IDS,
  GEAR_SLOT_META,
  GEM_DEFINITIONS,
  GEM_ELEMENT_CAP_PERCENT,
  GEM_TIER_BONUS_PERCENTS,
  LIFE_SKILL_COSTUME_SLOTS,
  MAX_CRYSTAL_STAGE,
  TOTAL_MAX_ACCESSORY_GEM_SOCKETS,
  WEAPON_SLOT_IDS,
  computeEquipmentTotals,
  createCostumeSetRuleConfig,
  createEmptyEquipmentState,
  createFishHeadSwimsuitMixState,
  createFullEquippedState,
  createLifeSkillAnglerState,
  createStateFromPreset,
  equipCostumePiece,
  evaluateCostumeSets,
  formatArmorWingMetalLabel,
  getCostumePieceById,
  getCostumePiecesForSlot,
  resolveArmorWingMetalTier,
  resolveVisibleCharacterAppearance,
  setCharacterDisplayMode,
  toggleCostumeSlotVisibility,
  toggleGearSlotEquipped,
  type AccessoryGemSocketState,
  type AccessorySlotId,
  type ArmorSlotId,
  type CharacterAppearanceDisplayMode,
  type CostumePiece,
  type CostumeSetEvaluation,
  type CostumeSetRuleConfig,
  type CostumeSlotId,
  type CrystalRecoveryStatId,
  type EquipmentPresetId,
  type EquipmentTotalsSummary,
  type EquipmentWindowState,
  type GearItem,
  type GearSlotId,
  type WeaponSlotId,
};

export const EQUIPMENT_WINDOW_HELP_RULES: readonly string[] = Object.freeze([
  'Costume slots sit over your gear as a separate layer. Full combat costumes cover 8 slots including main hand, off hand, and awakening weapons; life-skill costumes cover only helm and chest.',
  'Mix any costume part with any other, combat or life skill. Under the default whole-set rule, breaking a set turns that set effect off while keeping per-piece hat or tier bonuses.',
  'Crystals forged at Fable’s add 15 stages of recovery stats (cooldown reduction, mana recovery, stamina, energy), weapon aura density, and armor wings without adding attack or defense.',
  'Six accessories enhanced at Jewls’ Jewelry Box hold 10 guaranteed gem sockets (3 on necklace, 2 per ring, 1 per earring, 2 on bracelet) up to Tier 4 Fossilized gems.',
]);

export const EQUIPMENT_WINDOW_PAYMENTS_LINE =
  "Payments: the game's own merchant account. Nothing in this screen is pay-to-win.";

const FONT_STACK = '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';

export interface EquipmentAndCostumeModalProps {
  isOpen: boolean;
  initialPreset?: EquipmentPresetId;
  state?: EquipmentWindowState;
  reducedMotion?: boolean;
  onChangeState?: (next: EquipmentWindowState) => void;
  onClose: () => void;
}

// ============================================================================
// IN-HOUSE GEOMETRIC SVG ICONS (DRAWN IN CODE — ZERO EXTERNAL OR COPIED ART)
// ============================================================================

function renderSlotSvgIcon(slot: GearSlotId | CostumeSlotId, size = 20): React.ReactElement {
  const stroke = '#F5F5F7';
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    style: { flexShrink: 0 },
  };

  switch (slot) {
    case 'main-hand':
      return (
        <svg {...common}>
          <path d="M14.5 4.5L19.5 4.5L19.5 9.5L10.5 18.5L5.5 13.5L14.5 4.5Z" />
          <path d="M4 20L7.5 16.5" />
          <path d="M4.5 12.5L11.5 19.5" />
        </svg>
      );
    case 'off-hand':
      return (
        <svg {...common}>
          <path d="M12 3L19 6V12C19 16.5 15.8 19.8 12 21C8.2 19.8 5 16.5 5 12V6L12 3Z" />
          <path d="M12 7V17" />
          <path d="M8 11H16" />
        </svg>
      );
    case 'awakening':
      return (
        <svg {...common}>
          <path d="M4 20L18 6" />
          <path d="M13 4L20 4L20 11" />
          <path d="M15 9C17.5 9 19 7.5 20 4C16.5 5 15 6.5 15 9Z" />
          <circle cx="7" cy="17" r="1.6" />
        </svg>
      );
    case 'helm':
      return (
        <svg {...common}>
          <path d="M6 15V11C6 7.5 8.7 5 12 5C15.3 5 18 7.5 18 11V15L15 18H9L6 15Z" />
          <path d="M9 12H15" />
          <path d="M12 12V16" />
          <path d="M4 9L6 11" />
          <path d="M20 9L18 11" />
        </svg>
      );
    case 'chest':
      return (
        <svg {...common}>
          <path d="M7 4L10 6H14L17 4L20 8L18 11V19H6V11L4 8L7 4Z" />
          <path d="M12 6V19" />
          <path d="M8 14H16" />
        </svg>
      );
    case 'gloves':
      return (
        <svg {...common}>
          <path d="M7 13V7C7 5.9 7.9 5 9 5H15C16.1 5 17 5.9 17 7V13L15 19H9L7 13Z" />
          <path d="M7 13H17" />
          <path d="M10 8V11" />
          <path d="M14 8V11" />
        </svg>
      );
    case 'bottom':
      return (
        <svg {...common}>
          <path d="M7 4H17L18 19H14L12 11L10 19H6L7 4Z" />
          <path d="M7 8H17" />
        </svg>
      );
    case 'boots':
      return (
        <svg {...common}>
          <path d="M8 4H14V13L18 16V19H6V4H8Z" />
          <path d="M8 9H14" />
        </svg>
      );
    case 'necklace':
      return (
        <svg {...common}>
          <circle cx="12" cy="10" r="6" />
          <polygon points="12,15 15,19 12,22 9,19" />
        </svg>
      );
    case 'ring-1':
    case 'ring-2':
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="6" />
          <polygon points="12,4 14.5,7 9.5,7" />
        </svg>
      );
    case 'earring-1':
    case 'earring-2':
      return (
        <svg {...common}>
          <path d="M12 4C9.5 4 8 6 8 8.2C8 10 9.5 11.2 12 11.2" />
          <polygon points="12,12 14.8,16.5 12,20.5 9.2,16.5" />
        </svg>
      );
    case 'bracelet':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="8" ry="5" />
          <circle cx="8" cy="12" r="1.3" />
          <circle cx="16" cy="12" r="1.3" />
        </svg>
      );
  }
}

function renderGemSocketSvg(
  socket: AccessoryGemSocketState,
  slotId: AccessorySlotId,
): React.ReactElement {
  const filled = Boolean(socket.unlocked && socket.gem);
  const gemDef = socket.gem ? GEM_DEFINITIONS[socket.gem.gemId] : null;
  const pct = socket.gem ? GEM_TIER_BONUS_PERCENTS[socket.gem.tier] : 0;
  const tierCode =
    socket.gem?.tier === 'fossilized'
      ? 'T4'
      : socket.gem?.tier === 'flawless'
        ? 'T3'
        : socket.gem?.tier === 'cut'
          ? 'T2'
          : 'T1';

  return (
    <span
      key={`${slotId}-socket-${socket.index}`}
      data-testid={`gem-socket-${slotId}-${socket.index}`}
      title={
        filled && gemDef && socket.gem
          ? `Socket ${socket.index + 1}: ${socket.gem.tier.toUpperCase()} ${gemDef.name} (+${pct}% ${gemDef.elementLabel} DMG & RES)`
          : `Socket ${socket.index + 1}: Open Gem Socket`
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        backgroundColor: filled ? 'rgba(255, 255, 255, 0.14)' : 'rgba(10, 10, 12, 0.9)',
        border: filled
          ? '1px solid rgba(255, 255, 255, 0.72)'
          : '1px dashed rgba(255, 255, 255, 0.35)',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.04em',
        color: '#F5F5F7',
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
        <polygon
          points="6,1 11,6 6,11 1,6"
          fill={filled ? '#F5F5F7' : 'none'}
          stroke="#F5F5F7"
          strokeWidth="1.3"
        />
      </svg>
      <span>
        {filled && gemDef ? `${tierCode} ${gemDef.glyphCode} +${pct}%` : 'EMPTY'}
      </span>
    </span>
  );
}

// ============================================================================
// LIVE IN-HOUSE SCULPTED CHARACTER PREVIEW STAGE
// ============================================================================

function renderCharacterPreviewSvg(
  state: EquipmentWindowState,
  totals: EquipmentTotalsSummary,
  compact: boolean,
  pulseKey: number,
  reducedMotion: boolean,
): React.ReactElement {
  const appearance = resolveVisibleCharacterAppearance(state);
  const hasFishHead = appearance.helm.visualTag === 'fish-head';
  const hasSwimsuitBottom = appearance.bottom.visualTag === 'swimsuit-bottom';
  const hasSovereignHelm = appearance.helm.visualTag === 'sovereign-combat';
  const hasGearHelm = appearance.helm.visualTag === 'gear-helm';
  const hasChefHat = appearance.helm.visualTag === 'chef-hat';
  const hasSovereignChest = appearance.chest.visualTag === 'sovereign-combat';
  const hasZebraVest = appearance.chest.visualTag === 'zebra-angler';
  const hasGearChest = appearance.chest.visualTag === 'gear-chest';
  const hasWeaponMain = appearance['main-hand'].activeSource !== 'basic-or-empty';
  const hasWeaponOff = appearance['off-hand'].activeSource !== 'basic-or-empty';
  const hasWeaponAwakening = appearance.awakening.activeSource !== 'basic-or-empty';
  const hasCrystalWings =
    Boolean(state.gear.chest && state.gear.chest.crystalStage >= 1) ||
    Boolean(state.gear.helm && state.gear.helm.crystalStage >= 1);
  const anyCompleteSet = totals.costumeSets.some((s) => s.effectActive && s.isComplete);

  return (
    <div
      data-testid="equipment-character-preview"
      data-display-mode={state.displayMode}
      data-preset-id={state.presetId}
      style={{
        position: 'relative',
        width: '100%',
        height: compact ? '138px' : '295px',
        backgroundColor: 'rgba(10, 10, 12, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.34)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: compact ? '6px 8px' : '12px 16px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top Status Banner inside Preview */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          zIndex: 2,
          fontSize: compact ? '11px' : '12px',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: '#F5F5F7',
        }}
      >
        <span data-testid="preview-mode-badge" style={{ fontWeight: 600 }}>
          {state.displayMode === 'costume'
            ? 'PREVIEW: COSTUME OVERLAY ON'
            : 'PREVIEW: BASE GEAR ONLY'}
        </span>
        <span data-testid="preview-set-state-badge" style={{ fontWeight: 500 }}>
          {anyCompleteSet
            ? 'SET BONUS ACTIVE'
            : totals.equippedCostumeCount > 0
              ? 'MIXED LOOK · SET OFF'
              : 'NO COSTUME EQUIPPED'}
        </span>
      </div>

      {/* Sculpted Vector Hero Rig */}
      <svg
        key={pulseKey}
        viewBox="0 0 280 220"
        style={{
          width: compact ? '145px' : '255px',
          height: compact ? '94px' : '215px',
          overflow: 'visible',
          transition: reducedMotion ? 'none' : 'transform 220ms ease-out',
        }}
        role="img"
        aria-label={`Live character preview showing ${appearance.helm.label}, ${appearance.chest.label}, and ${appearance.bottom.label}`}
      >
        {/* Ground Pedestal Ring & Set Completion Resonance Ring */}
        <ellipse
          cx="140"
          cy="202"
          rx="74"
          ry="12"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.5"
        />
        {anyCompleteSet && (
          <ellipse
            cx="140"
            cy="202"
            rx="88"
            ry="16"
            fill="none"
            stroke="#F5F5F7"
            strokeWidth="1.8"
            strokeDasharray="6 4"
          />
        )}

        {/* Stage 15 Platinum & Diamond Inlay Armor Wings (Forge Crystals Proposal) */}
        {hasCrystalWings && (
          <g data-testid="preview-crystal-wings" stroke="#F5F5F7" strokeWidth="1.5" fill="rgba(255,255,255,0.09)">
            {/* Left Wing */}
            <path d="M115 86 L52 44 L66 72 L40 78 L72 98 L48 112 L88 118 L115 110 Z" />
            <polygon points="72,64 78,60 82,66 76,70" fill="#F5F5F7" />
            {/* Right Wing */}
            <path d="M165 86 L228 44 L214 72 L240 78 L208 98 L232 112 L192 118 L165 110 Z" />
            <polygon points="208,64 202,60 198,66 204,70" fill="#F5F5F7" />
          </g>
        )}

        {/* Awakening Weapon on Back (Crimson Dragon Sovereign Halberd) */}
        {hasWeaponAwakening && (
          <g data-testid="preview-awakening-weapon" stroke="#F5F5F7" strokeWidth="2">
            <line x1="88" y1="194" x2="196" y2="22" />
            <path
              d="M182 34 L214 14 L208 46 L190 48 Z"
              fill="rgba(255,255,255,0.22)"
              stroke="#F5F5F7"
              strokeWidth="1.8"
            />
          </g>
        )}

        {/* Legs & Boots */}
        <g stroke="#F5F5F7" strokeWidth="1.8">
          <rect x="116" y="138" width="18" height="48" rx="4" fill="rgba(255,255,255,0.12)" />
          <rect x="146" y="138" width="18" height="48" rx="4" fill="rgba(255,255,255,0.12)" />
          {/* Boots */}
          <path d="M112 184 H136 V198 H108 Z" fill="rgba(255,255,255,0.28)" />
          <path d="M144 184 H168 V198 H172 Z" fill="rgba(255,255,255,0.28)" />
        </g>

        {/* Lower Body: Swimsuit Bottom vs Combat Plate Tassets vs Kid-Safe Trousers */}
        {hasSwimsuitBottom ? (
          <g data-testid="preview-swimsuit-bottom" stroke="#F5F5F7" strokeWidth="2">
            <path
              d="M112 122 H168 L164 148 H144 L140 138 L136 148 H116 Z"
              fill="rgba(255,255,255,0.34)"
            />
            {/* Striped coastal waistband & wave stripes */}
            <line x1="113" y1="128" x2="167" y2="128" stroke="#0A0A0C" strokeWidth="2.2" />
            <line x1="115" y1="136" x2="165" y2="136" stroke="#0A0A0C" strokeWidth="2.2" />
            <text
              x="140"
              y="163"
              textAnchor="middle"
              fill="#F5F5F7"
              fontSize="8.5"
              fontWeight="700"
              letterSpacing="1"
            >
              SWIMSUIT BOTTOM
            </text>
          </g>
        ) : (
          <g stroke="#F5F5F7" strokeWidth="1.8">
            <path
              d="M110 120 H170 L166 154 H143 L140 136 L137 154 H114 Z"
              fill={
                appearance.bottom.activeSource === 'basic-or-empty'
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.22)'
              }
            />
          </g>
        )}

        {/* Torso / Chest Layer */}
        <g stroke="#F5F5F7" strokeWidth="1.8">
          <path
            d="M104 72 L122 64 H158 L176 72 L168 124 H112 Z"
            fill={
              hasSovereignChest || hasGearChest
                ? 'rgba(255,255,255,0.26)'
                : hasZebraVest
                  ? 'rgba(255,255,255,0.32)'
                  : 'rgba(255,255,255,0.1)'
            }
          />
          {/* Engraved Sovereign Crest or Zebra Stripes on Chest */}
          {(hasSovereignChest || hasGearChest) && (
            <>
              <polygon points="140,76 149,88 140,100 131,88" fill="#F5F5F7" />
              <line x1="116" y1="108" x2="164" y2="108" />
            </>
          )}
          {hasZebraVest && (
            <>
              <line x1="114" y1="80" x2="134" y2="94" stroke="#0A0A0C" strokeWidth="2.4" />
              <line x1="166" y1="80" x2="146" y2="94" stroke="#0A0A0C" strokeWidth="2.4" />
              <line x1="116" y1="102" x2="164" y2="102" stroke="#0A0A0C" strokeWidth="2.4" />
            </>
          )}
        </g>

        {/* Arms & Gauntlets */}
        <g stroke="#F5F5F7" strokeWidth="1.8" fill="rgba(255,255,255,0.18)">
          <rect x="86" y="74" width="16" height="46" rx="5" />
          <rect x="178" y="74" width="16" height="46" rx="5" />
        </g>

        {/* HEADPIECE: Zebra Fish-Head Mascot vs Sovereign Greathelm vs Chef Hat vs Unhelmeted */}
        {hasFishHead ? (
          <g data-testid="preview-fish-head" stroke="#F5F5F7" strokeWidth="2">
            {/* Oversized Sculpted Fish Head Mascot */}
            <path
              d="M92 44 C92 16, 152 10, 188 34 L208 20 L202 44 L210 62 L186 52 C154 68, 96 66, 92 44 Z"
              fill="rgba(255,255,255,0.34)"
            />
            {/* Dorsal Fin */}
            <path d="M122 18 L142 4 L158 18 Z" fill="rgba(255,255,255,0.45)" />
            {/* Zebra Scale Stripes */}
            <path d="M132 22 L126 52" stroke="#0A0A0C" strokeWidth="2.8" />
            <path d="M148 22 L142 54" stroke="#0A0A0C" strokeWidth="2.8" />
            <path d="M164 26 L158 52" stroke="#0A0A0C" strokeWidth="2.8" />
            {/* Big Fish Eye & Gill Slits */}
            <circle cx="112" cy="36" r="7" fill="#0A0A0C" stroke="#F5F5F7" strokeWidth="2" />
            <circle cx="110" cy="34" r="2.3" fill="#F5F5F7" />
            <path d="M100 48 H118" stroke="#0A0A0C" strokeWidth="2.2" />
            <text
              x="140"
              y="10"
              textAnchor="middle"
              fill="#F5F5F7"
              fontSize="8.5"
              fontWeight="700"
              letterSpacing="1"
            >
              ZEBRA FISH HEAD
            </text>
          </g>
        ) : hasSovereignHelm || hasGearHelm ? (
          <g data-testid="preview-armored-helm" stroke="#F5F5F7" strokeWidth="1.8">
            <path
              d="M118 28 C118 16, 162 16, 162 28 V58 H118 Z"
              fill="rgba(255,255,255,0.28)"
            />
            {/* Winged Greathelm Plumes */}
            <path d="M118 36 L94 16 L102 44 L118 48 Z" fill="rgba(255,255,255,0.22)" />
            <path d="M162 36 L186 16 L178 44 L162 48 Z" fill="rgba(255,255,255,0.22)" />
            {/* T-Visor */}
            <line x1="125" y1="40" x2="155" y2="40" stroke="#0A0A0C" strokeWidth="3" />
            <line x1="140" y1="40" x2="140" y2="54" stroke="#0A0A0C" strokeWidth="3" />
          </g>
        ) : hasChefHat ? (
          <g stroke="#F5F5F7" strokeWidth="1.8">
            <circle cx="140" cy="44" r="16" fill="rgba(255,255,255,0.16)" />
            <path d="M122 32 V14 C122 8, 158 8, 158 14 V32 Z" fill="rgba(255,255,255,0.34)" />
          </g>
        ) : (
          <g stroke="#F5F5F7" strokeWidth="1.8">
            <circle cx="140" cy="42" r="17" fill="rgba(255,255,255,0.14)" />
            <circle cx="134" cy="40" r="1.8" fill="#F5F5F7" />
            <circle cx="146" cy="40" r="1.8" fill="#F5F5F7" />
          </g>
        )}

        {/* Main Hand Broadsword (Left Side of Viewer / Right Hand of Hero) */}
        {hasWeaponMain && (
          <g data-testid="preview-main-weapon" stroke="#F5F5F7" strokeWidth="2">
            <polygon
              points="64,28 72,28 70,118 66,118"
              fill="rgba(255,255,255,0.35)"
            />
            <polygon points="64,28 68,14 72,28" fill="#F5F5F7" />
            <rect x="54" y="116" width="28" height="5" fill="#F5F5F7" />
            <rect x="65" y="121" width="6" height="16" fill="rgba(255,255,255,0.3)" />
          </g>
        )}

        {/* Off Hand Kite Shield (Right Side of Viewer / Left Forearm of Hero) */}
        {hasWeaponOff && (
          <g data-testid="preview-off-weapon" stroke="#F5F5F7" strokeWidth="2">
            <path
              d="M204 72 L232 82 V116 C232 138, 218 152, 204 160 C190 152, 176 138, 176 116 V82 Z"
              fill="rgba(255,255,255,0.24)"
            />
            <polygon points="204,92 214,112 204,132 194,112" fill="#F5F5F7" />
          </g>
        )}
      </svg>

      {/* Bottom Live Look Readout */}
      <div
        data-testid="preview-equipped-look-summary"
        style={{
          width: '100%',
          textAlign: 'center',
          fontSize: compact ? '11px' : '12px',
          fontWeight: 400,
          color: '#F5F5F7',
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {`Head: ${appearance.helm.label} · Chest: ${appearance.chest.label} · Bottom: ${appearance.bottom.label}`}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export const EquipmentAndCostumeModal: React.FC<EquipmentAndCostumeModalProps> = ({
  isOpen,
  initialPreset = 'full-combat',
  state: controlledState,
  reducedMotion: controlledReducedMotion,
  onChangeState,
  onClose,
}) => {
  const [internalState, setInternalState] = useState<EquipmentWindowState>(() =>
    createStateFromPreset(initialPreset),
  );
  const [focusedCostumeSlot, setFocusedCostumeSlot] = useState<CostumeSlotId>('helm');
  const [pulseKey, setPulseKey] = useState<number>(0);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof controlledReducedMotion === 'boolean') return controlledReducedMotion;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const activeState = controlledState ?? internalState;
  const effectiveReducedMotion = controlledReducedMotion ?? prefersReducedMotion;

  const commitState = (next: EquipmentWindowState, notice?: string) => {
    if (!controlledState) {
      setInternalState(next);
    }
    onChangeState?.(next);
    if (!effectiveReducedMotion) {
      setPulseKey((k) => k + 1);
    }
    if (notice) {
      setStatusNotice(notice);
    }
  };

  useEffect(() => {
    if (!controlledState) {
      setInternalState(createStateFromPreset(initialPreset));
    }
  }, [initialPreset, controlledState]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setIsCompactViewport(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onMotionChange = () => setPrefersReducedMotion(mq.matches);
      mq.addEventListener?.('change', onMotionChange);
      return () => {
        window.removeEventListener('resize', handleResize);
        mq.removeEventListener?.('change', onMotionChange);
      };
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Full Keyboard & Gamepad Polling Support (Accessibility for low vision)
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'SELECT' || target.tagName === 'INPUT')) {
        if (event.key !== 'Escape') return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const idx = COSTUME_SLOT_IDS.indexOf(focusedCostumeSlot);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIdx = (idx + delta + COSTUME_SLOT_IDS.length) % COSTUME_SLOT_IDS.length;
        setFocusedCostumeSlot(COSTUME_SLOT_IDS[nextIdx]);
        return;
      }
      if (event.key === '1') {
        commitState(
          createEmptyEquipmentState(activeState.setRuleConfig),
          'Loaded preset: Empty Loadout.',
        );
      } else if (event.key === '2') {
        commitState(
          createFullEquippedState(activeState.setRuleConfig),
          'Loaded preset: Full Equipped Combat Panoply (8/8).',
        );
      } else if (event.key === '3') {
        commitState(
          createFishHeadSwimsuitMixState(activeState.setRuleConfig),
          'Loaded preset: Mixed Fish Head + Swimsuit Bottom.',
        );
      } else if (event.key === '4') {
        commitState(
          createLifeSkillAnglerState(activeState.setRuleConfig),
          'Loaded preset: Full Zebra Fish Scale Angler (2/2).',
        );
      } else if (event.key === 'h' || event.key === 'H') {
        event.preventDefault();
        const next = toggleCostumeSlotVisibility(activeState, focusedCostumeSlot);
        const hidden = next.hiddenCostumeSlots[focusedCostumeSlot];
        commitState(
          next,
          `${COSTUME_SLOT_META[focusedCostumeSlot].label}: ${hidden ? 'Hidden' : 'Shown'}.`,
        );
      } else if (event.key === 'g' || event.key === 'G') {
        event.preventDefault();
        const nextMode: CharacterAppearanceDisplayMode =
          activeState.displayMode === 'costume' ? 'gear' : 'costume';
        commitState(
          setCharacterDisplayMode(activeState, nextMode),
          `Character display switched to ${nextMode === 'costume' ? 'Costume Layer' : 'Base Gear'}.`,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, focusedCostumeSlot, activeState]);

  if (!isOpen) return null;

  const totals = computeEquipmentTotals(activeState);

  const handleSelectPreset = (presetId: EquipmentPresetId) => {
    const next = createStateFromPreset(presetId, activeState.setRuleConfig);
    commitState(next, `Switched loadout preset to ${presetId}.`);
  };

  const handleToggleDisplayMode = () => {
    const nextMode: CharacterAppearanceDisplayMode =
      activeState.displayMode === 'costume' ? 'gear' : 'costume';
    commitState(
      setCharacterDisplayMode(activeState, nextMode),
      `Showing ${nextMode === 'costume' ? 'Costume Overlay' : 'Base Gear'} on character.`,
    );
  };

  const handleToggleWholeSetRule = () => {
    const nextConfig = createCostumeSetRuleConfig({
      requireWholeSet: !activeState.setRuleConfig.requireWholeSet,
    });
    commitState(
      Object.freeze({
        ...activeState,
        setRuleConfig: nextConfig,
      }),
      nextConfig.requireWholeSet
        ? 'Set rule: Whole costume set required for set effect.'
        : 'Set rule: Partial set pieces grant proportional bonus.',
    );
  };

  const renderGearRow = (slotId: GearSlotId) => {
    const meta = GEAR_SLOT_META[slotId];
    const item = activeState.gear[slotId];

    return (
      <div
        key={slotId}
        data-testid={`gear-slot-${slotId}`}
        onClick={() => {
          const next = toggleGearSlotEquipped(activeState, slotId);
          commitState(
            next,
            next.gear[slotId]
              ? `Equipped ${next.gear[slotId]!.name} in ${meta.label}.`
              : `Unequipped ${meta.label}.`,
          );
        }}
        style={{
          backgroundColor: item ? 'rgba(18, 18, 22, 0.94)' : 'rgba(10, 10, 12, 0.88)',
          border: item
            ? '1px solid rgba(255, 255, 255, 0.42)'
            : '1px solid rgba(255, 255, 255, 0.2)',
          padding: isCompactViewport ? '4px 6px' : '7px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
            {renderSlotSvgIcon(slotId, isCompactViewport ? 15 : 18)}
            <span
              style={{
                fontSize: isCompactViewport ? '11px' : '12px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#F5F5F7',
                flexShrink: 0,
              }}
            >
              {meta.shortLabel}:
            </span>
            <span
              data-testid={`gear-item-name-${slotId}`}
              style={{
                fontSize: isCompactViewport ? '12px' : '14px',
                fontWeight: 400,
                color: '#F5F5F7',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item ? item.name : 'Empty Slot'}
            </span>
          </div>

          <span
            data-testid={`gear-stats-${slotId}`}
            style={{
              fontSize: isCompactViewport ? '11px' : '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: '#F5F5F7',
              flexShrink: 0,
            }}
          >
            {item ? `ATK +${item.attack} · DEF +${item.defense}` : '0 ATK · 0 DEF'}
          </span>
        </div>

        {/* Crystal stage readout for weapons & armor */}
        {meta.supportsCrystalStages && (
          <div
            data-testid={`gear-crystal-stage-${slotId}`}
            style={{
              fontSize: isCompactViewport ? '10px' : '12px',
              color: '#F5F5F7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
            }}
          >
            <span>
              {item
                ? `Forge Crystal Stage ${item.crystalStage}/${MAX_CRYSTAL_STAGE}`
                : `Forge Crystal Stage 0/${MAX_CRYSTAL_STAGE}`}
            </span>
            <span>
              {item
                ? meta.group === 'weapon'
                  ? `Aura: ${(item.weaponAura ?? 'glow').toUpperCase()}`
                  : formatArmorWingMetalLabel(resolveArmorWingMetalTier(item.crystalStage))
                : 'No Crystal Effect'}
            </span>
          </div>
        )}

        {/* Gem sockets readout for the 6 accessories */}
        {meta.group === 'accessory' && (
          <div
            data-testid={`accessory-sockets-${slotId}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: '#F5F5F7',
                marginRight: '2px',
              }}
            >
              {`Gem Sockets (${meta.maxGemSockets}):`}
            </span>
            {item
              ? item.gemSockets.map((sock) =>
                  renderGemSocketSvg(sock, slotId as AccessorySlotId),
                )
              : Array.from({ length: meta.maxGemSockets }, (_, idx) =>
                  renderGemSocketSvg(
                    { index: idx, unlocked: false, gem: null },
                    slotId as AccessorySlotId,
                  ),
                )}
          </div>
        )}
      </div>
    );
  };

  const renderCostumeSlotRow = (slotId: CostumeSlotId) => {
    const meta = COSTUME_SLOT_META[slotId];
    const currentPiece = activeState.costumes[slotId];
    const isHidden = activeState.hiddenCostumeSlots[slotId];
    const isFocused = focusedCostumeSlot === slotId;
    const options = getCostumePiecesForSlot(slotId);

    return (
      <div
        key={slotId}
        data-testid={`costume-slot-${slotId}`}
        onClick={() => setFocusedCostumeSlot(slotId)}
        style={{
          backgroundColor: isFocused
            ? 'rgba(22, 22, 28, 0.96)'
            : 'rgba(10, 10, 12, 0.88)',
          borderTop: isFocused
            ? '1px solid rgba(255, 255, 255, 0.55)'
            : '1px solid rgba(255, 255, 255, 0.22)',
          borderRight: isFocused
            ? '1px solid rgba(255, 255, 255, 0.55)'
            : '1px solid rgba(255, 255, 255, 0.22)',
          borderBottom: isFocused
            ? '1px solid rgba(255, 255, 255, 0.55)'
            : '1px solid rgba(255, 255, 255, 0.22)',
          borderLeft: isFocused
            ? '3px solid #F5F5F7'
            : '3px solid rgba(255, 255, 255, 0.22)',
          padding: isCompactViewport ? '4px 6px' : '7px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {renderSlotSvgIcon(slotId, isCompactViewport ? 14 : 16)}
            <span
              style={{
                fontSize: isCompactViewport ? '11px' : '12px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#F5F5F7',
              }}
            >
              {meta.label}
            </span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                color: '#F5F5F7',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {meta.inLifeSkillCostume ? 'COMBAT + LIFE-SKILL' : 'COMBAT / MIX'}
            </span>
          </div>

          <button
            type="button"
            data-testid={`toggle-visibility-${slotId}`}
            aria-pressed={!isHidden}
            onClick={(e) => {
              e.stopPropagation();
              const next = toggleCostumeSlotVisibility(activeState, slotId);
              commitState(
                next,
                `${meta.label} is now ${next.hiddenCostumeSlots[slotId] ? 'hidden' : 'shown'}.`,
              );
            }}
            style={{
              height: '24px',
              padding: '0 8px',
              backgroundColor: isHidden
                ? 'rgba(10, 10, 12, 0.92)'
                : 'rgba(255, 255, 255, 0.14)',
              border: '1px solid rgba(255, 255, 255, 0.48)',
              color: '#F5F5F7',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: FONT_STACK,
              cursor: 'pointer',
            }}
          >
            {isHidden ? 'HIDDEN' : 'SHOWN'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            aria-label={`Select costume piece for ${meta.label}`}
            data-testid={`select-costume-${slotId}`}
            value={currentPiece?.id ?? ''}
            onChange={(e) => {
              const val = e.target.value || null;
              const next = equipCostumePiece(activeState, slotId, val);
              commitState(
                next,
                val
                  ? `Equipped ${getCostumePieceById(val)?.name} in ${meta.label}.`
                  : `Cleared ${meta.label} costume slot.`,
              );
            }}
            style={{
              width: '100%',
              height: isCompactViewport ? '24px' : '28px',
              backgroundColor: 'rgba(10, 10, 12, 0.94)',
              color: '#F5F5F7',
              border: '1px solid rgba(255, 255, 255, 0.34)',
              padding: '0 8px',
              fontSize: isCompactViewport ? '11px' : '13px',
              fontFamily: FONT_STACK,
              cursor: 'pointer',
            }}
          >
            <option value="" style={{ backgroundColor: '#0A0A0C', color: '#F5F5F7' }}>
              — None (Show Base Gear) —
            </option>
            {options.map((piece) => (
              <option
                key={piece.id}
                value={piece.id}
                style={{ backgroundColor: '#0A0A0C', color: '#F5F5F7' }}
              >
                {`${piece.name} [${piece.setKind.toUpperCase()}]`}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const renderSetEffectRow = (evalItem: CostumeSetEvaluation) => {
    return (
      <div
        key={evalItem.set.id}
        data-testid={`costume-set-${evalItem.set.id}`}
        data-set-active={evalItem.effectActive ? 'true' : 'false'}
        data-set-broken={evalItem.isBroken ? 'true' : 'false'}
        style={{
          backgroundColor: evalItem.effectActive
            ? 'rgba(24, 24, 30, 0.96)'
            : 'rgba(10, 10, 12, 0.88)',
          border: evalItem.effectActive
            ? '1px solid rgba(255, 255, 255, 0.72)'
            : '1px solid rgba(255, 255, 255, 0.24)',
          padding: isCompactViewport ? '4px 6px' : '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: isCompactViewport ? '11px' : '13px',
              fontWeight: 600,
              color: '#F5F5F7',
            }}
          >
            {evalItem.set.name}
          </span>
          <span
            data-testid={`costume-set-status-${evalItem.set.id}`}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '1px 6px',
              backgroundColor: evalItem.effectActive
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(10, 10, 12, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.42)',
              color: '#F5F5F7',
            }}
          >
            {evalItem.statusLabel}
          </span>
        </div>
        <div
          style={{
            fontSize: isCompactViewport ? '11px' : '12px',
            color: '#F5F5F7',
          }}
        >
          {`Set Effect Stat: ${evalItem.set.effectStatLabel}`}
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Equipment & Costume Panoply Window"
      data-testid="equipment-costume-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 68,
        backgroundColor: 'rgba(10, 10, 12, 0.74)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: '#F5F5F7',
        fontFamily: FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCompactViewport ? '6px 8px 6px' : '20px 36px 16px',
        boxSizing: 'border-box',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Top Header per docs/gdd/09-interface-style.md */}
      <header
        style={{
          flexShrink: 0,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h1
          style={{
            margin: 0,
            paddingRight: isCompactViewport ? '0' : '320px',
            fontSize: isCompactViewport ? '16px' : '34px',
            fontWeight: 200,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#F5F5F7',
            lineHeight: 1.08,
          }}
        >
          EQUIPMENT &amp; COSTUME PANOPLY
        </h1>
        <div
          role="separator"
          aria-orientation="horizontal"
          data-testid="equipment-title-rule"
          style={{
            width: '100%',
            height: '1px',
            marginTop: isCompactViewport ? '3px' : '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
          }}
        />
        <div
          style={
            isCompactViewport
              ? {
                  marginTop: '2px',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  color: '#F5F5F7',
                }
              : {
                  position: 'absolute',
                  right: 0,
                  bottom: '7px',
                  fontSize: '13px',
                  fontWeight: 400,
                  letterSpacing: '0.06em',
                  color: '#F5F5F7',
                }
          }
        >
          CLAUDE&apos;s N Joshua&apos;s · #TeamClaudeForLife
        </div>
      </header>

      {/* Main Three-Column Architectural Ledger Grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: isCompactViewport
            ? '1fr'
            : 'minmax(320px, 34%) minmax(320px, 32%) minmax(320px, 34%)',
          gap: isCompactViewport ? '6px' : '20px',
          paddingTop: isCompactViewport ? '4px' : '12px',
          paddingBottom: isCompactViewport ? '4px' : '12px',
          alignItems: 'start',
          overflowY: 'auto',
        }}
      >
        {/* In Compact (390x844) mode, show Center Preview & Totals first so the 7-second scan reads immediately */}
        {isCompactViewport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {/* Loadout Preset Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {(
                [
                  { id: 'empty', label: '1. Empty' },
                  { id: 'full-combat', label: '2. Full Set (8/8)' },
                  { id: 'mixed-fish-swimsuit', label: '3. Fish Head + Swimsuit' },
                  { id: 'lifeskill-angler', label: '4. Angler (2/2)' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`preset-btn-${preset.id}`}
                  onClick={() => handleSelectPreset(preset.id)}
                  style={{
                    height: '24px',
                    padding: '0 7px',
                    backgroundColor:
                      activeState.presetId === preset.id
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(10, 10, 12, 0.9)',
                    border:
                      activeState.presetId === preset.id
                        ? '1px solid #F5F5F7'
                        : '1px solid rgba(255, 255, 255, 0.28)',
                    color: '#F5F5F7',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: FONT_STACK,
                    cursor: 'pointer',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {renderCharacterPreviewSvg(
              activeState,
              totals,
              true,
              pulseKey,
              effectiveReducedMotion,
            )}
          </div>
        )}

        {/* COLUMN 1 (LEFT): GEAR — WEAPONS (3), ARMOR (4), GEM-SOCKETED ACCESSORIES (6) */}
        <section
          aria-label="Equipped Gear and Accessories"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isCompactViewport ? '4px' : '7px',
          }}
        >
          <div
            style={{
              fontSize: isCompactViewport ? '11px' : '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
              paddingBottom: '3px',
            }}
          >
            1. WEAPONS (MAIN, OFF HAND, AWAKENING) &amp; ARMOR
          </div>
          {WEAPON_SLOT_IDS.map((slot) => renderGearRow(slot))}
          {ARMOR_SLOT_IDS.map((slot) => renderGearRow(slot))}

          <div
            style={{
              fontSize: isCompactViewport ? '11px' : '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
              paddingBottom: '3px',
              marginTop: '2px',
            }}
          >
            {`2. JEWLS' ACCESSORIES (${totals.totalSocketedGems}/${totals.totalAccessorySockets} GEM SOCKETS)`}
          </div>
          {ACCESSORY_SLOT_IDS.map((slot) => renderGearRow(slot))}
        </section>

        {/* COLUMN 2 (CENTER): LIVE PREVIEW STAGE, DISPLAY TOGGLES, ATTACK/DEFENSE & CRYSTAL TOTALS */}
        <section
          aria-label="Live Character Preview and Combat Totals"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isCompactViewport ? '5px' : '10px',
          }}
        >
          {!isCompactViewport && (
            <>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#F5F5F7',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
                  paddingBottom: '3px',
                }}
              >
                LIVE PANOPLY PREVIEW &amp; LOADOUT PRESETS
              </div>

              {/* Loadout Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {(
                  [
                    { id: 'empty', label: '1. Empty Loadout' },
                    { id: 'full-combat', label: '2. Full Equipped (8/8 Set)' },
                    { id: 'mixed-fish-swimsuit', label: '3. Mixed: Fish Head + Swimsuit' },
                    { id: 'lifeskill-angler', label: '4. Life-Skill: Angler (2/2)' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`preset-btn-${preset.id}`}
                    onClick={() => handleSelectPreset(preset.id)}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      backgroundColor:
                        activeState.presetId === preset.id
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(10, 10, 12, 0.9)',
                      border:
                        activeState.presetId === preset.id
                          ? '1px solid #F5F5F7'
                          : '1px solid rgba(255, 255, 255, 0.28)',
                      color: '#F5F5F7',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      fontFamily: FONT_STACK,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {renderCharacterPreviewSvg(
                activeState,
                totals,
                false,
                pulseKey,
                effectiveReducedMotion,
              )}
            </>
          )}

          {/* Master Character Display Mode Toggle & Whole-Set Rule Setting */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              data-testid="toggle-character-display-mode"
              onClick={handleToggleDisplayMode}
              style={{
                height: isCompactViewport ? '26px' : '32px',
                padding: '0 12px',
                backgroundColor: 'rgba(18, 18, 22, 0.94)',
                border: '1px solid rgba(255, 255, 255, 0.55)',
                color: '#F5F5F7',
                fontSize: isCompactViewport ? '11px' : '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: FONT_STACK,
                cursor: 'pointer',
              }}
            >
              {activeState.displayMode === 'costume'
                ? 'CHARACTER VIEW: SHOWING COSTUME OVERLAY (CLICK FOR GEAR)'
                : 'CHARACTER VIEW: SHOWING BASE GEAR (CLICK FOR COSTUME)'}
            </button>

            <button
              type="button"
              data-testid="toggle-whole-set-rule"
              onClick={handleToggleWholeSetRule}
              style={{
                height: isCompactViewport ? '24px' : '28px',
                padding: '0 10px',
                backgroundColor: 'rgba(10, 10, 12, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.34)',
                color: '#F5F5F7',
                fontSize: isCompactViewport ? '11px' : '12px',
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: FONT_STACK,
                cursor: 'pointer',
              }}
            >
              {activeState.setRuleConfig.requireWholeSet
                ? 'SET RULE SETTING: WHOLE SET REQUIRED (DEFAULT)'
                : 'SET RULE SETTING: PARTIAL SET PIECES ALLOWED'}
            </button>
          </div>

          {/* Attack & Defense Totals Box */}
          <div
            data-testid="equipment-combat-totals"
            style={{
              backgroundColor: 'rgba(14, 14, 18, 0.94)',
              border: '1px solid rgba(255, 255, 255, 0.42)',
              padding: isCompactViewport ? '6px 10px' : '10px 14px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#F5F5F7',
                }}
              >
                TOTAL ATTACK
              </div>
              <div
                data-testid="total-attack-value"
                style={{
                  fontSize: isCompactViewport ? '18px' : '26px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: '#F5F5F7',
                }}
              >
                {totals.attackTotal}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#F5F5F7',
                }}
              >
                TOTAL DEFENSE
              </div>
              <div
                data-testid="total-defense-value"
                style={{
                  fontSize: isCompactViewport ? '18px' : '26px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: '#F5F5F7',
                }}
              >
                {totals.defenseTotal}
              </div>
            </div>
          </div>

          {/* Forge Crystal Recovery Totals */}
          <div
            data-testid="equipment-crystal-recovery-totals"
            style={{
              backgroundColor: 'rgba(10, 10, 12, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              padding: isCompactViewport ? '6px 8px' : '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#F5F5F7',
              }}
            >
              {`FORGE CRYSTAL RECOVERY TOTALS (${totals.crystalRecovery.totalStagesEquipped} STAGES)`}
            </div>
            {CRYSTAL_RECOVERY_STAT_IDS.map((statId) => {
              const val = totals.crystalRecovery.capped[statId];
              const cap = CRYSTAL_STAT_CAPS[statId];
              return (
                <div
                  key={statId}
                  data-testid={`crystal-total-${statId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: isCompactViewport ? '11px' : '13px',
                    color: '#F5F5F7',
                  }}
                >
                  <span>{CRYSTAL_STAT_LABELS[statId]}</span>
                  <span style={{ fontWeight: 600 }}>{`+${val.toFixed(1)}% / ${cap}% CAP`}</span>
                </div>
              );
            })}
          </div>

          {/* Elemental Gems Totals */}
          <div
            data-testid="equipment-elemental-gem-totals"
            style={{
              backgroundColor: 'rgba(10, 10, 12, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              padding: isCompactViewport ? '6px 8px' : '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#F5F5F7',
              }}
            >
              {`JEWLS' ELEMENTAL GEMS (DMG & RES · ${GEM_ELEMENT_CAP_PERCENT}% CAP)`}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px 10px',
                fontSize: isCompactViewport ? '11px' : '12px',
              }}
            >
              {totals.elementalGems.map((gem) => (
                <div
                  key={gem.gemId}
                  data-testid={`gem-element-total-${gem.gemId}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#F5F5F7',
                  }}
                >
                  <span>{`${gem.name} (${gem.elementLabel})`}</span>
                  <span style={{ fontWeight: 600 }}>{`+${gem.cappedPercent}%`}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COLUMN 3 (RIGHT): COSTUME OVERLAY SLOTS (8), MIXING & SET EFFECTS LEDGER */}
        <section
          aria-label="Costume Layer Slots and Set Effects"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isCompactViewport ? '4px' : '7px',
          }}
        >
          <div
            style={{
              fontSize: isCompactViewport ? '11px' : '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
              paddingBottom: '3px',
            }}
          >
            3. COSTUME LAYER SLOTS (MIX ANY COMBAT OR LIFE-SKILL PART)
          </div>
          {COSTUME_SLOT_IDS.map((slot) => renderCostumeSlotRow(slot))}

          <div
            style={{
              fontSize: isCompactViewport ? '11px' : '13px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
              paddingBottom: '3px',
              marginTop: '2px',
            }}
          >
            4. COSTUME SET EFFECTS (OFF WHEN SET IS BROKEN)
          </div>
          {totals.costumeSets.map((setEval) => renderSetEffectRow(setEval))}

          {/* Plain-sentence Help & Payments Box */}
          <div
            data-testid="equipment-help-panel"
            style={{
              backgroundColor: 'rgba(10, 10, 12, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              padding: isCompactViewport ? '6px 8px' : '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: isCompactViewport ? '11px' : '12px',
              lineHeight: 1.35,
              color: '#F5F5F7',
            }}
          >
            {EQUIPMENT_WINDOW_HELP_RULES.map((sentence) => (
              <div key={sentence}>{sentence}</div>
            ))}
            <div
              data-testid="equipment-payments-line"
              style={{
                marginTop: '2px',
                paddingTop: '4px',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                fontWeight: 500,
              }}
            >
              {EQUIPMENT_WINDOW_PAYMENTS_LINE}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Centre Back Control & Keyboard/Controller Bar per docs/gdd/09-interface-style.md */}
      <footer
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          paddingTop: '4px',
          borderTop: '1px solid rgba(255, 255, 255, 0.22)',
        }}
      >
        {statusNotice && (
          <div
            role="status"
            aria-live="polite"
            data-testid="equipment-status-notice"
            style={{
              fontSize: '12px',
              color: '#F5F5F7',
            }}
          >
            {statusNotice}
          </div>
        )}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: isCompactViewport ? '10px' : '12px',
              color: '#F5F5F7',
              letterSpacing: '0.04em',
            }}
          >
            Keys / Controller: Up/Down Slot · H Hide/Show Piece · G Gear/Costume · 1-4 Presets · Esc Back
          </span>
          <button
            type="button"
            data-testid="equipment-back-button"
            onClick={onClose}
            style={{
              margin: '0 auto',
              height: isCompactViewport ? '28px' : '36px',
              minWidth: isCompactViewport ? '110px' : '160px',
              padding: '0 24px',
              backgroundColor: 'rgba(18, 18, 22, 0.94)',
              border: '1px solid rgba(255, 255, 255, 0.55)',
              color: '#F5F5F7',
              fontSize: isCompactViewport ? '12px' : '14px',
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontFamily: FONT_STACK,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </footer>
    </div>
  );
};
