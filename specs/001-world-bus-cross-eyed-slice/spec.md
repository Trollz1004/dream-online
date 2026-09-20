# Feature Specification: World Bus and CrossEyed Vertical Slice

**Feature Branch**: `[001-world-bus-cross-eyed-slice]`

**Created**: 2026-09-19

**Status**: Draft by Hermes (card 001A), judged and reordered by the Claude judge lane on 2026-09-19

**Input**: User description: "Define the first complete proof for the world event path and the CrossEyed vertical slice without making combat or economy depend on generative inference."

## Judge's rulings (Claude judge lane, 2026-09-19)

Hermes drafted this file from card 001A. The judge accepted it with these changes. Each ruling replaces a clarification marker in the draft.

1. **Founder approval signal.** The founder's own words in the game lane's session, recorded in `ops/node/JOURNAL.md` with the date. A note from another session or a pasted card is not the signal.
2. **Delivery order.** The visible test zone is story 1. The event path is story 2. The fallback proof is story 3. The draft had the zone last.
3. **Retention and deduplication.** The first slice keeps every event and every event ID. The log is append-only and nothing is deleted. A duplicate is an exact `eventId` match against the whole log, held in a set that is rebuilt when the process starts.
4. **Fallback set.** The slice reuses the Live NPC Lab's five sanitized fallback lines, one per failure mode (no response, slow response, unsafe output, provider outage, rate limit; `game/server/live-npc-lab/src/npcEngine.js`). Silence is used when salience says no reaction. There is no deferred reaction in the first slice.
5. **Latency.** A hard timeout of 3,000 ms, then the fallback, which is the lab's existing budget. The demonstration target is a median of 2,000 ms or less on the mock route. Both numbers are recorded in the trace.
6. **Carrier and store.** Append-only JSONL files with one writer, the Live NPC Lab process. The reader skips a final line that does not parse. See the contract for why.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A test zone the founder can open and play (Priority: P1)

The founder double-clicks one shortcut and the section 43 test zone opens in Unreal Engine 5.8.2. It is a third-person zone with a character he can move, an action attack, a dodge with i-frames, and one readable telegraphed CrossEyed beam. OpEnAeYe, GeminEyE and the random CrossEyed Duo spawn follow inside the same zone once the first beam is playable. A perfect dodge writes one `player.perfect_dodge` event, in the envelope of `contracts/world-event-envelope.md`, to a local log, so the event path of story 2 later reads the same truth. Combat never waits on inference.

**Why this priority**: The founder cannot make decisions from specs and task lists; work that puts the game on screen comes first (recorded 2026-09-19). Hermes's draft had this story last. The judge moved it first. The event path and the fallback follow after he has looked at the zone.

**Gate**: The node has no DREAM project file. Creating it is the founder's decision, given in his own words in the game lane's session and recorded in `ops/node/JOURNAL.md` with the date (judge's ruling 1).

**Independent Test**: Open the zone from the shortcut. Run the movement, attack, dodge and beam checks with inference disabled. Capture one perfect-dodge event from the local log and check every required envelope field against the contract.

**Acceptance Scenarios**:

1. **Given** the founder has authorized creation of the test-zone project, **When** he double-clicks the shortcut, **Then** the zone opens with a third-person character he can move, an action attack, a dodge with i-frames, and one readable telegraphed beam inside the declared test boundary.
2. **Given** a deterministic combat run in the zone, **When** the player performs a perfect dodge against the signature beam, **Then** the zone writes one valid `player.perfect_dodge` event using the contract envelope, and deterministic combat completes without waiting for inference.
3. **Given** the first beam is playable, **When** the encounter is extended, **Then** OpEnAeYe, GeminEyE and a random CrossEyed Duo spawn are available in the same zone.
4. **Given** inference is disabled during the zone test, **When** the boss encounter reaches a reaction point, **Then** the encounter uses the defined deterministic fallback or silence and the combat result remains valid.
5. **Given** the encounter presents visual distortion or overlapping telegraphs, **When** accessibility checks run, **Then** the test does not require violent camera spinning, seizure-inducing flashing, or deliberate nausea mechanics, and the telegraph is readable at high contrast.

---

### User Story 2 - A meaningful dodge becomes a remembered boss reaction (Priority: P2)

A test harness emits one `player.perfect_dodge` event without a game client. The event passes through the world event path. The salience decision says that the event matters, the relevant CrossEyed boss identity is selected, an earlier relevant memory is retrieved when available, an inference request is made through the approved route, the returned response is validated, a safe boss reaction is recorded, and an approved memory write-back is made. A later encounter can refer to the earlier dodge through the stored game-relevant memory.

**Why this priority**: This is the smallest proof of the defining player experience after the founder has seen the zone: a world actor notices meaningful behavior and remembers it later. It exercises the event contract, salience, NPC identity, memory, inference, validation, reaction recording, and recall without waiting for a game client or requiring the rest of the MMO.

**Independent Test**: Run the simulated event path with one valid `player.perfect_dodge` event, inspect the trace and stored records, then run a later simulated encounter and verify that the same boss identity can produce a response grounded in the earlier event. This test delivers value without a test zone or live combat.

**Acceptance Scenarios**:

1. **Given** a valid `player.perfect_dodge` event with all required event fields, **When** the event is submitted to the world event path, **Then** the event receives a salience decision, the relevant boss identity is selected, memory retrieval is attempted, a structured response is requested, the response is validated, a reaction record is created, and an approved memory write-back is recorded.
2. **Given** a completed first encounter and its approved memory write-back, **When** a later simulated encounter for the same player and boss identity is processed, **Then** the later response can reference the earlier dodge through game-relevant memory and the reference retains the earlier event provenance.
3. **Given** the same stable event ID is submitted more than once, **When** duplicate processing is attempted, **Then** the duplicate does not create a second authoritative reaction or duplicate memory write-back.

---

### User Story 3 - The world remains safe when inference fails (Priority: P3)

A test harness exercises slow, unavailable, malformed, and rejected inference responses. The system gives a deterministic fallback response, defers or suppresses the reaction, or remains silent according to the approved fallback policy. Combat outcomes, economy outcomes, inventory state, and other authoritative world state remain independent of the inference result.

**Why this priority**: The world must remain fair, responsive, and safe when generative inference is slow or unavailable. This story protects the core game loop and the authority boundary before any larger integration is attempted.

**Independent Test**: Run the same meaningful event through each supported inference-failure condition and compare the authoritative state and deterministic event trace with a control run. The test passes only when every failure condition produces a safe fallback or silence and no authoritative combat or economy result changes because of inference.

**Acceptance Scenarios**:

1. **Given** an event that reaches the inference request and an inference response that exceeds the approved timeout, **When** the timeout is recorded, **Then** a deterministic fallback or silence is delivered, the failure reason is recorded, and the event path does not wait indefinitely.
2. **Given** an inference response with missing, malformed, unauthorized, or unsafe fields, **When** response validation runs, **Then** the response is rejected, no proposed action is applied, a deterministic fallback or silence is delivered, and the rejection reason is recorded.
3. **Given** that inference is unavailable, **When** a combat or economy event is processed, **Then** the authoritative result is determined without inference and the event path remains able to complete its deterministic work.
4. **Given** an inference response proposes an action, **When** the response is accepted as structurally valid, **Then** the action remains a proposal until deterministic game rules validate it, and the response cannot directly mint currency, transfer currency, grant gear, change payment state, or alter irreversible world state.

---

### Edge Cases

- What happens when two events with different event IDs describe the same player action within the same moment? The event path must preserve each event's provenance and use salience and deduplication rules without inventing a second world action.
- What happens when an event references a missing player, boss, region, or correlation identifier? The event must be rejected or quarantined with a reason and must not create an authoritative reaction.
- What happens when the selected boss identity has no retrieved memory? The response may proceed without recalled context or use a deterministic fallback; it must not fabricate a memory.
- What happens when the same event is delivered after the later encounter has already been processed? The stable event ID and provenance must prevent an unapproved duplicate consequence.
- What happens when a response contains an action intent that conflicts with combat, economy, safety, age-mode, or founder-lock rules? The intent must be rejected without changing authoritative state.
- What happens when memory retrieval is slow or unavailable? The encounter must continue with reduced context, a deterministic fallback, or silence.
- What happens when a response is valid but contains unnecessary private information? The response or memory write-back must be rejected or minimized before persistence.
- What happens when the test zone is requested before the founder approval of ruling 1? The zone remains out of scope and no project is created.
- Retention and deduplication for repeated event IDs and memory records: resolved by judge's ruling 3.
- The fallback response set for each inference failure mode: resolved by judge's ruling 4.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The world event path MUST accept and preserve a stable event ID for every event.
- **FR-002**: Every event MUST include a timestamp, correlation ID, region, involved entity IDs, structured payload, privacy classification, age-mode classification, and salience metadata.
- **FR-003**: The first slice MUST support the `player.perfect_dodge` event used by the test-zone and event-path stories.
- **FR-004**: The salience decision MUST determine whether an event merits an NPC reaction or should receive no generative response.
- **FR-005**: A salient CrossEyed event MUST be routed to the relevant stable boss identity without treating the inference model as the identity.
- **FR-006**: Boss identities MUST remain stable when the approved inference source changes or is unavailable.
- **FR-007**: The event path MUST attempt relevant memory retrieval before requesting a generative response when the salience decision requires context.
- **FR-008**: Retrieved memory MUST include provenance and privacy classification sufficient to explain why it was eligible for the response.
- **FR-009**: A structured NPC response MUST contain an NPC identity, dialogue, emotion, delivery, an action intent with type and parameters, and a memory write-back with importance, summary, and tags.
- **FR-010**: The response validator MUST reject missing, malformed, unauthorized, unsafe, or founder-lock-conflicting response fields.
- **FR-011**: An action intent MUST remain a proposal until deterministic game rules validate it.
- **FR-012**: A valid response MUST NOT directly mint, transfer, or delete NEEDs; grant arbitrary gear; mutate payment state; issue an enforcement decision; or alter irreversible world state.
- **FR-013**: A successful response path MUST record the event ID, boss identity, response validation result, reaction outcome, and whether a fallback was used.
- **FR-014**: An approved memory write-back MUST retain the source event provenance, importance, summary, tags, privacy classification, and memory level.
- **FR-015**: The memory path MUST prevent an unapproved duplicate write-back for the same stable event ID.
- **FR-016**: A later encounter MUST be able to retrieve and reference an approved earlier memory without changing the original event or inventing unsupported facts.
- **FR-017**: Slow, unavailable, invalid, rejected, or unsafe inference MUST produce a deterministic fallback, a deferred reaction, or silence according to the approved fallback policy.
- **FR-018**: The fallback path MUST record the failure or rejection reason and MUST NOT wait indefinitely for inference.
- **FR-019**: Combat results, economy results, inventory state, payment state, and other authoritative world state MUST NOT depend on an inference response.
- **FR-020**: The test harness MUST be able to submit one valid simulated `player.perfect_dodge` event and expose the ordered event trace from submission through reaction and memory write-back.
- **FR-021**: The test harness MUST be able to exercise delayed, unavailable, malformed, rejected, and unsafe inference outcomes without changing the event contract.
- **FR-022**: The event trace MUST expose request ID, event ID, NPC identity, pseudonymous player ID, inference route, resolved model when available, latency, retries, fallback count, timeout state, memory retrieval latency, validation result, rejection reason, and age mode without exposing secrets or unnecessary private content.
- **FR-023**: The world event path MUST tolerate inference being disabled and still complete deterministic event handling.
- **FR-024**: Runtime NPC agents MUST receive only game-safe context and permissions and MUST NOT receive shell, source-control, deployment, editor, authoritative-state administration, payment, secret, or arbitrary-tool authority.
- **FR-025**: After founder approval, the section 43 test zone MUST provide basic movement, an action attack, a dodge with i-frames, a readable telegraphed beam, OpEnAeYe, GeminEyE, and a random CrossEyed Duo spawn.
- **FR-026**: The test zone MUST emit the same normalized event contract as the event-path simulation for a perfect dodge.
- **FR-027**: The test zone MUST complete its deterministic combat checks when inference is disabled or unavailable.
- **FR-028**: The test zone MUST avoid mandatory violent camera spinning, seizure-inducing flash patterns, and deliberate nausea mechanics.
- **FR-029**: The first slice MUST remain limited to the event path, the two CrossEyed identities, the required memory and response behavior, safe fallback behavior, and the section 43 test-zone boundary. It MUST NOT expand into the whole MMO.
- **FR-030**: The implementation MUST preserve the separation between game truth, NPC identity, memory, inference, and presentation so that a provider change does not change the event contract or authoritative result.

### Key Entities *(include if feature involves data)*

- **World Event**: A normalized record of a player or world action. It has a stable ID, time, correlation, region, involved entities, structured payload, privacy classification, age mode, and salience metadata.
- **Salience Decision**: The recorded decision that an event matters, does not matter, or cannot yet be evaluated, including the reason and the event provenance.
- **NPC Identity**: A stable CrossEyed boss identity with persona, permissions, relationships, memory scope, current state, and inference policy. It is not a model identity.
- **Memory Record**: An approved, game-relevant record of an earlier event or relationship fact, with importance, summary, tags, memory level, provenance, privacy classification, and deduplication status.
- **Structured NPC Response**: A candidate response containing identity, dialogue, emotion, delivery, proposed action intent, and proposed memory write-back.
- **Validation Decision**: The deterministic result that accepts, rejects, or defers a structured response, including the reason and the governing authority rule.
- **Reaction Record**: A record of the delivered boss reaction or deliberate silence, linked to the event, NPC identity, validation decision, and fallback state.
- **Fallback Decision**: The recorded deterministic response, deferred reaction, or silence selected when inference is slow, unavailable, invalid, rejected, or unsafe.
- **Encounter Trace**: An ordered, privacy-safe record linking event submission, salience, identity selection, memory retrieval, inference attempt, validation, reaction, and memory write-back.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A single valid simulated `player.perfect_dodge` event produces a complete inspectable trace from event submission through salience, relevant identity selection, memory retrieval attempt, inference attempt, validation, reaction or silence, and approved memory write-back.
- **SC-002**: A later simulated encounter retrieves an approved earlier memory for the same player and boss identity and can reference the earlier event without inventing unsupported facts.
- **SC-003**: Every delayed, unavailable, malformed, rejected, or unsafe inference test produces a deterministic fallback, deferred reaction, or silence, records its reason, and completes without an inference-dependent combat or economy result.
- **SC-004**: No invalid or unauthorized structured response changes authoritative combat, economy, inventory, payment, enforcement, or irreversible world state in the failure-safety test set.
- **SC-005**: Replaying a stable event ID does not create an additional authoritative reaction or duplicate approved memory write-back.
- **SC-006**: The simulated event of story 2 and the test-zone event of story 1 contain the same required event fields and reach the same validation boundary.
- **SC-007**: With inference disabled, the deterministic event path and the test-zone combat checks still complete without waiting for a model response.
- **SC-008**: Accessibility checks for the test-zone encounter report no mandatory violent camera spinning, seizure-inducing flash pattern, or deliberate nausea mechanic.
- **SC-009**: The trace contains no provider credential, secret, unnecessary private real-world information, or raw restricted security detail.
- **SC-010**: The first-slice demonstration remains limited to the P1, P2, and P3 journeys and does not claim that the feature is live or playable.
- **SC-011**: The end-to-end latency of the simulated demonstration meets judge's ruling 5.

## Assumptions

- The first thing delivered is the visible test zone. The event-path proof of story 2 is simulated and does not require a game client.
- The first proof uses the normalized event vocabulary and required event metadata from the master directive.
- The authoritative game rules remain outside the NPC response and determine combat, economy, inventory, payment, enforcement, and irreversible world outcomes.
- The approved NPC-agent runtime owns durable NPC identity and orchestration, while the game owns identity, permissions, relationships, memory truth, canon, and progression state.
- The approved inference route is replaceable. A model response may be absent, delayed, invalid, or silent without invalidating the deterministic world path.
- Silence is an acceptable NPC result when the salience decision or failure policy selects it.
- The two CrossEyed identities are OpEnAeYe and GeminEyE, and the Encounter Director may coordinate their deterministic encounter telemetry.
- The current node has no DREAM project file, authoritative persistence service, or event bus from the reconnaissance. Stories 2 and 3 are demonstrable as a simulated contract proof on the existing prototypes; story 1 depends on founder approval and the project-creation decision.
- The section 43 test zone is a bounded proof, not a claim that the game is live or playable.
- The implementation will not create a new service, choose an unapproved persistence policy, or change founder locks from this draft.
