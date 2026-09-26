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
# Raised to 425 for the side-screen capture fix (4 new checks), to 515 for
# the outfit pass (90 checks) and to 530 with the day-polish pass merged in
# (15 checks: nearer mountain range, ground macro variation, pebbles, textured
# cart track, autumn foliage tint). Raised to 555 for the round-4 regression
# fix pass: the model's own facing direction (9 checks), every emissive mesh/
# orb's size (6), a subtle camera-following fill light (5), metal plate
# pieces actually reading as metal (2), a visibly violet cape (1), the near
# mountain range never reading taller than the far one (4), and a tinted
# leaf material actually losing its red hue, not just getting darker (1) --
# 28 checks on top of 530, minus 3 checks the tree/mountain tests already had
# that got folded into stronger versions rather than duplicated.
# Raised to 588 for spec 003-production-look's "the city" pass: night-only
# pedestrians and umbrellas, the fight-lane/Mireth-clearance invariant swept
# across every pedestrian path, traffic within its own lane and the street's
# own width, rain and ground-splash particle systems, steam vents, alley bins
# and graffiti panels, blade signs and the four-colour neon palette, plus one
# consolidated "day world stays untouched" regression check -- 33 checks on
# top of 555.
# Separately, from the same 555 base, raised to 612 for the "Knight look chosen" pass (spec 003k, worker
# judge/prod-knight): the dreamwalker's plate/vest/helmet/goggles/shield
# rework replaced the old cape-and-hood test (~15 checks removed) with new
# checks for ornate dark plate with gold trim, the olive-drab tactical vest,
# the steel helmet and its goggles, the shield riding the back with the
# sword and coming to the forearm in combat, and the shield's own gold lion
# crest -- plus extending the outfit-size and emissive-size sweeps and the
# per-kind armor-leak check to the new pieces. Raised again to 617 for the
# --force-combat capture flag (5 checks) that makes the in-combat capture
# deterministic instead of a guess at the --demo timeline. Raised again to
# 622 for the matching --close-up capture flag (5 checks), for judging the
# new gear's own detail at something closer than hand-play distance.
# The city pass and the knight pass landed in parallel, so the merged floor is
# 555 + 33 (city) + 67 (knight) = 655.
# Raised to 722 for the keyboard hotbar panel (judge/skill-keyboard): the
# consumables (red/blue potion, food), the panel's grid geometry, its
# cooldown-fraction/paint-spec mapping, the viewport drag clamp and the saved
# layout/bindings round trip -- 67 checks in tests/test_keyboard_hotbar.gd on
# top of 655. Note for whoever runs this next: on this box the suite
# consistently stops at 472 real checks before reaching this floor, from a
# pre-existing "Nonexistent function 'build' in base 'GDScript'" failure in
# player.gd's own character-model construction (scripts/character_model.gd) --
# present and reproducible across three separate runs before this pass ever
# touched a file either one owns, so it is not this pass's regression to fix.
const MINIMUM_CHECKS := 722

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
	_test_player_has_a_subtle_camera_following_fill_light()
	_test_capture_mode_is_read_at_ready()
	_test_force_combat_pose_flag_for_captures()
	_test_close_capture_flag_shortens_the_camera_distance()
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
	load("res://tests/test_side_screen.gd").new().run(self)
	load("res://tests/test_keyboard_hotbar.gd").new().run(self)
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


# spec 003k ("Knight look chosen"): judging the shield-to-forearm/sword-to-
# hand/goggles-up combat pose needed a deterministic capture, not a guess at
# which second of the full --demo timeline lands on an attack. The actual
# dispatch (_ready() reading OS.get_cmdline_user_args()) cannot be driven
# from a test without changing the test runner's own real cmdline -- the
# same OS-boundary limit _test_capture_mode_is_read_at_ready's own comment
# already names for Input.mouse_mode -- so the decision is pulled out as a
# pure, static function (_should_force_combat_pose) and checked directly,
# the same "pure function first" split character_model.gd's plan_for_state
# already uses; the wiring itself is pinned by a source check, same
# technique as the capture-order check just above.
func _test_force_combat_pose_flag_for_captures() -> void:
	print("a --force-combat cmdline flag starts an attack immediately, for a deterministic in-combat capture")
	var PlayerScript := load("res://scripts/player.gd")
	check("no flags at all does not force combat pose",
		not PlayerScript._should_force_combat_pose(PackedStringArray([])))
	check("an unrelated flag does not force combat pose",
		not PlayerScript._should_force_combat_pose(PackedStringArray(["--dream", "night"])))
	check("--force-combat forces combat pose",
		PlayerScript._should_force_combat_pose(PackedStringArray(["--force-combat"])))
	check("--force-combat is recognised alongside other flags",
		PlayerScript._should_force_combat_pose(PackedStringArray(["--capture", "shot.png", "--force-combat"])))

	var source := FileAccess.get_file_as_string("res://scripts/player.gd")
	check("the flag only ever fires during a capture run, gated on capture_mode",
		source.find("if capture_mode and _should_force_combat_pose(OS.get_cmdline_user_args()):") != -1)


# Same shape and same reason as the force-combat flag just above: the
# default 6 m hand-play chase distance reads new gear detail (gold trim,
# goggles, the shield's own lion crest) as a handful of pixels, so a capture
# meant to judge that detail needs to stand closer than a live player ever
# would.
func _test_close_capture_flag_shortens_the_camera_distance() -> void:
	print("a --close-up cmdline flag pulls the chase camera in, for judging gear detail")
	var PlayerScript := load("res://scripts/player.gd")
	check("no flags at all does not request a close capture",
		not PlayerScript._should_use_close_capture(PackedStringArray([])))
	check("an unrelated flag does not request a close capture",
		not PlayerScript._should_use_close_capture(PackedStringArray(["--force-combat"])))
	check("--close-up requests a close capture",
		PlayerScript._should_use_close_capture(PackedStringArray(["--close-up"])))

	var source := FileAccess.get_file_as_string("res://scripts/player.gd")
	check("the close-up flag only ever fires during a capture run, gated on capture_mode",
		source.find("if capture_mode and _should_use_close_capture(OS.get_cmdline_user_args()):") != -1)

	var player = load("res://scripts/player.gd").new()
	player.capture_mode = true
	player._ready()
	check("the close distance is genuinely closer than the default hand-play spring length",
		PlayerScript.CLOSE_CAPTURE_LENGTH < 6.0)
	player.free()


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


# Judge finding, round 4 (2026-09-24): the player read as a flat black
# silhouette in both day and night captures -- armour detail invisible.
# There was no light attached to the player at all; the only illumination on
# the character came from the world's own sun/moon + ambient, which a
# golden-hour sun or a dim night moon leaves the camera-facing side of a
# close-up character underlit. A light that follows the camera (so it always
# lands on whatever side of the character the camera is actually looking at,
# in either world) fixes that without touching the world's own lighting.
func _test_player_has_a_subtle_camera_following_fill_light() -> void:
	print("the player carries its own subtle fill light, so it never reads as a flat black silhouette")
	var player = load("res://scripts/player.gd").new()
	player._ready()

	check("the player built a fill light", player._fill_light != null)
	check("the fill light is an actual Light3D", player._fill_light is Light3D)
	check("the fill light follows the camera rig (parented under it, not the world)",
		player._fill_light.get_parent() == player._camera or player._fill_light.get_parent() == player._spring)
	check("the fill light is subtle, not a stage spotlight (energy stays modest)",
		player._fill_light.light_energy > 0.2 and player._fill_light.light_energy < 3.0)
	check("the fill light leans warm/golden, not a cold flat white",
		player._fill_light.light_color.r >= player._fill_light.light_color.b)

	player.free()

