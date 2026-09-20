"""build_dream_maps.py

Runs inside the Unreal Editor's embedded Python (see Build-DreamMaps.ps1).
Deterministic and re-runnable: every run deletes and recreates
/Game/Dream/Maps/Lvl_DayDream, /Game/Dream/Maps/Lvl_NightDream and everything
under /Game/Dream/Materials, and touches nothing else under /Game. Uses only
ENGINE content (/Engine/BasicShapes/*, engine lights, sky and fog actors)
plus materials created here by script.

Usage (commandlet form):
  UnrealEditor-Cmd.exe "<uproject>" -run=pythonscript -script="build_dream_maps.py" -unattended -nopause -nosplash -nullrhi

Usage (full editor fallback form, only if the commandlet form cannot create
or save levels):
  UnrealEditor.exe "<uproject>" -ExecutePythonScript="build_dream_maps.py" -unattended -nosplash
  (this form must quit the editor itself at the end; see main() below)
"""

import math
import os
import random
import sys
import traceback

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import unreal  # noqa: E402

import dream_maps_common as common  # noqa: E402

MP = unreal.MaterialProperty

# Set to True only when launched via -ExecutePythonScript against the full
# UnrealEditor.exe (no commandlet host to return an exit code), in which
# case main() calls unreal.SystemLibrary.quit_editor() at the end.
RUNNING_AS_FULL_EDITOR_FALLBACK = "-ExecutePythonScript" in " ".join(sys.argv) if hasattr(sys, "argv") else False

_mesh_cache = {}


# --- generic helpers ---------------------------------------------------------


def load_mesh(path):
    if path not in _mesh_cache:
        _mesh_cache[path] = unreal.EditorAssetLibrary.load_asset(path)
    return _mesh_cache[path]


def spawn_mesh(mesh_path, location, rotation, scale, material=None, label=None):
    actor_subsystem = common.get_actor_subsystem()
    actor = actor_subsystem.spawn_actor_from_class(unreal.StaticMeshActor, location, rotation)
    mesh = load_mesh(mesh_path)
    smc = actor.static_mesh_component
    smc.set_static_mesh(mesh)
    actor.set_actor_scale3d(scale)
    try:
        smc.set_collision_profile_name("BlockAll")
    except Exception:
        unreal.log_warning("could not set collision profile on {0}".format(label))
    if material is not None:
        smc.set_material(0, material)
    if label:
        try:
            actor.set_actor_label(label, mark_dirty=False)
        except Exception:
            pass
    return actor


def spawn_actor(actor_class, location, rotation, label=None):
    actor_subsystem = common.get_actor_subsystem()
    actor = actor_subsystem.spawn_actor_from_class(actor_class, location, rotation)
    if label:
        try:
            actor.set_actor_label(label, mark_dirty=False)
        except Exception:
            pass
    return actor


def try_set(obj, prop, value, what=""):
    try:
        obj.set_editor_property(prop, value)
        return True
    except Exception as exc:
        unreal.log_warning("could not set {0}.{1} = {2} ({3})".format(what, prop, value, exc))
        return False


def get_component(actor, component_class):
    try:
        return actor.get_component_by_class(component_class)
    except Exception:
        return None


# --- material helpers ---------------------------------------------------------


def asset_tools():
    return unreal.AssetToolsHelpers.get_asset_tools()


def new_material(name):
    factory = unreal.MaterialFactoryNew()
    return asset_tools().create_asset(name, common.MATERIALS_PATH, unreal.Material, factory)


def expr(material, expr_class, x, y):
    return unreal.MaterialEditingLibrary.create_material_expression(material, expr_class, x, y)


def connect(a, a_out, b, b_in):
    ok = unreal.MaterialEditingLibrary.connect_material_expressions(a, a_out, b, b_in)
    if not ok:
        unreal.log_warning("material expression connect failed: {0}[{1}] -> {2}[{3}]".format(a, a_out, b, b_in))
    return ok


def connect_prop(a, a_out, prop):
    ok = unreal.MaterialEditingLibrary.connect_material_property(a, a_out, prop)
    if not ok:
        unreal.log_warning("material property connect failed: {0}[{1}] -> {2}".format(a, a_out, prop))
    return ok


def const_scalar(material, value, x, y):
    c = expr(material, unreal.MaterialExpressionConstant, x, y)
    try_set(c, "r", float(value), "Constant")
    return c


def const_vec2(material, r, g, x, y):
    c = expr(material, unreal.MaterialExpressionConstant2Vector, x, y)
    try_set(c, "r", float(r), "Constant2Vector")
    try_set(c, "g", float(g), "Constant2Vector")
    return c


def const_color(material, r, g, b, x, y):
    c = expr(material, unreal.MaterialExpressionConstant3Vector, x, y)
    try_set(c, "constant", unreal.LinearColor(float(r), float(g), float(b), 1.0), "Constant3Vector")
    return c


def finish_material(material):
    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material)


def create_simple_material(name, base_color, roughness, emissive_color=None, emissive_intensity=0.0):
    """A flat-shaded material: constant base colour + roughness, optional
    constant emissive. Used for ground, track, street and sign materials
    that do not need a procedural pattern."""
    mat = new_material(name)
    base = const_color(mat, base_color[0], base_color[1], base_color[2], -300, -100)
    connect_prop(base, "", MP.MP_BASE_COLOR)

    rough = const_scalar(mat, roughness, -300, 50)
    connect_prop(rough, "", MP.MP_ROUGHNESS)

    if emissive_color is not None and emissive_intensity > 0.0:
        em = const_color(mat, emissive_color[0], emissive_color[1], emissive_color[2], -300, 200)
        intensity = const_scalar(mat, emissive_intensity, -150, 260)
        mul = expr(mat, unreal.MaterialExpressionMultiply, 0, 200)
        connect(em, "", mul, "A")
        connect(intensity, "", mul, "B")
        connect_prop(mul, "", MP.MP_EMISSIVE_COLOR)

    finish_material(mat)
    return mat


def create_tower_window_material(name, grid_x, grid_y, lit_threshold, lit_color, emissive_intensity, base_color):
    """A tower material with a lit-window pattern in the emissive channel,
    built from TextureCoordinate, Multiply, Frac and a comparison (If) node
    through unreal.MaterialEditingLibrary.

    - TextureCoordinate + Multiply(grid) + Frac tiles the UV into per-window
      cells.
    - Multiply(cell, 1-cell) on each axis, then multiplied together, makes a
      soft rectangular mask that peaks at the centre of each cell and falls
      to 0 at the cell edges (the wall between windows).
    - Floor(scaled) + DotProduct + Sine + Frac hashes each cell index into a
      pseudo-random 0..1 value per window.
    - The If node compares that random value against a lit-threshold
      constant to choose between a lit-window colour and a dark colour: this
      is the comparison/mask node the card asks for.
    """
    mat = new_material(name)

    uv = expr(mat, unreal.MaterialExpressionTextureCoordinate, -900, -150)
    grid = const_vec2(mat, grid_x, grid_y, -900, 0)
    scaled = expr(mat, unreal.MaterialExpressionMultiply, -700, -100)
    connect(uv, "", scaled, "A")
    connect(grid, "", scaled, "B")

    cell = expr(mat, unreal.MaterialExpressionFrac, -500, -100)
    connect(scaled, "", cell, "")

    cell_r = expr(mat, unreal.MaterialExpressionComponentMask, -350, -200)
    try_set(cell_r, "r", True, "ComponentMask")
    try_set(cell_r, "g", False, "ComponentMask")
    try_set(cell_r, "b", False, "ComponentMask")
    try_set(cell_r, "a", False, "ComponentMask")
    connect(cell, "", cell_r, "")

    cell_g = expr(mat, unreal.MaterialExpressionComponentMask, -350, -50)
    try_set(cell_g, "r", False, "ComponentMask")
    try_set(cell_g, "g", True, "ComponentMask")
    try_set(cell_g, "b", False, "ComponentMask")
    try_set(cell_g, "a", False, "ComponentMask")
    connect(cell, "", cell_g, "")

    one_minus_r = expr(mat, unreal.MaterialExpressionOneMinus, -200, -200)
    connect(cell_r, "", one_minus_r, "")
    one_minus_g = expr(mat, unreal.MaterialExpressionOneMinus, -200, -50)
    connect(cell_g, "", one_minus_g, "")

    mask_r = expr(mat, unreal.MaterialExpressionMultiply, -50, -200)
    connect(cell_r, "", mask_r, "A")
    connect(one_minus_r, "", mask_r, "B")

    mask_g = expr(mat, unreal.MaterialExpressionMultiply, -50, -50)
    connect(cell_g, "", mask_g, "A")
    connect(one_minus_g, "", mask_g, "B")

    window_shape = expr(mat, unreal.MaterialExpressionMultiply, 100, -125)
    connect(mask_r, "", window_shape, "A")
    connect(mask_g, "", window_shape, "B")

    floor_cell = expr(mat, unreal.MaterialExpressionFloor, -500, 100)
    connect(scaled, "", floor_cell, "")

    hash_const = const_vec2(mat, 12.9898, 78.233, -500, 220)
    dotp = expr(mat, unreal.MaterialExpressionDotProduct, -350, 150)
    connect(floor_cell, "", dotp, "A")
    connect(hash_const, "", dotp, "B")

    sinus = expr(mat, unreal.MaterialExpressionSine, -200, 150)
    connect(dotp, "", sinus, "")

    big_const = const_scalar(mat, 43758.5453, -200, 220)
    hash_mul = expr(mat, unreal.MaterialExpressionMultiply, -50, 180)
    connect(sinus, "", hash_mul, "A")
    connect(big_const, "", hash_mul, "B")

    rand_cell = expr(mat, unreal.MaterialExpressionFrac, 100, 180)
    connect(hash_mul, "", rand_cell, "")

    threshold = const_scalar(mat, lit_threshold, 100, 260)
    lit_col = const_color(mat, lit_color[0], lit_color[1], lit_color[2], 250, 130)
    dark_col = const_color(mat, 0.01, 0.01, 0.012, 250, 220)

    lit_if = expr(mat, unreal.MaterialExpressionIf, 400, 180)
    connect(rand_cell, "", lit_if, "A")
    connect(threshold, "", lit_if, "B")
    connect(lit_col, "", lit_if, "A > B")
    connect(lit_col, "", lit_if, "A == B")
    connect(dark_col, "", lit_if, "A < B")

    final_color = expr(mat, unreal.MaterialExpressionMultiply, 550, 30)
    connect(lit_if, "", final_color, "A")
    connect(window_shape, "", final_color, "B")

    intensity_const = const_scalar(mat, emissive_intensity, 550, 100)
    emissive = expr(mat, unreal.MaterialExpressionMultiply, 700, 60)
    connect(final_color, "", emissive, "A")
    connect(intensity_const, "", emissive, "B")
    connect_prop(emissive, "", MP.MP_EMISSIVE_COLOR)

    base = const_color(mat, base_color[0], base_color[1], base_color[2], -900, 350)
    connect_prop(base, "", MP.MP_BASE_COLOR)
    rough = const_scalar(mat, 0.75, -900, 420)
    connect_prop(rough, "", MP.MP_ROUGHNESS)

    finish_material(mat)
    return mat


# --- shared level setup --------------------------------------------------------


def set_world_settings_game_mode():
    world_settings = common.get_world_settings()
    if world_settings is None:
        raise RuntimeError("no WorldSettings actor found in the new level")
    game_mode_class = common.load_combat_game_mode_class()
    if game_mode_class is None:
        raise RuntimeError("could not load {0}".format(common.COMBAT_GAME_MODE_PATH))
    world_settings.set_editor_property("default_game_mode", game_mode_class)


def spawn_player_start():
    ps = spawn_actor(unreal.PlayerStart, common.SPAWN_LOCATION, common.SPAWN_ROTATION, label="PlayerStart_Shared")
    return ps


def spawn_ground(material, size=None):
    ground_size = size if size is not None else common.GROUND_SIZE_CM
    scale = unreal.Vector(
        ground_size / 100.0,
        ground_size / 100.0,
        common.GROUND_THICKNESS_CM / 100.0,
    )
    location = unreal.Vector(0.0, 0.0, common.GROUND_TOP_Z - common.GROUND_THICKNESS_CM / 2.0)
    return spawn_mesh(common.ENGINE_CUBE, location, unreal.Rotator(0, 0, 0), scale, material, label="Ground")


def spawn_sky_atmosphere():
    return spawn_actor(unreal.SkyAtmosphere, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0), label="SkyAtmosphere")


def spawn_sky_light(intensity):
    sky = spawn_actor(unreal.SkyLight, unreal.Vector(0, 0, 500), unreal.Rotator(0, 0, 0), label="SkyLight")
    comp = get_component(sky, unreal.SkyLightComponent)
    if comp is not None:
        try_set(comp, "real_time_capture", True, "SkyLightComponent")
        try_set(comp, "intensity", intensity, "SkyLightComponent")
    return sky


def spawn_fog(inscattering_color, density, volumetric):
    fog = spawn_actor(unreal.ExponentialHeightFog, unreal.Vector(0, 0, 200), unreal.Rotator(0, 0, 0), label="ExponentialHeightFog")
    comp = get_component(fog, unreal.ExponentialHeightFogComponent)
    if comp is not None:
        try_set(comp, "fog_density", density, "FogComponent")
        try_set(
            comp,
            "fog_inscattering_luminance",
            unreal.LinearColor(inscattering_color[0], inscattering_color[1], inscattering_color[2], 1.0),
            "FogComponent",
        )
        try_set(comp, "enable_volumetric_fog", volumetric, "FogComponent")
    return fog


def spawn_post_process(bloom_intensity, bloom_threshold, white_temp, vignette, contrast, exposure_bias=0.0):
    ppv = spawn_actor(unreal.PostProcessVolume, unreal.Vector(0, 0, 300), unreal.Rotator(0, 0, 0), label="PostProcessVolume")
    try_set(ppv, "unbound", True, "PostProcessVolume")
    settings = ppv.get_editor_property("settings")
    try_set(settings, "bloom_intensity", bloom_intensity, "PostProcessSettings")
    try_set(settings, "bloom_threshold", bloom_threshold, "PostProcessSettings")
    try_set(settings, "white_temp", white_temp, "PostProcessSettings")
    try_set(settings, "vignette_intensity", vignette, "PostProcessSettings")
    try_set(settings, "color_contrast", unreal.Vector4(contrast, contrast, contrast, 1.0), "PostProcessSettings")
    # Auto exposure normalizes on the scene average; a bright sky filling
    # most of the frame otherwise drags the whole image toward middle grey
    # and washes out darker elements like the mountain. A negative bias
    # holds the image moodier without switching to a blind manual exposure.
    try_set(settings, "auto_exposure_bias", exposure_bias, "PostProcessSettings")
    ppv.set_editor_property("settings", settings)
    return ppv


# --- Day Dream -----------------------------------------------------------------


def build_track_day(material):
    # A rutted cart track of darker earth running along +X from the open
    # square at spawn out through the village.
    segments = 7
    x0, x1 = 300.0, 9200.0
    step = (x1 - x0) / segments
    rng = random.Random(common.RANDOM_SEED)
    actors = []
    for i in range(segments):
        cx = x0 + step * (i + 0.5)
        width = 420.0 + rng.uniform(-40.0, 60.0)
        yaw_jitter = rng.uniform(-3.0, 3.0)
        y_jitter = rng.uniform(-60.0, 60.0)
        length = step * 1.15
        scale = unreal.Vector(length / 100.0, width / 100.0, 4.0 / 100.0)
        location = unreal.Vector(cx, y_jitter, common.GROUND_TOP_Z + 2.0)
        rotation = unreal.Rotator(0, 0, yaw_jitter)
        actors.append(spawn_mesh(common.ENGINE_CUBE, location, rotation, scale, material, label="Track_{0}".format(i)))
    return actors


def build_wall_segment(cx, cy, length, thickness, height, yaw, material, z_base, label):
    scale = unreal.Vector(length / 100.0, thickness / 100.0, height / 100.0)
    location = unreal.Vector(cx, cy, z_base + height / 2.0)
    rotation = unreal.Rotator(0, 0, yaw)
    return spawn_mesh(common.ENGINE_CUBE, location, rotation, scale, material, label=label)


def build_cottage(origin_x, origin_y, yaw_deg, has_roof, ruin_level, material, roof_material, rng, tag):
    """One cottage footprint ~5m x 4m, walls ~4m to the eaves. yaw_deg
    rotates the whole footprint around its origin. ruin_level (0..2) lowers
    some wall heights for the roofless cottages."""
    width = 500.0
    depth = 400.0
    thickness = 25.0
    eave_height = 380.0
    door_gap = 130.0
    z_base = common.GROUND_TOP_Z

    yaw_rad = math.radians(yaw_deg)
    cos_y, sin_y = math.cos(yaw_rad), math.sin(yaw_rad)

    def to_world(local_x, local_y):
        wx = origin_x + local_x * cos_y - local_y * sin_y
        wy = origin_y + local_x * sin_y + local_y * cos_y
        return wx, wy

    actors = []

    def wall(local_cx, local_cy, length, wall_yaw_local, height_scale, label):
        wx, wy = to_world(local_cx, local_cy)
        height = eave_height * height_scale
        actors.append(
            build_wall_segment(wx, wy, length, thickness, height, yaw_deg + wall_yaw_local, material, z_base, "{0}_{1}".format(tag, label))
        )

    front_seg_len = (width - door_gap) / 2.0
    left_ruin = 1.0 if ruin_level < 1 else rng.uniform(0.35, 0.7)
    right_ruin = 1.0 if ruin_level < 2 else rng.uniform(0.3, 0.6)

    wall(-(door_gap / 2.0 + front_seg_len / 2.0), -depth / 2.0, front_seg_len, 0.0, 1.0, "front_left")
    wall((door_gap / 2.0 + front_seg_len / 2.0), -depth / 2.0, front_seg_len, 0.0, left_ruin, "front_right")
    wall(0.0, depth / 2.0, width, 0.0, right_ruin, "back")
    wall(-width / 2.0, 0.0, depth, 90.0, 1.0 if ruin_level < 2 else rng.uniform(0.4, 0.8), "left")
    wall(width / 2.0, 0.0, depth, 90.0, 1.0, "right")

    if has_roof:
        roof_length = depth + 60.0
        pitch = 28.0
        half_width = width / 2.0 + 40.0
        for side, sign in (("roof_left", -1.0), ("roof_right", 1.0)):
            local_x = sign * half_width / 2.0
            local_z = eave_height + (half_width / 2.0) * math.tan(math.radians(pitch)) / 2.0
            wx, wy = to_world(local_x, 0.0)
            scale = unreal.Vector(roof_length / 100.0, (half_width / math.cos(math.radians(pitch))) / 100.0, 12.0 / 100.0)
            # The panel's long axis (scale.x = roof_length) must run along the
            # building's DEPTH axis (the ridge), the same way the side walls
            # get their length onto the depth axis: yaw_deg + 90. Roll then
            # tilts the panel's width (ridge-to-eave span) up/down around
            # that ridge line. Using yaw_deg alone here (an earlier bug) put
            # the ridge parallel to the front wall instead, producing a
            # single flat lean-to panel rather than a gable.
            rotation = unreal.Rotator(sign * pitch, 0.0, yaw_deg + 90.0)
            location = unreal.Vector(wx, wy, z_base + local_z)
            actors.append(spawn_mesh(common.ENGINE_CUBE, location, rotation, scale, roof_material, label="{0}_{1}".format(tag, side)))

    return actors


def build_dry_stone_wall(start_x, start_y, end_x, end_y, count, material, rng, tag):
    actors = []
    for i in range(count):
        t = i / float(max(count - 1, 1))
        if rng.random() < 0.15:
            continue  # a broken gap in the wall
        cx = start_x + (end_x - start_x) * t + rng.uniform(-15.0, 15.0)
        cy = start_y + (end_y - start_y) * t + rng.uniform(-15.0, 15.0)
        base_yaw = math.degrees(math.atan2(end_y - start_y, end_x - start_x))
        stone_len = rng.uniform(30.0, 55.0)
        stone_wid = rng.uniform(18.0, 28.0)
        stone_height = rng.uniform(20.0, 45.0)
        jitter_yaw = rng.uniform(-18.0, 18.0)
        jitter_roll = rng.uniform(-8.0, 8.0)
        scale = unreal.Vector(stone_len / 100.0, stone_wid / 100.0, stone_height / 100.0)
        location = unreal.Vector(cx, cy, common.GROUND_TOP_Z + stone_height / 2.0 - rng.uniform(0.0, 6.0))
        rotation = unreal.Rotator(jitter_roll, 0.0, base_yaw + jitter_yaw)
        actors.append(spawn_mesh(common.ENGINE_CUBE, location, rotation, scale, material, label="{0}_{1}".format(tag, i)))
    return actors


def build_tree(cx, cy, rng, material, tag):
    actors = []
    trunk_height = rng.uniform(260.0, 420.0)
    trunk_radius = rng.uniform(10.0, 16.0)
    trunk_scale = unreal.Vector(trunk_radius * 2.0 / 100.0, trunk_radius * 2.0 / 100.0, trunk_height / 100.0)
    trunk_location = unreal.Vector(cx, cy, common.GROUND_TOP_Z + trunk_height / 2.0)
    actors.append(
        spawn_mesh(common.ENGINE_CYLINDER, trunk_location, unreal.Rotator(0, 0, rng.uniform(0, 360)), trunk_scale, material, label="{0}_trunk".format(tag))
    )

    branch_count = rng.randint(3, 5)
    for b in range(branch_count):
        branch_len = rng.uniform(90.0, 160.0)
        branch_radius = rng.uniform(3.0, 6.0)
        yaw = rng.uniform(0.0, 360.0)
        pitch = rng.uniform(35.0, 65.0)
        attach_height = trunk_height * rng.uniform(0.6, 0.95)
        yaw_rad = math.radians(yaw)
        offset = branch_len * 0.5
        bx = cx + math.cos(yaw_rad) * offset * math.cos(math.radians(pitch))
        by = cy + math.sin(yaw_rad) * offset * math.cos(math.radians(pitch))
        bz = common.GROUND_TOP_Z + attach_height + offset * math.sin(math.radians(pitch))
        scale = unreal.Vector(branch_radius * 2.0 / 100.0, branch_radius * 2.0 / 100.0, branch_len / 100.0)
        rotation = unreal.Rotator(0.0, pitch, yaw)
        actors.append(
            spawn_mesh(common.ENGINE_CYLINDER, unreal.Vector(bx, by, bz), rotation, scale, material, label="{0}_branch_{1}".format(tag, b))
        )
    return actors


def build_mountain(material):
    radius = 6000.0
    height = 9000.0
    scale = unreal.Vector(radius * 2.0 / 100.0, radius * 2.0 / 100.0, height / 100.0)
    location = unreal.Vector(16000.0, 400.0, common.GROUND_TOP_Z + height / 2.0)
    return spawn_mesh(common.ENGINE_CONE, location, unreal.Rotator(0, 0, 0), scale, material, label="Mountain")


def build_day_map():
    level_subsystem = common.get_level_subsystem()
    ok = level_subsystem.new_level(common.DAY_MAP_PATH)
    if not ok:
        raise RuntimeError("new_level failed for {0}".format(common.DAY_MAP_PATH))

    actor_subsystem = common.get_actor_subsystem()

    ground_mat = create_simple_material("M_Ground_Day", (0.18, 0.13, 0.08), 0.92)
    track_mat = create_simple_material("M_Track_Day", (0.09, 0.065, 0.045), 0.95)
    wall_mat = create_simple_material("M_Stone_Day", (0.28, 0.26, 0.23), 0.85)
    roof_mat = create_simple_material("M_Roof_Day", (0.16, 0.1, 0.08), 0.8)
    tree_mat = create_simple_material("M_Tree_Day", (0.12, 0.08, 0.05), 0.9)
    # Near-black with a faint cool tint: ExponentialHeightFog opacity at the
    # mountain's ~160m distance was the real culprit for it staying pale
    # through the first two rounds (opacity = 1-exp(-density*distance), so
    # even "low" density values were replacing most of its colour with fog
    # haze regardless of material) - see the much lower fog_density below.
    mountain_mat = create_simple_material("M_Mountain_Day", (0.012, 0.011, 0.016), 0.95)

    spawn_ground(ground_mat)
    build_track_day(track_mat)

    rng = random.Random(common.RANDOM_SEED)
    cottage_layout = [
        (1600.0, 900.0, -20.0, True, 0, "Cottage_Intact"),
        (2600.0, -1300.0, 35.0, False, 1, "Cottage_Roofless_A"),
        (4200.0, 1500.0, -60.0, False, 2, "Cottage_Roofless_B"),
        (5400.0, -700.0, 15.0, False, 1, "Cottage_Roofless_C"),
    ]
    for origin_x, origin_y, yaw, has_roof, ruin_level, tag in cottage_layout:
        build_cottage(origin_x, origin_y, yaw, has_roof, ruin_level, wall_mat, roof_mat, rng, tag)

    build_dry_stone_wall(900.0, 1700.0, 3600.0, 2600.0, 42, wall_mat, rng, "WallRun_North")
    build_dry_stone_wall(1200.0, -1900.0, 5200.0, -2400.0, 42, wall_mat, rng, "WallRun_South")

    tree_positions = [
        (900.0, 2400.0), (2200.0, 2900.0), (3600.0, -2600.0),
        (5100.0, 2200.0), (6400.0, -1600.0),
    ]
    for i, (tx, ty) in enumerate(tree_positions):
        build_tree(tx, ty, rng, tree_mat, "Tree_{0}".format(i))

    build_mountain(mountain_mat)

    # Sun: pitched 6-10 degrees above the horizon (Pitch -6..-10, forward
    # vector pointing toward -X so the sun sits over the mountain at +X),
    # warm orange colour.
    sun = spawn_actor(unreal.DirectionalLight, unreal.Vector(0, 0, 1000), unreal.Rotator(0.0, -8.0, 180.0), label="Sun")
    sun_comp = get_component(sun, unreal.DirectionalLightComponent)
    if sun_comp is not None:
        try_set(sun_comp, "intensity", 14.0, "DirectionalLightComponent")
        try_set(sun_comp, "light_color", unreal.Color(255, 140, 60, 255), "DirectionalLightComponent")
        try_set(sun_comp, "atmosphere_sun_light", True, "DirectionalLightComponent")

    spawn_sky_atmosphere()
    # A lower SkyLight keeps the ambient fill from flattening every surface
    # to the same brightness, so the sunlit faces read against real shadow.
    spawn_sky_light(0.15)
    spawn_actor(unreal.VolumetricCloud, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0), label="VolumetricCloud")
    # ExponentialHeightFog opacity is 1-exp(-density*distance); at the
    # mountain's ~160m distance, density 0.013 (round 2) was already ~87%
    # opaque, so the fog's own inscattering colour - not the material - was
    # what the camera mostly saw. 0.0025 gives roughly 35% opacity there: a
    # little atmospheric depth without erasing the silhouette.
    spawn_fog((0.5, 0.32, 0.2), 0.0025, True)
    spawn_post_process(0.3, 2.2, 6800.0, 0.35, 1.15, exposure_bias=-0.6)

    spawn_player_start()
    set_world_settings_game_mode()

    level_subsystem.save_current_level()
    unreal.EditorAssetLibrary.save_asset(common.DAY_MAP_PATH)


# --- Night Dream ---------------------------------------------------------------

# Round 1 packed towers on an 1800-unit grid with footprints up to 1700,
# leaving as little as ~100-200 units of gap between neighbours and between
# the two rows flanking the street - effectively a solid, near-continuous
# wall of emissive surface on every side. That trapped light regardless of
# how far the per-material emissive intensity or bloom were turned down,
# which is why round 1's fix (dimmer windows, less bloom, night sky) barely
# changed the screenshot. Round 2 fixes the actual layout: wider spacing,
# smaller footprints (real gaps between towers) and an explicit, much wider
# street margin at the centre.
NIGHT_COL_SPACING = 3000.0
NIGHT_ROW_SPACING = 3000.0
NIGHT_STREET_HALF_WIDTH = 1700.0
NIGHT_FOOTPRINT_MIN = 900.0
NIGHT_FOOTPRINT_MAX = 1500.0


def build_towers(materials, rng):
    actors = []
    cols = range(1, 9)  # 8 columns
    row_indices = list(range(-4, 0)) + list(range(1, 5))  # 8 rows either side of the street
    for ci, col in enumerate(cols):
        for row in row_indices:
            x = col * NIGHT_COL_SPACING
            sign = 1.0 if row > 0 else -1.0
            depth_index = abs(row) - 1  # 0 = the row nearest the street
            y = sign * (NIGHT_STREET_HALF_WIDTH + depth_index * NIGHT_ROW_SPACING)
            height = rng.uniform(4000.0, 20000.0)
            footprint = rng.uniform(NIGHT_FOOTPRINT_MIN, NIGHT_FOOTPRINT_MAX)
            scale = unreal.Vector(footprint / 100.0, footprint / 100.0, height / 100.0)
            location = unreal.Vector(x, y, common.GROUND_TOP_Z + height / 2.0)
            material = materials[(ci + row) % len(materials)]
            actors.append(
                spawn_mesh(common.ENGINE_CUBE, location, unreal.Rotator(0, 0, rng.uniform(-2.0, 2.0)), scale, material, label="Tower_{0}_{1}".format(col, row))
            )
    return actors


def build_sign_strips(magenta_mat, cyan_mat, rng):
    actors = []
    xs = [3000.0, 3000.0, 6000.0, 6000.0, 9000.0, 9000.0, 12000.0, 12000.0]
    zs = [1200.0, 1600.0, 2200.0, 1400.0, 1800.0, 2600.0, 1500.0, 2100.0]
    for i, (x, z) in enumerate(zip(xs, zs)):
        y_sign = -1.0 if i % 2 == 0 else 1.0
        material = magenta_mat if i % 2 == 0 else cyan_mat
        scale = unreal.Vector(4.0 / 100.0, 260.0 / 100.0, 40.0 / 100.0)
        # Hang the strip just off the first row of towers, facing the street.
        location = unreal.Vector(x, y_sign * (NIGHT_STREET_HALF_WIDTH - 60.0), common.GROUND_TOP_Z + z)
        actors.append(
            spawn_mesh(common.ENGINE_CUBE, location, unreal.Rotator(0, 0, 0), scale, material, label="Sign_{0}".format(i))
        )
    return actors


def build_street_lamps(post_material, rng):
    mesh_actors = []
    light_actors = []
    xs = [700.0 + i * 900.0 for i in range(9)]
    lamp_y = NIGHT_STREET_HALF_WIDTH - 200.0
    for i, x in enumerate(xs):
        for side, y in (("l", -lamp_y), ("r", lamp_y)):
            post_height = 380.0
            post_scale = unreal.Vector(14.0 / 100.0, 14.0 / 100.0, post_height / 100.0)
            post_location = unreal.Vector(x, y, common.GROUND_TOP_Z + post_height / 2.0)
            mesh_actors.append(
                spawn_mesh(common.ENGINE_CYLINDER, post_location, unreal.Rotator(0, 0, 0), post_scale, post_material, label="Lamp_{0}{1}_post".format(i, side))
            )
            light = spawn_actor(unreal.PointLight, unreal.Vector(x, y, common.GROUND_TOP_Z + post_height + 15.0), unreal.Rotator(0, 0, 0), label="Lamp_{0}{1}_light".format(i, side))
            comp = get_component(light, unreal.PointLightComponent)
            if comp is not None:
                try_set(comp, "intensity", 4000.0, "PointLightComponent")
                try_set(comp, "attenuation_radius", 900.0, "PointLightComponent")
                try_set(comp, "light_color", unreal.Color(255, 196, 130, 255), "PointLightComponent")
            light_actors.append(light)
            if len(mesh_actors) >= 16:
                return mesh_actors, light_actors
    return mesh_actors, light_actors


def build_night_map():
    level_subsystem = common.get_level_subsystem()
    ok = level_subsystem.new_level(common.NIGHT_MAP_PATH)
    if not ok:
        raise RuntimeError("new_level failed for {0}".format(common.NIGHT_MAP_PATH))

    actor_subsystem = common.get_actor_subsystem()

    street_mat = create_simple_material("M_Street_Night", (0.02, 0.021, 0.024), 0.2)
    tower_warm = create_tower_window_material("M_Tower_Warm", 3.0, 14.0, 0.55, (1.0, 0.72, 0.35), 9.0, (0.02, 0.02, 0.024))
    tower_cool = create_tower_window_material("M_Tower_Cool", 4.0, 18.0, 0.6, (0.55, 0.75, 1.0), 7.5, (0.018, 0.019, 0.024))
    tower_sparse = create_tower_window_material("M_Tower_Sparse", 3.5, 16.0, 0.82, (1.0, 0.85, 0.55), 10.0, (0.015, 0.015, 0.018))
    sign_magenta = create_simple_material("M_Sign_Magenta", (0.02, 0.02, 0.02), 0.5, emissive_color=(1.0, 0.05, 0.75), emissive_intensity=40.0)
    sign_cyan = create_simple_material("M_Sign_Cyan", (0.02, 0.02, 0.02), 0.5, emissive_color=(0.05, 0.9, 1.0), emissive_intensity=40.0)
    lamp_post_mat = create_simple_material("M_LampPost_Night", (0.03, 0.03, 0.032), 0.4)

    # The tower grid (8 columns at 3000-unit spacing) now reaches x=24000;
    # the 20000-unit default ground would leave the far towers floating
    # past its edge, so Night gets a larger ground plane.
    spawn_ground(street_mat, size=60000.0)

    rng = random.Random(common.RANDOM_SEED)
    build_towers([tower_warm, tower_cool, tower_sparse], rng)
    build_sign_strips(sign_magenta, sign_cyan, rng)
    build_street_lamps(lamp_post_mat, rng)

    # Moon: dim, cool blue directional light. Pitch is POSITIVE here (light
    # shining upward => the sun/moon disc sits below the horizon), which is
    # what tells SkyAtmosphere to render genuine night-time scattering
    # instead of a dim daytime sky. Round 1 used -55 (sun high above the
    # horizon, just dim) and SkyAtmosphere rendered a bright pale-blue
    # "daytime" sky regardless of the low intensity, which combined with
    # aggressive bloom (1.4 @ threshold 0.9) and a real-time-captured
    # SkyLight feeding that brightness back as ambient, blew out the whole
    # frame to near white.
    moon = spawn_actor(unreal.DirectionalLight, unreal.Vector(0, 0, 1000), unreal.Rotator(0.0, 12.0, 210.0), label="Moon")
    moon_comp = get_component(moon, unreal.DirectionalLightComponent)
    if moon_comp is not None:
        try_set(moon_comp, "intensity", 0.4, "DirectionalLightComponent")
        try_set(moon_comp, "light_color", unreal.Color(150, 175, 235, 255), "DirectionalLightComponent")
        try_set(moon_comp, "atmosphere_sun_light", True, "DirectionalLightComponent")

    spawn_sky_atmosphere()
    spawn_sky_light(0.03)
    spawn_fog((0.02, 0.03, 0.055), 0.02, True)
    # A touch less bloom than round 2 so the window pattern reads crisper
    # rather than a soft uniform glow.
    spawn_post_process(0.08, 3.5, 7500.0, 0.45, 1.1, exposure_bias=-1.5)

    spawn_player_start()
    set_world_settings_game_mode()

    level_subsystem.save_current_level()
    unreal.EditorAssetLibrary.save_asset(common.NIGHT_MAP_PATH)


# --- main -----------------------------------------------------------------------


def clean_dream_folder():
    level_subsystem = common.get_level_subsystem()
    # Park on a map outside /Game/Dream so that folder is never the current
    # level while it is being deleted and rebuilt.
    level_subsystem.load_level(common.PARKING_MAP_PATH)
    if unreal.EditorAssetLibrary.does_directory_exist(common.DREAM_ROOT):
        unreal.EditorAssetLibrary.delete_directory(common.DREAM_ROOT)


def main():
    unreal.log("DREAM-BUILD: starting")
    clean_dream_folder()
    build_day_map()
    unreal.log("DREAM-BUILD: Day Dream map built")
    build_night_map()
    unreal.log("DREAM-BUILD: Night Dream map built")
    unreal.log("DREAM-BUILD-RESULT: OK")


if __name__ == "__main__":
    try:
        main()
        exit_code = 0
    except Exception:
        traceback.print_exc()
        unreal.log_error("DREAM-BUILD-RESULT: FAIL (unhandled exception, see traceback above)")
        exit_code = 1

    if RUNNING_AS_FULL_EDITOR_FALLBACK:
        unreal.SystemLibrary.quit_editor()
    else:
        sys.exit(exit_code)
