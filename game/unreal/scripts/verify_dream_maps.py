"""verify_dream_maps.py

Runs inside the Unreal Editor's embedded Python (see Build-DreamMaps.ps1).
Loads /Game/Dream/Maps/Lvl_DayDream and /Game/Dream/Maps/Lvl_NightDream in
turn and asserts the checks from the 002B card. Writes the full result list
to C:\\DREAM\\recon\\002B-verify.json and exits non-zero if any check failed.

Usage (commandlet form):
  UnrealEditor-Cmd.exe "<uproject>" -run=pythonscript -script="verify_dream_maps.py" -unattended -nopause -nosplash -nullrhi

Usage (full editor fallback form):
  UnrealEditor.exe "<uproject>" -ExecutePythonScript="verify_dream_maps.py" -unattended -nosplash
(the full-editor fallback form is only used if the commandlet form cannot
create/save levels; see build_dream_maps.py for the same fallback note.)
"""

import json
import math
import os
import sys
import traceback

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import unreal  # noqa: E402

import dream_maps_common as common  # noqa: E402

RESULT_PATH = r"C:\DREAM\recon\002B-verify.json"

LOCATION_TOLERANCE = 5.0
ROTATION_TOLERANCE = 0.5
DAY_PITCH_MIN = -15.0
DAY_PITCH_MAX = -3.0
MIN_STATIC_MESH_ACTORS = 60
MIN_NIGHT_POINT_OR_SPOT_LIGHTS = 6

checks = []


def record(map_name, name, passed, detail=""):
    checks.append(
        {
            "map": map_name,
            "name": name,
            "pass": bool(passed),
            "detail": detail,
        }
    )
    tag = "PASS" if passed else "FAIL"
    line = "DREAM-VERIFY-CHECK [{0}] {1}: {2}".format(tag, map_name, name)
    if detail:
        line += " -- {0}".format(detail)
    unreal.log(line)


def vector_close(a, b, tol):
    dist = math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
    return dist <= tol


def rotator_close(a, b, tol):
    return (
        abs(a.roll - b.roll) <= tol
        and abs(a.pitch - b.pitch) <= tol
        and abs(a.yaw - b.yaw) <= tol
    )


def verify_map(map_name, map_path, is_day):
    if not unreal.EditorAssetLibrary.does_asset_exist(map_path):
        record(map_name, "map asset exists", False, "no asset at {0}".format(map_path))
        # The rest of the checks are meaningless without the map; record them
        # as failed too so the total/failed counts stay stable across runs.
        for name in (
            "exactly one PlayerStart at the shared location",
            "has at least one DirectionalLight",
            "has at least one SkyLight",
            "has at least one ExponentialHeightFog",
            "has at least one PostProcessVolume",
            "has at least {0} StaticMeshActors".format(MIN_STATIC_MESH_ACTORS),
            "game mode override is the Combat game mode",
        ):
            record(map_name, name, False, "map does not exist")
        if is_day:
            record(map_name, "DirectionalLight pitch between -15 and -3 degrees", False, "map does not exist")
            record(map_name, "no PointLight/SpotLight present", False, "map does not exist")
        else:
            record(
                map_name,
                "at least {0} PointLights/SpotLights".format(MIN_NIGHT_POINT_OR_SPOT_LIGHTS),
                False,
                "map does not exist",
            )
            record(map_name, "a /Game/Dream/Materials material has emissive connected", False, "map does not exist")
        return

    record(map_name, "map asset exists", True)

    level_subsystem = common.get_level_subsystem()
    loaded = level_subsystem.load_level(map_path)
    if not loaded:
        record(map_name, "map loads", False, "load_level returned False for {0}".format(map_path))
        return

    actor_subsystem = common.get_actor_subsystem()
    all_actors = actor_subsystem.get_all_level_actors()

    player_starts = [a for a in all_actors if isinstance(a, unreal.PlayerStart)]
    if len(player_starts) == 1:
        ps = player_starts[0]
        loc_ok = vector_close(ps.get_actor_location(), common.SPAWN_LOCATION, LOCATION_TOLERANCE)
        rot_ok = rotator_close(ps.get_actor_rotation(), common.SPAWN_ROTATION, ROTATION_TOLERANCE)
        detail = "location={0} rotation={1}".format(ps.get_actor_location(), ps.get_actor_rotation())
        record(map_name, "exactly one PlayerStart at the shared location", loc_ok and rot_ok, detail)
    else:
        record(
            map_name,
            "exactly one PlayerStart at the shared location",
            False,
            "found {0} PlayerStart actors".format(len(player_starts)),
        )

    directional_lights = [a for a in all_actors if isinstance(a, unreal.DirectionalLight)]
    record(map_name, "has at least one DirectionalLight", len(directional_lights) >= 1, "count={0}".format(len(directional_lights)))

    sky_lights = [a for a in all_actors if isinstance(a, unreal.SkyLight)]
    record(map_name, "has at least one SkyLight", len(sky_lights) >= 1, "count={0}".format(len(sky_lights)))

    fogs = [a for a in all_actors if isinstance(a, unreal.ExponentialHeightFog)]
    record(map_name, "has at least one ExponentialHeightFog", len(fogs) >= 1, "count={0}".format(len(fogs)))

    ppvs = [a for a in all_actors if isinstance(a, unreal.PostProcessVolume)]
    record(map_name, "has at least one PostProcessVolume", len(ppvs) >= 1, "count={0}".format(len(ppvs)))

    static_mesh_actors = [a for a in all_actors if isinstance(a, unreal.StaticMeshActor)]
    record(
        map_name,
        "has at least {0} StaticMeshActors".format(MIN_STATIC_MESH_ACTORS),
        len(static_mesh_actors) >= MIN_STATIC_MESH_ACTORS,
        "count={0}".format(len(static_mesh_actors)),
    )

    world_settings = common.get_world_settings()
    game_mode_ok = False
    game_mode_detail = "no WorldSettings actor found"
    if world_settings is not None:
        # AWorldSettings exposes this as DefaultGameMode (DisplayName "GameMode Override").
        override_class = world_settings.get_editor_property("default_game_mode")
        expected_class = common.load_combat_game_mode_class()
        game_mode_ok = override_class is not None and expected_class is not None and override_class == expected_class
        game_mode_detail = "override={0} expected={1}".format(override_class, expected_class)
    record(map_name, "game mode override is the Combat game mode", game_mode_ok, game_mode_detail)

    point_or_spot_lights = [a for a in all_actors if isinstance(a, (unreal.PointLight, unreal.SpotLight))]

    if is_day:
        if directional_lights:
            pitch = directional_lights[0].get_actor_rotation().pitch
            pitch_ok = DAY_PITCH_MIN <= pitch <= DAY_PITCH_MAX
            record(
                map_name,
                "DirectionalLight pitch between -15 and -3 degrees",
                pitch_ok,
                "pitch={0}".format(pitch),
            )
        else:
            record(map_name, "DirectionalLight pitch between -15 and -3 degrees", False, "no DirectionalLight found")

        record(
            map_name,
            "no PointLight/SpotLight present",
            len(point_or_spot_lights) == 0,
            "count={0}".format(len(point_or_spot_lights)),
        )
    else:
        record(
            map_name,
            "at least {0} PointLights/SpotLights".format(MIN_NIGHT_POINT_OR_SPOT_LIGHTS),
            len(point_or_spot_lights) >= MIN_NIGHT_POINT_OR_SPOT_LIGHTS,
            "count={0}".format(len(point_or_spot_lights)),
        )

        emissive_material_found = False
        material_detail = "no material assets found under {0}".format(common.MATERIALS_PATH)
        if unreal.EditorAssetLibrary.does_directory_exist(common.MATERIALS_PATH):
            asset_paths = unreal.EditorAssetLibrary.list_assets(common.MATERIALS_PATH, recursive=True, include_folder=False)
            checked_names = []
            for asset_path in asset_paths:
                asset = unreal.EditorAssetLibrary.load_asset(asset_path)
                if isinstance(asset, unreal.Material):
                    # UMaterial's classic FColorMaterialInput fields are not
                    # reflected to Python in this engine build; the sanctioned
                    # way to ask "what feeds this top-level property" is
                    # MaterialEditingLibrary.get_material_property_input_node.
                    connected_node = unreal.MaterialEditingLibrary.get_material_property_input_node(
                        asset, unreal.MaterialProperty.MP_EMISSIVE_COLOR
                    )
                    connected = connected_node is not None
                    checked_names.append("{0}={1}".format(asset_path, connected))
                    if connected:
                        emissive_material_found = True
            material_detail = "; ".join(checked_names) if checked_names else material_detail
        record(
            map_name,
            "a /Game/Dream/Materials material has emissive connected",
            emissive_material_found,
            material_detail,
        )


def main():
    try:
        common.get_level_subsystem().load_level(common.PARKING_MAP_PATH)
    except Exception:
        unreal.log_warning("Could not park on {0} before verifying; continuing anyway.".format(common.PARKING_MAP_PATH))

    verify_map("day", common.DAY_MAP_PATH, is_day=True)
    verify_map("night", common.NIGHT_MAP_PATH, is_day=False)

    total = len(checks)
    failed = [c for c in checks if not c["pass"]]
    passed_count = total - len(failed)

    result = {
        "total": total,
        "passed": passed_count,
        "failed": len(failed),
        "checks": checks,
    }

    result_dir = os.path.dirname(RESULT_PATH)
    if not os.path.isdir(result_dir):
        os.makedirs(result_dir)
    with open(RESULT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    unreal.log("DREAM-VERIFY-RESULT: {0} passed={1} failed={2} total={3}".format(
        "PASS" if not failed else "FAIL", passed_count, len(failed), total
    ))
    for c in failed:
        unreal.log_error("DREAM-VERIFY-FAILURE [{0}] {1}: {2}".format(c["map"], c["name"], c["detail"]))

    return len(failed)


if __name__ == "__main__":
    try:
        failed_count = main()
    except Exception:
        traceback.print_exc()
        unreal.log_error("DREAM-VERIFY-RESULT: FAIL (unhandled exception, see traceback above)")
        try:
            with open(RESULT_PATH, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "total": len(checks) + 1,
                        "passed": len(checks) - len([c for c in checks if not c["pass"]]),
                        "failed": len([c for c in checks if not c["pass"]]) + 1,
                        "checks": checks + [{"map": "n/a", "name": "script ran without exception", "pass": False, "detail": traceback.format_exc()}],
                    },
                    f,
                    indent=2,
                )
        except Exception:
            pass
        sys.exit(1)
    sys.exit(1 if failed_count else 0)
