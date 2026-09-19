# Source Manifest

Per directive section 47: every source gets one classification — CANON, ACTIVE_DESIGN, REFERENCE, RESEARCH, DEPRECATED, or QUARANTINED. Top-level files and folders only; this is a lightweight index, not an audit of every nested file.

| Path | Classification | Note |
|---|---|---|
| docs/DREAM-MASTER-DIRECTIVE.md | CANON | Founder master directive, landed 2026-09-18 |
| docs/DREAM-DISPATCH.md | ACTIVE_DESIGN | Live operational dispatch (this task's copy) |
| docs/ (rest) | ACTIVE_DESIGN | Authoritative design folder per section 46 (DESIGN-INDEX.md, audio/, blog/, brand/, doctrine/, gdd/, handoffs/, planning/, research/, roadmap/, tech/, testing/, ux/) |
| AGENTS.md | ACTIVE_DESIGN | Live cross-platform agent rulebook |
| CLAUDE.md | ACTIVE_DESIGN | Pointer to AGENTS.md for Claude Code |
| GEMINI.md | ACTIVE_DESIGN | Pointer to AGENTS.md for Gemini CLI |
| DREAM-DISPATCH.md (repo root) | ACTIVE_DESIGN | Pre-existing live dispatch, predates this task's docs/ copy |
| STATE.md | ACTIVE_DESIGN | Operational state tracking |
| TASKS.md | ACTIVE_DESIGN | Operational task tracking |
| adapters/ | ACTIVE_DESIGN | Live per-platform integration scaffolding (claude, codex, gemini, grok, hermes, ollama-local, pi, 1minai) |
| game/ | ACTIVE_DESIGN | Live game server implementation |
| ops/ | ACTIVE_DESIGN | Operational plans, task banks, install/toolchain notes |
| memory/ | DEPRECATED | glossary.md documents a dead `E:\` path reference |
| assets/ | REFERENCE | Brand/image assets, non-authoritative |
| README.md | REFERENCE | Standard repo readme |
| CODE_OF_CONDUCT.md | REFERENCE | Standard community file |
| CONTRIBUTING.md | REFERENCE | Standard community file |
| SECURITY.md | REFERENCE | Standard community file |
| LICENSE.md | REFERENCE | License text |
| .gitattributes | REFERENCE | Repo config |
| .gitignore | REFERENCE | Repo config |
| .env.example | REFERENCE | Placeholder-only env template |
| .github/ | REFERENCE | CI workflows, issue templates, funding config |
| docs/CONSOLIDATION-2026-09-19.md | REFERENCE | Record of folding two old copies into this root |
| docs/ALIENWARE-NODE-STATE-2026-09-19.md | REFERENCE | Signed node state record; verify its SHA-256 anchor before relying on it |
| ops/node/ | ACTIVE_DESIGN | Alienware node operations; edited by the Claude judge lane only |
| specs/, .specify/ | ACTIVE_DESIGN | Spec Kit specs and constitution |
| paperclip-tro/ (ignored, local) | CANON for `projects/PROJECT-2-DREAM-ONLINE.md`, DEPRECATED for the rest | Full canon document; the other files describe the parked Paperclip setup |
| opencode/ (ignored, local) | REFERENCE | OpenCode provider and model config |
| references/_unreviewed/ (ignored, local) | REFERENCE, DEPRECATED for `early-gdd-2026-07-08/` | Folded in on 2026-09-19; not yet checked as public-safe |

No QUARANTINED items found; no secrets encountered during this pass.
