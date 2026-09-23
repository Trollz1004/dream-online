extends RefCounted

# Checks for the readout. These run without a window: the HUD builds its labels
# in _ready, which is called by hand here, and every check reads label text or
# the node tree rather than pixels.
#
# The bug these were written for, 2026-09-20: a frames-per-second line was added
# to the readout column, the column grew one line taller, and the big event line
# sat at a fixed y of 300 and landed on top of it. A fixed position cannot know
# how tall the column above it is, so the event line joins the column instead.

var runner


func run(r) -> void:
	runner = r
	_test_nothing_in_the_readout_can_overlap()
	_test_the_readout_reports_frames_per_second()
	_test_the_event_line_clears_when_it_is_old()
	_test_the_screen_says_to_click_when_the_mouse_is_loose()
	_test_the_screen_prompts_to_talk_when_a_npc_is_near()
	_test_the_readout_reports_the_heavy_swing()
	_test_the_readout_reports_the_guard()
	_test_the_readout_reports_lunge_and_burst()
	_test_cinematic_mode_trims_the_readout()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _hud():
	var HudScript := load("res://scripts/hud.gd")
	var hud = HudScript.new()
	hud._ready()
	return hud


func _state(event: String, event_age: float, mouse_captured := true, nearby_npc_name := "") -> Dictionary:
	var DashState := load("res://scripts/dash_state.gd")
	var AttackState := load("res://scripts/attack_state.gd")
	var HeavyAttackState := load("res://scripts/heavy_attack_state.gd")
	var GuardState := load("res://scripts/guard_state.gd")
	var LungeState := load("res://scripts/lunge_state.gd")
	var BurstState := load("res://scripts/burst_state.gd")
	return {
		"health": 82.0, "health_max": 100.0,
		"stamina": 100.0, "stamina_max": 100.0,
		"auto_sprint": false,
		"dash": DashState.new(),
		"attack": AttackState.new(),
		"heavy": HeavyAttackState.new(),
		"guard": GuardState.new(),
		"lunge": LungeState.new(),
		"burst": BurstState.new(),
		"target_health": 120.0, "target_health_max": 120.0,
		"target_name": "Hollow Sentinel",
		"events_written": 0,
		"event": event, "event_age": event_age,
		"mouse_captured": mouse_captured,
		"nearby_npc_name": nearby_npc_name,
	}


# Two labels can only cover each other when something places them by hand. Every
# line of the readout, the big event line included, belongs to the one column
# that lays itself out, so an added line pushes the ones below it down.
func _test_nothing_in_the_readout_can_overlap() -> void:
	print("readout layout")
	var hud = _hud()

	var column = hud.column()
	check("the readout has a column that lays itself out", column is VBoxContainer)

	var placed_by_hand := 0
	for label in hud.readout_labels():
		if label.get_parent() != column:
			placed_by_hand += 1
	check("every readout line is in the column", placed_by_hand == 0)

	check("the big event line is in the column too", hud.event_label().get_parent() == column)
	check("the help text is in the column too, so a taller column cannot bury it under the event line",
		hud.help_label().get_parent() == column)
	hud.free()


func _test_the_readout_reports_frames_per_second() -> void:
	print("readout content")
	var hud = _hud()
	hud.show_state(_state("", 9.0))

	var found := false
	for label in hud.readout_labels():
		if label.text.contains("frames per second"):
			found = true
	check("the readout says the frame rate", found)

	var health_said := false
	for label in hud.readout_labels():
		if label.text == "Health  82 / 100":
			health_said = true
	check("the readout says health in plain words", health_said)
	hud.free()


# Measured in a real browser on 2026-09-21, not assumed. A Godot web export
# cannot take the mouse at startup, because the browser only grants pointer lock
# from a user gesture: document.pointerLockElement was null on load and became
# the canvas on the first click. So in a browser the first click is spent
# grabbing the mouse rather than swinging, and nothing on screen said so. The
# hint is driven by whether the mouse is actually held, which also covers
# pressing Escape in the desktop build.
func _test_the_screen_says_to_click_when_the_mouse_is_loose() -> void:
	print("the click hint")
	var hud = _hud()

	check("the hint is in the column, so it cannot cover another line",
		hud.hint_label().get_parent() == hud.column())

	hud.show_state(_state("", 9.0, true))
	check("the hint stays off screen while the mouse is held",
		not hud.hint_label().visible)

	hud.show_state(_state("", 9.0, false))
	check("the hint appears when the mouse is loose", hud.hint_label().visible)
	check("the hint says to click, in plain words",
		hud.hint_label().text.to_lower().contains("click"))

	hud.free()


# There was nobody in the slice to talk to before 2026-09-22, only the
# training dummy, which is an enemy. The prompt is driven by whether a
# friendly NPC is actually in range, the same shape as the click hint above.
func _test_the_screen_prompts_to_talk_when_a_npc_is_near() -> void:
	print("the talk prompt")
	var hud = _hud()

	check("the talk prompt is in the column, so it cannot cover another line",
		hud.interact_label().get_parent() == hud.column())

	hud.show_state(_state("", 9.0, true, ""))
	check("the prompt stays off screen with no npc near",
		not hud.interact_label().visible)

	hud.show_state(_state("", 9.0, true, "Old Wren"))
	check("the prompt appears when a named npc is near", hud.interact_label().visible)
	check("the prompt names the npc and the key",
		hud.interact_label().text.contains("Old Wren") and hud.interact_label().text.contains("E"))

	hud.free()


# Right mouse had no readout of its own before 2026-09-22, the same gap the
# dash and the light swing already had closed. The line sits in the column
# with the others, so it is subject to the same no-overlap proof above.
func _test_the_readout_reports_the_heavy_swing() -> void:
	print("readout content: heavy swing")
	var hud = _hud()
	check("the heavy line is in the column", hud.heavy_label().get_parent() == hud.column())

	hud.show_state(_state("", 9.0))
	check("a ready heavy swing reads ready", hud.heavy_label().text.to_lower().contains("ready"))
	hud.free()


# Q had no readout of its own before 2026-09-22, the same gap the dash, the
# light swing and the heavy swing already had closed.
func _test_the_readout_reports_the_guard() -> void:
	print("readout content: guard")
	var hud = _hud()
	check("the guard line is in the column", hud.guard_label().get_parent() == hud.column())

	hud.show_state(_state("", 9.0))
	check("a ready guard reads ready", hud.guard_label().text.to_lower().contains("ready"))
	hud.free()


# Dream Lunge and Nightveil Burst (spec 002) had no readout of their own
# until 2026-09-23, the same gap the dash, the light swing, the heavy swing
# and the guard already had closed.
func _test_the_readout_reports_lunge_and_burst() -> void:
	print("readout content: lunge and burst")
	var hud = _hud()
	check("the lunge line is in the column", hud.lunge_label().get_parent() == hud.column())
	check("the burst line is in the column", hud.burst_label().get_parent() == hud.column())

	hud.show_state(_state("", 9.0))
	check("a ready lunge reads ready", hud.lunge_label().text.to_lower().contains("ready"))
	check("a ready burst reads ready", hud.burst_label().text.to_lower().contains("ready"))
	hud.free()


# set_cinematic(true) is the demo director's own readout: the help text and
# the target/events/fps status column go away, but health, stamina and the
# whole hotbar (dash through burst) stay, moved to a small strip near the
# bottom so nothing sits mid-frame during a framed shot.
func _test_cinematic_mode_trims_the_readout() -> void:
	print("cinematic mode trims the readout")
	var hud = _hud()
	hud.show_state(_state("", 9.0))
	hud.set_cinematic(true)
	check("cinematic mode reports itself", hud.is_cinematic())
	check("cinematic mode hides the help text", not hud.help_label().visible)
	hud.show_state(_state("", 9.0))
	check("cinematic mode still shows health", hud.readout_labels()[0].text.begins_with("Health"))
	check("cinematic mode still shows the dash line", hud.readout_labels()[2].text.contains("Dash"))
	check("cinematic mode still shows the lunge line", hud.lunge_label().text.contains("Dream Lunge"))
	hud.set_cinematic(false)
	check("turning cinematic mode back off restores the help text", hud.help_label().visible)
	hud.free()


func _test_the_event_line_clears_when_it_is_old() -> void:
	var hud = _hud()
	hud.show_state(_state("HIT for 18", 0.1))
	check("a fresh event is on screen", hud.event_label().text == "HIT for 18")

	hud.show_state(_state("HIT for 18", 5.0))
	check("an old event leaves the screen", hud.event_label().text == "")
	hud.free()
