extends Node3D

# Original, code-built 3D character models for the crowdfunding demo (spec
# 002, section "The character"). Everything here is primitives and generated
# meshes (SurfaceTool / ArrayMesh for the shaped pieces); nothing is imported
# and nothing is traced from any other game, per the originality rule in
# docs/gdd/08-day-dreams-night-dreams-world.md.
#
# Three kinds share one file so the humanoid rig (dreamwalker, keeper) and
# the pose math can be reused:
#   "dreamwalker" - the player. Deep slate-teal coat, one bronze-gold
#     pauldron on the left shoulder only, a violet mantle, and the Dreamedge,
#     a single-edged longblade with a glowing fuller.
#   "keeper"      - Mireth. An older woman in an ochre-and-rust hooded robe,
#     a grey braid, and a staff with a hanging lantern.
#   "sentinel"    - the Hollow Sentinel. A hovering construct of weathered
#     stone and bronze bands with one glowing eye, amber by day and violet
#     by night.
#
# The origin is at the feet (the sentinel hovers just above it), the model
# faces -Z (matching the nose-block convention in player.gd and the beam
# convention in dummy.gd), and update_pose() drives a bone-like hierarchy of
# pivot Node3Ds procedurally: there is no skeleton, no animation player, and
# no imported clip.
#
# Deliberately not using Node3D.global_position/global_transform: npc.gd
# recorded on 2026-09-22 that it raises on an instance built by a test and
# never added to a live scene tree. blade_tip_global()/blade_base_global()
# walk the local parent chain by hand instead, so they work whether or not
# this model is ever inside a running SceneTree.

const KIND_DREAMWALKER := "dreamwalker"
const KIND_KEEPER := "keeper"
const KIND_SENTINEL := "sentinel"

# ---------------------------------------------------------------------------
# Palette. Colours are per the spec, "The character" section.
# ---------------------------------------------------------------------------

# Dreamwalker
const DW_COAT := Color(0.13, 0.22, 0.23)
const DW_COAT_TRIM := Color(0.07, 0.13, 0.15)
const DW_PAULDRON := Color(0.58, 0.43, 0.17)
const DW_MANTLE := Color(0.38, 0.22, 0.60)
const DW_THREAD := Color(0.62, 0.40, 0.94)
const DW_LEATHER := Color(0.22, 0.14, 0.09)
const DW_LANTERN := Color(1.0, 0.62, 0.22)
const DW_SKIN := Color(0.80, 0.63, 0.52)
const DW_HAIR := Color(0.10, 0.09, 0.08)
const DW_CIRCLET := Color(0.74, 0.74, 0.82)
const DW_STEEL := Color(0.72, 0.74, 0.78)
const DW_FULLER := Color(0.58, 0.30, 0.97)

# Keeper (Mireth)
const K_ROBE := Color(0.57, 0.41, 0.17)
const K_TRIM := Color(0.42, 0.20, 0.10)
const K_HAIR := Color(0.74, 0.73, 0.70)
const K_SKIN := Color(0.75, 0.60, 0.51)
const K_STAFF := Color(0.27, 0.18, 0.11)
const K_LANTERN := Color(1.0, 0.72, 0.34)

# Hollow Sentinel
const S_STONE := Color(0.40, 0.38, 0.36)
const S_STONE_DARK := Color(0.25, 0.24, 0.23)
const S_BRONZE := Color(0.46, 0.33, 0.15)
const S_EYE_DAY := Color(1.0, 0.60, 0.14)
const S_EYE_NIGHT := Color(0.56, 0.24, 0.96)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

var kind := "dreamwalker"
var pivots := {}   # String -> Node3D, filled as the rig is built

var _built := false
var _time_of_day := "day"
var _t := 0.0
var _gait := 0.0

var _fuller_material: StandardMaterial3D = null
var _eye_material: StandardMaterial3D = null
var _accent_lights := []   # Array[{material, day, night}]

# Rig references. Also reachable through `pivots`; kept as typed fields so
# the pose functions below read clearly.
var _hips: Node3D
var _spine: Node3D
var _chest: Node3D
var _neck: Node3D
var _head: Node3D
var _shoulder_l: Node3D
var _upper_arm_l: Node3D
var _forearm_l: Node3D
var _hand_l: Node3D
var _shoulder_r: Node3D
var _upper_arm_r: Node3D
var _forearm_r: Node3D
var _hand_r: Node3D
var _thigh_l: Node3D
var _shin_l: Node3D
var _foot_l: Node3D
var _thigh_r: Node3D
var _shin_r: Node3D
var _foot_r: Node3D
var _coat_l: Node3D
var _coat_r: Node3D
var _eye: Node3D

var _spine_rest_y := 0.0
var _hips_rest_y := 0.0
var _chest_rest_z := 0.0
var _head_rest_x := 0.0

var _blade_tip_marker: Node3D = null
var _blade_base_marker: Node3D = null

var _hover_base_y := 0.0


# The factory form named in the brief. Building outside the scene tree is
# deliberate (see the header note on global_position); everything a caller
# needs works before add_child is ever called.
static func build(kind_name: String) -> Node3D:
	var model = new()
	model.kind = kind_name
	model._build()
	return model


func _ready() -> void:
	_build()


func _build() -> void:
	if _built:
		return
	_built = true
	match kind:
		KIND_KEEPER:
			_build_keeper()
		KIND_SENTINEL:
			_build_sentinel()
		_:
			kind = KIND_DREAMWALKER
			_build_dreamwalker()


func has_pivot(name: String) -> bool:
	return pivots.has(name)


func get_pivot(name: String) -> Node3D:
	return pivots.get(name)


# `t` is "day" or "night". The sentinel eye swaps colour outright; every
# other kind's warm accents (lantern charms, the mantle thread, the fuller's
# resting glow) simply run brighter after dark.
func set_time_of_day(t: String) -> void:
	_time_of_day = t
	var night := t == "night"
	if _eye_material != null:
		_eye_material.albedo_color = S_EYE_NIGHT if night else S_EYE_DAY
		_eye_material.emission = S_EYE_NIGHT if night else S_EYE_DAY
	for entry in _accent_lights:
		var m: StandardMaterial3D = entry["material"]
		m.emission_energy_multiplier = entry["night"] if night else entry["day"]


# 0..1. Drives the violet fuller line on the Dreamedge; a no-op on kinds
# with no blade, so a caller never has to check `kind` first.
func set_blade_glow(amount: float) -> void:
	if _fuller_material == null:
		return
	_fuller_material.emission_energy_multiplier = lerp(0.6, 5.0, clampf(amount, 0.0, 1.0))


func blade_tip_global() -> Vector3:
	if _blade_tip_marker != null:
		return _world_position(_blade_tip_marker)
	if _hand_r != null:
		return _world_position(_hand_r)
	return _world_position(self)


func blade_base_global() -> Vector3:
	if _blade_base_marker != null:
		return _world_position(_blade_base_marker)
	if _hand_r != null:
		return _world_position(_hand_r)
	return _world_position(self)


# Composes local transforms up the parent chain by hand instead of asking
# the engine for global_transform, which npc.gd found raises on a node that
# was never added to a running SceneTree. This works either way.
func _world_position(node: Node3D) -> Vector3:
	var t := node.transform
	var p := node.get_parent()
	while p != null and p is Node3D:
		t = (p as Node3D).transform * t
		p = p.get_parent()
	return t.origin


# ---------------------------------------------------------------------------
# Small mesh/material helpers, shared by every kind
# ---------------------------------------------------------------------------

func _pivot(parent: Node3D, pname: String, pos: Vector3) -> Node3D:
	var n := Node3D.new()
	n.name = pname
	n.position = pos
	parent.add_child(n)
	pivots[pname] = n
	return n


func _mat(color: Color, rough: float = 0.75, metal: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	m.metallic = metal
	# A rim light reads a stylised low-poly silhouette much better against
	# both the golden-hour Day Dream and the dark Night Dream city.
	m.rim_enabled = true
	m.rim = 0.22
	m.rim_tint = 0.5
	return m


func _glow_mat(color: Color, energy: float) -> StandardMaterial3D:
	var m := _mat(color, 0.35, 0.1)
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = energy
	return m


func _remember_accent(material: StandardMaterial3D, day_energy: float, night_energy: float) -> void:
	_accent_lights.append({"material": material, "day": day_energy, "night": night_energy})


func _double_sided(m: StandardMaterial3D) -> StandardMaterial3D:
	# Thin SurfaceTool ribbons (coat tails, hood, mantle, fuller strip) have
	# no real back face; culling one side would make them vanish depending
	# on the camera angle, so both faces render instead.
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m


func _mi(parent: Node3D, mesh: Mesh, material: Material, pos: Vector3,
		rot_deg: Vector3 = Vector3.ZERO, scl: Vector3 = Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	mi.rotation_degrees = rot_deg
	mi.scale = scl
	parent.add_child(mi)
	return mi


func _cyl(top_r: float, bottom_r: float, height: float, sides: int = 10) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = top_r
	c.bottom_radius = bottom_r
	c.height = height
	c.radial_segments = sides
	return c


func _sph(radius: float, height_scale: float = 1.0) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = radius
	s.height = radius * 2.0 * height_scale
	s.radial_segments = 12
	s.rings = 8
	return s


func _cap(radius: float, height: float) -> CapsuleMesh:
	var c := CapsuleMesh.new()
	c.radius = radius
	c.height = height
	c.radial_segments = 10
	return c


func _box(size: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = size
	return b


# `thickness` is the tube's diameter, not TorusMesh's own confusing
# inner/outer split (Godot's inner_radius is the inner EDGE of the tube,
# not the tube's own radius, so a small inner_radius next to a big
# outer_radius makes a thick doughnut, not a thin band — that bug once
# turned the dreamwalker's circlet into a solid grey dome that read as a
# cap). This keeps every call site's band genuinely thin.
func _ring(thickness: float, radius: float) -> TorusMesh:
	var t := TorusMesh.new()
	t.outer_radius = radius
	t.inner_radius = maxf(0.0, radius - thickness)
	t.ring_segments = 10
	t.rings = 14
	return t


func _st_tri(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3) -> void:
	st.add_vertex(a)
	st.add_vertex(b)
	st.add_vertex(c)


func _st_quad(st: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3) -> void:
	_st_tri(st, a, b, c)
	_st_tri(st, a, c, d)


# A flat tapered strip laid out along a hand-drawn centreline, width per
# point. Used for the coat tails, the hood, and the mantle: cheap, and it
# reads as cloth once it sways.
func _ribbon_mesh(centerline: Array, widths: Array) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var left: Array = []
	var right: Array = []
	for i in centerline.size():
		var c: Vector3 = centerline[i]
		var w: float = widths[i]
		left.append(c + Vector3(-w * 0.5, 0.0, 0.0))
		right.append(c + Vector3(w * 0.5, 0.0, 0.0))
	for i in range(centerline.size() - 1):
		_st_quad(st, left[i], right[i], right[i + 1], left[i + 1])
	st.generate_normals()
	return st.commit()


# The Dreamedge: a tapered, single-edged blade. Cross-section is a thin
# triangle (a sharp edge on one side, a thicker spine on the other) so the
# silhouette reads as single-edged even at this low a vertex count. Built
# blade-down (local -Y from the grip) so hanging the arm at rest hangs the
# blade too, and every swing comes from rotating the arm, not the blade.
func _blade_mesh(length: float, width: float, thick: float) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var stations := [
		[0.0, width, thick],
		[-length * 0.55, width * 0.78, thick * 0.85],
		[-length, 0.002, 0.002],
	]
	var rings: Array = []
	for s in stations:
		var y: float = s[0]
		var w: float = s[1]
		var t: float = s[2]
		rings.append([
			Vector3(-w, y, 0.0),
			Vector3(w * 0.35, y, t * 0.5),
			Vector3(w * 0.35, y, -t * 0.5),
		])
	var r0: Array = rings[0]
	_st_tri(st, r0[0], r0[1], r0[2])
	for i in range(stations.size() - 1):
		var a: Array = rings[i]
		var b: Array = rings[i + 1]
		for k in range(3):
			var k2 := (k + 1) % 3
			_st_quad(st, a[k], a[k2], b[k2], b[k])
	st.generate_normals()
	return st.commit()


# ---------------------------------------------------------------------------
# Humanoid rig, shared by the dreamwalker and the keeper
# ---------------------------------------------------------------------------

func _build_humanoid_rig(hip_y: float, thigh_len: float, shin_len: float,
		spine_len: float, chest_len: float, neck_len: float, head_len: float,
		shoulder_x: float, hip_half_w: float, upper_arm_len: float,
		forearm_len: float) -> void:
	_hips_rest_y = hip_y
	_hips = _pivot(self, "hips", Vector3(0.0, hip_y, 0.0))
	_spine_rest_y = spine_len
	_spine = _pivot(_hips, "spine", Vector3(0.0, spine_len, 0.0))
	_chest = _pivot(_spine, "chest", Vector3(0.0, chest_len, 0.0))
	_neck = _pivot(_chest, "neck", Vector3(0.0, neck_len, 0.0))
	_head = _pivot(_neck, "head", Vector3(0.0, head_len, 0.0))

	# +X is the character's own right (it faces -Z, matching the nose block
	# in player.gd), so the sword hand and the bare-pauldron shoulder are on
	# opposite sides of zero.
	_shoulder_l = _pivot(_chest, "shoulder_l", Vector3(-shoulder_x, 0.02, 0.0))
	_upper_arm_l = _pivot(_shoulder_l, "upper_arm_l", Vector3.ZERO)
	_forearm_l = _pivot(_upper_arm_l, "forearm_l", Vector3(0.0, -upper_arm_len, 0.0))
	_hand_l = _pivot(_forearm_l, "hand_l", Vector3(0.0, -forearm_len, 0.0))

	_shoulder_r = _pivot(_chest, "shoulder_r", Vector3(shoulder_x, 0.02, 0.0))
	_upper_arm_r = _pivot(_shoulder_r, "upper_arm_r", Vector3.ZERO)
	_forearm_r = _pivot(_upper_arm_r, "forearm_r", Vector3(0.0, -upper_arm_len, 0.0))
	_hand_r = _pivot(_forearm_r, "hand_r", Vector3(0.0, -forearm_len, 0.0))

	_thigh_l = _pivot(_hips, "thigh_l", Vector3(-hip_half_w, 0.0, 0.0))
	_shin_l = _pivot(_thigh_l, "shin_l", Vector3(0.0, -thigh_len, 0.0))
	_foot_l = _pivot(_shin_l, "foot_l", Vector3(0.0, -shin_len, 0.0))

	_thigh_r = _pivot(_hips, "thigh_r", Vector3(hip_half_w, 0.0, 0.0))
	_shin_r = _pivot(_thigh_r, "shin_r", Vector3(0.0, -thigh_len, 0.0))
	_foot_r = _pivot(_shin_r, "foot_r", Vector3(0.0, -shin_len, 0.0))

	_coat_l = _pivot(_hips, "coat_l", Vector3(-hip_half_w * 1.15, -0.06, -0.09))
	_coat_r = _pivot(_hips, "coat_r", Vector3(hip_half_w * 1.15, -0.06, -0.09))


# ---------------------------------------------------------------------------
# The Dreamwalker
# ---------------------------------------------------------------------------

const DW_HIP_Y := 1.00
const DW_THIGH := 0.50
const DW_SHIN := 0.45
const DW_SPINE := 0.15
const DW_CHEST := 0.18
const DW_NECK := 0.11
const DW_HEAD := 0.11
const DW_HEAD_R := 0.12
const DW_SHOULDER_X := 0.20
const DW_HIP_HALF_W := 0.11
const DW_UPPER_ARM := 0.29
const DW_FOREARM := 0.26


func _build_dreamwalker() -> void:
	_build_humanoid_rig(DW_HIP_Y, DW_THIGH, DW_SHIN, DW_SPINE, DW_CHEST,
		DW_NECK, DW_HEAD, DW_SHOULDER_X, DW_HIP_HALF_W, DW_UPPER_ARM, DW_FOREARM)

	var coat_mat := _mat(DW_COAT, 0.85, 0.0)
	var coat_trim_mat := _mat(DW_COAT_TRIM, 0.85, 0.0)
	var leather_mat := _mat(DW_LEATHER, 0.8, 0.05)
	var skin_mat := _mat(DW_SKIN, 0.6, 0.0)
	var hair_mat := _mat(DW_HAIR, 0.5, 0.0)
	hair_mat.rim_enabled = false   # a bright rim on a dark dome reads as a shiny cap, not hair
	var pauldron_mat := _mat(DW_PAULDRON, 0.32, 0.85)
	var circlet_mat := _mat(DW_CIRCLET, 0.25, 0.7)
	var mantle_mat := _double_sided(_mat(DW_MANTLE, 0.7, 0.0))
	var steel_mat := _mat(DW_STEEL, 0.28, 0.9)

	var lantern_mat := _glow_mat(DW_LANTERN, 1.4)
	_remember_accent(lantern_mat, 1.4, 3.2)
	var thread_mat := _double_sided(_glow_mat(DW_THREAD, 0.9))
	_remember_accent(thread_mat, 0.9, 2.6)

	# Torso: the coat is the silhouette here, one piece running from the hip
	# joint all the way up to the chest so there is no bare gap at the waist.
	var torso_h := DW_SPINE + DW_CHEST + 0.05
	_mi(_hips, _cyl(0.175, 0.145, torso_h, 10), coat_mat, Vector3(0.0, torso_h * 0.5 - 0.03, 0.0))
	_mi(_chest, _sph(0.155, 0.85), coat_mat, Vector3(0.0, 0.02, 0.0))

	# Coat tails: two SurfaceTool ribbons split at the small of the back,
	# reaching the knee, standing clear of the coat body (a wide Z drop, not
	# hugging the torso cylinder) so they read as separate trailing panels
	# rather than disappearing into the main silhouette.
	var tail_len := DW_HIP_Y - DW_THIGH - 0.02   # hip to just past the knee
	var tail_line := [Vector3(0.0, 0.03, -0.02), Vector3(0.0, -tail_len * 0.5, -0.13),
		Vector3(0.0, -tail_len, -0.09)]
	var tail_widths := [0.16, 0.13, 0.065]
	var tail_mesh := _ribbon_mesh(tail_line, tail_widths)
	_mi(_coat_l, tail_mesh, _double_sided(coat_trim_mat), Vector3.ZERO)
	_mi(_coat_r, tail_mesh, _double_sided(coat_trim_mat), Vector3.ZERO)

	# Belt and the amber lantern charm.
	_mi(_hips, _ring(0.02, 0.175), leather_mat, Vector3(0.0, 0.02, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_hips, _box(Vector3(0.045, 0.06, 0.03)), lantern_mat, Vector3(0.13, -0.08, 0.05))
	_mi(_hips, _cyl(0.006, 0.006, 0.05, 5), leather_mat, Vector3(0.13, -0.03, 0.05))

	# Mantle and scarf, sized to read as violet cloth rather than a sliver,
	# with the glowing thread along its hem.
	var mantle_line := [Vector3(0.0, 0.12, 0.02), Vector3(0.0, -0.08, 0.09),
		Vector3(0.0, -0.30, 0.13)]
	var mantle_widths := [0.34, 0.42, 0.36]
	_mi(_chest, _ribbon_mesh(mantle_line, mantle_widths), mantle_mat, Vector3(0.0, 0.08, -0.03))
	var thread_line := [Vector3(0.0, -0.27, 0.14), Vector3(0.0, -0.29, 0.135)]
	_mi(_chest, _ribbon_mesh(thread_line, [0.34, 0.32]), thread_mat, Vector3(0.0, 0.08, -0.03))
	_mi(_neck, _cyl(0.09, 0.08, 0.09, 10), mantle_mat, Vector3(0.0, -0.01, 0.0))

	# Head: brow, nose and jaw give the face structure the brief asks for
	# even at this low a detail level. The hair is cropped short, top and
	# back only, so bare skin still reads at the brow and temple rather
	# than the whole head reading as one flat cap.
	_mi(_head, _sph(DW_HEAD_R), skin_mat, Vector3.ZERO)
	_mi(_head, _box(Vector3(DW_HEAD_R * 1.05, 0.032, 0.05)), skin_mat,
		Vector3(0.0, 0.02, -DW_HEAD_R * 0.80))
	_mi(_head, _box(Vector3(0.04, 0.04, 0.06)), skin_mat,
		Vector3(0.0, -0.01, -DW_HEAD_R * 0.98), Vector3(20.0, 0.0, 0.0))
	_mi(_head, _box(Vector3(0.095, 0.048, 0.085)), skin_mat,
		Vector3(0.0, -0.078, -DW_HEAD_R * 0.55), Vector3(-10.0, 0.0, 0.0))
	var hair_dome := _mi(_head, _sph(DW_HEAD_R * 1.04, 0.66), hair_mat, Vector3(0.0, 0.05, 0.02))
	hair_dome.rotation_degrees = Vector3(-6.0, 0.0, 0.0)
	_mi(_head, _ring(0.007, DW_HEAD_R * 1.0), circlet_mat,
		Vector3(0.0, 0.055, 0.0), Vector3(90.0, 0.0, 0.0))

	# The one asymmetric pauldron, sized to read clearly next to the bare
	# right shoulder, per the spec.
	_mi(_shoulder_l, _sph(0.15, 0.60), pauldron_mat, Vector3(0.0, 0.01, 0.0))
	_mi(_shoulder_l, _ring(0.008, 0.145), pauldron_mat,
		Vector3(0.0, -0.03, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_shoulder_l, _box(Vector3(0.05, 0.03, 0.09)), pauldron_mat, Vector3(-0.03, -0.06, 0.0))

	# Arm sleeves and hands.
	_mi(_upper_arm_l, _cyl(0.065, 0.06, DW_UPPER_ARM, 8), coat_mat, Vector3(0.0, -DW_UPPER_ARM * 0.5, 0.0))
	_mi(_forearm_l, _cyl(0.055, 0.05, DW_FOREARM, 8), leather_mat, Vector3(0.0, -DW_FOREARM * 0.5, 0.0))
	_mi(_forearm_l, _ring(0.006, 0.058), leather_mat, Vector3(0.0, -0.02, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_hand_l, _sph(0.05), skin_mat, Vector3.ZERO)

	_mi(_upper_arm_r, _cyl(0.065, 0.06, DW_UPPER_ARM, 8), coat_mat, Vector3(0.0, -DW_UPPER_ARM * 0.5, 0.0))
	_mi(_forearm_r, _cyl(0.055, 0.05, DW_FOREARM, 8), leather_mat, Vector3(0.0, -DW_FOREARM * 0.5, 0.0))
	_mi(_forearm_r, _ring(0.006, 0.058), leather_mat, Vector3(0.0, -0.02, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_hand_r, _sph(0.05), skin_mat, Vector3.ZERO)

	# Legs and boots.
	for pair in [[_thigh_l, _shin_l, _foot_l], [_thigh_r, _shin_r, _foot_r]]:
		var thigh: Node3D = pair[0]
		var shin: Node3D = pair[1]
		var foot: Node3D = pair[2]
		_mi(thigh, _cyl(0.10, 0.085, DW_THIGH, 8), coat_mat, Vector3(0.0, -DW_THIGH * 0.5, 0.0))
		_mi(shin, _cyl(0.082, 0.06, DW_SHIN, 8), leather_mat, Vector3(0.0, -DW_SHIN * 0.5, 0.0))
		_mi(foot, _box(Vector3(0.10, 0.09, 0.24)), leather_mat, Vector3(0.0, -0.045, -0.08))

	# The Dreamedge, rigidly held in the right fist so every swing comes
	# from the arm chain and the blade simply follows.
	# "A large single-edged longblade": sized to read at ordinary
	# game-camera distance, not just in an extreme close-up.
	var grip := Node3D.new()
	grip.name = "blade_grip"
	grip.position = Vector3(0.0, -0.06, 0.0)
	_hand_r.add_child(grip)
	_mi(grip, _cyl(0.02, 0.022, 0.16, 8), leather_mat, Vector3(0.0, -0.08, 0.0))
	_mi(grip, _box(Vector3(0.14, 0.02, 0.035)), steel_mat, Vector3(0.0, -0.16, 0.0))
	_mi(grip, _sph(0.026), steel_mat, Vector3(0.0, 0.01, 0.0))

	var blade_len := 0.92
	var blade_mesh := _blade_mesh(blade_len, 0.065, 0.018)
	_mi(grip, blade_mesh, _double_sided(steel_mat), Vector3(0.0, -0.17, 0.0))
	var fuller_line := [Vector3(0.0, -0.01, 0.010), Vector3(0.0, -blade_len * 0.85, 0.003)]
	_fuller_material = _double_sided(_glow_mat(DW_FULLER, 1.4))
	_remember_accent(_fuller_material, 1.4, 3.2)
	_mi(grip, _ribbon_mesh(fuller_line, [0.018, 0.006]), _fuller_material, Vector3(0.025, -0.17, 0.0))

	_blade_base_marker = Node3D.new()
	_blade_base_marker.name = "blade_base"
	_blade_base_marker.position = Vector3(0.0, -0.17, 0.0)
	grip.add_child(_blade_base_marker)
	_blade_tip_marker = Node3D.new()
	_blade_tip_marker.name = "blade_tip"
	_blade_tip_marker.position = Vector3(0.0, -0.17 - blade_len, 0.0)
	grip.add_child(_blade_tip_marker)
	pivots["blade_tip"] = _blade_tip_marker
	pivots["blade_base"] = _blade_base_marker
	pivots["blade_grip"] = grip


# ---------------------------------------------------------------------------
# Mireth, the keeper
# ---------------------------------------------------------------------------

const K_HIP_Y := 0.90
const K_THIGH := 0.44
const K_SHIN := 0.40
const K_SPINE := 0.13
const K_CHEST := 0.15
const K_NECK := 0.09
const K_HEAD := 0.09
const K_HEAD_R := 0.105
const K_SHOULDER_X := 0.17
const K_HIP_HALF_W := 0.10
const K_UPPER_ARM := 0.25
const K_FOREARM := 0.23


func _build_keeper() -> void:
	_build_humanoid_rig(K_HIP_Y, K_THIGH, K_SHIN, K_SPINE, K_CHEST,
		K_NECK, K_HEAD, K_SHOULDER_X, K_HIP_HALF_W, K_UPPER_ARM, K_FOREARM)
	# An older woman stands a little stooped. A small forward lean on the
	# chest reads that with no extra geometry.
	_chest_rest_z = -0.05
	_chest.rotation.x = 0.08
	_head_rest_x = -0.05
	_head.rotation.x = -_head_rest_x

	var robe_mat := _mat(K_ROBE, 0.9, 0.0)
	var trim_mat := _mat(K_TRIM, 0.85, 0.0)
	var skin_mat := _mat(K_SKIN, 0.65, 0.0)
	var hair_mat := _mat(K_HAIR, 0.6, 0.0)
	var wood_mat := _mat(K_STAFF, 0.85, 0.0)
	var lantern_glass := _glow_mat(K_LANTERN, 2.6)
	_remember_accent(lantern_glass, 2.6, 4.5)

	# The long robe reaches to the ankle, hiding most of the leg rig, and
	# flares out wide at the hem rather than tapering to a point at the feet.
	var skirt_h := K_HIP_Y - 0.05
	_mi(_hips, _cyl(0.125, 0.30, skirt_h, 12), robe_mat, Vector3(0.0, -skirt_h * 0.5 + 0.02, 0.0))
	_mi(_spine, _cyl(0.145, 0.13, K_CHEST + 0.05, 10), robe_mat, Vector3(0.0, K_CHEST * 0.5, 0.0))
	_mi(_chest, _sph(0.135, 0.85), robe_mat, Vector3(0.0, 0.0, 0.0))
	var hem_line := [Vector3(0.0, 0.0, 0.0), Vector3(0.0, -(K_HIP_Y - 0.06), 0.02)]
	_mi(_hips, _ribbon_mesh(hem_line, [0.26, 0.30]), _double_sided(trim_mat), Vector3(0.0, -0.02, -0.20))
	_mi(_hips, _ring(0.015, 0.135), trim_mat, Vector3(0.0, 0.03, 0.0), Vector3(90.0, 0.0, 0.0))

	# Hood: an open-fronted ribbon dome over the crown and shoulders, built
	# with the same SurfaceTool ribbon as the coat tails, just wider and
	# curved back over the head instead of hanging down.
	var hood_line := [Vector3(0.0, 0.11, 0.07), Vector3(0.0, 0.16, -0.06),
		Vector3(0.0, 0.07, -0.16), Vector3(0.0, -0.12, -0.14)]
	var hood_widths := [0.21, 0.29, 0.29, 0.25]
	_mi(_head, _ribbon_mesh(hood_line, hood_widths), _double_sided(trim_mat), Vector3.ZERO)

	# Face and the grey braid trailing down the back.
	_mi(_head, _sph(K_HEAD_R), skin_mat, Vector3.ZERO)
	_mi(_head, _box(Vector3(K_HEAD_R * 1.0, 0.028, 0.045)), skin_mat,
		Vector3(0.0, 0.01, -K_HEAD_R * 0.8))
	_mi(_head, _box(Vector3(0.03, 0.03, 0.045)), skin_mat,
		Vector3(0.0, -0.01, -K_HEAD_R * 0.98), Vector3(20.0, 0.0, 0.0))
	_mi(_head, _box(Vector3(0.075, 0.038, 0.07)), skin_mat,
		Vector3(0.0, -0.068, -K_HEAD_R * 0.5), Vector3(-8.0, 0.0, 0.0))
	var braid_y := 0.0
	for i in range(4):
		var seg_r: float = 0.026 - float(i) * 0.004
		_mi(_head, _sph(seg_r), hair_mat, Vector3(0.0, braid_y, K_HEAD_R * 0.55 + 0.03 * float(i)))
		braid_y -= 0.05

	# The right hand carries a tall staff with a curled hook and a hanging
	# lantern; the left hand is empty, resting near the robe.
	_mi(_hand_l, _sph(0.045), skin_mat, Vector3.ZERO)
	_mi(_hand_r, _sph(0.045), skin_mat, Vector3.ZERO)

	# Held low on the shaft, like a real walking staff: most of its length
	# rises above the grip so it reads clearly above her head regardless of
	# how high the hand happens to be posed.
	var staff := Node3D.new()
	staff.name = "staff"
	staff.position = Vector3(0.0, -0.04, 0.0)
	_hand_r.add_child(staff)
	var staff_len := 1.55
	var staff_below := 0.35
	var staff_top := staff_len - staff_below
	_mi(staff, _cyl(0.018, 0.022, staff_len, 8), wood_mat,
		Vector3(0.0, staff_top - staff_len * 0.5, 0.0))
	# The hook: two short angled dowels rather than a swept curve, so it
	# reads clearly at this scale instead of vanishing edge-on.
	_mi(staff, _cyl(0.012, 0.015, 0.09, 6), wood_mat,
		Vector3(0.025, staff_top + 0.01, 0.0), Vector3(0.0, 0.0, 55.0))
	_mi(staff, _cyl(0.009, 0.012, 0.07, 6), wood_mat,
		Vector3(0.075, staff_top - 0.02, 0.0), Vector3(0.0, 0.0, 115.0))
	_mi(staff, _cyl(0.004, 0.004, 0.09, 5), wood_mat, Vector3(0.095, staff_top - 0.09, 0.0))
	_mi(staff, _box(Vector3(0.05, 0.065, 0.05)), lantern_glass, Vector3(0.095, staff_top - 0.16, 0.0))
	pivots["staff"] = staff

	# Arms and legs, mostly hidden under the robe but present for the rig.
	_mi(_upper_arm_l, _cyl(0.055, 0.05, K_UPPER_ARM, 8), robe_mat, Vector3(0.0, -K_UPPER_ARM * 0.5, 0.0))
	_mi(_forearm_l, _cyl(0.045, 0.04, K_FOREARM, 8), robe_mat, Vector3(0.0, -K_FOREARM * 0.5, 0.0))
	_mi(_upper_arm_r, _cyl(0.055, 0.05, K_UPPER_ARM, 8), robe_mat, Vector3(0.0, -K_UPPER_ARM * 0.5, 0.0))
	_mi(_forearm_r, _cyl(0.045, 0.04, K_FOREARM, 8), robe_mat, Vector3(0.0, -K_FOREARM * 0.5, 0.0))
	for pair in [[_thigh_l, _shin_l, _foot_l], [_thigh_r, _shin_r, _foot_r]]:
		var thigh: Node3D = pair[0]
		var shin: Node3D = pair[1]
		var foot: Node3D = pair[2]
		_mi(thigh, _cyl(0.085, 0.075, K_THIGH, 8), robe_mat, Vector3(0.0, -K_THIGH * 0.5, 0.0))
		_mi(shin, _cyl(0.07, 0.055, K_SHIN, 8), robe_mat, Vector3(0.0, -K_SHIN * 0.5, 0.0))
		_mi(foot, _box(Vector3(0.09, 0.07, 0.20)), trim_mat, Vector3(0.0, -0.035, -0.06))


# ---------------------------------------------------------------------------
# The Hollow Sentinel
# ---------------------------------------------------------------------------

const S_HOVER_Y := 0.35
const S_CORE_LOWER_Y := 0.78
const S_CORE_UPPER_Y := 1.55
const S_HEAD_Y := 2.15
const S_SHOULDER_X := 0.40
const S_UPPER_ARM := 0.40
const S_FOREARM := 0.36


func _build_sentinel() -> void:
	_hover_base_y = S_HOVER_Y
	_hips = _pivot(self, "hips", Vector3(0.0, S_CORE_LOWER_Y, 0.0))
	_chest = _pivot(self, "chest", Vector3(0.0, S_CORE_UPPER_Y, 0.0))
	_head = _pivot(_chest, "head", Vector3(0.0, S_HEAD_Y - S_CORE_UPPER_Y, 0.0))
	_eye = _pivot(_head, "eye", Vector3(0.0, -0.03, -0.26))

	_shoulder_l = _pivot(_chest, "shoulder_l", Vector3(-S_SHOULDER_X, 0.12, 0.0))
	_upper_arm_l = _pivot(_shoulder_l, "upper_arm_l", Vector3.ZERO)
	_forearm_l = _pivot(_upper_arm_l, "forearm_l", Vector3(0.0, -S_UPPER_ARM, 0.0))
	_hand_l = _pivot(_forearm_l, "hand_l", Vector3(0.0, -S_FOREARM, 0.0))

	_shoulder_r = _pivot(_chest, "shoulder_r", Vector3(S_SHOULDER_X, 0.12, 0.0))
	_upper_arm_r = _pivot(_shoulder_r, "upper_arm_r", Vector3.ZERO)
	_forearm_r = _pivot(_upper_arm_r, "forearm_r", Vector3(0.0, -S_UPPER_ARM, 0.0))
	_hand_r = _pivot(_forearm_r, "hand_r", Vector3(0.0, -S_FOREARM, 0.0))

	# Matte, chiselled stone: no rim light, which is what was turning smooth
	# round shapes into "chrome balls" under the key/rim lighting rig.
	var stone_mat := _mat(S_STONE, 1.0, 0.0)
	stone_mat.rim_enabled = false
	var stone_dark_mat := _mat(S_STONE_DARK, 1.0, 0.0)
	stone_dark_mat.rim_enabled = false
	var bronze_mat := _mat(S_BRONZE, 0.45, 0.75)
	_eye_material = _glow_mat(S_EYE_DAY, 2.6)
	_remember_accent(_eye_material, 2.6, 4.0)

	# Lower core: a blocky, chiselled mass built from overlapping boxes set
	# at odd angles, not spheres, so it reads as hewn rock, not a ball
	# bearing. It hovers; nothing here touches the ground.
	_mi(_hips, _box(Vector3(0.58, 0.60, 0.52)), stone_mat, Vector3.ZERO, Vector3(4.0, 12.0, -3.0))
	_mi(_hips, _box(Vector3(0.38, 0.30, 0.36)), stone_dark_mat, Vector3(0.10, -0.16, 0.14), Vector3(-6.0, 20.0, 5.0))
	_mi(_hips, _box(Vector3(0.03, 0.34, 0.03)), stone_dark_mat, Vector3(-0.20, 0.02, 0.22), Vector3(0.0, 15.0, 0.0))
	_mi(_hips, _ring(0.035, 0.36), bronze_mat, Vector3(0.0, 0.12, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_hips, _ring(0.03, 0.33), bronze_mat, Vector3(0.0, -0.14, 0.0), Vector3(90.0, 0.0, 0.0))

	# The banded joint that carries the upper core, visibly separate from
	# the lower core: this thing floats, it does not stand.
	_mi(self, _cyl(0.15, 0.19, S_CORE_UPPER_Y - S_CORE_LOWER_Y - 0.20, 6), bronze_mat,
		Vector3(0.0, (S_CORE_LOWER_Y + S_CORE_UPPER_Y) * 0.5 - 0.05, 0.0))

	_mi(_chest, _box(Vector3(0.66, 0.68, 0.56)), stone_mat, Vector3.ZERO, Vector3(-3.0, -10.0, 2.0))
	_mi(_chest, _box(Vector3(0.40, 0.32, 0.38)), stone_dark_mat, Vector3(-0.12, 0.14, 0.16), Vector3(5.0, -18.0, -4.0))
	_mi(_chest, _box(Vector3(0.04, 0.40, 0.04)), stone_dark_mat, Vector3(0.24, -0.02, 0.18), Vector3(0.0, -12.0, 0.0))
	_mi(_chest, _ring(0.04, 0.42), bronze_mat, Vector3(0.0, 0.16, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_chest, _ring(0.035, 0.39), bronze_mat, Vector3(0.0, -0.18, 0.0), Vector3(90.0, 0.0, 0.0))

	# Head: an angular block, not a dome, with the one eye set into its face.
	_mi(_head, _box(Vector3(0.42, 0.36, 0.40)), stone_mat, Vector3.ZERO, Vector3(2.0, 0.0, 0.0))
	_mi(_head, _box(Vector3(0.44, 0.10, 0.10)), stone_dark_mat, Vector3(0.0, 0.10, -0.19))
	_mi(_head, _ring(0.02, 0.20), bronze_mat, Vector3(0.0, -0.02, -0.21), Vector3(90.0, 0.0, 0.0))
	_mi(_eye, _sph(0.12), _eye_material, Vector3.ZERO)
	_mi(_eye, _ring(0.01, 0.13), bronze_mat, Vector3.ZERO, Vector3(90.0, 0.0, 0.0))

	# Heavy arms: thick, low-segment (faceted, not smooth-round) stone limbs
	# in bronze sockets.
	for side in [[_shoulder_l, _upper_arm_l, _forearm_l, _hand_l, -1.0],
			[_shoulder_r, _upper_arm_r, _forearm_r, _hand_r, 1.0]]:
		var shoulder: Node3D = side[0]
		var upper: Node3D = side[1]
		var fore: Node3D = side[2]
		var hand: Node3D = side[3]
		_mi(shoulder, _box(Vector3(0.20, 0.20, 0.20)), bronze_mat, Vector3.ZERO, Vector3(10.0, 15.0, 0.0))
		_mi(upper, _cyl(0.13, 0.11, S_UPPER_ARM, 6), stone_mat, Vector3(0.0, -S_UPPER_ARM * 0.5, 0.0))
		_mi(upper, _ring(0.012, 0.125), bronze_mat, Vector3(0.0, -S_UPPER_ARM + 0.04, 0.0), Vector3(90.0, 0.0, 0.0))
		_mi(fore, _cyl(0.105, 0.085, S_FOREARM, 6), stone_dark_mat, Vector3(0.0, -S_FOREARM * 0.5, 0.0))
		_mi(fore, _ring(0.01, 0.10), bronze_mat, Vector3(0.0, -S_FOREARM + 0.05, 0.0), Vector3(90.0, 0.0, 0.0))
		_mi(hand, _box(Vector3(0.18, 0.20, 0.18)), stone_mat, Vector3(0.0, -0.07, 0.0))
		_mi(hand, _ring(0.014, 0.11), bronze_mat, Vector3(0.0, 0.01, 0.0), Vector3(90.0, 0.0, 0.0))


# ---------------------------------------------------------------------------
# Procedural pose: update_pose(delta, state)
# ---------------------------------------------------------------------------

func update_pose(delta: float, state: Dictionary) -> void:
	_t += delta
	var action: String = String(state.get("action", ""))
	var progress: float = clampf(float(state.get("progress", 0.0)), 0.0, 1.0)
	if kind == "sentinel":
		_pose_sentinel(delta, action, progress)
	else:
		var speed: float = clampf(float(state.get("speed", 0.0)), 0.0, 1.0)
		var sprint: bool = bool(state.get("sprint", false))
		_pose_humanoid(delta, speed, sprint, action, progress)


func _ease_out(x: float) -> float:
	var inv := 1.0 - x
	return 1.0 - inv * inv * inv


# Rises to 1 at `peak` then falls back to 0 by x=1. Reads as a wind-up
# followed by a release, which is the shape of nearly every attack pose.
func _spike(x: float, peak: float = 0.3) -> float:
	if x <= 0.0:
		return 0.0
	if x < peak:
		return x / peak
	if x >= 1.0:
		return 0.0
	return 1.0 - (x - peak) / (1.0 - peak)


func _pose_humanoid(delta: float, speed: float, sprint: bool, action: String, progress: float) -> void:
	_gait += delta * (1.6 + speed * 6.0) * (1.25 if sprint else 1.0)

	var legs_take_action := action == "dash" or action == "lunge" or action == "down" or action == "burst"
	if legs_take_action:
		match action:
			"dash":
				_pose_dash_legs(progress)
			"lunge":
				_pose_lunge_legs(progress)
			"burst":
				_pose_burst_legs(progress)
			"down":
				_pose_down_legs(progress)
	else:
		_pose_gait_legs(speed)
	_pose_gait_torso_base(speed, action, progress)

	match action:
		"":
			_pose_gait_arms(speed)
		"talk":
			_pose_talk(progress)
		"swing1":
			_pose_swing(progress, 1)
		"swing2":
			_pose_swing(progress, 2)
		"swing3":
			_pose_swing(progress, 3)
		"heavy":
			_pose_heavy(progress)
		"guard":
			_pose_guard(progress)
		"dash":
			_pose_dash_arms(progress)
		"lunge":
			_pose_lunge_arms(progress)
		"burst":
			_pose_burst_arms(progress)
		"hit":
			_pose_hit(progress)
		"down":
			_pose_down_arms(progress)
		_:
			# Any action this rig does not recognise (for example
			# "cast_beam", which only the sentinel plays) degrades to a
			# calm idle rather than erroring or leaving stale rotations.
			_pose_gait_arms(speed)


func _pose_gait_legs(speed: float) -> void:
	var amp: float = lerp(0.05, 0.60, speed)
	var swing: float = sin(_gait) * amp
	_thigh_l.rotation.x = swing
	_thigh_r.rotation.x = -swing
	_shin_l.rotation.x = -maxf(0.0, sin(_gait + PI * 0.35)) * amp * 1.1
	_shin_r.rotation.x = -maxf(0.0, sin(_gait + PI * 1.35)) * amp * 1.1
	_foot_l.rotation.x = swing * 0.35
	_foot_r.rotation.x = -swing * 0.35


func _pose_gait_torso_base(speed: float, action: String, progress: float) -> void:
	var bob: float = sin(_gait * 2.0) * lerp(0.0, 0.03, speed)
	_hips.position.y = _hips_rest_y + bob
	_spine.position.y = _spine_rest_y + bob * 0.4
	_chest.rotation.z = sin(_gait) * lerp(0.0, 0.05, speed)
	if action == "" or action == "talk":
		_chest.rotation.x = _chest_rest_z
		_head.rotation.x = -_head_rest_x


func _pose_gait_arms(speed: float) -> void:
	var amp: float = lerp(0.03, 0.45, speed)
	var swing: float = sin(_gait) * amp
	_upper_arm_l.rotation.x = swing
	_upper_arm_r.rotation.x = -swing
	_forearm_l.rotation.x = maxf(0.0, swing) * 0.7
	_forearm_r.rotation.x = maxf(0.0, -swing) * 0.7
	_upper_arm_l.rotation.y = 0.0
	_upper_arm_r.rotation.y = 0.0


func _pose_talk(progress: float) -> void:
	_pose_gait_arms(0.0)
	var gesture := sin(progress * TAU * 2.0) * 0.35
	_upper_arm_r.rotation.x = -0.55 - gesture * 0.3
	_upper_arm_r.rotation.z = -0.15
	_forearm_r.rotation.x = 0.9 + gesture
	_head.rotation.y = sin(progress * TAU) * 0.08


# The three light swings share one function; `which` picks the arc.
# 1: right-to-left horizontal. 2: left-to-right horizontal (the mirror,
# thrown as the return stroke). 3: overhead, top to bottom.
func _pose_swing(progress: float, which: int) -> void:
	var e := _ease_out(progress)
	match which:
		1:
			_upper_arm_r.rotation.y = lerp(1.1, -1.0, e)
			_upper_arm_r.rotation.x = -0.65
			_forearm_r.rotation.x = lerp(0.15, -0.55, _spike(progress, 0.55))
		2:
			_upper_arm_r.rotation.y = lerp(-1.1, 1.0, e)
			_upper_arm_r.rotation.x = -0.55
			_forearm_r.rotation.x = lerp(0.15, -0.55, _spike(progress, 0.55))
		_:
			_upper_arm_r.rotation.x = lerp(-2.4, -0.3, e)
			_upper_arm_r.rotation.y = -0.15
			_forearm_r.rotation.x = lerp(-0.3, 0.2, _spike(progress, 0.6))
	# The off hand and the shoulders brace, they do not just hang there.
	_upper_arm_l.rotation.x = -0.3
	_chest.rotation.y = lerp(0.0, -0.18, e) if which != 3 else 0.0


func _pose_heavy(progress: float) -> void:
	# Wind-up through 0.4, the cleave lands by 0.7, the rest is recovery.
	if progress < 0.4:
		var w := progress / 0.4
		_upper_arm_r.rotation.x = lerp(-0.4, -2.5, _ease_out(w))
		_forearm_r.rotation.x = lerp(0.0, -0.7, w)
		_chest.rotation.x = _chest_rest_z - 0.1 * w
	elif progress < 0.7:
		var s := (progress - 0.4) / 0.3
		_upper_arm_r.rotation.x = lerp(-2.5, 0.35, _ease_out(s))
		_forearm_r.rotation.x = lerp(-0.7, 0.1, s)
		_chest.rotation.x = lerp(_chest_rest_z - 0.1, _chest_rest_z + 0.25, s)
	else:
		var r := (progress - 0.7) / 0.3
		_upper_arm_r.rotation.x = lerp(0.35, 0.0, r)
		_forearm_r.rotation.x = lerp(0.1, 0.0, r)
		_chest.rotation.x = lerp(_chest_rest_z + 0.25, _chest_rest_z, r)
	_upper_arm_r.rotation.y = -0.1
	_upper_arm_l.rotation.x = -0.25


func _pose_guard(progress: float) -> void:
	# The blade comes up fast and holds, across the chest, both hands
	# effectively behind it: this is what makes its tip sit well above
	# where it rests at idle.
	var raise: float = _ease_out(clampf(progress / 0.2, 0.0, 1.0))
	_upper_arm_r.rotation.x = lerp(0.0, -1.55, raise)
	_upper_arm_r.rotation.y = lerp(0.0, -0.35, raise)
	_upper_arm_r.rotation.z = lerp(0.0, 0.25, raise)
	_forearm_r.rotation.x = lerp(0.0, -1.0, raise)
	_upper_arm_l.rotation.x = lerp(0.0, -1.1, raise)
	_upper_arm_l.rotation.z = lerp(0.0, -0.2, raise)
	_chest.rotation.x = _chest_rest_z + 0.06 * raise


func _pose_dash_legs(progress: float) -> void:
	_thigh_l.rotation.x = 0.55
	_thigh_r.rotation.x = -0.35
	_shin_l.rotation.x = -0.8
	_shin_r.rotation.x = -0.3
	_foot_l.rotation.x = 0.2
	_foot_r.rotation.x = -0.1


func _pose_dash_arms(progress: float) -> void:
	_upper_arm_l.rotation.x = -0.5
	_upper_arm_r.rotation.x = -0.45
	_forearm_l.rotation.x = 0.3
	_forearm_r.rotation.x = 0.3
	_chest.rotation.x = _chest_rest_z + 0.35
	# The coat tails trail behind through the whole travel.
	var trail: float = 0.9
	_coat_l.rotation.x = -trail
	_coat_r.rotation.x = -trail


func _pose_lunge_legs(progress: float) -> void:
	var e := _ease_out(progress)
	_thigh_l.rotation.x = lerp(0.1, 0.85, e)
	_thigh_r.rotation.x = lerp(0.0, -0.6, e)
	_shin_l.rotation.x = lerp(0.0, -0.9, e)
	_shin_r.rotation.x = lerp(0.0, -0.15, e)


func _pose_lunge_arms(progress: float) -> void:
	var e := _ease_out(progress)
	_upper_arm_r.rotation.x = lerp(0.1, -1.55, e)
	_forearm_r.rotation.x = lerp(0.0, -0.1, e)
	_upper_arm_l.rotation.x = lerp(0.0, -0.7, e)
	_chest.rotation.x = _chest_rest_z + lerp(0.0, 0.3, e)
	_coat_l.rotation.x = -e * 0.6
	_coat_r.rotation.x = -e * 0.6


func _pose_burst_legs(progress: float) -> void:
	var e := _ease_out(clampf(progress / 0.3, 0.0, 1.0))
	_thigh_l.rotation.x = -0.25 * e
	_thigh_r.rotation.x = -0.25 * e
	_shin_l.rotation.x = 0.2 * e
	_shin_r.rotation.x = 0.2 * e


func _pose_burst_arms(progress: float) -> void:
	var e := _ease_out(clampf(progress / 0.3, 0.0, 1.0))
	_upper_arm_l.rotation.z = lerp(0.0, 1.3, e)
	_upper_arm_r.rotation.z = lerp(0.0, -1.3, e)
	_upper_arm_l.rotation.x = -0.2
	_upper_arm_r.rotation.x = -0.2
	_forearm_l.rotation.x = -0.1
	_forearm_r.rotation.x = -0.1
	_chest.rotation.x = _chest_rest_z - 0.15 * e


func _pose_hit(progress: float) -> void:
	var snap := _spike(progress, 0.15)
	_chest.rotation.x = _chest_rest_z + 0.3 * snap
	_head.rotation.x = -_head_rest_x + 0.25 * snap
	_upper_arm_l.rotation.x = -0.6 * snap
	_upper_arm_r.rotation.x = -0.6 * snap
	_hips.position.y = _hips_rest_y - 0.03 * snap


func _pose_down_legs(progress: float) -> void:
	var e := _ease_out(progress)
	_thigh_l.rotation.x = lerp(0.0, 1.3, e)
	_thigh_r.rotation.x = lerp(0.0, 1.1, e)
	_shin_l.rotation.x = lerp(0.0, -1.6, e)
	_shin_r.rotation.x = lerp(0.0, -1.5, e)


func _pose_down_arms(progress: float) -> void:
	var e := _ease_out(progress)
	_hips.position.y = _hips_rest_y - 0.55 * e
	_chest.rotation.x = _chest_rest_z + 0.9 * e
	_head.rotation.x = -_head_rest_x + 0.5 * e
	_upper_arm_l.rotation.x = 0.3 * e
	_upper_arm_r.rotation.x = 0.3 * e
	_forearm_l.rotation.x = 0.2 * e
	_forearm_r.rotation.x = 0.2 * e


# ---------------------------------------------------------------------------
# Sentinel pose
# ---------------------------------------------------------------------------

func _pose_sentinel(delta: float, action: String, progress: float) -> void:
	match action:
		"cast_beam":
			_pose_sentinel_cast(progress)
		"down":
			_pose_sentinel_down(progress)
		"hit":
			_pose_sentinel_hit(progress)
		_:
			_pose_sentinel_idle()


func _pose_sentinel_idle() -> void:
	var bob := sin(_t * 1.3) * 0.05
	_hips.position.y = S_CORE_LOWER_Y + bob
	_chest.position.y = S_CORE_UPPER_Y + sin(_t * 1.3 + 0.6) * 0.05
	_chest.rotation.x = sin(_t * 0.7) * 0.03
	_head.rotation.y = sin(_t * 0.5) * 0.06
	var sway := sin(_t * 0.9) * 0.08
	_upper_arm_l.rotation.x = sway
	_upper_arm_r.rotation.x = -sway
	if _eye_material != null:
		_eye_material.emission_energy_multiplier = (2.6 if _time_of_day != "night" else 4.0) \
			+ sin(_t * 2.0) * 0.3


func _pose_sentinel_cast(progress: float) -> void:
	_pose_sentinel_idle()
	var lean := _spike(progress, 0.35)
	_chest.rotation.x = 0.05 + 0.35 * lean
	_head.rotation.x = 0.15 * lean
	_upper_arm_l.rotation.x = -0.4 * lean
	_upper_arm_r.rotation.x = -0.4 * lean
	if _eye_material != null:
		_eye_material.emission_energy_multiplier = lerp(2.6, 7.0, lean) \
			if _time_of_day != "night" else lerp(4.0, 8.0, lean)


func _pose_sentinel_down(progress: float) -> void:
	var e := _ease_out(progress)
	_hips.position.y = lerp(S_CORE_LOWER_Y, S_CORE_LOWER_Y - 0.35, e)
	_chest.position.y = lerp(S_CORE_UPPER_Y, S_CORE_UPPER_Y - 0.55, e)
	_chest.rotation.x = lerp(0.0, 0.8, e)
	_head.rotation.x = lerp(0.0, 0.5, e)
	_upper_arm_l.rotation.x = lerp(0.0, -1.0, e)
	_upper_arm_r.rotation.x = lerp(0.0, -1.0, e)
	if _eye_material != null:
		_eye_material.emission_energy_multiplier = lerp(2.6, 0.5, e)


func _pose_sentinel_hit(progress: float) -> void:
	_pose_sentinel_idle()
	var snap := _spike(progress, 0.2)
	_chest.rotation.x -= 0.25 * snap
	_head.rotation.x -= 0.2 * snap
