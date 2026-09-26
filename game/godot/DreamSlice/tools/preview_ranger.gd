extends SceneTree

const OUTFIT := preload("res://assets/third_party/quaternius_outfits/Male_Ranger.gltf")

var frame := 0
var stage := 0
var model: Node3D
var camera: Camera3D

func _initialize() -> void:
	var world := Node3D.new()
	root.add_child(world)

	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.055, 0.065, 0.085)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.55, 0.62, 0.75)
	env.ambient_light_energy = 0.75
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var we := WorldEnvironment.new()
	we.environment = env
	world.add_child(we)

	var floor_mesh := MeshInstance3D.new()
	var floor := PlaneMesh.new()
	floor.size = Vector2(8.0, 8.0)
	floor_mesh.mesh = floor
	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color(0.18, 0.19, 0.22)
	floor_mat.roughness = 0.9
	floor_mesh.material_override = floor_mat
	world.add_child(floor_mesh)

	var key := DirectionalLight3D.new()
	key.light_energy = 1.5
	key.light_color = Color(1.0, 0.90, 0.76)
	world.add_child(key)
	key.look_at_from_position(Vector3(2.5, 3.0, -3.0), Vector3(0.0, 1.0, 0.0), Vector3.UP)

	var rim := DirectionalLight3D.new()
	rim.light_energy = 0.9
	rim.light_color = Color(0.42, 0.68, 1.0)
	world.add_child(rim)
	rim.look_at_from_position(Vector3(-2.0, 2.0, 3.0), Vector3(0.0, 1.0, 0.0), Vector3.UP)

	model = OUTFIT.instantiate()
	world.add_child(model)

	camera = Camera3D.new()
	camera.fov = 42.0
	camera.look_at_from_position(Vector3(0.0, 1.35, -3.4), Vector3(0.0, 1.0, 0.0), Vector3.UP)
	camera.current = true
	root.add_child(camera)

func _process(_delta: float) -> bool:
	frame += 1
	if stage == 0 and frame >= 20:
		_save("C:/DREAM/recon/ranger-outfit-front.png")
		model.rotation.y = PI
		stage = 1
		frame = 0
	elif stage == 1 and frame >= 12:
		_save("C:/DREAM/recon/ranger-outfit-back.png")
		return true
	return false

func _save(path: String) -> void:
	var err := root.get_texture().get_image().save_png(path)
	print("preview_ranger: ", path, " result ", err)
