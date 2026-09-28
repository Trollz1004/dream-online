extends RefCounted

# One data source per world and platform for every environment, light and
# material setting scripts/dream_env.gd applies (spec 005, FR-002 to FR-005,
# plan "Render profile, and the table of fallbacks"). Pure and static: no
# Node, no OS call, so tests/test_render_profile.gd reads both platforms'
# profiles in one headless run. dream_env.gd asks for profile(mode, web) and
# applies what comes back instead of hard-coding values behind
# OS.has_feature("web").
#
# The browser build runs Godot's Compatibility renderer over WebGL 2 (the
# single-threaded "Web" export preset), which cannot draw screen-space
# reflections, screen-space ambient occlusion, volumetric fog or real-time
# global illumination. Every look the browser cannot draw names a fallback
# below, and the web profile switches that fallback on -- the look is never
# silently dropped (FR-005).

const WORLD_DAY := "day"
const WORLD_NIGHT := "night"

# The render table's web column, as measured by exporting the browser build
# and capturing it under software WebGL 2 on 2026-09-28 (spec 005, T003),
# with a native Compatibility-renderer capture to try the reflection probe.
# true: the Compatibility renderer drew it in the captured frame. The
# reflection probe did draw, but only as a faint smear on the street at any
# roughness, too weak to read as a wet reflection, so it counts as not drawn
# and the web keeps its named fallback.
const WEB_DRAWS := {
	"key_light_shadows": true,
	"sky_gradient": true,
	"sky_cover": true,
	"depth_fog": true,
	"height_fog": true,
	"tonemap_agx": true,
	"adjustments": true,
	"glow": true,
	"material_rim": true,
	"reflection_probe": false,
	"ssao": false,
	"volumetric_fog": false,
	"ssr": false,
	# Glow does draw, but a small emitter in full daylight (an eye, an orb)
	# never gets bright enough to cross the bloom threshold, so by day it
	# read as a hard flat disc in the graded frame (judge review, PR 19).
	"daylight_glow_on_small_emitters": false,
}

# Every look the browser renderer cannot draw, per world, and what the web
# profile draws in its place (plan, render table, last column).
const WEB_FALLBACKS := {
	WORLD_DAY: {
		"ssao": "contact_darkening",
		"volumetric_fog": "haze_cards",
		"daylight_glow_on_small_emitters": "emitter_halo_billboards",
	},
	WORLD_NIGHT: {
		"ssao": "contact_darkening",
		"volumetric_fog": "light_shaft_cards",
		"ssr": "mirrored_reflection_layer",
		"reflection_probe": "mirrored_reflection_layer",
	},
}

# The profile key that switches each named fallback on.
const FALLBACK_KEYS := {
	"contact_darkening": "contact_darkening",
	"haze_cards": "haze_cards",
	"light_shaft_cards": "light_shafts",
	"mirrored_reflection_layer": "mirror_layer",
	"emitter_halo_billboards": "emitter_halos",
}


static func worlds() -> Array:
	return [WORLD_DAY, WORLD_NIGHT]


static func profile(world: String, web: bool) -> Dictionary:
	if world == WORLD_NIGHT:
		return _night(web)
	return _day(web)


# The fallbacks a profile has switched on, by name -- what the headless
# suite reads to prove nothing the browser lacks was dropped in silence.
static func active_fallbacks(p: Dictionary) -> Array:
	var names: Array = []
	for fallback_name in FALLBACK_KEYS.keys():
		if bool(p.get(FALLBACK_KEYS[fallback_name], false)):
			names.append(fallback_name)
	return names


# ---------------------------------------------------------------------------
# Day Dream: golden hour over the ruined field
# ---------------------------------------------------------------------------

static func _day(web: bool) -> Dictionary:
	var p := {
		"world": WORLD_DAY,
		"platform": "web" if web else "desktop",

		# Violet at the zenith down to a gold horizon glow around a low sun.
		# sun_angle_max/sun_curve draw the soft glow disc.
		"sky_top": Color(0.20, 0.13, 0.32),
		"sky_horizon": Color(1.0, 0.70, 0.36),
		"sky_curve": 0.13,
		"ground_bottom": Color(0.12, 0.10, 0.09),
		"ground_horizon": Color(0.55, 0.40, 0.24),
		"ground_curve": 0.15,
		"sun_angle_max": 30.0,
		"sun_curve": 0.12,
		"clouds": true,
		"cloud_lit": Color(1.0, 0.86, 0.62),
		"cloud_shade": Color(0.46, 0.34, 0.44),
		"cloud_coverage": 0.50,
		"cloud_opacity": 0.92,
		"stars": false,
		"star_count": 0,

		"ambient_energy": 0.40,
		"tonemap": Environment.TONE_MAPPER_AGX,
		"exposure": 1.0,
		"adjustment": true,
		"brightness": 1.0,
		"contrast": 1.10,
		"saturation": 1.04,

		# Dust at range and mist lying low, capped well under the camera's
		# eye height; aerial perspective blends far geometry toward the sky.
		"fog": true,
		"fog_color": Color(0.74, 0.64, 0.64),
		"fog_density": 0.0030,
		"fog_sky_affect": 0.22,
		"fog_aerial": 0.42,
		"fog_height": 1.1,
		"fog_height_density": 0.22,

		"glow": true,
		"glow_intensity": 0.7 if not web else 0.9,
		"glow_bloom": 0.06 if not web else 0.04,
		"glow_threshold": 1.0,
		"glow_strength": 1.0,

		"ssao": not web,
		"ssr": false,
		"volumetric_fog": not web,
		"volumetric_fog_density": 0.004,
		"volumetric_fog_albedo": Color(0.85, 0.78, 0.60),

		# Low and golden, yawed so long shadows cross the lane from the side.
		"key_energy": 2.2,
		"key_color": Color(1.0, 0.88, 0.70),
		"key_rotation": Vector3(-14.0, 62.0, 0.0),
		"key_shadows": true,
		"shadow_splits": 2 if web else 4,
		"shadow_max_distance": 48.0 if web else 110.0,
		"shadow_opacity": 0.82,

		# The hero's rim (FR-006): a back light on the camera rig plus the
		# material rim on the character's own materials.
		"rim_light": true,
		"rim_color": Color(1.0, 0.86, 0.64),
		"rim_energy": 1.6,
		"material_rim": 0.4,
		"material_rim_tint": 0.35,

		"halos": false,
		# Soft billboard halos on the small emitters (the Sentinel's eye,
		# the pet's eye, Mireth's orb), web only, at a daylight strength.
		"emitter_halos": web,
		"emitter_halo_strength": 0.42,
		"haze_cards": web,
		"light_shafts": false,
		"contact_darkening": web,
		"reflection_probe": false,
		"mirror_layer": false,
		"ground_detail_blend": true,
	}
	return p


# ---------------------------------------------------------------------------
# Night Dream: rain, neon and wet streets
# ---------------------------------------------------------------------------

static func _night(web: bool) -> Dictionary:
	var p := {
		"world": WORLD_NIGHT,
		"platform": "web" if web else "desktop",

		# A warm light-pollution glow low on the horizon so the skyline reads
		# as a silhouette, a star field above it and lit cloud drifting over.
		"sky_top": Color(0.022, 0.02, 0.065),
		"sky_horizon": Color(0.20, 0.14, 0.28),
		"sky_curve": 0.07,
		"ground_bottom": Color(0.01, 0.01, 0.02),
		"ground_horizon": Color(0.05, 0.05, 0.11),
		"ground_curve": 0.10,
		"sun_angle_max": 1.5,
		"sun_curve": 0.15,
		"clouds": true,
		"cloud_lit": Color(0.42, 0.26, 0.46),
		"cloud_shade": Color(0.06, 0.05, 0.10),
		"cloud_coverage": 0.58,
		"cloud_opacity": 0.85,
		"stars": true,
		"star_count": 4200,

		"ambient_energy": 0.30,
		"tonemap": Environment.TONE_MAPPER_AGX,
		"exposure": 1.75,
		"adjustment": true,
		"brightness": 0.98,
		"contrast": 1.15,
		"saturation": 0.88,

		"fog": true,
		"fog_color": Color(0.20, 0.22, 0.36),
		"fog_density": 0.0045,
		"fog_sky_affect": 0.30,
		"fog_aerial": 0.25,
		"fog_height": 1.3,
		"fog_height_density": 0.20,

		"glow": true,
		"glow_intensity": 0.82 if not web else 0.75,
		"glow_bloom": 0.08 if not web else 0.03,
		"glow_threshold": 1.0,
		"glow_strength": 1.0,

		"ssao": not web,
		"ssr": not web,
		"volumetric_fog": not web,
		"volumetric_fog_density": 0.0035,
		"volumetric_fog_albedo": Color(0.25, 0.28, 0.40),

		"key_energy": 0.45,
		"key_color": Color(0.58, 0.66, 0.90),
		"key_rotation": Vector3(-52.0, 200.0, 0.0),
		"key_shadows": true,
		"shadow_splits": 2 if web else 4,
		"shadow_max_distance": 40.0 if web else 90.0,
		"shadow_opacity": 0.75,

		"rim_light": true,
		"rim_color": Color(0.55, 0.80, 1.0),
		"rim_energy": 2.2,
		"material_rim": 0.45,
		"material_rim_tint": 0.2,

		"halos": true,
		# The same emitter halos the day web profile draws, stronger in the
		# dark, alongside the lamps' halos.
		"emitter_halos": web,
		"emitter_halo_strength": 0.6,
		"haze_cards": false,
		"light_shafts": web,
		"contact_darkening": web,
		"reflection_probe": false,
		"mirror_layer": web,
		"ground_detail_blend": false,
	}
	return p
