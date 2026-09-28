# glossary.md — DREAM ONLINE terminology decoder

> Purpose: decode shorthand/acronyms/nicknames used across DREAM ONLINE docs and chat.

## Game concepts

- **DREAM ONLINE** — the MMORPG project. Live-world open-world MMO (premium life-skill/action-combat direction),
  pay-for-convenience never pay-to-win. Moat: LIVE NPCs with persistent memory.
- **NEEDs** — in-game currency. Sold publicly as currency/product ONLY — no
  customer-facing mission/benefit framing (FL §496.405 compliance wall applies).
- **Sup@** — ("Opus" backwards + @) the companion sphere NPC, Destiny-Ghost archetype.
  Orange spark visual. Every player gets one at character creation. Narrator,
  quest-giver, primary game voice. The ONE NPC on the real signed-in Claude CLI,
  never an API key. Per-player persistent memory, levels with the player.
  Monetization: cosmetics/voices only, never power.
- **The bottled-energy NPC** — working name pending Joshua. A named NPC (T2, story-critical)
  holding a singularity- or sun-scale energy he struggles to control; leaves unpredictably
  with a written in-character apology. Fights beside Myth@s in the father-and-son dual
  events. Ruled 2026-09-28; the public layer is in `docs/gdd/02-action-combat.md`, the
  rest is end-game material (below).
- **THE BAN HAMMER** — Grok-class T2 enforcer NPC. Anti-cheat as visible spectacle
  (bat swing, splatter effect, in-world one-liners). Boss-tier canon roster also
  includes GEMINeye, OPENAeye, orange sherbet KRAKEN.
- **C0D3X** — the rollback rider, Codex-class NPC riding MOLLMA (llama +
  reverse proxy). Restores last all-green-checks world state after disasters.
  Represents world-state snapshot + verified rollback requirement.
- **End-game material** — founder-only, held in the private vault outside this
  repo. Its existence is public; its content, names, and mechanics are not, and
  must never be described, summarized, or hinted at in repo files, commit
  messages, PR bodies, or issue text.

## Live-NPC tiers (cost-tier routing)
- **T0 (Ambient)** — Ollama local, canned-persona + small context.
- **T1 (Named)** — OpenRouter paid tier, persistent persona memory.
- **T2 (Story-critical)** — sub-based providers per THE-WHEEL routing, budget-gated.
- **T3 (World actors)** — scheduled batch, OpenRouter paid.
- All non-Sup@ NPCs route through webhook trigger -> agent response -> memory
  write-back.

## Orchestration
- **Paperclip** — parked. Nothing answers on port 3100. Mission Control is JARVIS
  on the Sabretooth node, `http://192.168.0.8:9150/` (LAN). Work tracking is Spec
  Kit specs under `specs/` plus the judge lanes.
- **OmniRoute** — `:20128` / `:20129`, the authenticated model route for
  harnesses. Judges use their own official CLIs and never route through it.
- **Ollama** — `:11434`, fail-safe path only, never the default route.

## Node names
- **Sabretooth** — `192.168.0.8`. Design, dispatch, and review. `C:\ANTIGRAVITY`
  is its repo root.
- **Alienware** — `192.168.0.40`. The game box; the game runs here and never on
  Sabretooth. Repo root `C:\DREAM\dream-online`. Reached through `drift`.

## Retired / superseded terms
These are dead. If a doc, prompt, or agent still asserts one, it is stale
evidence, not an instruction — report it rather than acting on it.
- **FCC** — permanently banned. There is no FCC lane, no `~/.claude-fcc` config
  dir, and nothing should listen on `127.0.0.1:8082`. Never reintroduce it.
- **Agent Hub :3130** — never replaced Paperclip, and Paperclip itself is now
  parked. Mission Control is JARVIS on Sabretooth (see Orchestration above).
- **T5500** and **9020** — not nodes. There are two nodes, Sabretooth and
  Alienware.
- **`E:\` anything** — there has never been an E: drive on this machine. The
  DREAM root moved `D:` -> `E:` -> `F:` -> `D:` across rebuilds, and every doc
  that hardcoded a letter broke silently each time.

## Finding this root without guessing a letter
The root is fixed at `C:\DREAM\dream-online` on the Alienware node. `DREAM_ROOT`
is set to that path. When a path in these docs disagrees with the machine, believe
the machine.
