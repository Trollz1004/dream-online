# Hit-Confirm Requirements

Purpose: define the minimum feedback and validation needed for every damaging hit in
the first playable. A hit must feel immediate to the attacker, readable to the target,
and consistent with server-owned combat results.

## Required Feedback Stack

Every confirmed damaging hit must produce all of the following:

| Signal | Requirement | First-playable pass condition |
|---|---|---|
| Impact pause | Brief attacker-side animation emphasis without stopping world simulation | A tester can distinguish contact from a miss at normal game speed |
| Sound | A contact sound matched to weapon and target material | Contact is audible without masking enemy tells or low-stamina warnings |
| Visual effect | A small effect at the validated contact point | The effect appears on the target, never at an unrelated location |
| Enemy reaction | Flinch, stagger, guard reaction, or damage-state response | The response matches the hit result and current enemy state |
| Stamina cost | The committed attack cost is applied once | The same input cannot spend stamina twice or avoid its cost after commitment |
| Server validation | Damage and authoritative state change occur only after a valid hit result | Rejected hits cause no damage, stagger, loot, or defeat credit |

No single signal replaces the others. Damage numbers may support readability, but they
are not the primary hit-confirm signal.

## Result States

Each attack resolves to exactly one result:

- `miss`: no valid target contact; play swing feedback only.
- `hit`: valid contact; apply damage and the standard feedback stack.
- `blocked`: valid contact against an active guard; apply guard feedback and the
  defined stamina or guard-meter effect.
- `immune`: valid contact, but the target state rejects damage or control; show a
  restrained immune response without a full damage reaction.
- `stagger`: valid hit crosses the target's stagger threshold; replace the standard
  flinch with the stronger stagger response.
- `defeat`: valid hit reduces health to zero; defeat owns the final reaction and credit.
- `rejected`: the authority rejects the proposed contact; do not apply gameplay effects.

## Timing And Presentation

- Local input feedback may begin immediately, but damage, stagger, defeat, and rewards
  wait for the authoritative result.
- Impact pause affects the attacking presentation only. It must not freeze unrelated
  players, NPCs, world events, or server simulation.
- The strongest feedback belongs to the most important result: defeat over stagger,
  stagger over ordinary hit, and block over ordinary weapon contact.
- Repeated light hits must remain readable without turning the screen into continuous
  flashes or masking enemy attack tells.
- Camera shake is optional, intensity-limited, and independently adjustable for
  accessibility.

Initial timing values remain playtest placeholders. The first implementation should
expose impact-pause duration, effect scale, reaction strength, and sound level as data
rather than hardcoding them into an attack.

## Server Validation Boundary

The server-owned combat result must validate:

- attacker and target are valid and active;
- the ability is unlocked and not on cooldown;
- stamina was available when the attack committed;
- attack sequence and timestamp are not duplicates;
- target range and hit shape are plausible for the ability;
- target state permits damage, block, stagger, or defeat;
- the same contact cannot award damage or credit more than once.

The client may predict animation, swing sound, and non-gameplay motion. It must not be
the final authority for health loss, stagger state, defeat credit, item rewards, or
durability changes.

## Stamina Commitment

- Stamina is reserved when an attack passes its commitment point.
- A miss still pays the committed stamina cost.
- A server-rejected duplicate does not charge a second time.
- A permitted pre-commit cancel pays no attack cost; any cancel cost is defined by the
  cancel rule itself.
- A post-commit cancel pays the attack cost and any explicit cancel penalty.
- At insufficient stamina, the attack does not commit and cannot produce a valid hit.

## Failure And Fallback Behavior

- If a visual effect fails, sound and target reaction still communicate the result.
- If audio is unavailable, visual effect and target reaction remain sufficient for
  playtesting.
- If a target reaction cannot play, the target state and contact effect must still be
  correct; log the missing reaction for review.
- If validation is delayed, do not show defeat, loot, or reward feedback until confirmed.
- If validation rejects a predicted contact, blend back to the authoritative state
  without presenting damage as confirmed.

## Acceptance Checklist

A first-playable attack passes only when all checks below succeed:

- [ ] A tester can tell hit, miss, block, stagger, and defeat apart at normal speed.
- [ ] Contact produces impact emphasis, sound, a contact effect, and a valid reaction.
- [ ] Enemy tells and low-stamina warnings remain readable during repeated attacks.
- [ ] Stamina is charged exactly once at the documented commitment point.
- [ ] A miss pays its committed cost and produces no target damage feedback.
- [ ] A rejected or duplicate hit causes no damage, stagger, defeat, or reward.
- [ ] Contact effects use the validated target and contact location.
- [ ] Damage, stagger, defeat credit, rewards, and durability are authority-owned.
- [ ] Accessibility settings can reduce camera shake without removing core readability.
- [ ] Feedback tuning values can be changed without rewriting attack logic.

## Out Of Scope For This Slice

- Final frame counts or audiovisual tuning values.
- Advanced combo scoring and critical-hit presentation.
- Large-group feedback prioritization.
- Competitive latency compensation tuning.
- Final weapon-specific sound and effect libraries.
