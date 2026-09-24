extends RefCounted

# Checks for the Day Dream and Night Dream environments built in code by
# scripts/dream_env.gd, per specs/002-crowdfunding-demo/spec.md and
# docs/gdd/08-day-dreams-night-dreams-world.md. Built and inspected without a
# window: _ready() is called by hand, the same pattern tests/test_npc.gd and
# tests/test_hud.gd already use for a node that never enters a live tree.

var runner


func run(r) -> void:
	runner = r
	_test_day_builds_the_required_pieces()
	_test_night_builds_the_required_pieces()
	_test_fight_lane_and_mireth_spot_stay_clear()
	_test_night_reads_darker_than_day()
	_test_night_has_thousands_of_emissive_windows()
	_test_day_has_no_city_windows()
	_test_day_ground_is_pbr_textured()
	_test_night_facade_is_pbr_textured()
	_test_night_street_is_pbr_textured()
	_test_terrain_is_flat_across_the_playable_field()
	_test_terrain_rises_in_the_outer_band()
	_test_terrain_stays_bounded()
	_test_colour_grade_differs_per_world()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _build(mode_name: String):
	var DreamEnv := load("res://scripts/dream_env.gd")
	var e = DreamEnv.new()
	e.mode = mode_name
	e._ready()
	return e


func _count_type(node: Node, type_name: String) -> int:
	var total := 0
	if node.is_class(type_name):
		total += 1
	for child in node.get_children():
		total += _count_type(child, type_name)
	return total


func _ground_top_y(e) -> float:
	var body: StaticBody3D = e.ground_body()
	var shape: CollisionShape3D = body.get_child(0)
	var box: BoxShape3D = shape.shape
	return body.position.y + shape.position.y + box.size.y * 0.5


func _test_day_builds_the_required_pieces() -> void:
	print("day dream builds")
	var e = _build("day")
	check("day has exactly one WorldEnvironment", _count_type(e, "WorldEnvironment") == 1)
	check("day has exactly one DirectionalLight3D", _count_type(e, "DirectionalLight3D") == 1)
	check("day env() returns the built Environment", e.env() != null and e.env() is Environment)
	check("day ground body exists and carries collision",
		e.ground_body() != null and e.ground_body().get_child(0) is CollisionShape3D)
	check("day ground top is at y=0", absf(_ground_top_y(e)) < 0.001)
	check("day built more than a bare handful of scenery pieces", e.get_child_count() > 20)
	e.free()


func _test_night_builds_the_required_pieces() -> void:
	print("night dream builds")
	var e = _build("night")
	check("night has exactly one WorldEnvironment", _count_type(e, "WorldEnvironment") == 1)
	check("night has exactly one DirectionalLight3D", _count_type(e, "DirectionalLight3D") == 1)
	check("night env() returns the built Environment", e.env() != null and e.env() is Environment)
	check("night ground body exists and carries collision",
		e.ground_body() != null and e.ground_body().get_child(0) is CollisionShape3D)
	check("night ground top is at y=0", absf(_ground_top_y(e)) < 0.001)
	check("night built more than a bare handful of scenery pieces", e.get_child_count() > 20)
	e.free()


func _test_fight_lane_and_mireth_spot_stay_clear() -> void:
	print("fight lane and mireth's spot stay clear of collision")
	var DreamEnv := load("res://scripts/dream_env.gd")
	for mode_name in ["day", "night"]:
		var e = _build(mode_name)
		var recorded: Array = e.footprints()
		check("%s: scenery with collision was actually built" % mode_name, recorded.size() > 5)
		check("%s: the 12 m fight lane radius is clear" % mode_name,
			DreamEnv.fight_lane_is_clear(recorded, e.CLEAR_CENTER, e.CLEAR_RADIUS))
		check("%s: mireth's spot is clear" % mode_name,
			DreamEnv.fight_lane_is_clear(recorded, e.MIRETH_SPOT, e.MIRETH_CLEAR_RADIUS))
		e.free()


func _test_night_reads_darker_than_day() -> void:
	print("night reads darker than day")
	var day = _build("day")
	var night = _build("night")
	check("night ambient light is dimmer than day's",
		night.env().ambient_light_energy < day.env().ambient_light_energy)

	var day_top: Color = day.env().sky.sky_material.sky_top_color
	var night_top: Color = night.env().sky.sky_material.sky_top_color
	var day_lum := (day_top.r + day_top.g + day_top.b) / 3.0
	var night_lum := (night_top.r + night_top.g + night_top.b) / 3.0
	check("night sky is darker than day sky", night_lum < day_lum)
	day.free()
	night.free()


func _test_night_has_thousands_of_emissive_windows() -> void:
	print("night city has thousands of lit windows")
	var e = _build("night")
	check("night has a window multimesh", e.windows_node() != null)
	check("night has thousands of window instances", e.window_instance_count() >= 2000)
	var mat: StandardMaterial3D = e.windows_node().material_override
	check("the window material is emissive", mat != null and mat.emission_enabled)
	e.free()


func _test_day_has_no_city_windows() -> void:
	print("day dream has no city windows")
	var e = _build("day")
	check("day has no window instances", e.window_instance_count() == 0)
	e.free()


# Spec 003 lever 2: "PBR ground materials" for the Day Dream field, sourced
# from Poly Haven (assets/third_party/LICENSES.md) rather than the flat
# StandardMaterial3D colour the field shipped with. day_ground_material() is
# a small getter, the same shape as env()/ground_body()/windows_node()
# above, so a test can look at the material without reaching into the ground
# mesh's own child structure.
func _test_day_ground_is_pbr_textured() -> void:
	print("day ground carries a real PBR texture, not a flat colour")
	var day = _build("day")
	var mat = day.day_ground_material()
	check("day exposes its own ground material", mat != null)
	check("the ground material has an albedo texture", mat.albedo_texture != null)
	check("the ground material has a normal map", mat.normal_enabled and mat.normal_texture != null)
	day.free()

	var night = _build("night")
	check("night never builds a day ground material", night.day_ground_material() == null)
	night.free()


# Spec 003 lever 4: "facade detail ... instead of bare boxes." The concrete
# facade texture alone (before frames, ledges or signage) is the single
# biggest step away from a flat-coloured box.
func _test_night_facade_is_pbr_textured() -> void:
	print("night facades carry a real PBR texture, not a flat colour")
	var night = _build("night")
	var mat = night.night_facade_material()
	check("night exposes its own facade material", mat != null)
	check("the facade material has an albedo texture", mat.albedo_texture != null)
	night.free()

	var day = _build("day")
	check("day never builds a night facade material", day.night_facade_material() == null)
	day.free()


# Spec 003 lever 4: "reflective wet street." A real asphalt texture under a
# low roughness value is what SSR (already enabled at night) has an actual
# surface to reflect off of.
func _test_night_street_is_pbr_textured() -> void:
	print("the night street carries a real wet-asphalt texture")
	var night = _build("night")
	var mat = night.night_street_material()
	check("night exposes its own street material", mat != null)
	check("the street material has an albedo texture", mat.albedo_texture != null)
	check("the street reads wet: low roughness so SSR has something to reflect",
		mat.roughness <= 0.3)
	night.free()


# Spec 003 lever 2: "shaped rolling terrain instead of a flat plane." The
# whole existing cast of hand-placed scenery (cottages, walls, trees, the
# cart track) assumes an exactly flat y=0 field, so the terrain stays flat
# under all of it and only rolls in a band right at the field's outer edge,
# toward the mountain backdrop -- plus the cart track's own corridor is kept
# flat even out there, since nothing else holds its far end down to y=0.
# hill_height(x, z) is a pure static function precisely so this can be
# checked with no mesh, no environment and no live tree at all.
func _test_terrain_is_flat_across_the_playable_field() -> void:
	print("terrain stays flat under the playable field and its scenery")
	var DreamEnv := load("res://scripts/dream_env.gd")
	check("dead flat at the origin", DreamEnv.hill_height(0.0, 0.0) == 0.0)
	check("dead flat where the cottages and walls stand", DreamEnv.hill_height(14.0, -23.0) == 0.0)
	check("still flat right at the inner edge of the outer band",
		DreamEnv.hill_height(DreamEnv.TERRAIN_BAND_START, 0.0) == 0.0)
	check("the cart track's own corridor stays flat all the way to the field's far edge",
		DreamEnv.hill_height(1.0, 59.0) == 0.0)


func _test_terrain_rises_in_the_outer_band() -> void:
	print("terrain actually rolls in the outer band")
	var DreamEnv := load("res://scripts/dream_env.gd")
	var peak := 0.0
	# Off the track corridor and past the band's outer edge, where the blend
	# factor is pinned at 1.0: sweeping z through a full period guarantees,
	# by the intermediate value theorem, that some sample clears half the
	# terrain's own amplitude, regardless of the wave's exact phase.
	var z := 0.0
	while z < 300.0:
		peak = maxf(peak, absf(DreamEnv.hill_height(20.0, z)))
		z += 3.0
	check("some point in the outer band rises past half the terrain's amplitude",
		peak > DreamEnv.TERRAIN_AMPLITUDE * 0.5)


func _test_terrain_stays_bounded() -> void:
	print("terrain height never exceeds its own amplitude")
	var DreamEnv := load("res://scripts/dream_env.gd")
	var x := -70.0
	var over := false
	while x <= 70.0:
		var z := -70.0
		while z <= 70.0:
			if absf(DreamEnv.hill_height(x, z)) > DreamEnv.TERRAIN_AMPLITUDE + 0.01:
				over = true
			z += 11.0
		x += 11.0
	check("no sampled point exceeds the terrain's own amplitude", not over)


# Spec 003 lever 3: "AgX or filmic tone mapping with a colour grade per
# world." AGX was already unconditional; the grade itself (Environment's own
# brightness/contrast/saturation adjustment) is new and must actually differ
# day to night, not just be switched on identically in both.
func _test_colour_grade_differs_per_world() -> void:
	print("day and night carry their own distinct colour grade")
	var day = _build("day")
	var night = _build("night")
	check("day has its colour grade turned on", day.env().adjustment_enabled)
	check("night has its colour grade turned on", night.env().adjustment_enabled)
	check("the two worlds' grades are not identical",
		day.env().adjustment_saturation != night.env().adjustment_saturation
		or day.env().adjustment_contrast != night.env().adjustment_contrast)
	day.free()
	night.free()
