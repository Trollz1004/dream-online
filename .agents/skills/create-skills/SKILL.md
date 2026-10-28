---
name: create-skills
description: "Author and synchronize new skills across all harness formats (SKILL.md, agents/openai.yaml, agents/gemini.toml, skill.json) on Alienware (.40) and Sabretooth (.8) so zero drift occurs."
version: 2.0.0
platforms: [windows, linux, macos]
---

# Create-Skills Multi-Harness Synchronizer (2026-10-28)

## Mandatory Multi-Harness Rule (Zero Drift)
Different harnesses read different paths and config formats (Claude reads .claude/skills/*/SKILL.md, Codex/OpenAI reads .agents/skills/*/agents/openai.yaml, Gemini/AGY reads gents/gemini.toml and GEMINI.md, Hermes reads ops/node/skills/*/SKILL.md).
Whenever you create or update a skill:
1. Write SKILL.md with YAML frontmatter (
ame, description, ersion, platforms).
2. Write gents/openai.yaml (
ame, description, model, instructions_file: ../SKILL.md).
3. Write gents/gemini.toml (
ame, description, instructions = "../SKILL.md").
4. Write skill.json (
ame, description, ersion, entry: "SKILL.md").
5. Mirror the skill across .agents/skills/, .claude/skills/, gent/skills/, ops/node/skills/, and sync to Sabretooth (192.168.0.8).
