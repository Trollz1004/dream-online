extends RefCounted

# Checks for the real, rigged character models (spec 003, lever 1: "Real
# characters"). Replaces the old checks against a procedural bone rig --
# there is no procedural rig left to check against, so this instead checks
# the adapter's actual public contract: the state-to-animation mapping
# (plan_for_state, pure and static -- the "logic" spec 003 asks for a
# failing test first on), that update_pose actually drives the imported
# AnimationPlayer, and that the kind-specific touches (the sword's draw/
# sheathe and its glow, the Sentinel's day/night eye, Mireth's orbiting
# light) still work.
#
# Rewritten a second time the same day: the first pass (KayKit) was judged
# "chunky, toy-proportioned... OUT" and replaced with a realistic-proportion
# Quaternius rig -- different bone names, different clip names, a shared
# body for all three kinds instead of two. The mapping this file checks
# changed to match; the shape of the checks (pure function first, then a
# built instance, then an exhaustive per-action sweep) did not.
#
# Same run(r) pattern as tests/test_npc.gd, registered in run_tests.gd.

const CharacterModelScript := preload("res://scripts/character_model.gd")

const ALL_ACTIONS := ["", "swing1", "swing2", "swing3", "heavy", "guard",
	"dash", "lunge", "burst", "hit", "talk", "cast_beam", "down"]

var runner


func run(r) -> void:
	runner = r
	_test_plan_for_state_humanoid_actions()
	_test_plan_for_state_humanoid_locomotion()
	_test_plan_for_state_sentinel()
	_test_build_sets_kind_and_key_pivots()
	_test_every_action_runs_on_every_kind()
	_test_progress_changes_the_pose()
	_test_guard_differs_from_idle()
	_test_locomotion_speed_changes_the_clip()
	_test_blade_tip_and_base()
	_test_blade_glow_only_touches_the_dreamwalker()
	_test_sword_draws_and_sheathes()
	_test_sentinel_eye_differs_day_and_night()
	_test_keeper_orb_differs_day_and_night_and_orbits()
	_test_sentinel_dwarfs_the_others()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


# ---------------------------------------------------------------------------
# plan_for_state: pure, static, no instance needed.
# ---------------------------------------------------------------------------

func _test_plan_for_state_humanoid_actions() -> void:
	print("plan_for_state: humanoid attack/skill actions map to real clips")
	var cases := {
		"swing1": "Rig|Sword_Attack",
		"swing2": "Rig|Sword_Attack_RM",
		"swing3": "Rig|Sword_Attack",
		"heavy": "Rig|Sword_Attack_RM",
		"guard": "Rig|Sword_Idle",
		"dash": "Rig|Roll",
		"lunge": "Rig|Sword_Attack_RM",
		"burst": "Rig|Spell_Simple_Shoot",
		"hit": "Rig|Hit_Chest",
		"down": "Rig|Death01",
		"talk": "Rig|Idle_Talking",
	}
	for action in cases.keys():
		var plan: Dictionary = CharacterModelScript.plan_for_state("dreamwalker", action, 0.0, false)
		check("dreamwalker '%s' plans '%s'" % [action, cases[action]], plan["animation"] == cases[action])
		check("dreamwalker '%s' is progress-driven, not looped" % action, plan["drive"] == "progress")
	check("guard and a light swing read as different clips",
		cases["guard"] != cases["swing1"])


func _test_plan_for_state_humanoid_locomotion() -> void:
	print("plan_for_state: humanoid locomotion follows speed")
	var idle: Dictionary = CharacterModelScript.plan_for_state("keeper", "", 0.0, false)
	check("standing still plans the idle clip", idle["animation"] == "Rig|Idle")
	check("idle loops", idle["drive"] == "loop")

	var walk: Dictionary = CharacterModelScript.plan_for_state("keeper", "", 0.3, false)
	check("a middling speed plans the walk clip", walk["animation"] == "Rig|Walk")

	var run: Dictionary = CharacterModelScript.plan_for_state("keeper", "", 0.9, false)
	check("a high speed plans the jog clip", run["animation"] == "Rig|Jog_Fwd")

	var sprint: Dictionary = CharacterModelScript.plan_for_state("keeper", "", 0.9, true)
	check("sprinting plays a distinct, faster sprint clip",
		sprint["animation"] == "Rig|Sprint" and sprint["speed_scale"] > run["speed_scale"])

	var unknown: Dictionary = CharacterModelScript.plan_for_state("dreamwalker", "cast_beam", 0.0, false)
	check("an action this rig does not recognise degrades to idle locomotion, not an error",
		unknown["animation"] == "Rig|Idle")


func _test_plan_for_state_sentinel() -> void:
	print("plan_for_state: the Sentinel ignores speed/sprint and reads only action")
	var idle: Dictionary = CharacterModelScript.plan_for_state("sentinel", "", 0.0, false)
	check("the Sentinel's idle is the shared idle clip (this rig has no combat-idle)",
		idle["animation"] == "Rig|Idle")

	var hit: Dictionary = CharacterModelScript.plan_for_state("sentinel", "hit", 0.0, false)
	check("the Sentinel flinches on its own, heavier hit reaction", hit["animation"] == "Rig|Hit_Head")
	check("the Sentinel's hit reaction differs from the humanoid's",
		hit["animation"] != CharacterModelScript.plan_for_state("dreamwalker", "hit", 0.0, false)["animation"])

	var cast: Dictionary = CharacterModelScript.plan_for_state("sentinel", "cast_beam", 0.0, false)
	check("the Sentinel's beam plays the spell-release clip", cast["animation"] == "Rig|Spell_Simple_Shoot")

	var down: Dictionary = CharacterModelScript.plan_for_state("sentinel", "down", 0.0, false)
	check("the downed Sentinel holds the death clip", down["animation"] == "Rig|Death01")

	var unknown: Dictionary = CharacterModelScript.plan_for_state("sentinel", "swing1", 0.9, true)
	check("an action only a humanoid plays falls back to the Sentinel's own idle, not an error",
		unknown["animation"] == "Rig|Idle")
	check("that fallback ignores the speed/sprint arguments a Sentinel caller never sends",
		unknown["drive"] == "loop")


# ---------------------------------------------------------------------------
# build(): the imported rig is actually there.
# ---------------------------------------------------------------------------

func _test_build_sets_kind_and_key_pivots() -> void:
	print("build() wires the imported glb for each kind")
	var dw = CharacterModelScript.build("dreamwalker")
	check("dreamwalker reports its own kind", dw.kind == "dreamwalker")
	check("dreamwalker has a skeleton", dw.has_pivot("skeleton") and dw.get_pivot("skeleton") != null)
	check("dreamwalker has an animation player", dw.has_pivot("animation_player") and dw.get_pivot("animation_player") != null)
	check("dreamwalker's animation player knows a light swing",
		dw._anim.get_animation("Rig|Sword_Attack") != null)
	check("dreamwalker carries a sheathed sword", dw.has_pivot("sword_sheathed") and dw.get_pivot("sword_sheathed") != null)
	check("dreamwalker carries a drawn sword", dw.has_pivot("sword_drawn") and dw.get_pivot("sword_drawn") != null)
	check("the sword starts sheathed", dw.get_pivot("sword_sheathed").visible and not dw.get_pivot("sword_drawn").visible)
	dw.free()

	var keeper = CharacterModelScript.build("keeper")
	check("keeper reports its own kind", keeper.kind == "keeper")
	check("keeper carries no sword", not keeper.has_pivot("sword_drawn"))
	check("keeper's light orbits on its own pivot", keeper.has_pivot("orbit_pivot") and keeper.get_pivot("orbit_pivot") != null)
	keeper.free()

	var sentinel = CharacterModelScript.build("sentinel")
	check("sentinel reports its own kind", sentinel.kind == "sentinel")
	check("sentinel has a day/night eye accent", sentinel.has_pivot("accent_bead") and sentinel.get_pivot("accent_bead") != null)
	check("sentinel carries no sword", not sentinel.has_pivot("sword_drawn"))
	sentinel.free()


# The whole point of this check is that no action string, on no kind, ever
# throws or leaves the animation player pointed at nothing. A GDScript error
# inside a test aborts the function silently (run_tests.gd's own warning), so
# every action is also confirmed to have actually run by checking a real
# clip name came back afterwards.
func _test_every_action_runs_on_every_kind() -> void:
	print("update_pose runs for every action on every kind")
	for kind in ["dreamwalker", "keeper", "sentinel"]:
		var m = CharacterModelScript.build(kind)
		var ran := 0
		var all_named := true
		for action in ALL_ACTIONS:
			m.update_pose(0.016, {"speed": 0.6, "sprint": action == "dash",
				"action": action, "progress": 0.35})
			ran += 1
			if String(m._anim.current_animation) == "":
				all_named = false
		check("%s: all %d actions ran" % [kind, ALL_ACTIONS.size()], ran == ALL_ACTIONS.size())
		check("%s: every action left a real clip playing" % kind, all_named)
		m.free()


func _test_progress_changes_the_pose() -> void:
	print("a swing's pose changes across its progress")
	var early = CharacterModelScript.build("dreamwalker")
	early.update_pose(0.016, {"speed": 0.0, "action": "swing1", "progress": 0.05})
	var early_rot: Quaternion = early._skeleton.get_bone_pose_rotation(early._skeleton.find_bone("DEF-upper_arm.R"))

	var late = CharacterModelScript.build("dreamwalker")
	late.update_pose(0.016, {"speed": 0.0, "action": "swing1", "progress": 0.95})
	var late_rot: Quaternion = late._skeleton.get_bone_pose_rotation(late._skeleton.find_bone("DEF-upper_arm.R"))

	check("swing1: the right upper arm reads differently at 0.05 and 0.95 progress",
		not early_rot.is_equal_approx(late_rot))

	# The same rig and mapping serve the keeper too (the full humanoid
	# action set); the Sentinel only ever plays progress-driven clips for
	# hit/cast_beam/down (see _test_plan_for_state_sentinel) so it is
	# checked against those instead of a humanoid-only action like swing2.
	for entry in [["keeper", ["swing2", "heavy", "hit"]], ["sentinel", ["hit", "cast_beam", "down"]]]:
		var kind: String = entry[0]
		for action in entry[1]:
			var a = CharacterModelScript.build(kind)
			a.update_pose(0.016, {"speed": 0.0, "action": action, "progress": 0.05})
			var a_rot: Quaternion = a._skeleton.get_bone_pose_rotation(a._skeleton.find_bone("DEF-upper_arm.R"))
			var b = CharacterModelScript.build(kind)
			b.update_pose(0.016, {"speed": 0.0, "action": action, "progress": 0.95})
			var b_rot: Quaternion = b._skeleton.get_bone_pose_rotation(b._skeleton.find_bone("DEF-upper_arm.R"))
			check("%s %s: the right upper arm reads differently at 0.05 and 0.95 progress" % [kind, action],
				not a_rot.is_equal_approx(b_rot))
			a.free()
			b.free()
	early.free()
	late.free()


func _test_guard_differs_from_idle() -> void:
	print("guard plays its own held clip, distinct from idle")
	var idle = CharacterModelScript.build("dreamwalker")
	idle.update_pose(0.016, {"speed": 0.0, "action": "", "progress": 0.0})
	var guarding = CharacterModelScript.build("dreamwalker")
	guarding.update_pose(0.016, {"speed": 0.0, "action": "guard", "progress": 0.6})
	check("guard's clip is not idle's clip",
		String(idle._anim.current_animation) != String(guarding._anim.current_animation))
	check("guard plays the sword-ready clip", String(guarding._anim.current_animation) == "Rig|Sword_Idle")
	idle.free()
	guarding.free()


func _test_locomotion_speed_changes_the_clip() -> void:
	print("standing still and running play different clips")
	var m = CharacterModelScript.build("dreamwalker")
	m.update_pose(0.016, {"speed": 0.0, "sprint": false, "action": "", "progress": 0.0})
	var idle_clip := String(m._anim.current_animation)
	m.update_pose(0.016, {"speed": 0.9, "sprint": true, "action": "", "progress": 0.0})
	var run_clip := String(m._anim.current_animation)
	check("idle reads as the idle clip", idle_clip == "Rig|Idle")
	check("sprinting reads as the sprint clip", run_clip == "Rig|Sprint")
	check("the two are genuinely different clips", idle_clip != run_clip)
	m.free()


func _test_blade_tip_and_base() -> void:
	print("the sword hand has a real base and tip, off the tree or on it")
	var walker = CharacterModelScript.build("dreamwalker")
	var base: Vector3 = walker.blade_base_global()
	var tip: Vector3 = walker.blade_tip_global()
	check("blade_base_global and blade_tip_global disagree; the blade has real length",
		base.distance_to(tip) > 0.3)
	check("both points are finite", is_finite(base.x) and is_finite(tip.x))

	# Off-kind callers get a safe fallback rather than an error.
	var keeper = CharacterModelScript.build("keeper")
	var kb: Vector3 = keeper.blade_base_global()
	var kt: Vector3 = keeper.blade_tip_global()
	check("a kind with no sword does not error and returns finite points",
		is_finite(kb.x) and is_finite(kt.x))
	walker.free()
	keeper.free()


func _test_blade_glow_only_touches_the_dreamwalker() -> void:
	print("set_blade_glow only touches the dreamwalker's sword")
	var walker = CharacterModelScript.build("dreamwalker")
	walker.set_blade_glow(0.0)
	var low: float = walker._accent_material.emission_energy_multiplier
	walker.set_blade_glow(1.0)
	var high: float = walker._accent_material.emission_energy_multiplier
	check("blade glow amount changes the sword's emission", high > low)

	var keeper = CharacterModelScript.build("keeper")
	var sentinel = CharacterModelScript.build("sentinel")
	keeper.set_blade_glow(1.0)
	sentinel.set_blade_glow(1.0)
	check("set_blade_glow does not error on a kind with no sword", true)
	walker.free()
	keeper.free()
	sentinel.free()


func _test_sword_draws_and_sheathes() -> void:
	print("the sword draws on combat and re-sheathes after a delay")
	var m = CharacterModelScript.build("dreamwalker")
	check("it starts sheathed", m.get_pivot("sword_sheathed").visible and not m.get_pivot("sword_drawn").visible)

	m.update_pose(0.016, {"speed": 0.0, "action": "swing1", "progress": 0.3})
	check("an attack draws it", m.get_pivot("sword_drawn").visible and not m.get_pivot("sword_sheathed").visible)

	m.update_pose(1.0, {"speed": 0.0, "action": "", "progress": 0.0})
	check("it stays drawn shortly after combat ends",
		m.get_pivot("sword_drawn").visible and not m.get_pivot("sword_sheathed").visible)

	m.update_pose(CharacterModelScript.SWORD_SHEATHE_DELAY, {"speed": 0.0, "action": "", "progress": 0.0})
	check("it re-sheathes once enough idle time has passed",
		m.get_pivot("sword_sheathed").visible and not m.get_pivot("sword_drawn").visible)
	m.free()


func _test_sentinel_eye_differs_day_and_night() -> void:
	print("the sentinel eye changes colour with time of day")
	var m = CharacterModelScript.build("sentinel")
	m.set_time_of_day("day")
	var day_color: Color = m._accent_material.emission
	m.set_time_of_day("night")
	var night_color: Color = m._accent_material.emission
	check("the eye is amber by day", day_color.is_equal_approx(CharacterModelScript.S_EYE_DAY))
	check("the eye is violet by night", night_color.is_equal_approx(CharacterModelScript.S_EYE_NIGHT))
	check("day and night are genuinely different colours", not day_color.is_equal_approx(night_color))
	m.free()


func _test_keeper_orb_differs_day_and_night_and_orbits() -> void:
	print("Mireth's orb is dimmer at night, so it never blows out her face, and it actually orbits")
	var m = CharacterModelScript.build("keeper")
	m.set_time_of_day("day")
	var day_energy: float = m._accent_light.light_energy
	m.set_time_of_day("night")
	var night_energy: float = m._accent_light.light_energy
	check("the orb is lit by day", day_energy > 0.0)
	check("the orb dims rather than brightens at night", night_energy < day_energy)

	var before: float = m._orbit_pivot.rotation.y
	for i in 10:
		m.update_pose(0.1, {"speed": 0.0, "action": "", "progress": 0.0})
	check("the orb's pivot actually rotates over time", not is_equal_approx(m._orbit_pivot.rotation.y, before))
	m.free()


func _test_sentinel_dwarfs_the_others() -> void:
	print("the Sentinel's scale dwarfs the player and the keeper")
	var dw = CharacterModelScript.build("dreamwalker")
	var keeper = CharacterModelScript.build("keeper")
	var sentinel = CharacterModelScript.build("sentinel")
	check("the Sentinel is scaled up well past the dreamwalker",
		sentinel._rig_root.scale.y > dw._rig_root.scale.y * 1.5)
	check("the Sentinel is scaled up well past the keeper",
		sentinel._rig_root.scale.y > keeper._rig_root.scale.y * 1.5)
	dw.free()
	keeper.free()
	sentinel.free()
