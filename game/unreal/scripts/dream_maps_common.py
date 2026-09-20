"""Shared constants for the Day Dream / Night Dream blockout maps.

build_dream_maps.py and verify_dream_maps.py both import this module so the
map paths, the shared spawn transform and the game mode path can never drift
apart between the two scripts. Nothing in here touches the engine at import
time; it is safe to import from either a build or a read-only verify pass.
"""

import unreal

# --- Asset paths -----------------------------------------------------------

DAY_MAP_PATH = "/Game/Dream/Maps/Lvl_DayDream"
NIGHT_MAP_PATH = "/Game/Dream/Maps/Lvl_NightDream"
DREAM_ROOT = "/Game/Dream"
MATERIALS_PATH = "/Game/Dream/Materials"

# A map guaranteed to already exist in this project, used as a parking spot
# so the Day/Night maps and the /Game/Dream/Materials folder are never the
# currently-loaded level while the build script deletes and recreates them.
PARKING_MAP_PATH = "/Game/Variant_Combat/Lvl_Combat"

COMBAT_GAME_MODE_PATH = "/Game/Variant_Combat/Blueprints/BP_CombatGameMode.BP_CombatGameMode_C"

# --- Shared spawn transform --------------------------------------------------
# Same location and rotation on both maps: on the ground, in the open,
# facing +X (the village track / the street run out along +X from here).

SPAWN_LOCATION = unreal.Vector(0.0, 0.0, 110.0)
SPAWN_ROTATION = unreal.Rotator(roll=0.0, pitch=0.0, yaw=0.0)

# --- Shared ground geometry ---------------------------------------------------

GROUND_SIZE_CM = 20000.0  # 200m square footprint, shared by both maps.
GROUND_THICKNESS_CM = 200.0
GROUND_TOP_Z = 0.0  # top surface of the ground slab sits at world Z = 0.

# Fixed seed so both the build and any future re-run place jittered debris
# (dry-stone wall cubes, tower heights) identically.
RANDOM_SEED = 20260920

ENGINE_CUBE = "/Engine/BasicShapes/Cube.Cube"
ENGINE_SPHERE = "/Engine/BasicShapes/Sphere.Sphere"
ENGINE_CYLINDER = "/Engine/BasicShapes/Cylinder.Cylinder"
ENGINE_CONE = "/Engine/BasicShapes/Cone.Cone"
ENGINE_PLANE = "/Engine/BasicShapes/Plane.Plane"


def get_level_subsystem():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def get_actor_subsystem():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def get_editor_world():
    """The currently loaded editor UWorld. EditorActorSubsystem.get_all_level_actors()
    deliberately excludes the level's WorldSettings actor (confirmed empirically:
    it returns 0 actors on a freshly created empty level, then 1 once a regular
    actor is spawned), so WorldSettings has to be fetched from the World object
    itself instead."""
    try:
        return unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    except Exception:
        return unreal.EditorLevelLibrary.get_editor_world()


def get_world_settings():
    """Return the single WorldSettings actor of the currently loaded level."""
    world = get_editor_world()
    if world is None:
        return None
    return world.get_world_settings()


def find_actors_of_class(actor_class, actor_subsystem=None):
    sub = actor_subsystem or get_actor_subsystem()
    return [a for a in sub.get_all_level_actors() if isinstance(a, actor_class)]


def load_combat_game_mode_class():
    return unreal.load_class(None, COMBAT_GAME_MODE_PATH)
