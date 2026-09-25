extends SceneTree

# Headless test runner for the DREAM combat slice.
#   godot --headless --path game/godot/DreamSlice --script res://tests/run_tests.gd
# Exits 0 when every check passes and 1 when any check fails.

# A GDScript error inside a test function aborts that function and returns here
# as though nothing had happened, so a whole suite can be skipped in silence and
# still report success. That happened on 2026-09-20. The floor below turns a
# skipped suite into a failure. Raise it when checks are added; never lower it
# to make a run pass.
# Raised to 403 when the spec 003 world pass (354) and the real-characters
# pass (376) were merged together; each added its own checks on top of 327.
# Raised to 421 for spec 003's second pass: real tree and ruin-kit models,
# a heightmap mountain, and night street furniture/tower massing checks.
# Raised to 436 for the day-polish pass: a nearer second mountain range, the
# ground shader's own macro variation, pebble scatter, the textured cart
# track, and the autumn foliage tint fix.
const MINIMUM_CHECKS := 436

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
	_test_camera_relative()
	_test_body_does_not_spin_the_camera()
	_test_capture_mode_is_read_at_ready()
	_test_e_talks_to_a_nearby_npc()
	_test_heavy_attack_on_right_mouse()
	_test_guard_on_q()
	load("res://tests/test_attack_and_events.gd").new().run(self)
	load("res://tests/test_hud.gd").new().run(self)
	load("res://tests/test_npc.gd").new().run(self)
	load("res://tests/test_heavy_attack.gd").new().run(self)
	load("res://tests/test_guard.gd").new().run(self)
	load("res://tests/test_npc_memory.gd").new().run(self)
	load("res://tests/test_dream_env.gd").new().run(self)
	load("res://tests/test_character_model.gd").new().run(self)
	load("res://tests/test_skills_new.gd").new().run(self)
	load("res://tests/test_demo_director.gd").new().run(self)
	var ran := passed + failed
	if ran < MINIMUM_CHECKS:
		failed += 1
		print("  [FAIL] %d checks ran and at least %d were expected: a suite was skipped"
			% [ran, MINIMUM_CHECKS])
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


# The camera decides which way "forward" is. Looking left and pressing W must
# move the character the way the camera faces, not the way the body happens to
# be turned.
func _test_camera_relative() -> void:
	print("camera relative movement")
	var Movement := load("res://scripts/movement.gd")

	var straight: Vector3 = Movement.camera_relative(Vector3(0.0, 0.0, -1.0), 0.0)
	check("with the camera facing ahead, W goes forward", straight.is_equal_approx(Vector3(0.0, 0.0, -1.0)))

	var looked_left: Vector3 = Movement.camera_relative(Vector3(0.0, 0.0, -1.0), PI / 2.0)
	check("after looking a quarter turn left, W follows the camera",
		looked_left.is_equal_approx(Vector3(-1.0, 0.0, 0.0)))

	var strafe: Vector3 = Movement.camera_relative(Vector3(1.0, 0.0, 0.0), PI / 2.0)
	# A quarter turn left points the camera down -X, so the camera's right hand
	# side is -Z. Worked out from the rotation, not guessed.
	check("strafing turns with the camera too", strafe.is_equal_approx(Vector3(0.0, 0.0, -1.0)))

	var still: Vector3 = Movement.camera_relative(Vector3.ZERO, 1.0)
	check("no keys held means no movement", still == Vector3.ZERO)

	check("the result is always flat on the ground",
		absf(Movement.camera_relative(Vector3(0.3, 0.9, -1.0), 0.7).y) < 0.0001)


# capture_mode and demo_yaw are read once, inside _ready, and add_child is what
# runs _ready. The world used to set them on the line after add_child, so a
# scripted capture behaved like a live session: it took the real mouse pointer
# and ignored --yaw entirely. These checks pin the contract the caller has to
# keep, which is to configure the player before adding it to the tree.
func _test_capture_mode_is_read_at_ready() -> void:
	print("capture mode is settled before _ready")
	var player = load("res://scripts/player.gd").new()
	player.capture_mode = true
	player.demo_yaw = 1.25
	player._ready()
	check("a capture run honours the yaw it was given", absf(player._yaw - 1.25) < 0.0001)
	player.free()

	# The mouse itself cannot be checked here. A headless run has no display
	# server, so Input.mouse_mode never changes whatever the code asks for, and a
	# check on it would pass just as happily with the bug present. What can be
	# checked is the order the world does things in, which is where the bug was.
	var source := FileAccess.get_file_as_string("res://scripts/world.gd")
	var added := source.find("add_child(player)")
	var mode_set := source.find("player.capture_mode =")
	var yaw_set := source.find("player.demo_yaw =")
	check("the world does configure the player and add it",
		added != -1 and mode_set != -1 and yaw_set != -1)
	check("both settings are made before the player enters the tree",
		added != -1 and mode_set != -1 and yaw_set != -1
		and mode_set < added and yaw_set < added)


# There was no one in the slice to talk to, only the training dummy, which is
# an enemy. E is the grammar's contextual action key with no direction and no
# Shift; when a friendly NPC is close enough, it answers instead of falling
# through to the unnamed-skill stub.
func _test_e_talks_to_a_nearby_npc() -> void:
	print("talking to a nearby npc")
	var player = load("res://scripts/player.gd").new()
	player._ready()
	var npc = load("res://scripts/npc.gd").new()
	npc.npc_name = "Old Wren"
	npc.dialogue_line = "The fields remember more than the fighters do."
	npc.after_dodge_line = "You danced right through it!"
	player.npc = npc

	player._try_skill("E")
	check("E talks to a npc standing close enough",
		player._last_event == "Old Wren: The fields remember more than the fighters do.")

	player.events_written = 1
	player._try_skill("E")
	check("she notices once the player has landed a perfect dodge",
		player._last_event == "Old Wren: You danced right through it!")
	player.events_written = 0

	npc.position = Vector3(50.0, 0.0, 0.0)
	player._try_skill("E")
	check("a distant npc does not answer", player._last_event == "Skill E")

	player.free()
	npc.free()


# Right mouse was named "Heavy attack / class special" in the input table
# since the document was written, and did nothing at all: it fell through to
# the unnamed-skill stub like every other unbuilt combo. The two swings are
# also mutually exclusive, so a player cannot hold both open at once.
func _test_heavy_attack_on_right_mouse() -> void:
	print("heavy attack on right mouse")
	var player = load("res://scripts/player.gd").new()
	player._ready()

	var before_stamina: float = player.stamina
	player._try_skill("RMB")
	check("a heavy swing starts on a fresh right mouse press", player.heavy.is_attacking())
	check("the heavy swing spends stamina",
		player.stamina < before_stamina and player.stamina >= 0.0)

	player._try_skill("LMB")
	check("a light swing cannot start while the heavy swing is out", not player.attack.is_attacking())

	player.free()

	var second = load("res://scripts/player.gd").new()
	second._ready()
	second._try_skill("LMB")
	check("a light swing starts on a fresh left mouse press", second.attack.is_attacking())
	second._try_skill("RMB")
	check("a heavy swing cannot start while a light swing is out", not second.heavy.is_attacking())
	second.free()


# Q has been named "Guard / parry stance" in the input table since the
# document was written, and did nothing: it fell through to the unnamed-skill
# stub like every other unbuilt combo. Guarding absorbs most of a hit rather
# than dodging it clean the way the dash does.
func _test_guard_on_q() -> void:
	print("guard on q")
	var player = load("res://scripts/player.gd").new()
	player._ready()

	var before_stamina: float = player.stamina
	player._try_skill("Q")
	check("a guard stance starts on a fresh Q press", player.guard.is_guarding())
	check("raising the guard spends stamina", player.stamina < before_stamina)

	player.guard.advance(player.guard.STARTUP + 0.01)
	check("the guard is active once it is raised", player.guard.is_active())

	var health_before: float = player.health
	player.try_hit(40.0, "Test Strike")
	var blocked_damage: float = health_before - player.health
	check("a guarded hit does not take full damage", blocked_damage < 40.0 and blocked_damage > 0.0)
	player.free()

	var second = load("res://scripts/player.gd").new()
	second._ready()
	var health_before_unguarded: float = second.health
	second.try_hit(40.0, "Test Strike")
	check("an unguarded hit takes the full damage", health_before_unguarded - second.health == 40.0)
	second.free()


# The bug Joshua caught on 2026-09-20: the camera arm hung off the character
# body, and the body turned to face movement, so the view swung around on its
# own and camera-relative movement drifted. The body must never rotate.
func _test_body_does_not_spin_the_camera() -> void:
	print("the camera does not swing with the body")
	var player = load("res://scripts/player.gd").new()
	player.capture_mode = true
	# A node built by a test runner never enters the tree, so _ready has to be
	# called by hand or none of its parts exist.
	player._ready()

	player.velocity = Vector3(4.0, 0.0, 0.0)
	player._face_movement(0.5)

	check("the character node never rotates", absf(player.rotation.y) < 0.0001)
	check("the visible body turns instead", absf(player._visual.rotation.y) > 0.01)
	# The model's front is its -Z side, so facing must be worked out from that or
	# the character walks backwards. Caught in a picture on 2026-09-20.
	var facing: Vector3 = Basis(Vector3.UP, player._visual.rotation.y) * Vector3(0.0, 0.0, -1.0)
	check("the body faces the way it is travelling", facing.is_equal_approx(Vector3(1.0, 0.0, 0.0)))

	var before: float = player._spring.rotation.y
	player._face_movement(0.5)
	check("turning to face movement leaves the camera where it was",
		absf(player._spring.rotation.y - before) < 0.0001)

	player.free()

