# Starter Kit Method Card

Short execution loop for every lane. Read in 30 seconds before writing code.

1. **Brainstorm three ways**: Write down three clean-room options, compare tradeoffs against House rules (`docs/house/SPINE.md`), and note why the runners-up lose.
2. **Pick and plan**: Choose the simplest deterministic design that requires zero marginal spend, zero third-party lock-in, and minimal diff surface.
3. **Write failing test first**: Add or extend an automated test (`node --test`, `npm test`, or Pester 3.4) and run it to confirm the expected failure before editing implementation code.
4. **Make it pass**: Implement complete, dependency-free production code (no stubs, no placeholders, no skipped checks) until the suite passes 100%.
5. **Verify on real artifact**: Probe the real CLI, HTTP endpoint, file diff, or live screenshot (Rule One: `200 OK` alone is never proof).
6. **Record handoff**: Log `DID / BROKE / NEXT / BLOCKED / FILES` using `%USERPROFILE%` / `%LOCALAPPDATA%` portable paths only.

## Security & Boundaries
- **Zero secret or key storage**: Never write `sk-`, `AIza`, `ghp_`, `EAAA`, `.env` contents, vault contents, or literal user home paths into kit memory, commits, logs, or chat.
- **Address doctrine**: Use LAN IPv4 node addresses from `ops/fleet/fleet-map.json` (`192.168.0.40`, `192.168.0.15`), never loopback reach URLs or retired node names.
- **Tool gate**: Starter kit MCP (`kit`) and `superpowers` (on demand) are in every Builder lane; `REA`, `remake`, `Agent-Reach`, and `last30days` stay locked to the trusted three (`Claude Opus 5.5 / Fable`, `Gemini 4 Carbon`, `GPT-6 Astra / GPT-6.1 Sol / Codex`).
