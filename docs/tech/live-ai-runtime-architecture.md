# Live AI Runtime Architecture

## Purpose

Design the AI runtime for DREAM ONLINE without accidentally making every player an always-on expensive cloud session.

The goal is a personal guide that feels alive, remembers the player, reacts to the world, and stays economically survivable at scale.

## Current Provider Evidence

1min.ai public API docs currently show:

- Base API: `https://api.1min.ai`
- Chat endpoint: `POST /api/chat-with-ai`
- Streaming chat: `POST /api/chat-with-ai?isStreaming=true`
- Required chat type: `UNIFY_CHAT_WITH_AI`
- Auth header style in current docs: `API-KEY: <api-key>`
- Default rate limit: `180 requests/minute`
- Credit capacity is account/team based and should be checked in the team admin account.

Local adapter docs currently mention older paths such as `/api/v1/oneai/chat`. Treat adapter paths as stale until smoke-tested against the current API docs.

## Principle

Sup@ should feel personal, but it should not call a premium model for every line, every second, or every ambient reaction.

Use local/stateful game logic first. Use AI where it creates memory, emotional weight, world adaptation, or content that cannot be hand-authored cheaply.

## AI Tier Ladder

| Tier | Runtime | Use |
|---|---|---|
| T0 | Local rules + Ollama/local model | Ambient chatter, tooltips, fallback lines, low-risk NPCs |
| T1 | 1min.ai chat/free or low-cost model | Normal Sup@ chat, named NPC flavor, quest explanations |
| T2 | Higher quality cloud route | Story beats, major decisions, faction consequences |
| T3 | Batch scheduled cloud | Session summaries, memory distillation, world event summaries |
| T4 | Founder-approved premium model | Only for rare flagship moments after cost proof |

## Per-Player Sup@ Runtime

Each player has four memory layers:

1. Hot context: current scene, location, active quest, last 10-20 relevant events.
2. Session memory: summary of this login session, updated every few minutes or on milestones.
3. Long memory: durable player facts, preferences, important choices, relationships.
4. Lore constraints: current world bible, faction rules, safety rules, canonical NPC facts.

Do not send full raw history to every request. Retrieve only the relevant memory slices.

## Sup@ Invocation Rules

Call cloud AI when:

- Player directly talks to Sup@.
- Player completes/fails a meaningful quest beat.
- Player enters a major new zone.
- Player asks for help after repeated failure.
- Player has a personal milestone worth remembering.
- A major world event affects the player.

Do not call cloud AI when:

- Player idles.
- Player repeats a common action.
- A canned line is enough.
- A combat warning must be instant.
- The request is purely UI/system feedback.

## Rate-Limit Budget Model

Given official default `180 requests/minute`, do not design above that without support confirmation.

Conservative launch budget:

- 1 live Sup@ cloud request per active player every 3-5 minutes on average.
- Direct chat bursts allowed, but queued/throttled per player.
- Batch summaries every 10-15 minutes or at logout.
- Local fallback always available when cloud is rate-limited.

Rough concurrency target at 180 RPM:

- 30 active players at 1 request/player/minute.
- 90 active players at 1 request/player/3 minutes.
- 180 active players at 1 request/player/5 minutes.

This is not the final capacity. Real capacity must be measured with the account key and current provider responses.

## Required Load Tests

Before any promise about personal AI guide scale:

1. Measure successful RPM against 1min.ai with the actual business account.
2. Measure p50/p95/p99 latency for streaming and non-streaming chat.
3. Measure credit burn per short guide reply.
4. Measure credit burn per session summary.
5. Test 429/rate-limit behavior.
6. Test degraded local fallback.
7. Test queue fairness when many players ask Sup@ at once.

## Degraded Mode

When cloud AI fails or is rate-limited:

- Sup@ uses local canned/persona lines.
- System queues non-urgent memory summaries.
- Player sees no provider error.
- Critical game actions continue normally.
- No quest is blocked by cloud AI availability.

## Data Boundary

Never send secrets, auth tokens, payment data, private admin logs, or raw internal prompts to player-facing AI providers.

Player memory sent to providers must be scoped to game facts and explicit player interactions inside the game.

## First Implementation Slice

Build this first:

- `supat_stub_reply(player_id, event_context)` returns local JSON response.
- `supat_cloud_reply(player_id, prompt, retrieved_memory)` calls 1min.ai only when enabled.
- `memory_writeback(player_id, event, summary, tags)` stores durable memory.
- `rate_limit_guard(provider, player_id)` enforces per-provider and per-player budgets.
- `fallback_reply(reason)` gives local safe response.

No direct premium-model dependency in core gameplay.
