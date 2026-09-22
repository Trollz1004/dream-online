extends Node3D

# Builds the whole combat slice in code, so there is no scene file to hand-wire
# and every part of the world can be read, reviewed and changed as text.
#
# Day Dream palette per docs/gdd/08-day-dreams-night-dreams-world.md: old-world
# fields, warm light, nothing modern. Shapes only until licensed art lands.

const PlayerScript := preload("res://scripts/player.gd")
const DummyScript := preload("res://scripts/dummy.gd")
const HudScript := preload("res://scripts/hud.gd")

const GROUND_SIZE := 120.0


var _capture_path := ""
var _capture_at := 2.0
var _demo_move := Vector3.ZERO
var _demo_yaw := 0.0


func _ready() -> void:
	_read_capture_flag()
	_build_sky_and_light()
	_build_ground()
	_build_scenery()
	var hud := HudScript.new()
	add_child(hud)
	var player := PlayerScript.new()
	player.position = Vector3(0.0, 1.2, 6.0)
	player.hud = hud
	# Everything the player reads inside _ready has to be set before it is added
	# to the tree, because add_child is what runs _ready. These three used to be
	# assigned after, and two things were quietly wrong for it: a capture run
	# took the real mouse pointer, because the player saw capture_mode as false
	# and grabbed it; and `--yaw` did nothing at all, because demo_yaw is read
	# only at _ready and always arrived a moment too late. Found on 2026-09-21 by
	# probing a real run after a captured frame failed to show a new line.
	player.capture_mode = _capture_path != ""
	player.demo_move = _demo_move
	player.demo_yaw = _demo_yaw
	add_child(player)
	var dummy := DummyScript.new()
	dummy.position = Vector3(0.0, 0.0, -6.0)
	dummy.player = player
	add_child(dummy)
	player.target = dummy
	if _capture_path != "":
		_capture_after(_capture_at)


# Run with:  godot --path <project> -- --capture <file.png>
# The lane looks at the picture itself; a worker's word on its own image is
# never accepted (the trap of 2026-09-20).
func _read_capture_flag() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--capture" and i + 1 < args.size():
			_capture_path = args[i + 1]
		if args[i] == "--at" and i + 1 < args.size():
			_capture_at = float(args[i + 1])
		if args[i] == "--move" and i + 1 < args.size():
			var pair := args[i + 1].split(",")
			if pair.size() == 2:
				_demo_move = Vector3(float(pair[0]), 0.0, float(pair[1]))
		if args[i] == "--yaw" and i + 1 < args.size():
			_demo_yaw = float(args[i + 1])


func _capture_after(seconds: float) -> void:
	var timer := get_tree().create_timer(seconds)
	timer.timeout.connect(_save_picture)


func _save_picture() -> void:
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var err := image.save_png(_capture_path)
	print("capture: ", _capture_path, " result ", err)
	get_tree().quit(0 if err == OK else 1)


func _build_sky_and_light() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var mat := ProceduralSkyMaterial.new()
	mat.sky_top_color = Color(0.32, 0.50, 0.74)
	mat.sky_horizon_color = Color(0.78, 0.72, 0.58)
	mat.ground_bottom_color = Color(0.22, 0.20, 0.16)
	mat.ground_horizon_color = Color(0.60, 0.55, 0.44)
	sky.sky_material = mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.9
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	# Warm afternoon sun, kept high so no face falls into sky shadow. The low-sun
	# reddening trap from the Unreal maps applies here too: keep the light near
	# white and let the sky do the colour.
	var sun := DirectionalLight3D.new()
	sun.light_energy = 2.2
	sun.light_color = Color(1.0, 0.97, 0.90)
	# Shadows are the single most expensive thing in this scene and the browser
	# build runs on WebGL 2 with one thread, so it goes without them.
	sun.shadow_enabled = not OS.has_feature("web")
	sun.rotation_degrees = Vector3(-46.0, 38.0, 0.0)
	add_child(sun)


func _build_ground() -> void:
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(GROUND_SIZE, 1.0, GROUND_SIZE)
	shape.shape = box
	shape.position = Vector3(0.0, -0.5, 0.0)
	body.add_child(shape)

	var mesh := MeshInstance3D.new()
	var cube := BoxMesh.new()
	cube.size = Vector3(GROUND_SIZE, 1.0, GROUND_SIZE)
	mesh.mesh = cube
	mesh.position = Vector3(0.0, -0.5, 0.0)
	mesh.material_override = _material(Color(0.36, 0.40, 0.24))
	body.add_child(mesh)
	add_child(body)


# A few blocks so movement and dashing read against something. Placed off the
# fighting ground so they never trap the player against the dummy.
func _build_scenery() -> void:
	var spots := [
		Vector3(-14.0, 1.5, -12.0), Vector3(-9.0, 1.0, -16.0),
		Vector3(13.0, 2.0, -10.0), Vector3(17.0, 1.0, 2.0),
		Vector3(-16.0, 1.0, 5.0), Vector3(8.0, 1.5, 14.0),
	]
	var stone := _material(Color(0.52, 0.48, 0.42))
	var i := 0
	for spot in spots:
		var mesh := MeshInstance3D.new()
		var cube := BoxMesh.new()
		var h: float = 2.0 + float(i % 3)
		cube.size = Vector3(3.0, h, 3.0)
		mesh.mesh = cube
		mesh.position = Vector3(spot.x, h * 0.5, spot.z)
		mesh.rotation_degrees = Vector3(0.0, float(i) * 21.0, 0.0)
		mesh.material_override = stone
		add_child(mesh)

		var body := StaticBody3D.new()
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = cube.size
		shape.shape = box
		body.position = mesh.position
		body.rotation_degrees = mesh.rotation_degrees
		body.add_child(shape)
		add_child(body)
		i += 1


func _material(colour: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = colour
	m.roughness = 0.9
	return m
