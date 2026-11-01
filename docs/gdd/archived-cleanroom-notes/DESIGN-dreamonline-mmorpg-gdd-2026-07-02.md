# DESIGN — DREAM Online MMORPG — Game Design Doc — 2026-07-02

> "It was all a DREAM." Open-world sandbox browser MMORPG. Free to play.
> Pay-for-convenience, never pay-to-win. Live-agent NPCs are the differentiator.
> Surface #4 of the ANTIGRAVITY platform. UI: Sleek Cyberpunk Glassmorphism.

---

## 1. Pillars

1. **One world.** No instances, no fast travel, no teleports — ever. Distance is the
   economy. A horse comes later; your feet come first.
2. **The grind is the game.** Kill → level → loot → repair → push deeper. Every
   convenience the shop sells is earnable in-world, slower.
3. **NPCs are alive.** Live-agent NPCs (see `SKILL.md — dream-live-npc`) remember who
   robbed them, who saved them, and act back into the world. Tiered T0–T3 routing,
   judge/tally arbitration, fallback law: no player ever waits on inference.
4. **Honest monetization.** Convenience versions cost ~2× their in-game equivalent and
   say exactly what they do. No loot boxes, no gambling mechanics, no stat ceilings
   behind cash.

## 2. Currencies

| Currency | Earned | Bought | Spends on |
|---|---|---|---|
| **Sols** | Mob drops, selling loot/fish/materials | never | Gear, tonics, town repairs |
| **NEEDS** | Rare drop (~1.5% mobs, fishing, boss-guaranteed) | Yes — packs via Square-hosted checkout | Cosmetics w/ perks, Fable's Popup Camper, Mercy Writ, stash expansion, unique rare unlocks |

NEEDS is sold publicly as **product currency only**. 13+ age gate + TOS acceptance at
signup; under-18 purchases require a guardian (Square-hosted checkout). Accounts:
hashed passwords + TOTP two-factor (backend spec §10).

**Live-NPC AI is free and unlimited for every player.** Ads fund inference; the player
never pays for it and there is no message cap or premium brain. Claude and Codex are
built-in lanes (T2/T3); Ollama on the game node covers T1; scripted T0 is always the
fallback. NEEDS never touches AI access.

## 3. Durability — the repair loop

- Weapons lose 1 durability per swing; armor 1 per hit taken. At 0: effectiveness halves.
- **Fable's Blacksmith Shop** (in town): cheap Sols repairs, gear vendor, loot buyer.
- **Fable's Popup Camper** (NEEDS, 3 uses): deploys anywhere — field repair + stash
  access. The convenience alternative to walking back. ~2× the lifetime Sols cost of
  town repairs, by design.
- Ion Vanguard Skin (cosmetic): durability drains 25% slower. Convenience, not power.

## 4. Combat & leveling

- Action combat: move (WASD / tap-to-move), melee swing on cooldown, mob aggro + leash.
- Zones by threat: Mistfen Plains (lv 1–4, passive wolves) → Gloomwood (lv 5–8,
  aggressive shades) → Rust Ridge (lv 8–12, golems). Loot: Sols, materials, gear, rare
  NEED shards.
- XP curve tuned for a 30-min satisfying session; level-up heals and raises HP.

## 5. Fishing & cosmetics

- Lake Lumen: cast → timing-bar minigame. Catch fish (sell), treasure, NEED shards.
- **Outfits are cosmetics with perks** (convenience-class only):
  - Tidal Swimline — +35% fishing success, +25% fishing XP
  - Reefrunner Wetsuit — +55% fishing success, +40% fishing XP
  - Field Medic Uniform — tonics heal +30%, +5% XP
  - Oculus Crown — +10% XP (boss trophy, not purchasable)
- Content rating: swimwear-level maximum, zero nudity, enforced at the judge layer
  (live-NPC safety rails) and in the art bible. 13+ age gate on account creation;
  content stays teen-safe by design.

## 6. Open-world PvP & karma

- PvP is **opt-in by flag**. Unflagged players cannot be hit and cannot hit.
- 3 player kills → **red name**. Red players: town guards one-shot on sight; death
  drops **half of inventory** as a world-lootable bag (other players can take it).
- Red status decays slowly over time — or a **Mercy Writ** (NEEDS) clears it instantly.
  Bad boys get punished; repentance is the convenience you can buy.

## 7. Duo mini-bosses — GeminEYE & OpenAEye

**Loot rule (founder-locked, applies to EVERY drop in the game):** the drop goes to the
party with the most total damage dealt, pooled across party members and scaled by a
party modifier — never to whoever taps first, holds the ground, or rolls. Solo damage
counts as a party of one. This is what makes groups matter without making them mandatory.

Group-content robotic eye duo in the Arena of Lenses:
- **GeminEYE** — splits into a mirrored twin at half health.
- **OpenAEye** — periodic gaze applies **Cross-Eyed**: your view literally doubles for
  6 seconds (render-layer double-vision effect).
Defeating both: large Sols purse, guaranteed NEED shards, Oculus Crown trophy.
Designed for duos/groups; soloable at high level.

## 8. SupO — the companion orb (storyline spine)

Every dreamer wakes with **SupO**, a small floating orb that hovers at your shoulder.
- **Guide:** contextual whispers — low durability warnings, "water nearby — cast a line,"
  red-name cautions, boss lore intros, first-visit tutorials. SupO is the tutorial; there
  are no popups.
- **Grows with you:** SupO's size, glow rings, and voice evolve with your level
  (Mote → Spark → Beacon → Halo tiers). Its evolution IS the long-game storyline: SupO
  slowly remembers what it used to be, and why the world is called a DREAM.
- **Tech:** T2 story-critical live agent (per §9 tiers) with per-player persistent
  memory — the flagship of the live-NPC system alongside FABLE.

## 9. Live NPCs (differentiator)

Per `dream-live-npc` SKILL: game triggers → webhooks → tiered agents → persistent
memory write-back. FABLE the blacksmith is the flagship T1: remembers your gear state,
your visits, your red-name history. Fourth-wall doctrine: NPCs never reference
real-world mission/company language. Rating compliance rejected pre-render.

## 10. Backend spec (engineer handoff — not in this prototype)

- **GM Control (internal, never public):** `DREAM GM Control.dc.html` in this project is
  the operator console spec — Mission Control structure, polls the game node
  (`192.168.0.8:20128/api/v1`), live-npc-lab :9127 and dreamops-bridge :9133. Proposals
  only: hotfix propose, rollback *plan*, event pause. Every mutation appends to
  `game/server/audit.log`. Founder approves safe_mode / rollback execution by hand.
- **Auth:** Postgres users table, argon2id password hashes, TOTP 2FA (enrollment at
  signup, required for marketplace actions), session JWTs, rate-limited login.
- **Age gate:** DOB attestation + checkbox (13+) at signup per COPPA line; under-18
  NEEDS purchases require guardian consent, with payment-verified adulthood handled by
  Square at checkout. No nudity anywhere — swimwear-max content keeps a teen rating;
  the gate protects the store rating, not explicit content — there is none.
- **Payments:** Square-hosted checkout only. NEEDS ledger is server-authoritative,
  append-only. Idempotent grant on webhook confirmation.
- **World state:** authoritative server sim; client is a view. Inventory/durability/
  karma server-side. Anti-dupe: item instances have UUIDs.
- **Compliance copy rules (FL §496.405):** never donate/donation/charity/solicitation/
  tax-deductible/beneficiary/split-math on any customer surface. No mission hashtags.
  Sell access, fun, convenience, safety, uptime — nothing else.

## 11. Prototype in this project

`DREAM Online.dc.html` + `dream-engine.js` — playable slice: character gate (name,
M/F, 18+ / TOS), grind/level/loot, durability + Fable repairs, camper, fishing +
swim-outfit perks, NEEDS shop with simulated Square checkout, PvP flag / red-name /
guard execution / half-loot death, GeminEYE + OpenAEye duo with cross-eye effect,
SupO companion orb (grows by tier, contextual guidance), localStorage persistence. All server logic simulated client-side — design prototype,
not production code.

## 12. Live-world architecture (founder-locked, 2026-09-02)

**One sandbox.** One persistent open world, no instances, no load screens, no fast
travel. Ever. Horse later; feet first.

**Hermes is every NPC.** An NPC profile = a Hermes persona with scoped memory
(player / npc / zone / global_event). One always-running Python orchestrator hosts the
fleet; ACPs + MCPs tie NPC memory, world events, marketplace and moderation together.
NPCs propose, the server decides, the player chooses (§9 four laws still apply).

**Marketplace is its own platform** (dedicated in-house service, separate from the game
server, same doctrine):
- Moderates the **tax** on every item sold; tax rate is a formula, not a constant.
- **Layaway:** any item can be held with a deposit and paid off over time — built for
  players who cannot pay up front. No interest, no penalty beyond losing the hold.
- Revenue values / formulas are **trigger-driven** (webhooks): the operator changes a
  multiplier, the world reflects it next tick. All changes append to the audit log.
- Loot rule (§7) and NEEDS ledger remain server-authoritative.

**Moderation fleet.** Gemini + Grok lanes keep the world fun and fair: anti-cheat /
exploit review, the ban hammer, and **public verdict events** — when a player is found
guilty of cheats or exploits, the world stages the punishment as a spectacle (tribal
drums, arena walk, sentence read aloud by the guards). Punishment is content. Appeals
route to the founder.

**Nightmare Shift (weekly).** Once a week the whole world swaps to its Nightmare:
the same map at night, city lights on, neon and rain, vertical traversal — a cyberpunk
metropolis layered over the fantasy geography. Crime becomes possible (theft, heists,
street PvP) and **penalties are severe and real**: bounties, red name, jail time
measured in real hours, gear confiscation. The Sandman theme carries it: "bring me
your dreams" on the way in, night shivers on the way out. Evolving world: what
happens in the Nightmare persists into the day.

**Stack.** Game server (authoritative sim) · Hermes NPC fleet (Python, always on) ·
Marketplace platform (tax / layaway / revenue formulas) · Moderation lanes (Gemini,
Grok) · GM Control (§10) as the single operator surface. All wired by triggers and
webhooks; no service writes another's state directly.
