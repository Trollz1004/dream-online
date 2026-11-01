/**
 * DREAM Engine — In-House Consumables System (100% AI-Built, Zero External Engine Dependencies)
 * Red potion (health), Blue potion (stamina), and Food (slow heal-over-time buff).
 * Bound to hotbar keys 1, 2, 3.
 */

export class ConsumablesState {
  static readonly RED_HEAL = 35.0;
  static readonly BLUE_STAMINA = 50.0;
  static readonly FOOD_HEAL_PER_SECOND = 2.0;
  static readonly FOOD_DURATION = 20.0;
  static readonly POTION_COOLDOWN = 10.0; // shared cooldown between red and blue potions
  static readonly FOOD_COOLDOWN = 30.0;

  static readonly START_RED = 5;
  static readonly START_BLUE = 5;
  static readonly START_FOOD = 3;

  redCharges: number = ConsumablesState.START_RED;
  blueCharges: number = ConsumablesState.START_BLUE;
  foodCharges: number = ConsumablesState.START_FOOD;

  private _potionCooldownLeft = 0.0;
  private _foodCooldownLeft = 0.0;
  private _foodBuffLeft = 0.0;

  canUseRed(): boolean {
    return this.redCharges > 0 && this._potionCooldownLeft <= 0.0;
  }

  canUseBlue(): boolean {
    return this.blueCharges > 0 && this._potionCooldownLeft <= 0.0;
  }

  canUseFood(): boolean {
    return this.foodCharges > 0 && this._foodCooldownLeft <= 0.0;
  }

  useRed(health: number, healthMax: number): number {
    if (!this.canUseRed()) {
      return health;
    }
    this.redCharges -= 1;
    this._potionCooldownLeft = ConsumablesState.POTION_COOLDOWN;
    return Math.min(healthMax, Math.max(0.0, health + ConsumablesState.RED_HEAL));
  }

  useBlue(stamina: number, staminaMax: number): number {
    if (!this.canUseBlue()) {
      return stamina;
    }
    this.blueCharges -= 1;
    this._potionCooldownLeft = ConsumablesState.POTION_COOLDOWN;
    return Math.min(staminaMax, Math.max(0.0, stamina + ConsumablesState.BLUE_STAMINA));
  }

  useFood(): boolean {
    if (!this.canUseFood()) {
      return false;
    }
    this.foodCharges -= 1;
    this._foodCooldownLeft = ConsumablesState.FOOD_COOLDOWN;
    this._foodBuffLeft = ConsumablesState.FOOD_DURATION;
    return true;
  }

  advance(delta: number): number {
    this._potionCooldownLeft = Math.max(0.0, this._potionCooldownLeft - delta);
    this._foodCooldownLeft = Math.max(0.0, this._foodCooldownLeft - delta);
    if (this._foodBuffLeft <= 0.0) {
      return 0.0;
    }
    const tick = Math.min(delta, this._foodBuffLeft);
    this._foodBuffLeft = Math.max(0.0, this._foodBuffLeft - delta);
    return tick * ConsumablesState.FOOD_HEAL_PER_SECOND;
  }

  potionCooldownLeft(): number {
    return this._potionCooldownLeft;
  }

  foodCooldownLeft(): number {
    return this._foodCooldownLeft;
  }

  foodBuffActive(): boolean {
    return this._foodBuffLeft > 0.0;
  }

  foodBuffLeft(): number {
    return this._foodBuffLeft;
  }
}
