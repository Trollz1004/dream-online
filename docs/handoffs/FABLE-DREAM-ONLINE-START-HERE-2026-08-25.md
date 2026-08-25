# Fable DREAM ONLINE Start Here

**Date:** 2026-08-25

**From:** Joshua + OpenAI Codex

**To:** Claude Fable 5

**Repository:** `Trollz1004/dream-online`
**Purpose:** Give Fable a durable, evidence-linked handoff for resuming DREAM ONLINE with Codex without losing prior work, confusing design with implementation, or silently overriding Joshua's canon.

> Internal engineering briefing. Do not deploy this file or reuse it as customer-facing copy. It contains implementation terminology and internal product constraints.

## 1. Assignment

Fable is the synthesis, architecture, and review lead. Codex is the implementation and verification partner. Work from the existing repository rather than starting over.

Fable should:

1. pull the current repository and follow the source order below;
2. verify the current implementation locally before changing it;
3. reconcile the documented conflicts and stale assumptions called out here;
4. add independent architectural recommendations;
5. define the first bounded implementation slice for Fable and Codex;
6. preserve tests, evidence, rollback, and review gates;
7. report verified facts separately from inference and founder decisions still needed.

Do not treat a polished document as proof that a system exists. Code, tests, runtime responses, and Git history are implementation evidence. Design documents and the founder record describe intent.

## 2. Authority and source hierarchy

When sources disagree, use this order and surface the conflict instead of silently choosing:

1. Joshua's current explicit decision.
2. Current executable code and passing tests on the checked-out commit.
3. Current `AGENTS.md`, `CLAUDE.md`, security rules, and repository contribution rules.
4. Current Git history and committed state/handoff files.
5. Current GDD, technical, testing, and operations documents.
6. Founder canon captured from the pinned ChatGPT conversation and summarized below.
7. Older repository copies, retired paths, and historical proposals.

Never read, copy, summarize, or commit material from the founder-only OneDrive vault. This handoff intentionally excludes classified material.

## 3. Repository identity

### Active repository

- `Trollz1004/dream-online`
- Default branch: `main`
- Private repository at the time of this handoff.
- This is the meaningful implementation repository.

### Legacy repository

- `Trollz1004/DREAM-ONLINE-MMORPG-PvP-OPENWORLD-OR-OPEN-DREAM-`
- Contains only a small initial commit.
- Do not treat it as the implementation source or merge it blindly.

### Local root

Joshua confirmed the project drive is connected. A read-only check on 2026-08-25 verified:

- mounted drive: `D:`;
- current volume label: `DREAM ONLINE MMORPG`;
- volume health: Healthy;
- checkout: `D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG`;
- remote: `https://github.com/Trollz1004/dream-online.git`;
- local branch: `main`, tracking `origin/main`;
- checked-out commit: `74e7036` (`fix(ci): commit npc-profiles.json -- it is a test input, not spoiler content`).

The working tree was not clean during that check. It contained untracked `DreamOnline/` and `game/server/live-npc-lab/package-lock.json`. These may belong to current or prior agent work. Inspect and attribute them before changing, staging, moving, or deleting either item.

The verified active root is:

`D:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG`

Because the physical drive has been swapped between systems and may mount under a different letter or label later, the path above is evidence for this date, not a permanent identity. Runtime tooling should prefer `DREAM_ROOT`. Discovery should verify both repository contents and the exact `origin` remote; a label alone is not sufficient identity. Do not relocate, consolidate, or delete any local copy solely from this briefing. First inspect the actual Sabretooth filesystem, remotes, current branch, uncommitted changes, and drive identity.

This project root is separate from the ANTIGRAVITY engineering repository. Any older document claiming a different topology is evidence of historical drift, not permission to move files.

## 4. Git and provenance record

At the time of the 2026-08-25 sweep, `dream-online` had 30 commits:

- 27 commits on 2026-07-08 established the repository and then added contracts, endpoints, zone seed data, tests, first-playable documents, CI, roadmap, and a state handoff.
- `d67c8c8f` on 2026-08-05 recovered 30 changed/new files that had been stranded in an uncommitted working tree, including roughly 665 new lines in `npcEngine.js`, provider interfaces, tests, and first-playable documentation.
- `c2cd89c5` on 2026-08-25 corrected the active root, removed an indexed nested duplicate, and corrected stale topology claims.
- `d18b8e15` on 2026-08-25 removed an FCC/proxy lane, restored the real signed-in Claude CLI route, and corrected the Paperclip/Mission Control identity story.

Joshua identifies Codex as the agent that performed most of the foundational work. GitHub records the July commits under the `Trollz1004` account rather than an explicit Codex bot identity, so do not overclaim machine-verifiable authorship. The repository itself states that Codex and Claude are the primary code-authoring lanes.

Useful history anchors:

- `1c3fb93b` — initialize DREAM ONLINE repository.
- `dc7edfb0` through `b4d86157` — core data contracts.
- `2bce6dbc` — expose live-NPC contract endpoints.
- `78451b9f` and `d209a37c` — First Gate seed and endpoint.
- `f35d9952` — Live NPC Lab CI checks.
- `a47ad780` — current-state handoff.
- `d67c8c8f` — recovered live-NPC engine, memory, provider, failure, cost, and first-playable work.
- `c2cd89c5` and `d18b8e15` — latest path/topology and adapter corrections.

Before new work, inspect the full history rather than relying only on this summary.

## 5. Required reading order

### Boot and rules

1. `README.md`
2. `CLAUDE.md`
3. `AGENTS.md`
4. `TASKS.md`
5. `STATE.md`
6. `ops/current-state.md`
7. `memory/glossary.md`
8. `docs/DESIGN-INDEX.md`

### First playable and game design

1. `docs/gdd/00-vision.md`
2. `docs/gdd/00a-first-playable-promise.md`
3. `docs/gdd/01-vertical-slice.md`
4. `docs/gdd/01a-first-15-minute-journey.md`
5. `docs/gdd/02-action-combat.md`
6. `docs/gdd/02a-hit-confirm-requirements.md`
7. `docs/gdd/03-life-skills-economy.md`
8. `docs/gdd/04-pvp-flagging-durability.md`
9. `docs/gdd/05-day-night-economy-market.md`
10. `docs/gdd/06-pvp-level-scaling.md`
11. `docs/gdd/07-character-creation.md`

### Architecture, safety, and recovery

1. `docs/tech/prototype-architecture.md`
2. `docs/tech/live-ai-runtime-architecture.md`
3. `docs/tech/ai-failure-behavior.md`
4. `docs/tech/data-contracts.md`
5. `docs/tech/local-prototype-ports.md`
6. `docs/tech/local-command-reference.md`
7. `docs/tech/unreal-first-playable-map.md`
8. `docs/tech/ue5-architecture.md`
9. `docs/tech/c0d3x-world-recovery.md`
10. `docs/tech/dreamops-bridge.md`

### Verification and work queue

1. `docs/testing/first-playable-acceptance-checklist.md`
2. `docs/testing/first-playable-walkthrough.md`
3. `docs/testing/test-plan.md`
4. `docs/testing/live-ai-load-test-plan.md`
5. `docs/planning/first-playable-risk-register.md`
6. `docs/roadmap/milestones.md`
7. `ops/dream-task-bank-100.md`
8. `ops/software-install-plan.md`
9. `.github/workflows/live-npc-lab.yml`

### Executable prototypes

1. `game/server/live-npc-lab/README.md`
2. `game/server/live-npc-lab/package.json`
3. `game/server/live-npc-lab/src/npcEngine.js`
4. `game/server/live-npc-lab/src/providers.js`
5. `game/server/live-npc-lab/src/server.js`
6. `game/server/live-npc-lab/data/`
7. `game/server/live-npc-lab/test/`
8. `game/server/dreamops-bridge/README.md`
9. `game/server/dreamops-bridge/src/`

## 6. Verified implementation state

The repository contains real executable prototype work, but it is not yet a playable Unreal game or MMO server.

### Live NPC Lab

Location: `game/server/live-npc-lab`

Default local port: `9127`

Runtime: Node.js 20 or newer

Cloud calls: disabled by default; no production cloud provider implementation is enabled.

Implemented surfaces include:

- health, contract, sample, world-zone, NPC-profile, dialogue, event, memory, compaction, and sanitized AI-failure endpoints;
- local JSON/JSONL state;
- NPC profiles for guide, guard, market runner, field gatherer, and C0D3X rider;
- scoped memory for player, NPC, zone, and global events;
- non-destructive memory compaction that preserves raw logs;
- bounded local lore retrieval;
- provider interfaces and local fallback behavior;
- action proposal allowlists so model output does not directly execute world actions;
- per-player cost guards, timeout shape, token budgets, and fallback route fields;
- sanitized failure records without raw provider content or credentials.

Current tests named in `package.json`:

- smoke;
- first-playable flow;
- NPC profiles;
- AI failure behavior;
- cost guards;
- memory scopes;
- memory compaction;
- lore retrieval;
- contract validation through the separate `test:contracts` command.

Do not report these tests as passing today until they are run on the current checkout and their output is captured.

### DreamOps Bridge

Location: `game/server/dreamops-bridge`

Default local port: `9119`

Storage: local JSON and audit log.

It supports inspection and safe proposals for world health, events, economy state, memory queues, checkpoints, rollback plans, and hotfix proposals. It does not currently implement destructive rollback execution. Do not mistake a rollback plan endpoint for an operational rollback system.

### Data contracts and seeds

Committed contracts cover:

- character profile;
- progression;
- combat abilities;
- life skills;
- PvP state;
- items and inventory;
- marketplace;
- boosters and pets;
- world events;
- live-NPC memory;
- day/night economy rules.

`game/server/live-npc-lab/data/first-zone.seed.json` defines the First Gate prototype zone.

### Not implemented yet

- Unreal gameplay project and compiled client;
- player movement, combat pawn, enemy AI, gathering interactions, HUD, or greyboxed First Gate inside Unreal;
- dedicated authoritative MMO networking;
- Postgres/Qdrant/Redis or NATS production persistence;
- production provider routing or production Sup@ runtime;
- production authentication, accounts, payments, marketplace, moderation, or child-account compliance;
- destructive world recovery/rollback;
- external deployment or proven MMO-scale load capacity.

## 7. Founder-locked product intent

This section preserves non-classified intent from Joshua's pinned “Game monetization and guides” conversation. Where it conflicts with current code or newer decisions, stop and ask Joshua rather than silently rewriting either source.

### Core product

- A live-world open-world MMORPG with one shared-world direction.
- No instances and no fast travel are part of the intended world identity.
- Action combat, not tab targeting: manual aim, readable hitboxes, dodges, blocks/parries, animation commitment, projectile travel, positioning, and boss telegraphs.
- Life skills, player-driven markets, Nightfall risk/economy changes, meaningful PvP consequences, and long-lived player/world history.
- The differentiator is the live-NPC loop: game trigger -> server-side routing -> memory/context retrieval -> constrained agent response -> validation -> durable memory write-back -> possible world proposal.
- AI output is never authoritative game, inventory, combat, account, or economy state.

### Monetization boundary

- Cosmetics, style, access, and bounded convenience only.
- Never sell direct combat power, PvP advantage, rare-drop control, or mandatory progress.
- Paid convenience should have fair, bounded, and preferably earnable equivalents where practical.
- NEEDs is an in-game currency/product only. Never turn internal mission or accounting intent into customer-facing benefit claims.

### Sup@

- Sup@ is the companion guide sphere given to every player.
- It is narrator, quest guide, mechanics helper, lore companion, accessibility aid, and the player's long-term remembered relationship with the world.
- It should grow in personality and depth with the player without granting paid combat power.
- Sup@ cosmetics and voice choices are acceptable directions; Sup@ power is not.
- Older founder canon says production Sup@ uses a real signed-in Claude CLI session and never an Anthropic API key.
- Current runtime documents also discuss 1min.ai/local fallback routes for guide dialogue and cost control. This is an unresolved architecture/cost/compliance question. Do not silently replace the founder-locked Sup@ identity or route; propose a clear separation between Sup@ identity, execution route, fallback behavior, and authoritative memory.

### NPC routing intent

- Ambient/T0 behavior should prefer local models or deterministic/canned behavior.
- Named NPCs may use a budgeted cloud pool with server-side context injection.
- Story-critical NPCs and world actors use stronger, qualified routes when justified.
- External providers do not own durable memory. Dream stores canonical game facts; retrieved semantic context is supporting context only.
- Provider failure must degrade safely and never block core gameplay.
- No provider keys, prompts, or private memory belong in the game client.

### Safety and younger-player intent

Joshua wants a distinct protected experience for younger players, including:

- no visible real player names;
- reduced combat intensity and effects;
- no gore;
- safer companion behavior and clearer guidance;
- strict chat filtering or predefined communication;
- parental controls and minimized personal data.

This is product intent, not completed legal compliance. Before under-13 operation or sending child data to a third party, obtain explicit legal/vendor review and implement consent, data-minimization, retention, deletion, moderation, and incident controls. Do not route a child's free text or personal data to an unapproved cloud service.

### Canon characters and systems

- **THE BAN HAMMER:** in-world moderation/enforcement spectacle. False positives must be prevented and evidence/appeal controls must exist beneath the fiction.
- **C0D3X:** fictional rollback rider who makes verified recovery part of world lore.
- **MOLLMA/M0LLAMA:** C0D3X's reverse-proxy mount.
- **OpEnAeYe and GeminEyE:** early random-spawn action-combat boss duo, with a larger public world-boss variant. Intended to teach aiming, dodging, readable tells, movement, coordination, material farming, and memory hooks.
- **Orange sherbet KRAKEN:** founder canon boss concept.

Do not use real competitor names or external brands in active player-facing material. Translate design inspiration into DREAM-native language.

## 8. First playable contract

The smallest accepted proof is:

- responsive movement;
- one starter enemy;
- one gathering node;
- one guide NPC response with persistent local memory;
- one world event;
- local persistence for player state, NPC memory, and world-event state.

The planned zone is **First Gate**. The intended 15-minute proof combines movement, one combat loop, one gathering loop, one guide interaction, Nightfall readability, one event, and persistence.

The complete pass/fail gate is `docs/testing/first-playable-acceptance-checklist.md`. Do not expand scope merely because a design document exists. Each required area must pass, and the full acceptance pass must be rerun after impacted fixes.

The first local Unreal slice may simulate single-player while keeping boundaries shaped for future server authority. Do not fake MMO scale in the first playable.

## 9. Server authority and recovery invariants

- The server, not the client or model, owns movement validation, combat results, inventory, items, currency, marketplace locks, world events, PvP state, and account entitlements.
- Postgres is the intended future canonical persistent store. Qdrant is intended for semantic retrieval, not economic authority. Redis or NATS may support cache/events; none of these are proven production components yet.
- NPCs and agents may propose only allowlisted actions. Deterministic game code validates and applies them.
- All currency and world mutations require an audit trail.
- No autonomous destructive rollback.
- Create verified snapshots before world events, economy migrations, memory-schema changes, and deployments.
- Preserve the broken state for forensics before recovery.
- A C0D3X lore event may explain an operator-approved repair, but fiction never replaces internal evidence.
- Never accept “HTTP 200” as proof of correct identity or behavior; verify response content and service identity.

## 10. Known conflicts and drift to reconcile

Fable should explicitly resolve or escalate these:

1. **Sup@ execution:** founder record says real Claude CLI only; runtime docs also plan 1min.ai/local routing. Separate surface identity, model route, cost fallback, memory, and game authority before choosing.
2. **Historical engine language:** older founder material mentioned a browser-world engine; current `AGENTS.md` and technical map specify Unreal. Treat Unreal as current repository direction unless Joshua changes it.
3. **Paperclip naming/topology:** latest history says Paperclip is Mission Control on `:3100`, and no Agent Hub listens on `:3130`. Verify live identity before relying on ports.
4. **Root/path drift:** the repository has moved between drive letters. Use verified `DREAM_ROOT`; do not hardcode a guessed drive or reintroduce the removed nested `DreamOnline/` copy.
5. **State-file age:** `STATE.md` and `ops/current-state.md` are dated 2026-07-08 and may understate the recovered 2026-08-05 implementation. Update them only after a new evidence sweep.
6. **Design-index wording:** it contains an older statement that no game server/game loop exists, while Node prototypes now exist. Preserve the distinction between local prototypes and an actual game server.
7. **Adapter/model lists:** provider names and versions age quickly. Verify availability, auth mode, terms, costs, and safety before enabling any route.
8. **Public/private boundaries:** internal documents mention implementation and compliance concerns that must never be copied directly into player-facing text.

## 11. Fable and Codex working agreement

### Fable

- Own synthesis, architecture reconciliation, threat/risk review, and acceptance criteria.
- Inspect the real diff and evidence before approving a canonical landing.
- Identify which decisions require Joshua rather than pretending architecture settled them.
- Keep the first playable bounded.

### Codex

- Implement bounded, repository-backed slices.
- Run relevant tests and capture actual output.
- Keep changes isolated, reviewable, and free of unrelated files.
- Never claim Unreal/runtime behavior that was not executed and observed.
- Hand the diff and evidence to Fable for review.

### Both

- Read current repository state before every work session.
- Do not overwrite another agent's uncommitted work.
- Never commit secrets, local auth state, session exports, provider responses containing private data, or classified material.
- Use branches and pull requests; do not force-push.
- Preserve rollback paths.
- Prefer one verified vertical slice over broad speculative scaffolding.
- Record exact commands, outputs, changed files, and remaining uncertainty.

## 12. Required first response from Fable

Before implementation, Fable should return:

1. the checked-out commit and verified local root;
2. whether the working tree is clean and whether other agent work is present;
3. actual Live NPC Lab and DreamOps test/health results;
4. a concise current-state correction separating implemented, scaffolded, and planned features;
5. resolution proposals for the conflicts in section 10;
6. Fable's independent recommendations;
7. one bounded first implementation slice for Codex;
8. objective acceptance criteria and rollback for that slice;
9. any decision that must be made by Joshua before work proceeds.

Do not install Unreal, Visual Studio workloads, CMake, or other heavyweight interactive software; deploy externally; enable paid model calls; change payment/account behavior; process child data; move the repository; or execute destructive recovery without Joshua's explicit approval.

## 13. Paste-ready prompt for Fable

> Pull the current `main` from `Trollz1004/dream-online`, then read `docs/handoffs/FABLE-DREAM-ONLINE-START-HERE-2026-08-25.md` and follow its source order. Treat code, tests, runtime evidence, and Git history as implementation truth; treat the captured founder canon as product intent. Audit before editing, add your own recommendations, resolve or escalate the listed conflicts, and define the first bounded implementation slice for you and Codex. Do not install heavyweight software, deploy, enable paid provider calls, move the repository, expose credentials, access classified material, or rewrite existing work without verified need and Joshua's approval. Return the nine required items in section 12.

## 14. Completion standard

This handoff is complete when Fable can trace every major claim back to committed files, Git history, observed runtime evidence, or explicitly labeled founder intent; can explain what exists versus what is planned; and can give Codex one safe, testable next slice without rebuilding the project or losing prior work.
