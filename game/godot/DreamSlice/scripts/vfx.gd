extends RefCounted

# Spec 002 (specs/002-crowdfunding-demo/spec.md): the visual effects for the
# two new skills, the perfect dodge, and the Hollow Sentinel's beam. Every
# function here is static and spawns one self-freeing Node3D under a parent
# the caller supplies; nothing here keeps state of its own, the same shape as
# combo.gd and movement.gd.
#
# The Dreamwalker's colour is violet (0.62, 0.42, 1.0). Warm gold marks a
# perfect dodge or a solid impact. The Sentinel's colour (amber by day,
# violet by night, per docs/gdd/08-day-dreams-night-dreams-world.md) is
# always passed in by the caller, never hard-coded here.
#
# Every effect drives its own fade and its own queue_free with a tiny script
# attached at spawn time (see _timed_root below) instead of get_tree() or
# create_tween(), because both of those raise on a node that is not yet
# inside the SceneTree. A skill can land, and this file can be asked to draw
# its effect, before the world has finished settling the frame the caller
# spawned it from; a helper that only works inside a live tree would fail
# silently in exactly that moment, so none of these functions require one.
# tests/test_skills_new.gd proves it by calling every function with a parent
# that is never added to a tree at all.

const DREAMWALKER_VIOLET := Color(0.62, 0.42, 1.0)
const PERFECT_GOLD := Color(1.0, 0.92, 0.55)
const TELEGRAPH_WARNING := Color(1.0, 0.55, 0.15)


# The driver script every effect root wears. `life` is seconds, `on_tick(t)`
# is called every frame with t in [0, 1], and `on_done()` fires once, right
# before the node frees itself. Reached through Object.set()/get(), never a
# typed property access, because the static type of the node handed back to
# callers stays Node3D and Node3D itself has no such members; going through
# set() is what keeps every other variable in this file honestly typed.
const _DRIVER_SOURCE := """extends Node3D

var life := 0.2
var elapsed := 0.0
var on_tick: Callable
var on_done: Callable

func _process(delta: float) -> void:
	elapsed += delta
	var t: float = clampf(elapsed / life, 0.0, 1.0) if life > 0.0 else 1.0
	if on_tick.is_valid():
		on_tick.call(t)
	if elapsed >= life:
		if on_done.is_valid():
			on_done.call()
		queue_free()
"""


static func _driver_script() -> GDScript:
	var driver := GDScript.new()
	driver.source_code = _DRIVER_SOURCE
	driver.reload()
	return driver


static func _timed_root(parent: Node3D, origin: Vector3, life: float) -> Node3D:
	var root := Node3D.new()
	root.set_script(_driver_script())
	root.set("life", life)
	root.position = origin
	parent.add_child(root)
	return root


## `double_sided` disables culling (visible from both faces), the right
## choice for a thin one-sided ribbon or card like slash_arc or a spark's
## quad. It is the wrong choice for a long, thick solid the camera can end up
## inside -- the Hollow Sentinel's beam, both its telegraph and its fire, are
## a box up to 26 m long that the chase camera can and does end up embedded
## in right after a Dream Lunge or a close approach (spec 003 lever 4: the
## pale-orange washout after the lunge, found by capturing frames and reading
## them). With culling disabled, a camera inside the box renders every one of
## its inward-facing surfaces and the screen washes out solid; with normal
## back-face culling every face of a box is a back face as seen from inside
## it, so none of them draw and the camera simply sees through the beam
## instead -- while it still reads as a solid glowing shaft from any exterior
## angle, which is the only place it is meant to be seen from.
static func _emissive_material(colour: Color, additive: bool = true,
		double_sided: bool = true) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = colour
	m.emission_enabled = true
	m.emission = colour
	m.emission_energy_multiplier = 2.5
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if double_sided:
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	if additive:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	return m


# The forward direction at a given yaw, in the same convention movement.gd and
# player.gd already use: yaw 0 faces -Z, and increasing yaw turns the way the
# camera does when the player looks left.
static func _forward(yaw: float) -> Vector3:
	return Basis(Vector3.UP, yaw) * Vector3(0.0, 0.0, -1.0)


static func _right(yaw: float) -> Vector3:
	return Basis(Vector3.UP, yaw) * Vector3(1.0, 0.0, 0.0)


# A crescent ribbon, built by hand into an ArrayMesh rather than a primitive,
# so the ends taper to a point instead of a blunt slab. Used for swing 1 to 3
# with different arc_from/arc_to pairs sweeping around a diagonal axis, and
# for the heavy swing with `vertical = true`, which sweeps the same crescent
# through a plane standing on the facing direction instead, for an overhead
# cleave rather than a side-to-side cut. It sweeps and fades over ~0.2s.
static func slash_arc(parent: Node3D, origin: Vector3, yaw: float, arc_from: float, arc_to: float,
		radius: float, colour: Color, height: float, vertical: bool = false) -> Node3D:
	var root := _timed_root(parent, origin + Vector3(0.0, height, 0.0), 0.2)

	var forward := _forward(yaw)
	var pivot := _right(yaw)
	var segments := 14
	var base_width: float = radius * 0.32

	# A light swing built dead flat in the horizontal plane sits almost
	# edge-on to the game's over-the-shoulder camera (SpringArm3D pitches to
	# roughly -0.22 rad in player.gd) and nearly disappears -- caught by
	# looking at a picture of it on 2026-09-23. Tilting the sweep axis a
	# third of the way toward the character's right side keeps the ribbon a
	# real, camera-facing crescent instead of a hairline, and reads as a
	# proper diagonal slash besides, the shape real swing VFX usually use.
	# The heavy attack's overhead cleave already stands upright on its own
	# and keeps the plain right-axis sweep.
	var sweep_axis: Vector3 = pivot if vertical else (Vector3.UP + pivot * 0.55).normalized()
	var plane_normal := sweep_axis

	# Two vertices (outer, inner) per sample point along the arc, shared
	# between the two triangles on either side of it -- the standard way to
	# build a ribbon, and simpler to get right than a fresh quad per segment.
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	var uvs := PackedVector2Array()
	for i in range(segments + 1):
		var f: float = float(i) / float(segments)
		var angle: float = lerpf(arc_from, arc_to, f)
		var dir: Vector3 = (Basis(sweep_axis, angle) * forward).normalized()
		var taper: float = sin(f * PI)
		var w: float = base_width * taper
		var outer: Vector3 = dir * radius
		var inner: Vector3 = dir * maxf(radius - w - 0.05, 0.02)
		vertices.append(outer)
		vertices.append(inner)
		normals.append(plane_normal)
		normals.append(plane_normal)
		uvs.append(Vector2(f, 0.0))
		uvs.append(Vector2(f, 1.0))

	var indices := PackedInt32Array()
	for i in range(segments):
		var o0 := i * 2
		var n0 := i * 2 + 1
		var o1 := i * 2 + 2
		var n1 := i * 2 + 3
		indices.append(o0)
		indices.append(n0)
		indices.append(o1)
		indices.append(n0)
		indices.append(n1)
		indices.append(o1)

	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)

	var mesh_inst := MeshInstance3D.new()
	mesh_inst.mesh = mesh
	var material := _emissive_material(colour)
	mesh_inst.material_override = material
	root.add_child(mesh_inst)

	root.set("on_tick", func(t: float) -> void:
		var c: Color = colour
		c.a = 1.0 - t
		material.albedo_color = c
		material.emission = Color(colour.r, colour.g, colour.b) * (1.0 - t * 0.4)
		mesh_inst.scale = Vector3.ONE * (1.0 + t * 0.12)
	)
	return root


# A spark burst that works on web (CPUParticles3D, never GPUParticles3D)
# plus a quick flash of light so a hit reads even at a glance.
static func impact(parent: Node3D, pos: Vector3, colour: Color) -> Node3D:
	var root := _timed_root(parent, pos, 0.4)

	var particles := CPUParticles3D.new()
	particles.emitting = true
	particles.one_shot = true
	particles.amount = 18
	particles.lifetime = 0.35
	particles.explosiveness = 1.0
	particles.direction = Vector3.UP
	particles.spread = 180.0
	particles.gravity = Vector3(0.0, -9.0, 0.0)
	particles.initial_velocity_min = 2.5
	particles.initial_velocity_max = 5.5
	particles.scale_amount_min = 0.08
	particles.scale_amount_max = 0.18
	particles.color = colour
	# CPUParticles3D draws its mesh with the DEFAULT material unless one is
	# given directly -- unlit sparks against a dark background were nearly
	# invisible until this was added.
	particles.material_override = _emissive_material(colour)
	var spark := SphereMesh.new()
	spark.radius = 0.08
	spark.height = 0.16
	particles.mesh = spark
	root.add_child(particles)

	# A small bright core, the same trick perfect_dodge uses for its flash,
	# so the hit reads as a solid flare even before or between spark frames.
	var core := MeshInstance3D.new()
	var core_mesh := SphereMesh.new()
	core_mesh.radius = 0.35
	core_mesh.height = 0.7
	core.mesh = core_mesh
	var core_mat := _emissive_material(colour)
	core.material_override = core_mat
	root.add_child(core)

	var flash := OmniLight3D.new()
	flash.light_color = colour
	flash.light_energy = 5.0
	flash.omni_range = 3.5
	root.add_child(flash)

	root.set("on_tick", func(t: float) -> void:
		flash.light_energy = lerpf(5.0, 0.0, t)
		core.scale = Vector3.ONE * (1.0 + t * 1.8)
		var cc: Color = colour
		cc.a = 1.0 - t
		core_mat.albedo_color = cc
	)
	return root


# An expanding shockwave ring flat on the ground plus a vertical shimmer
# through its centre, for Nightveil Burst.
static func ring(parent: Node3D, center: Vector3, radius: float, colour: Color) -> Node3D:
	var root := _timed_root(parent, center, 0.45)

	var ring_mesh := MeshInstance3D.new()
	var torus := TorusMesh.new()
	# A noticeably thick tube: at the original 0.85 the ring read as a
	# near-invisible hairline once the picture was actually looked at.
	torus.inner_radius = radius * 0.62
	torus.outer_radius = radius
	ring_mesh.mesh = torus
	ring_mesh.position = Vector3(0.0, 0.05, 0.0)
	var ring_mat := _emissive_material(colour)
	ring_mat.emission_energy_multiplier = 4.0
	ring_mesh.material_override = ring_mat
	ring_mesh.scale = Vector3(0.05, 0.05, 0.05)
	root.add_child(ring_mesh)

	var shimmer := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = radius * 0.04
	cyl.bottom_radius = radius * 0.6
	cyl.height = 2.6
	shimmer.mesh = cyl
	shimmer.position = Vector3(0.0, 1.3, 0.0)
	var shimmer_mat := _emissive_material(colour)
	shimmer_mat.emission_energy_multiplier = 3.5
	var shimmer_start: Color = colour
	shimmer_start.a = 0.32
	shimmer_mat.albedo_color = shimmer_start
	shimmer.material_override = shimmer_mat
	root.add_child(shimmer)

	root.set("on_tick", func(t: float) -> void:
		var s: float = lerpf(0.05, 1.0, t)
		ring_mesh.scale = Vector3(s, 1.0, s)
		var c: Color = colour
		c.a = 1.0 - t
		ring_mat.albedo_color = c
		shimmer.scale = Vector3(1.0 - t * 0.3, 1.0 - t * 0.55, 1.0 - t * 0.3)
		var sc: Color = colour
		sc.a = 0.32 * (1.0 - t)
		shimmer_mat.albedo_color = sc
	)
	return root


# A streak of motion for the lunge's travel plus three fading afterimage
# ghosts along the path, each a translucent capsule sized like the player's
# own body (scripts/player.gd uses the same 0.4 radius, 1.8 height capsule).
static func lunge_streak(parent: Node3D, from: Vector3, to: Vector3, colour: Color) -> Node3D:
	var root := _timed_root(parent, from, 0.3)
	var diff: Vector3 = to - from
	var length: float = diff.length()
	# Same convention as dummy.gd's beam: yaw = atan2(x, z), a box whose long
	# axis is local Z rotated flat to point along the travel direction.
	var yaw: float = atan2(diff.x, diff.z) if length > 0.001 else 0.0

	var streak := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(0.14, 0.14, maxf(length, 0.05))
	streak.mesh = box
	streak.position = diff * 0.5 + Vector3(0.0, 0.9, 0.0)
	streak.rotation = Vector3(0.0, yaw, 0.0)
	var streak_mat := _emissive_material(colour)
	streak.material_override = streak_mat
	root.add_child(streak)

	var ghosts: Array[MeshInstance3D] = []
	var ghost_materials: Array[StandardMaterial3D] = []
	for i in range(3):
		var f: float = 0.22 + 0.22 * float(i)
		var ghost := MeshInstance3D.new()
		var capsule := CapsuleMesh.new()
		capsule.radius = 0.4
		capsule.height = 1.8
		ghost.mesh = capsule
		ghost.position = diff * f + Vector3(0.0, 0.9, 0.0)
		ghost.rotation = Vector3(0.0, yaw, 0.0)
		var ghost_mat := StandardMaterial3D.new()
		ghost_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		ghost_mat.albedo_color = Color(colour.r, colour.g, colour.b, 0.35)
		ghost_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		ghost.material_override = ghost_mat
		root.add_child(ghost)
		ghosts.append(ghost)
		ghost_materials.append(ghost_mat)

	root.set("on_tick", func(t: float) -> void:
		var sc: Color = colour
		sc.a = 1.0 - t
		streak_mat.albedo_color = sc
		for i in range(ghost_materials.size()):
			var gm: StandardMaterial3D = ghost_materials[i]
			# The ghost furthest back on the path fades first.
			var local_t: float = clampf(t * (1.3 + float(i) * 0.35), 0.0, 1.0)
			var c: Color = gm.albedo_color
			c.a = 0.35 * (1.0 - local_t)
			gm.albedo_color = c
	)
	return root


# A bright white-gold flash, an expanding ring, and a brief afterimage where
# the player stood: the reward for reading a telegraph correctly.
static func perfect_dodge(parent: Node3D, pos: Vector3) -> Node3D:
	var root := _timed_root(parent, pos, 0.5)

	var flash := OmniLight3D.new()
	flash.light_color = PERFECT_GOLD
	flash.light_energy = 6.0
	flash.omni_range = 5.0
	root.add_child(flash)

	var flare := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.5
	sphere.height = 1.0
	flare.mesh = sphere
	flare.position = Vector3(0.0, 1.0, 0.0)
	var flare_mat := _emissive_material(PERFECT_GOLD)
	flare.material_override = flare_mat
	root.add_child(flare)

	ring(root, Vector3(0.0, 0.05, 0.0), 2.2, PERFECT_GOLD)

	var afterimage := MeshInstance3D.new()
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.42
	capsule.height = 1.85
	afterimage.mesh = capsule
	afterimage.position = Vector3(0.0, 0.9, 0.0)
	var after_mat := StandardMaterial3D.new()
	after_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	after_mat.albedo_color = Color(PERFECT_GOLD.r, PERFECT_GOLD.g, PERFECT_GOLD.b, 0.5)
	after_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	afterimage.material_override = after_mat
	root.add_child(afterimage)

	root.set("on_tick", func(t: float) -> void:
		flash.light_energy = lerpf(6.0, 0.0, t)
		flare.scale = Vector3.ONE * (1.0 + t * 2.2)
		var fc: Color = PERFECT_GOLD
		fc.a = 1.0 - t
		flare_mat.albedo_color = fc
		var ac: Color = after_mat.albedo_color
		ac.a = 0.5 * clampf(1.0 - t * 1.6, 0.0, 1.0)
		after_mat.albedo_color = ac
	)
	return root


# A floating, fading damage number: a billboarded Label3D with an outline so
# it reads against any background, rising and clearing over ~0.9s.
static func damage_number(parent: Node3D, pos: Vector3, amount: float, colour: Color) -> Node3D:
	var root := _timed_root(parent, pos, 0.9)

	var label := Label3D.new()
	label.text = str(int(round(amount)))
	label.font_size = 64
	# Twice the default world size (pixel_size 0.01): at font_size 64 alone
	# the number reads as a speck from anywhere but point-blank range.
	label.pixel_size = 0.02
	label.modulate = colour
	label.outline_modulate = Color(0.0, 0.0, 0.0, 1.0)
	label.outline_size = 14
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = Vector3(0.0, 1.6, 0.0)
	root.add_child(label)

	root.set("on_tick", func(t: float) -> void:
		label.position = Vector3(0.0, 1.6 + t * 1.1, 0.0)
		var c: Color = colour
		c.a = 1.0 - clampf((t - 0.35) / 0.65, 0.0, 1.0)
		label.modulate = c
	)
	return root


# The Hollow Sentinel's wind-up: a warning-coloured line from the eye toward
# the target that thickens as `t` (0 to 1) rises toward the moment it fires.
# No colour parameter: the telegraph is a universal warning regardless of
# which sentinel is casting it, the same way a traffic light's amber does not
# change with the make of the car.
static func beam_telegraph(parent: Node3D, from: Vector3, to: Vector3, t: float) -> Node3D:
	var root := _timed_root(parent, from, 0.12)
	var diff: Vector3 = to - from
	var length: float = diff.length()
	var yaw: float = atan2(diff.x, diff.z) if length > 0.001 else 0.0
	var progress: float = clampf(t, 0.0, 1.0)

	var line := MeshInstance3D.new()
	var box := BoxMesh.new()
	var width: float = lerpf(0.15, 1.1, progress)
	box.size = Vector3(width, width * 0.7, maxf(length, 0.05))
	line.mesh = box
	line.position = diff * 0.5 + Vector3(0.0, 1.0, 0.0)
	line.rotation = Vector3(0.0, yaw, 0.0)
	var material := _emissive_material(TELEGRAPH_WARNING, true, false)
	material.emission_energy_multiplier = 4.0
	var start_colour: Color = TELEGRAPH_WARNING
	start_colour.a = 0.3 + 0.5 * progress
	material.albedo_color = start_colour
	line.material_override = material
	root.add_child(line)

	root.set("on_tick", func(tick: float) -> void:
		var c: Color = material.albedo_color
		c.a = maxf(0.0, start_colour.a * (1.0 - tick))
		material.albedo_color = c
	)
	return root


# The Hollow Sentinel's beam actually firing: a thick glowing shaft in the
# sentinel's own colour (amber by day, violet by night) with a flash at its
# root, punching through and fading fast.
static func beam_fire(parent: Node3D, from: Vector3, to: Vector3, colour: Color) -> Node3D:
	var root := _timed_root(parent, from, 0.25)
	var diff: Vector3 = to - from
	var length: float = diff.length()
	var yaw: float = atan2(diff.x, diff.z) if length > 0.001 else 0.0

	var beam := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = Vector3(1.1, 0.5, maxf(length, 0.05))
	beam.mesh = box
	beam.position = diff * 0.5 + Vector3(0.0, 1.0, 0.0)
	beam.rotation = Vector3(0.0, yaw, 0.0)
	var material := _emissive_material(colour, true, false)
	beam.material_override = material
	root.add_child(beam)

	var flash := OmniLight3D.new()
	flash.light_color = colour
	flash.light_energy = 5.0
	flash.omni_range = 4.0
	flash.position = Vector3(0.0, 1.0, 0.0)
	root.add_child(flash)

	root.set("on_tick", func(t: float) -> void:
		var c: Color = colour
		c.a = 1.0 - t
		material.albedo_color = c
		beam.scale = Vector3(1.0 - t * 0.5, 1.0 - t * 0.5, 1.0)
		flash.light_energy = lerpf(5.0, 0.0, t)
	)
	return root
