extends Node3D

# The Hollow Sentinel (spec 002, specs/002-crowdfunding-demo/spec.md,
# "The character"; replaces the plain training dummy of spec 001). It fires
# one telegraphed beam on a cycle, which is what gives the dash, the guard
# and Dream Lunge's own reach something to be timed against. Directive
# section 43: the slice is a player reading and answering a telegraphed
# signature beam.
#
# The body is scripts/character_model.gd, kind "sentinel". This script keeps
# the beam/health rules character_model.gd knows nothing about, and drives
# the model's pose and its eye colour once a day; the beam's own colour
# (amber by day, violet by night, docs/gdd/08-day-dreams-night-dreams-world.md)
# is read from the model's own day/night eye constants rather than
# duplicated here, per the note at the bottom of SKILLS_WIRING.md: never
# hard-code the sentinel's colour in this file.
#
# The wind-up is long and obvious on purpose. Reading it and dashing (or
# guarding, or lunging past it) is the whole lesson.

const CharacterModelScript := preload("res://scripts/character_model.gd")
const Vfx := preload("res://scripts/vfx.gd")

const CYCLE := 4.2
const TELEGRAPH := 1.4
const ACTIVE := 0.30
const BEAM_LENGTH := 26.0
const BEAM_WIDTH := 2.2
const DAMAGE := 18.0
# Spec 002: "rises again after 4 s at full health" (spec 001's plain dummy
# used 2.5 s; the Sentinel is a bigger beat in the crowdfunding demo and
# gets a slower, more readable recovery).
const DOWN_DURATION := 4.0
const DISPLAY_NAME := "Hollow Sentinel"
const ATTACK_NAME := "Focus Beam"
const HEALTH_MAX := 120.0

## Emitted once, the instant its health reaches zero. World memory records
## sentinel_defeated from here; nothing else in this file knows about memory.
signal defeated

var player: Node3D
var display_name := DISPLAY_NAME
var health := HEALTH_MAX
var time_of_day := "day"   # set by world.gd, alongside dream_env's own mode
var model: Node3D = null

var _down_for := 0.0
var _flinch := 0.0
var _t := 0.0
var _aim := Vector3.FORWARD
var _resolved := false


func _ready() -> void:
	model = CharacterModelScript.build(CharacterModelScript.KIND_SENTINEL)
	model.set_time_of_day(time_of_day)
	add_child(model)

	var post := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.6
	capsule.height = 2.6
	shape.shape = capsule
	shape.position = Vector3(0.0, 1.3, 0.0)
	post.add_child(shape)
	add_child(post)


func set_time_of_day(t: String) -> void:
	time_of_day = t
	if model != null:
		model.set_time_of_day(t)


# amber by day, violet by night -- reusing character_model.gd's own eye
# colours (already public consts) rather than a second copy that could drift.
func _beam_colour() -> Color:
	return CharacterModelScript.S_EYE_NIGHT if time_of_day == "night" else CharacterModelScript.S_EYE_DAY


func _process(delta: float) -> void:
	if player == null:
		return

	_flinch = maxf(0.0, _flinch - delta)

	if _down_for > 0.0:
		_down_for -= delta
		if model != null:
			model.update_pose(delta, {"action": "down", "progress": 1.0})
		if _down_for <= 0.0:
			health = HEALTH_MAX
			_t = 0.0
			_resolved = false
		return

	_t = fmod(_t + delta, CYCLE)
	var telegraph_start := CYCLE - TELEGRAPH - ACTIVE
	var active_start := CYCLE - ACTIVE

	if _t < telegraph_start:
		_idle(delta)
	elif _t < active_start:
		_wind_up(delta, (_t - telegraph_start) / TELEGRAPH)
	else:
		_fire(delta)


func _idle(delta: float) -> void:
	_resolved = false
	if model != null:
		model.update_pose(delta, {"action": "hit" if _flinch > 0.0 else "", "progress": 0.2})


func _eye_position() -> Vector3:
	return global_position + Vector3(0.0, 2.15, 0.0)


func _wind_up(delta: float, progress: float) -> void:
	if progress < 0.05:
		# Aim is locked at the start of the wind-up, so moving or dashing out
		# of the line after it starts is a real answer, not luck.
		var to_player := player.global_position - global_position
		to_player.y = 0.0
		if to_player.length() > 0.01:
			_aim = to_player.normalized()
	if model != null:
		model.update_pose(delta, {"action": "cast_beam", "progress": progress})

	# Redrawn every frame of the wind-up so the line visibly thickens as
	# `progress` rises, per the note at the bottom of SKILLS_WIRING.md. No
	# colour argument: the telegraph is a universal warning, the same amber
	# regardless of which sentinel is casting it.
	var eye := _eye_position()
	var visual_length := minf(BEAM_LENGTH, global_position.distance_to(player.global_position) + 1.0)
	Vfx.beam_telegraph(get_parent(), eye, eye + _aim * visual_length, progress)


func _fire(delta: float) -> void:
	if model != null:
		model.update_pose(delta, {"action": "cast_beam", "progress": 1.0})
	if _resolved:
		return
	_resolved = true
	var eye := _eye_position()
	var visual_length := minf(BEAM_LENGTH, global_position.distance_to(player.global_position) + 1.0)
	Vfx.beam_fire(get_parent(), eye, eye + _aim * visual_length, _beam_colour())
	if _hits_player():
		player.try_hit(DAMAGE, ATTACK_NAME)


# Plain geometry rather than a physics query, so the same test can run
# headless and, later, on the server.
func _hits_player() -> bool:
	var to_player := player.global_position - global_position
	to_player.y = 0.0
	var along := to_player.dot(_aim)
	if along < 0.0 or along > BEAM_LENGTH:
		return false
	var across := (to_player - _aim * along).length()
	return across <= BEAM_WIDTH * 0.5


func take_hit(damage: float) -> void:
	if _down_for > 0.0:
		return
	health = maxf(0.0, health - damage)
	_flinch = 0.18
	if health <= 0.0:
		_down_for = DOWN_DURATION
		_resolved = true
		defeated.emit()


func is_down() -> bool:
	return _down_for > 0.0


# _process returns immediately while player is null, so this fully pauses
# the whole beam cycle -- "put it to sleep" (integration-card judge note,
# 2026-09-23): a quiet beat like the night talk with Mireth needs the
# Sentinel inert, not just out of frame. wake() always starts a fresh
# cycle from idle, so the player gets the full wind-up to get into position
# rather than resuming mid-telegraph from wherever sleep() froze it.
func sleep() -> void:
	player = null


func wake(p: Node3D) -> void:
	player = p
	_t = 0.0
	_resolved = false


# Seconds until the beam actually fires: 0.0 once it already has (or while
# down), so a caller can react to the telegraph rather than guess at its
# own copy of the cycle's timing. Used by scripts/demo_director.gd to time
# a dash so its invulnerable window lands on the fire moment -- the reward
# for reading the telegraph, not a scripted coincidence.
func time_until_fire() -> float:
	if _down_for > 0.0:
		return -1.0
	var active_start := CYCLE - ACTIVE
	if _t >= active_start:
		return 0.0
	return active_start - _t
