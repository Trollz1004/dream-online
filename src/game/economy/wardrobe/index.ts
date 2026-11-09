/** Wardrobe rules: public surface. Pure module, no UI. See docs/gdd/12-wardrobe-needs-shop.md. */

export * from './types.ts';
export {
  DEFAULT_CURRENCY_STORE_DELAY_MONTHS,
  MAX_CURRENCY_STORE_DELAY_MONTHS,
  DEFAULT_WARDROBE_CONFIG,
  WardrobeRuleError,
  createWardrobeConfig,
  type WardrobeConfig,
} from './config.ts';
export {
  FOUNDER_PET_SKIN_ID,
  CURRENCY_STORE_EXCLUDED_IDS,
  isCurrencyStoreExcluded,
  isIsoDate,
  addMonthsUtc,
  currencyStoreReleaseDate,
  isOnNeedsShop,
  isInCurrencyStore,
  listCurrencyStore,
} from './release.ts';
export {
  defineSkin,
  defineConvenienceItem,
  validateShopItem,
  validateCatalog,
  isSkin,
  type ValidationResult,
} from './guard.ts';
export {
  createWardrobe,
  ownsSkin,
  acquireSkin,
  parseWardrobe,
  type AcquireRefusal,
  type AcquireResult,
} from './ownership.ts';
export { KID_SAFE_BASICS, KID_SAFE_BASIC_IDS, createDefaultOutfit, isKidSafeBasicsOutfit } from './basics.ts';
export {
  BLUS_PET_TEE_ID,
  AFK_FISHING_HAT,
  AFK_FISHING_TOP,
  AFK_FISHING_BOTTOM,
  AFK_FISHING_SHOES,
  COOKING_APRON,
  CHEFS_HAT,
  TIER_PERCENT_PLACEHOLDER,
  STAT_PLACEHOLDER,
  TEAM_BLUE_BASEBALL_CAP,
  TEAM_BLUE_BASEBALL_JERSEY,
  TEAM_BLUE_BASEBALL_PANTS,
  TEAM_BLUE_BASEBALL_CLEATS,
  TEAM_BLUE_ASH_BAT,
  TEAM_BLUE_ALLOY_BAT,
  PLASTIC_T_BALL_BAT,
  BLUS_PET_TEE,
  WAVE_ONE_FOUNDER_PET,
  WAVE_ONE_CATALOGUE,
  getCatalogueEntry,
  isBlueChargeOnly,
  canBuyWithCoins,
  canBuyWithMoney,
  type WaveOneHowEarned,
  type WaveOneTier,
  type WaveOneStat,
  type WaveOneBonus,
  type WaveOneInGamePath,
  type WaveOneCatalogueEntry,
} from './catalogue.ts';
