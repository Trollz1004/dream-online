# Grok Adapter (xAI)

Paperclip adapter type: `opencode_local`
Paperclip alias: `grok`
CLI: `grok` (v0.2.60+ alpha, at `~/.grok/bin/grok`)

## Auth

Browser sign-in only — no API keys:

1. Run `grok` CLI
2. Sign in with xAI account via browser when prompted
3. Session persists locally

Free alternative: Use `x-ai/grok-3:free` via OpenRouter (no sign-in needed).

## Registering an agent with this adapter

```json
{
  "adapterType": "opencode_local",
  "adapterConfig": {
    "cwd": "C:\\antigravity",
    "model": "grok-3"
  }
}
```

## Provider routing

- Canonical local: run `grok` and use the persisted CLI/browser login session
- Free: `openrouter` provider → `x-ai/grok-3:free` or `x-ai/grok-3-mini:free`

## Use cases

- Adversarial / red-team review (grok-adversarial agent preset)
- General coding and reasoning
- Second-opinion review (independent from Claude/FCC)

## Files

- `manifest.yaml` — adapter registration
- `README.md` — this file

## Health

```
grok --version
```

