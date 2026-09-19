# DREAM ONLINE Constitution

This constitution binds every spec, plan and task under `specs/`. It restates rulings that already exist; it does not invent new ones. Doctrine lives in `docs/DREAM-MASTER-DIRECTIVE.md`, the shared rulebook is `AGENTS.md`, and live operational state is `DREAM-DISPATCH.md`. Where this file and the master directive disagree, the directive wins and this file gets fixed.

## Core Principles

### I. Founder locks are not open for redesign

Section 50 of the master directive is fixed unless Joshua approves a change in writing: action combat with i-frames and no tab-target foundation, no fast travel, one shared open world, no pay-to-win and no pay-for-power, non-destructive enhancement, the CrossEyed Duo canon, the Vengeance system with a party cap of six, Sup@'s identity, THE BAN HAMMER, C0D3X and MOLLMA as the rollback requirement, NEEDs as in-game only, earned prestige never purchased, the age-mode architecture, and DREAM's separation from every other project. A spec that touches one of these stops and asks first.

### II. The DREAM server is truth; AI proposes and DREAM validates

Unreal is presentation and action. The DREAM server is authoritative state. Hermes is agent identity and orchestration. Runtime NPC agents never get shell, source control, deployment, editor, database, payment, secret or arbitrary MCP access. AI may observe, remember, speak, suggest and propose actions; it never mints currency, settles trades, bans a player, alters payment state or grants itself permissions. Every AI output passes a structured validator before it changes the world. Combat and economy never wait on inference. Silence is a valid NPC response, and every AI path has a scripted fallback so the game stays fun with all generative AI switched off.

### III. One inference route, no provider keys in code

Every model call from a harness or from the game goes through OmniRoute at `http://192.168.0.8:20128/v1`. No provider key appears in code, config, client builds, NPC memories or logs. Claude is reached only through the signed-in Claude CLI, never an API key, and never through OmniRoute; Sup@ is the only in-game entity on that path. Providers stay replaceable behind the provider abstraction.

### IV. Test first, and nothing lands without the gate

RED, GREEN, REFACTOR: the failing test comes before the code. Merge only when at least 90 percent of the affected tests pass; report the rate and name every failure. Only the judge lanes, Codex and Claude, push, merge or delete branches. Harnesses, Hermes included, never push. Commits use an explicit pathspec, never a sweep. Commit per unit of work.

### V. Spec first, small slices

Every non-trivial piece of work starts as a spec under `specs/` with a plan and a tasks file. Workers are pointed at the tasks file and tick it off; they are not re-briefed in chat. Build the smallest complete vertical slice first: the CrossEyed slice of directive section 43, with the world bus of the world-engine dispatch as its event schema. Do not build the whole MMO.

### VI. Evidence over assumptions

Inspect before modifying. A port answering is never proof of a service; probe the identity string and report UP, DOWN, WRONG SERVICE, AUTH MISSING, AUTH REJECTED or NOT CONFIGURED. Reconnaissance reports use VERIFIED, PRESENT BUT UNCONFIGURED, MISSING, BLOCKED, DO NOT TOUCH or RECOMMENDED NEXT ACTION. A recorded failure expires exactly like a recorded success: re-check before repeating either. Recorded numbers only, no projections.

### VII. Fair monetization

Players earn power. Money may buy expression, convenience, reduced maintenance and storage comfort. Money never buys victory, combat superiority or competitive entitlement. NEEDs never surface as a real-money benefit. No loop where players earn something for people outside the game is ever built inside the game.

## Security and public surface

The repository is public. Never commit secrets, `.env` values, provider tokens, private keys, local session exports or classified plot material; `.env.example` holds placeholders only. Public and player-facing copy uses the project language in `AGENTS.md`: world-native terms, no competitor names, no unrelated business language. The Unreal MCP plugin stays parked: loopback only, editor only, and nothing depends on it. Nobody builds a new dashboard; an operator view for the game is a panel in the existing Mission Control on the Sabretooth node, reached through the DreamOps Bridge.

## Workflow and protected files

Stop and ask before deleting irreplaceable data, wiping a database, a destructive migration, rotating unknown credentials, replacing working infrastructure, exposing a private service publicly, or moving DREAM to another node (directive section 51). Otherwise: inspect, implement, test, document, continue.

Only Claude, reached through `drift` on the Alienware node, edits the node's protected files: `ops/node/**` (the `drift` command, the health probe, the launch skill, the runbook) and the OneDrive drop box. Every such edit gets a timestamped line in `ops/node/runbook/PROTECTED-CHANGELOG.md`.

Every meaningful delivery to Codex uses the section 52 handoff format: summary, files changed, why, architectural decisions, tests, security check, known limitations, open questions, rollback method, next recommended action. `DREAM-DISPATCH.md` is kept current.

Anything Joshua reads is written in plain complete sentences and short lists, outcome first, with no dense tables and no ASCII art.

## Governance

This constitution supersedes convenience. Amendments come from Joshua's rulings, are recorded with their date, and bump the version below. Every plan's constitution check names the principles it touches.

**Version**: 1.0.0 | **Ratified**: 2026-09-19 | **Last Amended**: 2026-09-19
