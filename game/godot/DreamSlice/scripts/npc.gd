extends Node3D

# A stationary, friendly NPC the player can walk up to and talk to. Added
# 2026-09-22: until now the only other body in the slice was the training
# dummy, an enemy, so there was no one in the world to interact with.
#
# Range is plain geometry, the same pattern as the dummy's beam, so the same
# check can run headless and, later, on a server.

const INTERACT_RADIUS := 3.0

var npc_name := ""
var dialogue_line := ""
var after_dodge_line := ""


func _ready() -> void:
	var mesh := MeshInstance3D.new()
	var body := CapsuleMesh.new()
	body.radius = 0.4
	body.height = 1.8
	mesh.mesh = body
	mesh.position = Vector3(0.0, 0.9, 0.0)
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.55, 0.75, 0.45)
	mesh.material_override = material
	add_child(mesh)

	var post := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.4
	capsule.height = 1.8
	shape.shape = capsule
	shape.position = Vector3(0.0, 0.9, 0.0)
	post.add_child(shape)
	add_child(post)


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
