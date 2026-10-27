/* DREAM Online — playable design prototype engine.
   Simulated world: all "server" logic runs client-side. Not production code. */
(function () {
  'use strict';
  if (window.DREAM) return;

  var now = function () { return Date.now(); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var ri = function (a, b) { return Math.floor(rnd(a, b + 1)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var dist = function (a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); };
  var cfg = function () { return window.DREAM_CFG || {}; };
  var SAVE_KEY = 'dream-online-save-v1';

  // ---------- item catalog ----------
  var ITEMS = {
    blade_t: { name: 'Training Blade', kind: 'weapon', atk: 6, maxDur: 40, val: 10 },
    blade_i: { name: 'Iron Blade', kind: 'weapon', atk: 12, maxDur: 70, val: 90 },
    blade_s: { name: 'Sunforged Edge', kind: 'weapon', atk: 20, maxDur: 100, val: 260 },
    vest_c: { name: 'Cloth Vest', kind: 'armor', def: 3, maxDur: 40, val: 10 },
    vest_s: { name: 'Scale Vest', kind: 'armor', def: 8, maxDur: 70, val: 90 },
    vest_p: { name: 'Plate Harness', kind: 'armor', def: 14, maxDur: 100, val: 260 },
    tonic: { name: 'Health Tonic', kind: 'consumable', heal: 45, val: 8 },
    pelt: { name: 'Mist Pelt', kind: 'material', val: 6 },
    gloom: { name: 'Gloom Essence', kind: 'material', val: 14 },
    core: { name: 'Rustplate Core', kind: 'material', val: 30 },
    perch: { name: 'Silver Perch', kind: 'fish', val: 8 },
    koi: { name: 'Neon Koi', kind: 'fish', val: 22 },
    ring: { name: 'Lakeglass Ring', kind: 'treasure', val: 70 },
    swim_t: { name: 'Tidal Swimline', kind: 'outfit', fish: 0.35, fishXp: 0.25 },
    swim_r: { name: 'Reefrunner Wetsuit', kind: 'outfit', fish: 0.55, fishXp: 0.40 },
    medic: { name: 'Field Medic Uniform', kind: 'outfit', healBoost: 0.30, xpB: 0.05 },
    skin_v: { name: 'Ion Vanguard Skin', kind: 'outfit', durResist: 0.25 },
    crown: { name: 'Oculus Crown', kind: 'outfit', xpB: 0.10 },
    camper: { name: "Fable's Popup Camper", kind: 'consumable', camper: true },
    writ: { name: 'Mercy Writ', kind: 'consumable', writ: true },
    moonwalk: { name: 'Zero-G Moonwalk', kind: 'emote' }
  };
  var NEEDS_SHOP = [
    { key: 'swim_t', price: 12, blurb: '+35% fishing success · +25% fishing XP' },
    { key: 'swim_r', price: 20, blurb: '+55% fishing success · +40% fishing XP' },
    { key: 'medic', price: 15, blurb: 'Tonics heal +30% · +5% XP' },
    { key: 'skin_v', price: 18, blurb: 'Gear durability drains 25% slower' },
    { key: 'camper', price: 8, blurb: 'Deploy anywhere: field repair + stash · 3 uses' },
    { key: 'writ', price: 10, blurb: 'Clears red-name status instantly' },
    { key: 'moonwalk', price: 6, blurb: 'Emote: anti-gravity moonwalk · maximum cheese' },
    { key: 'stash8', price: 10, blurb: '+8 stash slots', stash: true }
  ];
  var VENDOR = ['tonic', 'blade_i', 'vest_s', 'blade_s', 'vest_p'];
  var PACKS = [
    { id: 'p10', n: 10, usd: '4.99' },
    { id: 'p55', n: 55, usd: '19.99' },
    { id: 'p120', n: 120, usd: '39.99' }
  ];

  // ---------- world geometry ----------
  var W = 3200, H = 2400;
  var TOWN = { x: 220, y: 220, w: 820, h: 680 };
  var SMITH = { x: 430, y: 450 };
  var CHEST = { x: 700, y: 720 };
  var GUARDS = [{ x: 1040, y: 560 }, { x: 640, y: 900 }, { x: 280, y: 560 }];
  var LAKE = { x: 2450, y: 1900, r: 430 };
  var ARENA = { x: 2620, y: 520, r: 300 };
  var ZONES = [
    { name: 'MISTFEN PLAINS', rect: { x: 1200, y: 700, w: 950, h: 950 }, mob: { base: 'Mistwolf', lo: 1, hi: 4, aggro: false, color: '#94a3b8', drop: 'pelt' }, count: 13 },
    { name: 'GLOOMWOOD', rect: { x: 330, y: 1350, w: 820, h: 880 }, mob: { base: 'Gloom Shade', lo: 5, hi: 8, aggro: true, color: '#fbbf24', drop: 'gloom' }, count: 10 },
    { name: 'RUST RIDGE', rect: { x: 1350, y: 140, w: 780, h: 430 }, mob: { base: 'Rustplate Golem', lo: 8, hi: 12, aggro: true, color: '#fb923c', drop: 'core' }, count: 8 }
  ];
  var RIVAL_NAMES = ['Vex_09', 'MoonMoth', 'GrimbleTot', 'SaltyPine'];
  var SUPO_TIERS = [
    { lv: 1, name: 'Sup@ · Murmur', r: 5 },
    { lv: 5, name: 'Sup@ · Whisper', r: 7 },
    { lv: 10, name: 'Sup@ · Voice', r: 9 },
    { lv: 15, name: 'Sup@ · Chorus', r: 11 },
    { lv: 20, name: 'SUP@ · ULTRACODE', r: 13 }
  ];

  // ---------- exposed state ----------
  var S = {
    started: false, hasSave: false, saveName: '', dead: false, deathBy: '', lostItems: 0,
    name: '', gender: 'f', teen: false,
    lvl: 1, xp: 0, xpNeed: 40, hp: 60, maxHp: 60, sols: 25, needs: 0,
    pKills: 0, redUntil: 0, flagged: false,
    eq: { weapon: { key: 'blade_t', dur: 40 }, armor: { key: 'vest_c', dur: 40 }, outfit: null },
    inv: [{ key: 'tonic', qty: 3 }], stash: [], stashCap: 12, invCap: 16,
    near: { smith: false, chest: false, water: false, camper: false, bag: false, town: false, arena: false },
    fishing: null, crossEyedUntil: 0,
    bossActive: false, banner: '', bannerUntil: 0,
    supo: { tier: 'Sup@ · Murmur', line: '', lineUntil: 0 },
    dance: null,
    log: [], panel: null,
    items: ITEMS, needsShop: NEEDS_SHOP, vendor: VENDOR, packs: PACKS
  };

  // ---------- internal entities ----------
  var E = {
    player: { x: 630, y: 600, cd: 0, hitCd: 0, swing: 0, moveTo: null, fx: 1, fy: 0, dodgeUntil: 0, dodgeCd: 0, dvx: 0, dvy: 0, combo: 0, comboUntil: 0 },
    mobs: [], rivals: [], bags: [], campers: [], bosses: [],
    bossCdUntil: 0, keys: {}, deco: []
  };

  var logId = 0, dirtyPing = true, hudFn = null, lastPing = 0, lastSave = 0;
  var SOFT = [[/slain/gi, 'defeated'], [/died/gi, 'got knocked out'], [/executes you/gi, 'escorts you out'], [/kill(s?)\b/gi, 'bonk$1'], [/shoot/gi, 'zap'], [/dying/gi, 'wearing thin']];
  function soften(msg) { if (!S.teen) return msg; SOFT.forEach(function (p) { msg = msg.replace(p[0], p[1]); }); return msg; }
  function L(msg, cls) { msg = soften(msg); S.log.push({ id: ++logId, msg: msg, cls: cls || '' }); if (S.log.length > 7) S.log.shift(); dirtyPing = true; }
  function banner(msg) { S.banner = msg; S.bannerUntil = now() + 5000; dirtyPing = true; }
  function supoSay(msg) { msg = soften(msg); S.supo.line = msg; S.supo.lineUntil = now() + 7000; L('Sup@: ' + msg, 'supo'); }
  var said = {};
  function supoOnce(key, msg, cdMs) {
    var t = now();
    if (said[key] && t < said[key]) return;
    said[key] = t + (cdMs || 1e12);
    supoSay(msg);
  }
  function isRed() { return now() < S.redUntil; }
  function outfitPerk(p) { var o = S.eq.outfit; if (!o) return 0; return ITEMS[o.key][p] || 0; }

  // ---------- inventory ----------
  function invAdd(key, qty, dur) {
    var def = ITEMS[key];
    if (def.kind === 'weapon' || def.kind === 'armor' || def.kind === 'outfit') {
      if (S.inv.length >= S.invCap) { L('Inventory full — ' + def.name + ' lost.', 'bad'); return false; }
      S.inv.push({ key: key, dur: dur != null ? dur : def.maxDur });
      return true;
    }
    var row = null;
    for (var i = 0; i < S.inv.length; i++) if (S.inv[i].key === key && S.inv[i].qty != null) { row = S.inv[i]; break; }
    if (row) { row.qty += (qty || 1); return true; }
    if (S.inv.length >= S.invCap) { L('Inventory full — ' + def.name + ' lost.', 'bad'); return false; }
    S.inv.push({ key: key, qty: qty || 1 });
    return true;
  }
  function invRemoveAt(i, n) {
    var row = S.inv[i]; if (!row) return;
    if (row.qty != null && row.qty > (n || 1)) row.qty -= (n || 1);
    else S.inv.splice(i, 1);
  }
  function ownsOutfit(key) {
    if (S.eq.outfit && S.eq.outfit.key === key) return true;
    for (var i = 0; i < S.inv.length; i++) if (S.inv[i].key === key) return true;
    for (var j = 0; j < S.stash.length; j++) if (S.stash[j].key === key) return true;
    return false;
  }

  // ---------- progression ----------
  function xpGain(n, isFish) {
    var mult = (cfg().xpRate || 1) * (1 + outfitPerk('xpB') + (isFish ? outfitPerk('fishXp') : 0));
    S.xp += Math.round(n * mult);
    while (S.xp >= S.xpNeed) {
      S.xp -= S.xpNeed; S.lvl++;
      S.xpNeed = Math.round(S.xpNeed * 1.6);
      S.maxHp += 12; S.hp = S.maxHp;
      L('Level up! You are now level ' + S.lvl + '.', 'good');
      var tier = supoTier();
      if (tier.name !== S.supo.tier) {
        S.supo.tier = tier.name;
        supoSay('I felt that... I grew. I was larger once, before the DREAM. Keep going.');
      } else if (S.lvl === 3) supoSay('Stronger already. Gloomwood is south — the shades there remember light.');
    }
    dirtyPing = true;
  }
  function supoTier() {
    var t = SUPO_TIERS[0];
    for (var i = 0; i < SUPO_TIERS.length; i++) if (S.lvl >= SUPO_TIERS[i].lv) t = SUPO_TIERS[i];
    return t;
  }

  // ---------- spawning ----------
  function mkMob(z) {
    var lvl = ri(z.mob.lo, z.mob.hi);
    var x = rnd(z.rect.x + 30, z.rect.x + z.rect.w - 30), y = rnd(z.rect.y + 30, z.rect.y + z.rect.h - 30);
    return {
      name: z.mob.base, lvl: lvl, color: z.mob.color, drop: z.mob.drop, aggroType: z.mob.aggro,
      hp: 20 + lvl * 10, maxHp: 20 + lvl * 10, atk: 2 + lvl * 1.6,
      x: x, y: y, hx: x, hy: y, aggro: false, cd: 0, wt: 0, wx: x, wy: y, dead: false, respAt: 0
    };
  }
  function mkRival(i) {
    return {
      name: RIVAL_NAMES[i], hp: 110, maxHp: 110, atk: 7,
      x: rnd(1300, 2000), y: rnd(800, 1500), aggro: false, cd: 0, wt: 0, wx: 0, wy: 0, dead: false, respAt: 0
    };
  }
  function spawnAll() {
    E.mobs = [];
    for (var z = 0; z < ZONES.length; z++) for (var i = 0; i < ZONES[z].count; i++) E.mobs.push(mkMob(ZONES[z]));
    E.rivals = []; for (var r = 0; r < RIVAL_NAMES.length; r++) E.rivals.push(mkRival(r));
  }
  function spawnBosses() {
    E.bosses = [
      { key: 'gem', name: 'GeminEYE', hp: 600, maxHp: 600, atk: 13, x: ARENA.x - 90, y: ARENA.y, cd: 0, split: false, dead: false },
      { key: 'eye', name: 'OpenAEye', hp: 500, maxHp: 500, atk: 10, x: ARENA.x + 90, y: ARENA.y, cd: 0, gazeAt: now() + 5000, dead: false }
    ];
    S.bossActive = true;
    banner('GeminEYE & OpenAEye materialize in the Arena of Lenses');
    supoSay('Two eyes. One splits, one blinds. Do not stand still.');
  }

  // ---------- death / karma ----------
  function killPlayer(by) {
    if (S.dead) return;
    S.dead = true; S.deathBy = by; S.hp = 0; S.fishing = null; S.panel = null; S.lostItems = 0;
    if (isRed() && S.inv.length) {
      var lose = Math.floor(S.inv.length / 2);
      var dropped = [];
      for (var i = 0; i < lose; i++) {
        var idx = ri(0, S.inv.length - 1);
        dropped.push(S.inv.splice(idx, 1)[0]);
      }
      S.lostItems = dropped.length;
      if (dropped.length) E.bags.push({ x: E.player.x, y: E.player.y, items: dropped, sols: 0, ttl: now() + 90000, tag: 'yours' });
      L('You died red-named. ' + dropped.length + ' items dropped — anyone can loot them.', 'bad');
    } else {
      L('You died to ' + by + '.', 'bad');
    }
    if (S.eq.weapon) S.eq.weapon.dur = Math.max(0, S.eq.weapon.dur - 5);
    if (S.eq.armor) S.eq.armor.dur = Math.max(0, S.eq.armor.dur - 5);
    dirtyPing = true;
  }
  function creditPlayerKill(rv) {
    S.pKills++;
    E.bags.push({ x: rv.x, y: rv.y, items: [], sols: ri(25, 60), ttl: now() + 60000, tag: rv.name });
    if (S.pKills >= 3) {
      S.redUntil = now() + 180000 * (S.pKills - 2);
      L('Your name burns RED. Guards will execute you on sight.', 'bad');
      supoSay('Red suits no one. A Mercy Writ clears it — or time, and distance from town.');
    } else {
      L('Player kill (' + S.pKills + '/3 before red name).', 'warn');
    }
  }

  // ---------- actions ----------
  var ACTIONS = {
    start: function (p) {
      if (p && p.mode === 'continue' && S.hasSave) { S.started = true; L('The DREAM resumes, ' + S.name + '.', 'good'); return; }
      S.name = (p && p.name || 'Dreamer').slice(0, 14);
      S.gender = (p && p.gender) || 'f';
      S.teen = !(p && p.adult);
      S.lvl = 1; S.xp = 0; S.xpNeed = 40; S.maxHp = 60; S.hp = 60; S.sols = 25; S.needs = 0;
      S.pKills = 0; S.redUntil = 0; S.flagged = false;
      S.eq = { weapon: { key: 'blade_t', dur: 40 }, armor: { key: 'vest_c', dur: 40 }, outfit: null };
      S.inv = [{ key: 'tonic', qty: 3 }]; S.stash = []; S.stashCap = 12;
      S.supo = { tier: 'Sup@ · Murmur', line: '', lineUntil: 0 };
      E.player.x = 630; E.player.y = 600; S.dead = false; S.started = true; said = {};
      spawnAll();
      L('You wake in Haven. It was all a DREAM — or it still is.', 'good');
      supoSay("You're awake. Good. I'm Sup@ — I grow when you do. Kill something small; the world remembers effort.");
    },
    respawn: function () {
      S.dead = false; S.hp = S.maxHp; E.player.x = 630; E.player.y = 600; E.player.moveTo = null;
      if (isRed()) supoSay('Still red. Haven guards WILL fire. Stay outside the walls or buy a Mercy Writ.');
    },
    dance: function () {
      if (S.dead || S.fishing) return;
      var owned = ['Dream Shuffle'];
      if (ownsOutfit('moonwalk')) owned.push('Zero-G Moonwalk');
      var cur = S.dance && now() < S.dance.until ? S.dance.name : null;
      var next = owned[(owned.indexOf(cur) + 1) % owned.length];
      S.dance = { name: next, until: now() + 4500 };
      L('You bust out the ' + next + '. ♪', 'good');
      if (Math.random() < 0.4) supoSay(Math.random() < 0.5 ? 'Objectively cheesy. I love it.' : 'The DREAM approves of this nonsense.');
    },
    dodge: function () { tryDodge(); },
    attack: function () { tryAttack(); },
    usePotion: function () {
      for (var i = 0; i < S.inv.length; i++) if (S.inv[i].key === 'tonic') {
        var heal = Math.round(ITEMS.tonic.heal * (1 + outfitPerk('healBoost')));
        S.hp = Math.min(S.maxHp, S.hp + heal); invRemoveAt(i, 1); L('+' + heal + ' HP.', 'good'); return;
      }
      L('No tonics. FABLE sells them in Haven.', 'warn');
    },
    equip: function (p) {
      var row = S.inv[p.i]; if (!row) return;
      var def = ITEMS[row.key], slot = def.kind;
      if (slot !== 'weapon' && slot !== 'armor' && slot !== 'outfit') return;
      var old = S.eq[slot];
      S.eq[slot] = { key: row.key, dur: row.dur };
      S.inv.splice(p.i, 1);
      if (old) S.inv.push(old);
      L(def.name + ' equipped.');
    },
    unequip: function (p) {
      var it = S.eq[p.slot]; if (!it) return;
      if (S.inv.length >= S.invCap) { L('Inventory full.', 'warn'); return; }
      S.inv.push(it); S.eq[p.slot] = null;
    },
    useItem: function (p) {
      var row = S.inv[p.i]; if (!row) return;
      var def = ITEMS[row.key];
      if (row.key === 'tonic') { ACTIONS.usePotion(); return; }
      if (def.writ) { S.redUntil = 0; S.pKills = 0; invRemoveAt(p.i, 1); L('Mercy Writ consumed. Your name clears.', 'good'); supoSay('Clean again. Keep it that way — or don\u2019t. Your dream.'); return; }
      if (def.camper) {
        invRemoveAt(p.i, 1);
        E.campers = [{ x: E.player.x + 40, y: E.player.y, until: now() + 150000 }];
        L("Fable's Popup Camper deployed (2m 30s): field repair + stash.", 'good');
        return;
      }
    },
    sellItem: function (p) {
      if (!S.near.smith) { L('Sell at FABLE\u2019S Blacksmith in Haven.', 'warn'); return; }
      var row = S.inv[p.i]; if (!row) return;
      var def = ITEMS[row.key], price = Math.floor((def.val || 0) / 2);
      if (!price) { L(def.name + ' has no resale value.', 'warn'); return; }
      S.sols += price; invRemoveAt(p.i, 1); L('Sold ' + def.name + ' · +' + price + ' Sols.', 'good');
    },
    sellLoot: function () {
      if (!S.near.smith) return;
      var total = 0;
      for (var i = S.inv.length - 1; i >= 0; i--) {
        var def = ITEMS[S.inv[i].key];
        if (def.kind === 'material' || def.kind === 'fish' || def.kind === 'treasure') {
          total += Math.floor(def.val / 2) * (S.inv[i].qty || 1);
          S.inv.splice(i, 1);
        }
      }
      if (total) { S.sols += total; L('FABLE buys your loot · +' + total + ' Sols.', 'good'); }
      else L('Nothing FABLE wants to buy.', 'warn');
    },
    repairAll: function () {
      if (!S.near.smith && !S.near.camper) { L('No repair point here. Walk to Haven — or deploy a camper.', 'warn'); return; }
      var missing = 0;
      ['weapon', 'armor'].forEach(function (s) { var it = S.eq[s]; if (it) missing += ITEMS[it.key].maxDur - it.dur; });
      if (!missing) { L('Gear is pristine.', 'good'); return; }
      var cost = Math.max(5, Math.ceil(missing / 2));
      if (S.sols < cost) { L('Repair costs ' + cost + ' Sols — you have ' + S.sols + '.', 'warn'); return; }
      S.sols -= cost;
      ['weapon', 'armor'].forEach(function (s) { var it = S.eq[s]; if (it) it.dur = ITEMS[it.key].maxDur; });
      L((S.near.smith ? 'FABLE hammers your gear whole' : 'Camper auto-forge hums') + ' · -' + cost + ' Sols.', 'good');
    },
    buyVendor: function (p) {
      if (!S.near.smith) return;
      var def = ITEMS[p.key];
      if (S.sols < def.val) { L('Not enough Sols.', 'warn'); return; }
      if (invAdd(p.key, 1)) { S.sols -= def.val; L('Bought ' + def.name + ' · -' + def.val + ' Sols.', 'good'); }
    },
    buyNeeds: function (p) {
      var entry = null;
      for (var i = 0; i < NEEDS_SHOP.length; i++) if ((NEEDS_SHOP[i].key || '') === p.key || (NEEDS_SHOP[i].stash && p.key === 'stash8')) entry = NEEDS_SHOP[i];
      if (!entry) return;
      if (S.needs < entry.price) { L('Not enough NEEDS.', 'warn'); return; }
      if (entry.stash) { S.needs -= entry.price; S.stashCap += 8; L('Stash expanded to ' + S.stashCap + ' slots.', 'good'); return; }
      var def = ITEMS[entry.key];
      if (def.kind === 'outfit' && ownsOutfit(entry.key)) { L('Already owned.', 'warn'); return; }
      if (entry.key === 'camper') { S.needs -= entry.price; invAdd('camper', 3); L('3 camper charges added.', 'good'); return; }
      if (invAdd(entry.key, 1)) { S.needs -= entry.price; L(def.name + ' unlocked.', 'good'); }
    },
    grantPack: function (p) {
      for (var i = 0; i < PACKS.length; i++) if (PACKS[i].id === p.id) {
        S.needs += PACKS[i].n;
        L('+' + PACKS[i].n + ' NEEDS · checkout complete (simulated).', 'good');
      }
    },
    stashDeposit: function (p) {
      if (!S.near.chest && !S.near.camper) return;
      if (S.stash.length >= S.stashCap) { L('Stash full.', 'warn'); return; }
      var row = S.inv[p.i]; if (!row) return;
      S.inv.splice(p.i, 1); S.stash.push(row);
    },
    stashWithdraw: function (p) {
      if (!S.near.chest && !S.near.camper) return;
      if (S.inv.length >= S.invCap) { L('Inventory full.', 'warn'); return; }
      var row = S.stash[p.i]; if (!row) return;
      S.stash.splice(p.i, 1); S.inv.push(row);
    },
    lootBag: function () {
      var bg = nearestBag(); if (!bg) return;
      if (bg.sols) { S.sols += bg.sols; L('+' + bg.sols + ' Sols looted.', 'good'); }
      for (var i = 0; i < bg.items.length; i++) invAdd(bg.items[i].key, bg.items[i].qty || 1, bg.items[i].dur);
      if (bg.items.length) L(bg.items.length + ' item(s) recovered.', 'good');
      E.bags.splice(E.bags.indexOf(bg), 1);
    },
    castFish: function () {
      if (!S.near.water || S.fishing || S.dead) return;
      var bonus = outfitPerk('fish');
      S.fishing = { p: 0, dir: 1, speed: rnd(1.5, 2.1), zoneC: rnd(0.25, 0.75), zoneW: 0.13 + bonus * 0.25, until: now() + 9000 };
      L('Line cast... strike when the marker is in the glow.');
    },
    fishStrike: function () {
      var f = S.fishing; if (!f) return;
      S.fishing = null;
      if (Math.abs(f.p - f.zoneC) <= f.zoneW / 2) {
        var luck = cfg().lootLuck || 1;
        var r = Math.random();
        if (r < 0.05 * luck) { S.needs += 1; L('A NEED shard glitters on the hook! +1 NEEDS.', 'good'); }
        else if (r < 0.14) { invAdd('ring', 1); L('Caught: Lakeglass Ring.', 'good'); }
        else if (r < 0.40) { invAdd('koi', 1); L('Caught: Neon Koi.', 'good'); }
        else { invAdd('perch', 1); L('Caught: Silver Perch.', 'good'); }
        xpGain(10 + S.lvl * 2, true);
      } else L('It got away.', 'warn');
    },
    togglePvp: function () {
      if (S.near.town) { L('Cannot flag inside Haven.', 'warn'); return; }
      S.flagged = !S.flagged;
      if (S.flagged) supoOnce('flag', 'Flag\u2019s up. Three kills turns your name red — guards shoot red on sight.', 600000);
      L(S.flagged ? 'PvP flag RAISED.' : 'PvP flag lowered.', S.flagged ? 'warn' : '');
    },
    setPanel: function (p) { S.panel = S.panel === p.panel ? null : p.panel; },
    interact: function () { contextInteract(); }
  };

  function nearestBag() {
    var best = null, bd = 60;
    for (var i = 0; i < E.bags.length; i++) { var d = dist(E.bags[i], E.player); if (d < bd) { bd = d; best = E.bags[i]; } }
    return best;
  }
  function contextInteract() {
    if (nearestBag()) return ACTIONS.lootBag();
    if (S.near.smith) { S.panel = S.panel === 'smith' ? null : 'smith'; return; }
    if (S.near.camper) { S.panel = S.panel === 'smith' ? null : 'smith'; return; }
    if (S.near.chest) { S.panel = S.panel === 'stash' ? null : 'stash'; return; }
    if (S.near.water) return ACTIONS.castFish();
  }

  // ---------- combat ----------
  function weaponDurF() { var w = S.eq.weapon; return (w && w.dur > 0) ? 1 : 0.5; }
  function armorDurF() { var a = S.eq.armor; return (a && a.dur > 0) ? 1 : 0.5; }
  function decWeapon() {
    var w = S.eq.weapon; if (!w) return;
    if (Math.random() < outfitPerk('durResist')) return;
    w.dur = Math.max(0, w.dur - 1);
    if (w.dur === 8) supoOnce('wdur', 'Your blade is dying. FABLE repairs cheap in Haven — or a camper repairs anywhere.', 300000);
    if (w.dur === 0) L('Weapon BROKEN — damage halved until repaired.', 'bad');
  }
  function decArmor() {
    var a = S.eq.armor; if (!a) return;
    if (Math.random() < outfitPerk('durResist')) return;
    a.dur = Math.max(0, a.dur - 1);
    if (a.dur === 0) L('Armor BROKEN — defense halved until repaired.', 'bad');
  }
  function playerAtk() { var w = S.eq.weapon; return ((w ? ITEMS[w.key].atk : 2) * weaponDurF() + S.lvl * 1.5); }
  function playerDef() { var a = S.eq.armor; return (a ? ITEMS[a.key].def : 0) * armorDurF(); }

  function tryAttack() {
    if (S.dead || !S.started) return;
    if (S.fishing) { ACTIONS.fishStrike(); return; }
    var t = now(); if (t < E.player.cd) return;
    var p = E.player;
    // combo chain: hits within 1.2s chain up to 3; 3rd hit heavy
    if (t > p.comboUntil) p.combo = 0;
    p.combo = Math.min(3, p.combo + 1);
    p.comboUntil = t + 1200;
    var heavy = p.combo === 3;
    p.cd = t + (heavy ? 600 : 380);
    p.swing = t + 170;
    // aimed frontal arc — no target lock; whiffs are whiffs
    var ARC = Math.PI * 0.55, RANGE = heavy ? 95 : 80;
    var fa = Math.atan2(p.fy, p.fx);
    var hitAny = false;
    var pools = [E.mobs, E.bosses];
    if (S.flagged) pools.push(E.rivals);
    pools.forEach(function (pool) {
      pool.forEach(function (m) {
        if (m.dead) return;
        var d = dist(m, p); if (d > RANGE) return;
        var ma = Math.atan2(m.y - p.y, m.x - p.x);
        var da = Math.abs(Math.atan2(Math.sin(ma - fa), Math.cos(ma - fa)));
        if (da > ARC / 2 && d > 30) return; // outside swing arc (point blank always hits)
        var dmg = Math.round(playerAtk() * (heavy ? 1.8 : 1) * rnd(0.85, 1.15));
        m.hp -= dmg; m.aggro = true; hitAny = true;
        if (m.hp <= 0) onKill(m);
      });
    });
    if (hitAny) { decWeapon(); if (heavy) L('Combo finisher! (1.8× cleave)', 'good'); }
    else p.combo = 0; // whiff resets the chain
    dirtyPing = true;
  }

  function tryDodge() {
    if (S.dead || !S.started || S.fishing) return;
    var t = now(), p = E.player;
    if (t < p.dodgeCd) return;
    var vx = p.fx, vy = p.fy;
    p.dodgeUntil = t + 350; p.dodgeCd = t + 1100;
    p.dvx = vx; p.dvy = vy;
  }

  function onKill(m) {
    m.dead = true; m.respAt = now() + 25000;
    var luck = cfg().lootLuck || 1;
    if (E.rivals.indexOf(m) >= 0) { creditPlayerKill(m); return; }
    if (E.bosses.indexOf(m) >= 0) {
      L(m.name + ' shatters!', 'good');
      if (m.key === 'gem' && !m.split) { /* handled at half hp */ }
      var alive = E.bosses.filter(function (b) { return !b.dead; });
      if (!alive.length) {
        S.bossActive = false;
        E.bossCdUntil = cfg().bossRush ? 0 : now() + 180000;
        S.sols += 300; S.needs += 3;
        banner('The Arena falls silent · +300 Sols · +3 NEEDS');
        if (!ownsOutfit('crown')) { invAdd('crown', 1); L('Trophy: Oculus Crown (+10% XP outfit).', 'good'); }
        xpGain(220);
        supoSay('The eyes are closed. I remember more now... there were seven of us, once.');
      }
      return;
    }
    // regular mob
    var sols = 2 + m.lvl * 2 + ri(0, 3);
    S.sols += sols;
    xpGain(m.lvl * 12);
    if (Math.random() < 0.55) invAdd(m.drop, 1);
    if (Math.random() < 0.05) invAdd(m.lvl > 7 ? 'vest_s' : 'blade_i', 1, ri(20, 50));
    if (Math.random() < 0.015 * luck) { S.needs += 1; L('A NEED shard drops! +1 NEEDS.', 'good'); }
    L(m.name + ' L' + m.lvl + ' slain · +' + sols + ' Sols · +' + (m.lvl * 12) + ' XP');
  }

  function hurtPlayer(raw, by) {
    if (now() < E.player.dodgeUntil) return; // i-frames — dodged clean
    var dmg = Math.max(1, Math.round((raw - playerDef() * 0.6) * rnd(0.85, 1.15)));
    S.hp -= dmg; decArmor(); dirtyPing = true;
    if (S.hp <= 0) killPlayer(by);
  }

  // ---------- sim ----------
  function simEnemy(m, dt, t, leashR, homeX, homeY, speed) {
    if (m.dead) { if (t > m.respAt && E.bosses.indexOf(m) < 0 && E.rivals.indexOf(m) >= 0 === false) { m.dead = false; m.hp = m.maxHp; m.x = m.hx; m.y = m.hy; m.aggro = false; } return; }
    var pd = dist(m, E.player);
    if (!S.dead && m.aggroType && !m.aggro && pd < 130) m.aggro = true;
    if (S.dead) m.aggro = false;
    var hx = homeX != null ? homeX : m.hx, hy = homeY != null ? homeY : m.hy;
    if (m.aggro && dist(m, { x: hx, y: hy }) > leashR) { m.aggro = false; m.hp = m.maxHp; }
    if (m.aggro && !S.dead) {
      if (pd > 40) { m.x += (E.player.x - m.x) / pd * speed * dt; m.y += (E.player.y - m.y) / pd * speed * dt; }
      else if (t > m.cd) { m.cd = t + 950; hurtPlayer(m.atk, m.name); }
    } else {
      m.wt -= dt;
      if (m.wt <= 0) { m.wt = rnd(2, 5); m.wx = hx + rnd(-90, 90); m.wy = hy + rnd(-90, 90); }
      var wd = dist(m, { x: m.wx, y: m.wy });
      if (wd > 6) { m.x += (m.wx - m.x) / wd * 40 * dt; m.y += (m.wy - m.y) / wd * 40 * dt; }
    }
  }

  function tick(dt) {
    if (!S.started) return;
    var t = now();
    var p = E.player;

    if (!S.dead) {
      // movement
      var vx = 0, vy = 0;
      if (E.keys.w || E.keys.arrowup) vy -= 1;
      if (E.keys.s || E.keys.arrowdown) vy += 1;
      if (E.keys.a || E.keys.arrowleft) vx -= 1;
      if (E.keys.d || E.keys.arrowright) vx += 1;
      if (vx || vy) {
        p.moveTo = null;
        S.dance = null;
        var len = Math.sqrt(vx * vx + vy * vy);
        p.fx = vx / len; p.fy = vy / len;
        p.x += vx / len * 210 * dt; p.y += vy / len * 210 * dt;
        if (S.fishing) { S.fishing = null; L('Line reeled in.'); }
      } else if (p.moveTo) {
        var d = dist(p, p.moveTo);
        if (d < 8) p.moveTo = null;
        else {
          p.fx = (p.moveTo.x - p.x) / d; p.fy = (p.moveTo.y - p.y) / d;
          p.x += (p.moveTo.x - p.x) / d * 210 * dt; p.y += (p.moveTo.y - p.y) / d * 210 * dt;
        }
      }
      // dodge burst
      if (t < p.dodgeUntil) { p.x += p.dvx * 480 * dt; p.y += p.dvy * 480 * dt; }
      p.x = clamp(p.x, 20, W - 20); p.y = clamp(p.y, 20, H - 20);
      // keep out of deep lake
      var ld = dist(p, LAKE);
      if (ld < LAKE.r - 18) {
        var ang = Math.atan2(p.y - LAKE.y, p.x - LAKE.x);
        p.x = LAKE.x + Math.cos(ang) * (LAKE.r - 18); p.y = LAKE.y + Math.sin(ang) * (LAKE.r - 18);
      }
      // passive regen
      S.hp = Math.min(S.maxHp, S.hp + 1.6 * dt);
    }

    // proximity flags
    var n = S.near;
    n.town = p.x > TOWN.x && p.x < TOWN.x + TOWN.w && p.y > TOWN.y && p.y < TOWN.y + TOWN.h;
    n.smith = dist(p, SMITH) < 90;
    n.chest = dist(p, CHEST) < 70;
    n.water = Math.abs(dist(p, LAKE) - LAKE.r) < 60;
    n.arena = dist(p, ARENA) < ARENA.r;
    n.camper = E.campers.length > 0 && dist(p, E.campers[0]) < 90;
    n.bag = !!nearestBag();
    if (n.town && S.flagged) S.flagged = false;
    if (n.water) supoOnce('water', 'Water. Fish bite here — press F. A swimline outfit from the NEEDS shop triples your luck.', 1e12);
    if (n.smith) supoOnce('smith', 'FABLE. Blacksmith, buyer, and the only honest shop in the DREAM. Repairs are cheap here.', 1e12);
    if (dist(p, ARENA) < ARENA.r + 200) supoOnce('arena', 'Two eyes dream in that ring. Bring a friend. Or courage.', 1e12);

    // guards execute reds
    if (isRed() && !S.dead) {
      for (var g = 0; g < GUARDS.length; g++) if (dist(p, GUARDS[g]) < 230) { killPlayer('a Haven Guard (one shot, red name)'); break; }
    }

    // campers expire
    if (E.campers.length && t > E.campers[0].until) { E.campers = []; L("Fable's camper folds itself away."); }
    // bags expire / rival scavenging
    for (var b = E.bags.length - 1; b >= 0; b--) if (t > E.bags[b].ttl) E.bags.splice(b, 1);

    // mobs
    for (var i = 0; i < E.mobs.length; i++) {
      var m = E.mobs[i];
      if (m.dead) { if (t > m.respAt) { m.dead = false; m.hp = m.maxHp; m.x = m.hx; m.y = m.hy; m.aggro = false; } continue; }
      simEnemy(m, dt, t, 480, null, null, 95 + m.lvl * 4);
    }
    // rivals
    for (var r = 0; r < E.rivals.length; r++) {
      var rv = E.rivals[r];
      if (rv.dead) { if (t > rv.respAt) { rv.dead = false; rv.hp = rv.maxHp; rv.x = rnd(1300, 2000); rv.y = rnd(800, 1500); rv.aggro = false; } continue; }
      if (rv.respAt === 0) rv.respAt = t + 60000;
      rv.hx = rv.x; rv.hy = rv.y;
      simEnemy(rv, dt, t, 700, rv.wx || rv.x, rv.wy || rv.y, 120);
    }
    // bosses
    if (S.near.arena && !S.bossActive && t > E.bossCdUntil && !S.dead) spawnBosses();
    for (var bo = 0; bo < E.bosses.length; bo++) {
      var bs = E.bosses[bo];
      if (bs.dead) continue;
      if (bs.key === 'gem' && !bs.split && bs.hp < bs.maxHp / 2) {
        bs.split = true;
        E.bosses.push({ key: 'twin', name: 'GeminEYE Twin', hp: 220, maxHp: 220, atk: 9, x: bs.x + 50, y: bs.y + 30, cd: 0, dead: false });
        banner('GeminEYE splits into a mirrored twin!');
      }
      if (bs.key === 'eye' && t > bs.gazeAt && !S.dead && dist(bs, p) < 420) {
        bs.gazeAt = t + 8000;
        S.crossEyedUntil = t + 6000;
        L("OpenAEye's gaze crosses your eyes!", 'bad');
      }
      bs.aggro = !S.dead && dist(bs, p) < ARENA.r + 120;
      if (bs.aggro) {
        var bd2 = dist(bs, p);
        if (bd2 > 52) { bs.x += (p.x - bs.x) / bd2 * 105 * dt; bs.y += (p.y - bs.y) / bd2 * 105 * dt; }
        else if (t > bs.cd) { bs.cd = t + 1100; hurtPlayer(bs.atk, bs.name); }
      }
    }
    if (!S.near.arena && S.bossActive) {
      // player fled — bosses reset
      var anyAlive = false;
      E.bosses.forEach(function (b2) { if (!b2.dead) anyAlive = true; });
      if (anyAlive && dist(p, ARENA) > ARENA.r + 420) {
        E.bosses = []; S.bossActive = false;
        banner('The eyes lose interest and dissolve.');
      }
    }

    // fishing
    if (S.fishing) {
      var f = S.fishing;
      f.p += f.dir * f.speed * dt;
      if (f.p > 1) { f.p = 1; f.dir = -1; } if (f.p < 0) { f.p = 0; f.dir = 1; }
      if (t > f.until) { S.fishing = null; L('The fish lost interest.', 'warn'); }
    }

    // supo idle flavor
    if (t - (said.idle || 0) > 90000 && S.started && !S.dead) {
      said.idle = t;
      var lines = [
        'No fast travel in the DREAM. Distance is the price of everything.',
        'NEED shards fall rarely. Or the shop sells convenience — never power.',
        'FABLE remembers every visit. So do I.',
        'The red-named lose half of what they carry. The world keeps score.'
      ];
      supoSay(lines[ri(0, lines.length - 1)]);
    }

    if (t > S.bannerUntil) S.banner = '';
    if (t > S.supo.lineUntil) S.supo.line = '';
  }

  // ---------- persistence ----------
  function save() {
    if (!S.started) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, name: S.name, gender: S.gender, teen: S.teen, lvl: S.lvl, xp: S.xp, xpNeed: S.xpNeed,
        maxHp: S.maxHp, hp: Math.max(1, Math.round(S.hp)), sols: S.sols, needs: S.needs,
        pKills: S.pKills, redRemain: Math.max(0, S.redUntil - now()),
        eq: S.eq, inv: S.inv, stash: S.stash, stashCap: S.stashCap,
        x: Math.round(E.player.x), y: Math.round(E.player.y)
      }));
    } catch (e) { }
  }
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      S.hasSave = true; S.saveName = d.name;
      S.name = d.name; S.gender = d.gender; S.teen = !!d.teen; S.lvl = d.lvl; S.xp = d.xp; S.xpNeed = d.xpNeed;
      S.maxHp = d.maxHp; S.hp = d.hp; S.sols = d.sols; S.needs = d.needs;
      S.pKills = d.pKills; S.redUntil = d.redRemain ? now() + d.redRemain : 0;
      S.eq = d.eq; S.inv = d.inv; S.stash = d.stash || []; S.stashCap = d.stashCap || 12;
      E.player.x = d.x; E.player.y = d.y;
      S.supo.tier = supoTier().name;
    } catch (e) { }
  }
  load();
  spawnAll();

  // deco
  (function () {
    var seed = 42;
    var sr = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < 90; i++) {
      var x = sr() * W, y = sr() * H;
      if (x > TOWN.x - 40 && x < TOWN.x + TOWN.w + 40 && y > TOWN.y - 40 && y < TOWN.y + TOWN.h + 40) continue;
      if (dist({ x: x, y: y }, LAKE) < LAKE.r + 50) continue;
      if (dist({ x: x, y: y }, ARENA) < ARENA.r + 50) continue;
      E.deco.push({ x: x, y: y, r: 4 + sr() * 10, c: y > 1300 && x < 1200 ? '#14532d' : '#1e293b' });
    }
  })();

  // ---------- public API ----------
  window.DREAM = {
    state: S,
    act: function (type, payload) {
      var fn = ACTIONS[type];
      if (fn) { fn(payload || {}); dirtyPing = true; ping(); }
    },
    onHud: function (fn) { hudFn = fn; }
  };
  function ping() { if (hudFn) { try { hudFn(S); } catch (e) { } } }

  // ---------- render / element ----------
  var CE = class extends HTMLElement {
    connectedCallback() {
      var self = this;
      this.style.display = 'block';
      this.innerHTML = '';
      var cv = document.createElement('canvas');
      cv.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;background:#050b18';
      this.appendChild(cv);
      this._cv = cv;
      this._buf = document.createElement('canvas');
      this._alive = true;
      this._kd = function (e) {
        if (!S.started || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        var k = e.key.toLowerCase();
        E.keys[k] = true;
        if (k === ' ') { e.preventDefault(); tryAttack(); }
        if (k === 'b') { ACTIONS.dance(); ping(); }
        if (k === 'shift') { e.preventDefault(); tryDodge(); }
        if (k === 'f') ACTIONS.castFish();
        if (k === 'e') { ACTIONS.interact(); ping(); }
        if (k === 'q') ACTIONS.usePotion();
        if (k === 'p') { ACTIONS.togglePvp(); ping(); }
        if (k === 'i') { ACTIONS.setPanel({ panel: 'inventory' }); ping(); }
        if (k === 'c') { ACTIONS.setPanel({ panel: 'character' }); ping(); }
        if (k === 'n') { ACTIONS.setPanel({ panel: 'shop' }); ping(); }
        if (k === 'escape') { S.panel = null; ping(); }
      };
      this._ku = function (e) { E.keys[e.key.toLowerCase()] = false; };
      window.addEventListener('keydown', this._kd);
      window.addEventListener('keyup', this._ku);
      cv.addEventListener('pointerdown', function (e) {
        if (!S.started || S.dead) return;
        var r = cv.getBoundingClientRect();
        var cam = self._cam || { x: 0, y: 0 };
        E.player.moveTo = { x: (e.clientX - r.left) + cam.x, y: (e.clientY - r.top) + cam.y };
      });
      var last = now();
      var loop = function () {
        if (!self._alive) return;
        var t = now();
        var dt = Math.min(0.05, (t - last) / 1000); last = t;
        tick(dt);
        self.draw();
        var interval = S.fishing || S.bossActive ? 50 : 125;
        if (t - lastPing > interval) { lastPing = t; ping(); }
        if (t - lastSave > 6000) { lastSave = t; save(); }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      this._unload = function () { save(); };
      window.addEventListener('beforeunload', this._unload);
    }
    disconnectedCallback() {
      this._alive = false;
      window.removeEventListener('keydown', this._kd);
      window.removeEventListener('keyup', this._ku);
      window.removeEventListener('beforeunload', this._unload);
    }
    draw() {
      var cv = this._cv, buf = this._buf;
      var w = cv.clientWidth | 0, h = cv.clientHeight | 0;
      if (!w || !h) return;
      if (cv.width !== w) { cv.width = w; buf.width = w; }
      if (cv.height !== h) { cv.height = h; buf.height = h; }
      var g = buf.getContext('2d');
      var p = E.player;
      var cam = { x: clamp(p.x - w / 2, 0, W - w), y: clamp(p.y - h / 2, 0, H - h) };
      this._cam = cam;
      var t = now();

      // ground
      g.fillStyle = '#050b18'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(37,99,235,0.07)'; g.lineWidth = 1;
      g.beginPath();
      for (var gx = -(cam.x % 160); gx < w; gx += 160) { g.moveTo(gx, 0); g.lineTo(gx, h); }
      for (var gy = -(cam.y % 160); gy < h; gy += 160) { g.moveTo(0, gy); g.lineTo(w, gy); }
      g.stroke();

      var ox = -cam.x, oy = -cam.y;
      // zones tint + labels
      ZONES.forEach(function (z) {
        g.fillStyle = 'rgba(148,163,184,0.03)';
        g.fillRect(z.rect.x + ox, z.rect.y + oy, z.rect.w, z.rect.h);
        g.fillStyle = 'rgba(148,163,184,0.28)';
        g.font = '700 13px "JetBrains Mono", monospace';
        g.fillText(z.name + ' · L' + z.mob.lo + '–' + z.mob.hi, z.rect.x + ox + 14, z.rect.y + oy + 24);
      });
      // deco
      E.deco.forEach(function (d) {
        g.fillStyle = d.c; g.beginPath(); g.arc(d.x + ox, d.y + oy, d.r, 0, 7); g.fill();
      });
      // lake
      var lg = g.createRadialGradient(LAKE.x + ox, LAKE.y + oy, 40, LAKE.x + ox, LAKE.y + oy, LAKE.r);
      lg.addColorStop(0, '#0e7490'); lg.addColorStop(1, '#082f49');
      g.fillStyle = lg; g.beginPath(); g.arc(LAKE.x + ox, LAKE.y + oy, LAKE.r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(34,211,238,0.5)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(165,243,252,0.5)'; g.font = '700 13px "JetBrains Mono", monospace';
      g.fillText('LAKE LUMEN · FISHING', LAKE.x + ox - 80, LAKE.y + oy);
      // arena
      g.strokeStyle = 'rgba(245,158,11,0.55)'; g.lineWidth = 3;
      g.beginPath(); g.arc(ARENA.x + ox, ARENA.y + oy, ARENA.r, 0, 7); g.stroke();
      g.fillStyle = 'rgba(245,158,11,0.06)'; g.fill();
      g.fillStyle = 'rgba(253,230,138,0.55)';
      g.fillText('ARENA OF LENSES · DUO BOSS', ARENA.x + ox - 100, ARENA.y + oy - ARENA.r - 10);
      // town
      g.fillStyle = 'rgba(15,23,42,0.85)';
      g.fillRect(TOWN.x + ox, TOWN.y + oy, TOWN.w, TOWN.h);
      g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2;
      g.strokeRect(TOWN.x + ox, TOWN.y + oy, TOWN.w, TOWN.h);
      g.fillStyle = 'rgba(226,232,240,0.6)';
      g.fillText('HAVEN · SAFE ZONE', TOWN.x + ox + 14, TOWN.y + oy + 26);
      // smith
      g.fillStyle = '#1e293b'; g.fillRect(SMITH.x + ox - 34, SMITH.y + oy - 26, 68, 52);
      g.strokeStyle = 'rgba(233,185,73,0.8)'; g.lineWidth = 2; g.strokeRect(SMITH.x + ox - 34, SMITH.y + oy - 26, 68, 52);
      g.fillStyle = '#e9b949'; g.font = '700 11px "JetBrains Mono", monospace';
      g.fillText("FABLE'S", SMITH.x + ox - 24, SMITH.y + oy - 2);
      g.fillText('SMITHY', SMITH.x + ox - 22, SMITH.y + oy + 12);
      // chest
      g.fillStyle = '#e9b949'; g.fillRect(CHEST.x + ox - 10, CHEST.y + oy - 8, 20, 16);
      g.fillStyle = 'rgba(233,185,73,0.7)'; g.fillText('STASH', CHEST.x + ox - 18, CHEST.y + oy + 24);
      // guards
      GUARDS.forEach(function (gd) {
        g.beginPath(); g.arc(gd.x + ox, gd.y + oy, 9, 0, 7);
        g.fillStyle = '#e9b949'; g.fill();
        g.strokeStyle = isRed() ? '#f43f5e' : 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(233,185,73,0.7)'; g.fillText('GUARD', gd.x + ox - 18, gd.y + oy - 14);
      });
      // campers
      E.campers.forEach(function (c) {
        g.fillStyle = '#065f46'; g.fillRect(c.x + ox - 20, c.y + oy - 14, 40, 28);
        g.strokeStyle = '#34d399'; g.lineWidth = 2; g.strokeRect(c.x + ox - 20, c.y + oy - 14, 40, 28);
        g.fillStyle = '#6ee7b7'; g.fillText('CAMP', c.x + ox - 15, c.y + oy + 4);
      });
      // bags
      E.bags.forEach(function (b) {
        var pulse = 0.6 + 0.4 * Math.sin(t / 250);
        g.fillStyle = 'rgba(251,191,36,' + pulse + ')';
        g.fillRect(b.x + ox - 7, b.y + oy - 7, 14, 14);
        g.fillStyle = 'rgba(251,191,36,0.8)'; g.fillText('LOOT', b.x + ox - 14, b.y + oy - 12);
      });
      // mobs
      g.font = '600 10px "JetBrains Mono", monospace';
      E.mobs.forEach(function (m) {
        if (m.dead) return;
        var mx = m.x + ox, my = m.y + oy;
        if (mx < -30 || mx > w + 30 || my < -30 || my > h + 30) return;
        var r = 9 + m.lvl * 0.6;
        g.beginPath(); g.arc(mx, my, r, 0, 7);
        g.fillStyle = m.color; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
        if (m.aggro) { g.strokeStyle = '#f43f5e'; g.lineWidth = 2; g.stroke(); }
        if (dist(m, p) < 320) {
          g.fillStyle = 'rgba(226,232,240,0.75)';
          g.fillText(m.name + ' L' + m.lvl, mx - 26, my - r - 6);
          if (m.hp < m.maxHp) {
            g.fillStyle = '#0f172a'; g.fillRect(mx - 16, my - r - 4, 32, 3);
            g.fillStyle = '#f43f5e'; g.fillRect(mx - 16, my - r - 4, 32 * m.hp / m.maxHp, 3);
          }
        }
      });
      // rivals
      E.rivals.forEach(function (rv) {
        if (rv.dead) return;
        if (!rv.danceUntil && Math.random() < 0.0008) rv.danceUntil = t + 4000;
        if (rv.danceUntil && t > rv.danceUntil) rv.danceUntil = 0;
      });
      E.rivals.forEach(function (rv) {
        if (rv.dead) return;
        var rx = rv.x + ox, ry = rv.y + oy;
        var rdance = rv.danceUntil && t < rv.danceUntil;
        if (rdance) { rx += Math.sin(t / 90) * 4; ry += Math.abs(Math.sin(t / 140)) * -5; }
        g.beginPath(); g.arc(rx, ry, 10, 0, 7);
        g.fillStyle = '#f472b6'; g.fill();
        g.strokeStyle = S.flagged ? '#f43f5e' : 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.stroke();
        if (rdance) { g.fillStyle = '#f9a8d4'; g.font = '700 14px Inter'; g.fillText('♪', rx + 12, ry - 14); g.font = '600 10px "JetBrains Mono", monospace'; }
        g.fillStyle = '#f9a8d4';
        g.fillText(rv.name + (S.flagged ? ' ⚔' : ''), rx - 24, ry - 16);
        if (rv.hp < rv.maxHp) {
          g.fillStyle = '#0f172a'; g.fillRect(rx - 16, ry - 13, 32, 3);
          g.fillStyle = '#f472b6'; g.fillRect(rx - 16, ry - 13, 32 * rv.hp / rv.maxHp, 3);
        }
      });
      // bosses (robotic eyes)
      E.bosses.forEach(function (b) {
        if (b.dead) return;
        var bx = b.x + ox, by = b.y + oy;
        var R = b.key === 'twin' ? 18 : 26;
        g.beginPath(); g.arc(bx, by, R, 0, 7);
        g.fillStyle = '#e2e8f0'; g.fill();
        g.strokeStyle = b.key === 'eye' ? '#f43f5e' : '#22d3ee'; g.lineWidth = 3; g.stroke();
        var px2 = Math.cos(t / 400) * R * 0.35, py2 = Math.sin(t / 530) * R * 0.3;
        g.beginPath(); g.arc(bx + px2, by + py2, R * 0.38, 0, 7);
        g.fillStyle = b.key === 'eye' ? '#be123c' : '#0e7490'; g.fill();
        g.beginPath(); g.arc(bx + px2, by + py2, R * 0.16, 0, 7); g.fillStyle = '#020617'; g.fill();
        g.fillStyle = '#fff'; g.font = '700 12px "JetBrains Mono", monospace';
        g.fillText(b.name, bx - 34, by - R - 10);
        g.fillStyle = '#0f172a'; g.fillRect(bx - 30, by - R - 6, 60, 5);
        g.fillStyle = b.key === 'eye' ? '#f43f5e' : '#22d3ee';
        g.fillRect(bx - 30, by - R - 6, 60 * Math.max(0, b.hp) / b.maxHp, 5);
        g.font = '600 10px "JetBrains Mono", monospace';
      });
      // player
      if (S.started) {
        var px = p.x + ox, py = p.y + oy;
        if (!S.dead) {
          var dancing = S.dance && t < S.dance.until;
          if (dancing && t > S.dance.until - 1) S.dance = null;
          var moonwalk = dancing && S.dance && S.dance.name === 'Zero-G Moonwalk';
          if (dancing) {
            if (moonwalk) { px += Math.sin(t / 220) * 14; py += Math.sin(t / 110) * -6; }
            else { px += Math.sin(t / 90) * 5; py += Math.abs(Math.sin(t / 130)) * -8; }
          }
          var swing = t < p.swing;
          // dodge trail
          if (t < p.dodgeUntil + 150) {
            g.globalAlpha = 0.25;
            g.beginPath(); g.arc(px - p.dvx * 18, py - p.dvy * 18, 10, 0, 7);
            g.fillStyle = '#22d3ee'; g.fill(); g.globalAlpha = 1;
          }
          g.beginPath(); g.arc(px, py, 11, 0, 7);
          g.fillStyle = '#22d3ee'; g.fill();
          g.strokeStyle = S.flagged ? '#f43f5e' : (S.gender === 'f' ? '#f472b6' : '#e2e8f0');
          g.lineWidth = 2.5;
          if (S.flagged) g.setLineDash([4, 3]);
          g.stroke(); g.setLineDash([]);
          if (dancing) {
            g.fillStyle = '#a5f3fc'; g.font = '700 15px Inter';
            g.fillText('♪', px + 16 + Math.sin(t / 150) * 4, py - 26 - (t % 600) / 60);
            g.fillText('♫', px - 22 - Math.sin(t / 180) * 4, py - 18 - (t % 800) / 80);
            g.font = '700 12px "JetBrains Mono", monospace';
            if (moonwalk) {
              g.globalAlpha = 0.3;
              g.beginPath(); g.arc(px - Math.sin(t / 220) * 22, py, 9, 0, 7);
              g.fillStyle = '#22d3ee'; g.fill(); g.globalAlpha = 1;
            }
          }
          if (swing) {
            var fa2 = Math.atan2(p.fy, p.fx);
            g.strokeStyle = 'rgba(34,211,238,0.75)'; g.lineWidth = E.player.combo === 3 ? 6 : 3;
            g.beginPath(); g.arc(px, py, 27, fa2 - 0.85, fa2 + 0.85); g.stroke();
          }
          // facing tick
          g.strokeStyle = 'rgba(226,232,240,0.5)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(px + p.fx * 12, py + p.fy * 12); g.lineTo(px + p.fx * 18, py + p.fy * 18); g.stroke();
          g.fillStyle = isRed() ? '#f43f5e' : '#e2e8f0';
          g.font = '700 12px "JetBrains Mono", monospace';
          if (isRed()) { g.shadowColor = '#f43f5e'; g.shadowBlur = 8; }
          g.fillText(S.name, px - S.name.length * 3.5, py - 20);
          g.shadowBlur = 0;
          // SupO orb
          var st2 = supoTier();
          var dspd = (S.dance && t < S.dance.until) ? 130 : 700;
          var sx = px + 24 + Math.sin(t / dspd) * (dspd < 200 ? 14 : 3), sy = py - 22 + Math.cos(t / (dspd < 200 ? 100 : 500)) * (dspd < 200 ? 10 : 4);
          g.shadowColor = '#22d3ee'; g.shadowBlur = 12;
          g.beginPath(); g.arc(sx, sy, st2.r, 0, 7);
          g.fillStyle = '#a5f3fc'; g.fill();
          g.shadowBlur = 0;
          var rings = SUPO_TIERS.indexOf(st2);
          for (var ri2 = 1; ri2 <= rings; ri2++) {
            g.strokeStyle = 'rgba(34,211,238,' + (0.5 - ri2 * 0.1) + ')';
            g.lineWidth = 1.5;
            g.beginPath(); g.arc(sx, sy, st2.r + ri2 * 4, t / 900 + ri2, t / 900 + ri2 + 4.5); g.stroke();
          }
          // fishing line
          if (S.fishing) {
            g.strokeStyle = 'rgba(165,243,252,0.6)'; g.lineWidth = 1;
            var la = Math.atan2(LAKE.y - p.y, LAKE.x - p.x);
            g.beginPath(); g.moveTo(px, py);
            g.lineTo(px + Math.cos(la) * 70, py + Math.sin(la) * 70 + Math.sin(t / 300) * 4);
            g.stroke();
          }
        }
      }
      // minimap
      var MW = 176, MH = 132, mx0 = w - MW - 14, my0 = h - MH - 14, sc = MW / W;
      g.fillStyle = 'rgba(15,23,42,0.75)'; g.fillRect(mx0, my0, MW, MH);
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.strokeRect(mx0, my0, MW, MH);
      g.fillStyle = 'rgba(233,185,73,0.5)'; g.fillRect(mx0 + TOWN.x * sc, my0 + TOWN.y * sc, TOWN.w * sc, TOWN.h * sc);
      g.fillStyle = 'rgba(14,116,144,0.8)'; g.beginPath(); g.arc(mx0 + LAKE.x * sc, my0 + LAKE.y * sc, LAKE.r * sc, 0, 7); g.fill();
      g.strokeStyle = 'rgba(245,158,11,0.8)'; g.beginPath(); g.arc(mx0 + ARENA.x * sc, my0 + ARENA.y * sc, ARENA.r * sc, 0, 7); g.stroke();
      if (E.campers.length) { g.fillStyle = '#34d399'; g.fillRect(mx0 + E.campers[0].x * sc - 2, my0 + E.campers[0].y * sc - 2, 4, 4); }
      g.fillStyle = '#22d3ee'; g.beginPath(); g.arc(mx0 + p.x * sc, my0 + p.y * sc, 3, 0, 7); g.fill();

      // blit with cross-eye effect
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      if (t < S.crossEyedUntil) {
        ctx.globalAlpha = 0.65; ctx.drawImage(buf, -9, 0);
        ctx.globalAlpha = 0.65; ctx.drawImage(buf, 9, 2);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(buf, 0, 0);
      }
    }
  };
  if (!customElements.get('dream-world')) customElements.define('dream-world', CE);
})();
