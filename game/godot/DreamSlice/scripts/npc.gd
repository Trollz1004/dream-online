extends Node3D

# Mireth, a stationary, friendly NPC the player can walk up to and talk to.
# spec 002 (specs/002-crowdfunding-demo/spec.md, "The character"): an older
# woman in a long hooded robe, played by scripts/character_model.gd, kind
# "keeper". Added 2026-09-22 as a plain capsule; given her real body and a
# facing turn on 2026-09-23.
#
# Range is plain geometry, the same pattern as the dummy's/sentinel's beam,
# so the same check can run headless and, later, on a server.

const CharacterModelScript := preload("res://scripts/character_model.gd")

const INTERACT_RADIUS := 3.0
const TURN_SPEED := 6.0
const TALK_POSE_TIME := 2.5

var npc_name := ""
var dialogue_line := ""
var after_dodge_line := ""

var model: Node3D = null
var time_of_day := "day"

var _visual: Node3D
var _talk_timer := 0.0
var _face_yaw := 0.0
var _has_face_target := false


func _ready() -> void:
	_visual = Node3D.new()
	add_child(_visual)

	model = CharacterModelScript.build(CharacterModelScript.KIND_KEEPER)
	model.set_time_of_day(time_of_day)
	_visual.add_child(model)

	var post := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.4
	capsule.height = 1.8
	shape.shape = capsule
	shape.position = Vector3(0.0, 0.9, 0.0)
	post.add_child(shape)
	add_child(post)


func set_time_of_day(t: String) -> void:
	time_of_day = t
	if model != null:
		model.set_time_of_day(t)


# `position` rather than `global_position`: the check must run on an instance
# that is not yet in the scene tree, in a headless test, and global_position
# raises there. The NPC and the player are both placed as direct children of
# the world with no transform of its own, so the two positions agree.
func is_within_range(from_position: Vector3) -> bool:
	var to := position - from_position
	to.y = 0.0
	return to.length() <= INTERACT_RADIUS


# One flavour line was not a reason to talk to her twice. She notices once
# the player has actually landed a perfect dodge, using the count the world
# event log already keeps rather than a new system of her own.
func current_line(perfect_dodges: int) -> String:
	if perfect_dodges > 0 and after_dodge_line != "":
		return after_dodge_line
	return dialogue_line


# Called by player.gd's own E branch, the moment she actually answers. She
# turns to face whoever spoke to her and plays a short talk gesture; this
# node never reaches for the player itself (no get_parent()/owner lookups),
# only the flat position it is handed.
func notify_talked(from_position: Vector3) -> void:
	_talk_timer = TALK_POSE_TIME
	var to := from_position - position
	to.y = 0.0
	if to.length() > 0.01:
		# Same convention as player.gd's _face_movement: the model's front is
		# its -Z side, so facing a direction means rotating -Z onto it.
		_face_yaw = atan2(-to.x, -to.z)
		_has_face_target = true


func _process(delta: float) -> void:
	if _talk_timer > 0.0:
		_talk_timer = maxf(0.0, _talk_timer - delta)
	if _has_face_target and _visual != null:
		_visual.rotation.y = lerp_angle(_visual.rotation.y, _face_yaw, clampf(TURN_SPEED * delta, 0.0, 1.0))
	if model != null:
		var action := "talk" if _talk_timer > 0.0 else ""
		var progress := clampf(1.0 - (_talk_timer / TALK_POSE_TIME), 0.0, 1.0) if _talk_timer > 0.0 else 0.0
		model.update_pose(delta, {"speed": 0.0, "action": action, "progress": progress})
