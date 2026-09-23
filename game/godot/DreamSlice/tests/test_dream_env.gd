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
