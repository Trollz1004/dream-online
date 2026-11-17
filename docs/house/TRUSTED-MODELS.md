# Trusted Models and Tool Gates

Plain sentences by design so every lane knows which models, MCP tools, and browsers are allowed.

## 1. Three trusted model families

- **Claude**: `Opus 5.5` and `Fable` via signed-in Claude Code.
- **Gemini**: `Gemini 4 Carbon` via signed-in `agy`.
- **OpenAI**: `GPT-6 Astra`, `GPT-6.1 Sol`, and `Codex` via signed-in Codex CLI.
- **Zero raw provider keys**: no raw provider API keys sit on any node. All model calls use signed-in official CLIs or the approved self-hosted gateway.

## 2. Config-based MCP access gate

- An MCP server cannot verify which model called it, so access is gated by which program's config enables the tools (`Builder` config set vs `Trusted-three` config set).
- **`Builder` set (all lanes)**: starter kit MCP (`kit`) and `superpowers` loaded on demand.
- **`Trusted-three` set (locked strictly to the three trusted families)**: `REA` (`reverse-engineer-anything` via `morluto/rea`), `remake`, `Agent-Reach`, and `last30days`.
- **YouTube stays off**: YouTube scraping and downloads stay disabled in all research tools.

## 3. Official signed-in browsers

- Only official signed-in browser lanes are allowed: `Gemini in Chrome`, `Claude in Chrome`, and `Codex for Chrome`.
- Zero third-party browser wrappers and zero cookie or session transfer ever.
