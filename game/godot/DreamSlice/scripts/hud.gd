extends CanvasLayer

# The readout. Joshua is losing vision, so every line is large, high contrast and
# in plain words, and the state that matters in a fight is said outright rather
# than shown as a thin bar. His skill bar ruling of 2026-09-20 applies: a bar on
# screen exists to show what is ready and what is cooling down.

const BIG := 30
const HUGE := 54
const SMALL := 22
const HELP_SIZE := 17
const CINE_SLOT_ORDER := ["Dash", "Swing", "Heavy", "Guard", "Lunge", "Burst"]

var _box: VBoxContainer
var _hint: Label
var _interact: Label
var _health: Label
var _stamina: Label
var _dash: Label
var _swing: Label
var _heavy: Label
var _guard: Label
var _lunge: Label
var _burst: Label
var _target: Label
var _events: Label
var _event: Label
var _help: Label
var _fps: Label
var _last := {}
var _cinematic := false

# A slim bottom-centre bar for the recorded demo (integration-card judge
# note, 2026-09-23): a thin health bar, a thin stamina bar, and the six
# skill cooldown slots, nothing clipped, no debug text. Built once and kept
# in sync by show_state() the same as the ordinary readout above; only its
# visibility is toggled by set_cinematic().
var _cine_root: Control
var _cine_health: ProgressBar
var _cine_stamina: ProgressBar
var _cine_slots: Dictionary = {}


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
	_heavy = _line(_box, BIG, Color(0.95, 0.85, 0.95))
	_guard = _line(_box, BIG, Color(0.80, 0.90, 1.0))
	_lunge = _line(_box, BIG, Color(0.85, 0.80, 1.0))
	_burst = _line(_box, BIG, Color(0.95, 0.80, 1.0))
	_target = _line(_box, BIG, Color(1.0, 0.90, 0.80))
	_events = _line(_box, SMALL, Color(0.80, 0.85, 0.95))
	_fps = _line(_box, SMALL, Color(0.75, 0.95, 0.80))

	# The big event line is the last line of the same column, not a label at a
	# fixed y. A fixed y cannot know how tall the column above it has grown, and
	# on 2026-09-20 a new frames-per-second line pushed the column down onto it.
	_event = _line(_box, HUGE, Color(1.0, 1.0, 1.0))
	_event.add_theme_constant_override("outline_size", 10)

	# The help block hit the exact same bug on 2026-09-22: a fixed y of 480 was
	# tuned for a shorter column, and adding the guard line pushed the huge
	# event line down on top of the first two help lines. It joins the column
	# for the same reason the event line already does.
	_help = Label.new()
	# One size down from the rest of the readout, and the one exception to
	# "every line is large": this block already needed a smaller size to fit
	# three sentences below the column on a 720-tall canvas, on top of a
	# session that added four new systems needing their own line above it.
	# The honest fix for more combos than a corner of text can hold is the
	# combo list screen docs/gdd/02-action-combat.md and 09-interface-style.md
	# already specify, not shrinking this again next time.
	_help.add_theme_font_size_override("font_size", HELP_SIZE)
	_help.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0))
	_help.add_theme_constant_override("outline_size", 6)
	# A long paragraph runs off the right edge of the canvas rather than
	# overlapping anything, which is easy to miss in review; wrapping it inside
	# the screen width is what a capture of a long line caught on 2026-09-22.
	_help.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_help.custom_minimum_size = Vector2(1200.0, 0.0)
	# "Talk: E" is left out on purpose: the interact prompt above already says
	# who is close enough and which key, and says it only when it is true.
	_help.text = ("Move: W A S D.   Sprint: hold Shift with a direction.   Auto-sprint: double tap a direction.\n"
		+ "Dash with invulnerability frames: hold Shift and a direction, then press F (or Q E R Z C, or a mouse button).\n"
		+ "Light attack: left mouse button. Heavy attack: right mouse, slower and harder. Guard: Q alone, blocks most of a hit but opens you up right after.\n"
		+ "Dream Lunge: hold W and press F. Nightveil Burst: press R. Nightfall: press N.\n"
		+ "The Sentinel winds up for 1.4 seconds, then fires. Dash through the beam while you are yellow to take nothing.")
	_box.add_child(_help)

	_build_cinematic_bar()


# A thin health bar, a thin stamina bar, and the six skill cooldown slots,
# anchored to the bottom centre of the viewport so it reads the same at any
# resolution. Hidden until set_cinematic(true).
func _build_cinematic_bar() -> void:
	_cine_root = Control.new()
	_cine_root.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_cine_root.offset_top = -92.0
	_cine_root.offset_bottom = -16.0
	_cine_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_cine_root.visible = false
	add_child(_cine_root)

	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 8)
	_cine_root.add_child(col)

	var bars := HBoxContainer.new()
	bars.add_theme_constant_override("separation", 16)
	bars.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_child(bars)
	_cine_health = _cine_bar(bars, Color(0.85, 0.35, 0.35))
	_cine_stamina = _cine_bar(bars, Color(0.45, 0.68, 1.0))

	var hotbar := HBoxContainer.new()
	hotbar.add_theme_constant_override("separation", 12)
	hotbar.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_child(hotbar)
	for slot_name in CINE_SLOT_ORDER:
		var slot := Label.new()
		slot.text = slot_name
		slot.add_theme_font_size_override("font_size", 17)
		slot.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0, 0.9))
		slot.add_theme_constant_override("outline_size", 5)
		slot.custom_minimum_size = Vector2(96.0, 0.0)
		slot.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hotbar.add_child(slot)
		_cine_slots[slot_name] = slot


func _cine_bar(parent: HBoxContainer, colour: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.custom_minimum_size = Vector2(240.0, 14.0)
	bar.show_percentage = false
	bar.min_value = 0.0
	bar.max_value = 100.0
	bar.value = 100.0
	var fg := StyleBoxFlat.new()
	fg.bg_color = colour
	fg.set_corner_radius_all(5)
	bar.add_theme_stylebox_override("fill", fg)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.0, 0.0, 0.0, 0.55)
	bg.set_corner_radius_all(5)
	bar.add_theme_stylebox_override("background", bg)
	parent.add_child(bar)
	return bar


func cinematic_root() -> Control:
	return _cine_root


func cinematic_health_bar() -> ProgressBar:
	return _cine_health


func cinematic_stamina_bar() -> ProgressBar:
	return _cine_stamina


func cinematic_slot(slot_name: String) -> Label:
	return _cine_slots.get(slot_name)


# The readout's own shape, so a test can prove no two lines can cover each other
# without a window and without reading pixels.
func column() -> VBoxContainer:
	return _box


func readout_labels() -> Array:
	return [_health, _stamina, _dash, _swing, _heavy, _guard, _lunge, _burst, _target, _events, _fps]


func event_label() -> Label:
	return _event


func heavy_label() -> Label:
	return _heavy


func guard_label() -> Label:
	return _guard


func lunge_label() -> Label:
	return _lunge


func burst_label() -> Label:
	return _burst


func help_label() -> Label:
	return _help


func hint_label() -> Label:
	return _hint


func interact_label() -> Label:
	return _interact


# Called once by scripts/keyboard_panel.gd, which replaces this column's six
# skill lines with its own keycap readout (Joshua's ruling: a skill bar's job
# is to show what is ready and what is cooling down). Health, stamina, target
# and event lines stay -- only the six lines this list already named go dark,
# so the same cooldown is never shown twice on screen at once.
func set_skill_labels_visible(v: bool) -> void:
	_dash.visible = v
	_swing.visible = v
	_heavy.visible = v
	_guard.visible = v
	_lunge.visible = v
	_burst.visible = v


func _line(box: VBoxContainer, size: int, colour: Color) -> Label:
	var label := Label.new()
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", colour)
	label.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0))
	label.add_theme_constant_override("outline_size", 8)
	box.add_child(label)
	return label


# Swaps the whole debug readout column for the slim bottom-centre bar
# (integration-card judge note, 2026-09-23: the debug column showed on
# screen, clipped, in the recorded demo). The ordinary readout keeps
# updating underneath -- show_state() below never stops painting its
# labels -- so toggling this back off mid-session restores it exactly as
# it was, and a test can still read the ordinary labels' text either way.
func set_cinematic(enabled: bool) -> void:
	_cinematic = enabled
	_box.visible = not enabled
	if _cine_root != null:
		_cine_root.visible = enabled


func is_cinematic() -> bool:
	return _cinematic


func show_state(s: Dictionary) -> void:
	# Only the visibility is touched, never the text or a theme override, so this
	# costs nothing on the frames where the answer has not changed.
	if not _cinematic:
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

	var heavy = s["heavy"]
	match heavy.phase():
		"winding up":
			_paint(_heavy, "Heavy  winding up", Color(1.0, 0.8, 1.0))
		"striking":
			_paint(_heavy, "Heavy  STRIKING", Color(1.0, 0.6, 1.0))
		"recovering":
			_paint(_heavy, "Heavy  recovering, wide open", Color(1.0, 0.5, 0.55))
		"cooling":
			_paint(_heavy, "Heavy  cooling down", Color(0.8, 0.8, 0.85))
		_:
			_paint(_heavy, "Heavy  READY", Color(0.7, 1.0, 0.75))

	var guard = s["guard"]
	match guard.phase():
		"raising":
			_paint(_guard, "Guard  raising", Color(0.75, 0.85, 1.0))
		"guarding":
			_paint(_guard, "Guard  UP", Color(0.55, 0.75, 1.0))
		"recovering":
			_paint(_guard, "Guard  lowering, wide open", Color(1.0, 0.5, 0.55))
		"cooling":
			_paint(_guard, "Guard  cooling down", Color(0.8, 0.8, 0.85))
		_:
			_paint(_guard, "Guard  READY", Color(0.7, 1.0, 0.75))

	if s.has("lunge"):
		var lunge = s["lunge"]
		match lunge.phase():
			"startup":
				_paint(_lunge, "Dream Lunge  starting", Color(0.85, 0.75, 1.0))
			"travel":
				_paint(_lunge, "Dream Lunge  TRAVELLING", Color(0.75, 0.60, 1.0))
			"recovery":
				_paint(_lunge, "Dream Lunge  recovering, wide open", Color(1.0, 0.5, 0.55))
			"cooling":
				_paint(_lunge, "Dream Lunge  cooling down  %.1fs" % lunge.cooldown_left(), Color(0.8, 0.8, 0.85))
			_:
				_paint(_lunge, "Dream Lunge  READY", Color(0.7, 1.0, 0.75))

	if s.has("burst"):
		var burst = s["burst"]
		match burst.phase():
			"windup":
				_paint(_burst, "Nightveil Burst  winding up", Color(0.95, 0.75, 1.0))
			"burst":
				_paint(_burst, "Nightveil Burst  SHOCKWAVE", Color(0.85, 0.55, 1.0))
			"recovery":
				_paint(_burst, "Nightveil Burst  recovering, wide open", Color(1.0, 0.5, 0.55))
			"cooling":
				_paint(_burst, "Nightveil Burst  cooling down  %.1fs" % burst.cooldown_left(), Color(0.8, 0.8, 0.85))
			_:
				_paint(_burst, "Nightveil Burst  READY", Color(0.7, 1.0, 0.75))

	if s["target_health_max"] > 0.0:
		var down: bool = s["target_health"] <= 0.0
		var target_name: String = s.get("target_name", "")
		_paint(_target, "%s  %d / %d%s" % [target_name if target_name != "" else "Target",
			int(s["target_health"]), int(s["target_health_max"]),
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

	if _cine_health != null:
		_cine_health.value = clampf(float(s["health"]) / maxf(1.0, float(s["health_max"])) * 100.0, 0.0, 100.0)
		_cine_stamina.value = clampf(float(s["stamina"]) / maxf(1.0, float(s["stamina_max"])) * 100.0, 0.0, 100.0)
		_update_cine_slot("Dash", dash)
		_update_cine_slot("Swing", s["attack"])
		_update_cine_slot("Heavy", s["heavy"])
		_update_cine_slot("Guard", guard)
		if s.has("lunge"):
			_update_cine_slot("Lunge", s["lunge"])
		if s.has("burst"):
			_update_cine_slot("Burst", s["burst"])


# One colour rule for every skill's cooldown slot: bright while it is
# actively doing something, dim grey while cooling, green once ready again.
# Each state script exposes a different "is busy" query (is_dashing(),
# is_attacking(), ...), so this reads phase() instead, the one name every
# one of them shares.
func _update_cine_slot(slot_name: String, state) -> void:
	var label: Label = _cine_slots.get(slot_name)
	if label == null:
		return
	var phase: String = state.phase()
	var colour: Color
	if phase == "ready":
		colour = Color(0.65, 1.0, 0.70)
	elif phase == "cooling":
		colour = Color(0.55, 0.55, 0.62)
	else:
		colour = Color(1.0, 0.85, 0.35)
	label.add_theme_color_override("font_color", colour)


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
