extends SceneTree

# Opens a real window, builds one Day Dream or Night Dream environment plus a
# stand-in for the player, and saves one screenshot. This does not run
# headless: shadows, glow and SSR all need an actual GPU frame to render into,
# and the whole point is to look at the picture, not trust a description of
# it.
#
#   godot --path game/godot/DreamSlice --script res://tools/preview_env.gd -- \
#       --mode day --out C:/path/to/day.png
#
#   ... --cam wide ...   for a high establishing shot instead of the game's
#       over-the-shoulder framing.

const DreamEnvScript := preload("res://scripts/dream_env.gd")

var _mode := "day"
var _out_path := ""
var _cam := "normal"
var _frame := 0
const SETTLE_FRAMES := 60   # ~1 s at 60 fps: time for shaders, shadows and
                             # volumetric fog to settle before the capture.


func _init() -> void:
	_read_args()
	if _out_path == "":
		push_error("preview_env: --out <path.png> is required")
		quit(1)
		return
	_build_scene()
	process_frame.connect(_on_frame)


func _read_args() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--mode" and i + 1 < args.size():
			_mode = args[i + 1]
		elif args[i] == "--out" and i + 1 < args.size():
			_out_path = args[i + 1]
		elif args[i] == "--cam" and i + 1 < args.size():
			_cam = args[i + 1]


func _build_scene() -> void:
	var scene := Node3D.new()
	root.add_child(scene)

	var env := DreamEnvScript.new()
	env.mode = _mode
	scene.add_child(env)

	# A stand-in for the player: the same capsule size as scripts/player.gd,
	# feet on the ground at the spawn point the layout contract names.
	var spawn: Vector3 = env.PLAYER_SPAWN
	var capsule := MeshInstance3D.new()
	var body := CapsuleMesh.new()
	body.radius = 0.4
	body.height = 1.8
	capsule.mesh = body
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.30, 0.55, 0.85)
	capsule.material_override = mat
	capsule.position = spawn + Vector3(0.0, 0.9, 0.0)
	scene.add_child(capsule)

	var camera := Camera3D.new()
	camera.current = true
	if _cam == "wide":
		# A high establishing shot, looking back down toward the lane so the
		# whole backdrop reads in one frame.
		camera.position = Vector3(spawn.x, 42.0, spawn.z + 66.0)
		camera.rotation_degrees = Vector3(-34.0, 0.0, 0.0)
	else:
		# About 6 m behind and 2.5 m up, looking toward -Z, like the spring
		# arm in scripts/player.gd (spring_length 6.0, mounted at y 1.4 above
		# a spawn already 1.2 m off the ground).
		camera.position = Vector3(spawn.x, 2.5, spawn.z + 6.0)
		camera.rotation_degrees = Vector3(-9.0, 0.0, 0.0)
	scene.add_child(camera)


func _on_frame() -> void:
	_frame += 1
	if _frame >= SETTLE_FRAMES:
		process_frame.disconnect(_on_frame)
		_capture()


func _capture() -> void:
	await RenderingServer.frame_post_draw
	var image := root.get_texture().get_image()
	var err := image.save_png(_out_path)
	print("preview: ", _out_path, " mode=", _mode, " cam=", _cam, " result ", err)
	quit(0 if err == OK else 1)
