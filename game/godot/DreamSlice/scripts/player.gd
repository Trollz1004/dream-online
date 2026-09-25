extends CharacterBody3D

# The player for the combat slice: the Dreamwalker (spec 002,
# specs/002-crowdfunding-demo/spec.md). Everything here follows Joshua's
# rulings of 2026-09-20 recorded in docs/gdd/02-action-combat.md:
#   - A direction with Shift is movement. Sprint. Never a skill.
#   - A double tap latches auto-sprint so long travel needs no keys held.
#   - A skill is a direction, an optional Shift, and one action key.
#   - Shift with a direction and an action key is the dash, which carries
#     invulnerability frames through its travel and is open in recovery.

const DashState := preload("res://scripts/dash_state.gd")
const Combo := preload("res://scripts/combo.gd")
const Movement := preload("res://scripts/movement.gd")
const AttackState := preload("res://scripts/attack_state.gd")
const HeavyAttackState := preload("res://scripts/heavy_attack_state.gd")
const GuardState := preload("res://scripts/guard_state.gd")
const LungeState := preload("res://scripts/lunge_state.gd")
const BurstState := preload("res://scripts/burst_state.gd")
const WorldEvent := preload("res://scripts/world_event.gd")
const EventLog := preload("res://scripts/event_log.gd")
const Vfx := preload("res://scripts/vfx.gd")
const CharacterModelScript := preload("res://scripts/character_model.gd")

const WALK_SPEED := 5.5
const SPRINT_SPEED := 9.5
const GRAVITY := 24.0
const MOUSE_SENS := 0.0022
const STAMINA_MAX := 100.0
const STAMINA_REGEN := 20.0
const SPRINT_DRAIN := 10.0
const DOUBLE_TAP_WINDOW := 0.30
const HEALTH_MAX := 100.0
const HIT_FLASH_DURATION := 0.28

## Emitted once a perfect dodge is confirmed: an i-frame dodge of a
## telegraphed attack. World memory records perfect_dodge from here; this
## script knows nothing about the Live NPC Lab.
signal perfect_dodge_confirmed(attack_name: String)

## Emitted when a heavy swing actually connects. World memory records
## heavy_hit (with the damage) from here.
signal heavy_hit_landed(damage: float)

## Emitted the instant Dream Lunge or Nightveil Burst is activated. World
## memory records skill_used (with the skill's name) from here.
signal skill_used(skill_name: String)

## Emitted once a nearby NPC actually answers a talk. World memory records
## talked (with the line spoken) from here.
signal talked(npc_name: String, line: String)

var dash := DashState.new()
var attack := AttackState.new()
var heavy := HeavyAttackState.new()
var guard := GuardState.new()
var lunge := LungeState.new()
var burst := BurstState.new()
var target: Node3D = null          # what a swing can reach
var npc: Node3D = null             # who a plain E can talk to, in range
var events = EventLog.new()
var event_path := "user://world-events.jsonl"
var events_written := 0
var stamina := STAMINA_MAX
var health := HEALTH_MAX
var hud: Node = null
var time_of_day := "day"           # kept in step by world.gd, alongside dream_env's own mode

var _yaw := 0.0
var _pitch := -0.22
var _spring: SpringArm3D
var _camera: Camera3D
var _visual: Node3D
var _model: Node3D = null
var _gold_rim: MeshInstance3D
var _fill_light: SpotLight3D = null
var _auto_sprint := false
var _last_tap := {}
var _dash_dir := Vector3.ZERO
var _lunge_dir := Vector3.ZERO
var _hit_flash_t := 0.0
var _shake_t := 0.0
var _shake_duration := 0.0
var _shake_amount := 0.0
var _last_event := "Ready"
var _event_age := 0.0
var capture_mode := false
var demo_yaw := 0.0
var _demo_move_vec := Vector3.ZERO   # a scripted input, for pictures and the demo director

const DIRECTION_KEYS := {KEY_W: "W", KEY_A: "A", KEY_S: "S", KEY_D: "D"}
const ACTION_KEY_NAMES := {
	KEY_Q: "Q", KEY_E: "E", KEY_R: "R", KEY_F: "F", KEY_Z: "Z", KEY_C: "C"
}


func _ready() -> void:
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.4
	capsule.height = 1.8
	var shape := CollisionShape3D.new()
	shape.shape = capsule
	add_child(shape)

	_visual = Node3D.new()
	add_child(_visual)

	_model = CharacterModelScript.build(CharacterModelScript.KIND_DREAMWALKER)
	_model.set_time_of_day(time_of_day)
	_visual.add_child(_model)

	_gold_rim = _build_gold_rim()
	_visual.add_child(_gold_rim)

	_spring = SpringArm3D.new()
	_spring.spring_length = 6.0
	_spring.position = Vector3(0.0, 1.4, 0.0)
	add_child(_spring)
	_camera = Camera3D.new()
	_camera.current = true
	_spring.add_child(_camera)

	_fill_light = _build_fill_light()
	_camera.add_child(_fill_light)

	events.open(event_path)

	if capture_mode:
		_yaw = demo_yaw
	elif not OS.has_feature("web"):
		# Asking here works in a window. In a browser it cannot: pointer lock is
		# only granted from a user gesture, so the request is refused on load
		# (measured on 2026-09-21, document.pointerLockElement was null after
		# the page settled and became the canvas on the first click). The click
		# in _unhandled_input does the grab on the web, and the readout tells the
		# player to make it.
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


# A thin gold ring at the feet, the invulnerability flash the dash's frames
# earn: visible only while dash.is_invulnerable() is true (see _update_model).
# Kept off character_model.gd's own materials -- that file is being polished
# by another lane right now -- so this is a sibling overlay, not a tint on
# the model itself.
func _build_gold_rim() -> MeshInstance3D:
	var rim := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.40
	torus.outer_radius = 0.56
	rim.mesh = torus
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(1.0, 0.92, 0.55, 0.65)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.85, 0.40)
	mat.emission_energy_multiplier = 2.0
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	rim.material_override = mat
	rim.position = Vector3(0.0, 0.06, 0.0)
	rim.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	rim.visible = false
	return rim


# Judge finding, round 4 (2026-09-24): the player read as a flat black
# silhouette in both day and night captures -- armour detail invisible. The
# world's own sun (day) or moon (night) lights the character from whatever
# direction it happens to sit at, which regularly leaves the camera-facing
# side underlit at golden hour or in the dark. A SpotLight3D parented to the
# camera itself, aimed straight down the camera's own -Z (its default facing,
# so no extra rotation is needed), always lands on whatever side of the
# character the camera is actually looking at, in either world, without
# touching the world's own lighting or its day/night grade. Kept deliberately
# subtle (a modest energy, no shadows of its own) per Joshua's own "do not
# wash out the scene" -- this is a fill/rim light, not a stage spotlight.
func _build_fill_light() -> SpotLight3D:
	var light := SpotLight3D.new()
	light.light_energy = 1.4
	light.light_color = Color(1.0, 0.92, 0.78)   # warm/golden, so steel actually catches it
	light.spot_range = 9.0
	light.spot_angle = 30.0
	light.spot_angle_attenuation = 1.5
	light.shadow_enabled = false
	return light


func set_time_of_day(t: String) -> void:
	time_of_day = t
	if _model != null:
		_model.set_time_of_day(t)


# The player's own over-the-shoulder camera, for the demo director to cut
# back to between its own framed shots.
func camera() -> Camera3D:
	return _camera


# The demo director's own combat-camera adjustment (integration-card judge
# note, 2026-09-23): a --demo recording wants the fight closer and slightly
# lower than the default hand-play distance, so the Dreamwalker and the
# Sentinel read large in frame instead of small dots in the middle of it.
func set_camera_distance(length: float, mount_height: float) -> void:
	if _spring != null:
		_spring.spring_length = length
		_spring.position.y = mount_height


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_yaw -= event.relative.x * MOUSE_SENS
		_pitch = clampf(_pitch - event.relative.y * MOUSE_SENS, -1.2, 0.5)
		return

	if event is InputEventMouseButton and event.pressed:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			return
		if event.button_index == MOUSE_BUTTON_LEFT:
			_try_skill("LMB")
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			_try_skill("RMB")
		return

	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		elif DIRECTION_KEYS.has(event.keycode):
			_note_direction_tap(DIRECTION_KEYS[event.keycode])
		elif ACTION_KEY_NAMES.has(event.keycode):
			_try_skill(ACTION_KEY_NAMES[event.keycode])


# A double tap of a direction latches auto-sprint. Joshua's ruling: no keys held
# down on a long walk.
func _note_direction_tap(name: String) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	var previous: float = _last_tap.get(name, -99.0)
	if now - previous <= DOUBLE_TAP_WINDOW:
		_auto_sprint = true
		_say("Auto-sprint on")
	_last_tap[name] = now


func _held_direction_name() -> String:
	# One name for the grammar. Forward wins when two are held, then back, then
	# left, then right, so a key set is always resolved the same way.
	if Input.is_key_pressed(KEY_W):
		return "W"
	if Input.is_key_pressed(KEY_S):
		return "S"
	if Input.is_key_pressed(KEY_A):
		return "A"
	if Input.is_key_pressed(KEY_D):
		return "D"
	return ""


func _input_vector() -> Vector3:
	if capture_mode and _demo_move_vec != Vector3.ZERO:
		return _demo_move_vec.normalized()
	var v := Vector3.ZERO
	if Input.is_key_pressed(KEY_W):
		v.z -= 1.0
	if Input.is_key_pressed(KEY_S):
		v.z += 1.0
	if Input.is_key_pressed(KEY_A):
		v.x -= 1.0
	if Input.is_key_pressed(KEY_D):
		v.x += 1.0
	return v.normalized()


func _camera_relative(v: Vector3) -> Vector3:
	return Movement.camera_relative(v, _yaw)


# The demo director's own scripted input, driven every physics frame it
# wants the player walking: `vec` is read the same way held WASD keys would
# be (see _input_vector), so it still passes through the same camera-relative
# transform real input does. Vector3.ZERO stops the player.
func demo_move(vec: Vector3) -> void:
	_demo_move_vec = vec


# The demo director's own camera/facing control: sets the yaw real mouse look
# would, driving both the over-the-shoulder camera and movement's own notion
# of "forward" (see demo_move).
func demo_face(yaw_value: float) -> void:
	_yaw = yaw_value


# The demo director's own body-facing control, for a stationary dialogue
# beat: _face_movement only ever turns _visual to match actual velocity, so
# a player standing still (as during a talk) never turns to face anyone on
# its own. Smoothed the same way _face_movement already is, not snapped, so
# a director-scripted turn still reads as a real turn on camera.
func demo_face_body(yaw_value: float, delta: float) -> void:
	_visual.rotation.y = lerp_angle(_visual.rotation.y, yaw_value, clampf(12.0 * delta, 0.0, 1.0))


func _try_skill(action_key: String) -> void:
	_resolve_skill(action_key, _held_direction_name(), Input.is_key_pressed(KEY_SHIFT))


# The demo director's own entry point: drives the exact same combo
# resolution _try_skill uses, but with a scripted direction and Shift
# instead of reading real OS input, which a --write-movie capture never
# generates. `direction` is "", "W", "A", "S" or "D"; `action_key` matches
# Combo.ACTION_KEYS / ACTION_KEY_NAMES above (e.g. "F", "R", "Q", "LMB").
func demo_skill(direction: String, shift: bool, action_key: String) -> void:
	_resolve_skill(action_key, direction, shift)


func _resolve_skill(action_key: String, direction_name: String, shift: bool) -> void:
	var skill := Combo.resolve(direction_name, shift, action_key)
	if skill == Combo.MOVEMENT:
		return

	# Shift plus a direction plus an action key is the dash. Everything else is a
	# named skill with no move behind it yet; it proves the grammar reads the key
	# set correctly, including that the Shift makes a different skill.
	if shift and direction_name != "":
		if not dash.can_start(stamina):
			_say("%s not ready" % skill)
			return
		var wanted := _input_vector()
		if wanted == Vector3.ZERO:
			wanted = Vector3.FORWARD
		_dash_dir = _camera_relative(wanted)
		dash.start()
		stamina -= DashState.STAMINA_COST
		_auto_sprint = false
		_say("Dash %s" % skill)
	elif action_key == "LMB":
		if heavy.is_attacking():
			_say("Swing not ready")
		elif attack.can_start(stamina):
			attack.start()
			stamina -= AttackState.STAMINA_COST
			_say("Swing %d" % attack.step())
		else:
			_say("Swing not ready")
	elif action_key == "RMB":
		if attack.is_attacking():
			_say("Heavy not ready")
		elif heavy.can_start(stamina):
			heavy.start()
			stamina -= HeavyAttackState.STAMINA_COST
			_say("Heavy swing")
		else:
			_say("Heavy not ready")
	elif skill == "Q":
		if guard.can_start(stamina):
			guard.start()
			stamina -= GuardState.STAMINA_COST
			_say("Guard up")
		else:
			_say("Guard not ready")
	elif skill == "W+F":
		if lunge.can_start(stamina):
			lunge.start()
			stamina -= LungeState.STAMINA_COST
			_lunge_dir = _camera_relative(Vector3.FORWARD)
			# global_position raises on a Node3D that is not actually inside
			# a live SceneTree (the same reason npc_memory.gd's own
			# _post_fact_to_lab guards on is_inside_tree()): demo_skill can
			# be driven -- and this vfx asked for -- on a player built by a
			# headless test that was never added to a tree at all.
			if is_inside_tree():
				Vfx.lunge_streak(get_parent(), global_position,
					global_position + _lunge_dir * LungeState.TRAVEL_DISTANCE, Vfx.DREAMWALKER_VIOLET)
			_say("Dream Lunge")
			skill_used.emit("Dream Lunge")
		else:
			_say("Lunge not ready")
	elif skill == "R":
		if burst.can_start(stamina):
			burst.start()
			stamina -= BurstState.STAMINA_COST
			_say("Nightveil Burst")
			skill_used.emit("Nightveil Burst")
		else:
			_say("Burst not ready")
	elif skill == "E" and npc != null and npc.is_within_range(position):
		var line: String = npc.current_line(events_written)
		_say("%s: %s" % [npc.npc_name, line])
		npc.notify_talked(position)
		talked.emit(npc.npc_name, line)
	else:
		_say("Skill %s" % skill)


func _say(text: String) -> void:
	_last_event = text
	_event_age = 0.0


# A public wrapper so world.gd can override the readout's line -- for the
# night line Mireth speaks from recalled world memory -- without reaching
# into the underscore-named field directly.
func say(text: String) -> void:
	_say(text)


func _physics_process(delta: float) -> void:
	dash.advance(delta)
	attack.advance(delta)
	heavy.advance(delta)
	guard.advance(delta)
	lunge.advance(delta)
	burst.advance(delta)
	_event_age += delta
	_hit_flash_t = maxf(0.0, _hit_flash_t - delta)
	_resolve_swing()
	_resolve_heavy_swing()
	_resolve_lunge_hit()
	_resolve_burst_hit()

	var sprinting := false
	if lunge.is_lunging():
		if lunge.phase() == "travel":
			velocity.x = _lunge_dir.x * lunge.travel_speed()
			velocity.z = _lunge_dir.z * lunge.travel_speed()
		else:
			velocity.x = move_toward(velocity.x, 0.0, 40.0 * delta)
			velocity.z = move_toward(velocity.z, 0.0, 40.0 * delta)
	elif dash.is_dashing():
		var phase := dash.phase()
		if phase == "recovery":
			# Recovery is wide open and the player cannot steer out of it. This is
			# what makes a mistimed dash lose the trade.
			velocity.x = move_toward(velocity.x, 0.0, 40.0 * delta)
			velocity.z = move_toward(velocity.z, 0.0, 40.0 * delta)
		else:
			velocity.x = _dash_dir.x * DashState.SPEED
			velocity.z = _dash_dir.z * DashState.SPEED
	else:
		# Nightveil Burst never moves the player -- it is a stationary
		# shockwave -- so ordinary movement keeps running underneath it.
		var wanted := _input_vector()
		if wanted == Vector3.ZERO:
			_auto_sprint = false
		var shift := Input.is_key_pressed(KEY_SHIFT)
		sprinting = (shift or _auto_sprint) and wanted != Vector3.ZERO and stamina > 0.0
		var speed := SPRINT_SPEED if sprinting else WALK_SPEED
		var move := _camera_relative(wanted) * speed if wanted != Vector3.ZERO else Vector3.ZERO
		velocity.x = move.x
		velocity.z = move.z

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		velocity.y = 0.0

	move_and_slide()

	if sprinting:
		stamina = maxf(0.0, stamina - SPRINT_DRAIN * delta)
	elif not dash.is_dashing() and not lunge.is_lunging():
		stamina = minf(STAMINA_MAX, stamina + STAMINA_REGEN * delta)

	_face_movement(delta)
	_update_model(delta, sprinting)
	_update_camera_shake(delta)
	_spring.rotation = Vector3(_pitch, _yaw, 0.0)
	if hud:
		hud.show_state({
			"health": health, "health_max": HEALTH_MAX,
			"stamina": stamina, "stamina_max": STAMINA_MAX,
			"dash": dash, "attack": attack, "heavy": heavy, "guard": guard,
			"lunge": lunge, "burst": burst,
			"target_health": target.health if target else 0.0,
			"target_health_max": target.HEALTH_MAX if target else 0.0,
			"target_name": target.display_name if target else "",
			"event": _last_event, "event_age": _event_age,
			"auto_sprint": _auto_sprint, "events_written": events_written,
			"mouse_captured": Input.mouse_mode == Input.MOUSE_MODE_CAPTURED,
			"nearby_npc_name": npc.npc_name if npc != null and npc.is_within_range(position) else "",
		})


func _face_movement(delta: float) -> void:
	var flat := Vector3(velocity.x, 0.0, velocity.z)
	if flat.length() > 0.5:
		# Only the visible body turns. The character node itself never rotates,
		# because the camera arm hangs off it and would swing with every turn.
		# The front of the model is its -Z side, hence the negatives.
		var wanted := atan2(-flat.x, -flat.z)
		_visual.rotation.y = lerp_angle(_visual.rotation.y, wanted, clampf(12.0 * delta, 0.0, 1.0))


# Drives character_model.gd's procedural pose every physics frame: which
# state is showing (mutually exclusive, so the first one running wins) and
# how far along its own timeline it is. The gold i-frame rim (_build_gold_rim)
# is toggled alongside it, since both read the same dash state.
func _update_model(delta: float, sprinting: bool) -> void:
	if _model == null:
		return
	var action := ""
	var progress := 0.0
	if lunge.is_lunging():
		action = "lunge"
		progress = lunge.progress()
	elif burst.is_bursting():
		action = "burst"
		progress = burst.progress()
	elif dash.is_dashing():
		action = "dash"
		progress = dash.progress()
	elif heavy.is_attacking():
		action = "heavy"
		progress = heavy.progress()
	elif attack.is_attacking():
		action = "swing%d" % attack.step()
		progress = attack.progress()
	elif guard.is_guarding():
		action = "guard"
		progress = guard.progress()
	elif _hit_flash_t > 0.0:
		action = "hit"
		progress = clampf(1.0 - (_hit_flash_t / HIT_FLASH_DURATION), 0.0, 1.0)

	var speed := clampf(Vector2(velocity.x, velocity.z).length() / SPRINT_SPEED, 0.0, 1.0)
	_model.update_pose(delta, {"speed": speed, "sprint": sprinting, "action": action, "progress": progress})
	if _gold_rim != null:
		_gold_rim.visible = dash.is_invulnerable()


func _update_camera_shake(delta: float) -> void:
	if _camera == null:
		return
	if _shake_t > 0.0:
		_shake_t = maxf(0.0, _shake_t - delta)
		var amount: float = _shake_amount * (_shake_t / _shake_duration if _shake_duration > 0.0 else 0.0)
		_camera.h_offset = randf_range(-amount, amount)
		_camera.v_offset = randf_range(-amount, amount)
	else:
		_camera.h_offset = 0.0
		_camera.v_offset = 0.0


func _trigger_shake(amount: float, duration: float) -> void:
	_shake_amount = amount
	_shake_duration = duration
	_shake_t = duration


# Called by the dummy's/Sentinel's beam. Returns true when the hit landed.
func try_hit(damage: float, attack_name := "Focus Beam") -> bool:
	if dash.is_invulnerable():
		_say("PERFECT DODGE")
		if is_inside_tree():
			Vfx.perfect_dodge(get_parent(), global_position)
		_record_perfect_dodge(attack_name)
		perfect_dodge_confirmed.emit(attack_name)
		return false
	var taken := damage
	var blocked := guard.is_active()
	if blocked:
		taken *= (1.0 - GuardState.BLOCK_REDUCTION)
	health = maxf(0.0, health - taken)
	_hit_flash_t = HIT_FLASH_DURATION
	if health <= 0.0:
		health = HEALTH_MAX
		_say("DOWN - health reset")
	elif blocked:
		_say("BLOCKED for %d" % int(taken))
	else:
		_say("HIT for %d" % int(taken))
	return true


func _resolve_swing() -> void:
	if target == null or not attack.take_hit_window():
		return
	var facing := Movement.camera_relative(Vector3(0.0, 0.0, -1.0), _yaw)
	var to_target := target.global_position - global_position
	to_target.y = 0.0
	if to_target.length() > AttackState.REACH:
		_say("Swing %d missed" % attack.step())
		return
	if absf(facing.signed_angle_to(to_target.normalized(), Vector3.UP)) > AttackState.HALF_ARC:
		_say("Swing %d missed" % attack.step())
		return
	var damage := attack.damage_for_step(attack.step())
	target.take_hit(damage)
	_say("Swing %d hit for %d" % [attack.step(), int(damage)])
	# Steps 1 and 3 sweep one way, step 2 sweeps back the other, so a light
	# chain reads as a real alternating combo rather than the same cut three
	# times.
	var half := AttackState.HALF_ARC
	if attack.step() == 2:
		Vfx.slash_arc(get_parent(), global_position, _yaw, half, -half,
			AttackState.REACH * 0.7, Vfx.DREAMWALKER_VIOLET, 1.1)
	else:
		Vfx.slash_arc(get_parent(), global_position, _yaw, -half, half,
			AttackState.REACH * 0.7, Vfx.DREAMWALKER_VIOLET, 1.1)
	Vfx.damage_number(get_parent(), target.global_position + Vector3(0.0, 1.9, 0.0),
		damage, Vfx.DREAMWALKER_VIOLET)


func _resolve_heavy_swing() -> void:
	if target == null or not heavy.take_hit_window():
		return
	var facing := Movement.camera_relative(Vector3(0.0, 0.0, -1.0), _yaw)
	var to_target := target.global_position - global_position
	to_target.y = 0.0
	if to_target.length() > HeavyAttackState.REACH:
		_say("Heavy swing missed")
		return
	if absf(facing.signed_angle_to(to_target.normalized(), Vector3.UP)) > HeavyAttackState.HALF_ARC:
		_say("Heavy swing missed")
		return
	target.take_hit(HeavyAttackState.DAMAGE)
	_say("Heavy swing hit for %d" % int(HeavyAttackState.DAMAGE))
	Vfx.slash_arc(get_parent(), global_position, _yaw, -1.3, 1.3,
		HeavyAttackState.REACH * 0.8, Vfx.DREAMWALKER_VIOLET, 1.3, true)
	Vfx.damage_number(get_parent(), target.global_position + Vector3(0.0, 1.9, 0.0),
		HeavyAttackState.DAMAGE, Vfx.DREAMWALKER_VIOLET)
	heavy_hit_landed.emit(HeavyAttackState.DAMAGE)
	_trigger_shake(0.035, 0.18)


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
	if not burst.take_hit_window():
		return
	# The ring goes off the instant the window opens -- after the wind-up --
	# regardless of whether anything is standing inside it, so the shockwave
	# always reads even on a whiff.
	Vfx.ring(get_parent(), global_position, BurstState.RADIUS, Vfx.DREAMWALKER_VIOLET)
	_trigger_shake(0.05, 0.25)
	if target == null or not BurstState.hits(global_position, target.global_position):
		return
	target.take_hit(BurstState.DAMAGE)
	_say("Nightveil Burst hit for %d" % int(BurstState.DAMAGE))
	Vfx.damage_number(get_parent(), target.global_position + Vector3(0.0, 1.9, 0.0),
		BurstState.DAMAGE, Vfx.DREAMWALKER_VIOLET)


# A confirmed invulnerability-frame dodge is the P1 event of spec 001. It is
# written to an append-only JSONL log in the envelope of the event contract.
func _record_perfect_dodge(attack_name: String) -> void:
	var event := WorldEvent.perfect_dodge(
		"player-001", "cross-eyed-0001", "openaeye-001", attack_name, "first-gate")
	if events.append(event):
		events_written += 1
