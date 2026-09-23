extends Node3D

# Original, code-built 3D character models for the crowdfunding demo (spec
# 002, section "The character"). Everything here is primitives, lathed
# solids-of-revolution and SurfaceTool/ArrayMesh shapes, lit by one shared
# cel-shaded toon shader with an inverted-hull outline pass; nothing is
# imported and nothing is traced from any other game, per the originality
# rule in docs/gdd/08-day-dreams-night-dreams-world.md.
#
# Second pass (art direction: stylised, painterly, cel-shaded). The rig, the
# pivot names, and the whole public API are locked by the judge merge of the
# first pass and are unchanged here: only how each pivot is dressed changed.
#
# Three kinds share one file so the humanoid rig (dreamwalker, keeper) and
# the pose math can be reused:
#   "dreamwalker" - the player. Deep slate-teal coat with curved, pointed
#     tails, one layered bronze-gold pauldron on the left shoulder only, a
#     violet mantle, and the Dreamedge, a single-edged longblade with a
#     glowing fuller.
#   "keeper"      - Mireth. An older woman in an ochre-and-rust hooded robe
#     that flares with a soft vertical ripple, a grey braid over one
#     shoulder, and a staff with a caged, actually-lit lantern.
#   "sentinel"    - the Hollow Sentinel. A hovering stone obelisk-construct:
#     a tapered monolith torso carved with glowing rune lines, a separate
#     chiselled head block with one eye, floating unattached forearms and
#     fists, and a handful of stone shards orbiting slowly where legs would
#     be.
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
const DW_SKIN := Color(0.83, 0.60, 0.51)
const DW_HAIR := Color(0.10, 0.09, 0.08)
const DW_CIRCLET := Color(0.74, 0.74, 0.82)
const DW_STEEL := Color(0.72, 0.74, 0.78)
const DW_FULLER := Color(0.58, 0.30, 0.97)

# Keeper (Mireth)
const K_ROBE := Color(0.57, 0.41, 0.17)
const K_TRIM := Color(0.42, 0.20, 0.10)
const K_HAIR := Color(0.74, 0.73, 0.70)
const K_SKIN := Color(0.78, 0.57, 0.50)
const K_STAFF := Color(0.27, 0.18, 0.11)
const K_LANTERN := Color(1.0, 0.72, 0.34)

# Hollow Sentinel
const S_STONE := Color(0.40, 0.38, 0.36)
const S_STONE_DARK := Color(0.25, 0.24, 0.23)
const S_BRONZE := Color(0.46, 0.33, 0.15)
const S_EYE_DAY := Color(1.0, 0.60, 0.14)
const S_EYE_NIGHT := Color(0.56, 0.24, 0.96)
const S_RUNE := Color(0.55, 0.30, 0.95)

# Shared cel-shading tints (a warm light side, a cool shadow side).
const WARM_TINT := Color(1.0, 0.93, 0.78)
const COOL_TINT := Color(0.48, 0.50, 0.64)
const STONE_WARM := Color(0.95, 0.88, 0.76)
const STONE_COOL := Color(0.33, 0.35, 0.42)

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

var kind := "dreamwalker"
var pivots := {}   # String -> Node3D, filled as the rig is built

var _built := false
var _time_of_day := "day"
var _t := 0.0
var _gait := 0.0

var _fuller_material: ShaderMaterial = null
var _eye_material: ShaderMaterial = null
var _accent_lights := []       # Array[{material: ShaderMaterial, day, night}]
var _accent_omni_lights := []  # Array[{light: OmniLight3D, day, night}]
var _sentinel_shard_ring: Node3D = null

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
# resting glow) simply run brighter after dark, and the keeper's lantern
# actually casts more light too.
func set_time_of_day(t: String) -> void:
	_time_of_day = t
	var night := t == "night"
	if _eye_material != null:
		var eye_color: Color = S_EYE_NIGHT if night else S_EYE_DAY
		_eye_material.set_shader_parameter("base_color", eye_color)
		_eye_material.set_shader_parameter("emission_color", eye_color)
	for entry in _accent_lights:
		var m: ShaderMaterial = entry["material"]
		m.set_shader_parameter("emission_energy", entry["night"] if night else entry["day"])
	for entry in _accent_omni_lights:
		var l: OmniLight3D = entry["light"]
		l.light_energy = entry["night"] if night else entry["day"]


# 0..1. Drives the violet fuller line on the Dreamedge; a no-op on kinds
# with no blade, so a caller never has to check `kind` first.
func set_blade_glow(amount: float) -> void:
	if _fuller_material == null:
		return
	_fuller_material.set_shader_parameter("emission_energy", lerp(0.6, 5.0, clampf(amount, 0.0, 1.0)))


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
# The shared toon shader: 2-3 soft cel bands with a warm/cool tint, a
# view-based rim light, emission for glowing accents, and a metallic-look
# glint band. One Shader resource (and one outline Shader/Material) is
# compiled once and reused by every ShaderMaterial this file creates, on
# every kind and every instance, which is both the cheap way to do it and
# what "share materials" means for a shader-driven look.
# ---------------------------------------------------------------------------

static var _toon_shader: Shader = null
static var _outline_shader: Shader = null
static var _outline_material: ShaderMaterial = null


static func _ensure_shared_shaders() -> void:
	if _toon_shader != null:
		return
	_toon_shader = Shader.new()
	_toon_shader.code = """
shader_type spatial;
render_mode blend_mix, cull_back, depth_draw_opaque, diffuse_lambert;

uniform vec4 base_color : source_color = vec4(1.0);
uniform vec4 warm_tint : source_color = vec4(1.0, 0.93, 0.78, 1.0);
uniform vec4 cool_tint : source_color = vec4(0.40, 0.43, 0.60, 1.0);
uniform float bands : hint_range(2.0, 4.0) = 3.0;
uniform float rim_amount : hint_range(0.0, 2.0) = 0.35;
uniform vec4 rim_color : source_color = vec4(1.0, 0.98, 0.94, 1.0);
uniform vec4 emission_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float emission_energy : hint_range(0.0, 8.0) = 0.0;
uniform float roughness_hint : hint_range(0.0, 1.0) = 0.75;
uniform float metallic_hint : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	ALBEDO = base_color.rgb;
	ROUGHNESS = roughness_hint;
	METALLIC = metallic_hint;
	vec3 n = normalize(NORMAL);
	vec3 v = normalize(VIEW);
	float rim = 1.0 - clamp(dot(n, v), 0.0, 1.0);
	rim = smoothstep(0.55, 1.0, rim) * rim_amount;
	EMISSION = emission_color.rgb * emission_energy + rim_color.rgb * rim;
}

void light() {
	float ndotl = dot(NORMAL, LIGHT);
	float lit = clamp(ndotl * 0.5 + 0.5, 0.0, 1.0);
	float step_count = max(bands, 1.0);
	float banded = clamp(ceil(lit * step_count) / step_count, 0.0, 1.0);
	vec3 tint = mix(cool_tint.rgb, warm_tint.rgb, banded);
	float glint = metallic_hint * smoothstep(0.85, 0.99, lit) * 0.9;
	DIFFUSE_LIGHT += ALBEDO * tint * (0.64 + 0.36 * banded) * ATTENUATION * LIGHT_COLOR
		+ vec3(glint) * ATTENUATION * LIGHT_COLOR;
}
"""
	_outline_shader = Shader.new()
	_outline_shader.code = """
shader_type spatial;
render_mode cull_front, unshaded, depth_draw_opaque, shadows_disabled;

uniform float outline_width : hint_range(0.0, 0.1) = 0.015;
uniform vec4 outline_color : source_color = vec4(0.06, 0.05, 0.09, 1.0);

void vertex() {
	vec3 world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	float dist = length(world_pos - CAMERA_POSITION_WORLD);
	float scale = clamp(dist / 3.0, 0.4, 4.0);
	VERTEX += NORMAL * outline_width * scale;
}

void fragment() {
	ALBEDO = outline_color.rgb;
}
"""
	_outline_material = ShaderMaterial.new()
	_outline_material.shader = _outline_shader
	_outline_material.set_shader_parameter("outline_width", 0.015)
	_outline_material.set_shader_parameter("outline_color", Color(0.06, 0.05, 0.09, 1.0))


# `double_sided` skips the (cull_back) default for thin, no-real-backface
# shapes such as the fuller line or a rune strip. `outline` turns off the
# inverted-hull pass for tiny accents where a 1.5 cm outline would swallow
# the whole mesh (an eye highlight, a thin glow line).
func _toon_mat(color: Color, warm: Color = WARM_TINT, cool: Color = COOL_TINT,
		rough: float = 0.75, metal: float = 0.0, rim_amt: float = 0.35,
		double_sided: bool = false, outline: bool = true) -> ShaderMaterial:
	_ensure_shared_shaders()
	var m := ShaderMaterial.new()
	m.shader = _toon_shader
	m.set_shader_parameter("base_color", color)
	m.set_shader_parameter("warm_tint", warm)
	m.set_shader_parameter("cool_tint", cool)
	m.set_shader_parameter("bands", 3.0)
	m.set_shader_parameter("rim_amount", rim_amt)
	m.set_shader_parameter("rim_color", Color(1.0, 0.98, 0.94))
	m.set_shader_parameter("emission_color", Color(0.0, 0.0, 0.0))
	m.set_shader_parameter("emission_energy", 0.0)
	m.set_shader_parameter("roughness_hint", rough)
	m.set_shader_parameter("metallic_hint", metal)
	if double_sided:
		# ShaderMaterial has no cull_mode of its own; culling lives in the
		# shader's render_mode, so a double-sided surface gets its own
		# Shader (still shared/static, built once) rather than a copy of
		# the default one.
		m.shader = _toon_shader_nocull()
	if outline:
		m.next_pass = _outline_material
	return m


static var _toon_shader_dc: Shader = null


static func _toon_shader_nocull() -> Shader:
	if _toon_shader_dc == null:
		_ensure_shared_shaders()
		_toon_shader_dc = Shader.new()
		_toon_shader_dc.code = _toon_shader.code.replace("cull_back", "cull_disabled")
	return _toon_shader_dc


func _glow_toon_mat(color: Color, energy: float, outline: bool = true) -> ShaderMaterial:
	var m := _toon_mat(color, WARM_TINT, COOL_TINT, 0.4, 0.05, 0.5, true, outline)
	m.set_shader_parameter("emission_color", color)
	m.set_shader_parameter("emission_energy", energy)
	return m


func _remember_accent(material: ShaderMaterial, day_energy: float, night_energy: float) -> void:
	_accent_lights.append({"material": material, "day": day_energy, "night": night_energy})


func _remember_omni(light: OmniLight3D, day_energy: float, night_energy: float) -> void:
	_accent_omni_lights.append({"light": light, "day": day_energy, "night": night_energy})


# ---------------------------------------------------------------------------
# Small mesh helpers, shared by every kind
# ---------------------------------------------------------------------------

func _pivot(parent: Node3D, pname: String, pos: Vector3) -> Node3D:
	var n := Node3D.new()
	n.name = pname
	n.position = pos
	parent.add_child(n)
	pivots[pname] = n
	return n


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


func _cyl(top_r: float, bottom_r: float, height: float, sides: int = 12) -> CylinderMesh:
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
	s.radial_segments = 14
	s.rings = 9
	return s


func _cap(radius: float, height: float) -> CapsuleMesh:
	var c := CapsuleMesh.new()
	c.radius = radius
	c.height = height
	c.radial_segments = 12
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


# A solid of revolution: `profile` is an Array of Vector3(y, radius_x,
# radius_z), letting a cross-section be elliptical (a chest wider than it
# is deep) rather than perfectly round. `fold_count`/`fold_amp` add a
# gentle angular ripple to every ring — a subtle cloth-fold or a chiselled
# facet, depending on segment count. This one function is the torso, the
# hips, the robe, the egg-shaped head and the sentinel's monolith.
func _lathe_mesh(profile: Array, radial_segments: int = 14, cap_bottom: bool = true,
		cap_top: bool = true, fold_count: int = 0, fold_amp: float = 0.0) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings: Array = []
	for p in profile:
		var y: float = p.x
		var rx: float = p.y
		var rz: float = p.z
		var ring: Array = []
		for s in range(radial_segments):
			var a := TAU * float(s) / float(radial_segments)
			var fold := 1.0
			if fold_count > 0:
				fold = 1.0 + fold_amp * cos(a * float(fold_count))
			ring.append(Vector3(cos(a) * rx * fold, y, sin(a) * rz * fold))
		rings.append(ring)
	# The winding that yields an outward-facing normal is opposite
	# depending on whether Y rises or falls through the profile. Most limb,
	# skirt and fist profiles are written joint-down to far-end (falling),
	# not just hip-up-to-collar (rising), and a fixed winding only reading
	# right for one of those directions is exactly what made the keeper's
	# skirt and the sentinel's floating fists render as flat, unlit black
	# shapes — the normal was pointing back into the mesh. Detected once
	# per call and applied consistently rather than assumed.
	var rising: bool = profile[profile.size() - 1].x >= profile[0].x
	for i in range(rings.size() - 1):
		var a: Array = rings[i]
		var b: Array = rings[i + 1]
		for s in range(radial_segments):
			var s2 := (s + 1) % radial_segments
			if rising:
				_st_quad(st, a[s], a[s2], b[s2], b[s])
			else:
				_st_quad(st, a[s2], a[s], b[s], b[s2])
	if cap_bottom:
		var first: Array = rings[0]
		var p0: Vector3 = profile[0]
		var center := Vector3(0.0, p0.x, 0.0)
		for s in range(radial_segments):
			var s2 := (s + 1) % radial_segments
			if rising:
				_st_tri(st, center, first[s2], first[s])
			else:
				_st_tri(st, center, first[s], first[s2])
	if cap_top:
		var last: Array = rings[rings.size() - 1]
		var pN: Vector3 = profile[profile.size() - 1]
		var center2 := Vector3(0.0, pN.x, 0.0)
		for s in range(radial_segments):
			var s2 := (s + 1) % radial_segments
			if rising:
				_st_tri(st, center2, last[s], last[s2])
			else:
				_st_tri(st, center2, last[s2], last[s])
	st.generate_normals()
	return st.commit()


# An open arc of a solid of revolution — the same Vector3(y, radius_x,
# radius_z) profile as _lathe_mesh, but swept only from angle_start to
# angle_end (radians; 0 = local +X, increasing toward +Z) instead of a
# full circle. This is a real 3D hood or cowl that wraps around the head
# and is genuinely open at the face, not a flat panel standing in for one.
func _partial_lathe_mesh(profile: Array, angle_start: float, angle_end: float,
		segments: int = 10) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings: Array = []
	for p in profile:
		var y: float = p.x
		var rx: float = p.y
		var rz: float = p.z
		var ring: Array = []
		for s in range(segments + 1):
			var a: float = lerp(angle_start, angle_end, float(s) / float(segments))
			ring.append(Vector3(cos(a) * rx, y, sin(a) * rz))
		rings.append(ring)
	var rising: bool = profile[profile.size() - 1].x >= profile[0].x
	for i in range(rings.size() - 1):
		var a: Array = rings[i]
		var b: Array = rings[i + 1]
		for s in range(segments):
			if rising:
				_st_quad(st, a[s], a[s + 1], b[s + 1], b[s])
			else:
				_st_quad(st, a[s + 1], a[s], b[s], b[s + 1])
	st.generate_normals()
	return st.commit()


# A tapered limb segment, near radius to far radius through a middle
# waypoint, with enough radial segments that it reads as round. Both ends
# are left open: a joint sphere (added separately, at the pivot) or the
# hand/foot mesh covers them, which is what keeps elbows and knees from
# gapping.
func _limb_mesh(length: float, r_near: float, r_mid: float, r_far: float,
		segments: int = 16) -> ArrayMesh:
	var profile := [
		Vector3(0.0, r_near, r_near),
		Vector3(-length * 0.5, r_mid, r_mid),
		Vector3(-length, r_far, r_far),
	]
	return _lathe_mesh(profile, segments, false, false)


# A flat tapered strip laid out along a hand-drawn centreline, width per
# point, with real thickness (front face, back face, and the two edges
# stitched between them) rather than a zero-thickness plane. `pointed_tip`
# closes the far end to a point instead of a flat cut hem. Used for the
# coat tails, the mantle and the hood, which all need to read as cloth with
# body from more than one angle.
func _thick_ribbon_mesh(centerline: Array, widths: Array, thickness: float,
		pointed_tip: bool = true) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var n := centerline.size()
	var front_l: Array = []
	var front_r: Array = []
	var back_l: Array = []
	var back_r: Array = []
	var half_t := thickness * 0.5
	for i in range(n):
		var c: Vector3 = centerline[i]
		var w: float = widths[i]
		front_l.append(c + Vector3(-w * 0.5, 0.0, half_t))
		front_r.append(c + Vector3(w * 0.5, 0.0, half_t))
		back_l.append(c + Vector3(-w * 0.5, 0.0, -half_t))
		back_r.append(c + Vector3(w * 0.5, 0.0, -half_t))
	for i in range(n - 1):
		_st_quad(st, front_l[i], front_r[i], front_r[i + 1], front_l[i + 1])
		_st_quad(st, back_r[i], back_l[i], back_l[i + 1], back_r[i + 1])
		_st_quad(st, back_l[i], front_l[i], front_l[i + 1], back_l[i + 1])
		_st_quad(st, front_r[i], back_r[i], back_r[i + 1], front_r[i + 1])
	if pointed_tip:
		var tip: Vector3 = (front_l[n - 1] + front_r[n - 1] + back_l[n - 1] + back_r[n - 1]) * 0.25
		_st_tri(st, front_l[n - 1], front_r[n - 1], tip)
		_st_tri(st, back_r[n - 1], back_l[n - 1], tip)
		_st_tri(st, back_l[n - 1], front_l[n - 1], tip)
		_st_tri(st, front_r[n - 1], back_r[n - 1], tip)
	else:
		_st_quad(st, back_l[n - 1], back_r[n - 1], front_r[n - 1], front_l[n - 1])
	st.generate_normals()
	return st.commit()


# A bent, tapered tube, built as a short chain of circular rings whose
# facing direction turns by `bend_deg` over its length. This is a hair
# clump or a braid: a swept shape, not a straight cone.
func _swept_tube_mesh(length: float, base_r: float, tip_r: float, bend_deg: float,
		segments: int = 8, stations: int = 5) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var rings: Array = []
	var pos := Vector3.ZERO
	var dir := Vector3(0.0, 1.0, 0.0)
	var step_len := length / float(stations - 1)
	var step_bend := deg_to_rad(bend_deg) / float(stations - 1)
	var right0 := Vector3(1.0, 0.0, 0.0)
	for i in range(stations):
		var t := float(i) / float(stations - 1)
		var r: float = lerp(base_r, tip_r, t)
		var right := dir.cross(Vector3(0.0, 0.0, 1.0))
		if right.length() < 0.01:
			right = right0
		right = right.normalized()
		var up2 := right.cross(dir).normalized()
		var ring: Array = []
		for s in range(segments):
			var a := TAU * float(s) / float(segments)
			ring.append(pos + (right * cos(a) + up2 * sin(a)) * r)
		rings.append(ring)
		pos += dir * step_len
		dir = dir.rotated(Vector3(1.0, 0.0, 0.0), step_bend).normalized()
	for i in range(stations - 1):
		var a: Array = rings[i]
		var b: Array = rings[i + 1]
		for s in range(segments):
			var s2 := (s + 1) % segments
			_st_quad(st, a[s], a[s2], b[s2], b[s])
	var last: Array = rings[stations - 1]
	for s in range(segments):
		var s2 := (s + 1) % segments
		_st_tri(st, pos, last[s], last[s2])
	var first: Array = rings[0]
	var base_center := Vector3.ZERO
	for s in range(segments):
		var s2 := (s + 1) % segments
		_st_tri(st, base_center, first[s], first[s2])
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


# Adds a rounded joint sphere at a pivot's own origin — this is what keeps
# an elbow or a knee from showing a gap between two tapered limb meshes.
func _joint(parent: Node3D, radius: float, material: Material, outline: bool = true) -> void:
	_mi(parent, _sph(radius, 0.9), material, Vector3.ZERO)


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

	# +Z is the character's own back (it faces -Z), so the coat tails hang
	# from the waist at the back and sides, not out in front of the legs.
	_coat_l = _pivot(_hips, "coat_l", Vector3(-hip_half_w * 1.05, -0.02, 0.08))
	_coat_r = _pivot(_hips, "coat_r", Vector3(hip_half_w * 1.05, -0.02, 0.08))


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

	var coat_mat := _toon_mat(DW_COAT, WARM_TINT, COOL_TINT, 0.8, 0.0, 0.3)
	var coat_trim_mat := _toon_mat(DW_COAT_TRIM, WARM_TINT, COOL_TINT, 0.8, 0.0, 0.25)
	var leather_mat := _toon_mat(DW_LEATHER, WARM_TINT, COOL_TINT, 0.75, 0.05, 0.25)
	var skin_mat := _toon_mat(DW_SKIN, WARM_TINT, COOL_TINT, 0.7, 0.0, 0.3)
	var hair_mat := _toon_mat(DW_HAIR, WARM_TINT, COOL_TINT, 0.55, 0.0, 0.18)
	var pauldron_mat := _toon_mat(DW_PAULDRON, Color(1.0, 0.97, 0.85), Color(0.35, 0.30, 0.20),
		0.3, 0.85, 0.55)
	var pauldron_rim_mat := _toon_mat(DW_PAULDRON * Color(0.62, 0.62, 0.62, 1.0),
		Color(0.85, 0.78, 0.55), Color(0.22, 0.18, 0.11), 0.35, 0.8, 0.45)
	var circlet_mat := _toon_mat(DW_CIRCLET, Color(1.0, 1.0, 1.0), Color(0.4, 0.4, 0.5), 0.25, 0.7, 0.5)
	var mantle_mat := _toon_mat(DW_MANTLE, Color(0.85, 0.65, 1.0), Color(0.22, 0.15, 0.40), 0.7, 0.0, 0.4)
	var steel_mat := _toon_mat(DW_STEEL, Color(1.0, 1.0, 1.0), Color(0.3, 0.32, 0.4), 0.25, 0.9, 0.6)
	var eye_dark_mat := _toon_mat(Color(0.08, 0.06, 0.06), WARM_TINT, COOL_TINT, 0.3, 0.0, 0.1, false, false)
	var eye_glint_mat := _glow_toon_mat(Color(1.0, 1.0, 0.98), 1.2, false)

	var lantern_mat := _glow_toon_mat(DW_LANTERN, 1.4)
	_remember_accent(lantern_mat, 1.4, 3.2)
	var thread_mat := _glow_toon_mat(DW_THREAD, 0.9, false)
	_remember_accent(thread_mat, 0.9, 2.6)

	# Torso: a lathe with an elliptical cross-section, chest wider than the
	# waist with a slight V, not a straight cylinder. It runs from the hip
	# joint to the collar so there is no bare gap at the waist.
	var torso_profile := [
		Vector3(0.0, 0.125, 0.110),
		Vector3(0.08, 0.115, 0.100),
		Vector3(0.20, 0.165, 0.140),
		Vector3(DW_SPINE + DW_CHEST, 0.205, 0.165),
	]
	_mi(_hips, _lathe_mesh(torso_profile, 14, true, false), coat_mat, Vector3.ZERO)
	# A high collar flares out from the neck base.
	var collar_profile := [Vector3(0.0, 0.09, 0.08), Vector3(0.09, 0.115, 0.105)]
	_mi(_neck, _lathe_mesh(collar_profile, 12, false, false), coat_mat, Vector3(0.0, -0.03, 0.0))

	# Coat tails: curved cloth panels with real thickness, flaring out then
	# closing to a pointed hem at the knee, split at the small of the back.
	var tail_len := DW_HIP_Y - DW_THIGH - 0.02
	var tail_line := [
		Vector3(0.0, 0.03, 0.0), Vector3(0.0, -tail_len * 0.30, 0.05),
		Vector3(0.0, -tail_len * 0.70, 0.08), Vector3(0.0, -tail_len, 0.04),
	]
	var tail_widths := [0.11, 0.13, 0.095, 0.015]
	var tail_mesh := _thick_ribbon_mesh(tail_line, tail_widths, 0.03, true)
	_mi(_coat_l, tail_mesh, coat_trim_mat, Vector3.ZERO)
	_mi(_coat_r, tail_mesh, coat_trim_mat, Vector3.ZERO)

	# Belt and the amber lantern charm.
	_mi(_hips, _ring(0.018, 0.175), leather_mat, Vector3(0.0, 0.02, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_hips, _sph(0.035, 0.85), lantern_mat, Vector3(0.13, -0.08, 0.05))
	_mi(_hips, _cyl(0.006, 0.006, 0.05, 6), leather_mat, Vector3(0.13, -0.03, 0.05))

	# Mantle: a scarf-like wrap around the neck and shoulders (a torus, not
	# a flat panel on the chest), with a single tail falling down the back.
	_mi(_neck, _ring(0.05, 0.14), mantle_mat, Vector3(0.0, -0.015, 0.01), Vector3(75.0, 0.0, 0.0))
	var mantle_line := [
		Vector3(0.0, 0.02, 0.11), Vector3(0.0, -0.15, 0.16),
		Vector3(0.0, -0.30, 0.19), Vector3(0.0, -0.42, 0.15),
	]
	var mantle_widths := [0.15, 0.19, 0.15, 0.08]
	_mi(_chest, _thick_ribbon_mesh(mantle_line, mantle_widths, 0.02, true), mantle_mat,
		Vector3(0.0, 0.06, 0.05))
	var thread_line := [Vector3(0.0, -0.38, 0.16), Vector3(0.0, -0.41, 0.145)]
	_mi(_chest, _thick_ribbon_mesh(thread_line, [0.13, 0.06], 0.006, false), thread_mat,
		Vector3(0.0, 0.06, 0.05))

	# Head: an egg-shaped lathe, softly modelled brow and nose, small dark
	# eyes with a highlight, and ears — a face, not a box with stickers.
	var head_profile := [
		Vector3(-0.10, 0.045, 0.05), Vector3(-0.055, 0.085, 0.09),
		Vector3(0.0, 0.11, 0.105), Vector3(0.05, 0.10, 0.10),
		Vector3(0.10, 0.075, 0.08), Vector3(0.145, 0.03, 0.035),
	]
	_mi(_head, _lathe_mesh(head_profile, 14, true, true), skin_mat, Vector3.ZERO)
	# Brow: a thin, subtle line, not a thick bar.
	var brow := _mi(_head, _cap(0.008, 0.105), skin_mat, Vector3(0.0, 0.022, -0.094))
	brow.rotation_degrees = Vector3(0.0, 0.0, 90.0)
	# Nose: small and straight, not a bulb.
	_mi(_head, _cyl(0.007, 0.011, 0.028, 8), skin_mat, Vector3(0.0, -0.002, -0.100), Vector3(80.0, 0.0, 0.0))
	_mi(_head, _sph(0.009, 0.8), skin_mat, Vector3(0.0, -0.020, -0.108))
	# Eyes: small dark almonds set slightly into the skull, a tiny
	# highlight, and small ears.
	for side in [-1.0, 1.0]:
		var eye := _mi(_head, _sph(0.012), eye_dark_mat, Vector3(0.032 * side, 0.014, -0.086))
		eye.scale = Vector3(1.7, 0.55, 0.75)
		var glint := _mi(_head, _sph(0.003), eye_glint_mat, Vector3(0.032 * side + 0.004, 0.018, -0.092))
		_mi(_head, _sph(0.016, 0.5), skin_mat, Vector3(0.098 * side, -0.012, 0.0))
	# Hair: a short, swept-back cut lying along the skull, not a spiky
	# crown — a flat cap of coverage over the top and back (so it never
	# reads as bald) plus a few clumps swept toward the back and down for
	# texture, none of it pointing straight up.
	_mi(_head, _sph(DW_HEAD_R * 0.97, 0.62), hair_mat, Vector3(0.0, 0.028, 0.025))
	_mi(_head, _swept_tube_mesh(0.12, 0.06, 0.018, -15.0, 8, 5), hair_mat,
		Vector3(0.0, 0.085, -0.01), Vector3(165.0, 0.0, 0.0))
	var hair_clumps := [
		{"pos": Vector3(0.05, 0.08, 0.0), "rot": Vector3(-115.0, 20.0, 5.0), "len": 0.095},
		{"pos": Vector3(-0.05, 0.08, 0.0), "rot": Vector3(-115.0, -20.0, -5.0), "len": 0.095},
		{"pos": Vector3(0.035, 0.06, 0.08), "rot": Vector3(-90.0, 15.0, 0.0), "len": 0.08},
		{"pos": Vector3(-0.035, 0.06, 0.08), "rot": Vector3(-90.0, -15.0, 0.0), "len": 0.08},
	]
	for c in hair_clumps:
		_mi(_head, _swept_tube_mesh(c["len"], 0.026, 0.006, -15.0, 7, 4), hair_mat, c["pos"], c["rot"])
	# Circlet: a thin band at the forehead, not a crown at the crown.
	_mi(_head, _ring(0.005, 0.116), circlet_mat, Vector3(0.0, -0.005, 0.0), Vector3(90.0, 0.0, 0.0))

	# The one asymmetric pauldron: a flat, layered shell of three curved
	# plates stepping down the shoulder, each with a slightly darker rim —
	# not a round dome.
	_mi(_shoulder_l, _sph(0.16, 0.28), pauldron_mat, Vector3(0.0, 0.045, -0.015))
	_mi(_shoulder_l, _ring(0.01, 0.155), pauldron_rim_mat, Vector3(0.0, 0.005, -0.015), Vector3(90.0, 0.0, 0.0))
	_mi(_shoulder_l, _sph(0.125, 0.28), pauldron_mat, Vector3(0.008, 0.015, 0.035))
	_mi(_shoulder_l, _ring(0.008, 0.12), pauldron_rim_mat, Vector3(0.008, -0.015, 0.035), Vector3(90.0, 0.0, 0.0))
	_mi(_shoulder_l, _sph(0.09, 0.28), pauldron_mat, Vector3(0.016, -0.01, 0.07))
	_mi(_shoulder_l, _ring(0.006, 0.086), pauldron_rim_mat, Vector3(0.016, -0.033, 0.07), Vector3(90.0, 0.0, 0.0))

	# Shoulder balls, tapered limbs and rounded joints — no gaps at the
	# elbows, no boxes for arms.
	for side in [
			{"sh": _shoulder_l, "up": _upper_arm_l, "fo": _forearm_l, "ha": _hand_l},
			{"sh": _shoulder_r, "up": _upper_arm_r, "fo": _forearm_r, "ha": _hand_r}]:
		var sh: Node3D = side["sh"]
		var up: Node3D = side["up"]
		var fo: Node3D = side["fo"]
		var ha: Node3D = side["ha"]
		_joint(sh, 0.065, coat_mat)
		_mi(up, _limb_mesh(DW_UPPER_ARM, 0.062, 0.058, 0.05, 16), coat_mat, Vector3.ZERO)
		_joint(fo, 0.05, leather_mat)
		_mi(fo, _limb_mesh(DW_FOREARM, 0.05, 0.047, 0.038, 16), leather_mat, Vector3.ZERO)
		_mi(fo, _ring(0.007, 0.052), leather_mat, Vector3(0.0, -0.03, 0.0), Vector3(90.0, 0.0, 0.0))
		_mi(ha, _sph(0.043, 0.75), skin_mat, Vector3.ZERO)

	# Legs: tapered thigh and shin with rounded hip, knee and ankle joints.
	for pair in [[_thigh_l, _shin_l, _foot_l], [_thigh_r, _shin_r, _foot_r]]:
		var thigh: Node3D = pair[0]
		var shin: Node3D = pair[1]
		var foot: Node3D = pair[2]
		_joint(thigh, 0.105, coat_mat)
		_mi(thigh, _limb_mesh(DW_THIGH, 0.10, 0.093, 0.075, 16), coat_mat, Vector3.ZERO)
		_joint(shin, 0.075, leather_mat)
		_mi(shin, _limb_mesh(DW_SHIN, 0.075, 0.068, 0.058, 16), leather_mat, Vector3.ZERO)
		_mi(foot, _sph(0.07, 0.65), leather_mat, Vector3(0.0, 0.0, -0.03))
		_mi(foot, _cyl(0.04, 0.06, 0.14, 10), leather_mat, Vector3(0.0, -0.02, -0.09), Vector3(90.0, 0.0, 0.0))

	# The Dreamedge, rigidly held in the right fist so every swing comes
	# from the arm chain and the blade simply follows. "A large
	# single-edged longblade": sized to read at ordinary game-camera
	# distance, not just in an extreme close-up.
	var grip := Node3D.new()
	grip.name = "blade_grip"
	grip.position = Vector3(0.0, -0.06, 0.0)
	_hand_r.add_child(grip)
	_mi(grip, _cyl(0.02, 0.022, 0.16, 10), leather_mat, Vector3(0.0, -0.08, 0.0))
	_mi(grip, _ring(0.012, 0.05), steel_mat, Vector3(0.0, -0.16, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(grip, _sph(0.026), steel_mat, Vector3(0.0, 0.01, 0.0))

	var blade_len := 0.92
	var blade_mesh := _blade_mesh(blade_len, 0.065, 0.018)
	_mi(grip, blade_mesh, steel_mat, Vector3(0.0, -0.17, 0.0))
	var fuller_line := [Vector3(0.0, -0.01, 0.010), Vector3(0.0, -blade_len * 0.85, 0.003)]
	_fuller_material = _glow_toon_mat(DW_FULLER, 1.4, false)
	_remember_accent(_fuller_material, 1.4, 3.2)
	_mi(grip, _thick_ribbon_mesh(fuller_line, [0.018, 0.006], 0.003, false), _fuller_material,
		Vector3(0.025, -0.17, 0.0))

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

	var robe_mat := _toon_mat(K_ROBE, WARM_TINT, COOL_TINT, 0.85, 0.0, 0.3)
	var trim_mat := _toon_mat(K_TRIM, WARM_TINT, COOL_TINT, 0.8, 0.0, 0.25)
	var skin_mat := _toon_mat(K_SKIN, WARM_TINT, COOL_TINT, 0.7, 0.0, 0.3)
	var hair_mat := _toon_mat(K_HAIR, WARM_TINT, COOL_TINT, 0.6, 0.0, 0.2)
	var eye_dark_mat := _toon_mat(Color(0.10, 0.08, 0.08), WARM_TINT, COOL_TINT, 0.3, 0.0, 0.1, false, false)
	var wood_mat := _toon_mat(K_STAFF, WARM_TINT, COOL_TINT, 0.85, 0.0, 0.2)
	var cage_mat := _toon_mat(S_BRONZE, Color(1.0, 0.96, 0.82), Color(0.3, 0.26, 0.18), 0.35, 0.75, 0.45)
	var lantern_glass := _glow_toon_mat(K_LANTERN, 2.6, false)
	_remember_accent(lantern_glass, 2.6, 4.5)

	# The long robe reaches to the ankle: a flared lathe, wider at the hem
	# than the top, with a soft vertical ripple standing in for folds.
	var skirt_h := K_HIP_Y - 0.05
	var skirt_profile := [
		Vector3(0.0, 0.125, 0.115), Vector3(-skirt_h * 0.4, 0.19, 0.175),
		Vector3(-skirt_h * 0.8, 0.27, 0.245), Vector3(-skirt_h, 0.31, 0.28),
	]
	_mi(_hips, _lathe_mesh(skirt_profile, 16, true, false, 10, 0.045), robe_mat, Vector3.ZERO)
	var torso_profile := [
		Vector3(0.0, 0.125, 0.115), Vector3(K_CHEST * 0.5, 0.135, 0.125),
		Vector3(K_CHEST + 0.04, 0.115, 0.105),
	]
	_mi(_spine, _lathe_mesh(torso_profile, 14, false, true), robe_mat, Vector3.ZERO)
	_mi(_hips, _ring(0.014, 0.135), trim_mat, Vector3(0.0, 0.03, 0.0), Vector3(90.0, 0.0, 0.0))
	var hem_line := [Vector3(0.0, 0.02, 0.02), Vector3(0.0, -skirt_h * 0.7, 0.20), Vector3(0.0, -skirt_h, 0.27)]
	_mi(_hips, _thick_ribbon_mesh(hem_line, [0.22, 0.27, 0.30], 0.016, false), trim_mat, Vector3(0.0, -0.02, -0.02))

	# Hood: a rounded cowl that actually wraps around the head — a partial
	# solid of revolution, open across a 120-degree arc at the face — not a
	# flat panel standing in for one.
	var hood_profile := [
		Vector3(-0.17, 0.155, 0.155), Vector3(-0.05, 0.15, 0.15),
		Vector3(0.07, 0.135, 0.135), Vector3(0.15, 0.075, 0.075),
	]
	_mi(_head, _partial_lathe_mesh(hood_profile, deg_to_rad(330.0), deg_to_rad(570.0), 14),
		trim_mat, Vector3.ZERO)

	# Face: an egg-shaped lathe like the dreamwalker's, older and framed by
	# the hood rather than hair.
	var head_profile := [
		Vector3(-0.09, 0.04, 0.045), Vector3(-0.05, 0.075, 0.08),
		Vector3(0.0, 0.095, 0.09), Vector3(0.045, 0.088, 0.088),
		Vector3(0.09, 0.06, 0.065), Vector3(0.12, 0.025, 0.03),
	]
	_mi(_head, _lathe_mesh(head_profile, 14, true, true), skin_mat, Vector3.ZERO)
	var brow := _mi(_head, _cap(0.007, 0.09), skin_mat, Vector3(0.0, 0.016, -0.080))
	brow.rotation_degrees = Vector3(0.0, 0.0, 90.0)
	_mi(_head, _cyl(0.006, 0.009, 0.024, 8), skin_mat, Vector3(0.0, -0.004, -0.086), Vector3(80.0, 0.0, 0.0))
	_mi(_head, _sph(0.008, 0.8), skin_mat, Vector3(0.0, -0.018, -0.092))
	for side in [-1.0, 1.0]:
		var eye := _mi(_head, _sph(0.010), eye_dark_mat, Vector3(0.026 * side, 0.012, -0.073))
		eye.scale = Vector3(1.6, 0.55, 0.75)
		_mi(_head, _sph(0.015, 0.5), skin_mat, Vector3(0.078 * side, -0.01, 0.0))

	# A grey braid, swept from the back of the head over one shoulder and
	# down the front of the chest.
	_mi(_head, _swept_tube_mesh(0.62, 0.026, 0.012, 70.0, 7, 7), hair_mat,
		Vector3(0.07, -0.02, 0.09), Vector3(150.0, 25.0, 0.0))

	# The right hand carries a tall staff with a caged, actually-glowing
	# lantern; the left hand rests near the robe.
	_mi(_hand_l, _sph(0.04, 0.85), skin_mat, Vector3.ZERO)
	_mi(_hand_r, _sph(0.04, 0.85), skin_mat, Vector3.ZERO)

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
	_mi(staff, _cyl(0.018, 0.022, staff_len, 10), wood_mat,
		Vector3(0.0, staff_top - staff_len * 0.5, 0.0))
	# The hook: two short angled dowels rather than a swept curve, so it
	# reads clearly at this scale instead of vanishing edge-on.
	_mi(staff, _cyl(0.012, 0.015, 0.09, 8), wood_mat,
		Vector3(0.025, staff_top + 0.01, 0.0), Vector3(0.0, 0.0, 55.0))
	_mi(staff, _cyl(0.009, 0.012, 0.07, 8), wood_mat,
		Vector3(0.075, staff_top - 0.02, 0.0), Vector3(0.0, 0.0, 115.0))
	_mi(staff, _cyl(0.004, 0.004, 0.06, 6), wood_mat, Vector3(0.095, staff_top - 0.09, 0.0))
	# A small caged lantern: a glowing core behind four thin bronze bars.
	var lantern_pos := Vector3(0.095, staff_top - 0.155, 0.0)
	_mi(staff, _sph(0.028), lantern_glass, lantern_pos)
	for i in range(4):
		var a := TAU * float(i) / 4.0
		_mi(staff, _cyl(0.003, 0.003, 0.075, 5), cage_mat,
			lantern_pos + Vector3(cos(a) * 0.03, 0.0, sin(a) * 0.03))
	_mi(staff, _ring(0.005, 0.032), cage_mat, lantern_pos + Vector3(0.0, 0.036, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(staff, _ring(0.005, 0.032), cage_mat, lantern_pos + Vector3(0.0, -0.036, 0.0), Vector3(90.0, 0.0, 0.0))
	var lantern_light := OmniLight3D.new()
	lantern_light.position = lantern_pos
	lantern_light.omni_range = 4.0
	lantern_light.light_energy = 1.3
	lantern_light.light_color = K_LANTERN
	staff.add_child(lantern_light)
	_remember_omni(lantern_light, 1.3, 2.1)
	pivots["staff"] = staff

	# Arms and legs, mostly hidden under the robe but present for the rig.
	for side in [
			{"sh": _shoulder_l, "up": _upper_arm_l, "fo": _forearm_l},
			{"sh": _shoulder_r, "up": _upper_arm_r, "fo": _forearm_r}]:
		var sh: Node3D = side["sh"]
		var up: Node3D = side["up"]
		var fo: Node3D = side["fo"]
		_joint(sh, 0.05, robe_mat)
		_mi(up, _limb_mesh(K_UPPER_ARM, 0.05, 0.046, 0.04, 14), robe_mat, Vector3.ZERO)
		_joint(fo, 0.038, robe_mat)
		_mi(fo, _limb_mesh(K_FOREARM, 0.038, 0.035, 0.03, 14), robe_mat, Vector3.ZERO)
	for pair in [[_thigh_l, _shin_l, _foot_l], [_thigh_r, _shin_r, _foot_r]]:
		var thigh: Node3D = pair[0]
		var shin: Node3D = pair[1]
		var foot: Node3D = pair[2]
		_mi(thigh, _limb_mesh(K_THIGH, 0.075, 0.07, 0.06, 12), robe_mat, Vector3.ZERO)
		_mi(shin, _limb_mesh(K_SHIN, 0.06, 0.052, 0.045, 12), robe_mat, Vector3.ZERO)
		_mi(foot, _sph(0.055, 0.6), trim_mat, Vector3(0.0, 0.0, -0.02))


# ---------------------------------------------------------------------------
# The Hollow Sentinel — a hovering stone obelisk-construct
# ---------------------------------------------------------------------------

const S_HOVER_Y := 0.35
const S_CORE_LOWER_Y := 0.78
const S_CORE_UPPER_Y := 1.55
const S_HEAD_Y := 2.15
const S_SHOULDER_X := 0.60
const S_UPPER_ARM := 0.34
const S_FOREARM := 0.32


func _build_sentinel() -> void:
	_hover_base_y = S_HOVER_Y
	_hips = _pivot(self, "hips", Vector3(0.0, S_CORE_LOWER_Y, 0.0))
	_chest = _pivot(self, "chest", Vector3(0.0, S_CORE_UPPER_Y, 0.0))
	_head = _pivot(_chest, "head", Vector3(0.0, S_HEAD_Y - S_CORE_UPPER_Y, 0.0))
	_eye = _pivot(_head, "eye", Vector3(0.0, -0.02, -0.26))

	_shoulder_l = _pivot(_chest, "shoulder_l", Vector3(-S_SHOULDER_X, 0.12, 0.0))
	_upper_arm_l = _pivot(_shoulder_l, "upper_arm_l", Vector3.ZERO)
	_forearm_l = _pivot(_upper_arm_l, "forearm_l", Vector3(0.0, -S_UPPER_ARM, 0.0))
	_hand_l = _pivot(_forearm_l, "hand_l", Vector3(0.0, -S_FOREARM, 0.0))

	_shoulder_r = _pivot(_chest, "shoulder_r", Vector3(S_SHOULDER_X, 0.12, 0.0))
	_upper_arm_r = _pivot(_shoulder_r, "upper_arm_r", Vector3.ZERO)
	_forearm_r = _pivot(_upper_arm_r, "forearm_r", Vector3(0.0, -S_UPPER_ARM, 0.0))
	_hand_r = _pivot(_forearm_r, "hand_r", Vector3(0.0, -S_FOREARM, 0.0))

	# Matte, chiselled stone: low rim, so smooth-reading lathed forms still
	# look like hewn rock rather than a polished ball under the key/rim
	# lighting rig. Low radial-segment lathes throughout give the facets
	# that read as carved, not cast.
	var stone_mat := _toon_mat(S_STONE, STONE_WARM, STONE_COOL, 0.95, 0.05, 0.16)
	var stone_dark_mat := _toon_mat(S_STONE_DARK, STONE_WARM, STONE_COOL, 0.95, 0.05, 0.14)
	var bronze_mat := _toon_mat(S_BRONZE, Color(1.0, 0.95, 0.78), Color(0.32, 0.27, 0.17), 0.4, 0.75, 0.5)
	_eye_material = _glow_toon_mat(S_EYE_DAY, 2.6, false)
	_remember_accent(_eye_material, 2.6, 4.0)
	var rune_mat := _glow_toon_mat(S_RUNE, 1.6, false)
	_remember_accent(rune_mat, 1.6, 3.4)

	# Torso: a tall tapered monolith, wider at the shoulders than the base,
	# carved with thin glowing rune lines. A faceted six-sided lathe, not a
	# smooth cylinder and not a stack of boxes.
	var torso_profile := [
		Vector3(-0.58, 0.17, 0.17), Vector3(-0.32, 0.24, 0.24),
		Vector3(-0.02, 0.32, 0.32), Vector3(0.28, 0.38, 0.38),
		Vector3(0.42, 0.40, 0.40), Vector3(0.46, 0.40, 0.40),
	]
	_mi(_chest, _lathe_mesh(torso_profile, 6, true, true), stone_mat, Vector3.ZERO)
	for i in range(3):
		var a := TAU * float(i) / 3.0 + 0.3
		var rune_line := [Vector3(0.0, -0.42, 0.0), Vector3(0.0, 0.32, 0.0)]
		var m := _mi(_chest, _thick_ribbon_mesh(rune_line, [0.03, 0.02], 0.01, false), rune_mat,
			Vector3(cos(a) * 0.30, 0.0, sin(a) * 0.30))
		m.rotation_degrees = Vector3(0.0, rad_to_deg(-a) + 90.0, 0.0)
	_mi(_chest, _ring(0.05, 0.42), bronze_mat, Vector3(0.0, 0.40, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_chest, _ring(0.04, 0.28), bronze_mat, Vector3(0.0, -0.30, 0.0), Vector3(90.0, 0.0, 0.0))
	# The banded joint that once carried a separate lower core is now the
	# collar between the torso's base and the floating shard cluster below
	# it: a visible gap, because this thing hovers, it does not stand.
	_mi(self, _cyl(0.15, 0.19, 0.16, 6), bronze_mat,
		Vector3(0.0, (S_CORE_LOWER_Y + S_CORE_UPPER_Y - 0.58) * 0.5, 0.0))

	# Head: a separate chiselled block, angular like the torso, joined by a
	# bronze collar rather than blended into it.
	var head_profile := [
		Vector3(-0.19, 0.16, 0.17), Vector3(-0.05, 0.20, 0.21),
		Vector3(0.10, 0.19, 0.20), Vector3(0.20, 0.14, 0.15),
	]
	_mi(_head, _lathe_mesh(head_profile, 6, true, true), stone_mat, Vector3.ZERO)
	_mi(_head, _ring(0.03, 0.205), bronze_mat, Vector3(0.0, -0.19, 0.0), Vector3(90.0, 0.0, 0.0))
	_mi(_head, _ring(0.018, 0.145), bronze_mat, Vector3(0.0, -0.02, -0.16), Vector3(90.0, 0.0, 0.0))
	_mi(_eye, _sph(0.11), _eye_material, Vector3.ZERO)
	_mi(_eye, _ring(0.012, 0.12), bronze_mat, Vector3.ZERO, Vector3(90.0, 0.0, 0.0))

	# Arms: floating stone forearms and fists, held a little away from the
	# body. There is no shoulder or upper-arm mesh at all — the pivots
	# still exist and still animate (so a lean or a sway carries the
	# floating chunk with it), but nothing visibly connects them to the
	# torso. That gap is the point.
	for side in [_forearm_l, _forearm_r]:
		var fore_profile := [
			Vector3(0.0, 0.11, 0.115), Vector3(-S_FOREARM * 0.55, 0.135, 0.14),
			Vector3(-S_FOREARM * 0.85, 0.125, 0.13),
		]
		_mi(side, _lathe_mesh(fore_profile, 6, true, false), stone_dark_mat, Vector3.ZERO)
		_mi(side, _ring(0.018, 0.135), bronze_mat, Vector3(0.0, -S_FOREARM * 0.35, 0.0), Vector3(90.0, 0.0, 0.0))
	for side in [_hand_l, _hand_r]:
		var fist_profile := [
			Vector3(0.13, 0.03, 0.03), Vector3(0.04, 0.13, 0.135),
			Vector3(-0.08, 0.14, 0.145), Vector3(-0.17, 0.05, 0.05),
		]
		_mi(side, _lathe_mesh(fist_profile, 6, true, true), stone_mat, Vector3(0.0, -0.02, 0.0),
			Vector3(90.0, 0.0, 0.0))
		_mi(side, _ring(0.018, 0.13), bronze_mat, Vector3(0.0, 0.02, 0.0), Vector3(90.0, 0.0, 0.0))

	# Below the waist: no legs. Three to four stone shards float and orbit
	# slowly, in place of legs, parented to `hips` so they carry that
	# pivot's own idle bob independently of the torso's.
	var shard_ring := Node3D.new()
	shard_ring.name = "shard_ring"
	_hips.add_child(shard_ring)
	_sentinel_shard_ring = shard_ring
	pivots["shard_ring"] = shard_ring
	var shard_defs := [
		{"a": 0.3, "r": 0.30, "y": -0.16, "rot": Vector3(15.0, 40.0, 8.0)},
		{"a": 2.1, "r": 0.32, "y": -0.26, "rot": Vector3(-10.0, 130.0, -6.0)},
		{"a": 3.8, "r": 0.28, "y": -0.12, "rot": Vector3(20.0, 230.0, 12.0)},
		{"a": 5.3, "r": 0.31, "y": -0.30, "rot": Vector3(-15.0, 320.0, -10.0)},
	]
	var shard_profile := [Vector3(-0.13, 0.02, 0.02), Vector3(0.0, 0.065, 0.06), Vector3(0.11, 0.012, 0.012)]
	var shard_mesh := _lathe_mesh(shard_profile, 5, true, true)
	for d in shard_defs:
		var a: float = d["a"]
		var shard := Node3D.new()
		shard.position = Vector3(cos(a) * float(d["r"]), float(d["y"]), sin(a) * float(d["r"]))
		shard.rotation_degrees = d["rot"]
		shard_ring.add_child(shard)
		_mi(shard, shard_mesh, stone_dark_mat, Vector3.ZERO)
		_mi(shard, _ring(0.006, 0.05), bronze_mat, Vector3.ZERO, Vector3(90.0, 0.0, 0.0))


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
	if _sentinel_shard_ring != null:
		_sentinel_shard_ring.rotation.y = _t * 0.35
	if _eye_material != null:
		_eye_material.set_shader_parameter("emission_energy",
			(2.6 if _time_of_day != "night" else 4.0) + sin(_t * 2.0) * 0.3)


func _pose_sentinel_cast(progress: float) -> void:
	_pose_sentinel_idle()
	var lean := _spike(progress, 0.35)
	_chest.rotation.x = 0.05 + 0.35 * lean
	_head.rotation.x = 0.15 * lean
	_upper_arm_l.rotation.x = -0.4 * lean
	_upper_arm_r.rotation.x = -0.4 * lean
	if _eye_material != null:
		_eye_material.set_shader_parameter("emission_energy", lerp(2.6, 7.0, lean) \
			if _time_of_day != "night" else lerp(4.0, 8.0, lean))


func _pose_sentinel_down(progress: float) -> void:
	var e := _ease_out(progress)
	_hips.position.y = lerp(S_CORE_LOWER_Y, S_CORE_LOWER_Y - 0.35, e)
	_chest.position.y = lerp(S_CORE_UPPER_Y, S_CORE_UPPER_Y - 0.55, e)
	_chest.rotation.x = lerp(0.0, 0.8, e)
	_head.rotation.x = lerp(0.0, 0.5, e)
	_upper_arm_l.rotation.x = lerp(0.0, -1.0, e)
	_upper_arm_r.rotation.x = lerp(0.0, -1.0, e)
	if _eye_material != null:
		_eye_material.set_shader_parameter("emission_energy", lerp(2.6, 0.5, e))


func _pose_sentinel_hit(progress: float) -> void:
	_pose_sentinel_idle()
	var snap := _spike(progress, 0.2)
	_chest.rotation.x -= 0.25 * snap
	_head.rotation.x -= 0.2 * snap
