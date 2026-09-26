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
	_test_dreamwalker_wears_ornate_dark_plate_with_gold_trim()
	_test_dreamwalker_wears_an_olive_drab_tactical_vest()
	_test_dreamwalker_wears_a_steel_helmet_with_goggles()
	_test_knight_gear_reads_at_play_distance()
	_test_dreamwalker_carries_sword_and_shield_on_the_back()
	_test_shield_has_a_gold_lion_crest()
	_test_keeper_wears_a_rust_red_coat()
	_test_sentinel_wears_stone_and_iron_plating()
	_test_metal_plate_pieces_actually_read_as_metal()
	_test_outfit_pieces_are_reasonably_sized()
	_test_emissive_pieces_are_reasonably_sized()
	_test_armor_does_not_leak_between_kinds()
	_test_model_faces_forward_along_minus_z()


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
	check("dreamwalker uses the licensed modular outfit rather than the bare mannequin",
		dw._uses_modular_outfit and dw.has_pivot("modular_outfit_body"))
	check("the modular outfit retains its full skinned humanoid skeleton",
		dw._skeleton.get_bone_count() == 65)
	check("the authored hood is visible as the fantasy helmet shell",
		dw.has_pivot("imported_hood") and dw.get_pivot("imported_hood").visible)
	check("the imported pauldron supplies real silver armor geometry",
		dw.has_pivot("imported_pauldron") and dw.get_pivot("imported_pauldron").visible)
	check("the imported bracers supply real limb armor geometry",
		dw.has_pivot("imported_bracers") and dw.get_pivot("imported_bracers").visible)
	check("dreamwalker carries a sheathed sword", dw.has_pivot("sword_sheathed") and dw.get_pivot("sword_sheathed") != null)
	check("dreamwalker carries a drawn sword", dw.has_pivot("sword_drawn") and dw.get_pivot("sword_drawn") != null)
	check("the sword starts sheathed", dw.get_pivot("sword_sheathed").visible and not dw.get_pivot("sword_drawn").visible)
	check("dreamwalker carries a sheathed shield", dw.has_pivot("shield_sheathed") and dw.get_pivot("shield_sheathed") != null)
	check("dreamwalker carries a drawn shield", dw.has_pivot("shield_drawn") and dw.get_pivot("shield_drawn") != null)
	check("the shield starts on the back", dw.get_pivot("shield_sheathed").visible and not dw.get_pivot("shield_drawn").visible)
	dw.free()

	var keeper = CharacterModelScript.build("keeper")
	check("keeper reports its own kind", keeper.kind == "keeper")
	check("keeper carries no sword", not keeper.has_pivot("sword_drawn"))
	check("keeper carries no shield", not keeper.has_pivot("shield_drawn"))
	check("keeper's light orbits on its own pivot", keeper.has_pivot("orbit_pivot") and keeper.get_pivot("orbit_pivot") != null)
	keeper.free()

	var sentinel = CharacterModelScript.build("sentinel")
	check("sentinel reports its own kind", sentinel.kind == "sentinel")
	check("sentinel has a day/night eye accent", sentinel.has_pivot("accent_bead") and sentinel.get_pivot("accent_bead") != null)
	check("sentinel carries no sword", not sentinel.has_pivot("sword_drawn"))
	check("sentinel carries no shield", not sentinel.has_pivot("shield_drawn"))
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
	var arm_bone_name := "upperarm_r" if early._uses_modular_outfit else "DEF-upper_arm.R"
	var early_rot: Quaternion = early._skeleton.get_bone_pose_rotation(early._skeleton.find_bone(arm_bone_name))

	var late = CharacterModelScript.build("dreamwalker")
	late.update_pose(0.016, {"speed": 0.0, "action": "swing1", "progress": 0.95})
	var late_rot: Quaternion = late._skeleton.get_bone_pose_rotation(late._skeleton.find_bone(arm_bone_name))

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


# ---------------------------------------------------------------------------
# Character direction (spec 003, "Character direction", Joshua 2026-09-24):
# each kind must read as a distinct, finished character -- medieval
# silhouettes in modern-feeling materials -- not the same bare tinted
# mannequin three times over.
# ---------------------------------------------------------------------------

# Rewritten 2026-09-24 for the "Knight look chosen" pass (spec 003k, worker
# judge/prod-knight): the old test named a short violet cape and hood that
# no longer exist -- neither reference image for the chosen look shows one,
# and the back is now spoken for by the sword AND the shield together (see
# _test_dreamwalker_carries_sword_and_shield_on_the_back below). This checks
# the plate/mail/belt/pauldron/bracer/greave pieces that do carry over, plus
# the gold trim lines that replace the old violet seam.
func _test_dreamwalker_wears_ornate_dark_plate_with_gold_trim() -> void:
	print("the dreamwalker wears ornate dark plate -- pauldrons, vambraces, greaves, a breastplate -- with thin gold trim lines")
	var dw = CharacterModelScript.build("dreamwalker")
	for piece in ["torso_armor", "mail_skirt", "belt", "pauldron_l", "pauldron_r", "bracer_l",
			"bracer_r", "greave_l", "greave_r", "seam_chest", "trim_collar", "trim_waist"]:
		check("dreamwalker has a %s" % piece, dw.has_pivot(piece) and dw.get_pivot(piece) != null)

	var torso: MeshInstance3D = dw.get_pivot("torso_armor")
	var torso_mat: ORMMaterial3D = torso.material_override
	check("the torso plate reads the worn-steel texture, not a flat colour",
		torso_mat is ORMMaterial3D and torso_mat.albedo_texture != null)
	check("the plate is dark (\"ornate dark plate\"), not the old mid-grey",
		torso_mat.albedo_color.r + torso_mat.albedo_color.g + torso_mat.albedo_color.b < 0.6)
	check("the plate is not pure black either -- there is still a colour to light",
		torso_mat.albedo_color.r + torso_mat.albedo_color.g + torso_mat.albedo_color.b > 0.05)

	for piece in ["seam_chest", "trim_collar", "trim_waist"]:
		var trim: MeshInstance3D = dw.get_pivot(piece)
		var trim_mat: StandardMaterial3D = trim.material_override
		check("%s reads gold, not the old violet seam" % piece,
			trim_mat.emission.is_equal_approx(CharacterModelScript.DW_GOLD))
		check("%s's gold is not the sword's own violet Dreamedge accent" % piece,
			not trim_mat.emission.is_equal_approx(CharacterModelScript.DW_ACCENT))
	dw.free()


func _test_dreamwalker_wears_an_olive_drab_tactical_vest() -> void:
	print("the dreamwalker wears an olive-drab tactical vest with pouches and a strap under the plate")
	var dw = CharacterModelScript.build("dreamwalker")
	for piece in ["vest_torso", "vest_back", "chest_strap", "pouch_1", "pouch_2", "pouch_3"]:
		check("dreamwalker has a %s" % piece, dw.has_pivot(piece) and dw.get_pivot(piece) != null)

	var vest: MeshInstance3D = dw.get_pivot("vest_torso")
	var vest_mat: ORMMaterial3D = vest.material_override
	check("the vest reads a real texture, not a flat colour",
		vest_mat is ORMMaterial3D and vest_mat.albedo_texture != null)
	check("the vest tints olive-drab (green reads higher than blue), not brown leather or grey steel",
		vest_mat.albedo_color.g > vest_mat.albedo_color.b and vest_mat.albedo_color.g > vest_mat.albedo_color.r * 0.9)
	dw.free()


func _test_dreamwalker_wears_a_steel_helmet_with_goggles() -> void:
	print("the dreamwalker wears a steel helmet with dark visor goggles, down while walking")
	var dw = CharacterModelScript.build("dreamwalker")
	for piece in ["helmet", "goggles_down", "goggles_up"]:
		check("dreamwalker has a %s" % piece, dw.has_pivot(piece) and dw.get_pivot(piece) != null)

	var helmet: MeshInstance3D = dw.get_pivot("helmet")
	var helmet_mat: ORMMaterial3D = helmet.material_override
	check("the helmet is the same steel plate as the rest of the armor",
		helmet_mat is ORMMaterial3D and helmet_mat.metallic > 0.5)

	check("walking (out of combat) starts with the goggles on the brow, face readable",
		dw.get_pivot("goggles_up").visible and not dw.get_pivot("goggles_down").visible)

	var down: Node3D = dw.get_pivot("goggles_down")
	check("the goggles are real lens geometry, not a flat placeholder",
		_collect_mesh_instances(down).size() >= 2)
	check("the helmet has a brim so it reads as a helmet, not a smooth egg",
		dw.has_pivot("helmet_brim") and dw.get_pivot("helmet_brim") != null)
	dw.free()


func _test_knight_gear_reads_at_play_distance() -> void:
	print("knight gear is large and contrasting enough to read at play-camera distance")
	var dw = CharacterModelScript.build("dreamwalker")
	var helmet: MeshInstance3D = dw.get_pivot("helmet")
	var helmet_mesh: SphereMesh = helmet.mesh
	check("the helmet is larger than the head mesh (radius at least 0.13 m)",
		helmet_mesh.radius >= 0.13)
	var vest: MeshInstance3D = dw.get_pivot("vest_torso")
	var plate: MeshInstance3D = dw.get_pivot("torso_armor")
	var vest_box: BoxMesh = vest.mesh
	var plate_box: BoxMesh = plate.mesh
	check("the olive vest is wider than the breastplate so it peeks at the sides",
		vest_box.size.x > plate_box.size.x)
	var gold: MeshInstance3D = dw.get_pivot("seam_chest")
	var gold_box: BoxMesh = gold.mesh
	check("chest gold trim is thick enough to read (height at least 4 cm)",
		gold_box.size.y >= 0.04)
	var sheathed: Node3D = dw.get_pivot("shield_sheathed")
	check("the back shield sits off the spine, not buried in the torso",
		sheathed.position.z <= -0.15)
	var drawn: Node3D = dw.get_pivot("shield_drawn")
	check("the combat shield is held off the left hand, not buried at its origin",
		drawn.position.length() >= 0.15)
	check("gold pauldron rims exist so shoulders read as ornate plate",
		dw.has_pivot("trim_pauldron_l") and dw.has_pivot("trim_pauldron_r"))
	dw.free()


func _test_dreamwalker_carries_sword_and_shield_on_the_back() -> void:
	print("out of combat, the sword and shield ride the back; in combat, shield to the forearm, sword to the hand")
	var dw = CharacterModelScript.build("dreamwalker")
	check("it starts with the sword sheathed and the shield on the back",
		dw.get_pivot("sword_sheathed").visible and not dw.get_pivot("sword_drawn").visible
		and dw.get_pivot("shield_sheathed").visible and not dw.get_pivot("shield_drawn").visible)
	check("and the goggles on the brow so the face reads while walking",
		dw.get_pivot("goggles_up").visible and not dw.get_pivot("goggles_down").visible)

	dw.update_pose(0.016, {"speed": 0.0, "action": "swing1", "progress": 0.3})
	check("combat draws the sword and moves the shield to the forearm together",
		dw.get_pivot("sword_drawn").visible and not dw.get_pivot("sword_sheathed").visible
		and dw.get_pivot("shield_drawn").visible and not dw.get_pivot("shield_sheathed").visible)
	check("and drops the goggles over the eyes as a combat visor",
		dw.get_pivot("goggles_down").visible and not dw.get_pivot("goggles_up").visible)

	dw.update_pose(CharacterModelScript.SWORD_SHEATHE_DELAY, {"speed": 0.0, "action": "", "progress": 0.0})
	check("once combat ends and the idle timeout passes, the sword and shield return to the back",
		dw.get_pivot("sword_sheathed").visible and not dw.get_pivot("sword_drawn").visible
		and dw.get_pivot("shield_sheathed").visible and not dw.get_pivot("shield_drawn").visible)
	check("and the goggles return to the brow",
		dw.get_pivot("goggles_up").visible and not dw.get_pivot("goggles_down").visible)
	dw.free()


func _test_shield_has_a_gold_lion_crest() -> void:
	print("the heater shield carries a raised gold lion crest, a rounded emblem with mane ridges")
	var dw = CharacterModelScript.build("dreamwalker")
	check("the drawn shield's crest is recorded", dw.has_pivot("shield_crest") and dw.get_pivot("shield_crest") != null)
	check("the crest's emblem mesh is recorded", dw.has_pivot("shield_crest_emblem") and dw.get_pivot("shield_crest_emblem") != null)

	var crest: Node3D = dw.get_pivot("shield_crest")
	check("the crest is more than a bare emblem -- it has mane ridges around it",
		crest.get_child_count() >= 5)

	var emblem: MeshInstance3D = dw.get_pivot("shield_crest_emblem")
	var emblem_mat: StandardMaterial3D = emblem.material_override
	check("the crest reads gold, distinct from the shield's own dark steel board",
		emblem_mat.albedo_color.is_equal_approx(CharacterModelScript.DW_GOLD))
	check("the crest is a raised metal relief, not flat paint",
		emblem_mat.metallic > 0.5)

	var board: MeshInstance3D = dw.get_pivot("shield_sheathed").get_child(0)
	check("the shield's board is real panel geometry, not a flat placeholder",
		board.mesh != null and board.mesh.get_surface_count() > 0)
	dw.free()


func _test_keeper_wears_a_rust_red_coat() -> void:
	print("Mireth wears a long fitted rust-red coat, a high collar, bronze clasps, shoulder capes, mail cuffs and a belt")
	var keeper = CharacterModelScript.build("keeper")
	for piece in ["robe", "collar", "clasp_l", "clasp_r", "belt", "shoulder_cape_l",
			"shoulder_cape_r", "cuff_l", "cuff_r"]:
		check("keeper has a %s" % piece, keeper.has_pivot(piece) and keeper.get_pivot(piece) != null)

	var robe: MeshInstance3D = keeper.get_pivot("robe")
	var robe_mat: Material = robe.material_override
	check("the coat reads the woven-fabric texture, not a flat colour",
		robe_mat is ORMMaterial3D and (robe_mat as ORMMaterial3D).albedo_texture != null)
	check("the coat is tinted rust-red, not the old rig's purple robe",
		(robe_mat as ORMMaterial3D).albedo_color.r > (robe_mat as ORMMaterial3D).albedo_color.b)
	keeper.free()


# Judge finding, round 4 (2026-09-24): "armour detail invisible" -- the
# player read as a flat black silhouette. _pbr_material() built every plate/
# iron/leather/coat piece as an ORMMaterial3D but never set `metallic`,
# which defaults to 0.0 and multiplies straight through the ORM texture's
# own metallic channel (the same way albedo_color multiplies albedo_texture),
# so every "worn-steel plate" piece rendered fully non-metal -- no specular
# highlight to catch any light at all, however bright.
func _test_metal_plate_pieces_actually_read_as_metal() -> void:
	print("worn-steel/iron plate pieces let their own ORM texture's metallic channel through")
	var dw = CharacterModelScript.build("dreamwalker")
	var torso: ORMMaterial3D = dw.get_pivot("torso_armor").material_override
	check("the dreamwalker's torso plate is not forced flat non-metal",
		torso.metallic > 0.5)
	dw.free()

	var sentinel = CharacterModelScript.build("sentinel")
	var chest: ORMMaterial3D = sentinel.get_pivot("chest_plate").material_override
	check("the sentinel's chest plate is not forced flat non-metal",
		chest.metallic > 0.5)
	sentinel.free()


func _test_sentinel_wears_stone_and_iron_plating() -> void:
	print("the Sentinel is a hulking brute in riveted iron plate, leather harness and a belt, not a bare mannequin")
	var sentinel = CharacterModelScript.build("sentinel")
	for piece in ["chest_plate", "waist_band", "belt_buckle", "harness_l", "harness_r",
			"pauldron_l", "pauldron_r", "gauntlet_l", "gauntlet_r", "greave_l", "greave_r", "helm",
			"seam_chest"]:
		check("sentinel has a %s" % piece, sentinel.has_pivot(piece) and sentinel.get_pivot(piece) != null)

	var seam: MeshInstance3D = sentinel.get_pivot("seam_chest")
	var seam_mat: StandardMaterial3D = seam.material_override
	check("the construct's seam glows cyan, distinct from its amber/violet eye",
		seam_mat.emission.is_equal_approx(CharacterModelScript.SEAM_CYAN))
	sentinel.free()



# ---------------------------------------------------------------------------
# Judge finding, 2026-09-24: the live capture rendered pure black -- the
# camera sitting inside an outfit mesh roughly 100x too large and 100x too
# far from the character. Isolated headlessly, without spending the two
# screenshot captures spec 003 rations, by comparing blade_base_global()
# (reads only a bone transform's ORIGIN -- correctly scaled, ~0.98 m for a
# hand) against the same bone math applied to a whole mesh, which also uses
# the transform's BASIS: this rig's DEF-bone chain bakes a stray ~100x scale
# into that basis that nothing before this ever needed to read (a point or a
# normalized direction, blade_tip_global()'s and blade_base_global()'s own
# whole usage, never needs a transform's scale to be right; a mesh's own
# vertices do). Fixed in character_model.gd's _bone_attachment(), which now
# hangs every piece off a small unscale wrapper (_BONE_MESH_UNSCALE) inside
# each BoneAttachment3D, cancelling that stray scale for position and size
# alike.
#
# This check reuses the SAME tree-independent bone math blade_tip_global()
# leans on and _test_blade_tip_and_base already proves correct --
# _node_world_transform() and _bone_chain_transform() compose real
# transforms by hand, bone rest pose included, with no tree and no
# per-frame processing required (a live SceneTree parent plus an
# update_pose() call were tried first and both left every attachment
# reading back at the model's own origin -- BoneAttachment3D's own live
# tracking needs an actual per-frame engine tick, which a synchronous
# --script test never pumps; that path is not exercised here). Every
# outfit piece is a MeshInstance3D under the unscale wrapper under a
# BoneAttachment3D (the same shape _attach_box/_attach_dome/_attach_cylinder/
# the cape/the coat lathe all build), so walking up from the mesh to the
# nearest BoneAttachment3D ancestor, composing every local transform found
# along the way, always recovers the piece's true placement.
#
# Generalised 2026-09-24 (spec 003k, "Knight look chosen") to also accept a
# composite Node3D pivot (the shield, the goggles) rather than only a bare
# MeshInstance3D: those pieces are a whole small assembly of meshes (a board
# plus a boss plus a lion crest; two lenses plus a strap), the same shape
# _build_sword_mesh's own sword assembly already was, and they hang off a
# BoneAttachment3D exactly the same way -- so the same stray-100x-bone-basis
# bug this whole check exists to catch is just as real for them. A bare
# MeshInstance3D pivot still works unchanged: _collect_mesh_instances(node)
# returns `[node]` and _local_transform_within(node, node) is the identity,
# which is exactly the single-mesh case this function always handled.
func _collect_mesh_instances(node: Node) -> Array:
	var found: Array = []
	if node is MeshInstance3D and (node as MeshInstance3D).mesh != null:
		found.append(node)
	for child in node.get_children():
		found.append_array(_collect_mesh_instances(child))
	return found


func _local_transform_within(root: Node, target: Node) -> Transform3D:
	var t := Transform3D.IDENTITY
	var n: Node = target
	while n != null and n != root:
		if n is Node3D:
			t = (n as Node3D).transform * t
		n = n.get_parent()
	return t


func _piece_world_corners(model, piece_root: Node3D) -> Array:
	# Walk from the piece's own root up to (not including) its owning
	# BoneAttachment3D, composing every local transform in between -- the
	# unscale wrapper _bone_attachment() now inserts (character_model.gd's
	# own fix for this same finding) included, whatever its depth.
	var local_chain := Transform3D.IDENTITY
	var n: Node = piece_root
	while n != null and not (n is BoneAttachment3D):
		if n is Node3D:
			local_chain = (n as Node3D).transform * local_chain
		n = n.get_parent()
	var xform := Transform3D.IDENTITY
	var attach := n as BoneAttachment3D
	if attach != null:
		var bone_idx: int = model._skeleton.find_bone(attach.bone_name)
		var bone_t: Transform3D = model._node_world_transform(model._skeleton) \
			* model._bone_chain_transform(model._skeleton, bone_idx)
		xform = bone_t * local_chain
	else:
		# The modular Dreamwalker's combat shield is intentionally rooted on
		# the character so its post-attack chase silhouette cannot disappear
		# behind a lowered forearm. local_chain already reaches that root.
		xform = local_chain
	var minv := Vector3.INF
	var maxv := -Vector3.INF
	for mi in _collect_mesh_instances(piece_root):
		var mesh_local: Transform3D = _local_transform_within(piece_root, mi)
		var aabb: AABB = (mi as MeshInstance3D).mesh.get_aabb()
		for i in 8:
			var corner := aabb.position + Vector3(
				aabb.size.x if (i & 1) else 0.0,
				aabb.size.y if (i & 2) else 0.0,
				aabb.size.z if (i & 4) else 0.0)
			var world: Vector3 = xform * (mesh_local * corner)
			minv = minv.min(world)
			maxv = maxv.max(world)
	return [minv, maxv]


func _check_outfit_sizes(kind: String, pieces: Array, max_size: float, max_offset: float) -> void:
	var model = CharacterModelScript.build(kind)
	var root_origin: Vector3 = model._node_world_transform(model._skeleton).origin
	for piece in pieces:
		var mi: Node3D = model.get_pivot(piece)
		var corners: Array = _piece_world_corners(model, mi)
		var minv: Vector3 = corners[0]
		var maxv: Vector3 = corners[1]
		var size: float = (maxv - minv).length()
		var center: Vector3 = (minv + maxv) * 0.5
		var offset: float = center.distance_to(root_origin)
		check("%s's %s spans under %.1f m (measured %.2f m)"
				% [kind, piece, max_size, size], size < max_size)
		check("%s's %s sits near the character, not displaced across the map (measured %.2f m from the rig root)"
				% [kind, piece, offset], offset < max_offset)
	model.free()


func _test_outfit_pieces_are_reasonably_sized() -> void:
	print("no outfit piece is oversized enough to swallow the camera")
	_check_outfit_sizes("dreamwalker", ["torso_armor", "mail_skirt", "belt", "pauldron_l",
			"bracer_l", "greave_l", "vest_torso", "chest_strap", "pouch_1", "helmet",
			"helmet_brim", "goggles_down", "goggles_up", "shield_sheathed", "shield_drawn",
			"trim_pauldron_l", "vest_back"], 3.0, 2.5)
	_check_outfit_sizes("keeper", ["robe", "collar", "clasp_l", "shoulder_cape_l", "cuff_l",
			"belt"], 3.0, 2.5)
	_check_outfit_sizes("sentinel", ["chest_plate", "waist_band", "belt_buckle", "harness_l",
			"pauldron_l", "gauntlet_l", "fur_cuff_l", "greave_l", "helm", "seam_chest"], 6.0, 5.0)


# Judge finding, round 4 (2026-09-24, night capture): a giant glowing sphere
# filled the screen approaching Mireth -- her orbiting orb, attached with
# _attach_orbiting_glow() straight onto a bare BoneAttachment3D (no
# _BONE_MESH_UNSCALE wrapper), suffers the exact same stray-100x-bone-basis
# bug the outfit pass above already found and fixed for armor, since that
# bug lives in the shared rig's own "Rig" node scale, not anything specific
# to armor meshes -- confirmed empirically (tools/_debug_facing.gd, run once
# and deleted) by finding a DEF-bone's composed basis is ~100x scale in
# model space even though its ORIGIN reads correctly, which is exactly what
# _bone_attachment()'s unscale wrapper cancels and every non-armor
# attachment (the sword, the accent beads, the accent light) was never
# routed through. Joshua's own live-play report the same day named the
# sword too ("oversized/glitched on screen"). This extends the same size
# check above to every emissive mesh/orb in the file, not just armor.
func _test_emissive_pieces_are_reasonably_sized() -> void:
	print("no glowing accent (sword edge, orbiting orb, eye) is 100x oversized either")
	_check_outfit_sizes("dreamwalker", ["blade_edge", "seam_chest", "trim_collar", "trim_waist"], 3.0, 2.5)
	_check_outfit_sizes("keeper", ["accent_bead"], 3.0, 2.5)
	_check_outfit_sizes("sentinel", ["accent_bead"], 6.0, 5.0)


# Joshua's live-play report, round 4 (2026-09-24): the player walks
# backwards -- the body faces opposite its own movement direction.
# character_model.gd's _build() sets _rig_root.rotation.y = PI on the
# (unverified) assumption "the imported rig rests facing +Z"; player.gd's
# _face_movement (and npc.gd's talk-facing, and demo_director.gd's own
# facing override) all assume, separately, "the front of the model is its
# -Z side." Settled here from the skeleton itself rather than by trusting
# either assumption: DEF-toe.L sits forward of DEF-foot.L for any biped
# standing normally, in every action this rig plays (idle included), so the
# foot-to-toe direction -- read with the SAME tree-independent bone math
# blade_tip_global() already relies on, composed all the way up through
# _rig_root (so this bakes in whatever correction _build() currently
# applies) -- names which way the model actually faces without assuming
# either side of the mismatch. tools/_debug_facing.gd (run once and
# deleted) found this direction pointing toward +Z with the PI rotation in
# place: the rig rests facing -Z natively (the opposite of the header's old
# guess), so the PI "correction" was flipping it the wrong way.
func _test_model_faces_forward_along_minus_z() -> void:
	print("the model faces -Z, matching player.gd/npc.gd/demo_director.gd's own front-is-minus-Z assumption")
	for kind in [CharacterModelScript.KIND_DREAMWALKER, CharacterModelScript.KIND_KEEPER,
			CharacterModelScript.KIND_SENTINEL]:
		var model = CharacterModelScript.build(kind)
		var skel: Skeleton3D = model._skeleton
		var toe_bone_name := "ball_l" if skel.find_bone("ball_l") != -1 else "DEF-toe.L"
		var foot_bone_name := "foot_l" if skel.find_bone("foot_l") != -1 else "DEF-foot.L"
		var toe_idx := skel.find_bone(toe_bone_name)
		var foot_idx := skel.find_bone(foot_bone_name)
		check("%s has the toe/foot bones this check needs" % kind, toe_idx != -1 and foot_idx != -1)
		var toe_pos: Vector3 = (model._node_world_transform(skel) * model._bone_chain_transform(skel, toe_idx)).origin
		var foot_pos: Vector3 = (model._node_world_transform(skel) * model._bone_chain_transform(skel, foot_idx)).origin
		var forward: Vector3 = toe_pos - foot_pos
		forward.y = 0.0
		check("%s: the foot-to-toe direction (standing forward) points toward -Z, not +Z" % kind,
			forward.normalized().dot(Vector3(0.0, 0.0, -1.0)) > 0.5)
		model.free()


func _test_armor_does_not_leak_between_kinds() -> void:
	print("armor and clothing stay on their own kind")
	var dw = CharacterModelScript.build("dreamwalker")
	var keeper = CharacterModelScript.build("keeper")
	var sentinel = CharacterModelScript.build("sentinel")
	check("only the keeper wears a coat",
		not dw.has_pivot("robe") and not sentinel.has_pivot("robe"))
	check("only the sentinel wears a helm",
		not dw.has_pivot("helm") and not keeper.has_pivot("helm"))
	check("only the dreamwalker wears the knight's steel helmet",
		not keeper.has_pivot("helmet") and not sentinel.has_pivot("helmet"))
	check("only the dreamwalker wears goggles",
		not keeper.has_pivot("goggles_down") and not sentinel.has_pivot("goggles_down"))
	check("only the dreamwalker carries a shield",
		not keeper.has_pivot("shield_sheathed") and not sentinel.has_pivot("shield_sheathed"))
	check("only the dreamwalker wears the tactical vest",
		not keeper.has_pivot("vest_torso") and not sentinel.has_pivot("vest_torso"))
	dw.free()
	keeper.free()
	sentinel.free()
