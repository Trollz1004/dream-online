---
name: find-skills
description: "Automatic skill discovery across .agents/skills, .claude/skills, agent/skills, ops/node/skills, and the Agent Marketplace before improvising workarounds."
version: 2.1.0
platforms: [windows, linux, macos]
---

# Find-Skills Discovery Protocol (2026-11-01)

## Mandatory Session Rule
Before improvising a manual workaround or claiming a capability is missing:
1. Check local synchronized skill roots:
   - `.agents/skills/<name>/SKILL.md`
   - `.claude/skills/<name>/SKILL.md`
   - `agent/skills/<name>/SKILL.md`
   - `ops/node/skills/<name>/SKILL.md`
2. Check the workflow registry in `api.workflow.json`, `workflow_api.json`, and `memory/obsidian-vault/Agent Universal/agent-workflow-graphy.json`.
3. Load the matching skill (including `remake` for 100% Yours validation and `reverse-engineer-anything` for clean-room REA binary/protocol analysis) and follow its verification gates.
- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.
- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).
