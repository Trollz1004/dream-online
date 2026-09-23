extends SceneTree

# A lit little stage for the three character kinds, so this lane can look at
# its own work instead of taking its own word for it. Run in a real window
# (rendering the framebuffer needs one; --headless never fills it):
#   godot --path game/godot/DreamSlice --script res://tools/preview_characters.gd -- --out <abs.png>
#
# Saves a wide shot to the given path, and a second, closer shot next to it
# (".png" -> "_close.png") so gear and face detail can be checked too.

const CharacterModelScript := preload("res://scripts/character_model.gd")

# Wide enough apart that the sentinel's heavy arms clear its neighbours,
# tight enough that the whole cast still fits a close camera.
const CAST_X := [-2.6, -1.3, 0.0, 1.3, 2.6]
const CAST_KINDS := ["dreamwalker", "keeper", "sentinel", "dreamwalker", "dreamwalker"]

var _out_path := ""
var _out_close_path := ""
var _frame := 0
var _stage := 0   # 0: waiting to take the wide shot, 1: waiting on the close-up, 2: done

var _root3d: Node3D
var _camera: Camera3D
var _wide_eye := Vector3.ZERO
var _wide_at := Vector3.ZERO
var _close_eye := Vector3.ZERO
var _close_at := Vector3.ZERO


func _initialize() -> void:
	_read_args()
	_build_stage()


# Rendering a real frame takes a beat even in a window, and the models here
# carry emissive materials that want a frame or two to settle. Counting
# frames rather than a fixed sleep also keeps this from racing a slow CI box.
func _process(_delta: float) -> bool:
	_frame += 1
	if _stage == 0 and _frame >= 14:
		_save(_out_path)
		_camera.look_at_from_position(_close_eye, _close_at, Vector3.UP)
		_stage = 1
		_frame = 0
	elif _stage == 1 and _frame >= 8:
		_save(_out_close_path)
		_stage = 2
	return _stage == 2


func _read_args() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--out" and i + 1 < args.size():
			_out_path = args[i + 1]
	if _out_path == "":
		_out_path = "user://chars.png"
	if _out_path.ends_with(".png"):
		_out_close_path = _out_path.substr(0, _out_path.length() - 4) + "_close.png"
	else:
		_out_close_path = _out_path + "_close.png"


func _save(path: String) -> void:
	var image := root.get_texture().get_image()
	var err := image.save_png(path)
	print("preview_characters: ", path, " result ", err)


func _build_stage() -> void:
	_root3d = Node3D.new()
	root.add_child(_root3d)

	_build_environment()
	_build_ground()
	_build_lights()
	_build_cast()

	_camera = Camera3D.new()
	# The rig faces -Z (see player.gd's nose block), so a camera has to sit on
	# the -Z side of the cast, looking back toward +Z, to see faces rather
	# than the backs of heads. Close and wide-FOV on purpose: a judge cannot
	# assess a character that is a speck in the middle of a big empty stage.
	_camera.fov = 55.0
	_wide_eye = Vector3(0.0, 1.55, -3.3)
	_wide_at = Vector3(0.0, 1.15, 0.0)
	_close_eye = Vector3(CAST_X[0], 1.55, -1.7)
	_close_at = Vector3(CAST_X[0], 1.25, 0.0)
	_camera.look_at_from_position(_wide_eye, _wide_at, Vector3.UP)
	_camera.current = true
	root.add_child(_camera)


func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var mat := ProceduralSkyMaterial.new()
	mat.sky_top_color = Color(0.26, 0.40, 0.58)
	mat.sky_horizon_color = Color(0.74, 0.66, 0.53)
	mat.ground_bottom_color = Color(0.17, 0.16, 0.14)
	mat.ground_horizon_color = Color(0.52, 0.48, 0.40)
	sky.sky_material = mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_energy = 0.55
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	# Bloom is for the atmosphere of the real game, not a technical review
	# render: it was blowing a modest specular highlight on the dark hair
	# out into a pale dome that read as a cap. Off here so colours read true.
	env.glow_enabled = false
	var we := WorldEnvironment.new()
	we.environment = env
	_root3d.add_child(we)


# A neutral ground, wide enough for five characters side by side.
func _build_ground() -> void:
	var mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(22.0, 10.0)
	mesh.mesh = plane
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.30, 0.30, 0.33)
	mat.roughness = 0.95
	mesh.material_override = mat
	_root3d.add_child(mesh)


func _build_lights() -> void:
	# The cast faces -Z and the camera sits on the -Z side (see _build_stage),
	# so the key light has to travel toward +Z too, or it only ever grazes
	# the backs of heads and leaves every face in flat ambient shadow. Aimed
	# with look_at_from_position rather than guessed Euler angles so this is
	# not a game of trial and error.
	var key := DirectionalLight3D.new()
	key.light_energy = 1.7
	key.light_color = Color(1.0, 0.90, 0.74)
	root.add_child(key)
	key.look_at_from_position(Vector3(2.2, 3.4, -3.6), Vector3.ZERO, Vector3.UP)

	var rim := DirectionalLight3D.new()
	rim.light_energy = 1.2
	rim.light_color = Color(0.55, 0.70, 1.0)
	root.add_child(rim)
	rim.look_at_from_position(Vector3(-2.5, 2.2, 3.2), Vector3.ZERO, Vector3.UP)


# The three kinds side by side, plus a dreamwalker mid-heavy and a third on
# guard, per the brief.
func _build_cast() -> void:
	var poses := [
		{"speed": 0.0, "sprint": false, "action": "", "progress": 0.0},
		{"speed": 0.0, "sprint": false, "action": "talk", "progress": 0.25},
		{"speed": 0.0, "sprint": false, "action": "", "progress": 0.0},
		{"speed": 0.0, "sprint": false, "action": "heavy", "progress": 0.55},
		{"speed": 0.0, "sprint": false, "action": "guard", "progress": 0.6},
	]
	for i in CAST_KINDS.size():
		var model = CharacterModelScript.build(CAST_KINDS[i])
		model.position = Vector3(CAST_X[i], 0.0, 0.0)
		model.set_time_of_day("day")
		model.set_blade_glow(0.7)
		model.update_pose(1.0 / 60.0, poses[i])
		_root3d.add_child(model)
