extends SceneTree

const BASE := preload("res://assets/third_party/quaternius/UniversalBaseCharacter.glb")
const RANGER := preload("res://assets/third_party/quaternius_outfits/Male_Ranger.gltf")

func _initialize() -> void:
	_print_scene("BASE", BASE.instantiate())
	_print_scene("RANGER", RANGER.instantiate())
	quit()

func _print_scene(label: String, node: Node) -> void:
	print("=== ", label, " ===")
	_print_tree(node, "")
	var skeleton := _find_skeleton(node)
	if skeleton != null:
		print("BONES ", skeleton.get_bone_count())
		for i in skeleton.get_bone_count():
			print(i, ":", skeleton.get_bone_name(i), " parent=", skeleton.get_bone_parent(i))
	node.free()

func _print_tree(node: Node, prefix: String) -> void:
	print(prefix, node.name, " [", node.get_class(), "]")
	for child in node.get_children():
		_print_tree(child, prefix + "  ")

func _find_skeleton(node: Node) -> Skeleton3D:
	if node is Skeleton3D:
		return node
	for child in node.get_children():
		var found := _find_skeleton(child)
		if found != null:
			return found
	return null
