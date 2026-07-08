# Live AI Load Test Plan

## Goal

Find the real per-user compute cost of a personal AI guide before the design depends on it.

## What To Measure

- Requests per minute before 429/rate-limit response.
- Streaming latency p50/p95/p99.
- Non-streaming latency p50/p95/p99.
- Credit cost per short Sup@ answer.
- Credit cost per long Sup@ answer.
- Credit cost per session memory summary.
- Failure modes: timeout, 429, invalid model, insufficient credits.
- Whether API responses include useful rate-limit or credit headers.

## Test Phases

### Phase 1: Single Player

- 20 direct chat requests.
- 20 event-triggered guide lines.
- 10 memory summaries.

Pass:

- No unhandled failures.
- Local fallback works.
- Average prompt/response length is acceptable.

### Phase 2: Small Party

- Simulate 8 players.
- Each player asks 1 question every 2 minutes.
- World sends 1 event every 5 minutes.
- Summaries every 10 minutes.

Pass:

- No gameplay-blocking queue.
- p95 guide latency acceptable.
- Credits burn projected safely.

### Phase 3: Slice Server

- Simulate 30 players.
- Use throttled guide calls.
- Include burst at world event start.

Pass:

- Provider queue stays below configured limit.
- No direct chat starves event summaries.
- Rate-limited requests degrade cleanly.

### Phase 4: Rate Limit Edge

- Deliberately exceed provider budget.
- Confirm 429 handling.
- Confirm per-player fairness.
- Confirm local fallback.

Pass:

- No crash.
- No exposed provider error to players.
- No lost memory events; delayed summaries remain queued.

## Launch Rule

Do not promise always-on personal AI. Promise a personal guide that remembers and responds at meaningful moments, with local fallback and provider scaling as revenue proves it.
