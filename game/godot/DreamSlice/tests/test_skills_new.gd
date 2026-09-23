extends RefCounted

# Checks for the two skills spec 002 (specs/002-crowdfunding-demo/spec.md)
# adds -- Dream Lunge on W+F and Nightveil Burst on R -- and for the vfx.gd
# effect helpers that dress them. Same pattern as test_heavy_attack.gd and
# test_guard.gd: this class is loaded and run from tests/run_tests.gd, which
# owns the pass/fail count.

var runner


func run(r) -> void:
	runner = r
	_test_lunge_windows()
	_test_lunge_gating()
	_test_burst_windows()
	_test_burst_radius()
	_test_burst_cooldown()
	_test_vfx_smoke()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_lunge_windows() -> void:
	print("lunge windows")
	var LungeState := load("res://scripts/lunge_state.gd")
	var l = LungeState.new()

	check("a fresh lunge is idle", not l.is_lunging())
	check("an idle lunge lands nothing", not l.is_active())
	check("a fresh lunge can start with enough stamina", l.can_start(100.0))
	check("a fresh lunge cannot start on no stamina", not l.can_start(0.0))

	l.start()
	check("a started lunge is running", l.is_lunging())
	check("the startup lands nothing", not l.is_active())
	check("the phase during startup is named startup", l.phase() == "startup")

	l.advance(LungeState.STARTUP + 0.01)
	check("the travel window can land a hit", l.is_active())
	check("the phase during travel is named travel", l.phase() == "travel")
	check("a hit is only counted once per lunge", l.take_hit_window())
	check("the same lunge cannot hit twice", not l.take_hit_window())

	l.advance(LungeState.TRAVEL)
	check("after the travel window nothing lands", not l.is_active())
	check("the lunge is still in recovery", l.is_lunging())
	check("the phase during recovery is named recovery", l.phase() == "recovery")

	l.advance(LungeState.RECOVERY)
	check("the lunge ends after its full length", not l.is_lunging())

	check("the travel speed matches 6 metres in 0.25 seconds",
		absf(l.travel_speed() - (LungeState.TRAVEL_DISTANCE / LungeState.TRAVEL)) < 0.0001)
	check("that travel speed is 24 metres per second", absf(l.travel_speed() - 24.0) < 0.001)


func _test_lunge_gating() -> void:
	print("lunge cost and cooldown")
	var LungeState := load("res://scripts/lunge_state.gd")
	var l = LungeState.new()

	check("a lunge costs 20 stamina", LungeState.STAMINA_COST == 20.0)
	check("a lunge needs that much stamina", not l.can_start(LungeState.STAMINA_COST - 1.0))
	check("a lunge starts with enough stamina", l.can_start(LungeState.STAMINA_COST))

	l.start()
	check("a second lunge cannot start while one is running", not l.can_start(999.0))

	l.advance(LungeState.STARTUP + LungeState.TRAVEL + LungeState.RECOVERY)
	check("a second lunge cannot start while cooling down", not l.can_start(999.0))
	check("the phase names the cooldown", l.phase() == "cooling")
	check("the cooldown is reported", l.cooldown_left() > 0.0)

	l.advance(LungeState.COOLDOWN)
	check("a lunge can start again once cooled down", l.can_start(999.0))
	check("the phase is ready again", l.phase() == "ready")
	check("the cooldown is four seconds", LungeState.COOLDOWN == 4.0)


func _test_burst_windows() -> void:
	print("burst windows")
	var BurstState := load("res://scripts/burst_state.gd")
	var b = BurstState.new()

	check("a fresh burst is idle", not b.is_bursting())
	check("an idle burst lands nothing", not b.is_active())
	check("a fresh burst can start with enough stamina", b.can_start(100.0))
	check("a fresh burst cannot start on no stamina", not b.can_start(0.0))

	b.start()
	check("a started burst is running", b.is_bursting())
	check("the wind-up lands nothing", not b.is_active())
	check("the phase during wind-up is named windup", b.phase() == "windup")

	b.advance(BurstState.STARTUP + 0.01)
	check("the burst window can land a hit", b.is_active())
	check("the phase during the burst is named burst", b.phase() == "burst")
	check("a hit is only counted once per burst", b.take_hit_window())
	check("the same burst cannot hit twice", not b.take_hit_window())

	b.advance(BurstState.ACTIVE)
	check("after the burst window nothing lands", not b.is_active())
	check("the burst is still in recovery", b.is_bursting())

	b.advance(BurstState.RECOVERY)
	check("the burst ends after its full length", not b.is_bursting())


func _test_burst_radius() -> void:
	print("burst radius")
	var BurstState := load("res://scripts/burst_state.gd")

	check("a target at the centre is hit",
		BurstState.hits(Vector3(0.0, 0.0, 0.0), Vector3(0.0, 0.0, 0.0)))
	check("a target well inside the radius is hit",
		BurstState.hits(Vector3(2.0, 0.0, 2.0), Vector3(3.0, 0.0, 2.0)))
	check("a target at exactly the radius is hit",
		BurstState.hits(Vector3.ZERO, Vector3(BurstState.RADIUS, 0.0, 0.0)))
	check("a target past the radius is not hit",
		not BurstState.hits(Vector3.ZERO, Vector3(BurstState.RADIUS + 0.1, 0.0, 0.0)))
	check("height is ignored, since the shockwave is flat",
		BurstState.hits(Vector3(0.0, 0.0, 0.0), Vector3(1.0, 50.0, 1.0)))
	check("the burst radius is four metres", BurstState.RADIUS == 4.0)


func _test_burst_cooldown() -> void:
	print("burst cooldown")
	var BurstState := load("res://scripts/burst_state.gd")
	var b = BurstState.new()

	check("a burst costs 25 stamina", BurstState.STAMINA_COST == 25.0)
	b.start()
	b.advance(BurstState.STARTUP + BurstState.ACTIVE + BurstState.RECOVERY + 0.01)
	check("the burst has ended", not b.is_bursting())
	check("a fresh burst cannot start during the cooldown", not b.can_start(100.0))
	check("the phase names the cooldown", b.phase() == "cooling")

	b.advance(BurstState.COOLDOWN)
	check("a burst can start again once cooled down", b.can_start(100.0))
	check("the phase is ready again", b.phase() == "ready")
	check("the cooldown is eight seconds", BurstState.COOLDOWN == 8.0)


# vfx.gd's contract is that every helper works with a parent that is not
# inside the SceneTree, because a skill can land and ask for its effect
# before the world node the caller passes in has finished settling into the
# tree. `stage` here is built and never added anywhere, on purpose.
func _test_vfx_smoke() -> void:
	print("vfx smoke checks")
	var Vfx := load("res://scripts/vfx.gd")
	var violet := Color(0.62, 0.42, 1.0)
	var gold := Color(1.0, 0.85, 0.35)

	var stage := Node3D.new()

	var arc = Vfx.slash_arc(stage, Vector3.ZERO, 0.0, -0.9, 0.9, 3.4, violet, 1.0)
	check("slash_arc returns a Node3D", arc is Node3D)
	check("slash_arc's effect has children", arc.get_child_count() > 0)
	check("slash_arc is parented under the stage it was given", arc.get_parent() == stage)

	var heavy_arc = Vfx.slash_arc(stage, Vector3.ZERO, 0.0, -1.4, 1.4, 4.2, violet, 1.4, true)
	check("the tilted heavy slash_arc also returns a populated Node3D",
		heavy_arc is Node3D and heavy_arc.get_child_count() > 0)

	var hit = Vfx.impact(stage, Vector3(1.0, 1.0, 1.0), gold)
	check("impact returns a Node3D", hit is Node3D)
	check("impact's effect has children", hit.get_child_count() > 0)

	var wave = Vfx.ring(stage, Vector3.ZERO, 4.0, violet)
	check("ring returns a Node3D", wave is Node3D)
	check("ring's effect has children", wave.get_child_count() > 0)

	var streak = Vfx.lunge_streak(stage, Vector3.ZERO, Vector3(0.0, 0.0, -6.0), violet)
	check("lunge_streak returns a Node3D", streak is Node3D)
	check("lunge_streak has a streak mesh and three afterimage ghosts",
		streak.get_child_count() >= 4)

	var dodge = Vfx.perfect_dodge(stage, Vector3.ZERO)
	check("perfect_dodge returns a Node3D", dodge is Node3D)
	check("perfect_dodge's effect has children", dodge.get_child_count() > 0)

	var number = Vfx.damage_number(stage, Vector3(0.0, 1.6, 0.0), 18.0, gold)
	check("damage_number returns a Node3D", number is Node3D)
	check("damage_number holds a Label3D", number.get_child_count() > 0)

	var telegraph = Vfx.beam_telegraph(stage, Vector3.ZERO, Vector3(0.0, 0.0, -20.0), 0.5)
	check("beam_telegraph returns a Node3D", telegraph is Node3D)
	check("beam_telegraph's effect has children", telegraph.get_child_count() > 0)

	var fire = Vfx.beam_fire(stage, Vector3.ZERO, Vector3(0.0, 0.0, -20.0), Color(1.0, 0.25, 0.15))
	check("beam_fire returns a Node3D", fire is Node3D)
	check("beam_fire's effect has children", fire.get_child_count() > 0)

	check("all nine effects landed under the stage with no error raised",
		stage.get_child_count() == 9)

	stage.free()
