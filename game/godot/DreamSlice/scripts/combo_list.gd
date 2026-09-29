extends RefCounted

# The combo list screen's rows, as plain data (spec 005, FR-016, User Story
# 4): every key combination the build resolves, in plain words, with its
# defensive tag, and every combination that only prints its own name marked
# honestly as not yet in this build. No Node, no drawing: the screen itself
# is scripts/combo_list_panel.gd, and tests/test_combo_list.gd checks these
# rows against scripts/combo.gd and a real player.
#
# This is also where the five-line help block that used to sit on the play
# screen (scripts/hud.gd, _help) now lives, one move per row.

const Combo := preload("res://scripts/combo.gd")

const TAG_IFRAMES := "invulnerability frames"
const TAG_GUARD := "guard"
const TAG_SUPER_ARMOUR := "super armour"
const TAG_NONE := "none"
const TAGS := [TAG_IFRAMES, TAG_GUARD, TAG_SUPER_ARMOUR, TAG_NONE]
const NOT_YET := "not yet in this build"

const SECTION_MOVING := "Moving"
const SECTION_FIGHTING := "Fighting"
const SECTION_OTHER := "Other keys"
const SECTION_NOT_YET := "Not yet in this build"
const SECTIONS := [SECTION_MOVING, SECTION_FIGHTING, SECTION_OTHER, SECTION_NOT_YET]

# The moves scripts/player.gd actually performs. "example" is one key set
# (direction, Shift held, action key) that scripts/combo.gd resolves to the
# move, so the suite can drive a real player with it; "state" names the
# player field that starts running when it works ("" for talk, which needs
# someone to talk to).
const FIGHTING := [
	{
		"id": "dash", "name": "Dash", "keys": "Shift + direction + action key",
		"example": ["W", true, "F"], "state": "dash",
		"sentence": "A quick dodge the way you are heading. Its travel slips through attacks untouched; its recovery is wide open. Any action key works: Q, E, R, F, Z, C or a mouse button.",
		"tag": TAG_IFRAMES,
	},
	{
		"id": "light_chain", "name": "Light attack chain", "keys": "Left mouse, up to 3 times",
		"example": ["", false, "LMB"], "state": "attack",
		"sentence": "Three quick strikes that flow as one when each press lands inside the last one's window.",
		"tag": TAG_NONE,
	},
	{
		"id": "heavy", "name": "Heavy attack", "keys": "Right mouse",
		"example": ["", false, "RMB"], "state": "heavy",
		"sentence": "One slower, harder swing. Once it starts it runs to the end, then leaves you open.",
		"tag": TAG_NONE,
	},
	{
		"id": "guard", "name": "Guard", "keys": "Q alone",
		"example": ["", false, "Q"], "state": "guard",
		"sentence": "Raise a guard that takes most of a hit. It lowers on its own and leaves you open for a moment.",
		"tag": TAG_GUARD,
	},
	{
		"id": "lunge", "name": "Dream Lunge", "keys": "Hold W, press F",
		"example": ["W", false, "F"], "state": "lunge",
		"sentence": "A thrust that closes six metres in a quarter of a second, then a short opening.",
		"tag": TAG_NONE,
	},
	{
		"id": "burst", "name": "Nightveil Burst", "keys": "R alone",
		"example": ["", false, "R"], "state": "burst",
		"sentence": "A short wind-up, then a shockwave all around you. The answer to it is distance.",
		"tag": TAG_NONE,
	},
]

const MOVING := [
	{"id": "move", "name": "Walk", "keys": "W A S D",
		"sentence": "Walk the way the camera faces. The mouse looks around.", "tag": TAG_NONE},
	{"id": "sprint", "name": "Sprint", "keys": "Shift + direction",
		"sentence": "Run while stamina lasts. Shift with a direction is always movement, never a skill.", "tag": TAG_NONE},
	{"id": "auto_sprint", "name": "Auto-sprint", "keys": "Double tap a direction",
		"sentence": "Keeps running with no key held, for the long roads.", "tag": TAG_NONE},
]

const OTHER := [
	{"id": "talk", "name": "Talk", "keys": "E alone, near someone",
		"example": ["", false, "E"], "state": "",
		"sentence": "Speak with the person beside you. Mireth answers, and she remembers what she saw.",
		"tag": TAG_NONE},
	{"id": "nightfall", "name": "Nightfall", "keys": "N",
		"sentence": "The same spot, dreamed at night: rain, neon and wet streets.", "tag": TAG_NONE},
	{"id": "hotbar", "name": "Potions and food", "keys": "1  2  3",
		"sentence": "Red potion for health, blue for stamina, food heals slowly. Drag the hotbar where you like.",
		"tag": TAG_NONE},
	{"id": "pet_shop", "name": "Pet shop", "keys": "P",
		"sentence": "GeminEYE, the looting pet, for demo NEEDs. It collects what falls; it never fights.",
		"tag": TAG_NONE},
	{"id": "combo_list", "name": "This list", "keys": "L",
		"sentence": "Opens and closes this list. Escape frees the mouse.", "tag": TAG_NONE},
]


static func display_keys(direction: String, shift: bool, action_key: String) -> String:
	var parts := PackedStringArray()
	if direction != "":
		parts.append(direction)
	if shift:
		parts.append("Shift")
	parts.append(action_key)
	var text := " + ".join(parts)
	if direction == "" and not shift:
		text += " alone"
	return text


# True when scripts/player.gd performs a real move for this key set (the
# same branches its _resolve_skill takes): Shift with a direction and an
# action key is the dash; a mouse button is the light chain or the heavy
# swing with any direction; Q alone, R alone, W+F and E alone are the guard,
# the burst, the lunge and talk. Everything else only prints its name.
static func is_working(direction: String, shift: bool, action_key: String) -> bool:
	var skill := Combo.resolve(direction, shift, action_key)
	if skill == Combo.MOVEMENT:
		return false
	if shift and direction != "":
		return true
	if action_key == "LMB" or action_key == "RMB":
		return true
	return skill in ["Q", "R", "W+F", "E"]


# Every non-Shift key set combo.gd resolves to a skill that is only a name
# so far, grouped by action key into one honest row each.
static func stub_rows() -> Array:
	var rows: Array = []
	for key in Combo.ACTION_KEYS:
		if key == "LMB" or key == "RMB":
			continue
		var sets := PackedStringArray()
		for direction in [""] + Combo.DIRECTIONS:
			if not is_working(direction, false, key):
				sets.append(display_keys(direction, false, key))
		if sets.is_empty():
			continue
		rows.append({
			"id": "stub_" + key.to_lower(), "name": "%s key sets" % key,
			"keys": ", ".join(sets), "stub_sets": sets,
			"sentence": "These key sets are read and named on screen, but no move is behind them yet.",
			"tag": NOT_YET, "stub": true,
		})
	return rows


# Every row of the screen, in order, each with its section.
static func rows() -> Array:
	var out: Array = []
	for r in MOVING:
		out.append(_with_section(r, SECTION_MOVING))
	for r in FIGHTING:
		out.append(_with_section(r, SECTION_FIGHTING))
	for r in OTHER:
		out.append(_with_section(r, SECTION_OTHER))
	for r in stub_rows():
		out.append(_with_section(r, SECTION_NOT_YET))
	return out


static func _with_section(r: Dictionary, section: String) -> Dictionary:
	var d := r.duplicate()
	d["section"] = section
	if not d.has("stub"):
		d["stub"] = false
	return d
