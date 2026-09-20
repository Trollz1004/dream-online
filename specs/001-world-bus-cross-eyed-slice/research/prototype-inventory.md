# Spec 001 Prototype Inventory

Date: 2026-09-19. Written by Hermes from card 001B.

Judge's verdict (Claude judge lane, 2026-09-19): accepted as written. A separate worker checked about 85 concrete claims against the code, the negative claims included, and found none wrong. Five cited line ranges stop one line before the closing brace. Three facts the judge adds: the Live NPC Lab serves JSON only, so there is no page a person can look at today; the lab already keeps an append-only event log; and no code path connects DreamOps Bridge to the lab yet.

This is a read-only inventory of the two existing local prototypes for reuse in Spec 001. No test suite was run because the card forbids it. No repository, service, configuration, skill, memory, or secret file was modified. No `.env` file was opened or printed. The protected `ops/node/` tree and the OneDrive `claude-to-claude` folder were not touched, and `C:\DREAM\hermes\scripts\dream-stack.ps1` was not run.

The two prototypes are local JSON and JSONL systems. The Live NPC Lab defaults to `127.0.0.1:9127`, and DreamOps Bridge defaults to `127.0.0.1:9133`. The port contract is documented in `C:\DREAM\dream-online\docs\tech\local-prototype-ports.md`, lines 8-16 and 57-78.

## Live NPC Lab

Source root: `C:\DREAM\dream-online\game\server\live-npc-lab`.

The process starts from `src/server.js` and delegates dialogue, world-event logging, memory retrieval, compaction, and AI-failure reading to `src/npcEngine.js`. Its route definitions are in `src/server.js`, lines 63-215.

### HTTP routes

- `GET /health` accepts no body or query parameters. It returns `{ ok: true, service: "dream-live-npc-lab", ts }`. It is defined in `src/server.js`, lines 67-74.
- `GET /contracts` accepts no body or query parameters. It returns the local contract index from `data/schema-index.json`. It is defined in `src/server.js`, lines 76-79.
- `GET /contracts/:id` accepts a contract identifier in the path. It returns the matching local contract JSON with status 200, or `{ ok: false, error: "contract_not_found" }` with status 404. It is defined in `src/server.js`, lines 81-95.
- `GET /samples` accepts no body or query parameters. It returns the local sample index from `data/samples/sample-index.json`. It is defined in `src/server.js`, lines 98-101.
- `GET /samples/:id` accepts a sample identifier in the path. It returns the matching local sample JSON with status 200, or `{ ok: false, error: "sample_not_found" }` with status 404. It is defined in `src/server.js`, lines 103-120.
- `GET /world/zones` accepts no body or query parameters. It returns `{ ok: true, zones }` for the currently registered zone identifiers. It is defined in `src/server.js`, lines 123-129.
- `GET /world/zones/:id` accepts a zone identifier in the path. It returns the corresponding local zone seed JSON with status 200, or `{ ok: false, error: "zone_not_found" }` with status 404. It is defined in `src/server.js`, lines 131-145.
- `GET /npc/profiles` accepts no body or query parameters. It returns the full local NPC profile set from `data/npc-profiles.json`. It is defined in `src/server.js`, lines 147-150.
- `GET /npc/profiles/:id` accepts an NPC identifier in the path. It returns `{ ok: true, profile }`, or `{ ok: false, error: "npc_profile_not_found" }` with status 404. It is defined in `src/server.js`, lines 152-169.
- `POST /npc/dialogue` accepts a JSON body containing bounded `npcId`, `playerId`, `message`, and `worldState` values. The body is normalized by `buildNpcContext`, which is defined in `src/npcEngine.js`, lines 298-311. The route returns the dialogue result, including provider, reply, proposed actions, fallback information when degraded, and local lore snippets when the mock provider is used. The route is defined in `src/server.js`, lines 172-176, and the result path is implemented in `src/npcEngine.js`, lines 388-468.
- `POST /npc/event` accepts a JSON body containing `eventType`, `actorId`, `zone`, and an optional object `payload`. It appends a record containing `ts`, `kind`, `eventType`, `actorId`, `zone`, and `payload`, then returns `{ ok: true, recorded }`. The route is defined in `src/server.js`, lines 178-182, and the record shape is implemented in `src/npcEngine.js`, lines 503-518.
- `GET /npc/memory` accepts optional `playerId`, `npcId`, `zone`, `eventType`, and comma-separated `scopes` query parameters. It returns `{ ok, scopes, count, rows }`, with matching source and scope information on each row. The route is defined in `src/server.js`, lines 184-193, and retrieval is implemented in `src/npcEngine.js`, lines 695-745.
- `POST /npc/memory/compact` accepts an optional JSON body with `playerId` and `keepLatest`. It returns the compaction result, including summaries written, raw rows preserved, and summary records. The route is defined in `src/server.js`, lines 195-199, and compaction is implemented in `src/npcEngine.js`, lines 640-692.
- `GET /npc/ai-failures` accepts an optional `playerId` query parameter. It returns `{ ok, count, rows }` for the last matching AI-failure records. The route is defined in `src/server.js`, lines 201-204, and retrieval is implemented in `src/npcEngine.js`, lines 471-500.
- Any other method and path returns `{ ok: false, error: "not_found" }` with status 404. Unexpected route errors return `{ ok: false, error: "server_error", message }` with status 500. These behaviors are defined in `src/server.js`, lines 206-215.

### Provider gating, timeout, fallback, and disabled defaults

The provider name registry is defined in `src/providers.js`, lines 1-7. The named providers are `mock`, `openai`, `1min-ai`, `ollama-local`, and `hermes`.

The provider map enables only `mock` by default. `openai`, `1min-ai`, and `ollama-local` are disabled stubs. The Hermes provider is configured separately and is disabled unless the cloud flag is exactly `1` and `NPC_HERMES_WEBHOOK_URL` is non-empty. This is defined in `src/providers.js`, lines 16-27, 134-160.

`selectProvider` reads `DREAM_ENABLE_CLOUD_AI`, `DREAM_AI_PROVIDER`, `DREAM_AI_MAX_TOKENS`, `DREAM_AI_TIMEOUT_MS`, and `DREAM_AI_MAX_CALLS_PER_PLAYER_PER_HOUR`. Cloud is disabled unless `DREAM_ENABLE_CLOUD_AI` is `1`. The defaults are 500 maximum tokens, a 3,000 millisecond dialogue timeout, 20 calls per player per hour, and `mock` as the fallback provider. The bounds and selection are defined in `src/npcEngine.js`, lines 11-15 and 258-295.

The Hermes webhook provider has a 2,500 millisecond local provider timeout by default, bounds the webhook payload to NPC ID, player ID, zone, recent memory, and a 2,000-character prompt, and truncates the reply to 400 characters. It is defined in `src/providers.js`, lines 45-53 and 65-131.

Proposed actions are allowlisted to `suggest_hint`, `suggest_marker`, `suggest_event_pause`, and `suggest_quest_note` in `src/providers.js`, lines 9-14 and 55-63. The provider interface filters actions again before returning them in lines 107-121.

Fallbacks are explicit and sanitized. The lab defines fallback lines for no response, slow response, unsafe output, provider outage, and rate limiting in `src/npcEngine.js`, lines 22-42. Fallback responses are logged without raw chat or provider output by `logAiFailure` and `fallbackDialogue`, lines 114-160. Timeout, provider failure, rate-limit, and candidate-validation branches are handled in `src/npcEngine.js`, lines 388-443.

The cost guard records in-memory call timestamps per provider and player, enforces the hourly limit, and selects the rate-limit fallback. It is defined in `src/npcEngine.js`, lines 224-255. The README confirms that cloud calls are disabled by default and that the prototype needs an approved provider implementation before a paid model is called, in `README.md`, lines 167-204.

One boundary matters for Spec 001: the registered provider map is allowlisted, but `selectProvider` accepts the environment's provider string and the non-mock dialogue path can receive an injected `providerCall` function. The existing tests use that injection for controlled failure and cost scenarios. A future event path must preserve the provider abstraction while ensuring that only approved routes can be selected in the authoritative runtime.

### NPC memory scope, compaction, retrieval, and disk storage

The lab derives its data directory from `DREAM_LIVE_NPC_DATA` or the repository data directory. It defines these files in `src/npcEngine.js`, lines 4-10:

- `C:\DREAM\dream-online\game\server\live-npc-lab\data\npc-memory.jsonl` stores dialogue memory rows.
- `C:\DREAM\dream-online\game\server\live-npc-lab\data\npc-memory-summaries.jsonl` stores compaction summaries when compaction writes one.
- `C:\DREAM\dream-online\game\server\live-npc-lab\data\world-events.jsonl` stores world-event rows.
- `C:\DREAM\dream-online\game\server\live-npc-lab\data\ai-failures.jsonl` stores sanitized failure rows when a failure occurs.
- `C:\DREAM\dream-online\game\server\live-npc-lab\data\lore-snippets.json` supplies local lore retrieval.

The current repository data contains `npc-memory.jsonl` and `world-events.jsonl`. The memory log contains dialogue rows with timestamps, provider route, context, reply, and lore snippet IDs. The world-event log contains rows with timestamps, `kind: "world_event"`, event type, actor, zone, and payload. The summary and failure paths are defined in code and are created on demand.

The supported memory scopes are `player`, `npc`, `zone`, and `global_event`, defined in `src/npcEngine.js`, line 53. Query parsing and compatibility behavior are defined in lines 521-549. Player, NPC, and zone matches for dialogue rows are defined in lines 551-570. Zone and global-event matches for world-event rows are defined in lines 572-584. Summary matching is defined in lines 586-610.

`readMemory` reads raw dialogue rows, then summary rows, and then world-event rows when the query requests zone or global-event scopes. It labels each result with `source` and `scopeMatches`, sorts by timestamp, and returns the last 50 rows. This is implemented in `src/npcEngine.js`, lines 695-745.

`compactMemory` groups dialogue rows by player, preserves the newest `keepLatest` rows, writes one `dialogue_summary` row for older rows, and never removes the raw dialogue log. The default is 20 latest rows. This is implemented in `src/npcEngine.js`, lines 612-692. The compaction test confirms that raw rows remain unchanged and that repeated compaction does not write another summary, in `test/memory-compaction.mjs`, lines 27-67.

The formal memory contract is in `data/live-npc-memory.schema.json`, lines 1-305. It describes NPC profiles, memory records, retrieval requests, dialogue turns, proposed actions, and provider routes. The runtime JSONL row written by `handleDialogue` is a prototype record rather than a complete instance of that compound contract; it stores route, context, reply, and optional lore IDs at `src/npcEngine.js`, lines 418-425 and 448-455.

## DreamOps Bridge

Source root: `C:\DREAM\dream-online\game\server\dreamops-bridge`.

The process binds to `127.0.0.1:9133` by default. It initializes local storage and writes a service-start audit entry before listening. This is defined in `src/server.js`, lines 6-14 and 28-30. Storage paths and default JSON files are defined in `src/storage.js`, lines 11-29 and 31-84.

### HTTP routes

- `GET /health` accepts no body or query parameters. It returns `{ status: "ok", service: "dreamops-bridge", dreamRoot, localOnly: true }`. It is defined in `src/routes.js`, lines 44-51.
- `GET /world/health` accepts no body or query parameters. It reads world state, event state, and the NPC memory queue and returns them with active-event, paused-event, and pending-memory counts. It is defined in `src/routes.js`, lines 53-64.
- `GET /events` accepts no body or query parameters. It returns the contents of `events.json` as an object with an `events` array. It is defined in `src/routes.js`, lines 66-68.
- `POST /events/:id/pause` accepts an event identifier in the path and a JSON body with an optional `reason` and `actor`. It changes the matching event to `paused`, preserves the previous state, writes the event file, appends an audit record, and returns the event, audit entry, and save timestamp. It is defined in `src/routes.js`, lines 70-83.
- `GET /economy/scan` accepts no body or query parameters. It reads the economy snapshot, checks NEEDs totals and item warning arrays, and returns `status`, `warningCount`, `warnings`, and the snapshot. The route is defined in `src/routes.js`, lines 22-37 and 86-88.
- `GET /npc/memory-queue` accepts no body or query parameters. It returns the pending, processing, completed, and failed memory queues from `npc_memory_queue.json`. It is defined in `src/routes.js`, lines 90-92.
- `GET /checkpoints` accepts no body or query parameters. It returns `{ checkpoints }` from local checkpoint files. It is defined in `src/routes.js`, lines 94-96, and checkpoint reading is implemented in `src/storage.js`, lines 127-136.
- `POST /rollback/plan` accepts an optional JSON `checkpointId` and `actor`. It returns a dry-run-only plan with the target checkpoint, required approval, non-destructive status, and planned steps, then appends an audit record. It is defined in `src/routes.js`, lines 98-120.
- `POST /hotfix/propose` accepts optional JSON `title`, `risk`, `summary`, `files`, and `actor`. It returns a proposal-only object with required checks and `applyAvailable: false`, then appends an audit record. It is defined in `src/routes.js`, lines 122-140.
- Unknown routes return `{ error: "not_found" }` with status 404, as defined in `src/routes.js`, lines 9-11 and 142-143. Unexpected request errors return a 500 JSON response from `src/server.js`, lines 16-25.

Mutating routes write to the local audit log through `audit`, which records `ts`, `action`, `actor`, and `detail`. The audit implementation is in `src/audit.js`, lines 4-14. The README confirms that rollback execution is not available, mutations are audited, storage is JSON-only, and the service is local-only, in `README.md`, lines 25-43.

## Test inventory

### Live NPC Lab test files

The package manifest is `C:\DREAM\dream-online\game\server\live-npc-lab\package.json`, lines 7-18. The composite `npm test` command runs smoke, first-playable, NPC profiles, AI failure behavior, cost guards, memory scopes, memory compaction, lore retrieval, and Hermes provider tests. It does not include `provider-interfaces.mjs` or `contracts.mjs`.

- `test/smoke.mjs` checks the default mock route, a local dialogue response, a `gate_opened` world event, and player memory retrieval. Run with `npm run test:smoke` or `node test/smoke.mjs`.
- `test/first-playable-flow.mjs` checks the mock first-playable dialogue, next prototype focus, a `gate_flicker` event, JSONL event persistence, and memory retrieval. Run with `npm run test:first-playable` or `node test/first-playable-flow.mjs`.
- `test/npc-profiles.mjs` checks profile-set version, project and zone identity, no-secret and proposal-only rules, required NPC IDs and roles, unique IDs, memory scopes, and allowed action types. Run with `npm run test:npc-profiles` or `node test/npc-profiles.mjs`.
- `test/ai-failure-behavior.mjs` checks provider outage, timeout, unsafe action rejection, sanitized failure rows, and fallback line selection. Run with `npm run test:ai-failures` or `node test/ai-failure-behavior.mjs`.
- `test/cost-guards.mjs` checks configurable token, timeout, hourly call, and mock-fallback settings, then verifies the second call is rate-limited without invoking the provider again. Run with `npm run test:cost-guards` or `node test/cost-guards.mjs`.
- `test/memory-scopes.mjs` checks player, NPC, zone, and global-event retrieval and confirms that zone retrieval combines NPC memory with world-event rows. Run with `npm run test:memory-scopes` or `node test/memory-scopes.mjs`.
- `test/memory-compaction.mjs` checks summary creation, raw-row preservation, summary retrieval, and idempotent repeated compaction. Run with `npm run test:memory-compaction` or `node test/memory-compaction.mjs`.
- `test/lore-retrieval.mjs` checks bounded zone and tag matching, mock dialogue inclusion of the selected lore, and lore ID persistence in memory. Run with `npm run test:lore-retrieval` or `node test/lore-retrieval.mjs`.
- `test/provider-hermes.mjs` checks Hermes-disabled behavior, bounded webhook payloads, reply truncation, allowed-action filtering, timeout fallback, sanitized failure rows, and the HTTP dialogue route. Run with `npm run test` or `node test/provider-hermes.mjs`.
- `test/provider-interfaces.mjs` checks the provider-name registry, enabled and disabled provider states, mock output, disabled-provider errors, and unknown-provider errors. There is no package script for this file; run it directly with `node test/provider-interfaces.mjs`.
- `test/contracts.mjs` checks the contract index version and safety rules, ensures contract IDs and paths are unique and repository-relative, and parses every indexed contract JSON file. Run with `npm run test:contracts` or `node test/contracts.mjs`.

The test files create temporary data directories for most behavior checks. No tests were run for this inventory because the card explicitly forbids execution.

### DreamOps Bridge test files

No test directory or test file was found under `C:\DREAM\dream-online\game\server\dreamops-bridge`. Its `package.json`, lines 7-13, defines only `npm start` and no test command. The bridge therefore has no discoverable automated test command in this prototype.

## Existing event-like objects

The Live NPC Lab has the strongest existing event-like record. `handleWorldEvent` creates an object with `ts`, `kind`, `eventType`, `actorId`, `zone`, and `payload`, then appends it to `world-events.jsonl`. The object shape is defined in `src/npcEngine.js`, lines 503-518. Existing records are present at `data/world-events.jsonl`, lines 1-2, with timestamps, `kind: "world_event"`, event types, actors, zones, and payload objects.

The Live NPC Lab also has a formal event contract in `data/world-event.schema.json`, lines 1-199. It requires `schemaVersion`, `eventId`, `displayName`, `eventType`, `zoneId`, `state`, `trigger`, `duration`, `playerImpact`, `eventLayers`, `npcVisibility`, and `rollback`. The sample event at `data/samples/world-event.sample.json`, lines 1-42, includes a scheduled time, event type, zone, duration, player impact, event layers, NPC visibility, and rollback requirements.

The formal event contract and the runtime JSONL event are not yet the same shape. The schema's event-type enum is focused on world events such as `gate_flicker`, `dream_shift`, and `nightfall_surge`, while the runtime logger accepts any bounded `eventType` string and does not validate the schema. The section 43 event `player.perfect_dodge` is not present in the schema enum.

DreamOps Bridge has event-like objects in `game/server/events.json`, lines 2-18. Each has an `id`, `name`, `state`, `risk`, and `notes`, but these objects have no timestamp or payload. The same default event objects are defined in `dreamops-bridge/src/storage.js`, lines 45-62. The bridge's audit entries are time-stamped action records with actor and detail, defined in `src/audit.js`, lines 4-13, but they are audit records rather than normalized world events.

## Section 54 contract inventory

### Normalized event schema

Label: PARTIAL.

Evidence: `live-npc-lab/data/world-event.schema.json`, lines 1-199, provides a formal event schema with IDs, event type, zone, trigger, layers, player impact, NPC visibility, and rollback. `live-npc-lab/src/npcEngine.js`, lines 503-518, provides a separate lightweight event logger with timestamp and payload. The runtime logger does not validate the formal schema, does not require the directive's stable event ID, correlation ID, involved entity IDs, privacy classification, age mode, or salience metadata, and the formal enum does not include `player.perfect_dodge`.

### NPC memory schema

Label: PARTIAL.

Evidence: `live-npc-lab/data/live-npc-memory.schema.json`, lines 1-305, defines NPC profiles, memory records, retrieval requests, dialogue turns, proposed actions, and provider routes. `live-npc-lab/src/npcEngine.js`, lines 695-745, implements scoped retrieval and lines 640-692 implement compaction. However, the runtime dialogue rows written at lines 418-425 and 448-455 are prototype JSONL rows rather than complete instances of the compound schema, and the required provenance, importance, privacy classification, and memory-level behavior are not consistently present in every runtime row.

### Structured response schema

Label: PARTIAL.

Evidence: `live-npc-lab/data/live-npc-memory.schema.json`, lines 163-257 and 219-257, defines dialogue-turn and proposed-action shapes. `live-npc-lab/src/providers.js`, lines 107-121, validates a candidate reply and filters proposed actions. The current response path does not produce the complete section 39 response shape with NPC identity, dialogue, emotion, delivery, action intent parameters, and memory write-back in one validated response.

### Action validator

Label: PARTIAL.

Evidence: `live-npc-lab/src/npcEngine.js`, lines 163-205, rejects missing replies, unsafe reply text, and unapproved proposed-action types. `live-npc-lab/src/providers.js`, lines 55-63 and 107-121, applies a second proposed-action allowlist. The existing validator protects the dialogue prototype, but it is not yet the deterministic game action validator that can validate world mutations, combat actions, economy actions, or founder-lock boundaries.

### Provider abstraction

Label: EXISTS.

Evidence: `live-npc-lab/src/providers.js`, lines 1-190, defines provider names, disabled providers, the mock provider, Hermes webhook construction, provider listing, provider lookup, and provider-call creation. `live-npc-lab/src/npcEngine.js`, lines 258-295 and 388-468, selects a route, applies cost and timeout guards, validates candidates, persists sanitized results, and falls back when the provider fails. The abstraction is reusable for Spec 001, subject to tightening runtime route selection as described in the provider section above.

### Thin DREAM Agent Gateway

Label: PARTIAL.

Evidence: `live-npc-lab/src/server.js`, lines 172-204, already exposes local NPC dialogue, event, memory, compaction, and failure routes. `dreamops-bridge/src/routes.js`, lines 44-140, already exposes local health, world inspection, event pause, economy scan, memory queue, checkpoint, rollback-plan, and hotfix-proposal routes. Neither prototype is the single thin gateway described by the directive's candidate `/dream/events`, `/dream/npc/respond`, `/dream/npc/:id/context`, `/dream/npc/:id/memory`, `/dream/actions/validate`, `/dream/providers/health`, and `/dream/health` contract. Reuse is possible, but the canonical boundary is not yet defined.

## Three best world-bus attachment points

1. `C:\DREAM\dream-online\game\server\live-npc-lab\src\npcEngine.js`, lines 503-518, immediately around `handleWorldEvent`. This is the smallest-change attachment because all current Live NPC Lab world-event writes already pass through one function that constructs the timestamped event record and appends it to `world-events.jsonl`. A world-bus adapter could observe the normalized record there without changing dialogue or memory retrieval.

2. `C:\DREAM\dream-online\game\server\live-npc-lab\src\server.js`, lines 178-182, at `POST /npc/event`. This is the stable HTTP ingress for simulated world events. A contract check and dispatch boundary can be added at the route edge while preserving the existing `handleWorldEvent` behavior for compatibility. This is the best attachment for the P1 no-client simulation because the test can submit one event without involving a client.

3. `C:\DREAM\dream-online\game\server\dreamops-bridge\src\routes.js`, lines 70-83, at `POST /events/:id/pause` after the event state mutation and audit entry. This is the existing operational state-change boundary. A bus attachment here could publish a normalized world-event transition after the bridge has persisted the state and audit evidence, without rebuilding the bridge's inspection routes or allowing an NPC response to mutate world state directly.

## Reuse boundary for Spec 001

The best existing foundation is the Live NPC Lab's mock-first dialogue path, bounded provider abstraction, sanitized failure fallback, scoped JSONL retrieval, compaction helper, and world-event append function. DreamOps Bridge contributes local health, event inspection, checkpoint visibility, audit records, deterministic economy scanning, and proposal-only rollback and hotfix plans.

The first Spec 001 implementation should not rebuild these foundations. It should add the smallest normalized event envelope around the existing world-event path, preserve the provider and fallback boundary, add the missing structured response and deterministic action-validation boundary, and define one thin gateway boundary that can expose the two prototypes without granting runtime NPCs operational authority.
