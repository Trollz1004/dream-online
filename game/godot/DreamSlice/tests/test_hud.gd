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


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _hud():
	var HudScript := load("res://scripts/hud.gd")
	var hud = HudScript.new()
	hud._ready()
	return hud


func _state(event: String, event_age: float) -> Dictionary:
	var DashState := load("res://scripts/dash_state.gd")
	var AttackState := load("res://scripts/attack_state.gd")
	return {
		"health": 82.0, "health_max": 100.0,
		"stamina": 100.0, "stamina_max": 100.0,
		"auto_sprint": false,
		"dash": DashState.new(),
		"attack": AttackState.new(),
		"target_health": 120.0, "target_health_max": 120.0,
		"events_written": 0,
		"event": event, "event_age": event_age,
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


func _test_the_event_line_clears_when_it_is_old() -> void:
	var hud = _hud()
	hud.show_state(_state("HIT for 18", 0.1))
	check("a fresh event is on screen", hud.event_label().text == "HIT for 18")

	hud.show_state(_state("HIT for 18", 5.0))
	check("an old event leaves the screen", hud.event_label().text == "")
	hud.free()
