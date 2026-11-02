---
name: create-skills
description: "Author and synchronize new skills across all harness formats (SKILL.md, agents/openai.yaml, agents/gemini.toml, skill.json) on Alienware (.40) and Sabretooth (.8) so zero drift occurs."
version: 2.1.0
platforms: [windows, linux, macos]
---

# Create-Skills Multi-Harness Synchronizer (2026-11-01)

## Mandatory Multi-Harness Rule (Zero Drift)
Different harnesses read different paths and config formats (Claude reads `.claude/skills/*/SKILL.md`, OpenAI Codex reads `.agents/skills/*/agents/openai.yaml`, Gemini/AGY reads `agents/gemini.toml` and `GEMINI.md`, Hermes OPSis reads `ops/node/skills/*/SKILL.md`).
Whenever you create or update a skill:
1. Write `SKILL.md` with clean YAML frontmatter (`name`, `description`, `version`, `platforms`) — never put unescaped Windows backslashes inside double-quoted YAML strings.
2. Write `agents/openai.yaml` (`name`, `description`, `model`, `instructions_file: ../SKILL.md`).
3. Write `agents/gemini.toml` (`name`, `description`, `instructions = "../SKILL.md"`).
4. Write `skill.json` (`name`, `description`, `version`, `entry: "SKILL.md"`).
5. Run `node ops/node/sync-multi-harness-skills.mjs` to mirror the skill across `.agents/skills/`, `.claude/skills/`, `agent/skills/`, `ops/node/skills/`, and user home skill roots without dirtying unchanged files.
