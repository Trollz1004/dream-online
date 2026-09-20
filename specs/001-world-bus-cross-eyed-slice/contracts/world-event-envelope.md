# Spec 001 Draft: CrossEyed World Event Contract

Status: Draft by Hermes (card 001C), judged by the Claude judge lane on 2026-09-19. Version 0.1.0.

## Judge's rulings (2026-09-19)

1. **Carrier and store: option 1, append-only JSONL.** The Live NPC Lab already writes `world-events.jsonl` through one function, `handleWorldEvent`, so there is one writer and no interleaving. It needs nothing installed. The reader skips a final line that does not parse. Options 2 and 3 stay on file for when there is more than one writer.
2. **Privacy classification, version 0.1.** Two values. `game-relevant-only` is the default: pseudonymous identifiers only, may be stored and may reach NPC context. `restricted` is never sent to inference and is kept only in the trace.
3. **Salience metadata, version 0.1.** `candidateReason` (string, required), `reactionEligible` (boolean, required), `score` (number from 0 to 1, optional). The contract sets no threshold.
4. **Age mode wire values.** `CHILD_SAFE`, `TEEN`, `STANDARD`, `NIGHTMARE_13_PLUS`. The display name stays "NIGHTMARE 13+"; the wire value has no space or plus sign.
5. **Retention and deduplication.** Keep everything. A duplicate is an exact `eventId` match against the whole log.
6. **Codex's seven proposed names.** All seven fit the naming rule. None is adopted into this slice. They are reviewed for adoption when Codex's crowdfunding-loops specification lands.

This contract is sized for the CrossEyed vertical slice in Spec 001. It defines the normalized event envelope and the smallest event catalog needed to move from zone entry, through the signature dodge, to a later encounter that can recall the earlier behavior. It does not start a world bus, create a project, or select a storage option.

The contract preserves the authority boundary from the master directive: deterministic game rules own combat, economy, inventory, payment, enforcement, and irreversible world state. An NPC or model may observe, remember, speak, and propose; it may not become the authority over those results.

## Event envelope

Every event in this slice uses the following envelope. The nine fields required by section 12 of the master directive are listed below alongside `schemaVersion` and `eventName`, which are included so that the envelope can be versioned and so that the section 12 candidate event names have one stable location.

- `schemaVersion`
  - Type: string.
  - Required: yes.
  - Meaning: The version of this envelope contract, not the version of a particular encounter or model.
  - Example: `"0.1.0"`.

- `eventId`
  - Type: string.
  - Required: yes.
  - Meaning: A stable unique identifier for this one fact. Re-delivery of the same identifier must be recognizable as a duplicate rather than a new world action.
  - Example: `"evt-cross-eyed-000001"`.

- `eventName`
  - Type: string.
  - Required: yes.
  - Meaning: The normalized name of the fact or state transition, using the naming rule below.
  - Example: `"player.perfect_dodge"`.

- `timestamp`
  - Type: string containing a UTC date-time value.
  - Required: yes.
  - Meaning: When the source observed or authoritatively recorded the event. It is not the time when a later reaction finishes.
  - Example: `"2026-09-19T19:30:00.000Z"`.

- `correlationId`
  - Type: string.
  - Required: yes.
  - Meaning: The identifier that groups related events in one encounter, test run, or world transition. It allows a later trace to connect the dodge, response, reaction, and memory write-back without replacing the individual event IDs.
  - Example: `"enc-cross-eyed-0001"`.

- `region`
  - Type: string.
  - Required: yes.
  - Meaning: The world region in which the event is authoritative. The value must be a game region identifier, not a real-world location.
  - Example: `"first-gate"`.

- `involvedEntityIds`
  - Type: array of strings.
  - Required: yes.
  - Meaning: The stable game entity identifiers directly involved in the fact. The array may include a player, boss, encounter, region-owned actor, or other game entity, but must not contain unnecessary real-world identity data.
  - Example: `["player:player-001", "npc:openaeye-001", "encounter:cross-eyed-0001"]`.

- `structuredPayload`
  - Type: object.
  - Required: yes.
  - Meaning: Event-specific facts required to understand and validate the event. It is data, not a prose prompt and not a model response.
  - Example: `{ "attackName": "Focus Beam", "dodgeResult": "perfect", "iFrameConfirmed": true }`.

- `privacyClassification`
  - Type: string.
  - Required: yes.
  - Meaning: The privacy handling class that limits who may read, retain, or forward the event.
  - Example: `"game-relevant-only"` is used provisionally in the example below solely to show a filled string field; it is not an adopted allowed value.
  - Allowed values: resolved by judge's ruling 2.

- `ageModeClassification`
  - Type: string.
  - Required: yes.
  - Meaning: The age-sensitive presentation and safety mode that governs how the event may be presented or delivered.
  - Example: `"STANDARD"`.
  - Allowed wire values are `"CHILD_SAFE"`, `"TEEN"`, `"STANDARD"`, and `"NIGHTMARE_13_PLUS"` (judge's ruling 4). `CHILD_SAFE`, `TEEN`, and `STANDARD` are the presentation profiles named in section 25. `NIGHTMARE 13+` is the darker layer named in section 36. The under-13 experience described in section 35 is a safety context, not an additional value invented by this contract.

- `salienceMetadata`
  - Type: object.
  - Required: yes.
  - Meaning: Metadata used by the salience and relevance filter to decide whether the event merits memory retrieval or an NPC reaction. It must explain the decision without becoming a model-generated authority decision.
  - Example: `{ "candidateReason": "signature dodge against Focus Beam", "reactionEligible": true }`.
  - Members: resolved by judge's ruling 3.

An event publisher must fill every required field before the event enters the world event path. A missing or malformed envelope is rejected or quarantined with a reason. A valid event may still receive a salience result of no reaction; validity does not require a model call.

## Event naming rule

Event names use a stable lowercase namespace, a dot, and a lowercase snake-case fact or state-transition phrase, as shown by section 12 names such as `player.perfect_dodge`, `boss.spawned`, `world.event_started`, and `economy.anomaly_detected`. The namespace identifies the source or domain, and the suffix states what happened rather than requesting an action, describing a model thought, or naming a user-interface effect. Names are facts that can be replayed and audited. A new meaning must not be silently assigned to an existing name.

## CrossEyed slice event catalog

This catalog contains only the events needed for the first zone-to-recall proof. It does not add the wider event vocabulary from section 12 to the slice.

### `player.entered_region`

- Emitted when a player crosses into the section 43 test region or enters it again for a later encounter.
- Emitter: the deterministic zone boundary or the no-client test harness.
- Payload fields: `playerId`, `entryPoint`, and `priorRegion` where a prior region exists. `priorRegion` may be null for the first entry.
- Slice use: establishes the region context and provides the later-encounter entry that can lead to memory retrieval.

### `boss.spawned`

- Emitted when the CrossEyed encounter creates the OpEnAeYe and GeminEyE encounter presence after the random spawn condition is met.
- Emitter: the deterministic encounter rules and Encounter Director.
- Payload fields: `encounterId`, `bossId`, `bossRole`, `spawnMode`, and `spawnRegion`.
- Slice use: records that the relevant boss identity exists before the signature attack.

### `player.perfect_dodge`

- Emitted when the player completes a confirmed i-frame dodge against the signature beam during the CrossEyed encounter.
- Emitter: the deterministic action-combat rules or the equivalent no-client test harness.
- Payload fields: `playerId`, `encounterId`, `bossId`, `attackName`, `dodgeResult`, `iFrameConfirmed`, and `combatOutcomeId`.
- Slice use: this is the P1 event that passes salience, identity selection, memory retrieval, response validation, reaction recording, and memory write-back.

### `boss.phase_changed`

- Emitted when the later CrossEyed encounter enters a new deterministic phase or reaction point where prior player behavior may be relevant.
- Emitter: the deterministic encounter rules and Encounter Director.
- Payload fields: `encounterId`, `bossId`, `previousPhase`, `newPhase`, and `phaseReason`.
- Slice use: provides the later encounter context in which the approved memory from `player.perfect_dodge` may be retrieved and referenced. The recalled dialogue or reaction is a consequence of this event path, not a new authoritative combat rule.

The catalog deliberately uses `player.entered_region` again for later entry rather than inventing a second name. The same event name means the same kind of fact, with a new stable event ID and correlation ID.

## Complete `player.perfect_dodge` example

The privacy value in this example is provisional only; the privacy taxonomy is the clarification above. The salience object shows an illustrative shape only; its mandatory members and allowed values remain the clarification above.

```json
{
  "schemaVersion": "0.1.0",
  "eventId": "evt-cross-eyed-000001",
  "eventName": "player.perfect_dodge",
  "timestamp": "2026-09-19T19:30:00.000Z",
  "correlationId": "enc-cross-eyed-0001",
  "region": "first-gate",
  "involvedEntityIds": [
    "player:player-001",
    "npc:openaeye-001",
    "encounter:cross-eyed-0001"
  ],
  "structuredPayload": {
    "playerId": "player-001",
    "encounterId": "cross-eyed-0001",
    "bossId": "openaeye-001",
    "attackName": "Focus Beam",
    "dodgeResult": "perfect",
    "iFrameConfirmed": true,
    "combatOutcomeId": "combat-outcome-0001"
  },
  "privacyClassification": "game-relevant-only",
  "ageModeClassification": "STANDARD",
  "salienceMetadata": {
    "candidateReason": "signature dodge against Focus Beam",
    "reactionEligible": true
  }
}
```

The example contains no model response, secret, credential, real-world identity, payment state, or economy mutation. A response and memory write-back are downstream records with their own validation and authority rules.

## Versioning rule

Every envelope carries `schemaVersion`. Older readers must continue to read every field they already understand and ignore unknown additive fields. A new optional field may be added in a compatible minor version after its meaning and privacy behavior are documented. A required field, an existing field's meaning, an event name's meaning, or the type of an existing field must not change silently; such a change requires a new major contract version or a new event name. Publishers must preserve `eventId`, `correlationId`, and the original event name when retrying the same fact. Deprecated fields remain readable for the agreed transition period, and removal is a major-version decision.

An event-specific payload change that changes the meaning of an existing fact must use a new event name or a major version. A payload addition that older readers can safely ignore may use the compatible additive version rule. Retention and deduplication: resolved by judge's ruling 5.

## Review of Codex-proposed event names

The following seven names are reviewed only against the naming syntax. They are not adopted or rejected by this draft; that decision belongs to the judge.

- `npc.name_assigned` follows the lowercase namespace-dot-snake-case form. `npc` is a source/domain namespace and `name_assigned` states a completed fact. It is outside the CrossEyed slice catalog.
- `gossip.message_seeded` follows the same lowercase namespace-dot-snake-case form and describes a fact rather than a request. `gossip` is not one of the slice namespaces, so its catalog ownership remains for judge review.
- `gossip.message_observed` follows the same form and describes an observation fact. It is outside this slice and is not adopted here.
- `world.fable_recorded` follows the same form and describes a completed world record. It is outside this slice and is not adopted here.
- `world.fable_reference_resolved` follows the same form and describes a completed resolution. It is outside this slice and is not adopted here.
- `referral.memory_seeded` follows the same form and describes a memory-seeding fact. It is outside this slice and is not adopted here.
- `npc.referral_greeting_delivered` follows the same form and describes a delivered reaction. It is outside this slice and is not adopted here.

## Options for carrying and storing the events

These are options for the judge, not a selection. They assume one Windows machine, no existing event bus, no existing database, and the two prototypes' zero-dependency posture.

### Option 1: Append-only JSONL files with a local reader

- What it needs installed: Nothing beyond the existing prototype runtime and filesystem access.
- What it costs to run: Very little CPU or memory; storage grows with event volume and retention policy.
- How it fails: A process interruption can leave a partial final line, concurrent writers can interleave incorrectly, and an unbounded log can become slow to read. Replay and deduplication must be explicit.
- How hard it is to replace later: Low to moderate. A stable envelope and a reader boundary make it straightforward to publish the same records to another carrier later, but existing logs need migration and indexing.

### Option 2: One local relay with an in-memory queue and a JSONL write-ahead log

- What it needs installed: The existing Node runtime; no new external service.
- What it costs to run: A small resident process and bounded memory, plus local file writes. The cost remains low for the slice's test volume.
- How it fails: A process crash can lose events that have not reached the write-ahead log, the queue can apply backpressure, and a malformed record can block a batch unless quarantine is explicit. A single process is a local availability boundary.
- How hard it is to replace later: Moderate. The relay's input and output adapters can be replaced if they preserve the envelope, but the queue and replay behavior must be tested during migration.

### Option 3: A local SQLite file behind an event-contract adapter

- What it needs installed: SQLite support and a reviewed local driver or command-line tool. This introduces a dependency that the current prototypes do not have.
- What it costs to run: Low local CPU and memory for the slice, with stronger indexed retrieval than raw JSONL. The operational cost is the added dependency and schema-migration discipline.
- How it fails: File locking, interrupted writes, file corruption, incompatible schema changes, or a mistaken migration can prevent reads or writes. The event contract must remain valid even when the store is unavailable.
- How hard it is to replace later: Moderate to high depending on the adapter quality. A contract-first boundary makes replacement possible, but queries, indexes, migration history, and recovery behavior must be translated.

The judge selected option 1 (ruling 1 at the top of this file).

## What this contract intentionally leaves out

- It does not choose the event carrier or storage option.
- It does not define a salience algorithm, score threshold, or model-selection policy.
- It does not define the complete NPC response schema; it references the structured response and validation boundary from Spec 001 without allowing a response to become world authority.
- It does not define memory retention, decay, compaction frequency, or deduplication duration beyond requiring provenance and duplicate safety.
- It does not define combat damage, stamina tuning, i-frame duration, boss health, rewards, NEEDs, marketplace state, or progression values.
- It does not define the full world event vocabulary, Vengeance events, guild events, economy events, gossip events, referral events, or seasonal events outside the four-event CrossEyed slice catalog.
- It does not define a test-zone project, client presentation, animation, audio, camera implementation, or accessibility control implementation.
- It does not expose secrets, provider credentials, payment data, raw private identity, or anti-cheat detection internals.
- It does not grant runtime NPC agents shell, source-control, deployment, editor, authoritative-state, payment, secret, or arbitrary-tool authority.
- It does not permit combat or economy outcomes to depend on a model response.
- It does not resolve the seven Codex-proposed event names; it only checks their naming syntax for the judge.
