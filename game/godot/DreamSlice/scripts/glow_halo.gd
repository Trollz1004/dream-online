extends RefCounted

# A soft glow around a small emitter -- the Sentinel's eye, GeminEYE's eye,
# Mireth's lantern orb -- as an additive, camera-facing quad with a radial
# falloff (spec 005, SB-09; render table: "additive soft-circle billboards on
# lamps, signs, eyes and Ember's core"). The browser build's glow needs a
# bright enough pixel to bloom, which small emitters in full daylight never
# reach, so the web profile asks for these instead and they read as a soft
# halo rather than a hard flat disc. The same construction the night lamps'
# halos use in scripts/dream_env.gd (a gradient texture on a billboard), which
# was measured to draw in the Compatibility renderer.

const META_KEY := "glow_halo"

static var _disc: GradientTexture2D = null


static func disc_texture() -> GradientTexture2D:
	if _disc == null:
		var g := Gradient.new()
		g.colors = PackedColorArray([Color(1, 1, 1, 1), Color(1, 1, 1, 0.35), Color(1, 1, 1, 0.0)])
		g.offsets = PackedFloat32Array([0.0, 0.25, 1.0])
		var t := GradientTexture2D.new()
		t.gradient = g
		t.fill = GradientTexture2D.FILL_RADIAL
		t.fill_from = Vector2(0.5, 0.5)
		t.fill_to = Vector2(1.0, 0.5)
		t.width = 128
		t.height = 128
		_disc = t
	return _disc


## A new halo quad `size` metres across, coloured `color`, at `strength`
## (its additive alpha). Billboards ignore their parent's scale, so the size
## is in world metres wherever it is attached.
static func make(color: Color, size: float, strength: float) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	mesh.name = "GlowHalo"
	var quad := QuadMesh.new()
	quad.size = Vector2(size, size)
	mesh.mesh = quad
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	mat.albedo_texture = disc_texture()
	mat.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	mesh.material_override = mat
	mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mesh.set_meta(META_KEY, true)
	set_strength(mesh, color, strength)
	return mesh


static func set_strength(halo: MeshInstance3D, color: Color, strength: float) -> void:
	if halo == null:
		return
	var mat := halo.material_override as StandardMaterial3D
	if mat != null:
		mat.albedo_color = Color(color.r, color.g, color.b, clampf(strength, 0.0, 1.0))
