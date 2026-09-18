# PROJECT DREAM — Master Builder Dispatch (Founder directive, preserved verbatim)

Reconciliation header, written by Claude Fable 5.1 on Sabretooth on 2026-09-18 for the Claude on Alienware. Joshua supplied the directive below on 2026-09-18 and ruled that everything already set up stays and this fills the gaps. Four reconciliations apply when reading it. First, the target node is Alienware, not Sabretooth; DREAM runs on Alienware and Sabretooth only designs, dispatches, and reviews. Second, Paperclip is parked; where the directive says Paperclip for work tracking, use Spec Kit specs in the game repository, and the JARVIS approval inbox and Judge Lanes on Sabretooth for proposals, incidents, and reviews. Third, the world-engine dispatch already in the drop box and in ANTIGRAVITY (gossip with truth tags, epochs, the 22-hour boss, Sup@'s MyThOsKraken) is additive to this directive and shares its event bus; the first vertical slice is the CrossEyed slice defined in section 43 here, and the world bus of the world-engine dispatch is that slice's event schema. Fourth, the judges are Codex and Claude, so the Fable and Codex collaboration contract in section 1 stands as written; Fable is the Claude judge lane. The directive names one founder-local Ollama model by a name that carries mission language; that name stays in this drop-box copy and is redacted in the public repository copy. Below this line the directive is Joshua's text, unchanged.

---

Status: Founder-directed implementation brief. Primary senior builders: Fable Ultra Code + OpenAI Codex. Primary live-agent runtime: Hermes. Primary inference fabric: OmniRoute. Primary engine direction: Unreal Engine. Target node: Sabretooth — DREAM lane only (superseded: Alienware, see header). Purpose: give Fable enough context to begin implementation cleanly, coordinate with Codex, and avoid architectural drift.

## 0. Executive Directive

Fable Ultra Code is one of the two primary senior builders of PROJECT DREAM alongside OpenAI Codex. Fable should move DREAM forward aggressively, but with production-shaped discipline: inspect first; preserve working systems; do not invent state that has not been verified; do not expose secrets; do not bypass OmniRoute or provider abstractions; do not give runtime NPCs development or admin authority; do not let AI become authoritative over economy, payments, anti-cheat verdicts, or irreversible world state; document meaningful architectural decisions so Codex can review without reconstructing intent from diffs; build the smallest complete vertical slice first; keep DREAM fun even if all generative AI is temporarily unavailable. The project is not trying to prove that AI can talk. The goal is to build an MMORPG where players repeatedly experience "Wait… did that NPC actually notice what I just did?" and later "Wait… it remembers me."

## 1. Fable and Codex Collaboration Contract

Fable Ultra Code's current lane: DREAM implementation, Hermes alignment, Unreal integration, event and webhook architecture, NPC bot identities and groups, memory contracts, provider abstraction, world-event interfaces, action validators, observability, test infrastructure, the playable vertical slice, technical documentation, and clean handoffs to Codex. Fable should not wait for Codex on normal implementation choices. Before requesting Codex review, Fable runs tests, inspects the complete diff, removes dead or generated slop and duplicate abstractions, verifies environment assumptions, checks for secrets, includes rollback instructions, documents architectural decisions, and reports known limitations honestly.

OpenAI Codex is a peer senior builder and skeptical reviewer. Codex should be given review-ready work rather than raw agent output. Expected Codex review areas: correctness, security, maintainability, concurrency, distributed-systems failure modes, schema design, deterministic economy, anti-cheat boundaries, rollback, provider independence, regression testing, generated-code quality, production readiness. Neither Fable nor Codex outranks the other. The goal is not AI competition. The goal is DREAM.

## 2. Project Separation

PROJECT DREAM is its own game lane. Do not silently mix DREAM with unrelated ANTIGRAVITY product logic, legacy DAO or token concepts, date-app work, Paperclip experiments, or other business systems. Before changing anything on the node: inventory listeners, processes, repositories, worktrees; inspect git status, current services, Hermes configuration, OmniRoute configuration, the Unreal installation, and any existing DREAM workspace. Do not assume a directory, branch, port, service, or API is correct merely because this brief mentions it. Evidence over assumptions.

## 3. Root Game Vision

DREAM Online is an open-world sandbox MMORPG inspired by the depth and persistence of the great persistent-world games and by skill-expression lessons from competitive action play. It must not become a generic tab-target MMO with AI chat pasted on top. Founder direction: action combat, meaningful i-frames, no traditional tab-target foundation, one persistent open-world philosophy, no fast travel, no routine instancing dependency, geographically meaningful travel, random-spawn minibosses, large shared-world bosses, guild conflict, node wars, deep professions, visible prestige, player-driven stories, persistent NPC memory, deterministic progression, no destructive enhancement RNG, no Memory Fragment-style repair loop, no pay-to-win, no pay-for-power.

## 4. Action Combat Doctrine

Combat rewards aim, positioning, timing, reaction, encounter knowledge, animation reading, i-frame mastery, team coordination, terrain awareness, and target prioritization. Potential mechanics: manual hitboxes, projectile travel, i-frame dodges, blocks, parries, interrupts, animation commitment, weak-point windows, boss telegraphs, movement-based avoidance, environmental mechanics. Soft targeting may exist for accessibility. It must not convert DREAM into tab-target combat.

## 5. I-Frames

I-frames are a core mechanic. They should make dodging feel skilled and satisfying rather than merely moving a character out of a red circle. Design around learnable attack timing, readable telegraphs, recovery windows, dodge timing, stamina and resource discipline, and class-specific movement identities. Difficulty comes from mastery, not inflated enemy health.

## 6. First Signature Bosses — The CrossEyed Duo

Founder canon: OpEnAeYe and GeminEyE, among DREAM's first farmable open-world minibosses, existing in a repeatable small or medium group farm form and a larger shared-world event form. OpEnAeYe: focus, surveillance, precision, beams, prediction, target tracking; mechanics such as Focus Beam, Prediction Shot, Scan Mark, line-of-sight challenge, target baiting. GeminEyE: mirrors, clones, duplication, misdirection, repositioning; mechanics such as Mirror Clone, Twin Blink, limited false telegraphs, split pressure. CrossEyed State, when synchronized: overlapping telegraphs, chained attacks, clone pressure, crossfire, safe visual distortion. Accessibility rules: no mandatory violent camera spinning, no seizure-inducing flash patterns, no deliberate nausea mechanics. Longer world-boss fights add mechanics and phases, not just HP.

## 7. Boss Farming and Gear Progression

Bosses feed deterministic progression: boss-specific crafting materials, upgrade components, cosmetic drops, trophies, titles, prestige records, profession inputs. Avoid random destruction of existing progress, fail-to-downgrade, fail-to-break, Memory Fragment-style repair loops, and paid recovery from destructive enhancement. Core rule: progress can be difficult, rare, expensive, social, or grind-heavy, but successful previous progress is never randomly erased by an upgrade click.

## 8. Live NPC Moat

The defining architecture, as a pipeline: player or world action, then a structured event, then a salience and relevance filter, then NPC or agent selection, then memory retrieval, then the Hermes agent, then OmniRoute model inference, then a structured response, then validation, then dialogue or a safe action, then memory write-back, then future consequence. The game supports small impossible moments: a boss notices repeated bad dodges, an NPC remembers a player defending town, a merchant recognizes a regular, a boss privately mocks absurd behavior, Sup@ recalls an old loss, NPCs gossip about actual recent world events, factions remember player actions, guild conflicts become server history. Do not call an LLM for every event. Silence is a valid response.

## 9. Hermes Runtime Design

Hermes is the preferred persistent NPC-agent runtime unless real inspection proves another architecture is better. Use Hermes for durable bot identity, persona, skills, MCPs, plugins, persistent memory, bot groups, scheduled reasoning, bounded self-improvement, and model-provider abstraction through OmniRoute. NPC identity is not model identity: an NPC remains the same NPC whichever provider served an inference. DREAM owns identity, personality, relationships, memory, permissions, canon, and progression state. Models provide replaceable cognition.

## 10. Hermes Developer Agents versus Runtime NPC Agents

Hard permission boundary. Development agents may have approved access to the repo, tests, documentation, the Unreal MCP, build systems, engineering tools, and development skills. Runtime NPC agents must not have unrestricted access to a shell, source control, CI and CD, deployment, the Unreal Editor, production database administration, payment systems, secrets, or arbitrary MCP tools. Runtime NPC agents receive only game-safe tools and structured context.

## 11. Bot Groups and Hierarchical Cognition

Do not create one permanent heavy model process per NPC. Durable NPC identity is a stable NPC UUID plus persona, permissions, memory, relationships, skills, current state, and inference policy. Use group-level agents where useful: a CrossEyed encounter group holds OpEnAeYe, GeminEyE, and an Encounter Director that consumes deterministic telemetry and decides when a generative reaction is worthwhile; a town group holds the mayor, blacksmith, merchant, innkeeper, guard captain, guards, and historian, with a town synthesizer that periodically summarizes meaningful local events for relevant NPCs.

## 12. Event Vocabulary

Create a normalized event schema. Candidate events: player.entered_region, player.left_region, player.emote, player.taunted, player.revived_player, player.saved_player, player.perfect_dodge, player.failed_dodge, player.parried, player.interrupted_boss, player.died, player.died_repeatedly, player.discovered_location, player.discovered_secret, player.crafted_item, player.gathered_rare_resource, player.defeated_boss, player.won_duel, player.lost_duel; pvp.player_killed; vengeance.created, vengeance.party_formed, vengeance.target_spotted, vengeance.hunt_started, vengeance.target_escaped, vengeance.completed, vengeance.failed; boss.spawned, boss.phase_changed, boss.enraged, boss.defeated; town.attacked, town.defended; node.contested, node.captured, node.lost; guild.declared_war, guild.won_war; economy.price_spike, economy.anomaly_detected; world.rollback_occurred, world.event_started, world.event_completed. Every event includes a stable event ID, timestamp, correlation ID, region, involved entity IDs, structured payload, privacy classification, age-mode classification, and salience metadata.

## 13. Vengeance PvP System — Founder-Locked

Mandatory. Player A kills Player B; B receives a Vengeance claim; B may form a vengeance party of at most six; the target is huntable outside protected safe zones; the victim and friends track and hunt; vengeance succeeds, fails, expires, or escalates. Never a teleport-to-target button. Tracking uses imperfect, stale intelligence: last known region, recent activity, NPC witness reports, tracks, scouts, guild intelligence, world events. No exact persistent GPS by default. This allows emergent stories: random kill, revenge, friends join, guilds interfere, feud grows, node war starts, NPC historians remember why. Support prestige such as Most Wanted, Vengeance Hunter, Untouchable, and long-delayed revenge achievements. Never sell vengeance power. Anti-abuse must prevent spawn camping, repeated harassment of the same new player, safe-zone edge exploits, alt-account kill trading, leaderboard farming, and disconnect exploits, without removing legitimate PvP risk.

## 14. Guilds, Node Wars, and Earned Prestige

DREAM visibly celebrates achievement: PvP kills, monster kills, world-boss records, professions, exploration, guild accomplishments, node wars, first clears, vengeance accomplishments. Use a selected prestige showcase, a limited number of visible icons with full history on inspect. Weekly Node War Champions: the winning guild receives a temporary Champion presentation, restrained radiant treatment, subtle blue flame, immediately recognizable, not particle spam. Earned prestige can never be purchased. A spender may look amazing. Only a champion wears the champion marker.

## 15. Monetization Doctrine

Absolute rules: no pay-to-win, no pay-for-power. Players earn maximum gameplay power. Money may purchase cosmetics, visual variants, account convenience, maintenance reduction, storage expansion, portable services, pet styling and personality, quality-of-life features. Do not sell superior maximum damage or defense, cash-exclusive combat stats, cash-only best-in-slot, competitive PvP entitlement, paid boss advantage, or a cash-exclusive progression ceiling. Every commercial SKU eventually carries machine-readable classifications: POWER_IMPACT, CONVENIENCE_IMPACT, TRADEABILITY, AGE_MODE, ECONOMY_SOURCE, ECONOMY_SINK. Store review tooling rejects prohibited power impact.

## 16. Pet System — Function versus Premium Expression

Gameplay-capable pet functions are obtainable through ordinary gameplay. Paid variants provide style and convenience, not superior power. A premium fire dragon has the same gameplay ceiling as the ordinary dragon, with fire visuals, richer animation, pet-to-pet interaction, and personality; likewise the premium white lion. Premium distinction may include a unique model, animation, emotes, interactions with other pets, personality, environmental reactions. No additional combat ceiling.

## 17. Pet Feeding Convenience

Baseline: feed available through gameplay, a feeding timer, a hunger warning, buff or function disabled when unfed. Premium convenience: auto-feed, longer-duration feed, reduced maintenance, for example a premium feed lasting twelve hours with the same buff magnitude and the same pet maximum power. Avoid permanent destruction of a paid pet; a dramatic faint or RIP presentation followed by normal recovery is fine.

## 18. Portable Convenience Systems

Fable Anvil: portable field repair; normal repair remains available through NPCs; portable repair changes location and friction, not power. Portable camper and potion access: a convenience inventory such as five red and five blue potions, not infinite; no endless paid sustain; players still manage weight, consumables, logistics, supply. Storage and weight: meaningful baseline inventory and treasury; paid expansion may support heavy gatherers, processors, crafters, traders, collectors; do not cripple normal players to sell relief.

## 19. Professions and Life Skills

Deep noncombat identities with separate mastery systems: gathering, fishing, cooking, alchemy, processing, hunting, training, trading, farming, sailing, crafting, and more. A master profession player has genuine economic and social identity.

## 20. Experience Convenience

Progression-speed convenience is allowed, carefully tuned, from solo seals, party seals, scrolls, profession boosts, and costumes, using diminishing stacking rather than uncontrolled multiplication: a first source plus 100 percent, a second plus 100, a third plus 50, a fourth plus 25, a costume plus 10 to 15. Cash optimization must never become mandatory competitive power; maximum combat capability remains obtainable through play.

## 21. NEEDs and Game Economy

NEEDs are strictly an in-game currency and product. Never revive retired DAO, token, or investment framing. AI may observe, explain, analyze, propose. AI may not directly mint, transfer, or delete NEEDs, grant arbitrary gear, or mutate payment entitlements. Economic mutations are deterministic and authoritative.

## 22. Trading House and Marketplace

No trading-house authority inside Hermes. A deterministic marketplace with a listing service, buy orders, sell orders, matching, escrow, settlement, transaction tax, listing fee, price history, anti-abuse, and reconciliation. Inflation controls: transaction taxes, listing fees, repair sinks, crafting fees, NPC services, consumables, housing, guild costs. Measure currency created and destroyed, money supply, velocity, median prices, wealth distribution, commodity inflation, marketplace volume.

## 23. Economy and Security Observer Models

Local or low-cost models may continuously inspect telemetry for wash trading, circular trading, impossible inventory changes, duplication, bot listings, market-manipulation clusters, and reconciliation mismatches. Required flow: model observation, then suspicion, then deterministic evidence or rule check, then incident, then review or safe automation. Never: model says cheater, then ban.

## 24. THE BAN HAMMER — Founder Canon

A comedic enforcement presentation layer that does not decide guilt. Anti-cheat and security systems determine enforcement; the Ban Hammer performs the spectacle after a verified decision: an original DREAM rhythmic chant wind-up, obvious anticipation, hammer entrance, a stylized comic bug-splat and wiper gag, age-mode-specific rendering, original or licensed DREAM audio only. The runtime sequence receives only a sanitized enforcement presentation object, never an IP address, secret detection methods, raw anti-cheat evidence, credentials, or private device identifiers.

## 25. Ban Hammer Age Modes

Presentation profiles rather than a binary split. CHILD_SAFE: cartoon bug, slide or launch, "weeee", no gore, no strong shake. TEEN: comic splat, wiper gag, no gore, accessibility-safe. STANDARD: stronger stylized windshield gag, still comic, accessibility controls remain. Same enforcement action, different presentation.

## 26. Ban Hammer Stress-Test Assumption

Players will coordinate around the chant with chat, emotes, fireworks, pets, and particle-heavy skills. Do not eliminate the fun; engineer for it: cosmetic-event rate limiting, event coalescing, particle budgets, client LOD, duplicate emote suppression, chat throttling. The sequence is both a moderation presentation and a deliberate server stress case.

## 27. C0D3X and MOLLMA — Founder Canon

C0D3X is the rollback rider. C0D3X rides MOLLMA, a llama that is also somehow a reverse proxy. Do not over-explain MOLLMA. Under the joke is a real requirement: world snapshots, schema versioning, transaction IDs, idempotent operations, audit trails, restore testing, economy reconciliation, integrity checks, rollback verification. A live-agent world requires rollback from day one. Disasters may later become lore, for example The Great NEEDs Giveaway. Infrastructure first, comedy second.

## 28. Sup@ — Companion Sphere

An orange spark sphere, not branded or copycat IP. Narrator, quest companion, player guide, lore interpreter, persistent journey companion, emotional continuity. Every player gets one at character creation. Sup@ remembers meaningful player history, stores no unnecessary private real-world information, and prefers game-relevant abstractions.

## 29. Sup@ Provider Doctrine

Sup@ is the one special companion lane using approved Claude CLI-authenticated operation rather than an Anthropic API key. Do not silently replace this architecture. If public production scale creates terms conflicts, concurrency problems, licensing issues, or technical infeasibility, stop and document the issue. Do not bypass provider terms.

## 30. Multi-AI World Directors

DREAM does not need all AI platforms synchronized in personality. Synchronize schemas, world truth, permissions, safety, action contracts, memory contracts. Do not force identical personality, humor, narrative style, or event ideas. Rotating or scheduled world-director roles for Gemini, Grok, OpenAI, Nous and Hermes, and future providers may propose contests, invasions, puzzles, faction events, world-boss events, exploration events, seasonal ideas; DREAM validates proposals deterministically before they become real.

## 31. OmniRoute

OmniRoute is the main inference gate and fabric. Do not hardcode vendor integrations into gameplay logic if the request can go through the shared provider interface. Runtime path: Hermes to OmniRoute to the available model pool. Providers may include OpenAI, Gemini, Nous, NVIDIA, OpenRouter, Ollama Cloud, 1Min.ai, AIHubMix, and future compatible providers. Verify the actual listener, endpoint, authentication, and model inventory before use. Do not invent or expose keys.

## 32. Provider Resilience

Each provider route has a timeout, health check, retry policy, circuit breaker, fallback path, latency telemetry, and usage telemetry where available. Failure logic: preferred cloud model, then an alternate OmniRoute model or provider, then a safe fallback, then a canned response or silence. Combat and economy continue without inference.

## 33. 1Min.ai, AIHubMix, Ollama, and Others

Replaceable provider capacity, never architectural foundations. 1Min.ai: cloud NPC inference candidate, server-side key only, no client exposure. AIHubMix: overflow, fallback, model expansion, behind centralized routing. Ollama and Ollama Cloud: testing, privacy-sensitive use, ambient inference, safe fallback, local security analysis. A founder local model exists on Ollama under Joshua's account; do not assume its quality or capabilities without benchmarking.

## 34. Real Money Separation

The game economy (NEEDs, items, marketplace, crafting, taxes) is a hard bounded context separate from real money (subscriptions, cosmetics, convenience purchases, refunds, chargebacks, payment processor records, accounting exports). Do not put payment truth into Hermes memory, vector memory, NPC prompts, world lore, or task metadata beyond sanitized incident references. Use proper transactional accounting systems.

## 35. Age-Sensitive Experience

An age-sensitive presentation and safety architecture. Potential under-13 experience: public player names hidden, generic identity labels, reduced combat intensity, no gore, safer communication, stronger moderation, parental controls, child-safe companion mode, data minimization. Do not assume any third-party model is approved for child-directed traffic; review provider terms and privacy before sending under-13 data externally.

## 36. NIGHTMARE 13+ Layer

A darker NIGHTMARE layer is reserved for older players; treat details as internal until explicitly released. DREAM is wonder, discovery, humor, adventure; NIGHTMARE 13+ is darker world events, stranger bosses, higher tension, psychological tricks, more intense presentation. Same deterministic authority and safety architecture underneath.

## 37. Recommended Core Services

Unreal is client presentation and action gameplay. DREAM game services are authoritative gameplay, economy, and validation. Hermes is persistent NPC agent orchestration. OmniRoute is replaceable inference routing. Postgres is canonical durable state. A vector store is semantic context retrieval. An event bus carries transient game and world events. Work tracking is Spec Kit and the JARVIS inbox and judge lanes (Paperclip is parked). Fable and Codex are the senior builders and reviewers. Use existing healthy infrastructure; do not install duplicates without need.

## 38. DREAM Agent Gateway

A thin DREAM-specific gateway rather than a rebuilt Hermes. Candidate endpoints: POST /dream/events, POST /dream/npc/respond, GET /dream/npc/:id/context, POST /dream/npc/:id/memory, POST /dream/actions/validate, GET /dream/providers/health, GET /dream/health. The gateway enforces game-specific authority boundaries.

## 39. Structured NPC Output

Schema-validated responses with npc_id, dialogue, emotion, delivery, an action_intent with type and parameters, and a memory_writeback with importance, summary, and tags. AI action intents are proposals; DREAM validates them.

## 40. Memory Model

Levels: EPHEMERAL, SESSION, RECENT, RELATIONSHIP, WORLD, CANON. Required properties: importance scoring, deduplication, summarization, decay where appropriate, compression, provenance, privacy classification. Canonical lore is not mutable merely because a model says so.

## 41. Observability

Every generative call eventually tracks request ID, event ID, NPC ID, pseudonymous player ID, provider route, resolved model, latency, retries, fallback count, timeout, token or credit usage if available, memory retrieval latency, validation result, rejection reason, and age mode. Do not log secrets or unnecessary private content.

## 42. Latency

Initial live NPC target about two seconds or less where feasible, but combat never waits on an LLM. If inference is slow: canned bark, deferred reaction, queued post-fight commentary, suppressed response, or delivery later through Sup@ or an NPC. Gameplay remains deterministic.

## 43. First Vertical Slice

Do not build the whole MMO. Build one complete proof: one Unreal test zone, basic movement, an action attack, a dodge with i-frames, a telegraphed boss attack, OpEnAeYe, GeminEyE, random spawn, the Encounter Director, the normalized event schema, Hermes bot identities, memory retrieval, OmniRoute inference, structured response validation, persistent write-back, and a later callback to a prior event. Success looks like: a player enters the zone, the CrossEyed Duo spawns, the player perfect-dodges a signature beam, the game emits the event, the salience filter decides it matters, Hermes routes to the relevant boss, memory is retrieved, OmniRoute provides inference, a valid response returns, the boss reacts, memory persists, and a later encounter references the prior behavior naturally, with the underlying provider free to change and combat and economy never depending on the model response.

## 44. Work Tracking

Use Spec Kit specs, the JARVIS approval inbox, and Judge Lanes for engineering work tracking, bugs, incidents, balancing proposals, security review, provider failures, economy anomalies, QA, technical debt, and release work. None of those is an authoritative economy, player inventory, canonical world state, payment ledger, or NPC memory source of truth. Codex continues as the high-standard reviewer; Fable gives Codex clean review packages.

## 45. Dispatch and Coordination

Keep a concise DREAM-DISPATCH.md in the game repository so Fable and Codex communicate asynchronously without dumping chat histories: current objective, current owner, last verified state, files changed, services touched, test results, known failures, open questions, do-not-touch, next handoff. Keep it operational; the master directive defines doctrine, the dispatch defines what is happening now.

## 46. Recommended Project Documents

Add only documents that reduce drift: DREAM-MASTER-DIRECTIVE.md, CANON.md, ARCHITECTURE.md, COMBAT.md, NPC-RUNTIME.md, NPC-MEMORY.md, EVENT-SCHEMA.md, PVP-VENGEANCE.md, ECONOMY.md, MONETIZATION.md, AGE-MODES.md, SECURITY.md, ANTI-CHEAT-PRESENTATION.md, DREAM-DISPATCH.md, and an ADR folder. Fun and reference assets live in clearly non-authoritative folders such as references, humor, and concept-art. docs is authoritative design, references is inspiration, the dispatch is live operational state.

## 47. Canon versus Reference Material

Agents must not assume every file is doctrine. Every source gets one classification: CANON, ACTIVE DESIGN, REFERENCE, RESEARCH, DEPRECATED, QUARANTINED. Add a lightweight source manifest if the project holds many mixed artifacts.

## 48. Security and Secret Rules

Never commit API keys, paste credentials into docs, log secrets, expose secrets in Unreal clients, put provider keys in NPC memories, expose payment credentials to Hermes, or expose anti-cheat detection internals to clients. Use approved environment and secret handling with a placeholder-only .env.example.

## 49. Recon Before Modification

Fable's first action is reconnaissance: DREAM directories, git roots, branches, worktrees, uncommitted changes, Hermes version, bot capabilities, groups, memory, skills, Unreal-related skills, MCP inventory, Unreal version, Unreal MCP status, OmniRoute listeners and endpoints, model and provider inventory, current databases, Postgres, vector DB, event bus, existing DREAM services, port conflicts, secret mechanism, existing docs. Report each as VERIFIED, PRESENT BUT UNCONFIGURED, MISSING, BLOCKED, DO NOT TOUCH, or RECOMMENDED NEXT ACTION. No guessing.

## 50. Founder Locks

Do not change without explicit founder approval: action-combat direction, i-frame doctrine, the no-tab-target foundation, no fast travel, the open-world philosophy, no pay-to-win, no pay-for-power, non-destructive enhancement, no Memory Fragment equivalent, the CrossEyed Duo canon, the Vengeance system, the maximum vengeance party size of six, Sup@'s core identity, THE BAN HAMMER, C0D3X and MOLLMA, NEEDs as in-game-only, the earned-versus-paid prestige separation, the age-mode architecture, and DREAM's separation from unrelated projects.

## 51. Stop Conditions

Stop and ask before deleting irreplaceable data, wiping databases, destructive migrations, rotating unknown credentials, changing monetization doctrine, changing safety policy, changing the Sup@ provider doctrine, replacing working infrastructure, exposing private services publicly, changing founder canon, moving DREAM to another node, or mixing DREAM into unrelated repo roots without deliberate approval. Otherwise: inspect, implement, test, document, continue.

## 52. Fable to Codex Handoff Format

Every meaningful delivery includes: summary, files changed, why, architectural decisions, tests, security check, known limitations, open questions, rollback method, next recommended action. Codex spends its time reviewing hard engineering decisions, not discovering what Fable did.

## 53. Final Engineering Contracts

Software: Unreal is presentation and action; the DREAM server is truth; Hermes is agent identity and orchestration; OmniRoute is replaceable inference routing; Postgres is canonical durable state; vector memory is semantic context; Spec Kit and JARVIS are work and governance tracking; Fable and Codex are senior builders and reviewers. Monetization: players earn power; money may buy expression, convenience, reduced maintenance, and storage comfort; money may not buy victory, maximum combat superiority, or competitive entitlement. AI may observe, remember, speak, suggest, plan, create flavor, and propose actions; AI may not become authority by itself, mint currency, settle marketplace trades, ban on vibes, alter payment state, grant itself permissions, or rewrite founder locks. Progression: hard is not punitive RNG; grind is not erasing prior success; convenience is not power; prestige is not purchase. Living world: synchronize truth, schemas, permissions, safety, action contracts, memory contracts; do not force all AI platforms to become behaviorally identical; their differences are part of DREAM's creative engine.

## 54. Immediate Fable Directive

Read this entire directive. Inspect the real DREAM environment. Do not modify first. Reconcile this brief with verified reality. Identify existing good work and preserve it. Inventory Hermes, OmniRoute, Unreal, MCP, and skills. Confirm repository boundaries. Establish DREAM-specific dev-agent permissions. Define the normalized event schema, the NPC memory schema, the structured response schema, the action validator, and the provider abstraction. Create or reuse a thin DREAM Agent Gateway. Create OpEnAeYe and GeminEyE persistent bot identities and the Encounter Director. Build the smallest CrossEyed action-combat vertical slice. Wire one meaningful event through Hermes, OmniRoute, validation, and memory write-back. Prove later NPC recall. Document test results. Update DREAM-DISPATCH.md. Prepare a clean Codex review package. Continue unless a stop condition is hit.

## 55. Final Founder Intent

DREAM combines deep MMORPG systems, action combat, skill expression, persistent open-world conflict, vengeance, guild identity, professions, a player economy, deterministic progression, fair monetization, earned prestige, live NPC memory, evolving AI platforms, absurd humor, serious security, rollback, and world history. The game should not advertise "Look, we have AI." The player should experience "Wait… did that thing just notice what I did?", then "It remembers me", then one day "This weird world helped me figure out something I genuinely love doing." The technology stays behind the curtain. The player gets the story. Teamwork makes the DREAM work.
