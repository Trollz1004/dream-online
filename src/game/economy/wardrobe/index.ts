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
