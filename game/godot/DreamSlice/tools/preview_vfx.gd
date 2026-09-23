extends SceneTree

# A gallery stage for the vfx.gd effects, frozen mid-play, for the lane to
# actually look at rather than take a worker's word for (docs/gdd note
# carried over from world.gd's own capture script). Run in a real window --
# a headless run has no viewport texture worth reading:
#
#   godot --path game/godot/DreamSlice --script res://tools/preview_vfx.gd -- --out <abs.png>
#
# Every effect is spawned once, in _initialize(), and then left alone: the
# engine's own per-frame dispatch calls each effect's driver script exactly
# the way it would in the real game, so it fades and moves for a handful of
# real frames before the capture. Do not "help" this by calling an effect's
# _process() by hand to fast-forward it -- that was tried on 2026-09-23 and
# it silently breaks the RenderingServer's picture of the mesh: the node
# still has the right mesh, the right material, the right transform, and
# get_child_count() still says one, but nothing at all shows up in the
# rendered frame. Calling _process() through the engine's own scheduler,
# rather than invoking the method directly, is what actually keeps the
# renderer in sync, and it costs nothing here since the stage is otherwise
# idle.

const Vfx := preload("res://scripts/vfx.gd")

var _out_path := ""
var _frame := 0
var _captured := false
const CAPTURE_AT_FRAME := 3


func _initialize() -> void:
	_read_args()
	var world := Node3D.new()
	root.add_child(world)
	_build_stage(world)
	_spawn_effects(world)


func _process(_delta: float) -> bool:
	_frame += 1
	if _frame >= CAPTURE_AT_FRAME and not _captured:
		_captured = true
		_save_picture()
		return true
	return false


func _read_args() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--out" and i + 1 < args.size():
			_out_path = args[i + 1]


func _save_picture() -> void:
	if _out_path == "":
		print("preview_vfx: no --out path given, nothing saved")
		quit(1)
		return
	var image := root.get_viewport().get_texture().get_image()
	var err := image.save_png(_out_path)
	print("preview_vfx: saved ", _out_path, " result ", err)
	quit(0 if err == OK else 1)


func _build_stage(world: Node3D) -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.015, 0.015, 0.03)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.10, 0.09, 0.14)
	env.ambient_light_energy = 0.5
	env.glow_enabled = true
	env.glow_intensity = 1.3
	env.glow_bloom = 0.30
	env.glow_hdr_threshold = 0.7
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var we := WorldEnvironment.new()
	we.environment = env
	world.add_child(we)

	var floor_mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(30.0, 26.0)
	floor_mesh.mesh = plane
	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color(0.045, 0.045, 0.07)
	floor_mat.roughness = 1.0
	floor_mesh.material_override = floor_mat
	world.add_child(floor_mesh)

	var rim := DirectionalLight3D.new()
	rim.light_color = Color(0.55, 0.55, 0.80)
	rim.light_energy = 0.45
	rim.rotation_degrees = Vector3(-40.0, 140.0, 0.0)
	world.add_child(rim)

	var fill := DirectionalLight3D.new()
	fill.light_color = Color(0.45, 0.35, 0.55)
	fill.light_energy = 0.18
	fill.rotation_degrees = Vector3(-25.0, -50.0, 0.0)
	world.add_child(fill)

	var camera := Camera3D.new()
	camera.fov = 62.0
	# No rotation at all: the camera looks straight down -Z with +Y up, the
	# engine's own default orientation, so world X maps straight onto screen
	# X and world Y onto screen Y with no perspective skew to fight. Every
	# earlier draft of this stage used look_at() from an elevated, angled
	# position, and kept putting effects just outside the frame or stacking
	# two rows on top of each other in a way that took several renders each
	# to untangle. A flat line-up facing the camera head-on, the way a shelf
	# of exhibits would be lit, is far easier to reason about and to read.
	camera.position = Vector3(0.0, 2.4, 19.0)
	world.add_child(camera)
	camera.current = true


func _pedestal(world: Node3D, at: Vector3) -> void:
	var mesh := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 1.0
	cyl.bottom_radius = 1.15
	cyl.height = 0.15
	mesh.mesh = cyl
	mesh.position = at + Vector3(0.0, 0.075, 0.0)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.07, 0.07, 0.10)
	mat.roughness = 0.6
	mesh.material_override = mat
	world.add_child(mesh)


# One row, all nine at the same depth, facing the camera head-on. Every
# item's own footprint is 2-3 metres across, so 2.8 apart keeps neighbours
# from bleeding into each other while still fitting the frame set up in
# _build_stage.
func _spawn_effects(world: Node3D) -> void:
	var violet := Vfx.DREAMWALKER_VIOLET
	var gold := Vfx.PERFECT_GOLD
	var sentinel_amber := Color(1.0, 0.55, 0.15)

	var step := 2.8
	var xs := []
	for i in range(9):
		xs.append((float(i) - 4.0) * step)

	var a := Vector3(xs[0], 0.0, 0.0)
	_pedestal(world, a)
	Vfx.slash_arc(world, a, 0.0, -0.9, 0.9, 1.7, violet, 1.1)

	var b := Vector3(xs[1], 0.0, 0.0)
	_pedestal(world, b)
	Vfx.slash_arc(world, b, 0.0, -1.3, 1.3, 2.0, violet, 1.3, true)

	var c := Vector3(xs[2], 0.0, 0.0)
	_pedestal(world, c)
	Vfx.impact(world, c + Vector3(0.0, 1.3, 0.0), gold)

	var d := Vector3(xs[3], 0.0, 0.0)
	_pedestal(world, d)
	Vfx.ring(world, d, 1.2, violet)

	var e := Vector3(xs[4], 0.0, 0.0)
	Vfx.lunge_streak(world, e + Vector3(-1.0, 0.0, 0.9), e + Vector3(1.0, 0.0, -0.9), violet)

	var f := Vector3(xs[5], 0.0, 0.0)
	_pedestal(world, f)
	Vfx.perfect_dodge(world, f)

	var g := Vector3(xs[6], 0.0, 0.0)
	Vfx.damage_number(world, g + Vector3(0.0, 1.7, 0.0), 25.0, gold)

	var h := Vector3(xs[7], 0.0, 0.0)
	Vfx.beam_telegraph(world, h + Vector3(-1.3, 1.1, 1.4), h + Vector3(1.3, 1.1, -1.4), 0.95)

	var i := Vector3(xs[8], 0.0, 0.0)
	Vfx.beam_fire(world, i + Vector3(-1.3, 1.1, 1.4), i + Vector3(1.3, 1.1, -1.4), sentinel_amber)
