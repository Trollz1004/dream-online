# DREAM Adapter Mirror

This folder mirrors the current ANTIGRAVITY adapter manifests for DREAM ONLINE.
The copied manifests point `paperclip_adapter_config.cwd` at the fixed root
`C:\DREAM\dream-online` instead of `C:\antigravity`.

Paperclip is parked, so these manifests are reference until it returns. Their
`cwd` is the Alienware checkout, and `node_id` says `alienware` to match. If
Paperclip ever runs on Sabretooth again, the adapter must reach the Alienware
checkout through the node mechanism rather than a local path.

## Mirrored Adapters

- `codex` — Codex CLI auth-signin lane.
- `pi` — Pi CLI lane; Codex-class model path stays `openai-codex/gpt-5.5`.
- `opencode` — OpenCode is configured by the git-ignored `opencode/opencode.json` at
  the repo root, not by a folder under `adapters/`.
- `hermes` — Hermes CEO/operator lane.
- `grok` — Grok CLI/browser-auth lane.
- `gemini` — Gemini CLI/browser-auth lane.
- `claude` — Claude Code helper lane (real CLI, no proxy).
- `ollama-local` — local Ollama fallback.
- `1minai` — cloud API reference/config.

## Rule

Do not register these as permanent PaperclipAI seats. Standing PaperclipAI lanes
remain Claude CEO and Hermes CEO. These adapter manifests are tools/helpers for
Paperclip, Hermes, or a temporary subagent when Joshua assigns a
concrete task.

## Source Of Truth

Canonical source remains `C:\antigravity\adapters\`. Refresh this mirror from
that folder when the repo adapter manifests change.

Use the path-aware sync helper, not a blind copy:

```powershell
C:\DREAM\dream-online\adapters\sync-from-antigravity.ps1
```

This script is git-ignored and exists only on the node, not in the repo. It copies
canonical adapter files and rewrites manifest paths from `C:\ANTIGRAVITY` to
`DREAM_ROOT`, so Paperclip runs against the DREAM repo when a DREAM task is assigned.
