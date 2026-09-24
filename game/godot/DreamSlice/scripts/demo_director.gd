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
const COMBAT_SPRING_LENGTH := 4.2   # closer than hand-play's 6.0, per the judge's own note
const COMBAT_SPRING_HEIGHT := 1.25

var world: Node3D = null

var _rig_camera: Camera3D
var _caption_layer: CanvasLayer
var _caption_label: Label
var _caption_tween: Tween

# The auto-dodge safety net (see _auto_dodge_loop): live only while a fight
# beat has woken the Sentinel, suppressed during the two beats that already
# script their own defence on purpose (the captioned first dodge and the
# guard block), so nothing double-presses a key mid-scripted-action.
var _auto_dodge_active := false
var _scripted_defense := false

var _video_time := 0.0   # temporary diagnostic: total elapsed simulated seconds


func _process(delta: float) -> void:
	_video_time += delta


func _ready() -> void:
	if world == null:
		push_error("demo_director: world was never set")
		return
	_build_rig_camera()
	_build_captions()
	_apply_demo_quality()
	if world.hud != null:
		world.hud.set_cinematic(true)
	if world.npc_memory != null:
		world.npc_memory.reset_local()
	if world.player != null:
		world.player.set_camera_distance(COMBAT_SPRING_LENGTH, COMBAT_SPRING_HEIGHT)
	if world.sentinel != null:
		# Inert until a fight beat wakes it: see _fight_sentinel. A beam
		# cycling away in the background during the opening run or a quiet
		# talk is not a scripted beat, just incidental damage.
		world.sentinel.sleep()

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
	# Depth of field lives on the camera, not the Environment, so it is set up
	# here once and just toggled on and off by _set_dof as shots change --
	# spec 003 lever 3: "depth of field on camera moves." A held two-shot
	# needs both faces sharp, so DOF is off for those; a moving shot (the
	# opening push, the orbit, the city establishing shot, the end card) gets
	# it on, softening the background behind whatever the shot is pushing
	# toward.
	var attributes := CameraAttributesPractical.new()
	attributes.dof_blur_far_enabled = false
	# Sharp through the subject a moving shot is actually about (the field,
	# the ruins the opening push closes on, the city the establishing shot
	# frames) and only softening the deep background beyond it -- caught by
	# capturing the opening push and finding the ruins themselves going soft
	# while the near grass stayed sharp, backwards from what "push toward the
	# ruins" should read as.
	attributes.dof_blur_far_distance = 35.0
	attributes.dof_blur_far_transition = 18.0
	attributes.dof_blur_near_enabled = false
	attributes.dof_blur_amount = 0.12
	_rig_camera.attributes = attributes
	add_child(_rig_camera)


func _set_dof(enabled: bool) -> void:
	var attributes: CameraAttributesPractical = _rig_camera.attributes
	if attributes != null:
		attributes.dof_blur_far_enabled = enabled


# The demo-only expensive half of spec 003 lever 3: screen-space indirect
# lighting, a denser volumetric fog, and sharper shadows and edges than the
# interactive slice can afford to run on the RX 6800 every frame. This node
# only ever exists when --demo was passed (world.gd only builds one then),
# so everything set here is already gated behind the demo path with no
# separate flag needed. Called again after nightfall, which swaps world's
# own Environment resource for a fresh one that has none of this applied yet.
#
# SDFGI was tried first and dropped: real-time global illumination recomputed
# every frame, on top of a high directional shadow filter quality and eight
# shadow-casting lamps, pushed a single frame's GPU time so high (measured:
# 240 ms/frame average) that the first full recording attempt could not
# finish the ~80 s timeline inside the recording window at all. Cutting
# SDFGI and the lamp count (dream_env.gd's own _build_lamps, now two
# shadow-casting lamps instead of eight) were the two biggest wins; the
# remaining settings below still noticeably outclass the interactive
# baseline (project.godot's own 2x MSAA, no TAA, no SSIL, default shadow
# filter quality).
func _apply_demo_quality() -> void:
	var env: Environment = world.current_environment()
	if env != null:
		env.ssil_enabled = true
		env.volumetric_fog_density *= 1.3
	var vp := get_viewport()
	if vp != null:
		vp.msaa_3d = Viewport.MSAA_4X
		vp.use_taa = true
		vp.positional_shadow_atlas_size = 2048
	RenderingServer.directional_soft_shadow_filter_set_quality(
		RenderingServer.SHADOW_QUALITY_SOFT_HIGH)
	RenderingServer.positional_soft_shadow_filter_set_quality(
		RenderingServer.SHADOW_QUALITY_SOFT_MEDIUM)


func _build_captions() -> void:
	_caption_layer = CanvasLayer.new()
	_caption_layer.layer = 25
	add_child(_caption_layer)

	_caption_label = Label.new()
	# One size down from the original 34: this label also carries Mireth's
	# own spoken line (integration-card judge note, 2026-09-23, "the heart
	# of the demo"), which runs far longer than a punchy story caption and
	# needs to fit close to two lines rather than one.
	_caption_label.add_theme_font_size_override("font_size", 30)
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
	_caption_label.offset_bottom = 96.0
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
	_rig_camera.current = false
	if world.player != null:
		world.player.camera().current = true


func _use_rig_camera() -> void:
	if world.player != null:
		world.player.camera().current = false
	_rig_camera.current = true
	print("DIRECTOR camera switch: rig.current=%s player.current=%s" %
		[_rig_camera.current, world.player.camera().current if world.player != null else "?"])


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


# The safety net behind the whole fight: any beam cycle the choreography
# below does not turn into an explicit narrative beat (the captioned first
# dodge, the guard block) is still answered here, with a plain uncaptioned
# dash and, if stamina is too tight for one, a guard instead. Per the
# integration-card judge note (2026-09-23): "let the player take at most 2
# or 3 hits in the whole demo; the point is a skilled player" -- a fight
# that only defends against the two or three beats the script names would
# otherwise eat a full, undodged hit every other cycle. Fire-and-forget,
# started and stopped by _fight_sentinel around the whole beat.
func _auto_dodge_loop(sentinel_pos: Vector3) -> void:
	var p: Node3D = world.player
	while _auto_dodge_active:
		if not _scripted_defense:
			var left: float = world.sentinel.time_until_fire()
			if left >= 0.0 and left <= DASH_DODGE_LEAD:
				p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
				if p.dash.can_start(p.stamina):
					p.demo_skill("W", true, "F")
					await _wait(0.5)
				elif p.guard.can_start(p.stamina):
					p.demo_skill("", false, "Q")
					await _wait(0.5)
		await get_tree().process_frame


# Smoothstep: 0 and 1 held exactly, symmetric about the midpoint, first
# derivative zero at both ends -- the standard "ease in, ease out" curve.
# Static and pure (no `self`, no node, no tree) so it is exactly as cheap to
# call from a plain lerp as f itself, and so tests/test_demo_director.gd can
# check it with no camera, no world and no live SceneTree at all.
static func ease_in_out(f: float) -> float:
	var c: float = clampf(f, 0.0, 1.0)
	return c * c * (3.0 - 2.0 * c)


# Smoothly interpolates the rig camera's eye and look-at point over
# `duration`, switching the rig camera current first. from==to on either
# argument holds a static frame while still using this same driver. The
# progress fraction is run through ease_in_out before it ever reaches a lerp
# (spec 003 lever 5: "weight the camera moves") -- a plain linear f reads as
# a robotic constant-speed glide; easing it gives every push, pull and pan in
# the demo a camera-operator's slow start and slow settle instead.
func _play_shot(from_eye: Vector3, to_eye: Vector3, from_at: Vector3, to_at: Vector3, duration: float) -> void:
	_use_rig_camera()
	if duration <= 0.0:
		_rig_camera.look_at_from_position(to_eye, to_at, Vector3.UP)
		return
	var t := 0.0
	while t < duration:
		t += get_process_delta_time()
		var f: float = ease_in_out(clampf(t / duration, 0.0, 1.0))
		var eye: Vector3 = from_eye.lerp(to_eye, f)
		var at: Vector3 = from_at.lerp(to_at, f)
		_rig_camera.look_at_from_position(eye, at, Vector3.UP)
		await get_tree().process_frame


func _orbit_player(duration: float, radius: float, start_angle: float, end_angle: float) -> void:
	_use_rig_camera()
	_set_dof(true)
	var center: Vector3 = world.player.global_position
	var t := 0.0
	while t < duration:
		t += get_process_delta_time()
		var f: float = ease_in_out(clampf(t / duration, 0.0, 1.0))
		var ang: float = lerpf(start_angle, end_angle, f)
		var eye: Vector3 = center + Vector3(sin(ang), 0.0, cos(ang)) * radius + Vector3(0.0, 2.2, 0.0)
		_rig_camera.look_at_from_position(eye, center + Vector3(0.0, 1.3, 0.0), Vector3.UP)
		await get_tree().process_frame


# The point directly to the side of the line from `center` toward `toward`
# -- the vantage a side-angle shot or a two-shot is taken from.
func _side_point(center: Vector3, toward: Vector3, side_offset: float, height: float) -> Vector3:
	var axis := toward - center
	axis.y = 0.0
	var side := Vector3(-axis.z, 0.0, axis.x)
	if side.length() < 0.01:
		side = Vector3.RIGHT
	side = side.normalized()
	return center + side * side_offset + Vector3(0.0, height, 0.0)


# A static held side-angle shot, framing both person_a and person_b together
# and large -- the two-shot the integration-card judge note (2026-09-23)
# asks for on the night talk with Mireth: "framed together, both large, from
# the side". Used for the day talk too, for the same reason and for visual
# consistency between the two.
func _two_shot(person_a: Vector3, person_b: Vector3, side_offset: float, height: float, duration: float,
		spoken_line: String = "") -> void:
	var mid := (person_a + person_b) * 0.5
	# Anchored on the midpoint between the two of them, not on person_a --
	# anchoring on either person alone put the eye at a fixed distance from
	# just that one, so whichever way person_a and person_b happened to be
	# spaced when the shot was taken, the framing could read badly lopsided
	# (one of them close and cropped, the other small and far).
	var eye := _side_point(mid, person_b, side_offset, height)
	var at := mid + Vector3(0.0, height * 0.75, 0.0)
	_use_rig_camera()
	_set_dof(false)  # both faces need to stay sharp through a held conversation
	_rig_camera.look_at_from_position(eye, at, Vector3.UP)

	# The heart of the demo (integration-card judge note, 2026-09-23):
	# Mireth's own spoken line, held on screen as a subtitle for the whole
	# beat, alongside the recall panel.
	if spoken_line != "":
		_show_caption(spoken_line, maxf(0.1, duration - CAPTION_FADE))

	# The player turns to face Mireth for the whole talk. _face_movement
	# only ever turns the body to match actual velocity, and the player is
	# standing still here, so this drives it directly instead
	# (player.gd's demo_face_body). Mireth turns to face him on her own,
	# already driven by notify_talked/npc.gd's own _process.
	var p: Node3D = world.player
	var yaw_to_mireth := _face_yaw_toward(person_a, person_b)
	var t := 0.0
	while t < duration:
		var delta := get_process_delta_time()
		t += delta
		if p != null:
			p.demo_face_body(yaw_to_mireth, delta)
		await get_tree().process_frame


# A brief held side-angle cut on the player, framed against the Sentinel
# beyond them -- for the perfect dodge and the heavy cleave, per the
# integration-card judge note (2026-09-23). Held well back from the player's
# own position: a perfect dodge's flash (vfx.gd's own OmniLight3D) reads as
# a bright accent from here, not a screen-filling overexposure the way a
# closer cut caught it.
func _side_angle_cut(sentinel_pos: Vector3, duration: float) -> void:
	var p: Node3D = world.player
	var pos: Vector3 = p.global_position
	var eye := _side_point(pos, sentinel_pos, 7.0, 2.4)
	var at := pos.lerp(sentinel_pos, 0.3) + Vector3(0.0, 1.2, 0.0)
	_set_dof(false)  # a held cut, not a move -- the read-and-answer needs to stay crisp
	await _play_shot(eye, eye, at, at, duration)
	_use_player_camera()


# ---------------------------------------------------------------------------
# The timeline. Times in the integration card are guides; this follows the
# beats, not the clock, and a beam-telegraph wait can run short or long by
# up to one Sentinel cycle depending on when the fight beat is reached.
# ---------------------------------------------------------------------------

func _run_timeline() -> void:
	var p: Node3D = world.player
	var mireth_pos: Vector3 = world.npc.position
	var sentinel_pos: Vector3 = world.sentinel.position

	# 0-3s: the opening shot, and per the integration card's own rule the
	# strongest one -- a viewer decides whether to keep watching inside the
	# first three seconds (spec 003 lever 5). A slow, low push across the
	# golden field, drifting forward through the grass as the ruined
	# cottages resolve out of the haze ahead, eased in and settled rather
	# than gliding at one constant speed (_play_shot's own ease_in_out).
	# Not the player's own over-the-shoulder run: that reads as ordinary
	# gameplay footage, not a shot anyone composed, and it still gets its
	# turn right after this one.
	p.global_position = Vector3(1.6, 1.2, 24.0)
	p.demo_face(_face_yaw_toward(p.global_position, Vector3(0.0, 0.0, 6.0)))
	_show_caption("DREAM ONLINE -- pre-alpha gameplay, captured in engine", 3.4)
	_set_dof(true)
	await _play_shot(Vector3(5.0, 0.75, 46.0), Vector3(0.4, 1.2, 25.0),
		Vector3(-3.0, 1.0, 6.0), Vector3(-11.0, 2.2, -13.0), 3.0)
	print("DIRECTOR t=%.2f opening push done" % _video_time)

	# 3-9s: the Dreamwalker runs up the cart track through the ruins.
	_use_player_camera()
	await _move_player_to(mireth_pos + Vector3(1.8, 0.0, 0.6), 2.6, 7.0)
	print("DIRECTOR t=%.2f arrived at Mireth (day)" % _video_time)

	# 3-9s: a two-shot as the player reaches Mireth and presses E.
	p.demo_face(_face_yaw_toward(p.global_position, mireth_pos))
	p.demo_skill("", false, "E")
	await _two_shot(p.global_position, mireth_pos, 3.0, 1.45, 6.0, world.last_spoken_line)
	_use_player_camera()
	print("DIRECTOR t=%.2f day two-shot done" % _video_time)

	# 9-32s: the fight with the Hollow Sentinel. Fight length itself varies
	# with the Sentinel's own beam cycle (see _fight_sentinel's own note);
	# the beats around it below carry fixed, dependable durations so the
	# whole recording still lands near the card's 60-90 s target either way.
	await _move_player_to(sentinel_pos + Vector3(0.4, 0.0, 8.5), 8.2, 6.0)
	print("DIRECTOR t=%.2f day fight begins" % _video_time)
	await _fight_sentinel(sentinel_pos)
	print("DIRECTOR t=%.2f day fight ends" % _video_time)

	# 32-36s: a slow orbit around the player standing among the ruins.
	_show_caption("Mireth saw all of it. She will remember.", 5.6)
	await _orbit_player(6.0, 6.5, 0.1, PI * 0.55)
	print("DIRECTOR t=%.2f orbit done" % _video_time)

	# 36-42s: nightfall. The blocking world-memory recall happens inside
	# world.nightfall() itself, in the black at the middle of the fade.
	_use_player_camera()
	_show_caption("Nightfall. The landscape changes. You don't.", 6.6)
	await world.nightfall(7.0)
	# nightfall() swaps world's own Environment for a freshly built one (Day's
	# torn down, Night's built in its place); the demo-quality bump applied at
	# _ready() lived on the old resource and is gone with it, so it is
	# reapplied here. The viewport/RenderingServer settings from the first
	# call are untouched by the swap and do not need repeating.
	_apply_demo_quality()
	print("DIRECTOR t=%.2f nightfall done" % _video_time)

	# 42-50s: a framed establishing shot of the city.
	var city_at: Vector3 = Vector3(0.0, 6.0, -6.0)
	_set_dof(true)
	await _play_shot(Vector3(0.0, 3.0, 26.0), Vector3(2.0, 24.0, -6.0),
		Vector3(0.0, 4.0, 0.0), city_at, 10.0)
	print("DIRECTOR t=%.2f city shot done" % _video_time)

	# 50-60s: the player walks to Mireth, now under a street lamp, and talks.
	# The Sentinel stays asleep (no beam, not in frame) through the whole
	# beat: a two-shot, both large, from the side, per the judge's own note.
	_use_player_camera()
	await _move_player_to(mireth_pos + Vector3(1.6, 0.0, 0.5), 2.4, 7.0)
	p.demo_face(_face_yaw_toward(p.global_position, mireth_pos))
	p.demo_skill("", false, "E")
	await _two_shot(p.global_position, mireth_pos, 3.2, 1.45, 8.5, world.last_spoken_line)
	_use_player_camera()
	print("DIRECTOR t=%.2f night two-shot done" % _video_time)

	# 60-74s: a short night fight, lit by the city.
	await _move_player_to(sentinel_pos + Vector3(0.4, 0.0, 8.5), 8.2, 6.0)
	print("DIRECTOR t=%.2f night fight begins" % _video_time)
	await _fight_sentinel(sentinel_pos)
	print("DIRECTOR t=%.2f night fight ends" % _video_time)

	# 74-80s: end card.
	await _end_card()


# One fight beat, reused for both the day and the night encounter: a read
# telegraph and a dash for a perfect dodge, the light chain, a heavy cleave,
# a guard block against the next beam, a Dream Lunge, a second perfect
# dodge, then the Nightveil Burst to finish it. The Sentinel is woken on
# entry and put back to sleep on the way out (integration-card judge note,
# 2026-09-23: inert, not just out of frame, outside a fight beat), and
# _auto_dodge_loop runs the whole time as a safety net against every beam
# cycle this choreography does not explicitly answer.
func _fight_sentinel(sentinel_pos: Vector3) -> void:
	var p: Node3D = world.player
	world.sentinel.wake(p)
	_auto_dodge_active = true
	_auto_dodge_loop(sentinel_pos)

	# Beam #1: read the telegraph, dash through it for a perfect dodge, cut
	# to a side angle so the read-and-answer actually reads on camera.
	_scripted_defense = true
	p.demo_move(Vector3.ZERO)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	_show_caption("Action combat: every skill is a key combination", 3.4)
	await _wait_for_beam_lead(DASH_DODGE_LEAD, 6.0)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("W", true, "F")
	await _side_angle_cut(sentinel_pos, 0.85)
	_scripted_defense = false
	_show_caption("Perfect dodge -- invulnerable through the dash", 3.2)

	# Close to the light-chain and heavy-cleave range and land them. Auto-
	# dodge stays suppressed through this whole middle stretch (light chain,
	# heavy cleave, guard, lunge): an interjected dash here could nudge the
	# player out of position right as a scripted hit needs to land, and
	# landing the heavy cleave and the Nightveil Burst together is what
	# clears the Sentinel's full health -- otherwise "the Sentinel fell"
	# never shows up in what Mireth recalls (integration-card judge note,
	# 2026-09-23). The guard block still answers its own beam explicitly
	# inside this span; only the cycles it does not name are left open.
	_scripted_defense = true
	await _move_player_to(sentinel_pos + Vector3(0.0, 0.0, 2.6), 1.6, 3.0)
	for _i in range(3):
		p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
		p.demo_skill("", false, "LMB")
		await _wait(0.42)

	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("", false, "RMB")
	await _side_angle_cut(sentinel_pos, 1.0)

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
	_scripted_defense = false

	# A second perfect dodge.
	_scripted_defense = true
	p.demo_move(Vector3.ZERO)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	await _wait_for_beam_lead(DASH_DODGE_LEAD, 6.0)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("W", true, "F")
	await _wait(0.75)
	_scripted_defense = false

	# The Nightveil Burst finishes it.
	await _move_player_to(sentinel_pos + Vector3(0.0, 0.0, 3.0), 2.4, 3.0)
	p.demo_face(_face_yaw_toward(p.global_position, sentinel_pos))
	p.demo_skill("", false, "R")
	await _wait(1.3)
	p.demo_move(Vector3.ZERO)

	_auto_dodge_active = false
	world.sentinel.sleep()


func _end_card() -> void:
	_use_rig_camera()
	_set_dof(true)
	var at: Vector3 = world.player.global_position + Vector3(0.0, 1.3, 0.0)
	# Higher and steeper than a hand-play camera would sit, so a low,
	# ground-hugging wet-street reflection streak (dream_env.gd's own
	# lamp effect, not something this script controls) does not cut
	# straight across the shot the way it did at a lower, grazing angle.
	await _play_shot(at + Vector3(7.0, 7.0, 9.0), at + Vector3(2.8, 5.0, 3.6), at, at, 3.5)
	_show_caption("DREAM ONLINE", 4.0)
	await _wait(4.2)
	_show_caption("Pre-alpha. Every frame in engine. Characters, world and memory built by AI.", 4.5)
	await _wait(4.8)
	# Spec 003: "the recording credits third-party assets on the end card."
	# Every texture and the sky HDRI are CC0 from Poly Haven -- no credit is
	# legally required, but one is given anyway (assets/third_party/LICENSES.md).
	_show_caption("Environment textures and sky: Poly Haven (CC0, polyhaven.com)", 3.6)
	await _wait(3.8)
