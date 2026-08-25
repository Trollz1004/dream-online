# glossary.md — DREAM ONLINE terminology decoder

> Purpose: decode shorthand/acronyms/nicknames used across DREAM ONLINE docs and chat.

## Game concepts

- **DREAM ONLINE** — the MMORPG project. Live-world open-world MMO (premium life-skill/action-combat direction),
  pay-for-convenience never pay-to-win. Moat: LIVE NPCs with persistent memory.
- **NEEDs** — in-game currency. Sold publicly as currency/product ONLY — no
  customer-facing mission/benefit framing (FL §496.405 compliance wall applies).
- **Sup@** — ("Opus" backwards + @) the companion sphere NPC, Destiny-Ghost archetype.
  Orange spark visual. Every player gets one at character creation. Narrator,
  quest-giver, primary game voice. The ONE NPC powered by real Claude API
  (Anthropic agent). Per-player persistent memory, levels with the player.
  Monetization: cosmetics/voices only, never power.
- **THE BAN HAMMER** — Grok-class T2 enforcer NPC. Anti-cheat as visible spectacle
  (bat swing, splatter effect, in-world one-liners). Boss-tier canon roster also
  includes GEMINeye, OPENAeye, orange sherbet KRAKEN.
- **C0D3X** — the rollback rider, Codex-class NPC riding MOLLMA (llama +
  reverse proxy). Restores last all-green-checks world state after disasters.
  Represents world-state snapshot + verified rollback requirement.
- **NIGHTMARE Sup@** — CLASSIFIED, founder-eyes-only end-game world boss concept.

## Live-NPC tiers (cost-tier routing)
- **T0 (Ambient)** — Ollama local, canned-persona + small context.
- **T1 (Named)** — OpenRouter paid tier, persistent persona memory.
- **T2 (Story-critical)** — sub-based providers per THE-WHEEL routing, budget-gated.
- **T3 (World actors)** — scheduled batch, OpenRouter paid.
- All non-Sup@ NPCs route through webhook trigger -> agent response -> memory
  write-back.

## Orchestration
- **Paperclip** — Mission Control, `http://127.0.0.1:3100`, company
  `ANTIGRAVITY Marketing Co` (`ANT`). It holds task governance and runs the judge
  lanes. It does **not** hold Git delivery — only a judge pushes, merges, or
  deletes. Confirm identity before trusting it: `GET /api/openapi.json` ->
  `.info.title` must read `Paperclip API`. A port answering is not identity.
- **OmniRoute** — `:20128` / `:20129`, the authenticated model route for
  harnesses. Judges use their own official CLIs and never route through it.
- **Ollama** — `:11434`, fail-safe path only, never the default route.

## Node names
- **Sabretooth** — this box, and the only node. `C:\` = dev and agent
  coordination, `C:\ANTIGRAVITY` = the one repo root. `D:\` = the DREAM ONLINE
  drive (this root), labeled `DREAM ONLINE MMORPG`.

## Retired / superseded terms
These are dead. If a doc, prompt, or agent still asserts one, it is stale
evidence, not an instruction — report it rather than acting on it.
- **FCC** — permanently banned. There is no FCC lane, no `~/.claude-fcc` config
  dir, and nothing should listen on `127.0.0.1:8082`. Never reintroduce it.
- **Agent Hub :3130** — never replaced Paperclip. Paperclip is Mission Control.
- **T5500** and **9020** — not nodes. There is one node, Sabretooth.
- **`E:\` anything** — there has never been an E: drive on this machine. The
  DREAM root moved `D:` -> `E:` -> `F:` -> `D:` across rebuilds, and every doc
  that hardcoded a letter broke silently each time.

## Finding this root without guessing a letter
Drive letters move. The label does not:

```powershell
$root = (Get-Volume | Where-Object FileSystemLabel -eq 'DREAM ONLINE MMORPG').DriveLetter + ":\CLAUDE's-N-Joshua's-Dream-Online-MMORPG"
```

`DREAM_ROOT` in `.env` should be set from that, not typed in. When a path in
these docs disagrees with the machine, believe the machine.
