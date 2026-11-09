/**
 * Fable's Forge & Smith Service Table Modal
 *
 * Follows docs/gdd/09-interface-style.md and src/game/economy/smith:
 *  - Calm, dark, see-through panel over the softly blurred 3D slice behind it.
 *  - Large, thin, light title at the top left with a fine horizontal rule underneath.
 *  - Three columns:
 *      Left:   Services from SMITH_SERVICE_TABLE (Repair Gear, Upgrade Tier Step, Enhance Gear)
 *              plus Fable's Anvil & Armor Truck status, with a soft highlight bar on the chosen row.
 *      Middle: Dark rows showing gear item state, deterministic quote in Sols / Tier Materials /
 *              Forge Catalysts, and action buttons wired directly to src/game/economy/smith.
 *      Right:  Help panel explaining the rules in plain sentences (same smith fable-smith and
 *              same service table in town, on the night-route Armor Truck with its pop-up camper,
 *              and when summoned beside the player with Fable's Anvil; 3-to-5 Anvil charge cap by
 *              level and HP/mana/energy pool; 100% deterministic non-gambling forge; plus the
 *              payments line).
 *  - One "Back" control at the bottom centre.
 *  - White on dark, no ornament, no other colour, own inline SVG only.
 */

import React, { useEffect, useState } from 'react';
import {
  ANVIL_LEVEL_BONUS_THRESHOLD,
  ANVIL_MAX_CHARGES,
  ANVIL_MIN_CHARGES,
  ANVIL_POOL_BONUS_THRESHOLD,
  ENHANCEMENT_BONUS_PERCENTS,
  ENHANCEMENT_TRACK,
  FABLE_SMITH_NPC,
  FABLE_SMITH_NPC_ID,
  FABLES_ANVIL_ITEM,
  FABLES_ANVIL_ITEM_ID,
  FABLES_ARMOR_TRUCK_ID,
  NIGHT_ARMOR_TRUCK_ROUTE,
  SMITH_SERVICE_IDS,
  SMITH_SERVICE_TABLE,
  TIER_STEPS,
  TIER_STEP_PERCENTS,
  TOWN_SMITH_PLACEMENT,
  computeAnvilChargeCap,
  createAnvilState,
  createSmithGearItem,
  getSmithServicesForLocation,
  performCampSmithService,
  performSmithService,
  performTruckSmithService,
  quoteSmithService,
  resolveArmorTruckState,
  updateAnvilCamp,
  useFablesAnvil,
  type ActiveAnvilCamp,
  type AnvilCapInput,
  type ArmorTruckState,
  type EnhancementRarity,
  type FablesAnvilState,
  type GearStatChoice,
  type SmithGearItem,
  type SmithLocationKind,
  type SmithPlayerWallet,
  type SmithServiceDefinition,
  type SmithServiceId,
  type SmithServicePriceQuote,
  type SmithServiceResult,
  type TierStep,
  type Vec3Tuple,
} from '../game/economy/smith/index.ts';

export {
  ANVIL_LEVEL_BONUS_THRESHOLD,
  ANVIL_MAX_CHARGES,
  ANVIL_MIN_CHARGES,
  ANVIL_POOL_BONUS_THRESHOLD,
  ENHANCEMENT_BONUS_PERCENTS,
  ENHANCEMENT_TRACK,
  FABLE_SMITH_NPC,
  FABLE_SMITH_NPC_ID,
  FABLES_ANVIL_ITEM,
  FABLES_ANVIL_ITEM_ID,
  FABLES_ARMOR_TRUCK_ID,
  NIGHT_ARMOR_TRUCK_ROUTE,
  SMITH_SERVICE_IDS,
  SMITH_SERVICE_TABLE,
  TIER_STEPS,
  TIER_STEP_PERCENTS,
  TOWN_SMITH_PLACEMENT,
  computeAnvilChargeCap,
  createAnvilState,
  createSmithGearItem,
  getSmithServicesForLocation,
  performCampSmithService,
  performSmithService,
  performTruckSmithService,
  quoteSmithService,
  resolveArmorTruckState,
  updateAnvilCamp,
  useFablesAnvil,
  type ActiveAnvilCamp,
  type AnvilCapInput,
  type ArmorTruckState,
  type EnhancementRarity,
  type FablesAnvilState,
  type GearStatChoice,
  type SmithGearItem,
  type SmithLocationKind,
  type SmithPlayerWallet,
  type SmithServiceDefinition,
  type SmithServiceId,
  type SmithServicePriceQuote,
  type SmithServiceResult,
  type TierStep,
  type Vec3Tuple,
};

export type SmithModalTabId = SmithServiceId | 'anvil';

export interface SmithModalCategoryMeta {
  readonly id: SmithModalTabId;
  readonly label: string;
  readonly summary: string;
}

export const SMITH_MODAL_CATEGORIES: readonly SmithModalCategoryMeta[] = Object.freeze([
  Object.freeze({
    id: 'repair',
    label: SMITH_SERVICE_TABLE.services.repair.label,
    summary: SMITH_SERVICE_TABLE.services.repair.summary,
  }),
  Object.freeze({
    id: 'upgrade',
    label: SMITH_SERVICE_TABLE.services.upgrade.label,
    summary: SMITH_SERVICE_TABLE.services.upgrade.summary,
  }),
  Object.freeze({
    id: 'enhance',
    label: SMITH_SERVICE_TABLE.services.enhance.label,
    summary: SMITH_SERVICE_TABLE.services.enhance.summary,
  }),
  Object.freeze({
    id: 'anvil',
    label: "Fable's Anvil & Truck",
    summary:
      "Summon Fable's Armor Truck and its pop-up camper beside you using Fable's Anvil, or inspect the night route midway parking spot. Same smith, same service table.",
  }),
]);

export const SMITH_MODAL_HELP_RULES: readonly string[] = Object.freeze([
  "The town smith (fable-smith), Fable's Armor Truck on its night route, and the truck summoned by Fable's Anvil all share the exact same smith and the exact same service table.",
  "Fable's Anvil is a convenience item that saves walking. Uses are capped at 3 to 5 charges by your level and the size of your HP, mana, or energy pool.",
  "Using Fable's Anvil summons Fable's Armor Truck and its pop-up camper beside you. The camp despawns when you walk away or when the timer ends.",
  'Forging and enhancement are 100% deterministic. Weapons and armor never break, never downgrade, and never use fail-stacks.',
  'The game is free to play. Every item in a tier gives the same percentage; your choice is which stat, never how much. Nothing here buys power.',
]);

export const SMITH_MODAL_PAYMENTS_LINE =
  "Payments: the game's own merchant account. Nothing in this screen is pay-to-win.";

export const DEFAULT_SMITH_DEMO_WALLET: SmithPlayerWallet = Object.freeze({
  sols: 1450,
  tierMaterials: 14,
  forgeCatalysts: 12,
});

export const DEFAULT_SMITH_DEMO_GEAR: readonly SmithGearItem[] = Object.freeze([
  createSmithGearItem({
    id: 'sunspire-vanguard-greatsword',
    name: 'Sunspire Vanguard Greatsword',
    slot: 'weapon',
    durability: 42,
    maxDurability: 100,
    tierStep: 2,
    statChoice: 'melee-focus',
    enhancement: 'rare',
  }),
  createSmithGearItem({
    id: 'haven-bastion-cuirass',
    name: 'Haven Bastion Cuirass',
    slot: 'outfit',
    durability: 68,
    maxDurability: 120,
    tierStep: 1,
    statChoice: 'vitality-hp',
    enhancement: 'uncommon',
  }),
  createSmithGearItem({
    id: 'tideweaver-focus-staff',
    name: 'Tideweaver Focus Staff',
    slot: 'weapon',
    durability: 95,
    maxDurability: 140,
    tierStep: 3,
    statChoice: 'magic-focus',
    enhancement: 'legend',
  }),
]);

export const SMITH_LOCATION_LABELS: Readonly<Record<SmithLocationKind, string>> = Object.freeze({
  town: 'Town',
  'route-truck': 'Night truck',
  'summoned-camp': 'Summoned',
});

export function formatSmithQuoteCost(quote: SmithServicePriceQuote): string {
  const parts: string[] = [`${quote.solsCost} SOLS`];
  if (quote.materialsCost > 0) {
    parts.push(`${quote.materialsCost} MAT`);
  }
  if (quote.catalystsCost > 0) {
    parts.push(`${quote.catalystsCost} CAT`);
  }
  return parts.join(' · ');
}

export function formatSmithActionLabel(
  serviceId: SmithServiceId,
  quote: SmithServicePriceQuote,
): string {
  if (!quote.canApply) {
    switch (quote.reason) {
      case 'already-full-durability':
        return 'Full Durability';
      case 'already-max-tier-step':
        return 'Max Tier Step (3)';
      case 'already-max-enhancement':
        return 'Max Enhancement (Mythos)';
      default:
        return 'Unavailable';
    }
  }
  switch (serviceId) {
    case 'repair':
      return 'Repair Gear';
    case 'upgrade':
      return 'Upgrade Tier Step';
    case 'enhance':
      return 'Enhance +1 Step';
  }
}

export interface SmithServiceModalProps {
  isOpen: boolean;
  initialTab?: SmithModalTabId;
  location?: SmithLocationKind;
  anvilInput?: AnvilCapInput;
  anvilState?: FablesAnvilState;
  activeCamp?: ActiveAnvilCamp | null;
  truckState?: ArmorTruckState;
  gearItems?: readonly SmithGearItem[];
  wallet?: SmithPlayerWallet;
  playerPosition?: Vec3Tuple;
  onChangeLocation?: (next: SmithLocationKind) => void;
  onSummonAnvil?: (result: { state: FablesAnvilState; camp: ActiveAnvilCamp; truck: ArmorTruckState }) => void;
  onApplyService?: (result: SmithServiceResult) => void;
  onClose: () => void;
}

const FONT_STACK = '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';

export const SmithServiceModal: React.FC<SmithServiceModalProps> = ({
  isOpen,
  initialTab = 'repair',
  location: controlledLocation,
  anvilInput = { level: 25, hpPool: 640, manaPool: 320 },
  anvilState: controlledAnvilState,
  activeCamp: controlledCamp,
  truckState: controlledTruckState,
  gearItems: controlledGear,
  wallet: controlledWallet,
  playerPosition = [-8.5, 1.1, -35.2],
  onChangeLocation,
  onSummonAnvil,
  onApplyService,
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState<SmithModalTabId>(initialTab);
  const [internalLocation, setInternalLocation] = useState<SmithLocationKind>(
    controlledLocation ?? 'town',
  );
  const [internalAnvil, setInternalAnvil] = useState<FablesAnvilState>(() =>
    createAnvilState(anvilInput),
  );
  const [internalCamp, setInternalCamp] = useState<ActiveAnvilCamp | null>(null);
  const [internalGear, setInternalGear] = useState<readonly SmithGearItem[]>(() =>
    DEFAULT_SMITH_DEMO_GEAR,
  );
  const [internalWallet, setInternalWallet] = useState<SmithPlayerWallet>(() =>
    DEFAULT_SMITH_DEMO_WALLET,
  );
  const [selectedGearId, setSelectedGearId] = useState<string>(DEFAULT_SMITH_DEMO_GEAR[0].id);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  );

  const activeLocation = controlledLocation ?? internalLocation;
  const activeAnvil = controlledAnvilState ?? internalAnvil;
  const activeCamp = controlledCamp !== undefined ? controlledCamp : internalCamp;
  const activeGear = controlledGear ?? internalGear;
  const activeWallet = controlledWallet ?? internalWallet;

  const resolvedTruck =
    controlledTruckState ??
    (activeLocation === 'summoned-camp' && activeCamp
      ? resolveArmorTruckState('day', 0, activeCamp)
      : activeLocation === 'route-truck'
        ? resolveArmorTruckState('night', 0.5, null)
        : resolveArmorTruckState('day', 0, null));

  useEffect(() => {
    setSelectedTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (controlledLocation) {
      setInternalLocation(controlledLocation);
    }
  }, [controlledLocation]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setIsCompactViewport(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const idx = SMITH_MODAL_CATEGORIES.findIndex((c) => c.id === selectedTab);
        if (idx === -1) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIdx =
          (idx + delta + SMITH_MODAL_CATEGORIES.length) % SMITH_MODAL_CATEGORIES.length;
        setSelectedTab(SMITH_MODAL_CATEGORIES[nextIdx].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedTab]);

  if (!isOpen) return null;

  const activeServiceId: SmithServiceId =
    selectedTab === 'anvil' ? 'repair' : selectedTab;
  const activeCategoryMeta =
    SMITH_MODAL_CATEGORIES.find((c) => c.id === selectedTab) ?? SMITH_MODAL_CATEGORIES[0];
  const activeServiceDef = SMITH_SERVICE_TABLE.services[activeServiceId];

  const handleSelectLocation = (loc: SmithLocationKind) => {
    setInternalLocation(loc);
    onChangeLocation?.(loc);
    setStatusNotice(`Switched view to ${SMITH_LOCATION_LABELS[loc]} (${FABLE_SMITH_NPC.npcId}).`);
  };

  const handleSummonTruckWithAnvil = () => {
    const res = useFablesAnvil(activeAnvil, playerPosition, {
      nowSec: 12,
      spawnOffset: [2.4, 0, -1.6],
    });
    if (!res.ok) {
      setStatusNotice("No Fable's Anvil charges remaining.");
      return;
    }
    const truck = resolveArmorTruckState('day', 0, res.camp);
    if (!controlledAnvilState) setInternalAnvil(res.state);
    if (controlledCamp === undefined) setInternalCamp(res.camp);
    setInternalLocation('summoned-camp');
    onChangeLocation?.('summoned-camp');
    onSummonAnvil?.({ state: res.state, camp: res.camp, truck });
    setStatusNotice(
      `Summoned ${truck.truckId} with its pop-up camper beside you (${res.state.charges}/${res.state.maxCharges} charges left). Same smith (${res.camp.smithNpc.npcId}), same service table.`,
    );
  };

  const handlePerformService = (item: SmithGearItem, serviceId: SmithServiceId) => {
    setSelectedGearId(item.id);
    let result: SmithServiceResult;
    if (activeLocation === 'summoned-camp' && activeCamp) {
      result = performCampSmithService(activeCamp, serviceId, item, activeWallet);
    } else if (activeLocation === 'route-truck') {
      const truckForService =
        resolvedTruck.location === 'route-truck'
          ? resolvedTruck
          : resolveArmorTruckState('night', 0.5, null);
      result = performTruckSmithService(truckForService, serviceId, item, activeWallet);
    } else {
      result = performSmithService(activeLocation, serviceId, item, activeWallet);
    }

    if (result.ok) {
      if (!controlledGear) {
        setInternalGear((prev) => prev.map((g) => (g.id === item.id ? result.item : g)));
      }
      if (!controlledWallet) {
        setInternalWallet({
          sols: result.remainingSols,
          tierMaterials: result.remainingMaterials,
          forgeCatalysts: result.remainingCatalysts,
        });
      }
      onApplyService?.(result);
      setStatusNotice(
        `${activeServiceDef.label} completed on ${result.item.name} at ${SMITH_LOCATION_LABELS[activeLocation]} (${FABLE_SMITH_NPC.npcId}).`,
      );
    } else {
      setStatusNotice(`Could not apply ${activeServiceDef.label}: ${result.reason}.`);
    }
  };

  const renderGearRow = (item: SmithGearItem) => {
    const isChosen = selectedGearId === item.id;
    const quote = quoteSmithService(activeLocation, activeServiceId, item);
    const costLabel = formatSmithQuoteCost(quote);
    const actionLabel = formatSmithActionLabel(activeServiceId, quote);

    return (
      <div
        key={item.id}
        data-testid={`smith-gear-row-${item.id}`}
        onMouseEnter={() => setSelectedGearId(item.id)}
        onClick={() => setSelectedGearId(item.id)}
        style={{
          backgroundColor: isChosen ? 'rgba(22, 22, 26, 0.92)' : 'rgba(10, 10, 12, 0.88)',
          border: isChosen
            ? '1px solid rgba(255, 255, 255, 0.42)'
            : '1px solid rgba(255, 255, 255, 0.18)',
          padding: isCompactViewport ? '5px 8px' : '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: isCompactViewport ? '3px' : '8px',
          cursor: 'pointer',
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
              fontSize: isCompactViewport ? '13px' : '15px',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#F5F5F7',
            }}
          >
            {item.name}
          </span>
          <span
            data-testid={`smith-quote-${item.id}`}
            style={{
              fontSize: isCompactViewport ? '11px' : '13px',
              fontWeight: 400,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#E5E5EA',
              padding: isCompactViewport ? '1px 6px' : '2px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            {costLabel}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: isCompactViewport ? '11px' : '13px',
              fontWeight: 300,
              color: '#D1D1D6',
              lineHeight: 1.25,
            }}
          >
            Tier Step: {item.tierStep} (+{item.statPercent}% {item.statChoice}) · Enhancement:{' '}
            {item.enhancement} (+{item.enhancementBonusPercent}%) · Durability: {item.durability}/
            {item.maxDurability}
          </span>

          {quote.canApply ? (
            <button
              type="button"
              data-testid={`smith-apply-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                handlePerformService(item, activeServiceId);
              }}
              style={{
                height: isCompactViewport ? '22px' : '28px',
                padding: isCompactViewport ? '0 8px' : '0 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.38)',
                color: '#F5F5F7',
                fontSize: isCompactViewport ? '11px' : '13px',
                fontWeight: 400,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: FONT_STACK,
                cursor: 'pointer',
              }}
            >
              {actionLabel}
            </button>
          ) : (
            <span
              data-testid={`smith-disabled-${item.id}`}
              style={{
                fontSize: '13px',
                fontWeight: 300,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#C7C7CC',
                padding: '2px 8px',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backgroundColor: 'rgba(10, 10, 12, 0.65)',
              }}
            >
              {actionLabel}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fable's Forge · Smith Service Table"
      data-testid="smith-service-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        backgroundColor: 'rgba(10, 10, 12, 0.68)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        color: '#F5F5F7',
        fontFamily: FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCompactViewport ? '8px 10px 6px' : '28px 48px 22px',
        boxSizing: 'border-box',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Top Header: Large, thin, light title at top left with a fine horizontal rule */}
      <header style={{ flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: isCompactViewport ? 'column' : 'row',
            alignItems: isCompactViewport ? 'flex-start' : 'baseline',
            justifyContent: 'space-between',
            gap: isCompactViewport ? '2px' : '16px',
            paddingBottom: isCompactViewport ? '4px' : '12px',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: isCompactViewport ? '18px' : '44px',
              fontWeight: 200,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              lineHeight: 1.08,
            }}
          >
            FABLE&apos;S FORGE · SMITH SERVICE TABLE
          </h1>
          <div
            style={{
              fontSize: isCompactViewport ? '11px' : '14px',
              fontWeight: 300,
              letterSpacing: '0.06em',
              color: '#D1D1D6',
            }}
          >
            CLAUDE&apos;s N Joshua&apos;s · #TeamClaudeForLife
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
          }}
        />
      </header>

      {/* Main Content Area: Three columns per docs/gdd/09-interface-style.md */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: isCompactViewport
            ? '1fr'
            : 'minmax(210px, 24%) minmax(340px, 42%) minmax(260px, 34%)',
          gap: isCompactViewport ? '5px' : '28px',
          paddingTop: isCompactViewport ? '5px' : '18px',
          paddingBottom: isCompactViewport ? '5px' : '18px',
          alignItems: 'start',
          overflowY: 'auto',
        }}
      >
        {/* Column 1 (Left): Services & Location controls, one per row, with soft highlight bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isCompactViewport ? '4px' : '12px',
          }}
        >
          <div
            role="listbox"
            aria-label="Smith Services"
            style={{
              display: 'flex',
              flexDirection: isCompactViewport ? 'row' : 'column',
              flexWrap: isCompactViewport ? 'wrap' : 'nowrap',
              gap: '4px',
            }}
          >
            {SMITH_MODAL_CATEGORIES.map((category) => {
              const isChosen = category.id === selectedTab;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="option"
                  aria-selected={isChosen}
                  data-testid={`smith-category-${category.id}`}
                  onClick={() => setSelectedTab(category.id)}
                  style={{
                    height: isCompactViewport ? '26px' : '36px',
                    width: isCompactViewport ? 'auto' : '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: isCompactViewport ? '0 8px' : '0 14px',
                    cursor: 'pointer',
                    backgroundColor: isChosen
                      ? 'rgba(255, 255, 255, 0.16)'
                      : 'rgba(10, 10, 12, 0.62)',
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderLeft: isChosen
                      ? '2px solid rgba(255, 255, 255, 0.9)'
                      : '2px solid transparent',
                    color: isChosen ? '#F5F5F7' : '#D1D1D6',
                    fontSize: isCompactViewport ? '12px' : '15px',
                    fontWeight: isChosen ? 400 : 300,
                    letterSpacing: '0.03em',
                    fontFamily: FONT_STACK,
                    textAlign: 'left',
                  }}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Active Smith Location & Fable's Anvil Summon Box */}
          <div
            data-testid="smith-anvil-panel"
            style={{
              backgroundColor: 'rgba(10, 10, 12, 0.82)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              padding: isCompactViewport ? '5px 8px' : '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: isCompactViewport ? '4px' : '8px',
            }}
          >
            <div
              style={{
                fontSize: isCompactViewport ? '11px' : '12px',
                fontWeight: 400,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#D1D1D6',
              }}
            >
              NPC: {FABLE_SMITH_NPC.name} ({FABLE_SMITH_NPC.npcId})
            </div>
            <div
              data-testid="smith-active-location"
              style={{
                fontSize: isCompactViewport ? '11px' : '13px',
                fontWeight: 300,
                color: '#F5F5F7',
                lineHeight: 1.25,
              }}
            >
              Location: {SMITH_LOCATION_LABELS[activeLocation]}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
              }}
            >
              {(['town', 'route-truck', 'summoned-camp'] as const).map((loc) => {
                const chosenLoc = activeLocation === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    data-testid={`smith-location-${loc}`}
                    onClick={() => handleSelectLocation(loc)}
                    style={{
                      height: isCompactViewport ? '22px' : '26px',
                      padding: '0 8px',
                      backgroundColor: chosenLoc
                        ? 'rgba(255, 255, 255, 0.18)'
                        : 'rgba(10, 10, 12, 0.65)',
                      border: chosenLoc
                        ? '1px solid rgba(255, 255, 255, 0.45)'
                        : '1px solid rgba(255, 255, 255, 0.16)',
                      color: '#F5F5F7',
                      fontSize: isCompactViewport ? '11px' : '12px',
                      fontWeight: chosenLoc ? 400 : 300,
                      letterSpacing: '0.04em',
                      fontFamily: FONT_STACK,
                      cursor: 'pointer',
                    }}
                  >
                    {SMITH_LOCATION_LABELS[loc]}
                  </button>
                );
              })}
            </div>
            <div
              data-testid="smith-anvil-charges"
              style={{
                fontSize: isCompactViewport ? '11px' : '13px',
                fontWeight: 300,
                color: '#E5E5EA',
              }}
            >
              {FABLES_ANVIL_ITEM.name}: {activeAnvil.charges} / {activeAnvil.maxCharges} charges (Lv.
              {activeAnvil.level}, Pool {activeAnvil.effectivePoolSize})
            </div>
            <button
              type="button"
              data-testid="smith-summon-anvil-btn"
              onClick={handleSummonTruckWithAnvil}
              style={{
                height: isCompactViewport ? '24px' : '30px',
                padding: '0 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.36)',
                color: '#F5F5F7',
                fontSize: isCompactViewport ? '11px' : '12px',
                fontWeight: 400,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: FONT_STACK,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Use Fable&apos;s Anvil · Summon Truck
            </button>
          </div>
        </div>

        {/* Column 2 (Middle): Dark boxes holding wallet, service table rows, and gear items */}
        <div
          aria-label="Smith Service Items"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isCompactViewport ? '4px' : '8px',
          }}
        >
          {/* Wallet & Service Table Header Box */}
          <div
            data-testid="smith-wallet-summary"
            style={{
              backgroundColor: 'rgba(10, 10, 12, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              padding: isCompactViewport ? '4px 8px' : '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: isCompactViewport ? '11px' : '13px',
              letterSpacing: '0.05em',
              color: '#E5E5EA',
            }}
          >
            <span>SERVICE: {activeServiceDef.label.toUpperCase()}</span>
            <span>
              WALLET: {activeWallet.sols} SOLS · {activeWallet.tierMaterials ?? 0} MAT ·{' '}
              {activeWallet.forgeCatalysts ?? 0} CAT
            </span>
          </div>

          {activeGear.map((item) => renderGearRow(item))}

          {statusNotice && (
            <div
              role="status"
              data-testid="smith-status-notice"
              style={{
                padding: '6px 10px',
                backgroundColor: 'rgba(10, 10, 12, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.24)',
                fontSize: '12px',
                color: '#F5F5F7',
                lineHeight: 1.35,
              }}
            >
              {statusNotice}
            </div>
          )}
        </div>

        {/* Column 3 (Right): Plain-sentence help panel explaining the rules */}
        <aside
          aria-label="Smith Rules and Help"
          style={{
            backgroundColor: 'rgba(10, 10, 12, 0.68)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.18)',
            padding: isCompactViewport ? '6px 8px' : '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: isCompactViewport ? '4px' : '14px',
          }}
        >
          <div>
            <h2
              style={{
                margin: isCompactViewport ? '0 0 2px 0' : '0 0 6px 0',
                fontSize: isCompactViewport ? '12px' : '18px',
                fontWeight: 300,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#F5F5F7',
              }}
            >
              {activeCategoryMeta.label}
            </h2>
            <div
              style={{
                width: '100%',
                height: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                marginBottom: isCompactViewport ? '3px' : '8px',
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: isCompactViewport ? '11px' : '14px',
                lineHeight: isCompactViewport ? 1.25 : 1.45,
                fontWeight: 300,
                color: '#E5E5EA',
              }}
            >
              {activeCategoryMeta.summary}
            </p>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.14)',
              paddingTop: isCompactViewport ? '4px' : '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: isCompactViewport ? '2px' : '6px',
            }}
          >
            <div
              style={{
                fontSize: isCompactViewport ? '11px' : '13px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#F5F5F7',
              }}
            >
              FABLE&apos;S FORGE &amp; ANVIL RULES
            </div>
            {(isCompactViewport ? SMITH_MODAL_HELP_RULES.slice(0, 1) : SMITH_MODAL_HELP_RULES).map(
              (sentence, idx) => (
                <p
                  key={idx}
                  style={{
                    margin: 0,
                    fontSize: isCompactViewport ? '11px' : '14px',
                    lineHeight: isCompactViewport ? 1.22 : 1.45,
                    fontWeight: 300,
                    color: '#E5E5EA',
                  }}
                >
                  {sentence}
                </p>
              ),
            )}
            <p
              style={{
                margin: 0,
                fontSize: isCompactViewport ? '11px' : '14px',
                lineHeight: isCompactViewport ? 1.25 : 1.45,
                fontWeight: 300,
                color: '#E5E5EA',
              }}
            >
              {SMITH_MODAL_PAYMENTS_LINE}
            </p>
          </div>
        </aside>
      </div>

      {/* Bottom Footer: Fine horizontal rule + one Back control at the bottom centre */}
      <footer style={{ flexShrink: 0 }}>
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            marginBottom: isCompactViewport ? '6px' : '14px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            data-testid="smith-service-back"
            onClick={onClose}
            style={{
              height: isCompactViewport ? '32px' : '36px',
              padding: '0 28px',
              backgroundColor: 'rgba(10, 10, 12, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              color: '#F5F5F7',
              fontSize: isCompactViewport ? '13px' : '15px',
              fontWeight: 300,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: FONT_STACK,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                padding: '1px 6px',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                color: '#D1D1D6',
              }}
            >
              ESC
            </span>
            <span>Back</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
