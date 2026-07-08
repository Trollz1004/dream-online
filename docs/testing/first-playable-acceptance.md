# First Playable Acceptance Checklist

Status: draft

Purpose: define the minimum playable proof for DREAM ONLINE before expanding systems,
installing heavyweight tools, or promising larger scope.

## First playable promise

The first playable must prove:

- Movement feels readable.
- One action-combat enemy can be fought.
- One resource can be gathered.
- One NPC guide can remember and respond.
- One live-world event can change the zone state.
- Day/Nightfall changes player routine and danger.
- Inventory, item durability, and repair have visible meaning.
- Marketplace and Runner systems have a safe placeholder path.

## Local backend readiness

- [ ] `GET /health` returns ok.
- [ ] `GET /contracts` returns the schema index.
- [ ] `GET /contracts/character-profile` returns the character profile contract.
- [ ] `GET /contracts/combat-ability` returns the combat ability contract.
- [ ] `GET /contracts/life-skill` returns the life-skill contract.
- [ ] `GET /contracts/pvp-state` returns the PvP state contract.
- [ ] `GET /contracts/marketplace` returns the marketplace contract.
- [ ] `GET /contracts/live-npc-memory` returns the live NPC memory contract.
- [ ] `GET /world/zones` lists `first-gate`.
- [ ] `GET /world/zones/first-gate` returns the First Gate seed.

## Character creation

- [ ] Player can choose one starter path: blade, hammer, spear, bow, or focus.
- [ ] Player can choose basic appearance preset values.
- [ ] Player profile stores starter path and life-skill interest.
- [ ] Level 45 awakening preview exists as locked future identity.
- [ ] `Nightmare Class` and `DREAM Class` are visible as future goals without implying
  immediate access.

## First Gate zone

- [ ] Player spawns at Old Road Arrival.
- [ ] Moon Gate Ruin is visible from spawn.
- [ ] Guide NPC is discoverable without minimap dependency.
- [ ] Worker Camp is reachable from the gate.
- [ ] Low Road is visibly more dangerous than the camp.
- [ ] Closed City Line reads as a future Dream event boundary.
- [ ] Safe exits are readable before danger becomes lethal.

## Combat

- [ ] One starter enemy pocket can be fought.
- [ ] Hit confirm is readable through animation, sound, VFX, or reaction.
- [ ] Stamina cost is visible.
- [ ] Cooldown timing is understandable.
- [ ] Range and melee advantages are readable.
- [ ] Nightfall enemy HP and damage increase is obvious.
- [ ] Level gap scaling is disabled or simulated only for first playable unless PvP exists.

## Life skills

- [ ] One ore node can be gathered.
- [ ] One herb node can be gathered.
- [ ] Tool wear or durability warning is visible.
- [ ] Day life-skill bonus is communicated.
- [ ] Nightfall life-skill reduction or danger interruption is communicated.
- [ ] Inventory space matters.
- [ ] At least one gathered item appears in inventory.

## Live NPC guide

- [ ] Guide can explain where the player is.
- [ ] Guide can explain the next safe action.
- [ ] Guide can mention active Day or Nightfall state.
- [ ] Guide can reference a recent world event.
- [ ] Guide can store a compact memory record.
- [ ] Guide actions are proposals only, not arbitrary commands.

## World event

- [ ] Gate Flicker can be represented as a zone event.
- [ ] Resource Bloom can be represented as a zone event.
- [ ] Nightfall Surge can be represented as a zone event.
- [ ] Wilderness-to-city Dream event remains founder-test only.
- [ ] Event has rollback/audit fields before it affects gameplay.
- [ ] Event has safe-exit messaging if danger increases.

## Inventory, durability, and marketplace

- [ ] Bag capacity is visible.
- [ ] Treasury/storage concept is visible.
- [ ] Item durability exists on at least one tool or weapon.
- [ ] Repair concept is visible.
- [ ] Market Runner and Storage Runner are described as one-transaction convenience.
- [ ] No paid power is present in first playable.

## PvP and risk

- [ ] PvP is documented but not required for the first playable.
- [ ] Pink Flag and Red Name remain data contracts until PvP is implemented.
- [ ] Red Name item-drop rules are not active unless valid PvP state exists.
- [ ] Structured war risk remains future scope.

## Stop conditions

Do not expand scope until these are true:

- First Gate is playable end to end.
- The guide NPC can explain the first route.
- One combat loop is fun enough to repeat.
- One life-skill loop produces a useful item.
- Day/Nightfall changes behavior in a way players can feel.
- No secrets or classified material are in committed files.
