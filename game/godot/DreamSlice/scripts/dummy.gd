extends Node3D

# The training dummy. It fires one telegraphed beam on a cycle, which is what
# gives the dash something to be timed against. Directive section 43: the slice
# is a player perfect-dodging a telegraphed signature beam.
#
# The wind-up is long and obvious on purpose. Reading it and dashing through the
# beam is the whole lesson.

const CYCLE := 4.2
const TELEGRAPH := 1.4
const ACTIVE := 0.30
const BEAM_LENGTH := 26.0
const BEAM_WIDTH := 2.2
const DAMAGE := 18.0

var player: Node3D

var _t := 0.0
var _beam: MeshInstance3D
var _beam_material: StandardMaterial3D
var _body_material: StandardMaterial3D
var _aim := Vector3.FORWARD
var _resolved := false


func _ready() -> void:
	var mesh := MeshInstance3D.new()
	var body := CapsuleMesh.new()
	body.radius = 0.6
	body.height = 2.6
	mesh.mesh = body
	_body_material = StandardMaterial3D.new()
	_body_material.albedo_color = Color(0.45, 0.42, 0.40)
	mesh.material_override = _body_material
	mesh.position = Vector3(0.0, 1.3, 0.0)
	add_child(mesh)

	var post := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.6
	capsule.height = 2.6
	shape.shape = capsule
	shape.position = Vector3(0.0, 1.3, 0.0)
	post.add_child(shape)
	add_child(post)

	_beam = MeshInstance3D.new()
	var beam_mesh := BoxMesh.new()
	beam_mesh.size = Vector3(BEAM_WIDTH, 0.5, BEAM_LENGTH)
	_beam.mesh = beam_mesh
	_beam_material = StandardMaterial3D.new()
	_beam_material.albedo_color = Color(1.0, 0.55, 0.15)
	_beam_material.emission_enabled = true
	_beam_material.emission = Color(1.0, 0.45, 0.10)
	_beam_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_beam.material_override = _beam_material
	_beam.visible = false
	add_child(_beam)


func _process(delta: float) -> void:
	if player == null:
		return
	_t = fmod(_t + delta, CYCLE)
	var telegraph_start := CYCLE - TELEGRAPH - ACTIVE
	var active_start := CYCLE - ACTIVE

	if _t < telegraph_start:
		_idle()
	elif _t < active_start:
		_wind_up((_t - telegraph_start) / TELEGRAPH)
	else:
		_fire()


func _idle() -> void:
	_beam.visible = false
	_body_material.albedo_color = Color(0.45, 0.42, 0.40)
	_resolved = false


func _wind_up(progress: float) -> void:
	if progress < 0.05:
		# Aim is locked at the start of the wind-up, so moving or dashing out of
		# the line after it starts is a real answer, not luck.
		var to_player := player.global_position - global_position
		to_player.y = 0.0
		if to_player.length() > 0.01:
			_aim = to_player.normalized()
		_point_beam()
	_beam.visible = true
	_body_material.albedo_color = Color(0.45 + 0.5 * progress, 0.42 - 0.2 * progress, 0.40 - 0.2 * progress)
	_beam_material.albedo_color = Color(1.0, 0.65, 0.20, 0.18 + 0.3 * progress)
	var width: float = 0.25 + 0.75 * progress
	_beam.scale = Vector3(width, 0.4, 1.0)


func _fire() -> void:
	_beam.visible = true
	_beam.scale = Vector3(1.0, 1.0, 1.0)
	_beam_material.albedo_color = Color(1.0, 0.25, 0.15, 0.85)
	_body_material.albedo_color = Color(0.95, 0.30, 0.25)
	if _resolved:
		return
	_resolved = true
	if _hits_player():
		player.try_hit(DAMAGE)


func _point_beam() -> void:
	var yaw := atan2(_aim.x, _aim.z)
	_beam.rotation = Vector3(0.0, yaw, 0.0)
	# The height is added, never multiplied into the aim, or the beam flies away.
	_beam.position = _aim * (BEAM_LENGTH * 0.5) + Vector3(0.0, 1.0, 0.0)


# Plain geometry rather than a physics query, so the same test can run headless
# and, later, on the server.
func _hits_player() -> bool:
	var to_player := player.global_position - global_position
	to_player.y = 0.0
	var along := to_player.dot(_aim)
	if along < 0.0 or along > BEAM_LENGTH:
		return false
	var across := (to_player - _aim * along).length()
	return across <= BEAM_WIDTH * 0.5
