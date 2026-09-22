extends CanvasLayer

# The readout. Joshua is losing vision, so every line is large, high contrast and
# in plain words, and the state that matters in a fight is said outright rather
# than shown as a thin bar. His skill bar ruling of 2026-09-20 applies: a bar on
# screen exists to show what is ready and what is cooling down.

const BIG := 30
const HUGE := 54
const SMALL := 22

var _box: VBoxContainer
var _hint: Label
var _interact: Label
var _health: Label
var _stamina: Label
var _dash: Label
var _swing: Label
var _target: Label
var _events: Label
var _event: Label
var _help: Label
var _fps: Label
var _last := {}


func _ready() -> void:
	_box = VBoxContainer.new()
	_box.position = Vector2(28.0, 18.0)
	_box.add_theme_constant_override("separation", 8)
	add_child(_box)

	# A browser will not hand the game the mouse until the player clicks, so the
	# first click is spent grabbing it rather than swinging. This line says so.
	# It is the first line of the same column, and it is hidden rather than
	# blanked, because a hidden child takes no room and an empty label still
	# holds a line's height open.
	_hint = _line(_box, BIG, Color(1.0, 1.0, 0.55))
	_hint.text = "Click to look around."
	_hint.visible = false

	# Until 2026-09-22 the only other body in the slice was the training dummy,
	# an enemy. This line says who is close enough to talk to and which key
	# does it, the same shape as the click hint above: hidden rather than
	# blanked, so it never changes the height of the column.
	_interact = _line(_box, BIG, Color(0.75, 1.0, 0.80))
	_interact.visible = false

	_health = _line(_box, BIG, Color(1.0, 0.85, 0.85))
	_stamina = _line(_box, BIG, Color(0.85, 0.95, 1.0))
	_dash = _line(_box, BIG, Color(1.0, 1.0, 0.75))
	_swing = _line(_box, BIG, Color(0.90, 0.95, 0.85))
	_target = _line(_box, BIG, Color(1.0, 0.90, 0.80))
	_events = _line(_box, SMALL, Color(0.80, 0.85, 0.95))
	_fps = _line(_box, SMALL, Color(0.75, 0.95, 0.80))

	# The big event line is the last line of the same column, not a label at a
	# fixed y. A fixed y cannot know how tall the column above it has grown, and
	# on 2026-09-20 a new frames-per-second line pushed the column down onto it.
	_event = _line(_box, HUGE, Color(1.0, 1.0, 1.0))
	_event.add_theme_constant_override("outline_size", 10)

	_help = Label.new()
	_help.add_theme_font_size_override("font_size", SMALL)
	_help.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0))
	_help.add_theme_constant_override("outline_size", 6)
	_help.position = Vector2(28.0, 560.0)
	_help.text = ("Move: W A S D.   Sprint: hold Shift with a direction.   Auto-sprint: double tap a direction.\n"
		+ "Dash with invulnerability frames: hold Shift and a direction, then press F (or Q E R Z C, or a mouse button).\n"
		+ "Attack: left mouse button. Press it again while recovering to chain a harder swing.\n"
		+ "The dummy winds up for 1.4 seconds, then fires. Dash through the beam while you are yellow to take nothing.")
	add_child(_help)


# The readout's own shape, so a test can prove no two lines can cover each other
# without a window and without reading pixels.
func column() -> VBoxContainer:
	return _box


func readout_labels() -> Array:
	return [_health, _stamina, _dash, _swing, _target, _events, _fps]


func event_label() -> Label:
	return _event


func hint_label() -> Label:
	return _hint


func interact_label() -> Label:
	return _interact


func _line(box: VBoxContainer, size: int, colour: Color) -> Label:
	var label := Label.new()
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", colour)
	label.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0))
	label.add_theme_constant_override("outline_size", 8)
	box.add_child(label)
	return label


func show_state(s: Dictionary) -> void:
	# Only the visibility is touched, never the text or a theme override, so this
	# costs nothing on the frames where the answer has not changed.
	_hint.visible = not bool(s.get("mouse_captured", true))

	var nearby_npc_name: String = s.get("nearby_npc_name", "")
	_interact.visible = nearby_npc_name != ""
	if _interact.visible:
		_interact.text = "Press E to talk to %s." % nearby_npc_name

	_paint(_health, "Health  %d / %d" % [int(s["health"]), int(s["health_max"])], Color(1.0, 0.85, 0.85))
	_paint(_stamina, "Stamina  %d / %d%s" % [
		int(s["stamina"]), int(s["stamina_max"]), "    AUTO-SPRINT" if s["auto_sprint"] else ""],
		Color(0.85, 0.95, 1.0))

	var dash = s["dash"]
	match dash.phase():
		"invulnerable":
			_paint(_dash, "Dash  INVULNERABLE", Color(1.0, 0.95, 0.4))
		"startup":
			_paint(_dash, "Dash  starting, still hittable", Color(1.0, 0.8, 0.5))
		"recovery":
			_paint(_dash, "Dash  RECOVERING, wide open", Color(1.0, 0.5, 0.45))
		"cooling":
			_paint(_dash, "Dash  cooling down  %.1fs" % dash.cooldown_left(), Color(0.8, 0.8, 0.85))
		_:
			_paint(_dash, "Dash  READY", Color(0.7, 1.0, 0.75))

	var attack = s["attack"]
	if attack.is_attacking():
		_paint(_swing, "Swing %d  %s%s" % [attack.step(), attack.phase(),
			"   chain now" if attack.can_chain() else ""], Color(1.0, 0.95, 0.7))
	else:
		_paint(_swing, "Swing  READY", Color(0.7, 1.0, 0.75))

	if s["target_health_max"] > 0.0:
		var down: bool = s["target_health"] <= 0.0
		_paint(_target, "Dummy  %d / %d%s" % [int(s["target_health"]), int(s["target_health_max"]),
			"   DOWN" if down else ""], Color(1.0, 0.75, 0.70) if down else Color(1.0, 0.90, 0.80))

	_paint(_events, "Perfect dodges recorded to the world event log: %d" % int(s["events_written"]),
		Color(0.80, 0.85, 0.95))
	_paint(_fps, "%d frames per second" % int(Engine.get_frames_per_second()), Color(0.75, 0.95, 0.80))

	# The last thing that happened stays on screen for two seconds, then fades,
	# so a hit or a perfect dodge is never missed.
	var age: float = s["event_age"]
	if age < 2.0:
		var text: String = s["event"]
		_event.text = text
		var colour := Color(1.0, 1.0, 1.0)
		if text.begins_with("PERFECT"):
			colour = Color(0.55, 1.0, 0.6)
		elif text.begins_with("HIT") or text.begins_with("DOWN"):
			colour = Color(1.0, 0.45, 0.40)
		elif text.contains("hit for"):
			colour = Color(1.0, 0.9, 0.55)
		colour.a = clampf(1.0 - (age - 1.2) / 0.8, 0.0, 1.0)
		_event.add_theme_color_override("font_color", colour)
	else:
		_event.text = ""


# Named _paint, not _set: Object._set is a Godot virtual and shadowing it
# breaks compilation of every script that depends on this one.
func _paint(label: Label, text: String, colour: Color) -> void:
	# Only touch the label when something actually changed. Setting text and a
	# theme override every frame re-runs layout and theme lookup 60 times a
	# second for every line, which is most of a browser frame budget.
	var key := label.get_instance_id()
	var previous = _last.get(key)
	if previous != null and previous[0] == text and previous[1] == colour:
		return
	_last[key] = [text, colour]
	label.text = text
	label.add_theme_color_override("font_color", colour)
