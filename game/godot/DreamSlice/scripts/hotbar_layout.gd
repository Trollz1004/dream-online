extends RefCounted

# Pure geometry and math for the keyboard hotbar panel
# (scripts/keyboard_panel.gd owns the actual Control tree, input and
# drawing). Kept apart so the grid math, the cooldown sweep fraction, the
# viewport clamp, the saved-layout dictionary and the binding swap can all be
# unit tested with no Control node and no window -- the same "pure function
# first" split player.gd's own _should_force_combat_pose already uses.

const KEY_SIZE := 56.0
const KEY_GAP := 10.0
const ROW_GAP := 10.0
const PANEL_MARGIN := 12.0
const GRIP_HEIGHT := 22.0
const EXTRA_ROW_HEIGHT := 56.0

# Real-keyboard stagger, in fractions of one key-plus-gap step, so the panel
# reads as part of a keyboard and not a plain grid. Row 0 is the number row;
# the numbers set the panel's width, since they are the longest row.
const ROW_OFFSETS := [0.0, 0.5, 0.75, 1.25]

const NUMBER_ROW := ["1", "2", "3", "4", "5", "6"]
const TOP_ROW := ["Q", "W", "E", "R", "T"]
const HOME_ROW := ["F"]
const BOTTOM_ROW := ["Z", "C", "N"]   # N is Nightfall's key (world.gd's own _unhandled_input)
const ROWS := [NUMBER_ROW, TOP_ROW, HOME_ROW, BOTTOM_ROW]

# Dash has no single key of its own -- Shift, a direction and any of Q E R F Z C
# or a mouse button all trigger it (docs/gdd/02-action-combat.md) -- so it and
# the two mouse-button skills read as three wider chips under the keyboard
# grid instead of stealing one of the letter keys.
const EXTRA_ORDER := ["DASH", "LMB", "RMB"]
const EXTRA_CHIP_WIDTHS := {"DASH": 104.0, "LMB": 74.0, "RMB": 74.0}


static func step() -> float:
	return KEY_SIZE + KEY_GAP


# Local position, relative to the grid's own top-left corner, of the key at
# (row, col) -- row 0 is the number row.
static func key_local_position(row: int, col: int) -> Vector2:
	var x: float = (ROW_OFFSETS[row] + float(col)) * step()
	var y: float = float(row) * (KEY_SIZE + ROW_GAP)
	return Vector2(x, y)


static func extra_row_width() -> float:
	var w := 0.0
	for i in range(EXTRA_ORDER.size()):
		w += float(EXTRA_CHIP_WIDTHS[EXTRA_ORDER[i]])
	w += KEY_GAP * float(maxi(0, EXTRA_ORDER.size() - 1))
	return w


static func grid_width() -> float:
	var max_right := 0.0
	for row in range(ROWS.size()):
		var right: float = (ROW_OFFSETS[row] + float(ROWS[row].size())) * step() - KEY_GAP
		max_right = maxf(max_right, right)
	return max_right


static func grid_height() -> float:
	return float(ROWS.size()) * (KEY_SIZE + ROW_GAP) - ROW_GAP


# The keycap grid plus the extra chip row beneath it -- everything except the
# grip bar and the panel's own margin.
static func content_size() -> Vector2:
	var w: float = maxf(grid_width(), extra_row_width())
	var h: float = grid_height() + ROW_GAP + EXTRA_ROW_HEIGHT
	return Vector2(w, h)


# The panel's full on-screen footprint, grip bar and margin included -- what
# a drag actually has to keep inside the viewport.
static func panel_total_size() -> Vector2:
	var c := content_size()
	return Vector2(c.x + PANEL_MARGIN * 2.0, c.y + PANEL_MARGIN * 2.0 + GRIP_HEIGHT)


static func clamp_position(pos: Vector2, panel_size: Vector2, viewport_size: Vector2) -> Vector2:
	var max_x: float = maxf(0.0, viewport_size.x - panel_size.x)
	var max_y: float = maxf(0.0, viewport_size.y - panel_size.y)
	return Vector2(clampf(pos.x, 0.0, max_x), clampf(pos.y, 0.0, max_y))


# 0 when a cooldown is not running or has no length at all, rising to 1 the
# instant it starts, so the radial sweep always reads "how much is left"
# rather than "how much has passed" -- a full dark disc the moment a skill
# fires, shrinking back to nothing as it becomes ready again.
static func cooldown_fraction(seconds_left: float, cooldown_total: float) -> float:
	if cooldown_total <= 0.0:
		return 0.0
	return clampf(seconds_left / cooldown_total, 0.0, 1.0)


# Reads any skill state object that exposes phase() (dash_state.gd,
# attack_state.gd, heavy_attack_state.gd, guard_state.gd, lunge_state.gd and
# burst_state.gd all do) and, where it names a numeric cooldown,
# cooldown_left(). Returns the keycap paint fields the sweep needs, with no
# Control and no player involved, so this is the one place the "how does a
# skill's cooldown become a fraction on a key" question is answered and
# tested.
static func skill_paint_spec(state, cooldown_total: float) -> Dictionary:
	var phase: String = state.phase()
	var ready_now: bool = phase == "ready"
	var fraction := 0.0
	var seconds_left := 0.0
	var show_seconds := false
	if phase == "cooling" and state.has_method("cooldown_left"):
		seconds_left = state.cooldown_left()
		fraction = cooldown_fraction(seconds_left, cooldown_total)
		show_seconds = true
	elif not ready_now:
		# Winding up, active or recovering: busy, not cooling down by the
		# clock, so there is no countdown number, but the key still reads as
		# unavailable -- a full dark sweep rather than an empty one.
		fraction = 1.0
	return {
		"fraction": fraction, "seconds_left": seconds_left,
		"show_seconds": show_seconds, "ready_now": ready_now,
	}


static func layout_to_dict(pos: Vector2) -> Dictionary:
	return {"x": pos.x, "y": pos.y}


static func position_from_dict(data: Dictionary, fallback: Vector2) -> Vector2:
	return Vector2(float(data.get("x", fallback.x)), float(data.get("y", fallback.y)))


# Swaps whichever item sits on key_a with whichever sits on key_b. Either key
# may be empty (not present in bindings at all); the missing side is erased
# rather than left holding a stale copy, so dragging a bound key onto an
# empty one moves it instead of duplicating it.
static func swap_bindings(bindings: Dictionary, key_a: String, key_b: String) -> Dictionary:
	var result: Dictionary = bindings.duplicate()
	var a = result.get(key_a, "")
	var b = result.get(key_b, "")
	if b == "":
		result.erase(key_a)
	else:
		result[key_a] = b
	if a == "":
		result.erase(key_b)
	else:
		result[key_b] = a
	return result


static func encode_bindings(b: Dictionary) -> String:
	var parts := PackedStringArray()
	var keys := b.keys()
	keys.sort()
	for k in keys:
		parts.append("%s=%s" % [k, b[k]])
	return ",".join(parts)


static func decode_bindings(s: String) -> Dictionary:
	var result := {}
	if s == "":
		return result
	for part in s.split(","):
		var kv := part.split("=")
		if kv.size() == 2:
			result[kv[0]] = kv[1]
	return result


# ---------------------------------------------------------------------------
# The play screen's layout (spec 005, FR-007, FR-008, SB-13)
# ---------------------------------------------------------------------------
# Every persistent rectangle on the play screen, worked out from the
# viewport size alone so the headless suite can prove none of them overlap
# at 1280x720 and 1920x1080 without a window: the hotbar at the bottom left,
# the health and stamina bar at the bottom centre, the prompt band just
# above that bar, the small frame-rate line at the bottom right, the target
# frame at the top left, and the space the browser build's real-slice label
# (.github/scripts/stamp_demo.py, a fixed strip at the top right, at most
# 44% of the width) keeps for itself. scripts/hud.gd places its own nodes
# from these same rectangles; scripts/keyboard_panel.gd keeps the hotbar
# (default or restored) clear of them.

const HUD_MARGIN := 20.0
const HUD_GAP := 14.0
const PLAY_BAR_SIZE := Vector2(540.0, 60.0)
const PLAY_BAR_BOTTOM := 18.0
const PROMPT_MAX_WIDTH := 1000.0
const PROMPT_LINE_HEIGHT := 46.0
const PROMPT_MAX_LINES := 2
const FPS_SIZE := Vector2(176.0, 28.0)
const TARGET_SIZE := Vector2(380.0, 66.0)
const STAMP_WIDTH_FRACTION := 0.44
const STAMP_HEIGHT := 110.0

# The project's own stretch rule (project.godot: canvas_items, expand, a
# 1920x1080 base): the canvas a window of this size actually lays out.
const BASE_CANVAS := Vector2(1920.0, 1080.0)


static func canvas_size_for_window(window_size: Vector2) -> Vector2:
	var scale: float = minf(window_size.x / BASE_CANVAS.x, window_size.y / BASE_CANVAS.y)
	if scale <= 0.0:
		return BASE_CANVAS
	return window_size / scale


static func default_hotbar_position(viewport_size: Vector2) -> Vector2:
	var size := panel_total_size()
	return Vector2(HUD_MARGIN, maxf(0.0, viewport_size.y - HUD_MARGIN - size.y))


static func prompt_band_height() -> float:
	return PROMPT_LINE_HEIGHT * float(PROMPT_MAX_LINES)


static func hud_rects(viewport_size: Vector2) -> Dictionary:
	var vw: float = viewport_size.x
	var vh: float = viewport_size.y
	var hotbar := Rect2(default_hotbar_position(viewport_size), panel_total_size())

	var play_y: float = vh - PLAY_BAR_BOTTOM - PLAY_BAR_SIZE.y
	var prompt_h: float = prompt_band_height()
	var prompt_y: float = play_y - HUD_GAP - prompt_h
	# The bottom band starts where the prompt does; anything reaching into it
	# from the left (the default hotbar) pushes the band's left edge along.
	var left_limit: float = HUD_MARGIN
	if hotbar.end.y > prompt_y:
		left_limit = hotbar.end.x + HUD_GAP
	var right_limit: float = vw - HUD_MARGIN

	var fps := Rect2(Vector2(vw - HUD_MARGIN - FPS_SIZE.x, vh - PLAY_BAR_BOTTOM - FPS_SIZE.y), FPS_SIZE)

	var play_x: float = maxf((vw - PLAY_BAR_SIZE.x) * 0.5, left_limit)
	play_x = minf(play_x, fps.position.x - HUD_GAP - PLAY_BAR_SIZE.x)
	var play := Rect2(Vector2(play_x, play_y), PLAY_BAR_SIZE)

	var prompt_w: float = minf(PROMPT_MAX_WIDTH, right_limit - left_limit)
	var prompt_x: float = clampf((vw - prompt_w) * 0.5, left_limit, right_limit - prompt_w)
	var prompt := Rect2(Vector2(prompt_x, prompt_y), Vector2(prompt_w, prompt_h))

	var stamp_w: float = vw * STAMP_WIDTH_FRACTION + 12.0
	var stamp := Rect2(Vector2(vw - stamp_w, 0.0), Vector2(stamp_w, STAMP_HEIGHT))
	var target := Rect2(Vector2(HUD_MARGIN, HUD_MARGIN), TARGET_SIZE)

	return {
		"hotbar": hotbar, "play_bar": play, "prompt": prompt,
		"fps": fps, "stamp": stamp, "target": target,
	}


# The rectangles the hotbar must never cover, wherever it is dragged or
# restored to.
static func protected_rects(viewport_size: Vector2) -> Array:
	var r := hud_rects(viewport_size)
	return [r["play_bar"], r["prompt"], r["fps"], r["stamp"], r["target"]]


# clamp_position, then out of the play screen's own rectangles: a saved
# position from an older build (user://hud_layout.cfg, which once defaulted
# to the middle of the left edge) or a drag onto the prompt is lifted above
# the bottom band, or failing that sent back to the bottom-left default.
static func clamp_clear_of_hud(pos: Vector2, viewport_size: Vector2) -> Vector2:
	var size := panel_total_size()
	var p := clamp_position(pos, size, viewport_size)
	if _hotbar_is_clear(Rect2(p, size), viewport_size):
		return p
	var r := hud_rects(viewport_size)
	var band_top: float = minf(r["prompt"].position.y, r["play_bar"].position.y)
	var lifted := clamp_position(Vector2(p.x, band_top - HUD_GAP - size.y), size, viewport_size)
	if _hotbar_is_clear(Rect2(lifted, size), viewport_size):
		return lifted
	return default_hotbar_position(viewport_size)


static func _hotbar_is_clear(hotbar: Rect2, viewport_size: Vector2) -> bool:
	for other in protected_rects(viewport_size):
		if hotbar.intersects(other):
			return false
	return true
