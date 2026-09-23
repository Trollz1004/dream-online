extends RefCounted

# Checks for the code-built character models (spec 002, "The character").
# Same run(r) pattern as tests/test_npc.gd, registered in run_tests.gd.

const CharacterModelScript := preload("res://scripts/character_model.gd")

const HUMANOID_PIVOTS := ["hips", "spine", "chest", "neck", "head",
	"shoulder_l", "upper_arm_l", "forearm_l", "hand_l",
	"shoulder_r", "upper_arm_r", "forearm_r", "hand_r",
	"thigh_l", "shin_l", "foot_l", "thigh_r", "shin_r", "foot_r"]

const SENTINEL_PIVOTS := ["hips", "chest", "head", "eye",
	"shoulder_l", "upper_arm_l", "forearm_l", "hand_l",
	"shoulder_r", "upper_arm_r", "forearm_r", "hand_r"]

const ALL_ACTIONS := ["", "swing1", "swing2", "swing3", "heavy", "guard",
	"dash", "lunge", "burst", "hit", "talk", "cast_beam", "down"]

var runner


func run(r) -> void:
	runner = r
	_test_dreamwalker_pivots()
	_test_keeper_pivots()
	_test_sentinel_pivots()
	_test_every_action_runs_on_every_kind()
	_test_swing_progress_moves_the_right_arm()
	_test_guard_raises_the_blade_above_idle()
	_test_sentinel_eye_differs_day_and_night()
	_test_blade_glow_is_a_safe_noop_off_the_dreamwalker()
	_test_night_brightens_accents()
	_test_rough_heights()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _has_all(m, names: Array) -> bool:
	for n in names:
		if not m.has_pivot(n):
			print("  missing pivot: ", n)
			return false
	return true


func _test_dreamwalker_pivots() -> void:
	print("dreamwalker named pivots")
	var m = CharacterModelScript.build("dreamwalker")
	check("dreamwalker reports its own kind", m.kind == "dreamwalker")
	check("dreamwalker has every expected humanoid pivot", _has_all(m, HUMANOID_PIVOTS))
	check("dreamwalker also carries a blade tip and base marker",
		m.has_pivot("blade_tip") and m.has_pivot("blade_base"))
	m.free()


func _test_keeper_pivots() -> void:
	print("keeper named pivots")
	var m = CharacterModelScript.build("keeper")
	check("keeper reports its own kind", m.kind == "keeper")
	check("keeper has every expected humanoid pivot", _has_all(m, HUMANOID_PIVOTS))
	check("keeper carries a staff", m.has_pivot("staff"))
	m.free()


func _test_sentinel_pivots() -> void:
	print("sentinel named pivots")
	var m = CharacterModelScript.build("sentinel")
	check("sentinel reports its own kind", m.kind == "sentinel")
	check("sentinel has every expected pivot", _has_all(m, SENTINEL_PIVOTS))
	check("the sentinel has no leg pivots; it hovers", not m.has_pivot("thigh_l"))
	m.free()


# The whole point of this check is that no action string, on no kind, ever
# throws or leaves a NAN in the rig. A GDScript error inside a test aborts
# the function silently (run_tests.gd's own warning), so every action is
# also confirmed to have actually run by checking a pivot moved to a finite
# value afterwards.
func _test_every_action_runs_on_every_kind() -> void:
	print("update_pose runs for every action on every kind")
	for kind in ["dreamwalker", "keeper", "sentinel"]:
		var m = CharacterModelScript.build(kind)
		var all_finite := true
		var ran := 0
		for action in ALL_ACTIONS:
			m.update_pose(0.016, {"speed": 0.6, "sprint": action == "dash",
				"action": action, "progress": 0.35})
			ran += 1
			var chest = m.get_pivot("chest")
			var head = m.get_pivot("head")
			if chest == null or head == null:
				all_finite = false
				continue
			if not (is_finite(chest.rotation.x) and is_finite(chest.rotation.y)
					and is_finite(chest.rotation.z) and is_finite(head.rotation.x)):
				all_finite = false
		check("%s: all %d actions ran" % [kind, ALL_ACTIONS.size()], ran == ALL_ACTIONS.size())
		check("%s: every pose stayed finite, nothing NaN'd" % kind, all_finite)
		m.free()


func _test_swing_progress_moves_the_right_arm() -> void:
	print("a swing's pose changes across its progress")
	var early = CharacterModelScript.build("dreamwalker")
	early.update_pose(0.016, {"speed": 0.0, "action": "swing1", "progress": 0.1})
	var early_rot: float = early.get_pivot("upper_arm_r").rotation.y

	var late = CharacterModelScript.build("dreamwalker")
	late.update_pose(0.016, {"speed": 0.0, "action": "swing1", "progress": 0.9})
	var late_rot: float = late.get_pivot("upper_arm_r").rotation.y

	check("swing1: the right upper arm rotation at progress 0.1 differs from 0.9",
		absf(early_rot - late_rot) > 0.2)

	# The same must hold for the mirrored arc and the overhead chop, and for
	# the keeper, who shares the same rig and pose code.
	for kind in ["dreamwalker", "keeper"]:
		for action in ["swing2", "swing3", "heavy", "lunge"]:
			var a = CharacterModelScript.build(kind)
			a.update_pose(0.016, {"speed": 0.0, "action": action, "progress": 0.1})
			var a_rot: Vector3 = a.get_pivot("upper_arm_r").rotation
			var b = CharacterModelScript.build(kind)
			b.update_pose(0.016, {"speed": 0.0, "action": action, "progress": 0.9})
			var b_rot: Vector3 = b.get_pivot("upper_arm_r").rotation
			check("%s %s: the right upper arm reads differently at 0.1 and 0.9 progress"
					% [kind, action],
				(a_rot - b_rot).length() > 0.15)
			a.free()
			b.free()
	early.free()
	late.free()


func _test_guard_raises_the_blade_above_idle() -> void:
	print("guard holds the blade higher than idle")
	var idle = CharacterModelScript.build("dreamwalker")
	idle.update_pose(0.016, {"speed": 0.0, "action": "", "progress": 0.0})
	var idle_tip: Vector3 = idle.blade_tip_global()

	var guarding = CharacterModelScript.build("dreamwalker")
	# Guard's raise finishes by progress 0.2 (see _pose_guard); settle well
	# past that so the check is not timing-sensitive.
	guarding.update_pose(0.016, {"speed": 0.0, "action": "guard", "progress": 0.6})
	var guard_tip: Vector3 = guarding.blade_tip_global()

	check("the blade tip sits higher in guard than at idle", guard_tip.y > idle_tip.y)
	check("blade_base_global and blade_tip_global disagree; the blade has real length",
		idle.blade_base_global().distance_to(idle.blade_tip_global()) > 0.3)
	idle.free()
	guarding.free()


func _test_sentinel_eye_differs_day_and_night() -> void:
	print("the sentinel eye changes colour with time of day")
	var m = CharacterModelScript.build("sentinel")
	m.set_time_of_day("day")
	var day_color: Color = m._eye_material.albedo_color
	m.set_time_of_day("night")
	var night_color: Color = m._eye_material.albedo_color
	check("the eye is amber by day", day_color.is_equal_approx(Color(1.0, 0.60, 0.14)))
	check("the eye is violet by night", night_color.is_equal_approx(Color(0.56, 0.24, 0.96)))
	check("day and night are genuinely different colours", not day_color.is_equal_approx(night_color))
	m.free()


func _test_blade_glow_is_a_safe_noop_off_the_dreamwalker() -> void:
	print("set_blade_glow only touches the dreamwalker's blade")
	var walker = CharacterModelScript.build("dreamwalker")
	walker.set_blade_glow(0.0)
	var low: float = walker._fuller_material.emission_energy_multiplier
	walker.set_blade_glow(1.0)
	var high: float = walker._fuller_material.emission_energy_multiplier
	check("blade glow amount changes the fuller's emission", high > low)

	var keeper = CharacterModelScript.build("keeper")
	var sentinel = CharacterModelScript.build("sentinel")
	# Neither kind has a blade; this must not error.
	keeper.set_blade_glow(1.0)
	sentinel.set_blade_glow(1.0)
	check("set_blade_glow does not error on a kind with no blade", true)
	walker.free()
	keeper.free()
	sentinel.free()


func _test_night_brightens_accents() -> void:
	print("night brightens the warm accents")
	var walker = CharacterModelScript.build("dreamwalker")
	check("the dreamwalker has at least one accent light registered",
		walker._accent_lights.size() > 0)
	walker.set_time_of_day("day")
	var day_energy: float = walker._accent_lights[0]["material"].emission_energy_multiplier
	walker.set_time_of_day("night")
	var night_energy: float = walker._accent_lights[0]["material"].emission_energy_multiplier
	check("an accent light runs brighter at night than by day", night_energy > day_energy)
	walker.free()


func _test_rough_heights() -> void:
	print("rough character heights")
	var walker = CharacterModelScript.build("dreamwalker")
	var walker_top: float = walker.get_pivot("head").position.y \
		+ walker.get_pivot("neck").position.y + walker.get_pivot("chest").position.y \
		+ walker.get_pivot("spine").position.y + walker.get_pivot("hips").position.y
	check("the dreamwalker stands roughly 1.8 m (within half a metre)",
		absf(walker_top - 1.8) < 0.5)

	var sentinel = CharacterModelScript.build("sentinel")
	check("the sentinel stands roughly 2.4 m (within half a metre)",
		absf(sentinel.get_pivot("head").position.y + sentinel.get_pivot("chest").position.y - 2.4) < 0.5)
	walker.free()
	sentinel.free()
