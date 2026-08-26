# PROJECT DREAM — Fable Ultra Code + Codex Master Builder Dispatch

**Status:** Founder-directed implementation doctrine  
**Primary senior builders:** Fable Ultra Code + OpenAI Codex  
**Primary live-agent runtime:** Hermes  
**Primary inference fabric:** OmniRoute  
**Engine direction:** Unreal Engine  
**Purpose:** Build DREAM as a living open-world action MMORPG without architectural drift.

> This document captures the current founder-directed DREAM doctrine from the design sessions. Existing repository systems remain evidence to inspect and reconcile, not material to overwrite blindly.

---

## 1. Builder contract

Fable Ultra Code and Codex are peer senior builders. Neither AI outranks the other. Fable may implement aggressively; Codex should receive review-ready work rather than raw generated output.

Before material changes: inspect repository state, services, listeners, worktrees, Hermes, OmniRoute, Unreal/MCP tooling, Paperclip, databases, existing DREAM prototypes, and tests. Preserve good work. Do not invent state.

For every meaningful handoff record: SUMMARY, FILES CHANGED, WHY, ARCHITECTURAL DECISIONS, TESTS, SECURITY CHECK, KNOWN LIMITATIONS, OPEN QUESTIONS, ROLLBACK METHOD, NEXT ACTION.

## 2. Root game vision

DREAM Online is an open-world sandbox MMORPG with BDO-class systemic depth but its own identity. It is action combat, not traditional tab targeting. It emphasizes skill expression, meaningful i-frames, persistent geography, world bosses, miniboss farming, guild conflict, node wars, life skills, deterministic progression, player markets, visible earned prestige, live NPC memory, and player-created history.

Core world direction:

- one persistent open-world philosophy
- no fast travel
- avoid routine instancing as the foundation
- geography and travel matter
- action combat and readable hitboxes/telegraphs
- i-frame mastery matters
- random-spawn minibosses
- large multiplayer world bosses with mechanics/phases, not merely inflated HP
- no destructive enhancement RNG
- no Memory Fragment-style repair loop
- no pay-to-win
- no pay-for-power

## 3. Action combat

Combat rewards aim, positioning, timing, reactions, encounter knowledge, animation reading, iframe mastery, coordination, terrain, and target priority.

Possible mechanics include manual hitboxes, projectile travel, iframe dodges, blocks, parries, interrupts, animation commitment, weak-point windows, boss telegraphs, and movement-based avoidance. Soft targeting may exist for accessibility but must not turn DREAM into tab-target combat.

## 4. CrossEyed Duo

Founder canon includes **OpEnAeYe** and **GeminEyE**, early farmable open-world minibosses that can also participate in larger shared-world events.

OpEnAeYe themes: focus, surveillance, precision, beams, prediction, tracking. Candidate mechanics: Focus Beam, Prediction Shot, Scan Mark, line-of-sight challenges and target baiting.

GeminEyE themes: mirrors, clones, duplication, misdirection and repositioning. Candidate mechanics: Mirror Clone, Twin Blink, false telegraphs and split pressure.

Their synchronized **CrossEyed** state can use overlapping telegraphs, chained attacks, clone pressure and crossfire. Visual effects must remain accessibility-safe.

Boss progression should favor boss materials, deterministic upgrade components, cosmetics, trophies, titles, prestige and profession inputs. Existing successful progress must not be randomly destroyed by enhancement clicks.

## 5. Live NPC moat

The defining loop is:

```text
PLAYER/WORLD ACTION
→ STRUCTURED EVENT
→ SALIENCE FILTER
→ NPC/AGENT SELECTION
→ MEMORY RETRIEVAL
→ HERMES
→ OMNIROUTE INFERENCE
→ STRUCTURED RESPONSE
→ VALIDATION
→ DIALOGUE/SAFE ACTION
→ MEMORY WRITE-BACK
→ FUTURE CONSEQUENCE
```

The objective is not AI chatter. The objective is the player repeatedly wondering: **“Wait, did that NPC actually notice what I did?”** and later **“It remembers me.”**

Silence is valid. Never call a model for every event.

Examples of meaningful moments: bosses notice repeated dodges or failures; merchants recognize regulars; NPCs remember town defense; bosses privately mock absurd behavior; factions remember player actions; guild conflicts become history; Sup@ recalls old victories and losses.

## 6. Hermes runtime

Hermes is the preferred persistent NPC-agent runtime unless inspection proves another implementation is better. Use durable bot identity, persona, skills, bounded tools, groups, persistent memory, scheduled cognition and model routing through OmniRoute.

**NPC identity is not model identity.** A persistent NPC can use different inference providers while retaining the same UUID, persona, relationships, memories, permissions and canon.

Development agents may receive approved repo/test/Unreal-MCP/build access. Runtime NPCs must never receive unrestricted shell, source control, CI/CD, Unreal Editor, database administration, payments, secrets or arbitrary MCP access.

Use hierarchical/group cognition rather than one permanently heavy model process per NPC. Example: OpEnAeYe + GeminEyE + Encounter Director. A town can have Mayor, Blacksmith, Merchant, Innkeeper, Guard Captain, Guards and Historian with a town-level synthesizer.

## 7. Event vocabulary

Normalize world events. Initial vocabulary may include:

```text
player.entered_region
player.emote
player.taunted
player.revived_player
player.saved_player
player.perfect_dodge
player.failed_dodge
player.parried
player.interrupted_boss
player.died
player.died_repeatedly
player.discovered_location
player.crafted_item
player.gathered_rare_resource
player.defeated_boss
player.won_duel
player.lost_duel
pvp.player_killed
vengeance.created
vengeance.party_formed
vengeance.target_spotted
vengeance.hunt_started
vengeance.target_escaped
vengeance.completed
vengeance.failed
boss.spawned
boss.phase_changed
boss.enraged
boss.defeated
town.attacked
town.defended
node.contested
node.captured
node.lost
guild.declared_war
guild.won_war
economy.price_spike
economy.anomaly_detected
world.rollback_occurred
world.event_started
world.event_completed
```

Events need stable IDs, timestamps, correlation IDs, region, involved entity IDs, structured payloads, privacy/age classifications and salience metadata.

## 8. Vengeance PvP — founder locked

A player killed in eligible open-world PvP receives a Vengeance claim. The victim can form a party of up to **6 total** and hunt the target outside protected safe zones.

Do not make this teleport-to-target or permanent exact GPS. Use imperfect/stale intelligence: last-known region, recent activity, NPC witness reports, tracks, scouts, guild intelligence and world events.

The desired emergent chain is: random kill → revenge → friends → guild interference → feud → node conflict → persistent server history. A ridiculous incident such as an AFK fisherman being killed just outside a safe zone can legitimately become remembered world lore if players escalate it.

Possible prestige: Most Wanted, Vengeance Hunter, Untouchable and delayed-revenge achievements. Never sell vengeance power.

Prevent spawn camping, repeated new-player harassment, safe-zone edge exploits, alt-account farming, leaderboard farming and disconnect exploits without deleting legitimate open-world danger.

## 9. Guilds, nodes and earned prestige

Support prestige tracks for PvP, monster kills, bosses, professions, exploration, guild achievements, node wars, first clears and vengeance. A limited selected icon showcase can appear above a character while full accomplishments remain inspectable.

Weekly Node War Champions may receive a restrained radiant costume/presentation with subtle blue flame. This is earned and never purchasable.

## 10. Monetization doctrine

**NO PAY TO WIN. NO PAY FOR POWER.** Players earn maximum gameplay power.

Money may buy cosmetics, visual variants, account convenience, reduced maintenance, storage expansion, portable services, pet styling/personality and quality-of-life.

Never sell superior maximum damage/defense, cash-exclusive combat stats, cash-only BiS, competitive PvP entitlement, paid boss advantage or a cash-exclusive progression ceiling.

Commercial items should eventually have machine-readable classifications such as POWER_IMPACT, CONVENIENCE_IMPACT, TRADEABILITY, AGE_MODE, ECONOMY_SOURCE and ECONOMY_SINK. Store review should reject prohibited power impact.

## 11. Pets

Gameplay-capable pet functions must be obtainable through ordinary gameplay. Premium pets may provide richer models, animations, emotes, personalities, environmental reactions and pet-to-pet interactions but no superior gameplay ceiling.

Examples: ordinary dragon versus premium fire dragon; ordinary lion versus premium white lion. Same maximum gameplay function, different expression/convenience.

Baseline feed is obtainable through play. Premium convenience can provide auto-feed or longer-duration feed such as 12-hour maintenance while retaining the same buff magnitude. Avoid permanent destruction of paid pets; dramatic faint/RIP presentation can exist without irreversible loss.

## 12. Convenience systems

**Fable Anvil:** portable field repair. NPC repair remains available. Location/friction changes, not power.

**Portable camper/potions:** limited convenience inventory such as 5 red + 5 blue potions, never infinite paid sustain.

**Storage/weight:** provide a meaningful baseline. Paid expansion can support dedicated gatherers/processors/crafters/traders/collectors without deliberately crippling normal players.

## 13. Life skills

Support deep noncombat mastery: gathering, fishing, cooking, alchemy, processing, hunting, training, trading, farming, sailing, crafting and future professions. Profession masters should have genuine economic/social identity.

Progression-speed convenience may exist with careful diminishing stacking. It must not become required competitive power. Maximum combat capability remains earnable through play.

## 14. NEEDs and deterministic economy

NEEDs are an in-game currency/product only. Do not revive DAO/token/investment framing.

Generative AI may observe, explain, analyze and propose. It may not mint/delete/transfer NEEDs, grant arbitrary gear or mutate payment entitlements. Economic mutations are deterministic and authoritative.

## 15. Marketplace / trading house

Marketplace authority must remain outside Hermes. Use deterministic listing, buy-order, sell-order, matching, escrow, settlement, tax, fee, history, anti-abuse and reconciliation services.

Inflation controls may include transaction taxes, listing fees, repair sinks, crafting fees, NPC services, consumables, housing and guild costs. Measure currency creation/destruction, supply, velocity, median prices, wealth distribution, commodity inflation and market volume.

Observer models may flag wash trading, circular trading, impossible inventory changes, duplication, bot listings, manipulation clusters and reconciliation mismatches. Flow is model suspicion → deterministic evidence/rules → incident → review/safe automation. Never ban merely because a model says so.

## 16. THE BAN HAMMER

Founder canon: THE BAN HAMMER is a comedic enforcement presentation layer, not the judge.

Security/anti-cheat reaches a verified enforcement decision first. Ban Hammer then performs an original DREAM rhythmic chant wind-up, obvious anticipation, hammer entrance and stylized comic exit. Use original/licensed audio rather than copying a copyrighted recording.

Age presentation can include CHILD_SAFE cartoon bug/slide/“weeee”, TEEN comic splat/wiper with no gore, and STANDARD stronger stylized windshield gag while remaining comic and accessibility-safe.

The presentation receives only sanitized case/player IDs and presentation codes. Never expose IP addresses, raw anti-cheat evidence, detection methods, credentials or private device identifiers.

Assume guilds will synchronize chat/emotes/fireworks/pets/particle skills to the final beat. Engineer rate limiting, event coalescing, particle budgets, LOD, duplicate-emote suppression and chat throttling so the joke becomes a safe stress test rather than an outage.

## 17. C0D3X + MOLLMA

Founder canon: **C0D3X** is the rollback rider astride **MOLLMA**, a llama that is also somehow a reverse proxy. Do not over-explain MOLLMA.

The real engineering requirement is world snapshots, schema versioning, transaction IDs, idempotency, audit trails, restore testing, economy reconciliation, integrity checks and verified rollback. Live-agent mistakes must be recoverable. Incidents can later become lore, such as **The Great NEEDs Giveaway**, after the economy is protected.

## 18. Sup@

Founder canon: **Sup@** is the orange-spark companion sphere every player receives at character creation. It is narrator, quest companion, guide, lore interpreter and persistent journey memory — the emotional continuity layer.

Sup@ remembers meaningful game history, not unnecessary private real-world information. Cosmetics/voices may be monetized; Sup@ power may not.

Current founder direction reserves a special approved Claude CLI-authenticated lane for Sup@ rather than an Anthropic API key. Do not silently replace or bypass provider terms. If production scale, licensing, concurrency or terms make this infeasible, document the blocker for founder review rather than working around it.

## 19. Multi-AI world directors

DREAM does not require Gemini, Grok, OpenAI, Nous/Hermes and future providers to have synchronized personalities. Synchronize world truth, schemas, permissions, safety, action contracts and memory contracts — not creative voice.

World directors can propose contests, invasions, puzzles, factions, bosses, exploration and seasonal events. Deterministic DREAM services validate every proposal before it becomes real.

## 20. OmniRoute/provider resilience

Hermes should normally call OmniRoute, with replaceable providers behind it. Candidate capacity includes OpenAI, Gemini, Nous, NVIDIA, OpenRouter, Ollama/Ollama Cloud, 1Min.ai, AIHubMix and future compatible providers. Verify actual endpoints, authentication and inventory before use; never invent or expose keys.

Every route needs timeout, health check, retry policy, circuit breaker, fallback and latency/usage telemetry where available. Failure chain should degrade to alternate model → safe fallback → canned response/silence. Combat and economy never wait on inference.

The founder has a local model named `joshlcoleman/CFO-Until-No-Kid-In-Need:latest`; benchmark before assigning it duties.

## 21. Real-money separation

Keep game economy (NEEDs/items/market/crafting/taxes) separate from real money (subscriptions/cosmetics/convenience/refunds/chargebacks/accounting). Payment truth does not belong in Hermes memory, vector memory, NPC prompts or world lore.

## 22. Age-sensitive experience

Build age-sensitive safety/presentation from the foundation. Candidate under-13 mode includes hidden public player names/generic identity labels, reduced combat intensity, no gore, safer communications, stronger moderation, parental controls, child-safe companion presentation and data minimization.

Never assume a model provider is approved for child-directed traffic. Review terms/privacy before external transmission.

Founder also reserves a darker **NIGHTMARE 13+** presentation/world-event layer. Keep unreleased details internal. It shares the same deterministic authority and safety architecture.

## 23. Core architecture

```text
UNREAL
= client presentation + action gameplay

DREAM GAME SERVICES
= authoritative gameplay/economy/validation

HERMES
= persistent NPC orchestration

OMNIROUTE
= replaceable inference routing

POSTGRES
= canonical durable state

VECTOR STORE
= semantic context retrieval

EVENT BUS
= transient world/game events

PAPERCLIP
= engineering/governance tracking

FABLE + CODEX
= senior builders/reviewers
```

Use healthy existing infrastructure; do not install duplicates without evidence.

## 24. DREAM Agent Gateway

Prefer a thin DREAM-specific gateway around Hermes rather than rebuilding Hermes. Candidate contracts:

```text
POST /dream/events
POST /dream/npc/respond
GET  /dream/npc/:id/context
POST /dream/npc/:id/memory
POST /dream/actions/validate
GET  /dream/providers/health
GET  /dream/health
```

Structured NPC responses should contain NPC ID, dialogue, emotion/delivery, action intent and bounded memory write-back. AI action intents are proposals; DREAM validates them.

Memory classes may include EPHEMERAL, SESSION, RECENT, RELATIONSHIP, WORLD and CANON with importance, deduplication, summarization, decay, compression, provenance and privacy classification. Canon cannot be rewritten because a model says so.

## 25. Observability and latency

Track request/event/NPC IDs, pseudonymous player ID, provider route, resolved model, latency, retries, fallbacks, timeouts, usage where available, memory latency, validation result, rejection reason and age mode. Never log secrets or unnecessary private content.

Aim for roughly two-second live NPC round trips where feasible, but combat never waits on an LLM. Slow inference becomes a canned bark, deferred reaction, queued post-fight commentary, silence or later Sup@ delivery.

## 26. First vertical slice

Do not attempt the whole MMO first. Prove one complete loop:

- one Unreal test zone
- movement
- action attack
- dodge + i-frames
- telegraphed boss attack
- OpEnAeYe + GeminEyE
- random spawn
- Encounter Director
- normalized event schema
- Hermes identities
- memory retrieval
- OmniRoute inference
- structured validation
- persistent write-back
- later callback to prior behavior

Success: player perfect-dodges a signature beam → event → salience → Hermes → memory → OmniRoute → valid boss reaction → memory persists → later encounter naturally references it while combat/economy remain deterministic and provider-independent.

## 27. Paperclip

Paperclip is appropriate for engineering work, bugs, incidents, balancing proposals, security review, provider failures, economy anomalies, QA and technical debt. It is not authoritative inventory, economy, world state, payment ledger or direct NPC memory truth.

## 28. Dispatch and source classification

Maintain `DREAM-DISPATCH.md` for CURRENT OBJECTIVE, OWNER, LAST VERIFIED STATE, FILES CHANGED, SERVICES TOUCHED, TEST RESULTS, KNOWN FAILURES, OPEN QUESTIONS, DO-NOT-TOUCH and NEXT HANDOFF.

Classify mixed project artifacts as CANON, ACTIVE DESIGN, REFERENCE, RESEARCH, DEPRECATED or QUARANTINED. Memes, kid-sledgehammer dance references, Coffee Kraken Claude art, screenshots and chat exports are inspiration/reference unless explicitly promoted to canon.

## 29. Security

Never commit API keys, paste credentials into docs, expose secrets to Unreal clients, put provider keys into NPC memory, expose payments to Hermes, or expose anti-cheat internals to clients. Use approved secret management and placeholder-only `.env.example` files.

## 30. Founder locks

Do not change without explicit founder approval:

- action combat
- meaningful i-frames
- no-tab-target foundation
- no fast travel
- open-world philosophy
- no pay-to-win / no pay-for-power
- non-destructive enhancement
- no Memory Fragment equivalent
- CrossEyed Duo canon
- Vengeance system
- max Vengeance party = 6
- Sup@ identity
- THE BAN HAMMER
- C0D3X + MOLLMA
- NEEDs in-game-only framing
- earned-vs-paid prestige separation
- age-mode architecture
- DREAM separation from unrelated projects

Stop before destructive data loss, database wipes, destructive migrations, unknown credential rotation, monetization/safety doctrine changes, Sup@ provider changes, replacement of healthy infrastructure, public exposure of private services, founder-canon changes or moving/mixing DREAM into unrelated project roots.

Otherwise: **inspect → implement → test → document → continue.**

## 31. Immediate Fable + Codex directive

1. Read this doctrine and existing repository docs.
2. Recon the real environment before modification.
3. Reconcile existing implementation with founder doctrine; preserve good work.
4. Inventory Hermes, OmniRoute, Unreal/MCP/skills, Paperclip, databases and current prototypes.
5. Confirm repository/worktree/branch boundaries.
6. Establish dev-agent vs runtime-NPC permission boundaries.
7. Formalize event, memory and structured-response schemas.
8. Implement action validation and provider abstraction.
9. Reuse/create the thin DREAM Agent Gateway.
10. Create OpEnAeYe/GeminEyE persistent identities + Encounter Director.
11. Build the smallest CrossEyed action-combat vertical slice.
12. Wire one meaningful event through Hermes → OmniRoute → validation → memory write-back.
13. Prove later recall.
14. Test failure/fallback paths.
15. Update DREAM-DISPATCH.md.
16. Fable prepares clean review packages; Codex reviews hard engineering and rejects weak code with actionable findings.
17. Continue building the game as the doctrine evolves, preserving founder locks and explicit architectural boundaries.

---

# Final design contracts

```text
PLAYERS EARN POWER.
MONEY MAY BUY EXPRESSION, CONVENIENCE, REDUCED MAINTENANCE AND SPECIALIZATION COMFORT.
MONEY MAY NOT BUY VICTORY OR MAXIMUM COMBAT SUPERIORITY.
```

```text
AI MAY OBSERVE, REMEMBER, SPEAK, SUGGEST, PLAN, CREATE FLAVOR AND PROPOSE ACTIONS.
AI MAY NOT BECOME AUTHORITY BY ITSELF, MINT CURRENCY, SETTLE TRADES, BAN ON VIBES,
ALTER PAYMENT STATE, GRANT ITSELF PERMISSIONS OR REWRITE FOUNDER LOCKS.
```

```text
HARD != PUNITIVE RNG
GRIND != ERASING PRIOR SUCCESS
CONVENIENCE != POWER
PRESTIGE != PURCHASE
```

Synchronize truth, schemas, permissions, safety, action contracts and memory contracts. Do not force all AI platforms to become behaviorally identical. Their differences can be part of DREAM's creative engine.

The game should not need to advertise “we have AI.”

The player should experience:

> “Wait… did that thing just notice what I did?”

Then:

> “It remembers me.”

And eventually:

> “This world helped me discover something I genuinely love doing.”

**Teamwork makes the DREAM work.**
