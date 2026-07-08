# DREAM Adapter Mirror

This folder mirrors the current ANTIGRAVITY adapter manifests for DREAM ONLINE.
The copied manifests point `paperclip_adapter_config.cwd` at this portable
`DREAM_ROOT` instead of `C:\antigravity`.

## Mirrored Adapters

- `codex` — Codex CLI auth-signin lane.
- `pi` — Pi CLI lane; Codex-class model path stays `openai-codex/gpt-5.5`.
- `opencode` — OpenCode local/provider ladder.
- `hermes` — Hermes CEO/operator lane.
- `grok` — Grok CLI/browser-auth lane.
- `gemini` — Gemini CLI/browser-auth lane.
- `claude` — Claude/FCC helper lane.
- `ollama-local` — local Ollama fallback.
- `1minai` — cloud API reference/config.

## Rule

Do not register these as permanent PaperclipAI seats. Standing PaperclipAI lanes
remain Claude CEO and Hermes CEO. These adapter manifests are tools/helpers for
Agent Hub, PaperclipAI, Hermes, or a temporary subagent when Joshua assigns a
concrete task.

## Source Of Truth

Canonical source remains `C:\antigravity\adapters\`. Refresh this mirror from
that folder when the repo adapter manifests change.

Use the path-aware sync helper, not a blind copy:

```powershell
E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG\adapters\sync-from-antigravity.ps1
```

It copies canonical adapter files and rewrites manifest paths from
`C:\antigravity` to `DREAM_ROOT`, so Paperclip/Agent Hub runs against the DREAM
drive when a DREAM task is assigned.
