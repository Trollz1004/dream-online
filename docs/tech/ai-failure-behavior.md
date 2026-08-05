# AI Failure Behavior Rules

Status: P0 runtime planning

Purpose: define what Dream live NPC systems do when an AI reply cannot be trusted,
cannot arrive in time, or cannot be reached. These rules keep first-playable
gameplay moving without exposing provider errors to players or tying core actions
to cloud availability.

## Player Promise

The guide may be quieter during degraded service, but the player can still move,
fight, gather, talk, and complete the first playable loop.

Do not promise always-on personal AI. Promise a guide that remembers meaningful
moments and falls back cleanly when cloud service is unavailable.

## Failure Modes

| Mode | Trigger | Player-facing behavior | System behavior |
| --- | --- | --- | --- |
| No response | Provider returns empty body, malformed body, or missing reply field | Use a short local guide line | Log `ai_no_response`, skip memory writeback unless local context is valid |
| Slow response | Provider exceeds timeout budget | Use local fallback immediately | Mark request timed out, queue non-urgent summary if needed |
| Unsafe output | Reply breaks safety, monetization, lore, or action allowlist rules | Replace with local safe line | Log `ai_unsafe_output`, store rejected reason without raw sensitive data |
| Rate limit | Provider returns 429 or local call budget is exceeded | Use local fallback with no provider wording | Throttle player/provider route, keep critical gameplay local |
| Provider outage | DNS, connection, 5xx, auth failure, or provider disabled | Use local fallback | Open degraded mode for provider route until health recovers |

## Cost Guard Fields

Every cloud-capable dialogue route must carry:

- `maxTokens`
- `timeoutMs`
- `maxCallsPerPlayerPerHour`
- `fallbackProvider`

If the hourly player call budget is exceeded, the runtime must return the local
rate-limit fallback before invoking the provider callback.

## Timeout Budget

- First playable dialogue timeout: 3 seconds.
- Combat, danger, and movement feedback timeout: 0 seconds; use local rules only.
- Session summary timeout: 10 seconds because it is non-urgent.
- Any timed-out request must not block quest progress, inventory changes, combat
  validation, gathering, or world-event logging.

## Local Fallback Rules

Fallback replies must be:

- Short.
- In-world.
- Free of provider names, account status, and technical error text.
- Clear about the next playable action.
- Limited to approved safe action proposals.

Approved action proposals remain:

- `suggest_hint`
- `suggest_marker`
- `suggest_event_pause`
- `suggest_quest_note`

Disallowed fallback behavior:

- Executing commands.
- Changing inventory, currency, combat stats, or marketplace state.
- Promising uptime, refunds, rewards, or real-money value.
- Surfacing internal prompts, logs, stack traces, provider names, or cost details.

## Unsafe Output Gate

Before any AI reply reaches a player-facing surface, check:

1. The reply does not sell combat power.
2. The reply does not claim real-money benefit from NEEDs.
3. The reply does not mention private accounting or unrelated business operations.
4. The reply does not name direct competitors.
5. The reply does not expose secrets, local paths with private material, or provider
   credentials.
6. Proposed actions are on the allowlist.
7. World-changing proposals are suggestions only, not execution.

If any check fails, discard the AI reply and return fallback.

## Degraded Mode Levels

| Level | Condition | Allowed behavior |
| --- | --- | --- |
| Green | Provider healthy and within budget | Normal route selection |
| Yellow | Timeouts, 429s, or intermittent failures | Prefer local fallback; allow only direct player chat retries |
| Red | Outage, auth failure, unsafe burst, or repeated malformed replies | Disable provider route; local guide only |

Recovery from Red requires a local health check plus one successful non-player test
call before restoring player traffic.

## Logging Contract

Failure logs should capture:

- Timestamp.
- Player id or anonymized test id.
- NPC id.
- Zone id.
- Failure mode.
- Provider route name.
- Timeout or status code when safe.
- Fallback line id.

Failure logs must not capture secrets, raw provider credentials, private vault
material, payment data, or full raw player chat by default.

## First Prototype Acceptance

This slice is ready when the Live NPC Lab can prove:

- A disabled provider route returns a local fallback.
- A timed-out provider route cannot block dialogue response.
- An unsafe action proposal is rejected.
- Failure rows can be inspected without secrets.
- Existing local NPC memory and world-event tests still pass.
