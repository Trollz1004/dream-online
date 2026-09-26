extends SceneTree

const CharacterModelScript := preload("res://scripts/character_model.gd")

var frame := 0
var stage := 0
var model: Node3D
var camera: Camera3D

func _initialize() -> void:
	var world := Node3D.new()
	root.add_child(world)
	_build_environment(world)
	model = CharacterModelScript.build("dreamwalker")
	model.set_time_of_day("night")
	model.update_pose(0.016, {"action": "", "speed": 0.45, "sprint": false, "progress": 0.0})
	world.add_child(model)
	camera = Camera3D.new()
	camera.fov = 43.0
	camera.look_at_from_position(Vector3(0.0, 1.35, -3.1), Vector3(0.0, 1.0, 0.0), Vector3.UP)
	camera.current = true
	root.add_child(camera)

func _process(_delta: float) -> bool:
	frame += 1
	if stage == 0 and frame >= 20:
		_save("C:/DREAM/recon/dreamwalker-outfit-front.png")
		model.rotation.y = PI
		stage = 1
		frame = 0
	elif stage == 1 and frame >= 12:
		_save("C:/DREAM/recon/dreamwalker-outfit-back.png")
		model.rotation.y = 0.0
		model.update_pose(0.016, {"action": "guard", "speed": 0.0, "sprint": false, "progress": 0.55})
		stage = 2
		frame = 0
	elif stage == 2 and frame >= 12:
		_save("C:/DREAM/recon/dreamwalker-outfit-combat-front.png")
		return true
	return false

func _build_environment(world: Node3D) -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.035, 0.045, 0.07)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.46, 0.54, 0.68)
	env.ambient_light_energy = 0.72
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var we := WorldEnvironment.new()
	we.environment = env
	world.add_child(we)
	var key := DirectionalLight3D.new()
	key.light_energy = 1.1
	key.light_color = Color(1.0, 0.88, 0.72)
	world.add_child(key)
	key.look_at_from_position(Vector3(2.5, 3.0, -3.0), Vector3(0.0, 1.0, 0.0), Vector3.UP)
	var rim := DirectionalLight3D.new()
	rim.light_energy = 0.75
	rim.light_color = Color(0.34, 0.64, 1.0)
	world.add_child(rim)
	rim.look_at_from_position(Vector3(-2.0, 2.0, 3.0), Vector3(0.0, 1.0, 0.0), Vector3.UP)

func _save(path: String) -> void:
	var err := root.get_texture().get_image().save_png(path)
	print("preview_dreamwalker_outfit: ", path, " result ", err)
