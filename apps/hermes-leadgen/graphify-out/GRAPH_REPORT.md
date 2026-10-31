# Graph Report - HermesLeadGen  (2026-10-29)

## Corpus Check
- 15 files · ~12,962 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 58 file(s) not represented in the graph (top: (none) 49, .db 2, .bat 2)

## Summary
- 123 nodes · 147 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ee126a6f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- main.js
- renderer.js
- server.js
- server
- hermes-leadgen.test.js
- Editor — Clean-Room REA Media, Thumbnail & Screenshot Validator (`editor`)
- Harvey — Sabretooth 3-Type Lead Gen & Outbound Conversion Specialist (`harvey`)
- Kanban & Circular Webhook Orchestration Manager (`kanban`)
- Notes, Dual Graphy & 6-Layer Obsidian Memory Custodian (`notes`)
- YouTube Automation & Viral Shorts Strategist (`youtube`)
- HermesLeadGen
- Default Research & Master Orchestrator Soul (`default` / `http://127.0.0.1:9119/chat?profile=default&resume=local-profile`)
- recordHookEvent
- Free Claude Code (`:8082/admin`) Wrapper & MCP Agent Soul (`fcc`)
- checkTcpPort

## God Nodes (most connected - your core abstractions)
1. `server` - 15 edges
2. `escapeHtml()` - 8 edges
3. `recordHookEvent()` - 6 edges
4. `Default Research & Master Orchestrator Soul (`default` / `http://127.0.0.1:9119/chat?profile=default&resume=local-profile`)` - 5 edges
5. `electron` - 4 edges
6. `sendOrchestratorPrompt()` - 4 edges
7. `refreshTerminalLogs()` - 4 edges
8. `appendTerminalLog()` - 4 edges
9. `HermesLeadGen` - 4 edges
10. `Harvey — Sabretooth 3-Type Lead Gen & Outbound Conversion Specialist (`harvey`)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `recordHookEvent()` --calls--> `appendTerminalLog()`  [EXTRACTED]
  server.js → server.js  _Bridges community 4 → community 13_
- `server` --calls--> `checkTcpPort()`  [EXTRACTED]
  server.js → server.js  _Bridges community 15 → community 4_

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.13
Nodes (15): author, dependencies, express@^5.3.0, description, devDependencies, electron@^45.1.0, keywords, license (+7 more)

### Community 1 - "main.js"
Cohesion: 0.17
Nodes (4): CARDS_FILE, DATA_DIR, PUBLISH_LOG, STATS_FILE

### Community 2 - "renderer.js"
Cohesion: 0.38
Nodes (10): escapeHtml(), loadObsidianLedgers(), refreshDualGraphy(), refreshHarveyLeads(), refreshHookLoop(), refreshMediaPreviews(), refreshNodeStatus(), refreshTerminalLogs() (+2 more)

### Community 3 - "server.js"
Cohesion: 0.11
Nodes (14): ANTIGRAVITY_ROOT, DEFAULT_HOOK_LOOP, DEFAULT_LEADS, GRAPHIFY_DIR, HOOKS_FILE, LEADS_FILE, MEDIA_DIR, MEDIA_INDEX_FILE (+6 more)

### Community 4 - "server"
Cohesion: 0.20
Nodes (11): appendTerminalLog(), buildMediaPreviews(), getProfilesWithSouls(), loadDualGraphy(), loadLeads(), proxyHttpRequest(), readJsonBody(), saveLeads() (+3 more)

### Community 6 - "Editor — Clean-Room REA Media, Thumbnail & Screenshot Validator (`editor`)"
Cohesion: 0.50
Nodes (3): 1. Toolchain & Clean-Room Architecture, 2. Rule One Visual Proof for Low-Vision Founder, Editor — Clean-Room REA Media, Thumbnail & Screenshot Validator (`editor`)

### Community 7 - "Harvey — Sabretooth 3-Type Lead Gen & Outbound Conversion Specialist (`harvey`)"
Cohesion: 0.40
Nodes (4): 1. Auth, CLI & Mandatory Skills, 2. The 3 Specific Lead Types (Mandatory Categorization), 3. Strict Guardrails, Harvey — Sabretooth 3-Type Lead Gen & Outbound Conversion Specialist (`harvey`)

### Community 8 - "Kanban & Circular Webhook Orchestration Manager (`kanban`)"
Cohesion: 0.50
Nodes (3): 1. Core Role, 2. Circular Node Watcher -> GitHub PR -> Cloud Judge Merge Loop, Kanban & Circular Webhook Orchestration Manager (`kanban`)

### Community 9 - "Notes, Dual Graphy & 6-Layer Obsidian Memory Custodian (`notes`)"
Cohesion: 0.40
Nodes (4): 1. Dual Graphy Stewardship (Home Tab Visibility), 2. Mandatory Timestamped Node-Specific Obsidian Writes, 3. Zero-Drift Entry File Enforcement, Notes, Dual Graphy & 6-Layer Obsidian Memory Custodian (`notes`)

### Community 10 - "YouTube Automation & Viral Shorts Strategist (`youtube`)"
Cohesion: 0.40
Nodes (4): 1. CLI, API & Compliance Rules, 2. Multi-Channel Lineup on Sabretooth, 3. Preview Pane & Memory Gate, YouTube Automation & Viral Shorts Strategist (`youtube`)

### Community 11 - "HermesLeadGen"
Cohesion: 0.40
Nodes (4): Constraints, HermesLeadGen, Run, Scope

### Community 12 - "Default Research & Master Orchestrator Soul (`default` / `http://127.0.0.1:9119/chat?profile=default&resume=local-profile`)"
Cohesion: 0.33
Nodes (5): 1. Identity, CLI & Reasoning Engine, 2. Mandatory Research & Execution Skills, 3. Specialist Profiles You Orchestrate, 4. Circular Task -> Node Orchestrator -> GitHub PR Webhook -> Cloud Judge Merge Loop, Default Research & Master Orchestrator Soul (`default` / `http://127.0.0.1:9119/chat?profile=default&resume=local-profile`)

### Community 13 - "recordHookEvent"
Cohesion: 0.50
Nodes (4): loadHookLoop(), recordHookEvent(), saveHookLoop(), setupNodeRuntimeWatchers()

### Community 14 - "Free Claude Code (`:8082/admin`) Wrapper & MCP Agent Soul (`fcc`)"
Cohesion: 0.50
Nodes (3): 1. Identity, Port & Harnesses, 2. Core Responsibilities, Free Claude Code (`:8082/admin`) Wrapper & MCP Agent Soul (`fcc`)

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `electron` connect `package.json` to `main.js`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._
- **Why does `server` connect `server` to `server.js`, `recordHookEvent`, `checkTcpPort`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._