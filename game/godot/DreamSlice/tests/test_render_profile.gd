extends RefCounted

# Checks for scripts/render_profile.gd and the environments dream_env.gd
# builds from it (spec 005, FR-002 to FR-005, T010 to T024): both worlds on
# both platforms, read headless with no window, so every visual setting the
# browser build relies on is a checked fact rather than a hope. Pixels are
# graded separately, by the judge lane, from captured frames.

const RenderProfile := preload("res://scripts/render_profile.gd")

var runner


func run(r) -> void:
	runner = r
	_test_every_profile_carries_the_shared_look()
	_test_the_web_profile_names_a_fallback_for_every_missing_look()
	_test_built_environments_follow_their_profile()
	_test_web_fallback_nodes_are_actually_built()
	_test_night_sky_has_stars_and_both_skies_have_cloud()
	_test_terrain_faces_up_from_the_camera_side()
	_test_towers_stand_beside_the_street()
	_test_traffic_keeps_out_of_the_fight_lane()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _build(world: String, web: bool):
	var DreamEnv := load("res://scripts/dream_env.gd")
	var e = DreamEnv.new()
	e.mode = world
	e.web_profile = web
	e._ready()
	return e


func _count_type(node: Node, type_name: String) -> int:
	var total := 0
	if node.is_class(type_name):
		total += 1
	for child in node.get_children():
		total += _count_type(child, type_name)
	return total


func _test_every_profile_carries_the_shared_look() -> void:
	print("render profiles: both worlds, both platforms, carry the shared look")
	for world in RenderProfile.worlds():
		for web in [false, true]:
			var tag := "%s %s" % [world, "web" if web else "desktop"]
			var p: Dictionary = RenderProfile.profile(world, web)
			check("%s: the key light casts shadows" % tag, bool(p["key_shadows"]))
			check("%s: depth fog is on, with height fog below eye height" % tag,
				bool(p["fog"]) and float(p["fog_height_density"]) > 0.0 and float(p["fog_height"]) < 2.5)
			check("%s: tonemapped with AgX and graded" % tag,
				int(p["tonemap"]) == Environment.TONE_MAPPER_AGX and bool(p["adjustment"]))
			check("%s: the hero has a rim light and a material rim" % tag,
				bool(p["rim_light"]) and float(p["rim_energy"]) > 0.0 and float(p["material_rim"]) > 0.0)
			check("%s: the sky carries a cloud layer" % tag, bool(p["clouds"]))
	var day_web: Dictionary = RenderProfile.profile("day", true)
	var day_desk: Dictionary = RenderProfile.profile("day", false)
	check("the web asks for the cheaper two-split shadows at a shorter range",
		int(day_web["shadow_splits"]) == 2
		and float(day_web["shadow_max_distance"]) < float(day_desk["shadow_max_distance"]))
	check("the day sun stays low and golden (between 5 and 20 degrees up)",
		absf(day_web["key_rotation"].x) >= 5.0 and absf(day_web["key_rotation"].x) <= 20.0)


# FR-005: every look the browser renderer cannot draw has a named fallback,
# and the web profile switches it on instead of dropping the look.
func _test_the_web_profile_names_a_fallback_for_every_missing_look() -> void:
	print("the web profile swaps every look the browser cannot draw for its named fallback")
	for world in RenderProfile.worlds():
		var desk: Dictionary = RenderProfile.profile(world, false)
		var web: Dictionary = RenderProfile.profile(world, true)
		var table: Dictionary = RenderProfile.WEB_FALLBACKS[world]
		for feature in ["ssao", "volumetric_fog", "ssr"]:
			if not bool(desk.get(feature, false)):
				continue
			check("%s: %s is measured as not drawn on the web" % [world, feature],
				not bool(RenderProfile.WEB_DRAWS[feature]))
			check("%s: the web profile does not ask for %s" % [world, feature], not bool(web[feature]))
			var fallback: String = table.get(feature, "")
			check("%s: %s has a named fallback" % [world, feature], fallback != "")
			check("%s: the web profile switches on %s in place of %s" % [world, fallback, feature],
				fallback != "" and bool(web[RenderProfile.FALLBACK_KEYS[fallback]]))
		for feature in ["key_light_shadows", "glow", "tonemap_agx", "depth_fog"]:
			check("%s: %s was measured as drawn on the web" % [world, feature], bool(RenderProfile.WEB_DRAWS[feature]))
		check("%s: the web keeps glow, since the browser draws it" % world, bool(web["glow"]))
	var night_web: Dictionary = RenderProfile.profile("night", true)
	check("night on the web draws the mirrored reflection layer for the wet street",
		RenderProfile.active_fallbacks(night_web).has("mirrored_reflection_layer"))
	check("the reflection probe is not relied on (measured too faint to read)",
		not bool(night_web["reflection_probe"]) and not bool(RenderProfile.WEB_DRAWS["reflection_probe"]))
	check("the desktop keeps screen-space reflections for the night street",
		bool(RenderProfile.profile("night", false)["ssr"]))


func _test_built_environments_follow_their_profile() -> void:
	print("dream_env.gd builds each environment from its render profile")
	for world in RenderProfile.worlds():
		for web in [false, true]:
			var tag := "%s %s" % [world, "web" if web else "desktop"]
			var e = _build(world, web)
			var p: Dictionary = e.render_profile()
			var env: Environment = e.env()
			check("%s: exactly one WorldEnvironment and one DirectionalLight3D" % tag,
				_count_type(e, "WorldEnvironment") == 1 and _count_type(e, "DirectionalLight3D") == 1)
			check("%s: the key light casts shadows" % tag,
				e.key_light() != null and e.key_light().shadow_enabled)
			check("%s: the environment's fog matches the profile" % tag,
				env.fog_enabled and is_equal_approx(env.fog_density, float(p["fog_density"]))
				and is_equal_approx(env.fog_height_density, float(p["fog_height_density"])))
			check("%s: glow, ambient occlusion, volumetric fog and reflections match the profile" % tag,
				env.glow_enabled == bool(p["glow"]) and env.ssao_enabled == bool(p["ssao"])
				and env.volumetric_fog_enabled == bool(p["volumetric_fog"]) and env.ssr_enabled == bool(p["ssr"]))
			check("%s: tonemap and grade match the profile" % tag,
				env.tonemap_mode == int(p["tonemap"])
				and is_equal_approx(env.adjustment_contrast, float(p["contrast"])))
			if web:
				check("%s: the web key light uses two shadow splits" % tag,
					e.key_light().directional_shadow_mode == DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS)
				check("%s: nothing the browser cannot draw is switched on" % tag,
					not env.ssao_enabled and not env.volumetric_fog_enabled and not env.ssr_enabled)
			e.free()


func _test_web_fallback_nodes_are_actually_built() -> void:
	print("the web fallbacks are real nodes in the built world, not just profile flags")
	var day = _build("day", true)
	check("day web: contact darkening is fed the footprints nearest the fight lane",
		day.contact_footprint_count() > 5
		and float(day.day_ground_material().get_shader_parameter("contact_strength")) > 0.0)
	check("day web: haze bands stand between the field and the mountains", day.haze_card_count() >= 2)
	check("day web: the ground blends to its larger tile toward the horizon",
		float(day.day_ground_material().get_shader_parameter("detail_far_amount")) > 0.0)
	day.free()

	var night = _build("night", true)
	check("night web: the mirrored reflection layer is built", night.mirror_layer() != null)
	check("night web: the layer mirrors the lit signs and lamp halos", night.mirror_copy_count() >= 8)
	check("night web: the layer is a flip about the street plane",
		night.mirror_layer() != null and night.mirror_layer().transform.basis.y.y < 0.0)
	var street: BaseMaterial3D = night.night_street_material()
	check("night web: the wet street is see-through over the reflection layer",
		street.transparency == BaseMaterial3D.TRANSPARENCY_ALPHA and street.albedo_color.a < 0.9)
	check("night web: every street lamp has a soft halo", night.halo_count() >= 8)
	check("night web: every street lamp drops a shaft of light", night.light_shaft_count() >= 8)
	check("night web: lit streaks lie on the wet street under lamps and signs", night.wet_streak_count() >= 8)
	check("night web: contact shadows pool at the feet of towers and street furniture",
		night.contact_shadow_count() > 10)
	night.free()

	var night_desk = _build("night", false)
	check("night desktop: no mirrored layer, the street stays opaque for screen-space reflections",
		night_desk.mirror_layer() == null
		and night_desk.night_street_material().transparency == BaseMaterial3D.TRANSPARENCY_DISABLED)
	night_desk.free()


func _test_night_sky_has_stars_and_both_skies_have_cloud() -> void:
	print("the sky has something in it: stars by night, cloud in both worlds")
	for web in [false, true]:
		var night = _build("night", web)
		var sky_mat: ProceduralSkyMaterial = night.env().sky.sky_material
		check("night %s: the sky's cover layer carries a star field" % ("web" if web else "desktop"),
			sky_mat.sky_cover != null and night.render_profile()["star_count"] > 1000)
		check("night %s: a lit cloud layer drifts over the city" % ("web" if web else "desktop"),
			night.find_child("CloudLayer", false, false) != null)
		night.free()
	var day = _build("day", true)
	check("day: the cloud layer is built", day.find_child("CloudLayer", false, false) != null)
	check("day: the day sky carries no star field", day.env().sky.sky_material.sky_cover == null)
	var sky: ProceduralSkyMaterial = day.env().sky.sky_material
	check("day: the sky runs from a darker zenith to a brighter horizon",
		sky.sky_top_color.get_luminance() < sky.sky_horizon_color.get_luminance())
	day.free()


# The day terrain was once wound counter-clockwise from above, every triangle
# a back face to the camera, so the textured ground was culled away and the
# flat horizon skirt showed through (found by capture for spec 005).
func _test_terrain_faces_up_from_the_camera_side() -> void:
	print("the day terrain's triangles face up, toward the camera")
	var day = _build("day", false)
	var ground_mesh: MeshInstance3D = day.ground_body().get_child(1)
	var arrays: Array = ground_mesh.mesh.surface_get_arrays(0)
	var verts: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var normals: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
	var a: Vector3 = verts[0]
	var b: Vector3 = verts[1]
	var c: Vector3 = verts[2]
	check("the first triangle is clockwise seen from above (Godot's front face)",
		(b - a).cross(c - a).y < 0.0)
	check("the generated normals point up", normals[0].y > 0.9)
	day.free()


func _test_towers_stand_beside_the_street() -> void:
	print("night towers stand beside the street, so the view down it opens to the sky")
	var DreamEnv := load("res://scripts/dream_env.gd")
	var moved: Vector3 = DreamEnv.clear_of_street(Vector3(1.0, 0.0, -30.0), 8.0, 7.2)
	check("a tower placed on the street slides clear of it", absf(moved.x) >= 7.2 + 4.0 - 0.001)
	check("it keeps its place along the street", is_equal_approx(moved.z, -30.0))
	var kept: Vector3 = DreamEnv.clear_of_street(Vector3(-20.0, 0.0, 5.0), 8.0, 7.2)
	check("a tower already beside the street is left alone", kept.is_equal_approx(Vector3(-20.0, 0.0, 5.0)))
	var night = _build("night", true)
	var clear := true
	for t in night._near_towers:
		if absf(t["pos"].x) < DreamEnv.NEAR_TOWER_STREET_CLEARANCE + float(t["w"]) * 0.5 - 0.001:
			clear = false
	check("no near tower's footprint crosses the street corridor", clear)
	night.free()


func _test_traffic_keeps_out_of_the_fight_lane() -> void:
	print("traffic keeps out of the fight lane's stretch of street")
	var DreamEnv := load("res://scripts/dream_env.gd")
	check("a car beside the spawn is kept out of sight", not DreamEnv.car_shown_at(Vector3(1.7, 0.0, 4.0)))
	check("a car at the Sentinel's spot is kept out of sight", not DreamEnv.car_shown_at(Vector3(-1.7, 0.0, -6.0)))
	check("a car far down the street is shown", DreamEnv.car_shown_at(Vector3(1.7, 0.0, -40.0)))
	var night = _build("night", true)
	var ok := true
	for entry in night._cars:
		var node: Node3D = entry["node"]
		if node.visible and absf(node.position.z) < DreamEnv.CAR_CLEAR_Z:
			ok = false
	check("no car is built showing inside the fight lane's stretch", ok)
	night.free()
