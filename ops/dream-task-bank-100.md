# Dream ONLINE Task Bank - 100 Pullable Tasks

Purpose: keep Codex and Claude supplied with useful Dream ONLINE work without drifting into
random installs, noisy reports, secrets, classified material, or public-copy risk.

Use rule:

- Pick the highest priority safe task that matches the current toolchain.
- Prefer small completed slices over giant unfinished epics.
- Do not use direct competitor name drops.
- Do not use `sandbox` jargon in player-facing language.
- Do not read or expose secrets.
- Do not touch classified OneDrive plot material.
- Do not deploy, charge, delete, or install heavyweight interactive software without Joshua's explicit approval.

Priority tags:

- P0: first-playable foundation.
- P1: core system expansion.
- P2: polish, scale, or later production.

Status tags:

- Ready: can be worked with current local tools.
- Blocked: needs Unreal install, account login, credentials, assets, or explicit approval.
- Research: gather sources and propose, no code edit by default.

## P0 - First Playable Foundation

1. P0 Ready - Define the first playable promise in one page: movement, one enemy, one gathering node, one NPC guide, one world event.
2. P0 Ready - Write the first 15-minute player journey from login to first combat, first resource, first NPC memory event.
3. P0 Ready - Create a vertical-slice acceptance checklist with pass/fail criteria for movement, combat, gathering, NPC response, and persistence.
4. P0 Ready - Define local prototype ports and services so DreamOps Bridge, Live NPC Lab, and future game server do not collide.
5. P0 Ready - Draft the first playable data contracts for player, NPC, world event, item, resource node, and ability.
6. P0 Ready - Create the first playable risk register: engine missing, C++ toolchain missing, art assets missing, AI cost unknown, network scale unknown.
7. P0 Ready - Build a local JSON seed file for the first zone: zone id, landmarks, NPC ids, node ids, enemy ids, and event hooks.
8. P0 Ready - Write the first test script for NPC dialogue, world event logging, and memory retrieval in the Live NPC Lab.
9. P0 Ready - Add a compact `STATE.md` for the Dream local prototype with current service URLs, task bank path, and no secrets.
10. P0 Ready - Create a simple local command reference for starting and stopping DreamOps Bridge and Live NPC Lab.

## P0 - Live NPC And AI Runtime

11. P0 Ready - Expand Live NPC Lab with NPC profiles: guide, guard, merchant, gatherer, and world-recovery rider.
12. P0 Ready - Add memory scopes to Live NPC Lab: player memory, NPC memory, zone memory, and global event memory.
13. P0 Ready - Add safe action proposals to NPC replies: `suggest_hint`, `suggest_marker`, `suggest_event_pause`, `suggest_quest_note`.
14. P0 Ready - Add an allowlist so NPCs can only propose approved game actions, not execute arbitrary commands.
15. P0 Ready - Add local memory compaction: summarize older JSONL dialogue after N entries without deleting raw logs.
16. P0 Ready - Add a mock retrieval layer that searches local lore snippets before replying.
17. P0 Ready - Create provider interface stubs for OpenAI, 1min.ai, local Ollama, and mock provider without adding keys.
18. P0 Ready - Define cloud model routing rules: when to use local, cheap cloud, premium cloud, or no model.
19. P0 Ready - Add cost guard fields to AI calls: max tokens, max calls per player per hour, timeout, fallback.
20. P0 Ready - Write AI failure behavior rules: no response, slow response, unsafe output, rate limit, provider outage.

## P0 - Combat Feel

21. P0 Research - Define action-combat input grammar using plain inputs: forward plus modifier, back plus mouse, dodge, block, sprint, cancel.
22. P0 Ready - Document hit-confirm requirements: impact pause, sound, VFX, enemy reaction, stamina cost, and server validation.
23. P0 Ready - Create ability data schema for name, input, stamina, cooldown, movement lock, hit shape, damage type, and tags.
24. P0 Ready - Draft starter weapon roles: fast blade, heavy hammer, spear, bow, and focus tool.
25. P0 Ready - Define stamina rules for sprint, dodge, block, heavy attack, gather action, and emergency escape.
26. P0 Ready - Define animation cancel rules: allowed cancels, forbidden cancels, stamina penalties, and PvP fairness.
27. P0 Research - Research modern action-combat onboarding patterns without direct competitor labels.
28. P0 Ready - Write enemy behavior spec for one starter enemy: idle, patrol, notice, attack, stagger, flee, reset.
29. P0 Ready - Define PvE damage rules for early prototype: health, armor, poise, stagger, resist, recovery.
30. P0 Blocked - Implement first combat pawn in Unreal after engine/toolchain installation.

## P0 - World And Level Design

31. P0 Ready - Write the first zone brief: readable landmark, safe camp, danger road, resource field, and locked mystery gate.
32. P0 Ready - Create first zone layout in text: spawn point, guide NPC, resource nodes, enemy pockets, retreat route, and vista.
33. P0 Ready - Define navigation readability rules: visible exits, landmarks, safe zones, optional paths, and no minimap dependency.
34. P0 Ready - Define first three world events: gate flicker, caravan delay, resource bloom.
35. P0 Ready - Add world event contract fields: event id, zone, trigger, duration, player impact, rollback plan.
36. P0 Ready - Draft live-world state machine: calm, active, threatened, damaged, recovering.
37. P0 Ready - Create day/night rules for first prototype: visual state, NPC behavior, enemy behavior, resource behavior.
38. P0 Research - Research open-world streaming constraints for first prototype scale using official Unreal docs only.
39. P0 Ready - Draft first World Partition plan for later Unreal work: grid types, always-loaded layer, gameplay actors.
40. P0 Blocked - Build greybox first zone in Unreal after engine install.

## P1 - Life Skills And Economy

41. P1 Ready - Define core resources for first playable: ore, herb, fish, timber, meal, repair part.
42. P1 Ready - Write gathering node spec: tool required, action time, durability cost, fail case, rare proc, cooldown.
43. P1 Ready - Define processing chain: raw resource to refined resource to crafted item.
44. P1 Ready - Draft cooking loop: ingredient categories, recipe discovery, batch cooking, quality, and spoilage rules.
45. P1 Ready - Draft fishing loop: active cast, timing window, AFK catch, inventory pressure, and market sink.
46. P1 Ready - Define worker-node loop: hire, assign, travel time, yield, fatigue, upkeep.
47. P1 Ready - Define repair and durability economy: item wear, repair cost, field repair limits, paid convenience boundary.
48. P1 Ready - Define storage rules: baseline treasury slot, paid convenience slot, earnable upgrades, and anti-pay-to-win limits.
49. P1 Ready - Define pet rules: loot convenience, cosmetic behavior, earnable pets, and no combat-stat dominance.
50. P1 Ready - Create economy source/sink matrix for currency, resources, durability, storage, crafting, and travel friction.

## P1 - Monetization Without Pay-To-Win

51. P1 Ready - Write monetization constitution: convenience and cosmetics only, no PvP power, no rare-drop control.
52. P1 Ready - Define paid bag upgrades with earnable equivalents and visible fairness notes.
53. P1 Ready - Define costume categories: social, profession, seasonal, event-earned, and paid.
54. P1 Ready - Define portable repair convenience with cooldown and non-combat restrictions.
55. P1 Ready - Define subscription-like convenience buckets capped at small XP/life-skill boosts.
56. P1 Ready - Create a monetization review checklist for every future item.
57. P1 Research - Research console store policy considerations for subscriptions, cosmetics, and virtual currency.
58. P1 Ready - Draft refund-safe item descriptions in plain player language.
59. P1 Ready - Define account entitlement schema for paid items without hardcoding platform store logic.
60. P1 Blocked - Implement payment/account entitlement backend after platform and legal direction.

## P1 - Multiplayer, Safety, And PvP

61. P1 Ready - Define server-authoritative rules for movement, combat, inventory, gathering, crafting, and trading.
62. P1 Ready - Draft PvP flagging states: safe, willing, hostile, corrupted, bounty, protected.
63. P1 Ready - Define anti-grief rules for low-level zones, gathering zones, and repeated kills.
64. P1 Ready - Draft bounty loop: report, track, reward, cooldown, exploit prevention.
65. P1 Ready - Define item durability loss on PvP death without punishing new players too hard.
66. P1 Ready - Define trade safety rules: escrow, confirmation, fraud flags, and rollback evidence.
67. P1 Research - Research official Unreal replication options for large shared worlds and action combat.
68. P1 Ready - Create network relevancy budget assumptions for players, NPCs, items, resources, and VFX.
69. P1 Ready - Define suspicious action logs: impossible movement, impossible hits, rapid trade abuse, duplicated item.
70. P1 Blocked - Implement dedicated server prototype after Unreal source/C++ path is ready.

## P1 - UX, HUD, And Onboarding

71. P1 Ready - Define HUD principles: action first, low clutter, world-readable, controller-friendly.
72. P1 Ready - Design first HUD wireframe in text: health, stamina, skill inputs, target read, gathering prompt, NPC guide.
73. P1 Ready - Draft controller input map for combat, gathering, inventory, chat, and quick guide.
74. P1 Ready - Define onboarding beats: move, camera, dodge, light attack, heavy attack, gather, speak, craft, repair.
75. P1 Ready - Write first-session prompts in human language with no developer slang.
76. P1 Ready - Define accessibility requirements: remapping, subtitles, colorblind-safe indicators, camera shake control.
77. P1 Ready - Define social UI: nearby chat, party invite, trade request, guild invite, safety report.
78. P1 Ready - Draft inventory UX rules: two baseline bags, paid convenience bags, sorting, search, lock item.
79. P1 Ready - Draft treasury UX rules: baseline slot, paid slot, earnable expansion, item warnings.
80. P1 Blocked - Build interactive UI prototype after frontend/game UI target is selected.

## P1 - Audio And World Feel

81. P1 Ready - Define sonic pillars for Dream: alive, dangerous, warm, strange.
82. P1 Ready - Draft first-zone soundscape: dawn wind, distant work, threat stingers, guide pulse, resource shimmer.
83. P1 Ready - Define adaptive music states: calm, gathering, danger, combat, recovery, world event.
84. P1 Ready - Define combat audio feedback: swing, hit, block, dodge, stagger, low stamina, enemy tell.
85. P1 Ready - Define gathering audio feedback: tool strike, resource quality, rare find, tool wear.
86. P1 Ready - Define NPC guide voice style: concise, in-world, protective, never vendor-branded.
87. P1 Ready - Draft audio event naming convention for future middleware or Unreal native audio.
88. P1 Research - Research native Unreal audio versus middleware tradeoffs for first playable.
89. P1 Ready - Define audio performance budget assumptions for PC first and console later.
90. P1 Blocked - Implement audio prototype after game engine is installed.

## P2 - Console, Cloud, And Production Readiness

91. P2 Research - Research current console submission basics for online games, accounts, privacy, chat, and purchases.
92. P2 Ready - Draft cloud-play readiness assumptions: controller-first UI, latency budget, session resume, server region.
93. P2 Ready - Define account model: player id, platform id, display name, entitlement id, safety flags.
94. P2 Ready - Define telemetry events: session start, combat test, gathering test, NPC interaction, world event, crash.
95. P2 Ready - Define privacy-safe telemetry rules: no raw secrets, no private chat logs by default, no unnecessary PII.
96. P2 Ready - Draft environment separation: local, dev, staging, production, and founder-only test.
97. P2 Ready - Define backup and rollback plan for world state, player state, item economy, and NPC memory.
98. P2 Ready - Define observability dashboard needs: health, error rate, NPC cost, event queue, economy drift.
99. P2 Research - Research AI safety guardrails for live NPCs in games using official provider docs and platform requirements.
100. P2 Ready - Create milestone roadmap from task bank: first playable, internal alpha, closed test, public test, console prep.

## Dream Event Expansion Queue

101. P1 Ready - Design a wilderness-to-city Dream event using layers: terrain mood, props, NPC schedules, lighting, audio, and safety boundaries.
102. P1 Ready - Define C0D3X sky-rider event rules: when the world-recovery rider appears, what players see, what systems it signals, and what it never promises.
103. P1 Ready - Draft dragon-scale companion rules as a future prestige pet or traversal fantasy without pay-to-win combat power.
104. P1 Ready - Define live-event readability rules so players understand when a place has changed, why it changed, and how to leave safely.
105. P1 Research - Research event-layering patterns in Unreal using Data Layers, World Partition, lighting scenarios, audio states, and NPC schedule swaps.

## Day/Night Economy, Boosters, Pets, And Market Queue

106. P1 Ready - Model day/night modifier tables for life-skill EXP, monster EXP, monster HP, monster damage, and gathering efficiency.
107. P1 Ready - Draft Nightfall risk messaging so players understand why monsters hit harder and reward more at night.
108. P1 Ready - Define PvE death EXP loss curve with early-level forgiveness, higher-level minimum loss, and level-cap assumptions.
109. P1 Ready - Define level 20 combat unlock package: first expressive skill, AOE identity, solo grind path, and party grind path.
110. P1 Ready - Create booster item schema for solo seals, solo scrolls, party seals, and party scrolls.
111. P1 Ready - Design diminishing-return stacking math so multiple boosters never create runaway 400% progression states.
112. P1 Ready - Draft clear player-facing booster copy with duration, scope, cap, and stacking fine print.
113. P1 Ready - Define pet capability table: manual loot baseline, loot companion, faster pickup companion, repair companion, bear, and hawk.
114. P1 Ready - Review pet monetization boundary so paid pets sell convenience/style, not combat power or uncapped rare-drop control.
115. P1 Ready - Design Storage Runner contract: one transaction, limits, cooldowns, fees, storage destination, and no fast-travel bypass.
116. P1 Ready - Design Market Runner contract: one buy/list/retrieve transaction, market lock, fees, cooldowns, and no unlimited remote trading.
117. P1 Ready - Define marketplace schema: listings, buy orders, price history, item categories, taxes, audit trail, and suspicious trade flags.
118. P1 Ready - Draft economy exploit tests for boosters, pets, runner transactions, market manipulation, and item duplication.

## Level 45 Awakening Queue

119. P1 Ready - Design Nightmare Class awakening for dark melee assassin paths: fantasy, visuals, inputs, mobility, burst windows, PvP risks.
120. P1 Ready - Design DREAM Class awakening for mage/projectile paths: fantasy, visuals, projectile grammar, field control, group utility, PvP risks.
121. P1 Ready - Define level 45 awakening unlock flow: level gate, class trial, item requirement, reset rules, and player-facing ceremony.
122. P1 Ready - Create awakened-skill balance rules so the fantasy feels dramatically stronger without a literal permanent 5x raw damage break.
123. P1 Ready - Define visual identity upgrades for awakening: silhouette, idle stance, combat trails, UI frame, skill effects, and social presence.

## PvP Level Scaling Queue

124. P1 Ready - Design simple PvP level-gap formula where level dominates and extreme gaps can one-shot in valid PvP.
125. P1 Ready - Define cooldown modifier rules for fast kits, burst kits, missed awakened skills, and punish windows.
126. P1 Ready - Define range-vs-melee modifier rules for distance advantage, confirmed engage, kite windows, and gap-close success.
127. P1 Ready - Define valid PvP states separately from anti-grief protection so level power matters without starter-zone abuse.
128. P1 Ready - Create PvP player-facing explanation: level matters, risk matters, starter protection exists, and no hidden equalization promise.
129. P1 Ready - Design Pink Flag to Red Name PK state machine: trigger, 3-kill threshold, timers, UI, and clear conditions.
130. P1 Ready - Design Red Name guard response: protected area rules, ranged/magic/projectile guard one-shot behavior, warning indicators, and safe exits.
131. P1 Ready - Design Red Name item-drop rules: 50% carried/drop-eligible items, loot ownership, protected items, and exploit prevention.
132. P1 Ready - Design structured war PvP gear-risk rules for node wars, castle sieges, city sieges, and guild wars, separate from Red Name open-world PK.

## Repo, Software, And Character Creation Queue

133. P0 Ready - Maintain private repo hygiene: ignore envs, backups, logs, local agent state, and unreviewed auth configs.
134. P0 Ready - Expand README with current first-playable links, local prototype commands, and safe contribution boundaries.
135. P0 Ready - Create safe setup docs for contributors without exposing secrets or classified material.
136. P1 Ready - Expand character creation presets for five starter paths and ten appearance presets.
137. P1 Ready - Define character profile JSON: appearance, voice, starter path, life-skill interest, awakening preview, and entitlement-safe cosmetics.
138. P1 Ready - Draft first character creation UX flow for keyboard/mouse and controller.
139. P1 Ready - Define software install checklist for Unreal, Visual Studio C++, CMake, Git LFS, and optional art/audio tools.
140. P1 Blocked - Install Unreal and Visual Studio C++ toolchain after Joshua approves the long interactive install window.

## Pull Order Recommendation

Start with tasks 1-10, then 11-20, then 21-40. Do not start heavy engine work until
Unreal, Visual Studio C++ tools, and the target engine version are installed and confirmed.
