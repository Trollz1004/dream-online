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
- All non-Sup@ NPCs route through Paperclip-style webhook triggers -> agent
  response -> memory write-back (post-Paperclip: via Agent Hub :3130).

## Agent Hub / orchestration
- **Agent Hub** — port 3130, C:\antigravity\services\agent-hub. The orchestration
  layer that replaces Paperclip. Routes work to ~19+ platforms/agents.
- **FCC lane** — free-tier Claude executor config, `~/.claude-fcc` config dir,
  proxy 127.0.0.1:8082, caps at 40k context. Banner reads "API usage".
- **Real Claude (Max) lane** — `~/.claude` config dir. Banner reads "Pro plan".
- **Lanes never share config dirs.** Never hold an Anthropic API key on FCC.

## Node names
- **Sabretooth** — 192.168.0.8, this box. C:\ = dev/agent coordination,
  E:\ = DREAM ONLINE drive (this root).
- **T5500** — gateway + dateapp node, public tunnels, Cloudflare/Wrangler deploy.
- **9020** — 192.168.0.5, historically ran Dream Paperclip :3120 (being retired).

## Banners (lane identification)
- "Pro plan" = real Claude Max lane (`~/.claude`).
- "API usage" = FCC lane (`~/.claude-fcc`), capped context.

## Retired / superseded terms
- **Paperclip** — retired orchestration system. Superseded by Agent Hub :3130.
  Stub preserved at ops\legacy\paperclip-stub\ for historical reference only.
- **D:\dream-online** — obsolete path. Drive letter is E:\ now
  (E:\CLAUDE's-N-Joshua's-Dream-Online-MMORPG is canonical root, env DREAM_ROOT).
