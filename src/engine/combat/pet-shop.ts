/**
 * DREAM Engine — In-House GeminEYE Companion & NEEDs Convenience Shop
 * 100% AI-Built, Zero External Engine Dependencies.
 * Compliance Wall (Florida §496.405): Pay-for-convenience & cosmetics ONLY — never pay-to-win.
 * GeminEYE is a non-combat looting/companion drone; NEEDs never confer combat power.
 */

export type GeminEyeSkin = 'default' | 'ember' | 'frost' | 'void';

export class GeminEyePetState {
  static readonly EXTEND_SECONDS = 3600;
  static readonly VALID_SKINS: readonly GeminEyeSkin[] = ['default', 'ember', 'frost', 'void'];

  remainingSeconds: number;
  skin: GeminEyeSkin = 'default';

  constructor(initialSeconds = GeminEyePetState.EXTEND_SECONDS) {
    this.remainingSeconds = Math.max(0, initialSeconds);
  }

  isActive(): boolean {
    return this.remainingSeconds > 0;
  }

  advance(delta: number): void {
    this.remainingSeconds = Math.max(0, this.remainingSeconds - Math.max(0, delta));
  }

  extend(seconds = GeminEyePetState.EXTEND_SECONDS): void {
    if (seconds > 0) {
      this.remainingSeconds += seconds;
    }
  }

  setSkin(skinName: string): boolean {
    if ((GeminEyePetState.VALID_SKINS as readonly string[]).includes(skinName)) {
      this.skin = skinName as GeminEyeSkin;
      return true;
    }
    return false;
  }
}

export class GeminEyePetShop {
  static readonly DEFAULT_BALANCE = 500;
  static readonly EXTEND_ITEM = 'extend_1_hour';
  static readonly EXTEND_COST = 50;
  static readonly EXTEND_LABEL = 'Extend GeminEYE 1 hour';

  static readonly SKIN_COSTS: Record<Exclude<GeminEyeSkin, 'default'>, number> = {
    ember: 40,
    frost: 40,
    void: 60,
  };

  static readonly SKIN_LABELS: Record<Exclude<GeminEyeSkin, 'default'>, string> = {
    ember: 'GeminEYE skin: Ember',
    frost: 'GeminEYE skin: Frost',
    void: 'GeminEYE skin: Void',
  };

  needsBalance: number;

  constructor(startingBalance = GeminEyePetShop.DEFAULT_BALANCE) {
    this.needsBalance = startingBalance;
  }

  canAfford(cost: number): boolean {
    return this.needsBalance >= cost;
  }

  skinCost(skinName: string): number {
    if (skinName in GeminEyePetShop.SKIN_COSTS) {
      return GeminEyePetShop.SKIN_COSTS[skinName as Exclude<GeminEyeSkin, 'default'>];
    }
    return 0;
  }

  buyExtend(petState: GeminEyePetState): boolean {
    if (!this.canAfford(GeminEyePetShop.EXTEND_COST)) {
      return false;
    }
    this.needsBalance -= GeminEyePetShop.EXTEND_COST;
    petState.extend(GeminEyePetState.EXTEND_SECONDS);
    return true;
  }

  buySkin(petState: GeminEyePetState, skinName: string): boolean {
    const cost = this.skinCost(skinName);
    if (cost <= 0 || !this.canAfford(cost)) {
      return false;
    }
    this.needsBalance -= cost;
    petState.setSkin(skinName);
    return true;
  }
}
