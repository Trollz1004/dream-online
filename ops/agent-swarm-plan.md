# Dream ONLINE Agent Swarm Plan

Status note (2026-09-26): this plan predates the 2026-09-20 engine decision and still
describes the Unreal-era agent roles.

## Rule

No agent edits `C:\antigravity` for this game lane. Dream ONLINE work lives in `C:\DREAM\dream-online` unless Joshua explicitly changes it.

## Core Agents

| Agent | Job |
|---|---|
| Codex Lead | Architecture, code, integration, final decisions |
| Game Designer | GDD, systems, combat/economy rules |
| Godot Gameplay Scripter | GDScript states, combat rules as plain data, server-authoritative boundaries |
| Godot World Builder | scenes, environments, CC0 assets under the originality rule |
| UX Architect | HUD, menus, input clarity, accessibility |
| Economy Designer | Life skills, crafting, durability, market sinks |
| QA Agent | Test matrix, bug reproduction, regression notes |
| Research Agent | BDO/life-skill/MMO references and source notes |

## Low-Context Handoff Files

- `README.md`: current direction.
- `docs/gdd/01-vertical-slice.md`: scope lock.
- `docs/testing/test-plan.md`: proof gates.
- `ops/install-checklist.md`: workstation readiness.
- `ops/agent-swarm-plan.md`: agent roles.

## Heartbeat Format

Each agent heartbeat should be short and timestamped:

```text
[YYYY-MM-DD HH:mm TZ] AgentName
Focus: one sentence.
Files used: absolute paths.
Decision needed: yes/no.
Blocker: none or exact blocker.
Next: one concrete action.
```

## First Agent Tasks

1. Combat agent: command-input skill tree for Blade class.
2. Economy agent: first 25 materials and 10 recipes.
3. World agent: Dream Field map sketch and Data Layer plan.
4. UX agent: no-tab combat HUD wireframe.
5. QA agent: Milestone 0 and Milestone 1 test cases.
