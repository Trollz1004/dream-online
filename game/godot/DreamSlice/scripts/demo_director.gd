extends Node

# The crowdfunding demo's own director, started by world.gd when the game
# is run with --demo (specs/002-crowdfunding-demo, integration-card.md,
# "Part 2: the demo director"). It drives the player by calling player.gd's
# own public methods (demo_move, demo_face, demo_skill) -- all going through
# the exact same combo-resolution code a human's key presses do -- and owns
# a small camera rig for the cinematic shots plus the caption overlay.
# Nothing here reaches into world memory directly: it drives the player and
# the Sentinel, and world.gd's own signal handlers do the recording, the
# same way a human playing by hand would trigger them.
#
# `world` is set by world.gd right after this node is created, before
# add_child -- the same ordering rule player.gd's own capture_mode/demo_yaw
# already follow, because _ready() is what starts the timeline.

const LOWER_THIRD_FRAC := 0.76
const CAPTION_FADE := 0.4
const DASH_DODGE_LEAD := 0.18   # seconds before the beam fires to start the dash
const GUARD_LEAD := 0.35        # guard's own active window is far more forgiving

var world: Node3D = null

var _rig_camera: Camera3D
var _caption_layer: CanvasLayer
var _caption_label: Label
var _caption_tween: Tween


func _ready() -> void:
	if world == null:
		push_error("demo_director: world was never set")
		return
	_build_rig_camera()
	_build_captions()
	if world.hud != null:
		world.hud.set_cinematic(true)
	if world.npc_memory != null:
		world.npc_memory.reset_local()

	# One settled frame before the timeline starts driving anything, the
	# same reason tools/memory_live_check.gd waits one frame before its own
	# first record(): a brand-new node has processed nothing yet.
	await get_tree().process_frame
	await _run_timeline()
	get_tree().quit(0)


# ---------------------------------------------------------------------------
# Camera rig and captions
# ---------------------------------------------------------------------------

func _build_rig_camera() -> void:
	_rig_camera = Camera3D.new()
	_rig_camera.fov = 60.0
	add_child(_rig_camera)


func _build_captions() -> void:
	_caption_layer = CanvasLayer.new()
	_caption_layer.layer = 25
	add_child(_caption_layer)

	_caption_label = Label.new()
	_caption_label.add_theme_font_size_override("font_size", 34)
	_caption_label.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 1.0))
	_caption_label.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0, 0.85))
	_caption_label.add_theme_constant_override("outline_size", 6)
	_caption_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_caption_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_caption_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	# Anchored as a full-width horizontal strip at a fixed fraction of the
	# viewport height -- the lower third, centred -- rather than a fixed
	# pixel position, so this reads the same at the 1280x720 window and the
	# 1920x1080 recording. Ruling 5 of the integration card: this must never
	# overlap memory_panel.gd, which sits at mid-height on the right.
	_caption_label.set_anchors_preset(Control.PRESET_TOP_WIDE)
	_caption_label.anchor_top = LOWER_THIRD_FRAC
	_caption_label.anchor_bottom = LOWER_THIRD_FRAC
	_caption_label.offset_top = 0.0
	_caption_label.offset_bottom = 70.0
	_caption_label.modulate = Color(1.0, 1.0, 1.0, 0.0)
	_caption_layer.add_child(_caption_label)


# One caption at a time: a new one kills whatever fade the last one was
# still running through, rather than the two overlapping. Fire-and-forget --
# callers never await this, so the timeline keeps moving while a caption
# fades in, holds and fades back out on its own.
func _show_caption(text: String, hold: float) -> void:
	if _caption_tween != null and _caption_tween.is_valid():
		_caption_tween.kill()
	_caption_label.text = text
	_caption_tween = create_tween()
	_caption_tween.tween_property(_caption_label, "modulate:a", 1.0, CAPTION_FADE)
	_caption_tween.tween_interval(hold)
	_caption_tween.tween_property(_caption_label, "modulate:a", 0.0, CAPTION_FADE)


func _use_player_camera() -> void:
	if world.player != null:
		world.player.camera().current = true
	_rig_camera.current = false


func _use_rig_camera() -> void:
	_rig_camera.current = true


# ---------------------------------------------------------------------------
# Small timing/motion primitives
# ---------------------------------------------------------------------------

func _wait(duration: float) -> void:
	var t := 0.0
	while t < duration:
		t += get_process_delta_time()
		await get_tree().process_frame


# The model's front is its -Z side (character_model.gd, player.gd's own
# _face_movement), so facing a direction means rotating -Z onto it.
func _face_yaw_toward(from: Vector3, to: Vector3) -> float:
	var d := to - from
	d.y = 0.0
	if d.length() < 0.001:
		return 0.0
	d = d.normalized()
	return atan2(-d.x, -d.z)


# Walks the player toward target_pos, re-aiming every frame (a simple
# homing walk, not a fixed straight line), until within arrive_radius or
# max_time runs out as a safety net. Always through demo_move/demo_face --
# player.gd's own scripted-input fields -- never a teleport mid-walk.
func _move_player_to(target_pos: Vector3, arrive_radius: float, max_time: float) -> void:
	var p: Node3D = world.player
	var t := 0.0
	while t < max_time:
		t += get_process_delta_time()
		var pos: Vector3 = p.global_position
		if pos.distance_to(target_pos) <= arrive_radius:
			break
		p.demo_face(_face_yaw_toward(pos, target_pos))
		p.demo_move(Vector3(0.0, 0.0, -1.0))
		await get_tree().process_frame
	p.demo_move(Vector3.ZERO)


# Waits until the Sentinel's beam is `lead` seconds or less from firing, so
# a dash or a guard started right after can land its invulnerable/active
# window on the fire moment -- the reward for reading the telegraph, not a
# scripted coincidence timed against the wrong clock.
func _wait_for_beam_lead(lead: float, timeout: float) -> void:
	var t := 0.0
	while t < timeout:
		t += get_process_delta_time()
		var left: float = world.sentinel.time_until_fire()
		if left >= 0.0 and left <= lead:
			return
		await get_tree().process_frame


# Smoothly interpolates the rig camera's eye and look-at point over
# `duration`, switching the rig camera current first. from==to on either
# argument holds a static frame while still using this same driver.
func _play_shot(from_eye: Vector3, to_eye: Vector3, from_at: Vector3, to_at: Vector3, duration: float) -> void:
	_use_rig_camera()
	if duration <= 0.0:
		_rig_camera.look_at_from_position(to_eye, to_at, Vector3.UP)
		return
	var t := 0.0
	while t < duration:
		t += get_process_delta_time()
		var f: float = clampf(t / duration, 0.0, 1.0)
		var eye: Vector3 = from_eye.lerp(to_eye, f)
		var at: Vector3 = from_at.lerp(to_at, f)
		_rig_camera.look_at_from_position(eye, at, Vector3.UP)
		await get_tree().process_frame


func _orbit_player(duration: float, radius: float, start_angle: float, end_angle: float) -> void:
	_use_rig_camera()
	var center: Vector3 = world.player.global_position
	var t := 0.0
	while t < duration:
		t += get_process_delta_time()
		var f: float = clampf(t / duration, 0.0, 1.0)
		var ang: float = lerpf(start_angle, end_angle, f)
		var eye: Vector3 = center + Vector3(sin(ang), 0.0, cos(ang)) * radius + Vector3(0.0, 2.2, 0.0)
		_rig_camera.look_at_from_position(eye, center + Vector3(0.0, 1.3, 0.0), Vector3.UP)
		await get_tree().process_frame


# ---------------------------------------------------------------------------
# The timeline. Times in the integration card are guides; this follows the
# beats, not the clock, and a beam-telegraph wait can run short or long by
# up to one Sentinel cycle depending on when the fight beat is reached.
# ---------------------------------------------------------------------------

func _run_timeline() -> void:
	var p: Node3D = world.player
	var mireth_pos: Vector3 = world.npc.position
	var sentinel_pos: Vector3 = world.sentinel.position

	# 0-3s: the player camera is already moving. The Dreamwalker runs up the
	# cart track through the ruins at golden hour.
	_use_player_camera()
	p.global_position = Vector3(1.6, 1.2, 24.0)
	p.demo_face(_face_yaw_toward(p.global_position, Vector3(0.0, 0.0, 6.0)))
	_show_caption("DREAM ONLINE -- pre-alpha gameplay, captured in engine", 3.4)
	await _move_player_to(mireth_pos + Vector3(1.8, 0.0, 0.6), 2.6, 7.0)

	# 3-9s: a framed shot as the player reaches Mireth and presses E.
	var mireth_look: Vector3 = mireth_pos + Vector3(0.0, 1.35, 0.0)
	await _play_shot(
		p.global_position + Vector3(-2.6, 1.8, -0.8), p.global_position + Vector3(-1.2, 1.5, 0.3),
		p.global_position + Vector3(0.0, 1.3, 0.0), mireth_look, 1.4)
	p.demo_face(_face_yaw_toward(p.global_position, mireth_pos))
	p.demo_skill("", false, "E")
	await _wait(4.2)
	_use_player_camera()

	# 9-32s: the fight with the Hollow Sentinel.
	await _move_player_to(sentinel_pos + Vector3(0.4, 0.0, 8.5), 8.2, 6.0)
	await _fight_sentinel(sentinel_pos)

	# 32-36s: a slow orbit around the player standing among the ruins.
	_show_caption("Mireth saw all of it. She will remember.", 4.0)
	await _orbit_player(4.4, 6.5, 0.1, PI * 0.55)

	# 36-42s: nightfall. The blocking world-memory recall happens inside
	# world.nightfall() itself, in the black at the middle of the fade.
	_use_player_camera()
	_show_caption("Nightfall. The landscape changes. You don't.", 5.4)
	await world.nightfall(5.0)

	# 42-50s: a framed establishing shot of the city.
	var city_at: Vector3 = Vector3(0.0, 6.0, -6.0)
	await _play_shot(Vector3(0.0, 3.0, 26.0), Vector3(2.0, 24.0, -6.0),
		Vector3(0.0, 4.0, 0.0), city_at, 7.2)

	# 50-60s: the player walks to Mireth, now under a street lamp, and talks.
	_use_player_camera()
	await _move_player_to(mireth_pos + Vector3(1.6, 0.0, 0.5), 2.4, 7.0)
	p.demo_face(_face_yaw_toward(p.global_position, mireth_pos))
	p.demo_skill("", false, "E")
	await _wait(7.4)

	# 60-74s: a short night fight, lit by the city.
	await _move_player_to(sentinel_pos + Vector3(0.4, 0.0, 8.5), 8.2, 6.0)
	await _fight_sentinel(sentinel_pos)

	# 74-80s: end card.
	await _end_card()


# One fight beat, reused for both the day and the night encounter: a read
# telegraph and a dash for a perfect dodge, the light chain, a heavy cleave,
# a guard block against the next beam, a Dream Lunge, a second perfect
# dodge, then the Nightveil Burst to finish it.
func _fight_sentinel(sentinel_pos: Vector3) -> void:
	var p: Node3D = world.player

	# Beam #1: read the telegraph, dash through it for a perfect dodge.
	p.demo_move(Vector3.ZERO)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	_show_caption("Action combat: every skill is a key combination", 3.4)
	await _wait_for_beam_lead(DASH_DODGE_LEAD, 6.0)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("W", true, "F")
	await _wait(0.75)
	_show_caption("Perfect dodge -- invulnerable through the dash", 3.2)

	# Close to the light-chain and heavy-cleave range and land them.
	await _move_player_to(sentinel_pos + Vector3(0.0, 0.0, 2.6), 1.6, 3.0)
	for _i in range(3):
		p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
		p.demo_skill("", false, "LMB")
		await _wait(0.42)

	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("", false, "RMB")
	await _wait(1.0)

	# A guard block against the next beam.
	p.demo_move(Vector3.ZERO)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	await _wait_for_beam_lead(GUARD_LEAD, 6.0)
	p.demo_skill("", false, "Q")
	await _wait(0.9)

	# A Dream Lunge from about 6 m -- inside LungeState.REACH, so the thrust
	# actually connects rather than whiffing past its own target.
	await _move_player_to(sentinel_pos + Vector3(0.0, 0.0, 6.0), 0.6, 3.0)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("W", false, "F")
	await _wait(0.75)

	# A second perfect dodge.
	p.demo_move(Vector3.ZERO)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	await _wait_for_beam_lead(DASH_DODGE_LEAD, 6.0)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("W", true, "F")
	await _wait(0.75)

	# The Nightveil Burst finishes it.
	await _move_player_to(sentinel_pos + Vector3(0.0, 0.0, 3.0), 2.4, 3.0)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("", false, "R")
	await _wait(1.3)
	p.demo_move(Vector3.ZERO)


func _end_card() -> void:
	_use_rig_camera()
	var at: Vector3 = world.player.global_position + Vector3(0.0, 1.3, 0.0)
	await _play_shot(at + Vector3(9.0, 4.5, 11.0), at + Vector3(3.5, 3.6, 4.5), at, at, 3.0)
	_show_caption("DREAM ONLINE", 3.0)
	await _wait(3.2)
	_show_caption("Pre-alpha. Every frame in engine. Characters, world and memory built by AI.", 3.4)
	await _wait(3.6)
