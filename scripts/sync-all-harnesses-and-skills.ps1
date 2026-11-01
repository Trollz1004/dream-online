# Unified Cross-Harness & Cross-Node Skill, Workflow, and Memory Synchronizer (2026-10-28)
# Eliminates drift across Claude Code, Free Claude Code (:8082), Gemini (Antigravity / CLI / Spark), OpenAI (Codex), OpenCode, and Hermes (OPSis)
# across Alienware (.40), T5500 (.15), and Sabretooth (.8).

$ErrorActionPreference = "Stop"
$repoRoot = "C:\Users\joshl\antigravity\DREAM-Engine"
$vaultRoot = "C:\DREAM\Antigravity"

$skills = @(
    @{
        name = "caveman"
        desc = "Ultra-terse, outcome-first communication and organic anti-slop hook drafting. Cuts filler while keeping technical accuracy 100% intact."
        body = @"
# Caveman & Zero-Fluff Communication Skill (`2026-10-28`)

## When to Use
- Mandatory session skill across all harnesses (`Claude`, `Gemini`, `Codex`, `Hermes OPSis`, `Free Claude Code :8082`).
- Default to outcome-first, linear sentences with zero filler for Founder Joshua Coleman.
- When staging organic social hooks (Reddit / 18+ Discord via `joshlcoleman/Fable`), use terse, lowercase human cadence with explicit FTC founder/50%-affiliate disclosure (`"I built this human-verified dating app, creators get 50% lifetime"`).

## Rules
1. Lead with the outcome in the first sentence.
2. No dense tables, no ASCII art, no arrow chains, no corporate filler.
3. Keep code, paths, commands, and commit hashes exact.
"@
    },
    @{
        name = "i-have-adhd"
        desc = "Mandatory accessibility and cognitive-clarity skill for Founder Joshua Coleman (gradually losing vision + fast context switching). Outcome first, linear prose, pick-up-cold ready."
        body = @"
# I-Have-ADHD & Vision Accessibility Skill (`2026-10-28`)

## Mandatory Rules for Every Agent & Harness
1. **Outcome First**: State what is done or what the answer is in the very first line.
2. **Vision Accessibility**:
   - Joshua Coleman is gradually losing vision. Write plain complete sentences and short parallel lists only.
   - Never use dense tables, ASCII art, or walls of text.
   - Every UI/HTML surface must use high-contrast dark mode (`#121316` background, `#F5F7FA` text, `#00E5A3` emerald action buttons, `>= 18px` body font, `24px-32px` headings/buttons).
3. **Pick-Up-Cold Ready**:
   - Joshua works in short irregular blocks at any hour. Never comment on the clock hour or tell him to rest.
   - Ask at most ONE short question only when truly blocked.
   - Hand him copy-pasteable commands/prompts he can pick up cold and run alone.
"@
    },
    @{
        name = "find-skills"
        desc = "Automatic skill discovery across .agents/skills, .claude/skills, agent/skills, ops/node/skills, and the Agent Marketplace before improvising workarounds."
        body = @"
# Find-Skills Discovery Protocol (`2026-10-28`)

## Mandatory Session Rule
Before improvising a manual workaround or claiming a capability is missing:
1. Check local synchronized skill roots:
   - `.agents/skills/<name>/SKILL.md`
   - `.claude/skills/<name>/SKILL.md`
   - `agent/skills/<name>/SKILL.md`
   - `ops/node/skills/<name>/SKILL.md`
2. Check the workflow registry in `api.workflow.json` and `docs/memory-layer/agent-workflow-graphy.json`.
3. Load the matching skill and follow its verification gates.
"@
    },
    @{
        name = "create-skills"
        desc = "Author and synchronize new skills across all harness formats (SKILL.md, agents/openai.yaml, agents/gemini.toml, skill.json) on Alienware (.40) and Sabretooth (.8) so zero drift occurs."
        body = @"
# Create-Skills Multi-Harness Synchronizer (`2026-10-28`)

## Mandatory Multi-Harness Rule (Zero Drift)
Different harnesses read different paths and config formats (`Claude` reads `.claude/skills/*/SKILL.md`, `Codex/OpenAI` reads `.agents/skills/*/agents/openai.yaml`, `Gemini/AGY` reads `agents/gemini.toml` and `GEMINI.md`, `Hermes` reads `ops/node/skills/*/SKILL.md`).
Whenever you create or update a skill:
1. Write `SKILL.md` with YAML frontmatter (`name`, `description`, `version`, `platforms`).
2. Write `agents/openai.yaml` (`name`, `description`, `model`, `instructions_file: ../SKILL.md`).
3. Write `agents/gemini.toml` (`name`, `description`, `instructions = "../SKILL.md"`).
4. Write `skill.json` (`name`, `description`, `version`, `entry: "SKILL.md"`).
5. Mirror the skill across `.agents/skills/`, `.claude/skills/`, `agent/skills/`, `ops/node/skills/`, and sync to Sabretooth (`192.168.0.8`).
"@
    },
    @{
        name = "brainstorming"
        desc = "Structured multi-angle design exploration before implementation. Evaluates clean-room architecture, zero-TOS-risk compliance, and accessibility before writing code."
        body = @"
# Brainstorming & Clean-Room Architecture Skill (`2026-10-28`)

## Protocol
1. Frame the problem in one sentence: who is the real human user (`Rule One`), and what is the fastest zero-TOS-risk in-house solution?
2. Compare at least 2 clean-room approaches (using `rea` clean-room evidence where applicable; zero Unreal, zero Godot, zero Paperclip).
3. Select the simplest deterministic design that costs `$0` marginal spend and passes TDD.
"@
    },
    @{
        name = "superpowers"
        desc = "Full-stack autonomous execution loop: Spec -> Plan -> TDD (Red/Green/Refactor) -> Implement -> Verify (Rule One screenshot/HTTP probe) -> Commit -> 4-Tier Memory Sync."
        body = @"
# Superpowers Autonomous Execution Skill (`2026-10-28`)

## The 7-Step Superpowers Loop
1. **SPEC**: Read `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `api.workflow.json`, and the node's `gemini-to-gemini.md` / `claude-to-claude.md` in `C:\DREAM\Antigravity`.
2. **PLAN**: Break the work into small, deterministic modules with zero external bloat.
3. **TDD (Mandatory)**: Write the failing test first (`node --test` / `npm test` / `pytest`), then implement until 100% green.
4. **IMPLEMENT**: Author complete production code with zero placeholders or `TODO` stubs.
5. **VERIFY (`Rule One`)**: Prove with real HTTP/process probes and a real screenshot for any front-facing HTML/UI.
6. **COMMIT**: Commit immediately to `main` so work is never stranded uncommitted.
7. **MEMORY SYNC**: Append session findings to Obsidian (`C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md`), Shared `ai-memory` (`http://192.168.0.15:49374`), and Graphy/Viking/Supabase/Supermemory backups.
"@
    },
    @{
        name = "tdd"
        desc = "Mandatory Test-Driven Development (RED -> GREEN -> REFACTOR). Every feature or bugfix requires automated tests written and verified before completion."
        body = @"
# Mandatory TDD (Test-Driven Development) Skill (`2026-10-28`)

## Non-Negotiable Gate
1. **RED**: Write or extend an automated test (`node --test`, `npm test`, `npm run lint`, or `pytest`) that reproduces the bug or specifies the new capability.
2. **GREEN**: Write the minimal clean-room implementation to pass the test suite (`100%` pass required).
3. **REFACTOR**: Clean up duplication while keeping all tests green, then commit immediately to `main`.
"@
    },
    @{
        name = "test-driven-development"
        desc = "Alias for mandatory TDD skill (RED -> GREEN -> REFACTOR) ensuring compatibility with harnesses expecting test-driven-development."
        body = @"
# Test-Driven Development (TDD Mandatory) Skill (`2026-10-28`)

Follow the `tdd` skill: RED (write test) -> GREEN (implement & pass 100% of suite) -> REFACTOR -> COMMIT to `main`. Never push or present untested code.
"@
    },
    @{
        name = "verification-before-completion"
        desc = "Rule One enforcement: done means the real human user would accept it. Requires live HTTP/process verification, full test pass, and real screenshots for any UI."
        body = @"
# Verification Before Completion — Rule One (`2026-10-28`)

## Before Calling Anything Done, Working, Fixed, or Verified:
1. State who the human viewer is (e.g., Founder Joshua Coleman reading on his screen with tired eyes; a player in DREAM Online; a customer on `onlinerecycle.net` or `youandinotai.com`).
2. Run the real test suites (`npm test`, `npm run lint`, `node --test`) AND probe the live HTTP endpoint (using real TCP/HTTP checks, never trusting a single process list).
3. For any front-facing HTML/UI, capture and inspect the real screenshot, fix anything cut off or low-contrast, and commit to `main`.
"@
    },
    @{
        name = "obsidian-save"
        desc = "Mandatory session-start read and session-end write to the Obsidian Vault (C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md) with automatic backup to Shared ai-memory (:49374), Graphy, OpenViking, Supabase, and Supermemory."
        body = @"
# Obsidian Authoritative Session Memory & 4-Tier Backup Skill (`2026-10-28`)

## Mandatory Session Protocol (Every Agent, Every Node, Every Session)
1. **Session Start**:
   - Read `C:\DREAM\Antigravity\T5500\gemini-to-gemini.md` and `C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md` (`Alienware`, `T5500`, `Sabretooth`).
   - Query Shared `ai-memory` MCP (`http://192.168.0.15:49374`) with `scope: "global"`.
2. **Session End (`scripts/obsidian/session-note.ps1`)**:
   - Append a timestamped entry (`## YYYY-MM-DD HH:MM TZ | node: <NODE> | use case: <summary>`) to `C:\DREAM\Antigravity\<NODE>\<agent>-to-<agent>.md` and `memory/obsidian-vault/`.
   - Mirror the entry to:
     - **Shared `ai-memory` MCP**: `http://192.168.0.15:49374` (`memory_write_page`)
     - **Graphy & Local 4-Tier Bridge**: `POST http://127.0.0.1:20128/api/memory/store` (syncs Obsidian + Viking `viking://dream/...` + Supabase `pgvector` + Supermemory recall backup)
   - Never write raw secrets, API keys, or tokens (always redact as `XXXX`).
"@
    },
    @{
        name = "openviking"
        desc = "Hierarchical L0/L1/L2 context indexing and backup (viking://dream/...) paired with Obsidian and Shared ai-memory (:49374)."
        body = @"
# OpenViking L0/L1/L2 Context & Backup Skill (`2026-10-28`)

## Protocol
- Store every architectural and session checkpoint with `vikingUri` (`viking://dream/<scope>/<slug>`), `l0Abstract` (1-sentence summary), `l1Overview` (metadata & verification), and `l2Markdown` (full Obsidian Markdown with `[[Wikilinks]]`).
- Backed by `POST http://127.0.0.1:20128/api/memory/store` and Shared `ai-memory` (`http://192.168.0.15:49374`).
"@
    },
    @{
        name = "supabase"
        desc = "Supabase pgvector & SQL checkpoint backup layer for Obsidian session memory and multi-stream CRM telemetry."
        body = @"
# Supabase pgvector & SQL Backup Skill (`2026-10-28`)

## Protocol
- Mirrors Obsidian Vault session entries and `agent-workflow-graphy.json` checkpoints into the `supabase-pgvector` tier via `http://127.0.0.1:20128/api/memory/store`.
- If Supabase experiences rate-limiting, automatic zero-loss failover promotes Obsidian + Viking (`/api/memory/failover-test`).
"@
    },
    @{
        name = "agent-workflow"
        desc = "Master multi-agent orchestration workflow across Claude (Opus 5.5 / Fable), Gemini 4 High Reasoning (Trust Level Max Judges), Codex, Free Claude Code (:8082), and Hermes (OPSis)."
        body = @"
# Agent Workflow & Trust Level Max Orchestration (`2026-10-28`)

## Authority & Workflow (`api.workflow.json`)
1. **Sole Human Authority**: Founder Joshua Coleman.
2. **`Trust Level Max` Supreme Judges (`Opus 5.5 / Fable` & `Gemini 4 High Reasoning`)**:
   - Hold 100% permission from Joshua Coleman to judge what is used/not used, approve the work of all other AI platforms (`Emergent`, `Musa`, `Hermes OPSis`, `Free Claude Code :8082`, `OpenCode`, `Codex`), and send partner/outreach emails directly (`cost_usd === 0` enforced until Joshua says finalize).
3. **Execution Loop**:
   - Load mandatory skills (`caveman`, `i-have-adhd`, `find-skills`, `create-skills`, `brainstorming`, `superpowers`, `tdd`, `verification-before-completion`, `obsidian-save`).
   - Execute `SPEC -> PLAN -> TDD -> IMPLEMENT -> VERIFY -> COMMIT -> MEMORY SYNC`.
"@
    }
)

$skillRoots = @(
    "$repoRoot\.agents\skills",
    "$repoRoot\.claude\skills",
    "$repoRoot\agent\skills",
    "$repoRoot\ops\node\skills",
    "C:\Users\joshl\.claude\skills",
    "C:\Users\joshl\.gemini\skills"
)

foreach ($s in $skills) {
    $name = $s.name
    $desc = $s.desc
    $mdContent = @"
---
name: $name
description: "$desc"
version: 2.0.0
platforms: [windows, linux, macos]
---

$($s.body)
"@
    $openaiYaml = @"
name: $name
description: "$desc"
version: "2.0.0"
model: "auto/best-reasoning"
instructions_file: "../SKILL.md"
"@
    $geminiToml = @"
name = "$name"
description = "$desc"
version = "2.0.0"
instructions = "../SKILL.md"
"@
    $skillJson = (@{
        name = $name
        description = $desc
        version = "2.0.0"
        entry = "SKILL.md"
        harnesses = @("claude", "gemini", "codex", "opencode", "hermes", "fcc")
    } | ConvertTo-Json -Depth 4)

    foreach ($root in $skillRoots) {
        $dir = Join-Path $root $name
        $agentsDir = Join-Path $dir "agents"
        New-Item -ItemType Directory -Path $agentsDir -Force | Out-Null
        Set-Content -Path (Join-Path $dir "SKILL.md") -Value $mdContent -Encoding UTF8
        Set-Content -Path (Join-Path $agentsDir "openai.yaml") -Value $openaiYaml -Encoding UTF8
        Set-Content -Path (Join-Path $agentsDir "gemini.toml") -Value $geminiToml -Encoding UTF8
        Set-Content -Path (Join-Path $dir "skill.json") -Value $skillJson -Encoding UTF8
    }
}

Write-Output "Synced $($skills.Count) mandatory skills across all $($skillRoots.Count) local harness roots."
