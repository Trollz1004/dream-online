extends SceneTree

# Headless test runner for the DREAM combat slice.
#   godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd
# Exits 0 when every check passes and 1 when any check fails.

var passed := 0
var failed := 0

func check(label: String, condition: bool) -> void:
	if condition:
		passed += 1
		print("  [pass] ", label)
	else:
		failed += 1
		print("  [FAIL] ", label)


func _init() -> void:
	print("DREAM combat slice tests")
	_test_dash_windows()
	_test_dash_gating()
	_test_combo_grammar()
	print("passed: %d  failed: %d" % [passed, failed])
	quit(1 if failed > 0 else 0)


# Joshua's ruling of 2026-09-20: the dash carries invulnerability frames through
# its travel, is vulnerable on startup, and is wide open through recovery.
func _test_dash_windows() -> void:
	print("dash frame windows")
	var DashState := load("res://scripts/dash_state.gd")
	var d = DashState.new()

	check("a fresh dash is not running", not d.is_dashing())
	check("a fresh dash is not invulnerable", not d.is_invulnerable())

	d.start()
	check("a started dash is running", d.is_dashing())
	check("the first frames are vulnerable", not d.is_invulnerable())

	d.advance(DashState.STARTUP + 0.01)
	check("the travel is invulnerable", d.is_invulnerable())
	check("the phase during travel is named invulnerable", d.phase() == "invulnerable")

	d.advance(DashState.INVULNERABLE)
	check("the recovery is vulnerable again", not d.is_invulnerable())
	check("the phase during recovery is named recovery", d.phase() == "recovery")
	check("the dash is still running during recovery", d.is_dashing())

	d.advance(DashState.RECOVERY)
	check("the dash ends after its full length", not d.is_dashing())
	check("the phase after the dash is ready or cooling", d.phase() != "invulnerable")


func _test_dash_gating() -> void:
	print("dash gating")
	var DashState := load("res://scripts/dash_state.gd")
	var d = DashState.new()

	check("a dash needs stamina", not d.can_start(DashState.STAMINA_COST - 1.0))
	check("a dash starts with enough stamina", d.can_start(DashState.STAMINA_COST))

	d.start()
	check("a second dash cannot start while one is running", not d.can_start(999.0))

	d.advance(DashState.STARTUP + DashState.INVULNERABLE + DashState.RECOVERY)
	check("a second dash cannot start while cooling down", not d.can_start(999.0))

	d.advance(DashState.COOLDOWN)
	check("a dash can start again once cooled down", d.can_start(999.0))


# Joshua's ruling of 2026-09-20: a direction with Shift is movement. A skill is a
# direction, an optional Shift, and one action key. Every distinct set is its own
# skill, and the Shift is part of the set.
func _test_combo_grammar() -> void:
	print("combo grammar")
	var Combo := load("res://scripts/combo.gd")

	check("W with Shift and no action key is movement",
		Combo.resolve("W", true, "") == Combo.MOVEMENT)
	check("W alone is movement",
		Combo.resolve("W", false, "") == Combo.MOVEMENT)
	check("no keys at all is movement",
		Combo.resolve("", false, "") == Combo.MOVEMENT)

	check("W with F is a skill", Combo.resolve("W", false, "F") == "W+F")
	check("W with Shift and F is a different skill", Combo.resolve("W", true, "F") == "W+SHIFT+F")
	check("the Shift is part of the set",
		Combo.resolve("W", false, "F") != Combo.resolve("W", true, "F"))
	check("S with F is a different skill again", Combo.resolve("S", false, "F") == "S+F")
	check("an action key with no direction is still a skill",
		Combo.resolve("", false, "Q") == "Q")

	check("every action key Joshua named is accepted",
		Combo.ACTION_KEYS.has("Q") and Combo.ACTION_KEYS.has("E") and Combo.ACTION_KEYS.has("R")
		and Combo.ACTION_KEYS.has("F") and Combo.ACTION_KEYS.has("Z") and Combo.ACTION_KEYS.has("C")
		and Combo.ACTION_KEYS.has("LMB") and Combo.ACTION_KEYS.has("RMB"))
	check("a key that is not an action key does not make a skill",
		Combo.resolve("W", true, "X") == Combo.MOVEMENT)
