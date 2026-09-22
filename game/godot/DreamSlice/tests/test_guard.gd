extends RefCounted

# Checks for the guard stance, Q alone. Added 2026-09-22: the input table in
# docs/gdd/02-action-combat.md has named Q "Guard / parry stance" since the
# document was written, and nothing behind it ever did anything; it fell
# through to the unnamed-skill stub like every other unbuilt combo.

var runner


func run(r) -> void:
	runner = r
	_test_guard_windows()
	_test_guard_cooldown()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_guard_windows() -> void:
	print("guard windows")
	var GuardState := load("res://scripts/guard_state.gd")
	var g = GuardState.new()

	check("a fresh guard is idle", not g.is_guarding())
	check("an idle guard blocks nothing", not g.is_active())
	check("a fresh guard can start with enough stamina", g.can_start(100.0))
	check("a fresh guard cannot start on no stamina", not g.can_start(0.0))

	g.start()
	check("a started guard is running", g.is_guarding())
	check("the startup does not block yet", not g.is_active())

	g.advance(GuardState.STARTUP + 0.01)
	check("the active window blocks", g.is_active())

	g.advance(GuardState.ACTIVE)
	check("after the active window nothing blocks", not g.is_active())
	check("the stance is still in recovery", g.is_guarding())

	g.advance(GuardState.RECOVERY)
	check("the stance ends after its full length", not g.is_guarding())


func _test_guard_cooldown() -> void:
	print("guard cooldown")
	var GuardState := load("res://scripts/guard_state.gd")
	var g = GuardState.new()

	g.start()
	g.advance(GuardState.STARTUP + GuardState.ACTIVE + GuardState.RECOVERY + 0.01)
	check("the stance has ended", not g.is_guarding())
	check("a fresh guard cannot start during the cooldown", not g.can_start(100.0))

	g.advance(GuardState.COOLDOWN)
	check("a fresh guard can start once the cooldown clears", g.can_start(100.0))
