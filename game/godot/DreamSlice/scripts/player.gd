extends CharacterBody3D

# The player for the combat slice. Everything here follows Joshua's rulings of
# 2026-09-20 recorded in docs/gdd/02-action-combat.md:
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
const WorldEvent := preload("res://scripts/world_event.gd")
const EventLog := preload("res://scripts/event_log.gd")

const WALK_SPEED := 5.5
const SPRINT_SPEED := 9.5
const GRAVITY := 24.0
const MOUSE_SENS := 0.0022
const STAMINA_MAX := 100.0
const STAMINA_REGEN := 20.0
const SPRINT_DRAIN := 10.0
const DOUBLE_TAP_WINDOW := 0.30
const HEALTH_MAX := 100.0

var dash := DashState.new()
var attack := AttackState.new()
var heavy := HeavyAttackState.new()
var target: Node3D = null          # what a swing can reach
var npc: Node3D = null             # who a plain E can talk to, in range
var events = EventLog.new()
var event_path := "user://world-events.jsonl"
var events_written := 0
var stamina := STAMINA_MAX
var health := HEALTH_MAX
var hud: Node = null

var _yaw := 0.0
var _pitch := -0.22
var _spring: SpringArm3D
var _visual: Node3D
var _mesh: MeshInstance3D
var _material: StandardMaterial3D
var _auto_sprint := false
var _last_tap := {}
var _dash_dir := Vector3.ZERO
var _last_event := "Ready"
var _event_age := 0.0
var capture_mode := false
var demo_move := Vector3.ZERO   # a scripted input, for pictures taken without a person
var demo_yaw := 0.0

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

	_mesh = MeshInstance3D.new()
	var body := CapsuleMesh.new()
	body.radius = 0.4
	body.height = 1.8
	_mesh.mesh = body
	_material = StandardMaterial3D.new()
	_material.albedo_color = Color(0.30, 0.55, 0.85)
	_mesh.material_override = _material
	_visual.add_child(_mesh)

	# A nose block, so which way the character faces is obvious at a glance.
	var nose := MeshInstance3D.new()
	var nose_mesh := BoxMesh.new()
	nose_mesh.size = Vector3(0.25, 0.25, 0.5)
	nose.mesh = nose_mesh
	nose.position = Vector3(0.0, 0.35, -0.55)
	var nose_mat := StandardMaterial3D.new()
	nose_mat.albedo_color = Color(0.95, 0.85, 0.45)
	nose.material_override = nose_mat
	_visual.add_child(nose)

	_spring = SpringArm3D.new()
	_spring.spring_length = 6.0
	_spring.position = Vector3(0.0, 1.4, 0.0)
	add_child(_spring)
	var camera := Camera3D.new()
	camera.current = true
	_spring.add_child(camera)

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
	if capture_mode and demo_move != Vector3.ZERO:
		return demo_move.normalized()
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


func _try_skill(action_key: String) -> void:
	var direction_name := _held_direction_name()
	var shift := Input.is_key_pressed(KEY_SHIFT)
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
	elif skill == "E" and npc != null and npc.is_within_range(position):
		_say("%s: %s" % [npc.npc_name, npc.dialogue_line])
	else:
		_say("Skill %s" % skill)


func _say(text: String) -> void:
	_last_event = text
	_event_age = 0.0


func _physics_process(delta: float) -> void:
	dash.advance(delta)
	attack.advance(delta)
	heavy.advance(delta)
	_event_age += delta
	_resolve_swing()
	_resolve_heavy_swing()

	var sprinting := false
	if dash.is_dashing():
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
	elif not dash.is_dashing():
		stamina = minf(STAMINA_MAX, stamina + STAMINA_REGEN * delta)

	_face_movement(delta)
	_tint()
	_spring.rotation = Vector3(_pitch, _yaw, 0.0)
	if hud:
		hud.show_state({
			"health": health, "health_max": HEALTH_MAX,
			"stamina": stamina, "stamina_max": STAMINA_MAX,
			"dash": dash, "attack": attack, "heavy": heavy,
			"target_health": target.health if target else 0.0,
			"target_health_max": target.HEALTH_MAX if target else 0.0,
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


func _tint() -> void:
	if dash.is_invulnerable():
		_material.albedo_color = Color(1.0, 0.92, 0.45)   # invulnerable, bright
	elif dash.phase() == "recovery":
		_material.albedo_color = Color(0.75, 0.35, 0.30)  # open to punishment
	else:
		_material.albedo_color = Color(0.30, 0.55, 0.85)


# Called by the dummy's beam. Returns true when the hit landed.
func try_hit(damage: float, attack_name := "Focus Beam") -> bool:
	if dash.is_invulnerable():
		_say("PERFECT DODGE")
		_record_perfect_dodge(attack_name)
		return false
	health = maxf(0.0, health - damage)
	if health <= 0.0:
		health = HEALTH_MAX
		_say("DOWN - health reset")
	else:
		_say("HIT for %d" % int(damage))
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


# A confirmed invulnerability-frame dodge is the P1 event of spec 001. It is
# written to an append-only JSONL log in the envelope of the event contract.
func _record_perfect_dodge(attack_name: String) -> void:
	var event := WorldEvent.perfect_dodge(
		"player-001", "cross-eyed-0001", "openaeye-001", attack_name, "first-gate")
	if events.append(event):
		events_written += 1
