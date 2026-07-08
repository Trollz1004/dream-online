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
npm run test:contracts
```

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
POST /npc/dialogue
POST /npc/event
GET  /npc/memory?playerId=founder
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
