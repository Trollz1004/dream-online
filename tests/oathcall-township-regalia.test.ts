/**
 * DREAM Engine — Server-Authoritative Tests for Oathcall, Townships, Champion Regalia,
 * Movable PvP HUD, and Shift+Right-Click Tactical Map Ping System.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OathcallTownshipServer,
  DEFAULT_OATHCALL_TUNING,
} from '../src/engine/combat/oathcall-system.ts';
import { PvpTacticalCoordinator } from '../src/engine/combat/pvp-tactical-ping.ts';

test('Oathcall Rule 1 & 4: Bully knockout vs Equal knockout timers, valor buff, and zero-loss kid-safe protection', () => {
  const server = new OathcallTownshipServer();

  // Register high-level attacker (Level 85, Gear 480)
  server.registerPlayer({
    id: 'attacker_high',
    name: 'Valkor',
    level: 85,
    gearScore: 480,
    position: { x: 14, y: 0, z: -12 },
    zoneId: 'zone_emerald_shoals',
  });

  // Register equal opponent (Level 82, Gear 450)
  server.registerPlayer({
    id: 'victim_equal',
    name: 'Kael',
    level: 82,
    gearScore: 450,
    position: { x: 12, y: 0, z: -10 },
    zoneId: 'zone_emerald_shoals',
  });

  // Register low-level kid/newcomer (Level 24, Gear 110)
  server.registerPlayer({
    id: 'victim_low',
    name: 'Pip',
    level: 24,
    gearScore: 110,
    position: { x: 10, y: 0, z: -8 },
    zoneId: 'zone_emerald_shoals',
    social: {
      guildId: 'guild_dawn',
      guildMemberIds: ['ally_1', 'ally_2', 'ally_3', 'ally_4', 'ally_5', 'ally_6'],
      partyIds: ['ally_1', 'ally_2'],
      friendIds: ['ally_3'],
    },
  });

  // 1. Equal fight -> plain 10-minute (600s) mark and 0% valor buff
  const equalRes = server.recordPvpKnockout('attacker_high', 'victim_equal', 100);
  assert.equal(equalRes.ok, true);
  if (equalRes.ok) {
    assert.equal(equalRes.mark.isBullyMark, false);
    assert.equal(equalRes.mark.expiresAtSec - equalRes.mark.createdAtSec, DEFAULT_OATHCALL_TUNING.baseMarkDurationSec);
    assert.equal(equalRes.mark.allyValorBuffPct, 0);
  }

  // 2. Bully fight -> extended 17.5-minute (1050s) mark, +18% ally valor buff, and 0 XP/gold/item loss with light-flash respawn
  const bullyRes = server.recordPvpKnockout('attacker_high', 'victim_low', 100);
  assert.equal(bullyRes.ok, true);
  if (bullyRes.ok) {
    assert.equal(bullyRes.mark.isBullyMark, true);
    assert.equal(
      bullyRes.mark.expiresAtSec - bullyRes.mark.createdAtSec,
      Math.round(DEFAULT_OATHCALL_TUNING.baseMarkDurationSec * DEFAULT_OATHCALL_TUNING.bullyMarkDurationMultiplier)
    );
    assert.equal(bullyRes.mark.allyValorBuffPct, DEFAULT_OATHCALL_TUNING.bullyAllyValorBuffPct);
    assert.deepEqual(bullyRes.mark.victimPenaltyApplied, {
      xpLost: 0,
      goldLost: 0,
      itemsLost: 0,
      visualEffect: 'LIGHT_FLASH_RESPAWN',
    });
  }
});

test('Oathcall Rule 2 & 3: Ally cap (max 5), trusted-only check (never strangers), safe-zone block, 2s arrival shield, and warning banner', () => {
  const server = new OathcallTownshipServer();

  server.registerPlayer({
    id: 'attacker_bully',
    name: 'Dread',
    level: 90,
    gearScore: 500,
    position: { x: 25, y: 0, z: -18 },
    zoneId: 'zone_emerald_shoals',
  });

  server.registerPlayer({
    id: 'victim_kid',
    name: 'Nova',
    level: 20,
    gearScore: 95,
    position: { x: -40, y: 0, z: 30 },
    zoneId: 'zone_emerald_shoals',
    social: {
      partyIds: ['ally_1', 'ally_2'],
      guildId: 'guild_guardians',
      guildMemberIds: ['ally_3', 'ally_4', 'ally_5', 'ally_6'],
      friendIds: ['ally_1'],
    },
  });

  for (let i = 1; i <= 6; i++) {
    server.registerPlayer({
      id: `ally_${i}`,
      name: `Guardian_${i}`,
      level: 88,
      gearScore: 490,
    });
  }
  server.registerPlayer({
    id: 'stranger_99',
    name: 'RandomStranger',
    level: 90,
    gearScore: 500,
  });

  const ko = server.recordPvpKnockout('attacker_bully', 'victim_kid', 50);
  assert.equal(ko.ok, true);

  // Reject > 5 allies
  const overCap = server.answerOathcall(
    'victim_kid',
    'attacker_bully',
    ['ally_1', 'ally_2', 'ally_3', 'ally_4', 'ally_5', 'ally_6'],
    55
  );
  assert.equal(overCap.ok, false);

  // Reject stranger not in victim's party, guild, or friends list
  const strangerCall = server.answerOathcall(
    'victim_kid',
    'attacker_bully',
    ['ally_1', 'stranger_99'],
    55
  );
  assert.equal(strangerCall.ok, false);

  // Reject arrival if attacker fled into a safe town
  server.getPlayer('attacker_bully')!.zoneId = 'zone_sanctuary_harbor';
  const safeZoneCall = server.answerOathcall(
    'victim_kid',
    'attacker_bully',
    ['ally_1', 'ally_2', 'ally_3'],
    56
  );
  assert.equal(safeZoneCall.ok, false);

  // Move attacker back to PvP field and answer with 3 trusted allies
  server.getPlayer('attacker_bully')!.zoneId = 'zone_emerald_shoals';
  const validCall = server.answerOathcall(
    'victim_kid',
    'attacker_bully',
    ['ally_1', 'ally_2', 'ally_3'],
    60
  );
  assert.equal(validCall.ok, true);
  if (validCall.ok) {
    assert.equal(validCall.arrival.attackerWarningBanner, 'Oathcall answered: 3 incoming');
    assert.equal(validCall.arrival.arrivalShieldSec, 2.0);
    assert.equal(validCall.arrival.valorBuffPct, 18);
    // Allies arrive at the attacker's area (x=25, z=-18), NEVER at victim_kid's respawn (-40, 30)
    assert.equal(validCall.arrival.destination.x, 25);
    assert.equal(validCall.arrival.destination.z, -18);
    const ally1 = server.getPlayer('ally_1')!;
    assert.equal(ally1.activeArrivalShieldUntilSec, 62);
    assert.equal(ally1.activeValorBuffPct, 18);
  }
});

test('Oathcall Rule 5, 6 & 7: Contested boss return once per fight, anti-abuse pair remark caps, and staff account parity', () => {
  const server = new OathcallTownshipServer();

  // Rule 7: Founder & Staff accounts get identical level-based stats as normal accounts and are flagged in logs
  const founder = server.registerPlayer({
    id: 'joshua_founder',
    name: 'Joshua',
    level: 60,
    gearScore: 350,
    isStaffAccount: true,
    staffRoleLabel: 'Founder',
    zoneId: 'zone_sentinel_crater',
    social: { partyIds: ['p2', 'p3'] },
  });
  const normalPeer = server.registerPlayer({
    id: 'normal_peer',
    name: 'PlayerTwo',
    level: 60,
    gearScore: 350,
    isStaffAccount: false,
    zoneId: 'zone_sentinel_crater',
  });
  server.registerPlayer({ id: 'p2', name: 'PartyMember2', level: 60, gearScore: 350 });
  server.registerPlayer({ id: 'p3', name: 'PartyMember3', level: 60, gearScore: 350 });

  assert.deepEqual(founder.baseStats, normalPeer.baseStats);

  // Attempting any GM power in PvP is rejected and logged
  const gmAttempt = server.attemptStaffPvpPower('joshua_founder', 'god_mode_smite', 120);
  assert.equal(gmAttempt.allowed, false);

  // Rule 5: Contested world-boss fight return works once per fight instance
  const bossReturn1 = server.triggerBossFightPartyOathcall(
    'joshua_founder',
    'zone_sentinel_crater',
    'fight_instance_01',
    { x: 0, y: 0, z: -10 },
    200
  );
  assert.equal(bossReturn1.ok, true);

  const bossReturnDuplicate = server.triggerBossFightPartyOathcall(
    'joshua_founder',
    'zone_sentinel_crater',
    'fight_instance_01',
    { x: 0, y: 0, z: -10 },
    1200
  );
  assert.equal(bossReturnDuplicate.ok, false);

  // Rule 6: Anti-abuse — only 1 active mark per pair, and max 3 remarks per 30-min window
  const m1 = server.recordPvpKnockout('normal_peer', 'joshua_founder', 300);
  assert.equal(m1.ok, true);
  const mDuplicateActive = server.recordPvpKnockout('normal_peer', 'joshua_founder', 310);
  assert.equal(mDuplicateActive.ok, false);

  // Consume marks inside the 1800s (30-min) window, then verify 4th mark in the same window is blocked
  const ans1 = server.answerOathcall('joshua_founder', 'normal_peer', ['p2'], 320);
  assert.equal(ans1.ok, true);

  const m2 = server.recordPvpKnockout('normal_peer', 'joshua_founder', 600);
  assert.equal(m2.ok, true);
  const ans2 = server.answerOathcall('joshua_founder', 'normal_peer', ['p2'], 620);
  assert.equal(ans2.ok, true);

  const m3 = server.recordPvpKnockout('normal_peer', 'joshua_founder', 900);
  assert.equal(m3.ok, true);
  const ans3 = server.answerOathcall('joshua_founder', 'normal_peer', ['p2'], 920);
  assert.equal(ans3.ok, true);

  // Now 3 marks have been created at t=300, 600, 900. At t=1200 (all 3 within the 1800s rolling window), a 4th mark is blocked:
  const m4Blocked = server.recordPvpKnockout('normal_peer', 'joshua_founder', 1200);
  assert.equal(m4Blocked.ok, false);

  const staffLogs = server.getAuditLog().filter((e) => e.isStaffActor);
  assert.ok(staffLogs.length >= 3);
});

test('Part 2 & Part 3: Townships (scheduled battles, 33% in-game gold tax cap, mandatory defense, Oathcall inside battle) & Earned-Only Zero-Stat Champion Regalia', () => {
  const server = new OathcallTownshipServer();

  server.registerPlayer({
    id: 'champ_1',
    name: 'xTheseus',
    level: 95,
    gearScore: 520,
    zoneId: 'zone_sunspire_stronghold',
    social: { guildId: 'guild_famous', guildMemberIds: ['champ_2'] },
  });
  server.registerPlayer({
    id: 'champ_2',
    name: 'FingFang',
    level: 95,
    gearScore: 520,
    zoneId: 'zone_sunspire_stronghold',
    social: { guildId: 'guild_famous', guildMemberIds: ['champ_1'] },
  });
  server.registerPlayer({
    id: 'rival_1',
    name: 'RivalArchon',
    level: 95,
    gearScore: 520,
    zoneId: 'zone_sunspire_stronghold',
  });

  // Cannot start battle before scheduled window (3600s)
  const earlyStart = server.startScheduledTownshipBattle('township_sunspire', 1000);
  assert.equal(earlyStart.ok, false);

  // Register guild in advance
  const signup = server.registerGuildForTownshipBattle('township_sunspire', 'guild_famous', 'champ_1', 1200);
  assert.equal(signup.ok, true);

  // Start battle at scheduled time (3600s)
  const started = server.startScheduledTownshipBattle('township_sunspire', 3600);
  assert.equal(started.ok, true);

  // Rule 2.4: Oathcall works inside township battles
  const battleKo = server.recordPvpKnockout('rival_1', 'champ_1', 3700);
  assert.equal(battleKo.ok, true);
  if (battleKo.ok) {
    assert.equal(battleKo.mark.isTownshipBattle, true);
  }
  const battleCall = server.answerOathcall('champ_1', 'rival_1', ['champ_2'], 3710);
  assert.equal(battleCall.ok, true);

  // Win township battle -> grants earned-only Champion Regalia and sets mustDefendAtNextBattle = true
  const victory = server.concludeTownshipBattle(
    'township_sunspire',
    'guild_famous',
    'Famous',
    ['champ_1', 'champ_2'],
    'S1',
    4500
  );
  assert.equal(victory.ok, true);
  if (victory.ok) {
    assert.equal(victory.township.holdingGuildId, 'guild_famous');
    assert.equal(victory.township.mustDefendAtNextBattle, true);
    assert.equal(victory.regaliaGrants.length, 2);
  }

  // Rule 2.2: Tax rate capped at 33% and strictly in-game gold only
  const overTax = server.setTownshipTaxRate('township_sunspire', 'guild_famous', 45, 'champ_1', 4600);
  assert.equal(overTax.ok, false);

  const maxTax = server.setTownshipTaxRate('township_sunspire', 'guild_famous', 33, 'champ_1', 4605);
  assert.equal(maxTax.ok, true);

  const badCurrency = server.settleTownshipTrade('township_sunspire', 1000, 'REAL_MONEY_USD', 'champ_1', 4610);
  assert.equal(badCurrency.ok, false);

  const tokenCurrency = server.settleTownshipTrade('township_sunspire', 1000, 'SOLANA_TOKEN', 'champ_1', 4612);
  assert.equal(tokenCurrency.ok, false);

  const goldTrade = server.settleTownshipTrade('township_sunspire', 1000, 'IN_GAME_GOLD', 'champ_1', 4615);
  assert.equal(goldTrade.ok, true);
  if (goldTrade.ok) {
    assert.equal(goldTrade.receipt.taxGoldCollected, 330);
    assert.equal(goldTrade.receipt.sellerNetGold, 670);
    assert.equal(goldTrade.receipt.guildBankGoldAfter, 330);
    assert.equal(goldTrade.receipt.currency, 'IN_GAME_GOLD_ONLY');
  }

  // Rule 3.1, 3.3, 3.4: Champion Regalia has 0 stats, cannot be bought/traded/token-claimed, and leaves a past-champion badge on season rotation
  const regalia = server.getRegalia('champ_1')!;
  assert.equal(regalia.isCurrentlyActive, true);
  assert.equal(regalia.tradeable, false);
  assert.equal(regalia.mallPurchasable, false);
  assert.equal(regalia.tokenReward, false);
  assert.deepEqual(regalia.combatStats, {
    bonusAttack: 0,
    bonusDefense: 0,
    bonusHp: 0,
    bonusSpeed: 0,
  });

  assert.equal(server.attemptInvalidRegaliaAcquisition('rival_1', 'mall_purchase', 4700).allowed, false);
  assert.equal(server.attemptInvalidRegaliaAcquisition('rival_1', 'player_trade', 4701).allowed, false);
  assert.equal(server.attemptInvalidRegaliaAcquisition('rival_1', 'token_claim', 4702).allowed, false);

  // Season rotation -> champ_1 keeps permanent Past Champion badge even when active regalia rotates
  server.rotateSeason('S2', ['champ_2'], 90000);
  const rotatedChamp1 = server.getRegalia('champ_1')!;
  assert.equal(rotatedChamp1.isCurrentlyActive, false);
  assert.equal(rotatedChamp1.hasPermanentPastChampionBadge, true);
  assert.deepEqual(rotatedChamp1.pastChampionSeasons, ['S1']);
});

test('Movable PvP HUD & Shift+Right-Click Tactical Map Ping Coordinator', () => {
  const coordinator = new PvpTacticalCoordinator();

  // Move and scale actionBar widget
  coordinator.applyLayoutPreset('pvp-centered');
  assert.equal(coordinator.layout.activePreset, 'pvp-centered');
  assert.equal(coordinator.layout.widgets.actionBar.offsetY, -48);

  coordinator.moveWidget('actionBar', 23, -119);
  assert.equal(coordinator.layout.widgets.actionBar.offsetX, 24); // snapped to 8px grid
  assert.equal(coordinator.layout.widgets.actionBar.offsetY, -120);

  // Shift + Right-Click ping near enemy shotcaller (-6.2, -13.5) snaps focus target and creates ping
  const ping = coordinator.emitMapPing(-6.0, -13.2, 'focus', 'YOU (Shotcaller)', 1000);
  assert.equal(ping.kind, 'focus');
  assert.equal(ping.targetId, 'red-reaper-01');
  assert.equal(coordinator.getFocusedTarget().id, 'red-reaper-01');
});
