extends CanvasLayer

# The readout. Joshua is losing vision, so every line is large, high contrast and
# in plain words, and the state that matters in a fight is said outright rather
# than shown as a thin bar. The skill bar rule of 2026-09-20 applies: a bar on
# screen exists to show what is ready and what is cooling down.

const BIG := 30
const HUGE := 54
const SMALL := 22

var _health: Label
var _stamina: Label
var _dash: Label
var _event: Label
var _help: Label


func _ready() -> void:
	var box := VBoxContainer.new()
	box.position = Vector2(28.0, 22.0)
	box.add_theme_constant_override("separation", 10)
	add_child(box)

	_health = _line(box, BIG, Color(1.0, 0.85, 0.85))
	_stamina = _line(box, BIG, Color(0.85, 0.95, 1.0))
	_dash = _line(box, BIG, Color(1.0, 1.0, 0.75))

	_event = Label.new()
	_event.add_theme_font_size_override("font_size", HUGE)
	_event.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0))
	_event.add_theme_constant_override("outline_size", 10)
	_event.position = Vector2(28.0, 210.0)
	add_child(_event)

	_help = Label.new()
	_help.add_theme_font_size_override("font_size", SMALL)
	_help.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0))
	_help.add_theme_constant_override("outline_size", 6)
	_help.position = Vector2(28.0, 560.0)
	_help.text = ("Move: W A S D.   Sprint: hold Shift with a direction.   Auto-sprint: double tap a direction.\n"
		+ "Dash with invulnerability frames: hold Shift and a direction, then press F (or Q E R Z C, or a mouse button).\n"
		+ "A skill without Shift is a different skill: direction and F on its own.   Mouse looks.   Esc frees the mouse.\n"
		+ "The dummy winds up for 1.4 seconds, then fires. Dash through the beam at the right moment to take nothing.")
	add_child(_help)


func _line(box: VBoxContainer, size: int, colour: Color) -> Label:
	var label := Label.new()
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", colour)
	label.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0))
	label.add_theme_constant_override("outline_size", 8)
	box.add_child(label)
	return label


func show_state(health: float, health_max: float, stamina: float, stamina_max: float,
		dash, last_event: String, event_age: float, auto_sprint: bool) -> void:
	_health.text = "Health  %d / %d" % [int(health), int(health_max)]
	_stamina.text = "Stamina  %d / %d%s" % [
		int(stamina), int(stamina_max), "    AUTO-SPRINT" if auto_sprint else ""]

	var phase: String = dash.phase()
	match phase:
		"invulnerable":
			_dash.text = "Dash  INVULNERABLE"
			_dash.add_theme_color_override("font_color", Color(1.0, 0.95, 0.4))
		"startup":
			_dash.text = "Dash  starting, still hittable"
			_dash.add_theme_color_override("font_color", Color(1.0, 0.8, 0.5))
		"recovery":
			_dash.text = "Dash  RECOVERING, wide open"
			_dash.add_theme_color_override("font_color", Color(1.0, 0.5, 0.45))
		"cooling":
			_dash.text = "Dash  cooling down  %.1fs" % dash.cooldown_left()
			_dash.add_theme_color_override("font_color", Color(0.8, 0.8, 0.85))
		_:
			_dash.text = "Dash  READY"
			_dash.add_theme_color_override("font_color", Color(0.7, 1.0, 0.75))

	# The last thing that happened stays on screen for two seconds, then fades,
	# so a hit or a perfect dodge is never missed.
	if event_age < 2.0:
		_event.text = last_event
		var fade: float = clampf(1.0 - (event_age - 1.2) / 0.8, 0.0, 1.0)
		var colour := Color(1.0, 1.0, 1.0)
		if last_event.begins_with("PERFECT"):
			colour = Color(0.55, 1.0, 0.6)
		elif last_event.begins_with("HIT") or last_event.begins_with("DOWN"):
			colour = Color(1.0, 0.45, 0.40)
		colour.a = fade
		_event.add_theme_color_override("font_color", colour)
	else:
		_event.text = ""
