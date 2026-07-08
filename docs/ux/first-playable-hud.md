# First Playable HUD And Readability Spec

Status: draft

Purpose: define the minimum HUD needed for the First Gate playable test without turning
the screen into MMO clutter.

## HUD principles

- Action first.
- Big readable signals.
- Controller-friendly from the start.
- World cues before UI spam.
- Guide hints are short and optional.
- No developer jargon in player-facing labels.
- No paid-power language.

## Always-visible combat HUD

Required:

- Health.
- Stamina.
- Current action-command skill labels.
- Cooldown read.
- Low stamina warning.
- Hit-confirm feedback.

Placement:

- Health and stamina near lower center or lower left.
- Skill inputs near lower center for action readability.
- Avoid tiny icons that only PC players understand.

## Context prompts

Prompts should appear only when useful.

Examples:

- `Gather ore`
- `Talk`
- `Repair gear`
- `Send to storage`
- `Open market`
- `Retreat to Moon Gate`

Rules:

- Show keyboard and controller labels.
- Keep prompt text short.
- Hide prompts during heavy combat unless the prompt is urgent.

## Nightfall warnings

Nightfall must be visible without reading a paragraph.

Signals:

- Color shift.
- Audio shift.
- Enemy threat icon.
- Short guide warning.
- Safe-exit marker if risk rises.

Player-facing copy examples:

- `Nightfall rises. Monsters hit harder.`
- `Life-skill work slows at Nightfall.`
- `Return to Moon Gate if under-geared.`

## Guide hint panel

The guide panel should never dominate the game.

Rules:

- One sentence at a time.
- Max two follow-up choices.
- Player can dismiss.
- Guide can explain the current zone, next action, Nightfall, and live-world events.
- Guide cannot execute arbitrary commands.

Example:

```text
Sup Guide: Low Road wakes at Nightfall. Test your weapon now, or return to Moon Gate.
```

## Inventory and durability

Inventory must prove friction without feeling like punishment.

Required:

- Bag slots used.
- Item stack count.
- Tool or weapon durability.
- Repair warning.
- Treasury/storage hint.

Labels:

- `Bag`
- `Treasury`
- `Durability`
- `Repair`
- `Storage Runner`

Avoid:

- Store upsell language in the first playable.
- Real-money labels.
- Paid item prompts before the base loop is fun.

## Market Runner and Storage Runner cues

These systems must read as world logistics, not fast travel.

Storage Runner:

- Sends one item or small bundle to storage.
- Shows one-transaction limit.
- Shows cooldown or cost if active.

Market Runner:

- Buys, lists, or retrieves one market item.
- Shows one-transaction limit.
- Shows fee/cooldown if active.

Copy examples:

- `Storage Runner can carry one bundle.`
- `Market Runner can handle one market request.`

## PvP warning cues

PvP is not required for the first playable, but future HUD language should be simple.

States:

- `Safe`
- `Pink Flag`
- `Red Name`
- `War`

Red Name copy:

- `Red Name: guards will attack on sight.`
- `Red Name: dropped items can be looted.`

Structured war copy:

- `War zone: gear risk is active.`

## First playable pass criteria

- Player can identify health and stamina instantly.
- Player can see which skill is on cooldown.
- Player can gather without asking what to press.
- Player can tell when Nightfall changes risk.
- Player can find a safe exit when danger rises.
- Player understands inventory pressure and durability.
- Player understands Storage Runner and Market Runner as limited convenience.
- Nothing on the HUD sounds like developer tooling or paid combat power.
