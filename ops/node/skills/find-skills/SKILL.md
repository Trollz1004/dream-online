---
name: find-skills
description: "Automatic skill discovery across .agents/skills, .claude/skills, agent/skills, ops/node/skills, and the Agent Marketplace before improvising workarounds."
version: 2.0.0
platforms: [windows, linux, macos]
---

# Find-Skills Discovery Protocol (2026-10-28)

## Mandatory Session Rule
Before improvising a manual workaround or claiming a capability is missing:
1. Check local synchronized skill roots:
   - `.agents/skills/<name>/SKILL.md`
   - `.claude/skills/<name>/SKILL.md`
   - `agent/skills/<name>/SKILL.md`
   - `ops/node/skills/<name>/SKILL.md`
2. Check the workflow registry in `api.workflow.json` and `docs/memory-layer/agent-workflow-graphy.json`.
3. Load the matching skill and follow its verification gates.
