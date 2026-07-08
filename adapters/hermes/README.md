# Hermes Adapter

Paperclip alias: `hermes`

CLI: `hermes`

Provider: hermes-router (local :11435). opencode_provider: "hermes-router"

Separation: single active CEO/operator runtime for ANTIGRAVITY Paperclip. Uses Hermes built-in tools/APIs/models and exposes visible work/status through `127.0.0.1:9119`. Paperclip should show Hermes-owned tasks/routines/issues/goals, not maintain permanent agent sprawl.

Used by the Hermes CEO lane. `.agents/skills/` are departments; subagents are temporary task workers.

Agent: adapter: hermes in AGENT.md

## Wake payload via env (TRO-41)
To prevent "command line too long" when Paperclip invokes the hermes adapter (hermes-paperclip-adapter spawns `hermes chat -q "<large rendered wake+issue>"`), the wake payload (PAPERCLIP_WAKE_PAYLOAD_JSON + siblings) is passed exclusively in the child env by the adapter runtime.

- Use adapters/hermes/env-aware-prompt-template.txt as `promptTemplate` in the agent's adapterConfig (hermes_local or equivalent).
- The rendered -q stays short; agent reads details from env with terminal tool + curl for API.
- Update manifests + agent configs accordingly for all Hermes CEO runs.
- Same pattern recommended for opencode when using large contexts (though opencode uses stdin for prompt).

