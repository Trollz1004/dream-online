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
| ops/judge-memory/ | ACTIVE_DESIGN | In-house recall for the signed-in Claude Code judge lane (v1, Volume 2 Recipe 5). Uses Node.js built-in `node:sqlite` (`DatabaseSync` with SQLite FTS5; Node.js MIT License / SQLite Public Domain) supported natively by the repo's Node v26 runtime, with zero external database dependencies. |
| specs/, .specify/ | ACTIVE_DESIGN | Spec Kit specs and constitution |
| docs/house/ | ACTIVE_DESIGN | DREAM Space design system, site inventory, and `dream-online.net` brief |
| sites/dream-online-net/ | ACTIVE_DESIGN | Clean-room `dream-online.net` React + Vite front-facing site (`react` MIT, `react-dom` MIT, `vite` MIT, `@vitejs/plugin-react` MIT, `typescript` Apache-2.0; all motions and 3D dot-sphere implemented in-house under MIT) |
| sites/dream-online-net/public/fonts/ | REFERENCE | Self-hosted web fonts under SIL Open Font License 1.1: Space Grotesk (https://github.com/floriankarsten/space-grotesk), IBM Plex Sans (https://github.com/IBM/plex), and IBM Plex Mono (https://github.com/IBM/plex) |
| src/ui/CharacterCreatorModal.tsx, src/ui/characterCreatorConfig.ts | ACTIVE_DESIGN | Character Creator v1 (Recipe 9, body only). Uses 100% in-house procedural humanoid body geometry (`src/engine/scene/mesh.ts` & `src/engine/engine.ts`) owned by DREAM Studio rather than bundling an external sample `.vrm`; supports importing user `.vrm` files whose licence metadata allows commercial use and redistribution (`commercialUsage: allow`, `redistribution: allow`), and never embeds VRoid Studio. |
| paperclip-tro/ (ignored, local) | CANON for `projects/PROJECT-2-DREAM-ONLINE.md`, DEPRECATED for the rest | Full canon document; the other files describe the parked Paperclip setup |
| opencode/ (ignored, local) | REFERENCE | OpenCode provider and model config |
| references/_unreviewed/ (ignored, local) | REFERENCE, DEPRECATED for `early-gdd-2026-07-08/` | Folded in on 2026-09-19; not yet checked as public-safe |

| .agents/skills/security-audit/ | REFERENCE | security-audit skill, https://github.com/cloudflare/security-audit-skill, commit c1c8a8c1471069fb0e188eeaff69b8e8db6564a8, MIT |
| .agents/skills/hallmark/ | REFERENCE | Hallmark skill by Together AI, https://github.com/nutlope/hallmark, commit 52328cb3129135499e4e178d4864ee90029dea2b, MIT; house note: its photo library points at outside images and is never used here, images come only from sources we own |
| .agents/skills/impeccable/ | REFERENCE | Impeccable skill, https://github.com/pbakaus/impeccable, commit 414603bf14c7a344edb466bb1f85690c77ce8b7d, Apache 2.0; house note: turn its telemetry off in its config and note that it fetches design directions from impeccable.style when a design starts, which is allowed as research on a public catalog but no asset from it ships |

No QUARANTINED items found; no secrets encountered during this pass.
