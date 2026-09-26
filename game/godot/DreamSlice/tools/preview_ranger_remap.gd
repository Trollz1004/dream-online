extends SceneTree

const BASE := preload("res://assets/third_party/quaternius/UniversalBaseCharacter.glb")
const RANGER := preload("res://assets/third_party/quaternius_outfits/Male_Ranger.gltf")

var frame := 0
var stage := 0
var model: Node3D
var anim: AnimationPlayer
var camera: Camera3D

# Map the old Universal Base Character animation-track bone names to the
# newer modular-outfit skeleton.  The outfit keeps its own names so its Skin
# bind names remain valid; only duplicated animation track paths are remapped.
const BONE_MAP := {
	"DEF-hips": "pelvis",
	"DEF-spine.001": "spine_01", "DEF-spine.002": "spine_02", "DEF-spine.003": "spine_03",
	"DEF-neck": "neck_01", "DEF-head": "Head",
	"DEF-shoulder.L": "clavicle_l", "DEF-upper_arm.L": "upperarm_l", "DEF-forearm.L": "lowerarm_l", "DEF-hand.L": "hand_l",
	"DEF-shoulder.R": "clavicle_r", "DEF-upper_arm.R": "upperarm_r", "DEF-forearm.R": "lowerarm_r", "DEF-hand.R": "hand_r",
	"DEF-thigh.L": "thigh_l", "DEF-shin.L": "calf_l", "DEF-foot.L": "foot_l", "DEF-toe.L": "ball_l",
	"DEF-thigh.R": "thigh_r", "DEF-shin.R": "calf_r", "DEF-foot.R": "foot_r", "DEF-toe.R": "ball_r",
	"DEF-f_index.01.L": "index_01_l", "DEF-f_index.02.L": "index_02_l", "DEF-f_index.03.L": "index_03_l",
	"DEF-f_middle.01.L": "middle_01_l", "DEF-f_middle.02.L": "middle_02_l", "DEF-f_middle.03.L": "middle_03_l",
	"DEF-f_pinky.01.L": "pinky_01_l", "DEF-f_pinky.02.L": "pinky_02_l", "DEF-f_pinky.03.L": "pinky_03_l",
	"DEF-f_ring.01.L": "ring_01_l", "DEF-f_ring.02.L": "ring_02_l", "DEF-f_ring.03.L": "ring_03_l",
	"DEF-thumb.01.L": "thumb_01_l", "DEF-thumb.02.L": "thumb_02_l", "DEF-thumb.03.L": "thumb_03_l",
	"DEF-f_index.01.R": "index_01_r", "DEF-f_index.02.R": "index_02_r", "DEF-f_index.03.R": "index_03_r",
	"DEF-f_middle.01.R": "middle_01_r", "DEF-f_middle.02.R": "middle_02_r", "DEF-f_middle.03.R": "middle_03_r",
	"DEF-f_pinky.01.R": "pinky_01_r", "DEF-f_pinky.02.R": "pinky_02_r", "DEF-f_pinky.03.R": "pinky_03_r",
	"DEF-f_ring.01.R": "ring_01_r", "DEF-f_ring.02.R": "ring_02_r", "DEF-f_ring.03.R": "ring_03_r",
	"DEF-thumb.01.R": "thumb_01_r", "DEF-thumb.02.R": "thumb_02_r", "DEF-thumb.03.R": "thumb_03_r"
}

func _initialize() -> void:
	var world := Node3D.new()
	root.add_child(world)
	_build_environment(world)
	model = _build_animated_ranger()
	world.add_child(model)
	camera = Camera3D.new()
	camera.fov = 44.0
	camera.look_at_from_position(Vector3(0.0, 1.35, -3.2), Vector3(0.0, 1.0, 0.0), Vector3.UP)
	camera.current = true
	root.add_child(camera)
	_pose("Rig|Walk", 0.45)

func _build_animated_ranger() -> Node3D:
	var ranger := RANGER.instantiate()
	var armature: Node3D = ranger.get_node("Armature")
	var skeleton: Skeleton3D = armature.get_node("Skeleton3D")
	armature.remove_child(skeleton)
	skeleton.owner = null
	var root_node := Node3D.new()
	root_node.name = "RootNode"
	var rig := Node3D.new()
	rig.name = "Rig"
	ranger.add_child(root_node)
	root_node.add_child(rig)
	rig.add_child(skeleton)
	armature.free()

	var base := BASE.instantiate()
	var base_player: AnimationPlayer = base.get_node("AnimationPlayer")
	anim = AnimationPlayer.new()
	anim.name = "AnimationPlayer"
	for library_name in base_player.get_animation_library_list():
		var source_library := base_player.get_animation_library(library_name)
		var target_library := AnimationLibrary.new()
		for animation_name in source_library.get_animation_list():
			var source_animation := source_library.get_animation(animation_name)
			var target_animation: Animation = source_animation.duplicate(true)
			for track_index in target_animation.get_track_count():
				var path_text := String(target_animation.track_get_path(track_index))
				for old_name in BONE_MAP:
					path_text = path_text.replace(old_name, BONE_MAP[old_name])
				target_animation.track_set_path(track_index, NodePath(path_text))
			target_library.add_animation(animation_name, target_animation)
		anim.add_animation_library(library_name, target_library)
	ranger.add_child(anim)
	base.free()
	print("animations: ", anim.get_animation_list())
	return ranger

func _pose(clip: String, ratio: float) -> void:
	anim.play(clip)
	var animation := anim.get_animation(clip)
	anim.seek(animation.length * ratio, true)

func _process(_delta: float) -> bool:
	frame += 1
	if stage == 0 and frame >= 20:
		_save("C:/DREAM/recon/ranger-remap-walk.png")
		_pose("Rig|Sword_Attack", 0.48)
		stage = 1
		frame = 0
	elif stage == 1 and frame >= 12:
		_save("C:/DREAM/recon/ranger-remap-attack.png")
		model.rotation.y = PI
		_pose("Rig|Walk", 0.62)
		stage = 2
		frame = 0
	elif stage == 2 and frame >= 12:
		_save("C:/DREAM/recon/ranger-remap-back.png")
		return true
	return false

func _build_environment(world: Node3D) -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.055, 0.065, 0.085)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.55, 0.62, 0.75)
	env.ambient_light_energy = 0.78
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var we := WorldEnvironment.new()
	we.environment = env
	world.add_child(we)
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

func _save(path: String) -> void:
	var err := root.get_texture().get_image().save_png(path)
	print("preview_ranger_remap: ", path, " result ", err)
