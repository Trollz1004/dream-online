# Wiring Dream Lunge, Nightveil Burst and the vfx.gd effects into player.gd

Spec 002 (`specs/002-crowdfunding-demo/spec.md`), "Skills added". This lane built
`scripts/lunge_state.gd`, `scripts/burst_state.gd` and `scripts/vfx.gd` as
standalone pieces (the same shape as `attack_state.gd` / `heavy_attack_state.gd`)
and did not touch `player.gd`, `world.gd`, `hud.gd`, `npc.gd` or `dummy.gd` --
another lane wires those. This is the note for that lane.

## 1. Give the player the two new states

In `player.gd`, alongside the existing state instances:

```gdscript
const LungeState := preload("res://scripts/lunge_state.gd")
const BurstState := preload("res://scripts/burst_state.gd")
const Vfx := preload("res://scripts/vfx.gd")

var lunge := LungeState.new()
var burst := BurstState.new()
```

Advance both every physics frame, next to the others already there:

```gdscript
func _physics_process(delta: float) -> void:
	dash.advance(delta)
	attack.advance(delta)
	heavy.advance(delta)
	guard.advance(delta)
	lunge.advance(delta)
	burst.advance(delta)
	...
```

## 2. Combo strings -> state

The combo grammar (`scripts/combo.gd`, `docs/gdd/02-action-combat.md`) resolves
a key set to a string. These two skills use:

| Combo string | Key set | State |
|---|---|---|
| `"W+F"` | W held, F pressed, no Shift | `lunge` |
| `"R"` | R pressed, no direction, no Shift | `burst` |

Both fall inside `_try_skill(action_key: String)`. The existing chain already
computes `skill := Combo.resolve(direction_name, shift, action_key)` before
branching on `action_key`; add two branches alongside the `LMB`/`RMB`/`"Q"` ones
already there, keeping the same "say why it didn't fire" pattern:

```gdscript
elif skill == "W+F":
	if lunge.can_start(stamina):
		lunge.start()
		stamina -= LungeState.STAMINA_COST
		_lunge_dir = _camera_relative(Vector3.FORWARD)
		Vfx.lunge_streak(get_parent(), global_position,
			global_position + _lunge_dir * LungeState.TRAVEL_DISTANCE, Vfx.DREAMWALKER_VIOLET)
		_say("Dream Lunge")
	else:
		_say("Lunge not ready")
elif skill == "R":
	if burst.can_start(stamina):
		burst.start()
		stamina -= BurstState.STAMINA_COST
		_say("Nightveil Burst")
	else:
		_say("Burst not ready")
```

`_lunge_dir` is a new `var _lunge_dir := Vector3.ZERO` alongside `_dash_dir`:
the lunge needs a fixed travel direction decided once at the press, the same
reason the dash keeps `_dash_dir`. `W+F` always means forward relative to the
camera (there is no side or back variant of this skill per the spec), so
`_camera_relative(Vector3.FORWARD)` is enough -- no need to read the held
movement keys the way the dash does.

## 3. Moving the player during the lunge's travel

In `_physics_process`, alongside the existing `if dash.is_dashing(): ... else:`
block that drives `velocity.x`/`velocity.z`, add a lunge branch with the same
shape as the dash's (vulnerable startup, moving travel, open recovery -- see
`lunge_state.gd`'s doc comment):

```gdscript
if lunge.is_lunging():
	if lunge.phase() == "travel":
		velocity.x = _lunge_dir.x * lunge.travel_speed()
		velocity.z = _lunge_dir.z * lunge.travel_speed()
	else:
		velocity.x = move_toward(velocity.x, 0.0, 40.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 40.0 * delta)
elif dash.is_dashing():
	...
```

Nightveil Burst never moves the player -- it is a stationary shockwave --
so it needs no velocity branch, only the hit resolution below.

## 4. Resolving the hit and spawning damage numbers

Follow `_resolve_swing()` / `_resolve_heavy_swing()`'s exact shape: guard on
`target != null`, call `take_hit_window()` once, check reach/arc (lunge) or
radius (burst), call `target.take_hit(damage)`, then say what happened.

```gdscript
func _resolve_lunge_hit() -> void:
	if target == null or not lunge.take_hit_window():
		return
	var facing := Movement.camera_relative(Vector3(0.0, 0.0, -1.0), _yaw)
	var to_target := target.global_position - global_position
	to_target.y = 0.0
	if to_target.length() > LungeState.REACH:
		_say("Dream Lunge missed")
		return
	if absf(facing.signed_angle_to(to_target.normalized(), Vector3.UP)) > LungeState.HALF_ARC:
		_say("Dream Lunge missed")
		return
	target.take_hit(LungeState.DAMAGE)
	_say("Dream Lunge hit for %d" % int(LungeState.DAMAGE))
	Vfx.impact(get_parent(), target.global_position + Vector3(0.0, 1.2, 0.0), Vfx.DREAMWALKER_VIOLET)
	Vfx.damage_number(get_parent(), target.global_position + Vector3(0.0, 1.9, 0.0),
		LungeState.DAMAGE, Vfx.DREAMWALKER_VIOLET)


func _resolve_burst_hit() -> void:
	if target == null or not burst.take_hit_window():
		return
	if not BurstState.hits(global_position, target.global_position):
		return
	target.take_hit(BurstState.DAMAGE)
	_say("Nightveil Burst hit for %d" % int(BurstState.DAMAGE))
	Vfx.ring(get_parent(), global_position, BurstState.RADIUS, Vfx.DREAMWALKER_VIOLET)
	Vfx.damage_number(get_parent(), target.global_position + Vector3(0.0, 1.9, 0.0),
		BurstState.DAMAGE, Vfx.DREAMWALKER_VIOLET)
```

Call both from `_physics_process` next to the existing
`_resolve_swing()` / `_resolve_heavy_swing()` calls. `get_parent()` is `world`
(see `world.gd`'s `_ready()`, which parents `player` and `dummy` directly under
itself) -- effects should be siblings of the player, not children of it, or
they would inherit the player's own rotation and movement.

## 5. Where each vfx.gd call belongs

| Moment | Call | Notes |
|---|---|---|
| Swing 1-3 connects | `Vfx.slash_arc(get_parent(), global_position, _yaw, -HALF_ARC, HALF_ARC, AttackState.REACH * 0.7, Vfx.DREAMWALKER_VIOLET, 1.1)` | Alternate `arc_from`/`arc_to` sign by `attack.step()` (1 and 3 sweep one way, 2 the other) for a visible alternating chain, the way real combo chains read. |
| Heavy swing connects | `Vfx.slash_arc(get_parent(), global_position, _yaw, -1.3, 1.3, HeavyAttackState.REACH * 0.8, Vfx.DREAMWALKER_VIOLET, 1.3, true)` | `vertical = true` for the overhead cleave; bigger radius than the light swings, per the spec. |
| Dream Lunge fires | `Vfx.lunge_streak(...)` at start (step 2 above), `Vfx.impact(...)` + `Vfx.damage_number(...)` on hit (step 4). | |
| Nightveil Burst fires | `Vfx.ring(...)` at the moment `take_hit_window()` first opens (not at `start()` -- the ring should appear when the shockwave actually goes off, after the 0.3s wind-up, not the instant R is pressed). | |
| A perfect dodge | `Vfx.perfect_dodge(get_parent(), global_position)`, called from inside `try_hit()`'s existing `if dash.is_invulnerable():` branch, alongside `_record_perfect_dodge()`. | This is the highest-value call to add: the spec's demo video opens on exactly this moment. |
| Any hit that lands (light, heavy, lunge, burst) | `Vfx.damage_number(get_parent(), target.global_position + Vector3(0, 1.9, 0), damage, Vfx.DREAMWALKER_VIOLET)` | Gold (`Vfx.PERFECT_GOLD`) for a perfect-dodge counter-hit or anything already flagged as a "solid" hit if that distinction is added later; violet otherwise. |
| The dummy's / Hollow Sentinel's beam | `Vfx.beam_telegraph(get_parent(), beam_origin, beam_origin + aim * BEAM_LENGTH, progress)` every frame during `_wind_up()`, where `progress` is the same `(t_t - telegraph_start) / TELEGRAPH` fraction `_wind_up()` already computes; `Vfx.beam_fire(get_parent(), ..., sentinel_colour)` once when `_fire()` is first entered. | Not wired here since it lives in `dummy.gd`, out of scope for this pass (see the note below). `sentinel_colour` should be amber by day, violet by night, per `docs/gdd/08-day-dreams-night-dreams-world.md` -- pass it in from whatever tracks day/night state; never hard-code it in `dummy.gd` itself. |

## 6. HUD readout

`hud.gd`'s `show_state()` already has a `match phase():` block per state
(`_dash`, `_swing`, `_heavy`, `_guard`). Adding `lunge` and `burst` the same
way is a `hud.gd` change, out of scope here, but the phases to match on are
exactly `lunge_state.gd` / `burst_state.gd`'s `phase()` strings: `"ready"`,
`"cooling"`, `"startup"`, `"travel"` (lunge) or `"windup"` / `"burst"` (burst),
`"recovery"`.

## A note on `beam_telegraph` / `beam_fire`

These two exist for the Hollow Sentinel the spec calls for, which replaces
`dummy.gd` in the full crowdfunding-demo build. This pass did not touch
`dummy.gd` (out of scope) or build the Sentinel actor, so nothing calls
`beam_telegraph`/`beam_fire` yet outside of `tests/test_skills_new.gd`'s smoke
checks and `tools/preview_vfx.gd`'s gallery. Whichever lane builds the
Sentinel should call `beam_telegraph` every frame of its wind-up (not once) so
the line visibly thickens, and `beam_fire` once, the moment the beam actually
fires -- mirroring `dummy.gd`'s own `_wind_up()` / `_fire()` split.

## A note on the `_process()` gotcha that ate most of this pass

Every `vfx.gd` effect frees itself through a tiny script attached at spawn
time (see `vfx.gd`'s `_timed_root`), not `get_tree().create_timer()` or
`create_tween()`, because both of those raise on a node that is not yet
inside the SceneTree -- and a skill can land, and ask for its effect, before
the frame the caller spawned it from has finished settling. That part is
fine and is exactly what makes every `Vfx.*` call safe to make from anywhere,
including before `add_child()`.

The gotcha is this: never call that driver script's `_process()` by hand
(`effect_node.call("_process", delta)`) to fast-forward or preview an effect.
It looks like it works -- the node keeps its mesh, its material, its
transform, `get_child_count()` still reports the right number of children --
but the RenderingServer silently stops drawing it. Nothing in Godot's own
error output says so. This is why `tools/preview_vfx.gd` spawns its gallery
once and then just lets a handful of real engine frames pass before it
captures, instead of nudging each effect to a chosen point by hand. If a
future tool wants a deterministic "effect at exactly t=0.3" snapshot, drive it
by waiting real frames (`SceneTree._process`) rather than invoking the driver
script's `_process` directly.
