extends SceneTree

const CharacterModelScript := preload("res://scripts/character_model.gd")

func _initialize() -> void:
	var model = CharacterModelScript.build("dreamwalker")
	model.update_pose(0.016, {"action": "guard", "speed": 0.0, "sprint": false, "progress": 0.55})
	for bone_name in ["lowerarm_l", "hand_l", "spine_03"]:
		var idx: int = model._skeleton.find_bone(bone_name)
		var t: Transform3D = model._node_world_transform(model._skeleton) * model._bone_chain_transform(model._skeleton, idx)
		print(bone_name, " origin=", t.origin,
			" x=", t.basis.x.normalized(), " y=", t.basis.y.normalized(), " z=", t.basis.z.normalized())
	model.free()
	quit()
