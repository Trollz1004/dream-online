/**
 * Wardrobe & NEEDs Shop Modal (Volume 2, Recipe 3)
 *
 * Follows docs/gdd/09-interface-style.md and docs/gdd/12-wardrobe-needs-shop.md:
 *  - Calm, dark, see-through panel over the softly blurred 3D scene behind it.
 *  - Large, thin, light title at the top left with a fine horizontal rule underneath.
 *  - Three columns:
 *      Left:   Categories (basics, tops, bottoms, shoes, pets, convenience) with soft highlight bar.
 *      Middle: Dark rows showing item name, owned or price in in-game currency, whether it reached
 *              the currency store yet (or its release month), and a "Get with coins" action only
 *              for items already released to the currency store.
 *      Right:  Help panel explaining the rules in plain sentences (bought is owned forever,
 *              skins never expire, every skin reaches the currency store a few months after release,
 *              the founder pet never does; the game is free to play, this shop sells looks, time
 *              and choice at the same percentages anyone can earn in game, and nothing here buys power),
 *              plus the payments line.
 *  - One "Back" control at the bottom centre.
 *  - White on dark, no ornament, no other colour, own inline SVG only.
 *  - Wired directly to src/game/economy/wardrobe (never re-implemented).
 *  - No real-money path exists on this screen at all.
 */

import React, { useEffect, useState } from 'react';
import {
  BASIC_SLOTS,
  CONVENIENCE_SAVES,
  CURRENCY_STORE_EXCLUDED_IDS,
  DEFAULT_CURRENCY_STORE_DELAY_MONTHS,
  DEFAULT_WARDROBE_CONFIG,
  FOUNDER_PET_SKIN_ID,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  SKIN_SLOTS,
  STAT_KEYS,
  WardrobeRuleError,
  acquireSkin,
  addMonthsUtc,
  createDefaultOutfit,
  createWardrobe,
  createWardrobeConfig,
  currencyStoreReleaseDate,
  defineConvenienceItem,
  defineSkin,
  isCurrencyStoreExcluded,
  isInCurrencyStore,
  isIsoDate,
  isKidSafeBasicsOutfit,
  isOnNeedsShop,
  isSkin,
  listCurrencyStore,
  ownsSkin,
  parseWardrobe,
  validateCatalog,
  validateShopItem,
  type AcquireChannel,
  type AcquireRefusal,
  type AcquireResult,
  type BasicItem,
  type BasicSlot,
  type ConvenienceItem,
  type ConvenienceSaves,
  type IsoDate,
  type Outfit,
  type OwnedSkin,
  type ShopItem,
  type Skin,
  type SkinSlot,
  type Wardrobe,
  type WardrobeConfig,
} from '../game/economy/wardrobe/index.ts';

export {
  BASIC_SLOTS,
  CONVENIENCE_SAVES,
  CURRENCY_STORE_EXCLUDED_IDS,
  DEFAULT_CURRENCY_STORE_DELAY_MONTHS,
  DEFAULT_WARDROBE_CONFIG,
  FOUNDER_PET_SKIN_ID,
  KID_SAFE_BASICS,
  KID_SAFE_BASIC_IDS,
  SKIN_SLOTS,
  STAT_KEYS,
  WardrobeRuleError,
  acquireSkin,
  addMonthsUtc,
  createDefaultOutfit,
  createWardrobe,
  createWardrobeConfig,
  currencyStoreReleaseDate,
  defineConvenienceItem,
  defineSkin,
  isCurrencyStoreExcluded,
  isInCurrencyStore,
  isIsoDate,
  isKidSafeBasicsOutfit,
  isOnNeedsShop,
  isSkin,
  listCurrencyStore,
  ownsSkin,
  parseWardrobe,
  validateCatalog,
  validateShopItem,
  type AcquireChannel,
  type AcquireRefusal,
  type AcquireResult,
  type BasicItem,
  type BasicSlot,
  type ConvenienceItem,
  type ConvenienceSaves,
  type IsoDate,
  type Outfit,
  type OwnedSkin,
  type ShopItem,
  type Skin,
  type SkinSlot,
  type Wardrobe,
  type WardrobeConfig,
};

export type NeedsShopCategoryId =
  | 'basics'
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'pets'
  | 'convenience';

export interface NeedsShopCategoryMeta {
  readonly id: NeedsShopCategoryId;
  readonly label: string;
  readonly summary: string;
}

export const NEEDS_SHOP_CATEGORIES: readonly NeedsShopCategoryMeta[] = Object.freeze([
  Object.freeze({
    id: 'basics',
    label: 'Basics',
    summary:
      'Every character leaves the creator wearing the three-piece kid-safe basics set. Basics are free, belong to every account from day one, and are never sold.',
  }),
  Object.freeze({
    id: 'tops',
    label: 'Tops',
    summary:
      'Upper-body cosmetic looks including travel coats, tunics, and cloaks. Appearance only.',
  }),
  Object.freeze({
    id: 'bottoms',
    label: 'Bottoms',
    summary:
      'Lower-body cosmetic looks including road trousers, wraps, and riding leggings. Appearance only.',
  }),
  Object.freeze({
    id: 'shoes',
    label: 'Shoes',
    summary:
      'Footwear cosmetic looks including trail boots, sandals, and soft-soled runners. Appearance only.',
  }),
  Object.freeze({
    id: 'pets',
    label: 'Pets',
    summary:
      'Companion pet looks. Standard pet skins reach the currency store after the release delay; TrollinlootNScoot, the founder pet, is the one exception and never reaches the currency store.',
  }),
  Object.freeze({
    id: 'convenience',
    label: 'Convenience',
    summary:
      'Items that save walking or attention during travel and camp upkeep.',
  }),
]);

/**
 * Plain-sentence rules displayed in the right-hand help panel per docs/gdd/09 and docs/gdd/12.
 */
export const NEEDS_SHOP_HELP_RULES: readonly string[] = Object.freeze([
  'Bought is owned forever.',
  'Skins never expire.',
  'The game is free to play. This shop sells looks, time and choice at the same percentages anyone can earn in game. Nothing here buys power.',
  'Every skin reaches the currency store a few months after release.',
  'The founder pet, TrollinlootNScoot, never reaches the currency store.',
]);

/**
 * Payments line shown under the rules in the help panel. Wording ruled in
 * docs/house/PAYMENT-ACCOUNTS-RULE.md. Display text only; no payment path is wired here.
 */
export const NEEDS_SHOP_PAYMENTS_LINE =
  "Payments: the game's own merchant account. Nothing in this screen is pay-to-win.";

/** Default reference timestamp used when a caller does not supply `now`. */
export const NEEDS_SHOP_DEFAULT_NOW = '2026-11-04T00:00:00Z';

export interface NeedsShopCatalogEntry {
  readonly category: Exclude<NeedsShopCategoryId, 'basics'>;
  readonly item: ShopItem;
  readonly firstSaleDate: IsoDate;
  /** In-game currency price once in the currency store, or null for the founder pet exception. */
  readonly coinPrice: number | null;
  readonly summary: string;
}

/**
 * In-house catalog of skins and convenience items built strictly via
 * `defineSkin` and `defineConvenienceItem` from `src/game/economy/wardrobe`.
 */
export const NEEDS_SHOP_CATALOG: readonly NeedsShopCatalogEntry[] = Object.freeze([
  // TOPS
  Object.freeze({
    category: 'tops',
    item: defineSkin({
      id: 'cloudwalker-linen-tunic',
      name: 'Cloudwalker Linen Tunic',
      slot: 'top',
      firstSaleDate: '2026-01-15',
    }),
    firstSaleDate: '2026-01-15',
    coinPrice: 320,
    summary: 'Woven highland linen tunic with a high collar for misty morning roads.',
  }),
  Object.freeze({
    category: 'tops',
    item: defineSkin({
      id: 'lanternkeeper-wool-coat',
      name: 'Lanternkeeper Wool Coat',
      slot: 'top',
      firstSaleDate: '2026-03-10',
    }),
    firstSaleDate: '2026-03-10',
    coinPrice: 450,
    summary: 'Long charcoal wool coat tailored for night watch and quiet ruins.',
  }),
  Object.freeze({
    category: 'tops',
    item: defineSkin({
      id: 'astral-weaver-mantle',
      name: 'Astral Weaver Mantle',
      slot: 'top',
      firstSaleDate: '2026-09-01',
    }),
    firstSaleDate: '2026-09-01',
    coinPrice: 520,
    summary: 'Dusk-dyed layered mantle stitched with fine silver thread.',
  }),

  // BOTTOMS
  Object.freeze({
    category: 'bottoms',
    item: defineSkin({
      id: 'ridgehunter-Canvas-breeches',
      name: 'Ridgehunter Canvas Breeches',
      slot: 'bottom',
      firstSaleDate: '2026-02-01',
    }),
    firstSaleDate: '2026-02-01',
    coinPrice: 280,
    summary: 'Heavy canvas breeches reinforced at the knee for steep stone climbs.',
  }),
  Object.freeze({
    category: 'bottoms',
    item: defineSkin({
      id: 'reedwarden-pleated-hakama',
      name: 'Reedwarden Pleated Trousers',
      slot: 'bottom',
      firstSaleDate: '2026-04-01',
    }),
    firstSaleDate: '2026-04-01',
    coinPrice: 360,
    summary: 'Wide-cut pleated travel trousers that move cleanly in the wind.',
  }),
  Object.freeze({
    category: 'bottoms',
    item: defineSkin({
      id: 'nightfall-strider-leggings',
      name: 'Nightfall Strider Leggings',
      slot: 'bottom',
      firstSaleDate: '2026-08-15',
    }),
    firstSaleDate: '2026-08-15',
    coinPrice: 410,
    summary: 'Close-fitted slate travel leggings tailored for city rooftops.',
  }),

  // SHOES
  Object.freeze({
    category: 'shoes',
    item: defineSkin({
      id: 'stoneguard-trail-boots',
      name: 'Stoneguard Trail Boots',
      slot: 'shoes',
      firstSaleDate: '2026-01-20',
    }),
    firstSaleDate: '2026-01-20',
    coinPrice: 260,
    summary: 'Ankle-laced leather boots built for wet stone and timber bridges.',
  }),
  Object.freeze({
    category: 'shoes',
    item: defineSkin({
      id: 'skylark-soft-runners',
      name: 'Skylark Soft Runners',
      slot: 'shoes',
      firstSaleDate: '2026-03-25',
    }),
    firstSaleDate: '2026-03-25',
    coinPrice: 300,
    summary: 'Light cloth-and-leather runners with quiet cord soles.',
  }),
  Object.freeze({
    category: 'shoes',
    item: defineSkin({
      id: 'horizon-wayfarer-greaves',
      name: 'Horizon Wayfarer Boots',
      slot: 'shoes',
      firstSaleDate: '2026-10-01',
    }),
    firstSaleDate: '2026-10-01',
    coinPrice: 390,
    summary: 'Tall buckled road boots finished in matte obsidian leather.',
  }),

  // PETS
  Object.freeze({
    category: 'pets',
    item: defineSkin({
      id: FOUNDER_PET_SKIN_ID,
      name: 'TrollinlootNScoot',
      slot: 'pet',
      firstSaleDate: '2026-01-01',
    }),
    firstSaleDate: '2026-01-01',
    coinPrice: null,
    summary:
      'The founder pet. By permanent rule, TrollinlootNScoot is the one exception that never reaches the in-game currency store.',
  }),
  Object.freeze({
    category: 'pets',
    item: defineSkin({
      id: 'gemineye-lantern-owl',
      name: 'GeminEYE Lantern Owl',
      slot: 'pet',
      firstSaleDate: '2026-02-10',
    }),
    firstSaleDate: '2026-02-10',
    coinPrice: 600,
    summary: 'Quiet mechanical owl companion look that glides beside your shoulder.',
  }),
  Object.freeze({
    category: 'pets',
    item: defineSkin({
      id: 'mist-hound-pup',
      name: 'Mist Hound Companion',
      slot: 'pet',
      firstSaleDate: '2026-09-15',
    }),
    firstSaleDate: '2026-09-15',
    coinPrice: 600,
    summary: 'Silver-coated valley hound look that trots along frontier trails.',
  }),

  // CONVENIENCE
  Object.freeze({
    category: 'convenience',
    item: defineConvenienceItem({
      id: 'caravan-storage-courier',
      name: 'Caravan Storage Courier',
      saves: 'walking',
    }),
    firstSaleDate: '2026-02-05',
    coinPrice: 480,
    summary: 'Sends gathered timber and ore back to your town storage so you save walking trips.',
  }),
  Object.freeze({
    category: 'convenience',
    item: defineConvenienceItem({
      id: 'gemineye-auto-loot-lens',
      name: 'GeminEYE Auto-Gather Cadence',
      saves: 'attention',
    }),
    firstSaleDate: '2026-03-15',
    coinPrice: 500,
    summary: 'Collects nearby dropped salvage automatically so you save attention on long routes.',
  }),
  Object.freeze({
    category: 'convenience',
    item: defineConvenienceItem({
      id: 'outpost-waypoint-bell',
      name: 'Outpost Waypoint Bell',
      saves: 'walking',
    }),
    firstSaleDate: '2026-09-20',
    coinPrice: 540,
    summary: 'Recalls you to the nearest discovered camp bell to save walking across valleys.',
  }),
]);

const UTC_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Format an ISO `YYYY-MM-DD` date into `<Month> <Year>` in UTC (e.g. `March 2027`). */
export function formatReleaseMonthUtc(isoDate: IsoDate): string {
  const [yStr, mStr] = isoDate.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const monthName = UTC_MONTH_NAMES[monthIdx] ?? mStr;
  return `${monthName} ${year}`;
}

export interface NeedsShopRowModel {
  readonly id: string;
  readonly name: string;
  readonly category: NeedsShopCategoryId;
  readonly summary: string;
  readonly isBasic: boolean;
  readonly isFounderPet: boolean;
  readonly isOwned: boolean;
  readonly coinPrice: number | null;
  readonly firstSaleDate: IsoDate | null;
  readonly releaseDate: IsoDate | null;
  readonly releaseMonthLabel: string | null;
  readonly inCurrencyStore: boolean;
  readonly priceOrOwnedLabel: string;
  readonly storeStatusLabel: string;
  readonly actionLabel: string;
  readonly canGetWithCoins: boolean;
}

/**
 * Resolve a catalog entry against the wardrobe module's ownership, release date,
 * and founder-pet exception functions.
 */
export function resolveNeedsShopRow(
  entry: NeedsShopCatalogEntry,
  wardrobe: Wardrobe,
  now: Date = new Date(NEEDS_SHOP_DEFAULT_NOW),
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): NeedsShopRowModel {
  const id = entry.item.id;
  const owned = ownsSkin(wardrobe, id);
  const founderPet = isCurrencyStoreExcluded(id);
  const releaseProbe = { id, firstSaleDate: entry.firstSaleDate };
  const releaseDate = currencyStoreReleaseDate(releaseProbe, config);
  const inStore = isInCurrencyStore(releaseProbe, now, config);
  const releaseMonthLabel = releaseDate ? formatReleaseMonthUtc(releaseDate) : null;

  if (founderPet) {
    return Object.freeze({
      id,
      name: entry.item.name,
      category: entry.category,
      summary: entry.summary,
      isBasic: false,
      isFounderPet: true,
      isOwned: owned,
      coinPrice: null,
      firstSaleDate: entry.firstSaleDate,
      releaseDate: null,
      releaseMonthLabel: null,
      inCurrencyStore: false,
      priceOrOwnedLabel: owned ? 'OWNED' : 'FOUNDER PET',
      storeStatusLabel: 'Never reaches the currency store',
      actionLabel: owned ? 'Owned' : 'Never in currency store',
      canGetWithCoins: false,
    });
  }

  const priceText = `${entry.coinPrice ?? 0} COINS`;

  if (owned) {
    return Object.freeze({
      id,
      name: entry.item.name,
      category: entry.category,
      summary: entry.summary,
      isBasic: false,
      isFounderPet: false,
      isOwned: true,
      coinPrice: entry.coinPrice,
      firstSaleDate: entry.firstSaleDate,
      releaseDate,
      releaseMonthLabel,
      inCurrencyStore: inStore,
      priceOrOwnedLabel: 'OWNED',
      storeStatusLabel: inStore
        ? `Reached currency store (${releaseMonthLabel}) · Owned forever`
        : `Not yet in the store (${releaseMonthLabel}) · Owned forever`,
      actionLabel: 'Owned',
      canGetWithCoins: false,
    });
  }

  if (inStore) {
    return Object.freeze({
      id,
      name: entry.item.name,
      category: entry.category,
      summary: entry.summary,
      isBasic: false,
      isFounderPet: false,
      isOwned: false,
      coinPrice: entry.coinPrice,
      firstSaleDate: entry.firstSaleDate,
      releaseDate,
      releaseMonthLabel,
      inCurrencyStore: true,
      priceOrOwnedLabel: priceText,
      storeStatusLabel: `Reached currency store (${releaseMonthLabel})`,
      actionLabel: 'Get with coins',
      canGetWithCoins: true,
    });
  }

  return Object.freeze({
    id,
    name: entry.item.name,
    category: entry.category,
    summary: entry.summary,
    isBasic: false,
    isFounderPet: false,
    isOwned: false,
    coinPrice: entry.coinPrice,
    firstSaleDate: entry.firstSaleDate,
    releaseDate,
    releaseMonthLabel,
    inCurrencyStore: false,
    priceOrOwnedLabel: priceText,
    storeStatusLabel: `Not yet in the store · Reaches store ${releaseMonthLabel}`,
    actionLabel: `Not yet in the store (${releaseMonthLabel})`,
    canGetWithCoins: false,
  });
}

const BASIC_SUMMARIES: Readonly<Record<BasicSlot, string>> = Object.freeze({
  top: 'Kid-safe starter top from KID_SAFE_BASICS. Always owned by every character and never sold.',
  bottom: 'Kid-safe starter trousers from KID_SAFE_BASICS. Always owned by every character and never sold.',
  shoes: 'Kid-safe starter footwear from KID_SAFE_BASICS. Always owned by every character and never sold.',
});

/**
 * Return all rows for the chosen category, pulling kid-safe basics directly
 * from `KID_SAFE_BASICS` and catalog items through `resolveNeedsShopRow`.
 */
export function getCategoryRows(
  category: NeedsShopCategoryId,
  wardrobe: Wardrobe,
  now: Date = new Date(NEEDS_SHOP_DEFAULT_NOW),
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): readonly NeedsShopRowModel[] {
  if (category === 'basics') {
    return Object.freeze(
      BASIC_SLOTS.map((slot) => {
        const basicItem = KID_SAFE_BASICS[slot];
        return Object.freeze({
          id: basicItem.id,
          name: basicItem.name,
          category: 'basics' as const,
          summary: BASIC_SUMMARIES[slot],
          isBasic: true,
          isFounderPet: false,
          isOwned: KID_SAFE_BASIC_IDS.includes(basicItem.id),
          coinPrice: null,
          firstSaleDate: null,
          releaseDate: null,
          releaseMonthLabel: null,
          inCurrencyStore: false,
          priceOrOwnedLabel: 'OWNED · FREE BASIC',
          storeStatusLabel: 'Starter basic · Always owned',
          actionLabel: 'Always owned',
          canGetWithCoins: false,
        });
      }),
    );
  }

  return Object.freeze(
    NEEDS_SHOP_CATALOG.filter((entry) => entry.category === category).map((entry) =>
      resolveNeedsShopRow(entry, wardrobe, now, config),
    ),
  );
}

/**
 * Acquire a released shop item through the `'currency-store'` door in
 * `src/game/economy/wardrobe`. No real-money channel is ever called here.
 */
export function buyItemWithCoins(
  wardrobe: Wardrobe,
  itemId: string,
  now: Date = new Date(NEEDS_SHOP_DEFAULT_NOW),
  config: WardrobeConfig = DEFAULT_WARDROBE_CONFIG,
): AcquireResult {
  if (KID_SAFE_BASIC_IDS.some((b) => b.toLowerCase() === itemId.toLowerCase())) {
    return { ok: false, reason: 'already-owned' };
  }
  const entry = NEEDS_SHOP_CATALOG.find((e) => e.item.id === itemId);
  if (!entry) {
    throw new WardrobeRuleError(`unknown shop item id: ${itemId}`);
  }
  const skinRecord: Skin = isSkin(entry.item)
    ? entry.item
    : Object.freeze({
        kind: 'skin' as const,
        id: entry.item.id,
        name: entry.item.name,
        slot: 'back' as const,
        firstSaleDate: entry.firstSaleDate,
      });

  return acquireSkin(wardrobe, skinRecord, 'currency-store', now, config);
}

export function createDefaultDemoWardrobe(): Wardrobe {
  const base = createWardrobe('dreamer-local');
  const seeded = buyItemWithCoins(base, 'cloudwalker-linen-tunic', new Date(NEEDS_SHOP_DEFAULT_NOW));
  return seeded.ok ? seeded.wardrobe : base;
}

export interface NeedsShopModalProps {
  isOpen: boolean;
  wardrobe?: Wardrobe;
  initialCategory?: NeedsShopCategoryId;
  now?: Date;
  config?: WardrobeConfig;
  onChangeWardrobe?: (next: Wardrobe) => void;
  onClose: () => void;
}

const FONT_STACK = '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';

export const NeedsShopModal: React.FC<NeedsShopModalProps> = ({
  isOpen,
  wardrobe: controlledWardrobe,
  initialCategory = 'tops',
  now: controlledNow,
  config = DEFAULT_WARDROBE_CONFIG,
  onChangeWardrobe,
  onClose,
}) => {
  const [internalWardrobe, setInternalWardrobe] = useState<Wardrobe>(() =>
    createDefaultDemoWardrobe(),
  );
  const [selectedCategory, setSelectedCategory] = useState<NeedsShopCategoryId>(initialCategory);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  );

  const activeWardrobe = controlledWardrobe ?? internalWardrobe;
  const effectiveNow = controlledNow ?? new Date(NEEDS_SHOP_DEFAULT_NOW);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

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
        const idx = NEEDS_SHOP_CATEGORIES.findIndex((c) => c.id === selectedCategory);
        if (idx === -1) return;
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIdx =
          (idx + delta + NEEDS_SHOP_CATEGORIES.length) % NEEDS_SHOP_CATEGORIES.length;
        setSelectedCategory(NEEDS_SHOP_CATEGORIES[nextIdx].id);
        setSelectedItemId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedCategory]);

  if (!isOpen) return null;

  const activeCategoryMeta =
    NEEDS_SHOP_CATEGORIES.find((c) => c.id === selectedCategory) ?? NEEDS_SHOP_CATEGORIES[0];
  const rows = getCategoryRows(selectedCategory, activeWardrobe, effectiveNow, config);
  const activeRow = rows.find((r) => r.id === selectedItemId) ?? rows[0] ?? null;

  const handleGetWithCoins = (row: NeedsShopRowModel) => {
    setSelectedItemId(row.id);
    const result = buyItemWithCoins(activeWardrobe, row.id, effectiveNow, config);
    if (result.ok) {
      if (!controlledWardrobe) {
        setInternalWardrobe(result.wardrobe);
      }
      onChangeWardrobe?.(result.wardrobe);
      setStatusNotice(`${row.name} added to your wardrobe forever via in-game coins.`);
    } else {
      setStatusNotice(`Could not acquire ${row.name}: ${result.reason}.`);
    }
  };

  const renderItemRow = (row: NeedsShopRowModel) => {
    const isChosenItem = activeRow?.id === row.id;
    return (
      <div
        key={row.id}
        data-testid={`needs-shop-row-${row.id}`}
        onMouseEnter={() => setSelectedItemId(row.id)}
        onClick={() => setSelectedItemId(row.id)}
        style={{
          backgroundColor: isChosenItem
            ? 'rgba(22, 22, 26, 0.92)'
            : 'rgba(10, 10, 12, 0.88)',
          border: isChosenItem
            ? '1px solid rgba(255, 255, 255, 0.42)'
            : '1px solid rgba(255, 255, 255, 0.18)',
          padding: isCompactViewport ? '10px 12px' : '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: '#F5F5F7',
            }}
          >
            {row.name}
          </span>
          <span
            data-testid={`needs-shop-price-${row.id}`}
            style={{
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#E5E5EA',
              padding: '2px 8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            {row.priceOrOwnedLabel}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span
            data-testid={`needs-shop-status-${row.id}`}
            style={{
              fontSize: '14px',
              fontWeight: 300,
              color: '#D1D1D6',
              lineHeight: 1.4,
            }}
          >
            {row.storeStatusLabel}
          </span>

          {row.canGetWithCoins ? (
            <button
              type="button"
              data-testid={`needs-shop-buy-${row.id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleGetWithCoins(row);
              }}
              style={{
                height: '30px',
                padding: '0 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.38)',
                color: '#F5F5F7',
                fontSize: '14px',
                fontWeight: 400,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: FONT_STACK,
                cursor: 'pointer',
              }}
            >
              Get with coins
            </button>
          ) : (
            <span
              data-testid={`needs-shop-disabled-${row.id}`}
              style={{
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: '#C7C7CC',
                padding: '3px 10px',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                backgroundColor: 'rgba(10, 10, 12, 0.65)',
              }}
            >
              {row.actionLabel}
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
      aria-label="NEEDs Shop · Wardrobe"
      data-testid="needs-shop-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        backgroundColor: 'rgba(10, 10, 12, 0.56)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        color: '#F5F5F7',
        fontFamily: FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCompactViewport ? '14px 14px 12px' : '28px 48px 22px',
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
            paddingBottom: isCompactViewport ? '8px' : '12px',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: isCompactViewport ? '30px' : '44px',
              fontWeight: 200,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#F5F5F7',
              lineHeight: 1.08,
            }}
          >
            WARDROBE · NEEDS SHOP
          </h1>
          <div
            style={{
              fontSize: '14px',
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
            : 'minmax(200px, 24%) minmax(320px, 40%) minmax(260px, 36%)',
          gap: isCompactViewport ? '10px' : '28px',
          paddingTop: isCompactViewport ? '8px' : '18px',
          paddingBottom: isCompactViewport ? '8px' : '18px',
          alignItems: 'start',
          overflowY: 'auto',
        }}
      >
        {/* Column 1 (Left): Category names, one per row, with a soft highlight bar on the chosen row */}
        <div
          role="listbox"
          aria-label="Wardrobe Categories"
          style={{
            display: 'flex',
            flexDirection: isCompactViewport ? 'row' : 'column',
            flexWrap: isCompactViewport ? 'wrap' : 'nowrap',
            gap: '4px',
          }}
        >
          {NEEDS_SHOP_CATEGORIES.map((category) => {
            const isChosen = category.id === selectedCategory;
            return (
              <button
                key={category.id}
                type="button"
                role="option"
                aria-selected={isChosen}
                data-testid={`needs-shop-category-${category.id}`}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedItemId(null);
                }}
                style={{
                  height: isCompactViewport ? '34px' : '36px',
                  width: isCompactViewport ? 'auto' : '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: isCompactViewport ? '0 12px' : '0 14px',
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
                  fontSize: '15px',
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

        {/* Column 2 (Middle): Dark rows holding item name, owned or price in in-game currency, and currency store status */}
        <div
          aria-label="Category Items"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {rows.map((row) => renderItemRow(row))}

          {statusNotice && (
            <div
              role="status"
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(10, 10, 12, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.24)',
                fontSize: '14px',
                color: '#F5F5F7',
                lineHeight: 1.45,
              }}
            >
              {statusNotice}
            </div>
          )}
        </div>

        {/* Column 3 (Right): Plain-sentence help panel explaining the rules */}
        <aside
          aria-label="Wardrobe Rules and Help"
          style={{
            backgroundColor: 'rgba(10, 10, 12, 0.68)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.18)',
            padding: isCompactViewport ? '14px 16px' : '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div>
            <h2
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
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
                marginBottom: '10px',
              }}
            />
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '15px',
                lineHeight: 1.5,
                fontWeight: 300,
                color: '#E5E5EA',
              }}
            >
              {activeCategoryMeta.summary}
            </p>
            {activeRow && (
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.5,
                  fontWeight: 300,
                  color: '#D1D1D6',
                }}
              >
                {activeRow.name}: {activeRow.summary}
              </p>
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.14)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#F5F5F7',
              }}
            >
              WARDROBE &amp; NEEDS SHOP RULES
            </div>
            {NEEDS_SHOP_HELP_RULES.map((sentence, idx) => (
              <p
                key={idx}
                style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.5,
                  fontWeight: 300,
                  color: '#E5E5EA',
                }}
              >
                {sentence}
              </p>
            ))}
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.5,
                fontWeight: 300,
                color: '#E5E5EA',
              }}
            >
              {NEEDS_SHOP_PAYMENTS_LINE}
            </p>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.14)',
              paddingTop: '12px',
              fontSize: '14px',
              lineHeight: 1.5,
              color: '#D1D1D6',
            }}
          >
            <div>
              Starter Basics (always owned): {KID_SAFE_BASICS.top.name} ·{' '}
              {KID_SAFE_BASICS.bottom.name} · {KID_SAFE_BASICS.shoes.name}
            </div>
            <div>
              In-game currency store delay: {config.currencyStoreDelayMonths} months after first
              release (except {FOUNDER_PET_SKIN_ID}). No payment is wired yet.
            </div>
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
            marginBottom: isCompactViewport ? '8px' : '14px',
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
            data-testid="needs-shop-back"
            onClick={onClose}
            style={{
              height: '36px',
              padding: '0 28px',
              backgroundColor: 'rgba(10, 10, 12, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              color: '#F5F5F7',
              fontSize: '15px',
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
                fontSize: '14px',
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
