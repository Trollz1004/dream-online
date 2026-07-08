# First Playable Audio Spec

Status: draft

Purpose: define the minimum audio language needed for the First Gate playable test.
Audio should make the world readable before the player has to parse UI.

## Sonic pillars

- Alive.
- Dangerous.
- Warm.
- Strange.

## Mix priorities

1. Player damage and danger.
2. Hit confirm.
3. Low stamina and cooldown pressure.
4. Guide warnings.
5. Gathering success and rare find cues.
6. Nightfall state change.
7. Ambient world detail.

## Player movement

Required cues:

- Footsteps by surface.
- Sprint exertion.
- Dodge or evade impulse.
- Landing weight.

First Gate surfaces:

- old road dirt
- ruin stone
- grass edge
- shallow bank

## Combat

Hit-confirm must be impossible to miss.

Required cues:

- swing
- hit
- blocked hit
- dodge
- stagger
- enemy warning tell
- low stamina
- skill cooldown unavailable

Nightfall enemy cues:

- deeper attack layer
- sharper impact
- subtle threat sting when danger rises

## Gathering and durability

Gathering should feel useful, not silent.

Required cues:

- tool start
- successful gather
- failed gather
- rare material hint
- tool wear warning
- durability low warning

Node-specific tone:

- ore: metal and stone
- herb: soft pull and chime
- timber: wood crack and weight
- fish: water tension and reel cue

## Guide voice and hints

The guide should be brief and readable.

Rules:

- One sentence at a time.
- No vendor or developer wording.
- Warnings interrupt only when danger rises.
- Voice or text can be used first; full voice acting is not required for first playable.

Example guide cue:

```text
Low Road wakes at Nightfall. Return to Moon Gate if your gear is weak.
```

## Nightfall transition

Nightfall should be felt before it is explained.

Audio layers:

- wind lowers
- distant threats rise
- safe camp warmth narrows
- combat percussion enters quietly
- guide warning triggers once

Player-facing state:

- Day: productive, warm, open.
- Nightfall: dangerous, sharp, compressed.

## Live-world events

Gate Flicker:

- low pulse
- stone resonance
- brief bright shimmer

Resource Bloom:

- natural swell
- material sparkle
- gather route cue

Wilderness-to-city founder test:

- distant city murmur
- warm lantern bed
- transition whoosh
- no promise of full-world replacement until proved

World recovery:

- recovery pulse
- sky movement cue
- brief protective tone

## Audio performance assumptions

First playable can use native engine audio or lightweight local placeholders.

Budgets:

- keep simultaneous world cues limited
- prioritize player feedback over ambience
- avoid looping clutter
- make low-stamina and danger cues duck less important sounds

## Pass criteria

- Tester can tell a hit landed without reading UI.
- Tester can tell Nightfall changed danger.
- Tester can tell a gather succeeded.
- Tester can hear low durability or low stamina before failure.
- Guide warning is useful but not annoying.
- Event audio makes the world feel alive without confusing the route.
