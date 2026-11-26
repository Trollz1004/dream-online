# Starter Kit Method Card

Short execution loop for every lane. Read in 30 seconds before writing code.

1. **Brainstorm three ways**: Write down three clean-room options, compare tradeoffs against House rules (`docs/house/SPINE.md`), and note why the runners-up lose.
2. **Pick and plan**: Choose the simplest deterministic design that requires zero marginal spend, zero third-party lock-in, and minimal diff surface.
3. **Write failing test first**: Add or extend an automated test (`node --test`, `npm test`, or Pester 3.4) and run it to confirm the expected failure before editing implementation code.
4. **Make it pass**: Implement complete, dependency-free production code (no stubs, no placeholders, no skipped checks) until the suite passes 100%.
5. **Verify on real artifact**: Probe the real CLI, HTTP endpoint, file diff, or live screenshot (Rule One: `200 OK` alone is never proof).
6. **Record handoff**: Log `DID / BROKE / NEXT / BLOCKED / FILES` using `%USERPROFILE%` / `%LOCALAPPDATA%` portable paths only.

## Tools & Transports (`ops/kit/server.mjs`)
- **House docs (read-only)**: `house_index` returns `docs/house/INDEX.md`; `house_search` searches across `docs/house` and `docs/standards`.
- **Code map (read-only)**: `map_search` and `map_section` search repository codemaps under `%USERPROFILE%\antigravity\.fable-kitchen\codemap`.
- **Skills (read-only)**: `skills_list` and `skills_get` list and read skills from `.agents/skills` in this repository and from `AGENCY SKILLS` under the `OneDrive` environment variable when present.
- **Memory**: `memory_search` queries fleet `ai-memory` with local `kit-memory.jsonl` fallback; `memory_add` stores non-secret notes.
- **Roles & Method (read-only)**: `role_get` loads a role definition and optional local override; `method_get` returns this method card.
- **Wheel inbox**: `wheel_status` (read-only) returns counts and names of tickets in `queued`, `running`, `done` today, and `failed` under `%USERPROFILE%\antigravity\.fable-kitchen\inbox`; `wheel_queue` (write) validates `lane` and `repo` against `ops/router/lanes.json` and `ops/router/repos.json` and writes one UTF-8 (no BOM) ticket to `inbox\queued` via a staging file and move.
- **Transports**: `stdio` is the default. Setting `HOUSE_MCP_HTTP=1` (or `--http`) enables the streamable HTTP transport (`/mcp`), which refuses to start unless `HOUSE_MCP_KEY` is set, binds the Alienware house address (`192.168.0.40`) from `ops/fleet/fleet-map.json` (never all interfaces, never loopback reach URLs), and refuses requests without a matching `Authorization: Bearer` header (`401`).

## Security & Boundaries
- **Zero secret or key storage**: Never write `sk-`, `AIza`, `ghp_`, `EAAA`, `.env` contents, vault contents, or literal user home paths into kit memory, commits, logs, or chat. Never log or print `HOUSE_MCP_KEY`.
- **Address doctrine**: Use LAN IPv4 node addresses from `ops/fleet/fleet-map.json` (`192.168.0.40`, `192.168.0.15`), never loopback reach URLs or retired node names.
- **Tool gate**: Starter kit MCP (`kit`) and `superpowers` (on demand) are in every Builder lane; `REA`, `remake`, `Agent-Reach`, and `last30days` stay locked to the trusted three (`Claude Opus 5.5 / Fable`, `Gemini 4 Carbon`, `GPT-6 Astra / GPT-6.1 Sol / Codex`).
