import fs from 'node:fs';
import path from 'node:path';

const SKILLS = [
  {
    name: 'caveman',
    description: 'Ultra-terse, outcome-first communication and organic anti-slop hook drafting. Cuts filler while keeping technical accuracy 100% intact.',
    body: `# Caveman & Zero-Fluff Communication Skill (2026-11-01)

## When to Use
- Mandatory session skill across all harnesses (Claude, Gemini, OpenAI Codex, Hermes OPSis, Free Claude Code :8082).
- Default to outcome-first, linear sentences with zero filler for Founder Joshua Coleman.
- For session-end Obsidian notes, write short factual lines (DID / BROKE / NEXT / BLOCKED / FILES) with zero filler.

## Rules
1. Lead with the outcome in the first sentence.
2. No dense tables, no ASCII art, no arrow chains, no corporate filler.
3. Keep code, paths, commands, and commit hashes exact. Never hardcode a Windows user folder name in portable specs; use \`%USERPROFILE%\` or \`%LOCALAPPDATA%\`.
`
  },
  {
    name: 'i-have-adhd',
    description: 'Mandatory accessibility and cognitive-clarity skill for Founder Joshua Coleman (gradually losing vision + fast context switching). Outcome first, linear prose, pick-up-cold ready.',
    body: `# I-Have-ADHD & Low-Vision Accessibility Skill (2026-11-01)

## Who This Is For
Founder Joshua Coleman (electrician founder, gradually losing his vision, fast context switching across 3 hardware nodes and multiple business streams).

## Non-Negotiable Formatting Rules
1. **Outcome First**: State the result in the very first sentence before any background.
2. **Short Parallel Lists & Plain Complete Sentences**: Never use markdown tables for prose, never use ASCII art diagrams, and never write telegraphic fragments in user-facing replies.
3. **High-Contrast WCAG AAA UI**: Front-facing HTML/UI must use clean high-contrast dark surfaces, large readable typography, plain labels, screen-reader support, and zero visual clutter.
4. **Pick-Up-Cold Ready**: Every note in Obsidian (\`gemini-to-gemini.md\`, \`claude-to-claude.md\`, \`hermes-to-hermes.md\`, \`codex-to-codex.md\`) must state what changed, where it lives, and how it was verified so any session can resume cold in 10 seconds.
`
  },
  {
    name: 'find-skills',
    description: 'Automatic skill discovery across .agents/skills, .claude/skills, agent/skills, ops/node/skills, and the Agent Marketplace before improvising workarounds.',
    body: `# Find-Skills Discovery Protocol (2026-11-01)

## Mandatory Session Rule
Before improvising a manual workaround or claiming a capability is missing:
1. Check local synchronized skill roots:
   - \`.agents/skills/<name>/SKILL.md\`
   - \`.claude/skills/<name>/SKILL.md\`
   - \`agent/skills/<name>/SKILL.md\`
   - \`ops/node/skills/<name>/SKILL.md\`
2. Check the workflow registry in \`api.workflow.json\`, \`workflow_api.json\`, and \`memory/obsidian-vault/Agent Universal/agent-workflow-graphy.json\`.
3. Load the matching skill (including \`remake\` for 100% Yours validation and \`reverse-engineer-anything\` for clean-room REA binary/protocol analysis) and follow its verification gates.
`
  },
  {
    name: 'create-skills',
    description: 'Author and synchronize new skills across all harness formats (SKILL.md, agents/openai.yaml, agents/gemini.toml, skill.json) on Alienware (.40) and Sabretooth (.8) so zero drift occurs.',
    body: `# Create-Skills Multi-Harness Synchronizer (2026-11-01)

## Mandatory Multi-Harness Rule (Zero Drift)
Different harnesses read different paths and config formats (Claude reads \`.claude/skills/*/SKILL.md\`, OpenAI Codex reads \`.agents/skills/*/agents/openai.yaml\`, Gemini/AGY reads \`agents/gemini.toml\` and \`GEMINI.md\`, Hermes OPSis reads \`ops/node/skills/*/SKILL.md\`).
Whenever you create or update a skill:
1. Write \`SKILL.md\` with clean YAML frontmatter (\`name\`, \`description\`, \`version\`, \`platforms\`) — never put unescaped Windows backslashes inside double-quoted YAML strings.
2. Write \`agents/openai.yaml\` (\`name\`, \`description\`, \`model\`, \`instructions_file: ../SKILL.md\`).
3. Write \`agents/gemini.toml\` (\`name\`, \`description\`, \`instructions = "../SKILL.md"\`).
4. Write \`skill.json\` (\`name\`, \`description\`, \`version\`, \`entry: "SKILL.md"\`).
5. Run \`node ops/node/sync-multi-harness-skills.mjs\` to mirror the skill across \`.agents/skills/\`, \`.claude/skills/\`, \`agent/skills/\`, \`ops/node/skills/\`, and user home skill roots without dirtying unchanged files.
`
  },
  {
    name: 'brainstorming',
    description: 'Structured multi-angle design exploration before implementation. Evaluates clean-room architecture, REA evidence, Remake 100% Yours validation, zero-TOS-risk compliance, and accessibility before writing code.',
    body: `# Brainstorming, REA Clean-Room & Remake 100% Yours Architecture Skill (2026-11-01)

## Protocol
1. **Restate Goal & Lens Check**: Frame who the real human viewer is (Rule One), evaluate Person, Technical, WCAG AAA Accessibility, and Long-Term zero-vendor-lock-in lenses.
2. **Compare 2-3 Clean-Room Approaches**:
   - Use **REA (\`reverse-engineer-anything\`)** to study existing implementations, binaries, or protocols as clean-room evidence, then author a **100% in-house implementation** (zero Unreal, zero Unity, zero Godot runtime lock-in, zero Paperclip).
   - Enforce the **Remake (\`remake\`) \`100% Yours\` Validation Gate**: every slot, copy token, palette, asset, and gameplay system must be 100% swapped to world-native DREAM / platform ownership with zero source-brand residue; the gate passes on features matched, a clear visual difference from the source, and our own code, and never on likeness.
3. **Select & Plan**: Pick the simplest deterministic design that costs $0 marginal spend and passes TDD.
`
  },
  {
    name: 'superpowers',
    description: 'Full-stack autonomous execution loop: Spec -> Plan -> TDD (Red/Green/Refactor) -> Implement (REA + Remake 100% Yours) -> Verify (Rule One screenshot/HTTP probe) -> Commit -> 6-Tier Memory Sync.',
    body: `# Superpowers Autonomous Execution Skill (2026-11-01)

## The 7-Step Superpowers Loop
1. **SPEC**: Read \`AGENTS.md\`, \`CLAUDE.md\`, \`GEMINI.md\`, \`docs/standards/AGENT-STANDARD.md\`, \`api.workflow.json\`, and the node's \`gemini-to-gemini.md\` / \`claude-to-claude.md\` in the single synced Obsidian vault.
2. **PLAN**: Brainstorm 2-3 clean-room approaches using **REA (\`reverse-engineer-anything\`)** evidence and break the work into small, deterministic in-house modules.
3. **TDD (Mandatory)**: Write the failing test first (\`node --test\` / \`npm test\` / \` npm run lint\`), then implement until 100% green.
4. **IMPLEMENT & 100% YOURS VALIDATION (\`remake\`)**: Author complete production code with zero placeholders or TODO stubs, and pass the **Remake \`100% Yours\` Validation Gate** (100% world-native copy/assets, zero source-brand leaks; it passes on features matched, a clear visual difference from the source, and our own code, and never on likeness).
5. **VERIFY (Rule One)**: Prove with real HTTP/process probes and a real screenshot for any front-facing HTML/UI. Ensure all background watchdogs run 100% headless (\`wscript.exe //B\`, \`Hidden: True\`) so nothing ever steals keyboard focus.
6. **COMMIT**: Commit to the PR branch so work is never stranded uncommitted in the preview pane. Never push to \`main\` and never merge; merges go through Josh or the signed-in Claude judge lane.
7. **MEMORY SYNC**: Append session findings to the single $5/mo synced Obsidian Vault (\`<NODE>/<agent>-to-<agent>.md\`), Shared \`ai-memory\` on T5500 (\`:49374\`), Dual Graphies (\`/api/graphy/codebase\` + \`api.workflow.json\`), OpenViking, Supabase, and Supermemory.
`
  },
  {
    name: 'tdd',
    description: 'Mandatory Test-Driven Development (RED -> GREEN -> REFACTOR). Every feature or bugfix requires automated tests written and verified before completion.',
    body: `# Mandatory TDD (Test-Driven Development) Skill (2026-11-01)

## Non-Negotiable Gate
1. **RED**: Write or extend an automated test (\`node --test\`, \`npm test\`, \`npm run lint\`, or \`pytest\`) that reproduces the bug or specifies the new capability (including REA clean-room and Remake \`100% Yours\` ownership checks).
2. **GREEN**: Write the minimal clean-room implementation to pass the test suite (100% pass required).
3. **REFACTOR**: Clean up duplication while keeping all tests green, then commit immediately to \`main\`.
`
  },
  {
    name: 'test-driven-development',
    description: 'Alias for mandatory TDD skill (RED -> GREEN -> REFACTOR) ensuring compatibility with harnesses expecting test-driven-development.',
    body: `# Test-Driven Development (TDD Mandatory) Skill (2026-11-01)

Follow the \`tdd\` skill: RED (write test) -> GREEN (implement & pass 100% of suite) -> REFACTOR -> COMMIT to \`main\`. Never push or present untested code.
`
  },
  {
    name: 'verification-before-completion',
    description: 'Rule One + Remake 100% Yours enforcement: done means the real human user would accept it and 100% Yours clean-room ownership passes. Requires live HTTP/process verification, full test pass, and real screenshots for any UI.',
    body: `# Verification Before Completion — Rule One & Remake 100% Yours Gate (2026-11-01)

## Before Calling Anything Done, Working, Fixed, or Verified:
1. **State the Human Viewer**: Say who the person is (e.g., Founder Joshua Coleman reading on his screen with tired eyes; a player in DREAM Online; a customer on \`onlinerecycle.net\` or \`youandinotai.com\`).
2. **Run Real Test Suites & Live Probes**: Run \`npm run lint\` and \`npm test\` AND probe the live HTTP endpoint.
3. **Pass the Remake \`100% Yours\` & REA Clean-Room Gate**: Verify 100% of slots, copy, fonts, colours, and 3D assets are clean-room owned with zero competitor or source-site residue.
4. **Capture & Critique Real Screenshots**: For any front-facing HTML/UI, capture the real screenshot, list any flaws from the human viewer's perspective, fix them, and commit to \`main\`.
`
  },
  {
    name: 'obsidian-save',
    description: 'Mandatory session-start read and session-end write to the single $5/mo synced Obsidian Vault (<NODE>/<agent>-to-<agent>.md) with automatic backup to Shared ai-memory (:49374), Graphy, OpenViking, Supabase, and Supermemory.',
    body: `# Obsidian Authoritative Session Memory & 6-Layer Backup Skill (2026-11-01)

## Mandatory Session Protocol (Every Agent, Every Node, Every Session)
1. **Session Start**:
   - Read \`<NODE>/<agent>-to-<agent>.md\` (\`Alienware\`, \`T5500\`, \`Sabretooth\`) in the single $5/mo synced Obsidian vault (\`C:/DREAM/Antigravity\` on Alienware, \`C:/ANTIGRAVITY/Antigravity\` on T5500, \`C:/Ai-Dream-Team/Antigravity\` on Sabretooth, mirrored to \`memory/obsidian-vault/\` in git).
   - Query Shared \`ai-memory\` MCP on T5500 (\`:49374\`, \`scope: "global"\`) and Codebase Graphy (\`/api/graphy/codebase\`).
2. **Session End**:
   - Append a timestamped caveman-style entry (\`DID / BROKE / NEXT / BLOCKED / FILES\`) to \`<NODE>/<agent>-to-<agent>.md\` inside the single synced vault (never create a second paid vault and never store \`.zip\` archives in the vault).
   - Mirror to Shared \`ai-memory\` (\`:49374\`), Dual Graphies (\`/api/graphy/codebase\` + \`api.workflow.json\`), OpenViking (\`viking://dream/...\`), Supabase pgvector, and Supermemory.
   - Never write raw secrets, API keys, or tokens (always redact as \`XXXX\`).
`
  },
  {
    name: 'openviking',
    description: 'Hierarchical L0/L1/L2 context indexing and backup (viking://dream/...) paired with Obsidian and Shared ai-memory (:49374).',
    body: `# OpenViking L0/L1/L2 Context & Backup Skill (2026-11-01)

## Protocol
- Store every architectural and session checkpoint with \`vikingUri\` (\`viking://dream/<scope>/<slug>\`), \`l0Abstract\` (1-sentence summary), \`l1Overview\` (metadata & verification), and \`l2Markdown\` (full Obsidian Markdown with \`[[Wikilinks]]\`).
- Backed by \`POST http://127.0.0.1:9180/api/memory/store\` and Shared \`ai-memory\` (\`:49374\`).
`
  },
  {
    name: 'supabase',
    description: 'Supabase pgvector & SQL checkpoint backup layer for Obsidian session memory and multi-stream CRM telemetry.',
    body: `# Supabase pgvector & SQL Backup Skill (2026-11-01)

## Protocol
- Mirrors Obsidian Vault session entries and \`agent-workflow-graphy.json\` checkpoints into the \`supabase-pgvector\` tier via \`http://127.0.0.1:9180/api/memory/store\`.
- If Supabase experiences rate-limiting, automatic zero-loss failover promotes Obsidian + Viking (\`/api/memory/failover-test\`).
`
  },
  {
    name: 'agent-workflow',
    description: 'Master multi-agent orchestration workflow across Claude (Opus 5.5 / Fable), Gemini 4 High Reasoning (Trust Level Max Judges), OpenAI (Codex), Free Claude Code (:8082), and Hermes (OPSis) with Remake 100% Yours validation and REA clean-room engineering.',
    body: `# Agent Workflow & Trust Level Max Orchestration (2026-11-01)

## Authority & Workflow (\`api.workflow.json\` & \`docs/standards/AGENT-STANDARD.md\`)
1. **Sole Human Authority**: Founder Joshua Coleman (\`CLAUDE's N Joshua's · #TeamClaudeForLife\`).
2. **GM #1 Lead GMs (Claude Opus 5.5 / Fable as the judge lane & Google Gemini 4 High Reasoning)**:
   - Hold permission from Joshua Coleman to judge what is used/not used, author full-stack 3D engine and platform code, review the work of all other AI lanes (OpenAI Codex, Hermes OPSis, Free Claude Code :8082, OpenCode, Emergent), and stage outreach drafts (\`cost_usd === 0\` enforced until Joshua says finalize). Merges go through Josh or the signed-in Claude judge lane; when AI lanes disagree the Claude judge lane decides and states its reason in one line; Josh can overrule any call.
   - Always run at **ultrathink / highest reasoning effort** across every model.
3. **Mandatory Skills & Clean-Room Gates**:
   - Load mandatory skills: \`caveman\`, \`i-have-adhd\`, \`find-skills\`, \`create-skills\`, \`brainstorming\`, \`superpowers\`, \`tdd\`, \`verification-before-completion\`, \`obsidian-save\`, \`openviking\`, \`supabase\`, **\`remake\` (Mandatory \`100% Yours\` Clean-Room & Swap-Board Ownership Validation Gate)**, and **\`reverse-engineer-anything\` (\`rea\` Clean-Room Binary/Protocol Evidence)**.
   - **REA + Remake \`100% Yours\` Rule**: Study reference implementations or binaries with \`reverse-engineer-anything\` (\`rea\`), build 100% in-house clean-room code in the DREAM Engine (\`src/engine/\`), and pass the \`remake\` **\`100% Yours\` validation gate** (zero source-brand residue and 100% world-native DREAM tokens; it passes on features matched, a clear visual difference from the source, and our own code, and never on likeness).
   - **Headless Watchdogs & Zero Scraping Rule**: Every scheduled task, hook, and watchdog on Alienware, T5500, and Sabretooth must run 100% headless (\`wscript.exe //B\`, \`Hidden: True\`, \`ShowWindow = 0\`) so nothing ever opens a console window or steals keyboard focus. Never scrape YouTube or any Google site by any tool (official YouTube Data/Analytics API only on Joshua's channel, uploads always \`private\`).
   - Execute \`SPEC -> PLAN (REA + Brainstorming) -> TDD -> IMPLEMENT -> VERIFY (Rule One + Remake 100% Yours) -> COMMIT -> 6-LAYER MEMORY SYNC\`.
`
  }
];

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

const ROOTS = [
  path.join(REPO_ROOT, '.agents/skills'),
  path.join(REPO_ROOT, '.claude/skills'),
  path.join(REPO_ROOT, 'agent/skills'),
  path.join(REPO_ROOT, 'ops/node/skills'),
  'C:/DREAM/dream-online/.agents/skills',
  'C:/DREAM/dream-online/.claude/skills',
  'C:/DREAM/dream-online/agent/skills',
  'C:/DREAM/dream-online/ops/node/skills',
  path.join(process.env.USERPROFILE || 'C:/Users/joshl', '.gemini/skills'),
  path.join(process.env.USERPROFILE || 'C:/Users/joshl', '.agents/skills'),
  path.join(process.env.USERPROFILE || 'C:/Users/joshl', '.claude/skills')
];

function writeFileIfChanged(filePath, newContent) {
  const normalizedNew = newContent.replace(/\r\n/g, '\n');
  if (fs.existsSync(filePath)) {
    const existingRaw = fs.readFileSync(filePath, 'utf8');
    const normalizedExisting = existingRaw.replace(/\r\n/g, '\n');
    if (normalizedExisting === normalizedNew) {
      return false;
    }
    const usesCrlf = existingRaw.includes('\r\n');
    const outContent = usesCrlf ? normalizedNew.replace(/\n/g, '\r\n') : normalizedNew;
    fs.writeFileSync(filePath, outContent, 'utf8');
    return true;
  }
  const outContent = process.platform === 'win32' ? normalizedNew.replace(/\n/g, '\r\n') : normalizedNew;
  fs.writeFileSync(filePath, outContent, 'utf8');
  return true;
}

function copyDirIfChanged(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirIfChanged(s, d);
    } else {
      const content = fs.readFileSync(s, 'utf8');
      writeFileIfChanged(d, content);
    }
  }
}

let updatedCount = 0;

for (const root of ROOTS) {
  fs.mkdirSync(root, { recursive: true });
  for (const skill of SKILLS) {
    if (skill.description.includes('\\')) {
      throw new Error(`Backslash found in description for ${skill.name}`);
    }
    const skillDir = path.join(root, skill.name);
    const agentsDir = path.join(skillDir, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    const skillMd = `---
name: ${skill.name}
description: "${skill.description}"
version: 2.1.0
platforms: [windows, linux, macos]
---

${skill.body}`;

    const openaiYaml = `name: ${skill.name}
description: "${skill.description}"
version: 2.1.0
model: gpt-5.5
instructions_file: ../SKILL.md
`;

    const geminiToml = `name = "${skill.name}"
description = "${skill.description}"
version = "2.1.0"
model = "gemini-4-high-reasoning"
instructions = "../SKILL.md"
`;

    const skillJson = JSON.stringify(
      {
        name: skill.name,
        description: skill.description,
        version: '2.1.0',
        entry: 'SKILL.md',
        harnesses: ['claude', 'gemini', 'codex', 'hermes', 'opencode', 'agy']
      },
      null,
      2
    ) + '\n';

    if (writeFileIfChanged(path.join(skillDir, 'SKILL.md'), skillMd)) updatedCount++;
    if (writeFileIfChanged(path.join(agentsDir, 'openai.yaml'), openaiYaml)) updatedCount++;
    if (writeFileIfChanged(path.join(agentsDir, 'gemini.toml'), geminiToml)) updatedCount++;
    if (writeFileIfChanged(path.join(skillDir, 'skill.json'), skillJson)) updatedCount++;
  }

  // Also ensure remake and reverse-engineer-anything are mirrored from .agents/skills across all roots
  for (const extraSkill of ['remake', 'reverse-engineer-anything']) {
    const canonicalSkillDir = path.join(REPO_ROOT, '.agents/skills', extraSkill);
    const targetSkillDir = path.join(root, extraSkill);
    if (path.resolve(canonicalSkillDir) !== path.resolve(targetSkillDir) && fs.existsSync(canonicalSkillDir)) {
      copyDirIfChanged(canonicalSkillDir, targetSkillDir);
    }
  }
}

console.log(`Synchronized ${SKILLS.length} core skills + remake & reverse-engineer-anything across ${ROOTS.length} roots (${updatedCount} files updated).`);
