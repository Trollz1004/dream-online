extends Node3D

# Real rigged, animated 3D characters for the crowdfunding demo (spec 003,
# lever 1: "Real characters"). Replaces the box-and-cylinder procedural rig
# that used to live in this file (spec 002's "The character").
#
# Source: Quaternius (www.quaternius.com / quaternius.itch.io), CC0 1.0
# Universal. Licence text and source URLs are recorded in
# assets/third_party/LICENSES.md before this file was used, per spec 003's
# rule. One shared rigged, animated body (the "Universal Base Characters"
# rig, paired with the "Universal Animation Library" of baked-in clips)
# plays all three kinds -- dreamwalker, keeper and sentinel -- distinguished
# by material tint, scale and a small bone-attached light accent, the same
# way the old procedural rig shared one humanoid skeleton between the
# dreamwalker and the keeper.
#
# Revision note (2026-09-24, same day): the first pass of this file used
# KayKit's chunky, big-head "Adventurers"/"Skeletons" packs. Joshua's
# judgement on that pass: "very bubble like... chunky, toy-proportioned...
# OUT." This rewrite keeps the adapter and the state-to-animation mapping
# shape from that pass -- only the source rig, its bone names and its clip
# names changed underneath. See LICENSES.md for the swap note and what a
# second KayKit attempt would have needed (a from-scratch armour pass on a
# stylised rig) versus what this route needed (a material pass on a
# realistic one).
#
# Known limitation, reported rather than hidden: this rig ships as a bare
# grey mannequin -- no clothing geometry. "Layered leather and steel" and
# "a robed woman" currently read only through material colour and
# metallic/roughness values on the mannequin's own two material slots
# (M_Main, M_Joints), not through modelled armour or robe meshes.
# Quaternius's own "Modular Character Outfits - Fantasy" pack (CC0, built to
# fit this exact rig) is the natural next step for real armour/robe
# geometry, but its only distribution this lane found is itch.io's
# purchase-flow download button, a manual click-through -- per spec 003's
# rule this file stops short of that rather than script around it. Actual
# PBR texture maps for the mannequin (albedo, normal, roughness/metallic, an
# emissive mask for the accent glows) are the other open item; Joshua has
# offered to generate those in ComfyUI once told which maps are needed (see
# the report this work shipped with).
#
# Two pieces of requested behaviour ARE built as simple primitive geometry
# (the same BoxMesh/CylinderMesh approach the old procedural rig used
# throughout, just for two props instead of a whole body):
#   - The Dreamwalker's sword is modelled (blade, crossguard, leather grip)
#     and exists as two instances, one bone-attached to the upper back
#     (sheathed) and one to the right hand (drawn). update_pose() toggles
#     which is visible off the same `action` string that already drives the
#     animation: any attack, guard or skill draws it; it re-sheathes itself
#     SWORD_SHEATHE_DELAY seconds after the last one.
#   - The Keeper's light is a small orbiting orb near her shoulder (a
#     rotating pivot, not a fixed hand attachment) rather than a staff-held
#     lantern, per Joshua's later note -- it keeps the same day/brighter,
#     night/dimmer behaviour ("the Mireth memory light") the original spec
#     asked to preserve, just relocated.
#
# This file is an ADAPTER, not a from-scratch rig builder: the whole public
# surface the rest of the game and its tests call is unchanged from the old
# procedural version --
#   build(kind), set_time_of_day(t), update_pose(delta, state),
#   set_blade_glow(amount), blade_tip_global(), blade_base_global(),
#   has_pivot(name), get_pivot(name), kind, KIND_*, S_EYE_DAY, S_EYE_NIGHT --
# so player.gd, npc.gd, dummy.gd and world.gd needed no changes at all
# (confirmed by grep: nothing outside this file and its own test ever reads
# the old bone-pivot names or calls blade_tip_global/blade_base_global/
# set_blade_glow -- only tools/preview_characters.gd calls set_blade_glow,
# and only this file's own test reads pivots). `pivots` is therefore
# reinterpreted here as a small registry of the handful of nodes worth
# naming on the new rig (the animation player, the skeleton, the accent
# lights) rather than a full bone-name map -- there is no procedural bone
# rig left to name.
#
# Deliberately never calls Node3D.global_transform/global_position: doing so
# on an instance a test built and never added to a live scene tree raises
# (confirmed empirically while building this adapter, and already recorded
# for the old rig by npc.gd on 2026-09-22). _node_world_transform() and
# _bone_chain_transform() below compose local transforms by hand instead, so
# blade_tip_global()/blade_base_global() work whether or not this model is
# ever inside a running SceneTree -- same guarantee the old file made.
#
# Animation playback is fully hand-driven, not Godot's own autonomous
# playback: update_pose() never calls AnimationPlayer.play(). It sets
# current_animation and calls seek(pos, true) every call, with `pos` either
# `progress * clip_length` (attacks, guard, hit, talk, cast_beam, down -- any
# action with an externally owned timeline) or an internally accumulated,
# looping time (idle/run locomotion, and the sentinel's idle). This keeps
# the same determinism the old procedural pose functions had: a given
# (action, progress) always produces the same pose, which is what
# tests/test_character_model.gd relies on.

const KIND_DREAMWALKER := "dreamwalker"
const KIND_KEEPER := "keeper"
const KIND_SENTINEL := "sentinel"

# Read by dummy.gd directly (CharacterModelScript.S_EYE_DAY/S_EYE_NIGHT) to
# colour the Sentinel's telegraphed beam without duplicating the colour --
# values unchanged from the old rig so the beam's colour does not shift.
const S_EYE_DAY := Color(1.0, 0.60, 0.14)
const S_EYE_NIGHT := Color(0.56, 0.24, 0.96)

# Palette carried over from the old procedural rig (spec 002, "The
# character"), reused here as material tints on the one shared mannequin
# instead of on bespoke geometry.
const DW_MAIN := Color(0.09, 0.085, 0.095)     # the dreamwalker's dark leather
const DW_TRIM := Color(0.58, 0.60, 0.64)       # steel plate/joints
const DW_ACCENT := Color(0.58, 0.30, 0.97)     # the Dreamedge's violet fuller, carried over
const K_ROBE := Color(0.30, 0.24, 0.36)        # Mireth's robe
const K_TRIM := Color(0.42, 0.20, 0.10)        # her robe's rust trim
const K_LANTERN := Color(1.0, 0.72, 0.34)      # her lantern light, unchanged
const S_STONE := Color(0.40, 0.38, 0.36)       # the Sentinel's stone-and-iron body
const S_BRONZE := Color(0.46, 0.33, 0.15)      # its banded joints

const BASE_SCENE := preload("res://assets/third_party/quaternius/UniversalBaseCharacter.glb")

# The rig's own scale reads as an ordinary ~1.83 m adult already (confirmed
# empirically, isolating just the body mesh's world AABB, while building
# this adapter -- an earlier, noisier multi-node AABB walk had suggested a
# ~39x correction was needed here; it was not, and no such correction is
# applied). Only the per-kind multipliers below adjust it.
const KEEPER_SCALE := 1.06     # "a tall robed woman"
const SENTINEL_SCALE := 1.9    # "a huge hulking brute... whose scale dwarfs the player"

# Attacks, guard and the two skills draw the sword; it stays drawn through a
# dash mid-fight (the timer is only reset, never re-armed, by a bare dash)
# and re-sheathes this many seconds after the last combat action.
const COMBAT_ACTIONS := ["swing1", "swing2", "swing3", "heavy", "guard", "lunge", "burst"]
const SWORD_SHEATHE_DELAY := 3.0
const ORBIT_SPEED := 1.1   # radians/second, the Keeper's floating orb

var kind := KIND_DREAMWALKER
var pivots := {}   # String -> Node, a small registry; see the header note.

var _built := false
var _time_of_day := "day"

var _rig_root: Node3D = null
var _skeleton: Skeleton3D = null
var _anim: AnimationPlayer = null
var _body_mesh: MeshInstance3D = null

var _accent_material: StandardMaterial3D = null   # dreamwalker's blade edge / keeper's orb / sentinel's eye
var _accent_light: OmniLight3D = null
var _accent_day := 1.0
var _accent_night := 1.0
var _orbit_pivot: Node3D = null   # the keeper's floating orb only

var _sword_sheathed: Node3D = null
var _sword_drawn: Node3D = null
var _combat_timer := 0.0

var _loop_t := 0.0
var _last_loop_clip := ""


# The factory form the rest of the codebase calls. Building outside the
# scene tree is deliberate (see the header note); everything a caller needs
# works before add_child is ever called.
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
		KIND_KEEPER, KIND_SENTINEL:
			pass
		_:
			kind = KIND_DREAMWALKER

	_rig_root = BASE_SCENE.instantiate()
	_rig_root.rotation.y = PI   # the imported rig rests facing +Z; see the visual check note below.
	add_child(_rig_root)
	_skeleton = _rig_root.get_node("RootNode/Rig/Skeleton3D")
	_anim = _rig_root.get_node("AnimationPlayer")
	_body_mesh = _skeleton.get_node("Mannequin")
	pivots["rig_root"] = _rig_root
	pivots["skeleton"] = _skeleton
	pivots["animation_player"] = _anim
	pivots["body"] = _body_mesh

	match kind:
		KIND_KEEPER:
			_setup_keeper()
		KIND_SENTINEL:
			_setup_sentinel()
		_:
			_setup_dreamwalker()


func has_pivot(name: String) -> bool:
	return pivots.has(name)


func get_pivot(name: String) -> Node:
	return pivots.get(name)


# ---------------------------------------------------------------------------
# Per-kind setup: a material tint (there is no clothing/armour geometry to
# swap -- see the header note), a scale, and one small bone-attached glow
# each kind keeps from the old rig (the sword's glow, Mireth's lit lantern,
# the Sentinel's day/night eye).
# ---------------------------------------------------------------------------

func _tint_body(main_color: Color, trim_color: Color, metallic: float, roughness: float) -> void:
	if _body_mesh == null:
		return
	var main_mat := StandardMaterial3D.new()
	main_mat.albedo_color = main_color
	main_mat.metallic = metallic
	main_mat.roughness = roughness
	_body_mesh.set_surface_override_material(0, main_mat)

	var trim_mat := StandardMaterial3D.new()
	trim_mat.albedo_color = trim_color
	trim_mat.metallic = clampf(metallic + 0.2, 0.0, 1.0)
	trim_mat.roughness = clampf(roughness - 0.15, 0.0, 1.0)
	_body_mesh.set_surface_override_material(1, trim_mat)


# A small glowing bead plus the OmniLight3D that actually lights the scene,
# bone-attached so it follows the pose during real gameplay (BoneAttachment3D
# tracks its bone every frame the node is inside a live, processing tree --
# unlike the bone-pose read _bone_chain_transform() below relies on, which
# works with no tree at all; see that function's own note).
func _attach_glow(bone_name: String, local_offset: Vector3, color: Color,
		day_energy: float, night_energy: float, with_light: bool) -> void:
	var bone_idx := _skeleton.find_bone(bone_name)
	if bone_idx == -1:
		return
	var attachment := BoneAttachment3D.new()
	attachment.bone_name = bone_name
	_skeleton.add_child(attachment)

	var bead := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.035
	sphere.height = 0.07
	sphere.radial_segments = 10
	sphere.rings = 6
	bead.mesh = sphere
	_accent_material = StandardMaterial3D.new()
	_accent_material.albedo_color = color
	_accent_material.emission_enabled = true
	_accent_material.emission = color
	_accent_material.emission_energy_multiplier = day_energy
	bead.material_override = _accent_material
	bead.position = local_offset
	attachment.add_child(bead)
	pivots["accent_bead"] = bead

	if with_light:
		_accent_light = OmniLight3D.new()
		_accent_light.position = local_offset
		_accent_light.omni_range = 4.0
		_accent_light.light_energy = day_energy
		_accent_light.light_color = color
		attachment.add_child(_accent_light)
		pivots["accent_light"] = _accent_light

	_accent_day = day_energy
	_accent_night = night_energy


# Like _attach_glow, but the bead+light sit on a pivot offset by
# `orbit_radius` and `orbit_height` rather than directly on the bone; the
# pivot itself is rotated every update_pose() call (Keeper only) so the orb
# genuinely orbits rather than just floating at a fixed offset.
func _attach_orbiting_glow(bone_name: String, orbit_radius: float, orbit_height: float,
		color: Color, day_energy: float, night_energy: float) -> void:
	var bone_idx := _skeleton.find_bone(bone_name)
	if bone_idx == -1:
		return
	var attachment := BoneAttachment3D.new()
	attachment.bone_name = bone_name
	_skeleton.add_child(attachment)

	_orbit_pivot = Node3D.new()
	attachment.add_child(_orbit_pivot)
	pivots["orbit_pivot"] = _orbit_pivot

	var offset := Vector3(orbit_radius, orbit_height, 0.0)
	var bead := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.04
	sphere.height = 0.08
	sphere.radial_segments = 12
	sphere.rings = 7
	bead.mesh = sphere
	_accent_material = StandardMaterial3D.new()
	_accent_material.albedo_color = color
	_accent_material.emission_enabled = true
	_accent_material.emission = color
	_accent_material.emission_energy_multiplier = day_energy
	bead.material_override = _accent_material
	bead.position = offset
	_orbit_pivot.add_child(bead)
	pivots["accent_bead"] = bead

	_accent_light = OmniLight3D.new()
	_accent_light.position = offset
	_accent_light.omni_range = 4.0
	_accent_light.light_energy = day_energy
	_accent_light.light_color = color
	_orbit_pivot.add_child(_accent_light)
	pivots["accent_light"] = _accent_light

	_accent_day = day_energy
	_accent_night = night_energy


func _setup_dreamwalker() -> void:
	_tint_body(DW_MAIN, DW_TRIM, 0.55, 0.4)
	_build_and_attach_sword()


# A simple primitive sword (blade, crossguard, leather grip -- the same
# BoxMesh/CylinderMesh approach the old procedural rig used throughout),
# built twice: one copy bone-attached across the upper back (sheathed), one
# to the right hand (drawn). update_pose() toggles which is visible off the
# `action` string.
func _build_and_attach_sword() -> void:
	var steel_mat := StandardMaterial3D.new()
	steel_mat.albedo_color = DW_TRIM
	steel_mat.metallic = 0.85
	steel_mat.roughness = 0.25
	var grip_mat := StandardMaterial3D.new()
	grip_mat.albedo_color = Color(0.16, 0.11, 0.07)
	grip_mat.metallic = 0.0
	grip_mat.roughness = 0.9

	_accent_material = StandardMaterial3D.new()
	_accent_material.albedo_color = DW_ACCENT
	_accent_material.emission_enabled = true
	_accent_material.emission = DW_ACCENT
	_accent_material.emission_energy_multiplier = 0.6

	var back_attach := BoneAttachment3D.new()
	back_attach.bone_name = "DEF-spine.003"
	_skeleton.add_child(back_attach)
	_sword_sheathed = _build_sword_mesh(steel_mat, grip_mat, false)
	_sword_sheathed.position = Vector3(-0.05, 0.09, -0.02)
	_sword_sheathed.rotation_degrees = Vector3(105.0, 6.0, 14.0)
	back_attach.add_child(_sword_sheathed)
	pivots["sword_sheathed"] = _sword_sheathed

	var hand_attach := BoneAttachment3D.new()
	hand_attach.bone_name = "DEF-hand.R"
	_skeleton.add_child(hand_attach)
	_sword_drawn = _build_sword_mesh(steel_mat, grip_mat, true)
	hand_attach.add_child(_sword_drawn)
	pivots["sword_drawn"] = _sword_drawn

	_sword_drawn.visible = false
	_sword_sheathed.visible = true


func _build_sword_mesh(steel_mat: Material, grip_mat: Material, glowing_edge: bool) -> Node3D:
	var sword := Node3D.new()

	var blade := MeshInstance3D.new()
	var blade_mesh := BoxMesh.new()
	blade_mesh.size = Vector3(0.045, 0.55, 0.009)
	blade.mesh = blade_mesh
	blade.position = Vector3(0.0, 0.33, 0.0)
	blade.material_override = steel_mat
	sword.add_child(blade)

	if glowing_edge:
		var edge := MeshInstance3D.new()
		var edge_mesh := BoxMesh.new()
		edge_mesh.size = Vector3(0.006, 0.50, 0.011)
		edge.mesh = edge_mesh
		edge.position = Vector3(0.0, 0.33, 0.0)
		edge.material_override = _accent_material
		sword.add_child(edge)
		pivots["blade_edge"] = edge

	var guard := MeshInstance3D.new()
	var guard_mesh := BoxMesh.new()
	guard_mesh.size = Vector3(0.16, 0.02, 0.03)
	guard.mesh = guard_mesh
	guard.material_override = steel_mat
	sword.add_child(guard)

	var grip := MeshInstance3D.new()
	var grip_mesh := CylinderMesh.new()
	grip_mesh.top_radius = 0.014
	grip_mesh.bottom_radius = 0.016
	grip_mesh.height = 0.14
	grip.mesh = grip_mesh
	grip.position = Vector3(0.0, -0.08, 0.0)
	grip.material_override = grip_mat
	sword.add_child(grip)

	var pommel := MeshInstance3D.new()
	var pommel_mesh := SphereMesh.new()
	pommel_mesh.radius = 0.018
	pommel_mesh.height = 0.036
	pommel.mesh = pommel_mesh
	pommel.position = Vector3(0.0, -0.155, 0.0)
	pommel.material_override = steel_mat
	sword.add_child(pommel)

	return sword


func _setup_keeper() -> void:
	_rig_root.scale = Vector3.ONE * KEEPER_SCALE
	_tint_body(K_ROBE, K_TRIM, 0.1, 0.85)
	# A floating, orbiting orb near the shoulder rather than a staff-held
	# lantern (Joshua's later note); still the day-brighter/night-dimmer
	# light the original spec called "the Mireth memory light" (integration-
	# card judge note carried over from the old rig, 2026-09-23: brighter
	# than this at night blew out Mireth's own face).
	_attach_orbiting_glow("DEF-shoulder.L", 0.16, 0.10, K_LANTERN, 1.3, 1.1)


func _setup_sentinel() -> void:
	_rig_root.scale = Vector3.ONE * SENTINEL_SCALE
	_tint_body(S_STONE, S_BRONZE, 0.5, 0.6)
	_attach_glow("DEF-head", Vector3(0.0, 0.03, 0.09), S_EYE_DAY, 2.6, 4.0, false)


# amber by day, violet by night for the Sentinel's eye, the same swap the
# old rig made; brightens/dims Mireth's lantern (per the judge note above).
# A no-op on the dreamwalker, whose accent glow is driven by
# set_blade_glow(), not the clock.
func set_time_of_day(t: String) -> void:
	_time_of_day = t
	if kind == KIND_DREAMWALKER or _accent_material == null:
		return
	var night := t == "night"
	var color: Color = (S_EYE_NIGHT if night else S_EYE_DAY) if kind == KIND_SENTINEL else K_LANTERN
	var energy: float = _accent_night if night else _accent_day
	_accent_material.albedo_color = color
	_accent_material.emission = color
	_accent_material.emission_energy_multiplier = energy
	if _accent_light != null:
		_accent_light.light_energy = energy
		if kind == KIND_SENTINEL:
			_accent_light.light_color = color


# 0..1. Drives the violet glow at the Dreamwalker's sword hand; a no-op on
# every other kind (and if the accent was not set up), so a caller never has
# to check `kind` first -- tools/preview_characters.gd calls this
# unconditionally on every kind it builds.
func set_blade_glow(amount: float) -> void:
	if kind != KIND_DREAMWALKER or _accent_material == null:
		return
	_accent_material.emission_energy_multiplier = lerp(0.6, 5.0, clampf(amount, 0.0, 1.0))


const _BLADE_LENGTH := 0.85


func blade_tip_global() -> Vector3:
	return _blade_point(true)


func blade_base_global() -> Vector3:
	return _blade_point(false)


# There is no sword mesh on this rig (see the header note): both points are
# derived from the right hand bone alone, which is enough to keep the old
# "the blade has real length" contract (base != tip, a finite offset apart)
# without pretending there is modelled geometry to measure.
func _blade_point(tip: bool) -> Vector3:
	if kind != KIND_DREAMWALKER or _skeleton == null:
		return _node_world_transform(self).origin
	var bone_idx := _skeleton.find_bone("DEF-hand.R")
	if bone_idx == -1:
		return _node_world_transform(self).origin
	var world_t := _node_world_transform(_skeleton) * _bone_chain_transform(_skeleton, bone_idx)
	if not tip:
		return world_t.origin
	return world_t.origin + world_t.basis.y.normalized() * -_BLADE_LENGTH


# Composes local transforms up the parent chain by hand instead of asking
# the engine for global_transform, which raises on a node that was never
# added to a running SceneTree (see the header note). Works either way.
func _node_world_transform(node: Node) -> Transform3D:
	var t := Transform3D.IDENTITY
	var n := node
	while n != null and n is Node3D:
		t = (n as Node3D).transform * t
		n = n.get_parent()
	return t


# The Skeleton3D equivalent of _node_world_transform: composes each bone's
# own local pose (relative to its parent bone) up to the skeleton's root
# bone. Skeleton3D.get_bone_global_pose() was tried first and found to only
# refresh once a frame has actually been processed inside a live tree --
# useless for a model a test builds and never adds to one -- so this reads
# get_bone_pose() (always current the instant a track is seeked) instead.
func _bone_chain_transform(skeleton: Skeleton3D, bone_idx: int) -> Transform3D:
	var chain: Array = []
	var idx := bone_idx
	while idx != -1:
		chain.append(idx)
		idx = skeleton.get_bone_parent(idx)
	var t := Transform3D.IDENTITY
	for i in range(chain.size() - 1, -1, -1):
		t = t * skeleton.get_bone_pose(chain[i])
	return t


# ---------------------------------------------------------------------------
# State-to-animation mapping. Pure and static so it is unit-testable with no
# built model, no scene tree and no glb loaded at all -- the "logic" spec 003
# asks for a failing test first on.
#
# Clip names carry the "Rig|" prefix Godot's glTF importer kept from the
# source file's Blender action names (confirmed by AnimationPlayer.
# get_animation_list() while building this adapter -- get_animation() on the
# bare name silently returns null, which would have made every action
# degrade to idle without ever raising).
# ---------------------------------------------------------------------------

# speed/sprint are only meaningful for the two humanoid kinds; the Sentinel
# stands its ground and only ever reads `action`.
static func plan_for_state(kind_name: String, action: String, speed: float, sprint: bool) -> Dictionary:
	if kind_name == KIND_SENTINEL:
		return _plan_sentinel(action)
	return _plan_humanoid(action, speed, sprint)


static func _plan_humanoid(action: String, speed: float, sprint: bool) -> Dictionary:
	match action:
		"swing1":
			return {"animation": "Rig|Sword_Attack", "drive": "progress", "speed_scale": 1.0}
		"swing2":
			return {"animation": "Rig|Sword_Attack_RM", "drive": "progress", "speed_scale": 1.0}
		"swing3":
			return {"animation": "Rig|Sword_Attack", "drive": "progress", "speed_scale": 1.0}
		"heavy":
			return {"animation": "Rig|Sword_Attack_RM", "drive": "progress", "speed_scale": 1.0}
		"guard":
			return {"animation": "Rig|Sword_Idle", "drive": "progress", "speed_scale": 1.0}
		"dash":
			return {"animation": "Rig|Roll", "drive": "progress", "speed_scale": 1.0}
		"lunge":
			return {"animation": "Rig|Sword_Attack_RM", "drive": "progress", "speed_scale": 1.0}
		"burst":
			return {"animation": "Rig|Spell_Simple_Shoot", "drive": "progress", "speed_scale": 1.0}
		"hit":
			return {"animation": "Rig|Hit_Chest", "drive": "progress", "speed_scale": 1.0}
		"down":
			return {"animation": "Rig|Death01", "drive": "progress", "speed_scale": 1.0}
		"talk":
			return {"animation": "Rig|Idle_Talking", "drive": "progress", "speed_scale": 1.0}
		_:
			# "" (idle/run) and anything this rig does not recognise (for
			# example "cast_beam", which only the Sentinel ever actually
			# plays) both degrade to locomotion rather than erroring.
			return _plan_locomotion(speed, sprint)


static func _plan_locomotion(speed: float, sprint: bool) -> Dictionary:
	var scale: float = lerp(0.9, 1.3, speed) * (1.2 if sprint else 1.0)
	if speed < 0.12:
		return {"animation": "Rig|Idle", "drive": "loop", "speed_scale": 1.0}
	elif speed < 0.6:
		return {"animation": "Rig|Walk", "drive": "loop", "speed_scale": scale}
	return {"animation": "Rig|Sprint" if sprint else "Rig|Jog_Fwd", "drive": "loop", "speed_scale": scale}


static func _plan_sentinel(action: String) -> Dictionary:
	match action:
		"hit":
			return {"animation": "Rig|Hit_Head", "drive": "progress", "speed_scale": 1.0}
		"cast_beam":
			return {"animation": "Rig|Spell_Simple_Shoot", "drive": "progress", "speed_scale": 1.0}
		"down":
			return {"animation": "Rig|Death01", "drive": "progress", "speed_scale": 1.0}
		_:
			# This rig has no separate combat-idle clip (unlike the old
			# rig's "Idle_Combat"); the Sentinel's plain idle stands in.
			return {"animation": "Rig|Idle", "drive": "loop", "speed_scale": 1.0}


# ---------------------------------------------------------------------------
# update_pose(delta, state): unchanged call signature, entirely new engine
# underneath -- hand-drives the AnimationPlayer instead of posing a
# procedural bone rig.
# ---------------------------------------------------------------------------

func update_pose(delta: float, state: Dictionary) -> void:
	if _anim == null:
		return
	var action: String = String(state.get("action", ""))
	var speed: float = clampf(float(state.get("speed", 0.0)), 0.0, 1.0)
	var sprint: bool = bool(state.get("sprint", false))
	var progress: float = clampf(float(state.get("progress", 0.0)), 0.0, 1.0)

	var plan: Dictionary = plan_for_state(kind, action, speed, sprint)
	var clip: String = plan["animation"]
	var anim_res: Animation = _anim.get_animation(clip)
	if anim_res == null:
		return
	var length: float = maxf(anim_res.length, 0.0001)

	var pos: float
	if plan["drive"] == "loop":
		if _last_loop_clip != clip:
			_loop_t = 0.0
			_last_loop_clip = clip
		_loop_t += delta * float(plan["speed_scale"])
		pos = fmod(_loop_t, length)
	else:
		_last_loop_clip = ""
		pos = progress * length

	if _anim.current_animation != clip:
		_anim.current_animation = clip
	_anim.seek(pos, true)
	if _skeleton != null:
		_skeleton.force_update_all_bone_transforms()

	if kind == KIND_DREAMWALKER:
		_update_sword_draw(delta, action)
	elif kind == KIND_KEEPER and _orbit_pivot != null:
		_orbit_pivot.rotation.y += delta * ORBIT_SPEED


# idle/run = sheathed, any attack/guard/skill = drawn, and it stays drawn
# for SWORD_SHEATHE_DELAY seconds after the last one (a bare dash mid-fight
# does not re-arm the timer, but does not cut it short either).
func _update_sword_draw(delta: float, action: String) -> void:
	if _sword_drawn == null or _sword_sheathed == null:
		return
	if COMBAT_ACTIONS.has(action):
		_combat_timer = SWORD_SHEATHE_DELAY
	elif _combat_timer > 0.0:
		_combat_timer = maxf(0.0, _combat_timer - delta)
	var drawn := _combat_timer > 0.0
	_sword_drawn.visible = drawn
	_sword_sheathed.visible = not drawn
