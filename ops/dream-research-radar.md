# Dream ONLINE Research Radar

Status: active recurring Codex app automation
Cadence: every 6 hours
Workspace: `E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG`
Automation id: `dream-online-research-radar`

## Purpose

Keep Dream ONLINE supplied with high-signal research and creative system ideas without
turning the repo into noisy agent drift. The radar researches current MMORPG,
live-world open-world MMO, action-combat, life-skill economy, live-AI NPC, player-safety,
audio, world-building, multiplayer networking, UX, and pay-for-convenience trends.

Each run should produce a compact founder-facing report, not a file edit.

## Required lenses

- Game design: player feeling, loop quality, tuning levers, failure states.
- Unreal world building: World Partition, HLOD, PCG, streaming, traversal scale.
- Unreal systems engineering: C++/Blueprint split, GAS, Nanite/Lumen constraints.
- Unreal multiplayer architecture: server authority, replication, prediction, anti-cheat.
- Unreal technical art: materials, Niagara, PCG determinism, visual budgets.
- Game audio: adaptive music, diegetic feedback, spatial sound, voice budgets.
- Level design: readability, encounter flow, landmarks, safe/fallback spaces.
- Narrative design: world coherence, live NPC consequences, non-expository dialogue.
- UX architecture: readable HUD, onboarding, accessibility, mobile/console-adjacent clarity.
- Trend research: current market signals, competitor moves, player expectation shifts.

## Report contract

Each radar report should include:

- Source links for any external claims.
- Five to ten concrete feature or system ideas.
- Why each idea fits or does not fit Dream ONLINE.
- Prototype priority: now, later, reject, or watch.
- Implementation risk: low, medium, high, or research-only.
- Systems touched: combat, world, AI, economy, PvP, UI, audio, backend, ops, or safety.
- Missing questions for Joshua, Codex, or Claude.

## Decision rules

- Reports do not authorize code changes by themselves.
- Prototype work starts only after Joshua or the active lead picks a report item.
- No lower-capability model decides doctrine, monetization rules, production architecture,
  launch gates, or founder authority.
- Ideas must preserve pay-for-convenience rules: no pay-to-win combat power, no rare-drop
  control, no PvP dominance, no economy dominance.
- Paid storage, bags, pets, costumes, repair convenience, and similar friction reducers
  are valid only when earnable in-game equivalents also exist.

## Boundaries

- Do not read, copy, summarize, or expose classified OneDrive plot material.
- Do not read or print secrets or populated `.env` values.
- Do not add charity, split, private accounting, or vendor/TOS language to public-facing
  game copy.
- Avoid direct competitor name drops in active design docs, reports, task titles, and
  public copy. Describe mechanics generically and keep Dream terminology world-native.
- Keep in-game names fictional and world-native.
- Keep reports compact enough to preserve context.

## First backlog lanes to watch

- Action-combat input grammar, hit-confirm feel, stamina pressure, and animation cancel rules.
- Deep life-skill systems with AFK-safe loops, worker nodes, fishing, cooking, processing,
  farming, durability, and repair sinks.
- Dream Shift day/night prototype that hides terrain/city layer changes behind a controlled
  transition instead of promising impossible seamless world swaps first.
- Live NPC memory budget, cloud/local model routing, safety controls, and fallback behavior.
- PvP flagging, corruption, bounty, item durability, repair cost, and anti-griefing logic.
- C0D3X world-recovery fantasy mapped to real DreamOps checkpoint, rollback, hotfix, and
  live-event control tools.
- HUD/readability for action combat plus life-skill loops without MMO spreadsheet clutter.
- Adaptive soundscape that makes danger, time of day, AI events, and player state legible.
