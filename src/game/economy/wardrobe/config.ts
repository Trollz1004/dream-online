/**
 * Wardrobe rules: the one place the store-release delay lives.
 *
 * Josh can change the delay by editing DEFAULT_CURRENCY_STORE_DELAY_MONTHS below
 * (one number, one line). Callers can also pass a config built with
 * createWardrobeConfig for tests or live tuning. Nothing here reads the environment.
 */

/**
 * Months between a skin's first sale and its arrival in the in-game currency store.
 * Founder-tunable. Default 6.
 */
export const DEFAULT_CURRENCY_STORE_DELAY_MONTHS = 6;

/** Upper bound so a typo cannot push the store release to the year 3000. */
export const MAX_CURRENCY_STORE_DELAY_MONTHS = 120;

export interface WardrobeConfig {
  readonly currencyStoreDelayMonths: number;
}

export class WardrobeRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WardrobeRuleError';
  }
}

/** Build a validated, frozen config. Delay must be a whole number of months, 0 to 120. */
export function createWardrobeConfig(overrides: Partial<WardrobeConfig> = {}): WardrobeConfig {
  const months = overrides.currencyStoreDelayMonths ?? DEFAULT_CURRENCY_STORE_DELAY_MONTHS;
  if (!Number.isInteger(months) || months < 0 || months > MAX_CURRENCY_STORE_DELAY_MONTHS) {
    throw new WardrobeRuleError(
      `currencyStoreDelayMonths must be a whole number from 0 to ${MAX_CURRENCY_STORE_DELAY_MONTHS}, got ${String(months)}`,
    );
  }
  return Object.freeze({ currencyStoreDelayMonths: months });
}

export const DEFAULT_WARDROBE_CONFIG: WardrobeConfig = createWardrobeConfig();
