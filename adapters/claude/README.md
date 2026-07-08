# FCC-Claude Adapter (Paperclip `claude_local`)

Paperclip adapter type: `claude_local`
Paperclip alias: `claude`
CLI: `fcc-claude`

## How it works

This adapter uses Paperclip's native `claude_local` adapter type. FCC becomes the
backend purely through environment variables injected into the agent's config:

| Env Var | Value | Purpose |
|---------|-------|---------|
| `ANTHROPIC_BASE_URL` | `http://127.0.0.1:8082` | Redirect Claude SDK to FCC proxy |
| `ANTHROPIC_AUTH_TOKEN` | `freecc` | FCC auth token (not an Anthropic key) |
| `CLAUDE_CONFIG_DIR` | `C:\Users\joshl\.claude-fcc` | Lane isolation (Trio Separation Law) |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | `8192` | Fit free-provider output caps |

Paperclip thinks it talks to real Claude Code. The FCC proxy intercepts requests
and routes them to free providers (OpenRouter, Ollama, OpenCode, etc.).

## Registering an agent with this adapter

When creating/hiring an agent in Paperclip, use:

```json
{
  "adapterType": "claude_local",
  "adapterConfig": {
    "cwd": "C:\\antigravity",
    "model": "claude-sonnet-4-5-20250929",
    "env": {
      "ANTHROPIC_BASE_URL": "http://127.0.0.1:8082",
      "ANTHROPIC_AUTH_TOKEN": "freecc",
      "CLAUDE_CONFIG_DIR": "C:\\Users\\joshl\\.claude-fcc",
      "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "8192"
    }
  }
}
```

Any agent can use this adapter — not just the CEO. The FCC env vars make it free.

## Health check

```powershell
pwsh -NoProfile -File C:\antigravity\adapters\claude\health-check.ps1
pwsh -NoProfile -File C:\antigravity\adapters\claude\health-check.ps1 -Json
```

Checks: fcc-claude in PATH, FCC proxy responding at :8082, config dir exists.

## Files

- `manifest.yaml` — adapter registration with Paperclip adapter type + env config
- `health-check.ps1` — structured availability check (exit 0 = healthy)
- `run-with-env-payload.ps1` — legacy standalone launcher (pre-Paperclip native)
- `README.md` — this file

## Separation rules

- NO Anthropic API key — ever. FCC proxy only.
- Dedicated `openai` provider in opencode.json (gpt-5.5). Never share with `codex`.
- Config dir `~/.claude-fcc` is isolated from real Claude (`~/.claude`) and Ollama (`~/.claude-ollama`).

