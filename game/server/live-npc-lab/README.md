# Dream Live NPC Lab

Local prototype for Dream ONLINE live-NPC behavior.

This lab is intentionally small:

- No dependencies.
- No secrets.
- No cloud call by default.
- Local JSONL memory and event logs.
- Provider-gated design so OpenAI or another cloud model can be attached later without
  putting secrets in the game client.

## Run

```powershell
cd "E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\game\server\live-npc-lab"
npm start
```

## Local checks

```powershell
npm test
npm run test:first-playable
npm run test:ai-failures
npm run test:memory-scopes
npm run test:memory-compaction
npm run test:lore-retrieval
npm run test:contracts
```

`npm test` runs the smoke check, first-playable dialogue/event/memory flow, NPC
profile registry check, AI failure behavior policy check, scoped-memory retrieval
check, local memory compaction check, and local lore retrieval check. The
first-playable, failure-policy, memory-scope, memory-compaction, and lore-retrieval
checks use temporary local data directories so they do not add JSONL records to the
repo data folder.

Default URL:

```text
http://127.0.0.1:9127
```

## Endpoints

```text
GET  /health
GET  /contracts
GET  /contracts/:id
GET  /samples
GET  /samples/:id
GET  /world/zones
GET  /world/zones/:id
GET  /npc/profiles
GET  /npc/profiles/:id
POST /npc/dialogue
POST /npc/event
GET  /npc/memory?playerId=founder
GET  /npc/memory?scopes=player,npc,zone,global_event&playerId=founder&npcId=sup-guide&zone=first-gate&eventType=gate_flicker
POST /npc/memory/compact
GET  /npc/ai-failures?playerId=founder
```

Contract examples:

```text
http://127.0.0.1:9127/contracts
http://127.0.0.1:9127/contracts/character-profile
http://127.0.0.1:9127/contracts/combat-ability
http://127.0.0.1:9127/contracts/marketplace
http://127.0.0.1:9127/contracts/live-npc-memory
```

The contract endpoint serves local schema files only. It does not expose secrets,
provider keys, payment tokens, or classified material.

Sample examples:

```text
http://127.0.0.1:9127/samples
http://127.0.0.1:9127/samples/character-profile
http://127.0.0.1:9127/samples/combat-ability
http://127.0.0.1:9127/samples/world-event
```

The sample endpoint serves local prototype payloads only.

World-zone examples:

```text
http://127.0.0.1:9127/world/zones
http://127.0.0.1:9127/world/zones/first-gate
```

The world-zone endpoint serves local seed files only.

Memory-scope examples:

```text
http://127.0.0.1:9127/npc/memory?playerId=founder
http://127.0.0.1:9127/npc/memory?scopes=npc&npcId=sup-guide
http://127.0.0.1:9127/npc/memory?scopes=zone&zone=first-gate
http://127.0.0.1:9127/npc/memory?scopes=global_event&eventType=gate_flicker
```

Scoped memory can read local player dialogue, NPC dialogue, zone records, and global
event records. The endpoint returns local JSONL records with `scopeMatches`; it does
not expose provider prompts, secrets, credentials, payment data, or classified material.

Memory compaction example:

```json
{
  "playerId": "founder",
  "keepLatest": 20
}
```

Compaction writes `dialogue_summary` rows to `npc-memory-summaries.jsonl` and preserves
the raw `npc-memory.jsonl` dialogue log. It is a local retrieval helper, not a deletion
or cleanup operation.

NPC profile examples:

```text
http://127.0.0.1:9127/npc/profiles
http://127.0.0.1:9127/npc/profiles/sup-guide
http://127.0.0.1:9127/npc/profiles/camp-guard
http://127.0.0.1:9127/npc/profiles/market-runner
http://127.0.0.1:9127/npc/profiles/field-gatherer
http://127.0.0.1:9127/npc/profiles/c0d3x-rider
```

Profiles are local first-playable scaffolding for guide, guard, merchant, gatherer,
and world-recovery rider behavior. They define memory scopes and allowed proposed
actions only; game systems decide whether any proposal is applied.

## Local lore retrieval

Mock NPC dialogue can read bounded snippets from:

```text
data/lore-snippets.json
```

The retrieval layer matches the request zone, message, and tags before the mock NPC
reply is written to memory. It returns snippet ids and short local text only; it does
not call cloud providers or read private material.

## Example dialogue request

```json
{
  "npcId": "sup-guide",
  "playerId": "founder",
  "message": "What should I test first?",
  "worldState": {
    "zone": "first-gate",
    "timeOfDay": "dawn",
    "threat": "low"
  }
}
```

## Cloud model gate

Cloud calls stay disabled unless both values are set:

```powershell
$env:DREAM_ENABLE_CLOUD_AI="1"
$env:DREAM_AI_PROVIDER="openai"
```

The prototype still needs a provider implementation before it will call a paid model.
That is deliberate. Provider calls should be added only after Joshua approves the cost
and runtime boundary.

When cloud routing is enabled before a provider implementation exists, dialogue returns
a short local fallback and writes a sanitized row to `ai-failures.jsonl`. Failure rows
include route, NPC, player test id, zone, failure mode, safe status/timeout details,
and fallback line id; they do not store raw chat, secrets, credentials, or provider
responses.
