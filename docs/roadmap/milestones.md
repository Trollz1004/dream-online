# DREAM ONLINE Milestone Roadmap

Status: draft

Purpose: keep Dream work sequenced so contracts, docs, prototypes, and future Unreal work
move toward a playable game instead of expanding sideways.

## Milestone 0: Private project foundation

Goal: clean repo, safe boundaries, local prototype contracts.

Done when:

- Private GitHub repo exists.
- Secrets, backups, local session logs, and unrelated project drift are ignored.
- README, contributing, security, brand, and task-bank docs exist.
- Live NPC Lab exists locally.
- Data contracts exist for character, combat, progression, life skills, PvP, inventory,
  marketplace, boosters, pets, world events, and NPC memory.
- Local contract index exists.
- CI checks exist for Live NPC Lab smoke and contract validation.

Current status: mostly complete.

## Milestone 1: First Gate playable proof

Goal: prove the core game feel in one small zone.

Must prove:

- Movement is readable.
- One starter enemy is fun enough to repeat.
- One gather action works.
- Inventory and durability are visible.
- Guide NPC is useful without over-talking.
- Day/Nightfall changes player behavior.
- Gate Flicker or Resource Bloom shows the world can react.

Primary references:

- `docs/testing/first-playable-acceptance.md`
- `docs/testing/first-playable-walkthrough.md`
- `docs/tech/unreal-first-playable-map.md`
- `game/server/live-npc-lab/data/first-zone.seed.json`

Exit criteria:

- 15-minute walkthrough can be completed without designer explanation.
- Tester understands where to go, what to do, and why Nightfall matters.
- No paid-power prompts exist in the first playable.

## Milestone 2: Internal combat and life-skill loop

Goal: make repeat play meaningful.

Build:

- Five starter paths: blade, hammer, spear, bow, focus.
- Level 20 combat shift preview.
- Four resource node types.
- One processing or cooking chain.
- Repair loop.
- Storage Runner and Market Runner placeholders.
- First marketplace mock listing and buy-order flow.

Exit criteria:

- Player can run a 30-minute loop: gather, fight, repair, store, market-check, repeat.
- Stamina, cooldowns, durability, and inventory pressure are readable.
- Nightfall risk is useful, not just annoying.

## Milestone 3: Awakening identity prototype

Goal: prove level 45 feels like a visible identity spike.

Build:

- Nightmare Class prototype for dark melee assassin path.
- DREAM Class prototype for mage/projectile path.
- Visual identity changes: silhouette, idle stance, combat trails, skill effects, UI frame.
- Awakening trial placeholder.
- Separate PvP tuning profile for awakened skills.

Exit criteria:

- Awakening feels dramatically more expressive without requiring a locked 5x raw damage
  multiplier.
- Equal-level PvP assumptions remain tunable.
- Awakening visuals make a player stand out from a distance.

## Milestone 4: Live-world event prototype

Goal: make the world feel alive and recoverable.

Build:

- Gate Flicker.
- Resource Bloom.
- Nightfall Surge.
- Wilderness-to-city founder-test layer.
- World recovery event with visible C0D3X-style recovery fiction.
- Rollback/audit support before event effects become serious.

Exit criteria:

- Players understand a live event is happening.
- Events can pause or roll back cleanly in prototype data.
- Guide NPC can explain current world state.
- Event layers do not promise unbuilt full-world replacement.

## Milestone 5: PvP risk prototype

Goal: prove high-stakes risk without starter-zone abuse.

Build:

- Pink Flag state.
- Red Name state after 3 player kills while Pink Flagged.
- 3 logged-in-hour clear rule.
- Guard one-shot behavior in protected areas.
- 50% drop-eligible item risk for Red Name death.
- Structured war placeholder for node wars, castle sieges, city sieges, and guild wars.

Exit criteria:

- Level gap advantage is clear.
- Red Name risk is clear.
- Starter protection and anti-grief rules are separate from valid PvP danger.
- Structured war risk is opt-in and visibly explained.

## Milestone 6: Closed internal test

Goal: test repeatability with a small trusted group.

Must have:

- Account-safe test profiles.
- No public payment flow.
- No secrets in client.
- Crash/error logging.
- Basic telemetry that avoids unnecessary personal data.
- Feedback template.

Exit criteria:

- At least 5 tester sessions complete the walkthrough.
- Top 10 confusion points are recorded.
- Combat, gathering, guide, Nightfall, and inventory each have one clear fix pass.

## Milestone 7: Public test preparation

Goal: prepare for controlled external visibility.

Must have:

- Public-safe site copy.
- Privacy, terms, community, and refund/account language if payments exist.
- Safety/reporting path.
- Support path.
- Marketplace exploit review.
- AI/NPC safety review.
- Paid convenience review.

Exit criteria:

- Public claims match what exists.
- No private accounting, split, charity, vendor, or unrelated business-platform language.
- No direct competitor name drops.
- No paid combat power.

## Milestone 8: Console and cloud-readiness prep

Goal: keep the future platform path realistic.

Prepare:

- Controller-first UI.
- Large text/readability.
- Cloud-play latency assumptions.
- Account identity boundary.
- Store entitlement abstraction.
- Chat/safety moderation plan.
- Performance budgets.

Exit criteria:

- First playable can be controlled without keyboard-only assumptions.
- UI and prompts are readable at TV distance.
- Store entitlements remain abstract and platform-safe.

## Current next best work

1. Validate local Live NPC Lab endpoints when Joshua requests a check pass.
2. Freeze First Gate scope before installing Unreal.
3. Install Unreal/Visual Studio/CMake only during an approved long interactive window.
4. Build movement and one hit-confirm loop before adding more systems.
