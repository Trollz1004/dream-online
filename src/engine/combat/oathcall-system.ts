/**
 * DREAM Engine — Server-Authoritative Oathcall, Townships & Champion Regalia System
 * 100% Clean-Room World-Native Design (Founder Joshua Coleman)
 *
 * Rules Enforced:
 * - Part 1 (Oathcall):
 *   1. Knockout in a PvP-enabled zone creates an Oathcall mark on the attacker (default 10 min = 600s, tunable).
 *   2. Victim selects up to 5 allies (tunable) strictly from their own Party, Guild, or Friends list (never strangers).
 *   3. Answering allies travel to the attacker's location (blocked if attacker is in a safe zone/town),
 *      receive a 2-second arrival shield, and trigger a dramatic warning on the attacker ("Oathcall answered: N incoming").
 *   4. Bully Rule: if attacker is far above victim in level (>= +10 levels) or gear (>= +150 gear score),
 *      mark duration scales up (1.75x = 17.5 min) and answering allies receive an arrival valor buff (+18% offense/defense).
 *      Equal fights get a plain mark (600s) and 0% buff. Victims far below attacker lose 0 XP / 0 items / 0 gold on knockout.
 *   5. Contested World-Boss Return: a wiped team can Oathcall back to a contested boss area once per fight (900s cooldown).
 *   6. Anti-Abuse: 1 active mark per attacker-victim pair, 180s call cooldown, max 3 remarks per 30-min rolling window,
 *      immutable server-side audit log.
 *   7. Staff Parity: Founder & staff play on normal accounts with zero stat/gear boost, flagged in logs (`isStaffAccount`),
 *      and any attempt to invoke GM/admin powers in PvP is hard-rejected and logged.
 * - Part 2 (Townships):
 *   1. World townships contested via scheduled battles with advance guild sign-ups and fixed start/end windows.
 *   2. Holding guild sets an in-game gold trade tax capped at 33% (tunable), deposited strictly to the guild bank in
 *      in-game gold (never real money, never crypto/tokens).
 *   3. Holders must defend at the next scheduled battle (no permanent holds).
 *   4. Oathcall works inside active township battles so fallen guildmates can be called back in.
 * - Part 3 (Champion Regalia):
 *   1. Earned-only via winning township battles or top seasonal PvP rank. Never sold in mall, never tradeable, never token-gated.
 *   2. Original DREAM Sovereign Aether-Plate armor + slowly rotating Blue-Flame Holographic Floor Sigil.
 *   3. Strictly zero combat stats (`bonusAttack: 0, bonusDefense: 0, bonusHp: 0, bonusSpeed: 0`).
 *   4. Seasonal active regalia while holding title/rank; permanent compact Crest of Past Champions after season rotation.
 */

export interface OathcallTuningConfig {
  baseMarkDurationSec: number; // Default: 600s (10 minutes)
  bullyMarkDurationMultiplier: number; // Default: 1.75x (1050s = 17.5 minutes)
  bullyLevelDeltaThreshold: number; // Default: 10 levels higher
  bullyGearDeltaThreshold: number; // Default: 150 gear score higher
  bullyAllyValorBuffPct: number; // Default: 18% (+18% damage/mitigation for answering allies against a bully)
  maxAlliesPerCall: number; // Default: 5 allies
  arrivalShieldDurationSec: number; // Default: 2.0 seconds
  callCooldownSec: number; // Default: 180 seconds (3 minutes)
  maxRemarksPerPairWindow: number; // Default: 3 marks per pair in rolling window
  pairRemarkWindowSec: number; // Default: 1800 seconds (30 minutes)
  bossFightReturnCooldownSec: number; // Default: 900 seconds (15 minutes, once per boss fight)
  townshipMaxTaxRatePct: number; // Default: 33% hard cap
  townshipBattleDurationSec: number; // Default: 3600 seconds (60 minutes)
  sigilRotationSpeedRadPerSec: number; // Default: 0.85 rad/sec slow ceremonial turn
}

export const DEFAULT_OATHCALL_TUNING: OathcallTuningConfig = {
  baseMarkDurationSec: 600,
  bullyMarkDurationMultiplier: 1.75,
  bullyLevelDeltaThreshold: 10,
  bullyGearDeltaThreshold: 150,
  bullyAllyValorBuffPct: 18,
  maxAlliesPerCall: 5,
  arrivalShieldDurationSec: 2.0,
  callCooldownSec: 180,
  maxRemarksPerPairWindow: 3,
  pairRemarkWindowSec: 1800,
  bossFightReturnCooldownSec: 900,
  townshipMaxTaxRatePct: 33,
  townshipBattleDurationSec: 3600,
  sigilRotationSpeedRadPerSec: 0.85,
};

export type ZoneSafetyType = 'pvp_open' | 'town_safe' | 'contested_boss' | 'township_battlefield';

export interface ZoneDescriptor {
  id: string;
  name: string;
  safety: ZoneSafetyType;
  townshipId?: string;
  bossId?: string;
}

export interface PlayerSocialGraph {
  partyIds: string[];
  guildId: string | null;
  guildMemberIds: string[];
  friendIds: string[];
}

export interface AuthoritativePlayerRecord {
  id: string;
  name: string;
  level: number;
  gearScore: number;
  baseStats: {
    maxHp: number;
    attack: number;
    defense: number;
  };
  position: { x: number; y: number; z: number };
  zoneId: string;
  social: PlayerSocialGraph;
  isStaffAccount: boolean;
  staffRoleLabel?: 'Founder' | 'Staff';
  activeArrivalShieldUntilSec: number;
  activeValorBuffPct: number;
  lastOathcallIssuedAtSec: number | null;
  seasonPvpRank: number | null;
  pastChampionSeasons: string[];
}

export interface OathcallMark {
  markId: string;
  victimId: string;
  victimName: string;
  attackerId: string;
  attackerName: string;
  createdAtSec: number;
  expiresAtSec: number;
  zoneId: string;
  isTownshipBattle: boolean;
  isBullyMark: boolean;
  levelDelta: number;
  gearDelta: number;
  allyValorBuffPct: number;
  victimPenaltyApplied: {
    xpLost: 0;
    goldLost: 0;
    itemsLost: 0;
    visualEffect: 'LIGHT_FLASH_RESPAWN';
  };
  consumed: boolean;
}

export interface OathcallArrivalEvent {
  eventId: string;
  markId: string;
  victimId: string;
  attackerId: string;
  arrivingAllyIds: string[];
  arrivingAllyNames: string[];
  destination: { x: number; y: number; z: number; zoneId: string };
  arrivalShieldSec: number;
  valorBuffPct: number;
  attackerWarningBanner: string; // e.g. "Oathcall answered: 3 incoming"
  timestampSec: number;
}

export interface ContestedBossOathcallEvent {
  eventId: string;
  bossId: string;
  fightInstanceId: string;
  callerId: string;
  returnedPartyIds: string[];
  arrivalShieldSec: number;
  destination: { x: number; y: number; z: number; zoneId: string };
  timestampSec: number;
}

export interface TownshipRecord {
  id: string;
  name: string;
  holdingGuildId: string | null;
  holdingGuildName: string | null;
  taxRatePct: number; // 0 .. 33%
  guildBankGold: number; // Strictly in-game gold
  nextBattleStartSec: number;
  nextBattleEndSec: number;
  registeredChallengerGuildIds: string[];
  activeBattleId: string | null;
  mustDefendAtNextBattle: boolean;
}

export interface TownshipTradeReceipt {
  townshipId: string;
  grossGold: number;
  taxRatePct: number;
  taxGoldCollected: number;
  sellerNetGold: number;
  guildBankGoldAfter: number;
  currency: 'IN_GAME_GOLD_ONLY';
}

export interface ChampionRegaliaGrant {
  playerId: string;
  playerName: string;
  seasonId: string;
  source: 'township_holder' | 'township_battle_winner' | 'top_pvp_rank';
  activeTitle: string;
  armorSetId: 'dream_sovereign_aether_plate';
  floorSigilId: 'blue_flame_holographic_sigil';
  isCurrentlyActive: boolean;
  hasPermanentPastChampionBadge: boolean;
  pastChampionSeasons: string[];
  tradeable: false;
  mallPurchasable: false;
  tokenReward: false;
  combatStats: {
    bonusAttack: 0;
    bonusDefense: 0;
    bonusHp: 0;
    bonusSpeed: 0;
  };
}

export interface ServerAuditLogEntry {
  seq: number;
  timestampSec: number;
  category:
    | 'OATHCALL_MARK_CREATED'
    | 'OATHCALL_ANSWERED'
    | 'OATHCALL_BOSS_RETURN'
    | 'OATHCALL_REJECTED'
    | 'STAFF_PARITY_ENFORCED'
    | 'TOWNSHIP_SIGNUP'
    | 'TOWNSHIP_BATTLE_STARTED'
    | 'TOWNSHIP_BATTLE_WON'
    | 'TOWNSHIP_TAX_UPDATED'
    | 'TOWNSHIP_TRADE_TAXED'
    | 'REGALIA_GRANTED'
    | 'REGALIA_REJECTED';
  actorId: string;
  isStaffActor: boolean;
  summary: string;
  metadata: Record<string, unknown>;
}

export class OathcallTownshipServer {
  tuning: OathcallTuningConfig;
  private players = new Map<string, AuthoritativePlayerRecord>();
  private zones = new Map<string, ZoneDescriptor>();
  private activeMarksByPair = new Map<string, OathcallMark>(); // key: `${victimId}::${attackerId}`
  private pairRemarkHistory = new Map<string, number[]>(); // key: `${victimId}::${attackerId}` -> timestamps
  private bossFightReturnUsed = new Set<string>(); // key: `${fightInstanceId}::${partyLeaderId}`
  private bossReturnCooldownByParty = new Map<string, number>(); // key: partyLeaderId -> lastUsedSec
  private townships = new Map<string, TownshipRecord>();
  private regaliaByPlayer = new Map<string, ChampionRegaliaGrant>();
  private auditLog: ServerAuditLogEntry[] = [];
  private seqCounter = 0;

  constructor(customTuning?: Partial<OathcallTuningConfig>) {
    this.tuning = { ...DEFAULT_OATHCALL_TUNING, ...customTuning };
    this.seedDefaultZonesAndTownships();
  }

  private seedDefaultZonesAndTownships(): void {
    const defaultZones: ZoneDescriptor[] = [
      { id: 'zone_emerald_shoals', name: 'Emerald Shoals Open Field', safety: 'pvp_open' },
      { id: 'zone_sanctuary_harbor', name: 'Sanctuary Harbor Haven', safety: 'town_safe' },
      {
        id: 'zone_sentinel_crater',
        name: 'Hollow Sentinel World-Boss Crater',
        safety: 'contested_boss',
        bossId: 'boss_hollow_sentinel',
      },
      {
        id: 'zone_sunspire_stronghold',
        name: 'Sunspire Township Stronghold',
        safety: 'township_battlefield',
        townshipId: 'township_sunspire',
      },
      {
        id: 'zone_ironvale_stronghold',
        name: 'Ironvale Township Stronghold',
        safety: 'township_battlefield',
        townshipId: 'township_ironvale',
      },
    ];
    for (const z of defaultZones) {
      this.zones.set(z.id, z);
    }

    const defaultTownships: TownshipRecord[] = [
      {
        id: 'township_sunspire',
        name: 'Sunspire Stronghold',
        holdingGuildId: null,
        holdingGuildName: null,
        taxRatePct: 10,
        guildBankGold: 0,
        nextBattleStartSec: 3600,
        nextBattleEndSec: 3600 + this.tuning.townshipBattleDurationSec,
        registeredChallengerGuildIds: [],
        activeBattleId: null,
        mustDefendAtNextBattle: false,
      },
      {
        id: 'township_ironvale',
        name: 'Ironvale Stronghold',
        holdingGuildId: null,
        holdingGuildName: null,
        taxRatePct: 8,
        guildBankGold: 0,
        nextBattleStartSec: 7200,
        nextBattleEndSec: 7200 + this.tuning.townshipBattleDurationSec,
        registeredChallengerGuildIds: [],
        activeBattleId: null,
        mustDefendAtNextBattle: false,
      },
    ];
    for (const t of defaultTownships) {
      this.townships.set(t.id, t);
    }
  }

  private logEvent(
    timestampSec: number,
    category: ServerAuditLogEntry['category'],
    actorId: string,
    summary: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const player = this.players.get(actorId);
    const isStaffActor = Boolean(player?.isStaffAccount);
    this.seqCounter += 1;
    this.auditLog.push({
      seq: this.seqCounter,
      timestampSec,
      category,
      actorId,
      isStaffActor,
      summary,
      metadata: {
        ...metadata,
        staffAccountFlag: isStaffActor ? player?.staffRoleLabel || 'Staff' : false,
      },
    });
  }

  getAuditLog(): readonly ServerAuditLogEntry[] {
    return this.auditLog;
  }

  updateTuning(patch: Partial<OathcallTuningConfig>): OathcallTuningConfig {
    this.tuning = { ...this.tuning, ...patch };
    return { ...this.tuning };
  }

  /**
   * Registers a player on the server.
   * Rule 1.7: Staff and Founder accounts use standard stat/gear formulas with zero boost,
   * and are flagged in server logs.
   */
  registerPlayer(input: {
    id: string;
    name: string;
    level: number;
    gearScore: number;
    position?: { x: number; y: number; z: number };
    zoneId?: string;
    social?: Partial<PlayerSocialGraph>;
    isStaffAccount?: boolean;
    staffRoleLabel?: 'Founder' | 'Staff';
    seasonPvpRank?: number | null;
    pastChampionSeasons?: string[];
  }): AuthoritativePlayerRecord {
    // Standard level-based stat curve — identical for normal, staff, and founder accounts
    const standardHp = 100 + input.level * 12;
    const standardAttack = 15 + input.level * 3;
    const standardDefense = 10 + input.level * 2;

    const record: AuthoritativePlayerRecord = {
      id: input.id,
      name: input.name,
      level: input.level,
      gearScore: input.gearScore,
      baseStats: {
        maxHp: standardHp,
        attack: standardAttack,
        defense: standardDefense,
      },
      position: input.position ? { ...input.position } : { x: 0, y: 0, z: 0 },
      zoneId: input.zoneId || 'zone_emerald_shoals',
      social: {
        partyIds: input.social?.partyIds ? [...input.social.partyIds] : [],
        guildId: input.social?.guildId ?? null,
        guildMemberIds: input.social?.guildMemberIds ? [...input.social.guildMemberIds] : [],
        friendIds: input.social?.friendIds ? [...input.social.friendIds] : [],
      },
      isStaffAccount: Boolean(input.isStaffAccount),
      staffRoleLabel: input.staffRoleLabel,
      activeArrivalShieldUntilSec: 0,
      activeValorBuffPct: 0,
      lastOathcallIssuedAtSec: null,
      seasonPvpRank: input.seasonPvpRank ?? null,
      pastChampionSeasons: input.pastChampionSeasons ? [...input.pastChampionSeasons] : [],
    };

    this.players.set(record.id, record);
    if (record.isStaffAccount) {
      this.logEvent(
        0,
        'STAFF_PARITY_ENFORCED',
        record.id,
        `Staff account ${record.name} (${record.staffRoleLabel || 'Staff'}) registered with standard stats and zero GM PvP powers.`,
        { level: record.level, gearScore: record.gearScore, baseStats: record.baseStats }
      );
    }
    return record;
  }

  getPlayer(id: string): AuthoritativePlayerRecord | undefined {
    return this.players.get(id);
  }

  /**
   * Rule 1.7: Hard-blocks any attempt to invoke GM/admin powers or stat overrides in PvP.
   */
  attemptStaffPvpPower(actorId: string, requestedPower: string, nowSec: number): { allowed: false; reason: string } {
    const reason = 'GM powers, stat boosts, and cooldown overrides are permanently disabled in PvP for all staff and founder accounts.';
    this.logEvent(nowSec, 'STAFF_PARITY_ENFORCED', actorId, `Blocked GM PvP action "${requestedPower}": ${reason}`, {
      requestedPower,
    });
    return { allowed: false, reason };
  }

  /**
   * Rule 1.1, 1.4, 1.6 & Kid-Safe Rule:
   * Records a player-vs-player knockout (a clean flash of light and respawn, zero blood/gore).
   * Players far below their attacker lose nothing (0 XP, 0 gold, 0 items).
   */
  recordPvpKnockout(
    attackerId: string,
    victimId: string,
    nowSec: number
  ): { ok: true; mark: OathcallMark } | { ok: false; reason: string } {
    const attacker = this.players.get(attackerId);
    const victim = this.players.get(victimId);
    if (!attacker || !victim) {
      return { ok: false, reason: 'Unknown attacker or victim.' };
    }
    if (attackerId === victimId) {
      return { ok: false, reason: 'Self-knockout cannot generate an Oathcall mark.' };
    }

    const zone = this.zones.get(victim.zoneId);
    if (!zone || zone.safety === 'town_safe') {
      this.logEvent(nowSec, 'OATHCALL_REJECTED', victimId, 'Knockout in safe zone cannot create Oathcall mark.', {
        zoneId: victim.zoneId,
      });
      return { ok: false, reason: 'Zone is not PvP-enabled.' };
    }

    // Rule 1.6: One active mark per attacker per victim
    const pairKey = `${victimId}::${attackerId}`;
    const existing = this.activeMarksByPair.get(pairKey);
    if (existing && !existing.consumed && existing.expiresAtSec > nowSec) {
      this.logEvent(
        nowSec,
        'OATHCALL_REJECTED',
        victimId,
        `Active Oathcall mark already exists on ${attacker.name} for ${victim.name}.`,
        { existingMarkId: existing.markId }
      );
      return { ok: false, reason: 'An active Oathcall mark already exists for this attacker and victim.' };
    }

    // Rule 1.6: Capped re-marks between the same players within rolling window
    const history = (this.pairRemarkHistory.get(pairKey) || []).filter(
      (t) => nowSec - t <= this.tuning.pairRemarkWindowSec
    );
    if (history.length >= this.tuning.maxRemarksPerPairWindow) {
      this.logEvent(
        nowSec,
        'OATHCALL_REJECTED',
        victimId,
        `Re-mark cap (${this.tuning.maxRemarksPerPairWindow}) reached between ${victim.name} and ${attacker.name}.`,
        { windowSec: this.tuning.pairRemarkWindowSec }
      );
      return {
        ok: false,
        reason: `Maximum re-marks (${this.tuning.maxRemarksPerPairWindow}) reached between these players in the current window.`,
      };
    }

    // Rule 1.4: Bully Rule evaluation
    const levelDelta = attacker.level - victim.level;
    const gearDelta = attacker.gearScore - victim.gearScore;
    const isBullyMark =
      levelDelta >= this.tuning.bullyLevelDeltaThreshold ||
      gearDelta >= this.tuning.bullyGearDeltaThreshold;

    const durationSec = isBullyMark
      ? Math.round(this.tuning.baseMarkDurationSec * this.tuning.bullyMarkDurationMultiplier)
      : this.tuning.baseMarkDurationSec;

    const allyValorBuffPct = isBullyMark ? this.tuning.bullyAllyValorBuffPct : 0;

    const mark: OathcallMark = {
      markId: `oath_${victimId}_${attackerId}_${Math.round(nowSec * 1000)}`,
      victimId,
      victimName: victim.name,
      attackerId,
      attackerName: attacker.name,
      createdAtSec: nowSec,
      expiresAtSec: nowSec + durationSec,
      zoneId: victim.zoneId,
      isTownshipBattle: zone.safety === 'township_battlefield',
      isBullyMark,
      levelDelta,
      gearDelta,
      allyValorBuffPct,
      victimPenaltyApplied: {
        xpLost: 0,
        goldLost: 0,
        itemsLost: 0,
        visualEffect: 'LIGHT_FLASH_RESPAWN',
      },
      consumed: false,
    };

    history.push(nowSec);
    this.pairRemarkHistory.set(pairKey, history);
    this.activeMarksByPair.set(pairKey, mark);

    this.logEvent(
      nowSec,
      'OATHCALL_MARK_CREATED',
      victimId,
      `Oathcall mark placed on ${attacker.name} for ${durationSec}s (Bully=${isBullyMark}, ValorBuff=+${allyValorBuffPct}%).`,
      {
        markId: mark.markId,
        attackerId,
        victimId,
        isBullyMark,
        durationSec,
        allyValorBuffPct,
        isTownshipBattle: mark.isTownshipBattle,
      }
    );

    return { ok: true, mark };
  }

  /**
   * Rule 1.2, 1.3, 1.4, 1.6 & Kid-Safe Rule:
   * Victim answers an active Oathcall mark by selecting up to `maxAlliesPerCall` (5) trusted allies
   * from their Party, Guild, or Friends list. Allies travel to the attacker's location (never to a
   * safe zone and never to the victim's own location), receive a 2-second arrival shield, and trigger
   * the attacker's incoming warning banner.
   */
  answerOathcall(
    victimId: string,
    attackerId: string,
    chosenAllyIds: string[],
    nowSec: number
  ): { ok: true; arrival: OathcallArrivalEvent } | { ok: false; reason: string } {
    const victim = this.players.get(victimId);
    const attacker = this.players.get(attackerId);
    if (!victim || !attacker) {
      return { ok: false, reason: 'Unknown victim or attacker.' };
    }

    const pairKey = `${victimId}::${attackerId}`;
    const mark = this.activeMarksByPair.get(pairKey);
    if (!mark || mark.consumed) {
      return { ok: false, reason: 'No active Oathcall mark found for this attacker.' };
    }
    if (nowSec > mark.expiresAtSec) {
      return { ok: false, reason: 'Oathcall mark has expired.' };
    }

    // Rule 1.6: Cooldown on calling
    if (
      victim.lastOathcallIssuedAtSec !== null &&
      nowSec - victim.lastOathcallIssuedAtSec < this.tuning.callCooldownSec
    ) {
      this.logEvent(nowSec, 'OATHCALL_REJECTED', victimId, 'Oathcall is on cooldown.', {
        cooldownRemainingSec: this.tuning.callCooldownSec - (nowSec - victim.lastOathcallIssuedAtSec),
      });
      return { ok: false, reason: 'Oathcall is still on cooldown.' };
    }

    // Rule 1.2: Ally count cap (1 .. maxAlliesPerCall)
    const uniqueAllies = Array.from(new Set(chosenAllyIds)).filter((id) => id !== victimId && id !== attackerId);
    if (uniqueAllies.length === 0) {
      return { ok: false, reason: 'Must select at least 1 ally to answer the Oathcall.' };
    }
    if (uniqueAllies.length > this.tuning.maxAlliesPerCall) {
      this.logEvent(
        nowSec,
        'OATHCALL_REJECTED',
        victimId,
        `Selected ${uniqueAllies.length} allies, exceeding max cap of ${this.tuning.maxAlliesPerCall}.`,
        { requestedCount: uniqueAllies.length }
      );
      return {
        ok: false,
        reason: `Cannot summon more than ${this.tuning.maxAlliesPerCall} allies per Oathcall.`,
      };
    }

    // Rule 1.2: Only people the victim chooses from their own Party, Guild, or Friends list (never strangers)
    const trustedSet = new Set<string>([
      ...victim.social.partyIds,
      ...victim.social.guildMemberIds,
      ...victim.social.friendIds,
    ]);
    for (const allyId of uniqueAllies) {
      if (!trustedSet.has(allyId)) {
        this.logEvent(
          nowSec,
          'OATHCALL_REJECTED',
          victimId,
          `Rejected stranger ${allyId}: not in victim's party, guild, or friends list.`,
          { strangerId: allyId }
        );
        return {
          ok: false,
          reason: `Ally ${allyId} is not in the victim's party, guild, or friends list. Strangers cannot answer Oathcall.`,
        };
      }
      if (!this.players.has(allyId)) {
        return { ok: false, reason: `Ally ${allyId} is not online.` };
      }
    }

    // Rule 1.3: Never travel into towns or safe zones
    const attackerZone = this.zones.get(attacker.zoneId);
    if (!attackerZone || attackerZone.safety === 'town_safe') {
      this.logEvent(
        nowSec,
        'OATHCALL_REJECTED',
        victimId,
        `Cannot answer Oathcall while ${attacker.name} is inside safe zone ${attacker.zoneId}.`,
        { attackerZoneId: attacker.zoneId }
      );
      return {
        ok: false,
        reason: 'Attacker is currently in a town or safe zone; Oathcall arrival is blocked in safe zones.',
      };
    }

    // Execute arrival at the attacker's area (never the victim's location)
    const arrivingNames: string[] = [];
    for (let i = 0; i < uniqueAllies.length; i++) {
      const ally = this.players.get(uniqueAllies[i])!;
      const angle = (i / uniqueAllies.length) * Math.PI * 2;
      ally.zoneId = attacker.zoneId;
      ally.position = {
        x: Number((attacker.position.x + Math.cos(angle) * 2.5).toFixed(2)),
        y: attacker.position.y,
        z: Number((attacker.position.z + Math.sin(angle) * 2.5).toFixed(2)),
      };
      ally.activeArrivalShieldUntilSec = nowSec + this.tuning.arrivalShieldDurationSec;
      ally.activeValorBuffPct = mark.allyValorBuffPct;
      arrivingNames.push(ally.name);
    }

    mark.consumed = true;
    victim.lastOathcallIssuedAtSec = nowSec;

    const arrival: OathcallArrivalEvent = {
      eventId: `oath_arr_${Math.round(nowSec * 1000)}`,
      markId: mark.markId,
      victimId,
      attackerId,
      arrivingAllyIds: uniqueAllies,
      arrivingAllyNames: arrivingNames,
      destination: {
        x: attacker.position.x,
        y: attacker.position.y,
        z: attacker.position.z,
        zoneId: attacker.zoneId,
      },
      arrivalShieldSec: this.tuning.arrivalShieldDurationSec,
      valorBuffPct: mark.allyValorBuffPct,
      attackerWarningBanner: `Oathcall answered: ${uniqueAllies.length} incoming`,
      timestampSec: nowSec,
    };

    this.logEvent(
      nowSec,
      'OATHCALL_ANSWERED',
      victimId,
      `${victim.name}'s Oathcall answered by ${arrivingNames.join(', ')} -> "${arrival.attackerWarningBanner}".`,
      {
        markId: mark.markId,
        attackerId,
        arrivingAllyIds: uniqueAllies,
        arrivalShieldSec: arrival.arrivalShieldSec,
        valorBuffPct: arrival.valorBuffPct,
      }
    );

    return { ok: true, arrival };
  }

  /**
   * Rule 1.5: Contested World-Boss Fight Return.
   * A wiped team can Oathcall back to the contested boss area once per fight (with tunable cooldown).
   */
  triggerBossFightPartyOathcall(
    callerId: string,
    bossZoneId: string,
    fightInstanceId: string,
    bossPosition: { x: number; y: number; z: number },
    nowSec: number
  ): { ok: true; event: ContestedBossOathcallEvent } | { ok: false; reason: string } {
    const caller = this.players.get(callerId);
    if (!caller) {
      return { ok: false, reason: 'Unknown caller.' };
    }
    const zone = this.zones.get(bossZoneId);
    if (!zone || zone.safety !== 'contested_boss' || !zone.bossId) {
      return { ok: false, reason: 'Target zone is not a contested world-boss area.' };
    }

    const fightKey = `${fightInstanceId}::${callerId}`;
    if (this.bossFightReturnUsed.has(fightKey)) {
      this.logEvent(
        nowSec,
        'OATHCALL_REJECTED',
        callerId,
        `Team already used their one Oathcall return for boss fight ${fightInstanceId}.`,
        { fightInstanceId }
      );
      return { ok: false, reason: 'Your team has already used its Oathcall return for this boss fight.' };
    }

    const lastUsed = this.bossReturnCooldownByParty.get(callerId);
    if (lastUsed !== undefined && nowSec - lastUsed < this.tuning.bossFightReturnCooldownSec) {
      return { ok: false, reason: 'Contested boss Oathcall return is on cooldown.' };
    }

    const partyIds = Array.from(new Set([callerId, ...caller.social.partyIds])).slice(
      0,
      this.tuning.maxAlliesPerCall + 1
    );
    for (const pid of partyIds) {
      const member = this.players.get(pid);
      if (member) {
        member.zoneId = bossZoneId;
        member.position = { ...bossPosition };
        member.activeArrivalShieldUntilSec = nowSec + this.tuning.arrivalShieldDurationSec;
      }
    }

    this.bossFightReturnUsed.add(fightKey);
    this.bossReturnCooldownByParty.set(callerId, nowSec);

    const event: ContestedBossOathcallEvent = {
      eventId: `boss_return_${Math.round(nowSec * 1000)}`,
      bossId: zone.bossId,
      fightInstanceId,
      callerId,
      returnedPartyIds: partyIds,
      arrivalShieldSec: this.tuning.arrivalShieldDurationSec,
      destination: { ...bossPosition, zoneId: bossZoneId },
      timestampSec: nowSec,
    };

    this.logEvent(
      nowSec,
      'OATHCALL_BOSS_RETURN',
      callerId,
      `Party (${partyIds.length} members) Oathcalled back to contested world boss ${zone.bossId}.`,
      { fightInstanceId, returnedPartyIds: partyIds }
    );

    return { ok: true, event };
  }

  // ===========================================================================
  // PART 2 — TOWNSHIPS (Scheduled Battles, 33% Gold-Only Tax Cap, Mandatory Defense)
  // ===========================================================================

  getTownship(townshipId: string): TownshipRecord | undefined {
    return this.townships.get(townshipId);
  }

  /**
   * Rule 2.1: Guilds sign up in advance before the scheduled battle start time.
   */
  registerGuildForTownshipBattle(
    townshipId: string,
    guildId: string,
    actorId: string,
    nowSec: number
  ): { ok: true; township: TownshipRecord } | { ok: false; reason: string } {
    const t = this.townships.get(townshipId);
    if (!t) return { ok: false, reason: 'Unknown township.' };
    if (nowSec >= t.nextBattleStartSec) {
      return { ok: false, reason: 'Advance sign-up window has closed for this scheduled battle.' };
    }
    if (!t.registeredChallengerGuildIds.includes(guildId)) {
      t.registeredChallengerGuildIds.push(guildId);
    }
    this.logEvent(nowSec, 'TOWNSHIP_SIGNUP', actorId, `Guild ${guildId} signed up for ${t.name} battle.`, {
      townshipId,
      guildId,
      battleStartSec: t.nextBattleStartSec,
    });
    return { ok: true, township: { ...t } };
  }

  /**
   * Rule 2.1: Battles run only at their fixed scheduled time window.
   */
  startScheduledTownshipBattle(
    townshipId: string,
    nowSec: number
  ): { ok: true; battleId: string } | { ok: false; reason: string } {
    const t = this.townships.get(townshipId);
    if (!t) return { ok: false, reason: 'Unknown township.' };
    if (nowSec < t.nextBattleStartSec || nowSec >= t.nextBattleEndSec) {
      return { ok: false, reason: 'Township battle can only start inside its fixed scheduled window.' };
    }
    t.activeBattleId = `battle_${townshipId}_${t.nextBattleStartSec}`;
    this.logEvent(nowSec, 'TOWNSHIP_BATTLE_STARTED', 'system', `Scheduled battle started for ${t.name}.`, {
      townshipId,
      battleId: t.activeBattleId,
    });
    return { ok: true, battleId: t.activeBattleId };
  }

  /**
   * Rule 2.1, 2.3 & Part 3: Winning a scheduled township battle transfers control,
   * schedules the mandatory next defense (no permanent holds), and grants earned-only Champion Regalia.
   */
  concludeTownshipBattle(
    townshipId: string,
    winningGuildId: string,
    winningGuildName: string,
    winningMemberIds: string[],
    seasonId: string,
    nowSec: number
  ): { ok: true; township: TownshipRecord; regaliaGrants: ChampionRegaliaGrant[] } | { ok: false; reason: string } {
    const t = this.townships.get(townshipId);
    if (!t) return { ok: false, reason: 'Unknown township.' };
    if (!t.activeBattleId) {
      return { ok: false, reason: 'No active scheduled battle is running for this township.' };
    }
    const isHolderDefending = t.holdingGuildId === winningGuildId;
    if (!isHolderDefending && !t.registeredChallengerGuildIds.includes(winningGuildId)) {
      return { ok: false, reason: 'Winning guild was not registered in advance for this township battle.' };
    }

    t.holdingGuildId = winningGuildId;
    t.holdingGuildName = winningGuildName;
    t.activeBattleId = null;
    t.registeredChallengerGuildIds = [];
    // Rule 2.3: Holders must defend at the next scheduled battle (no permanent holds)
    t.mustDefendAtNextBattle = true;
    t.nextBattleStartSec = nowSec + 86400; // Next scheduled cycle
    t.nextBattleEndSec = t.nextBattleStartSec + this.tuning.townshipBattleDurationSec;

    const grants: ChampionRegaliaGrant[] = [];
    for (const memberId of winningMemberIds) {
      const grant = this.grantEarnedChampionRegalia(
        memberId,
        seasonId,
        'township_battle_winner',
        `Archon Champion of ${t.name}`,
        nowSec
      );
      if (grant) grants.push(grant);
    }

    this.logEvent(
      nowSec,
      'TOWNSHIP_BATTLE_WON',
      winningMemberIds[0] || 'system',
      `Guild ${winningGuildName} won ${t.name}; mandatory defense scheduled at t=${t.nextBattleStartSec}s.`,
      { townshipId, winningGuildId, nextBattleStartSec: t.nextBattleStartSec }
    );

    return { ok: true, township: { ...t }, regaliaGrants: grants };
  }

  /**
   * Rule 2.2: Holding guild sets an in-game tax on trade in that township, capped at 33% (tunable).
   */
  setTownshipTaxRate(
    townshipId: string,
    guildId: string,
    requestedTaxPct: number,
    actorId: string,
    nowSec: number
  ): { ok: true; taxRatePct: number } | { ok: false; reason: string } {
    const t = this.townships.get(townshipId);
    if (!t) return { ok: false, reason: 'Unknown township.' };
    if (t.holdingGuildId !== guildId) {
      return { ok: false, reason: 'Only the holding guild may set the township tax rate.' };
    }
    if (requestedTaxPct < 0 || requestedTaxPct > this.tuning.townshipMaxTaxRatePct) {
      return {
        ok: false,
        reason: `Township tax rate must be between 0% and ${this.tuning.townshipMaxTaxRatePct}%.`,
      };
    }

    t.taxRatePct = requestedTaxPct;
    this.logEvent(
      nowSec,
      'TOWNSHIP_TAX_UPDATED',
      actorId,
      `Set ${t.name} trade tax to ${requestedTaxPct}% (cap ${this.tuning.townshipMaxTaxRatePct}%).`,
      { townshipId, guildId, taxRatePct: requestedTaxPct }
    );
    return { ok: true, taxRatePct: t.taxRatePct };
  }

  /**
   * Rule 2.2: Settles an in-game township trade and routes tax strictly to the holding guild's bank in in-game gold.
   * Rejects any real-money or token currency.
   */
  settleTownshipTrade(
    townshipId: string,
    grossAmount: number,
    currency: string,
    actorId: string,
    nowSec: number
  ): { ok: true; receipt: TownshipTradeReceipt } | { ok: false; reason: string } {
    if (currency !== 'IN_GAME_GOLD') {
      return {
        ok: false,
        reason: 'Township trade and taxes operate strictly in IN_GAME_GOLD — never real money or tokens.',
      };
    }
    const t = this.townships.get(townshipId);
    if (!t) return { ok: false, reason: 'Unknown township.' };
    if (grossAmount <= 0) return { ok: false, reason: 'Trade amount must be positive.' };

    const effectiveRate = t.holdingGuildId ? Math.min(this.tuning.townshipMaxTaxRatePct, t.taxRatePct) : 0;
    const taxGold = Math.floor((grossAmount * effectiveRate) / 100);
    const sellerNet = grossAmount - taxGold;
    t.guildBankGold += taxGold;

    const receipt: TownshipTradeReceipt = {
      townshipId,
      grossGold: grossAmount,
      taxRatePct: effectiveRate,
      taxGoldCollected: taxGold,
      sellerNetGold: sellerNet,
      guildBankGoldAfter: t.guildBankGold,
      currency: 'IN_GAME_GOLD_ONLY',
    };

    this.logEvent(
      nowSec,
      'TOWNSHIP_TRADE_TAXED',
      actorId,
      `Trade of ${grossAmount} gold in ${t.name}: ${taxGold} gold tax -> guild bank (${t.guildBankGold} total).`,
      { ...receipt }
    );
    return { ok: true, receipt };
  }

  // ===========================================================================
  // PART 3 — CHAMPION REGALIA (Earned-Only, Zero Stats, Seasonal + Past Badge)
  // ===========================================================================

  grantEarnedChampionRegalia(
    playerId: string,
    seasonId: string,
    source: ChampionRegaliaGrant['source'],
    activeTitle: string,
    nowSec: number
  ): ChampionRegaliaGrant | null {
    const player = this.players.get(playerId);
    if (!player) return null;

    if (!player.pastChampionSeasons.includes(seasonId)) {
      player.pastChampionSeasons.push(seasonId);
    }

    const grant: ChampionRegaliaGrant = {
      playerId,
      playerName: player.name,
      seasonId,
      source,
      activeTitle,
      armorSetId: 'dream_sovereign_aether_plate',
      floorSigilId: 'blue_flame_holographic_sigil',
      isCurrentlyActive: true,
      hasPermanentPastChampionBadge: true,
      pastChampionSeasons: [...player.pastChampionSeasons],
      tradeable: false,
      mallPurchasable: false,
      tokenReward: false,
      combatStats: {
        bonusAttack: 0,
        bonusDefense: 0,
        bonusHp: 0,
        bonusSpeed: 0,
      },
    };

    this.regaliaByPlayer.set(playerId, grant);
    this.logEvent(
      nowSec,
      'REGALIA_GRANTED',
      playerId,
      `Granted earned-only Champion Regalia (${activeTitle}) to ${player.name} with 0 combat stats.`,
      { seasonId, source }
    );
    return grant;
  }

  /**
   * Rule 3.1: Blocks any attempt to buy Champion Regalia in the Mall, trade it, or claim it via tokens.
   */
  attemptInvalidRegaliaAcquisition(
    playerId: string,
    method: 'mall_purchase' | 'player_trade' | 'token_claim',
    nowSec: number
  ): { allowed: false; reason: string } {
    const reason =
      'Champion Regalia is earned-only (winning township guild or top seasonal PvP rank) — never sold in the mall, never tradeable, and never a token reward.';
    this.logEvent(nowSec, 'REGALIA_REJECTED', playerId, `Blocked ${method} for Champion Regalia.`, { method });
    return { allowed: false, reason };
  }

  /**
   * Rule 3.4: Rotates the season. Champions who no longer hold a current title lose the active full floor sigil
   * but retain the permanent compact Past Champion badge.
   */
  rotateSeason(newSeasonId: string, newTopPvpPlayerIds: string[], nowSec: number): void {
    const newTopSet = new Set(newTopPvpPlayerIds);
    for (const [playerId, grant] of this.regaliaByPlayer.entries()) {
      if (newTopSet.has(playerId)) {
        grant.seasonId = newSeasonId;
        grant.isCurrentlyActive = true;
        if (!grant.pastChampionSeasons.includes(newSeasonId)) {
          grant.pastChampionSeasons.push(newSeasonId);
        }
      } else {
        grant.isCurrentlyActive = false;
        grant.hasPermanentPastChampionBadge = true;
      }
    }
    for (const pid of newTopPvpPlayerIds) {
      if (!this.regaliaByPlayer.has(pid)) {
        this.grantEarnedChampionRegalia(pid, newSeasonId, 'top_pvp_rank', `Season ${newSeasonId} Vanguard`, nowSec);
      }
    }
  }

  getRegalia(playerId: string): ChampionRegaliaGrant | undefined {
    return this.regaliaByPlayer.get(playerId);
  }
}

export interface OathcallDemoState {
  active: boolean;
  phase: 1 | 2 | 3 | 4;
  phaseTitle: string;
  phaseSubtitle: string;
  elapsedSec: number;
  victimName: string;
  victimLevel: number;
  victimGear: number;
  attackerName: string;
  attackerLevel: number;
  attackerGear: number;
  attackerHpPct: number;
  isBullyMark: boolean;
  markDurationLabel: string;
  valorBuffPct: number;
  warningBannerText: string | null;
  arrivalShieldRemainingSec: number;
  summonedAllies: Array<{
    id: string;
    name: string;
    level: number;
    position: [number, number, number];
    yaw: number;
    hasShield: boolean;
  }>;
  knockoutFlashAlpha: number;
  championRegaliaActive: boolean;
  townshipSummary: {
    name: string;
    holdingGuild: string;
    taxRatePct: number;
    guildBankGold: number;
    nextBattleWindow: string;
  };
}

