# Pi Adapter

Paperclip alias: `pi`

CLI: `pi`

Provider: Pi CLI login lane.

Codex-class route for Pi:

```powershell
pi --model openai-codex/gpt-5.5
```

That `openai-codex` provider prefix matters. Generic `openai/*` is a standard
OpenAI route and is not the Codex-auth lane.

Separation: Pi can use `openai-codex/gpt-5.5`; Codex CLI cannot use Pi's
provider endpoint. Codex itself runs via `codex login` and Codex config.
Hermes/OpenRouter fallback routes must use Codex-named models such as
`openai/gpt-5.3-codex`, not generic `openai/gpt-5`.

Agents: declare adapter: pi for pi lane tasks.

Notes in manifest.

