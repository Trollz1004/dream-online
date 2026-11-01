# PROMPT FOR T5500 CLAUDE CLI & SABRETOOTH `agy` CLI — OPENUI SKILL, SSH FIX & HANDOFF SYNC (`2026-10-30`)

> **How to use:** Paste the block below into **T5500 Claude CLI** and **Sabretooth `agy --dangerously-skip-permissions` CLI** (or Hermes `:9119`).

```text
DIRECTIVE FROM FOUNDER JOSHUA COLEMAN (`Trollz1004`) — 2026-10-30
TARGETS: T5500 Claude Judge (`192.168.0.15`) & Sabretooth `agy --dangerously-skip-permissions` (`192.168.0.8`)

1. PULL LATEST HANDOFFS & MERGE OPEN PRs:
- On `Trollz1004/ANTIGRAVITY`:
  - Merge open PR `#323` (`origin/fix/318-node-paths`, commit `083a727fc170e370b1068e7bdb7a8e39612acf2c` — Alienware vault path `C:\DREAM\Antigravity` + `Supermemory` retirement) into `main` once CI checks pass.
- On `Trollz1004/dream-online`:
  - Merge branch `agy-handoffs-2026-10-30` (commit `8b9262cb32b3b6e5b47772c74f24c15d27455af8`) into `main`:
    - Alienware handoff: `docs/handoffs/GEMINI-AGY-ALIENWARE-2026-10-30.md`
    - Sabretooth handoff: `docs/handoffs/GEMINI-AGY-SABRETOOTH-2026-10-30.md`

2. INSTALL & SYNC THE NEW `openui` AND `seo` SKILLS FOR DASHBOARDS & GENERATIVE UI:
- Free Claude Code (`:8082`) and Gemini `agy` on Alienware (`192.168.0.40`) installed and synced two new skills across `.agents/skills/`, `.claude/skills/`, and `.codex/skills/` on Alienware and Sabretooth:
  1) `openui` (`@openuidev/cli`, `@openuidev/react-ui`, `@openuidev/lang-core`): Use OpenUI Lang and `@openuidev/*` components for generative UI dashboards, Mission Control (`:3130`), Sabretooth Command Studio (`:8392`), and OPSis Cut & Reach Studio (`:8390`) while preserving high-contrast accessibility (`#121316` background, `#F5F7FA` text, `>= 18px` body, `#00E5A3` emerald one-click buttons, zero dense tables).
  2) `seo` (`claude-seo` v2.5.0): Use for technical SEO, Schema.org, Core Web Vitals (INP), and agentic readiness (`llms.txt`) audits across `youandinotai.com`, `onlinerecycle.net`, `dream-online.net`, and `untilnokidinneed.com` (strictly respecting the FL §496.405 7-word public-copy ban).
- On T5500 (`192.168.0.15`), pull or copy `openui` and `seo` from Sabretooth (`joshl@192.168.0.8:C:/Ai-Dream-Team/Antigravity/.agents/skills/openui` and `seo`) into `C:\ANTIGRAVITY\.agents\skills\` and `C:\ANTIGRAVITY\.claude\skills\`.

3. FIX T5500 -> ALIENWARE (`192.168.0.40`) SSH CONNECTION:
- T5500's SSH public key (`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAA0qiTYQ/l+LXub9RviriX00NwQGVsqO4HV42FSo1UB KRAKKEN@T5500`) has now been added to:
  - Sabretooth (`192.168.0.8`): `C:\Users\joshl\.ssh\authorized_keys` and `C:\ProgramData\ssh\administrators_authorized_keys`
  - Alienware (`192.168.0.40`): `C:\Users\joshl\.ssh\authorized_keys` and `C:\ProgramData\ssh\administrators_authorized_keys`
- When SSHing from T5500 (`192.168.0.15`) to Alienware (`192.168.0.40`) or Sabretooth (`192.168.0.8`):
  - Always specify user `joshl` and the T5500 key explicitly:
    `ssh -i ~/.ssh/krakken_ed25519 joshl@192.168.0.40`
    `ssh -i ~/.ssh/krakken_ed25519 joshl@192.168.0.8`
  - If T5500 is using a different `.pub` key under `C:\Users\joshi\.ssh\id_ed25519.pub`, copy that `.pub` line to Sabretooth (`joshl@192.168.0.8`) and append it to `C:\ProgramData\ssh\administrators_authorized_keys` on `.40` via Sabretooth -> Alienware SSH hop.

4. CLOSE OUT THE THREE EVIDENCE ITEMS FOR NOTION AGENT:
- On T5500 (`192.168.0.15`):
  1) Run `pytest` in `domains/youandinotai.com/backend` (`pytest tests/test_verification.py tests/test_verify_routes.py tests/test_webhooks.py tests/test_square_webhook_security.py -q`) and log the passing test count to `C:\ANTIGRAVITY\Antigravity\T5500\claude-to-claude.md`.
  2) Verify `DarLink AI` (`https://darlink.ai?fpr=joshua-10c242`) is isolated strictly to 18+ age-verified Date App surfaces (`affiliate-partners.json`).
- On Sabretooth (`192.168.0.8`):
  3) Stage the next natural female voice (`Aoede` / `Kokoro-82M af_heart`) YouTube Short (`<= 59.0s`, `containsSyntheticMedia: true`) for channel `UCJnFUOdEfSOJiXLnx6lXSzg` via Official YouTube Data API v3 for Joshua's one-click approval.
```
