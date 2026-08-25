# Claude Adapter (Paperclip `claude_local`)

Purpose: run Claude Code as a DREAM lane through Paperclip.

CLI: `claude`

## How it works

Paperclip's native `claude_local` adapter type launches the real Claude Code CLI
using Joshua's own signed-in session. There is no proxy, no interception, and no
API key stored in this repo.

| Env var | Value | Why |
|---|---|---|
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | `8192` | keeps responses inside Paperclip's payload limits |

That is the whole list. In particular this adapter must **never** set
`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, or a non-default
`CLAUDE_CONFIG_DIR`.

## FCC is banned

An earlier version of this adapter pointed `ANTHROPIC_BASE_URL` at a local proxy
on `:8082` with the token `freecc` and an isolated `~/.claude-fcc` config dir, so
Paperclip believed it was talking to Claude while a shim answered instead. That
lane is permanently removed. If you find a redirected base URL, an `fcc-` binary,
or anything listening on `:8082` reappearing here, remove it and report it —
`health-check.ps1` fails on exactly those three signals.

## Health check

```powershell
pwsh -NoProfile -File adapters\claude\health-check.ps1
```

Checks: `claude` is on PATH, reports its version, and confirms nothing is
redirecting it.

## Notes

- Any agent can use this adapter, not just the CEO.
- Model is set in `manifest.yaml`, not here.
- Auth lives in the signed-in CLI session. Never put a key in this repo.
- Only a judge pushes, merges, or deletes. This adapter does not change that.
