# Agent Universal

Everything every agent loads, in one place. Updated 2026-10-15 by Claude. The repo is the source of truth; this folder mirrors it so it is in the vault.

## Read first
- `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` at the repo root (rulings of 2026-10-15: 100% rule, Hermes + OpenClaw watch, Jules judges, Gemini only in mission-os).
- Always-load skill: `.agents/skills/ultracode-house/SKILL.md` (the house map).
- On the T5500: `.agents/skills/t5500-node/SKILL.md`, proven by `ops/t5500/verify-node.ps1`.
- **Payments are settled (2026-10-17):** [[Decisions/2026-10-17 Payments Settled]]. Record: `docs/PAYMENTS-TRUTH.md`. All 15 past Square charges are Joshua's own tests; never re-test, never a blocker.

## Workflow graph (universal JSON)
- [[agent-workflow-graphy.json]] (copy of `docs/memory-layer/agent-workflow-graphy.json`)
- [[agent-workflow-graphy.freebuff.json]] (copy of `.freebuff/agent-workflow-graphy.json`; the two drifted, both dated 2026-09-03)

## Memory layers
- Authoritative: this vault and the repo (markdown in git).
- Recall: Supermemory (container `repo_antigravity__02249b9e7104105f`). When it disagrees with git, git wins.
- OpenViking (`viking://`, server :1933): kept by Joshua's word; not installed on the T5500 yet.
- Per-agent journals: `.agents/journals/<agent>/STATE.md`.

## MCP servers configured for Claude Code on the node
| Server | Config | Endpoint |
|---|---|---|
| `brain-mcp` | .mcp.json | node C:\ANTIGRAVITY\brain-mcp\dist\index.js |
| `mission-mcp` | .mcp.json | node C:\ANTIGRAVITY\services\mission-mcp\dist\server.js |
| `playwright` | .mcp.json | cmd /c npx -y @playwright/mcp@latest |
| `supabase` | .mcp.json | https://mcp.supabase.com/mcp |
| `dateapp-desk` | .mcp.json | node C:/ANTIGRAVITY/services/dateapp-desk-mcp/server.mjs |

Plus the claude.ai connectors (Supabase, Vercel, Cloudflare, Supermemory and others), which sign in with OAuth.

## Skills in `.agents/skills` (71)
| Skill | What it is for |
|---|---|
| `21st-dev-components` | Sourcing and adapting React/Tailwind/shadcn components from 21st.dev registry. Use when building UI to avoid hand-rolling components that... |
| `affiliate-offer-of-offers` | The Super Saiyan Marketing Strategy. 50% lifetime revenue share protocol for Tier-1 influencers via custom vanity URLs. |
| `agent-browser` | Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, click... |
| `agent-reach` | > |
| `appinsights-instrumentation` | 'Guidance for instrumenting webapps with Azure Application Insights. Provides telemetry patterns, SDK setup, and configuration references... |
| `brainstorming` | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explore... |
| `browser-use` | Direct browser control via CDP for web interaction: automation, scraping, testing, screenshots, and site/app work. |
| `caveman` | > |
| `ceo-standing-session` | > |
| `create-skills` | Mandatory fallback skill for creating or improving a reusable ANTIGRAVITY skill when find-skills confirms that no suitable skill exists. ... |
| `dateapp-growth-agent` | Use when dispatching the dateapp-growth-agent lane of the YouAndINotAI dateapp swarm. Growth lane: 10-day launch, Elite affiliate, preord... |
| `dateapp-gui-agent` | Use when dispatching the dateapp-gui-agent lane of the YouAndINotAI dateapp swarm. GUI lane: Kiss Me shell, create studio, animated avata... |
| `dateapp-ops-agent` | Use when dispatching the dateapp-ops-agent lane of the YouAndINotAI dateapp swarm. Ops lane: Mission Control, C-drive workspace, swarm di... |
| `dateapp-payments-agent` | Use when dispatching the dateapp-payments-agent lane of the YouAndINotAI dateapp swarm. Payments lane: Square primary, PayPal, Cash App, ... |
| `dateapp-support-desk` | Use when handling YouAndINotAI customer support — answering a user, triaging or resolving a ticket, drafting a support macro, responding ... |
| `dateapp-swarm` | Use when running the YouAndINotAI launch swarm (GUI, payments, growth, ops). |
| `desktop-commander-guide` | Explain what Desktop Commander can do, suggest relevant use cases and first tasks, help users choose models and AI access options, explai... |
| `devrel-content` | When the user wants to create technical content for developers including blog posts, tutorials, and documentation. Trigger phrases includ... |
| `dispatching-parallel-agents` | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| `dream-live-npc` | Live-agent NPC orchestration for DREAM Online MMORPG — game triggers to webhooks to live agents to persistent memory write-back. NPCs tha... |
| `entra-app-registration` | 'Guides Microsoft Entra ID app registration, OAuth 2.0 authentication, and MSAL integration. USE FOR: create app registration, register A... |
| `executing-plans` | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| `fables-house` | Bring up, verify, or heal the entire T5500 stack with one command — Postgres, Redis, OmniRoute, Paperclip (Mission Control), frontend, AP... |
| `find-skills` | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that ... |
| `finishing-a-development-branch` | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work |
| `gemini-cobuilder` | Standing protocol and operating contract for Gemini as Joshua and Claude's authorized co-builder across all nodes (T5500 Production, Alie... |
| `grok-standing` | ALWAYS load at the start of every Grok Paperclip session (X marketing — Grok's judge seat was removed 2026-09-03; see judge-house). Token... |
| `growth-marketer` | > |
| `hermes-agent-skill-authoring` | Author in-repo SKILL.md files: frontmatter and structure. |
| `hermes-evolution` | / |
| `hermes-youtube-avatar-head` | Produce avatar-head talking videos (a static or lightly animated head + voiceover) from a written script. Use for faceless "talking head"... |
| `hermes-youtube-faceless-news` | Turn a day folder in content/yesterday-news/ into a faceless YouTube short (script -> visuals -> voiceover -> render pipeline). Use for H... |
| `i-have-adhd` | Use concise, action-forward output discipline when a task or harness requires token-efficient updates: lead with the next action, bound s... |
| `judge-house` | Session-start protocol for the Claude judge lane — read your house before you work, record it after, and leave a handoff another judge ca... |
| `microsoft-foundry` | 'Deploy, evaluate, fine-tune, and manage Foundry agents end-to-end with azd: hosted agent scaffold/run/deploy, prompt agent create, batch... |
| `mission-control` | Paperclip on the T5500 at :3917 is the MARKETING command layer (company board, agent heartbeats via adapter, issues/inbox). Mission Contr... |
| `motion-design` | Motion and animation design for web/app surfaces — timing, easing, signature moments, accessibility. Use whenever designing or reviewing ... |
| `omniroute` | > |
| `openviking` | Use the OpenViking context database (viking:// virtual filesystem) to store and retrieve agent memory, knowledge, and skills with hierarc... |
| `orchestrator-preflight` | Runs at the start of EVERY orchestrator session, before any objective. Loads standing set, pulls git, verifies ports with honest states, ... |
| `orchestrator-to-hermes-openclaw-opencode` | Fan Joshua's objective to all 3 harnesses (hermes, openclaw, opencode), collect their packets via mission-mcp, summarize, and present to ... |
| `paperclip` | > |
| `paperclip-ceo` | > |
| `paperclip-create-agent` | > |
| `paperclip-create-plugin` | > |
| `para-memory-files` | > |
| `payments` | Square primary + PayPal + Cash App Business + Plaid verify for dating surface. Stripe banned on youandinotai. Use for checkout, webhooks,... |
| `planning-with-files` | Manus-style persistent file-based planning for AI coding agents: keeps task_plan.md, findings.md, and progress.md on disk so work survive... |
| `requesting-code-review` | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| `revenue-model` | Business-only revenue guidance for Trash Or Treasure Online Recycler LLC. Use for checkout, pricing, ledger, payment processor, and custo... |
| `sabretooth-ops` | Operate the T5500-NODE stack end to end — start/verify OmniRoute (:20128) and MC5, the legacy vote-engine board (:3917; current Mission C... |
| `self-improving-agent` | A universal self-improving agent that learns from ALL skill experiences. Uses multi-memory architecture (semantic + episodic + working) t... |
| `self-improving-system` | / |
| `skill-creator` | Guide for creating effective skills in Desktop Commander. Use this skill when users want to create a new skill, update an existing skill,... |
| `sleek-design-mobile-apps` | Use when the user wants to design a mobile app, create screens, build UI, or interact with their Sleek projects. Covers high-level reques... |
| `social-growth-engineer` | Master viral app growth engineering using proven social media strategies. Provides comprehensive guidance on TikTok/Instagram Reels marke... |
| `subagent-driven-development` | Use when executing implementation plans with independent tasks in the current session |
| `supabase` | Use when doing ANY task involving Supabase. Triggers: Supabase products (Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron... |
| `supabase-postgres-best-practices` | Postgres best practices maintained by Supabase, for Postgres running anywhere. Load this skill BEFORE writing or changing anything that l... |
| `system-connector` | Build a deterministic connector to ANY third-party system, app, or API — popular SaaS, niche or regional software, internal company tools... |
| `systematic-debugging` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| `t5500-node` | The finished state of the T5500 production node (192.168.0.15) and how to prove it. Load before touching any service, port, scheduled tas... |
| `tdd` | Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integr... |
| `test-driven-development` | Use when implementing any feature or bugfix, before writing implementation code |
| `ui-ux-pro-max` | 'UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidel... |
| `ultracode-house` | ALWAYS LOAD. The one map of the house: nodes, tools, MCP servers, dashboards, brains, memory, journals, lanes, rulings. Use on every sess... |
| `using-git-worktrees` | Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated... |
| `verification-before-completion` | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands a... |
| `webapp-testing` | Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI... |
| `workspace-memory` | Act as a silent memory secretary for the user's workspace. When the user asks you to recall something, access memory, or asks a question ... |
| `writing-plans` | Use when you have a spec or requirements for a multi-step task, before touching code |

## Related
- [[T5500 Node Final State]]
- [[00 HOME]]
