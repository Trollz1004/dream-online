# Codex Adapter

Paperclip alias: `codex`

CLI: `codex`

Provider: Codex CLI via OpenAI auth sign-in. Run it directly from
`C:\antigravity`.

Auth: run `codex login`, or `codex login --device-auth` when browser/device
auth is needed. Check with `codex login status`.

Codex itself runs through the Codex CLI auth/session and its local config. On
this machine `codex login status` reports ChatGPT auth and Codex config uses
`gpt-5.5`.

Do not route real Codex work through a `codex-mini` placeholder.

When another tool routes Codex-class work, its provider/model path must include
Codex. Pi can use `openai-codex/gpt-5.5`; OpenCode/OpenRouter fallbacks should
use Codex-named models such as `opencode/gpt-5.3-codex` or
`openrouter/openai/gpt-5.3-codex`. Generic `openai/*` is standard OpenAI, not
the Codex lane.

Separation: Codex is a local CLI login lane. Pi/OpenCode/Hermes routes are
separate wrappers and must not pretend a generic OpenAI endpoint is Codex auth.

Declare in agent AGENT.md: adapter: codex only when the runner can execute the
real Codex CLI lane.

See `opencode/opencode.json` `openai/gpt-5.5-pro` for the OpenCode high-quality
route.

