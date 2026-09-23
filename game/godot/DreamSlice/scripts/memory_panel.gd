extends CanvasLayer

# The panel that shows Mireth's memory taking hold by day and being read
# back by night. Calm, dark, see-through, white on dark, with the one faint
# violet accent line docs/gdd/09-interface-style.md allows: a thin rule
# under a thin light title, the same shape as the settings screen it
# describes, just narrower and parked on the right instead of full-screen.
#
# Parked at mid-height on the right, not the top-right corner: the
# integration ruling for spec 002's demo (2026-09-23) requires captions
# (lower third, centre) and this panel never overlap, and a corner anchor
# left no headroom once the demo director's captions moved to the bottom
# third of a 1920x1080 frame.

const TITLE_SIZE := 22
const BULLET_SIZE := 17
const SOURCE_SIZE := 13
const BULLET_STAGGER := 0.18
const FADE_TIME := 0.35
const PANEL_WIDTH := 392.0

## How long the panel stays up once it has something to show, in seconds.
## 0 or less means it never auto-hides.
@export var auto_hide_seconds: float = 6.0

var _panel: PanelContainer
var _box: VBoxContainer
var _title: Label
var _rule: ColorRect
var _bullets: VBoxContainer
var _source: Label
var _hide_timer: Timer


func _ready() -> void:
	layer = 5

	_panel = PanelContainer.new()
	_panel.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	# Anchored to the vertical centre of the viewport, then nudged up a
	# little so its own height sits mostly above mid-screen rather than
	# straddling it -- "at mid-height" per the ruling above.
	_panel.position = Vector2(-(PANEL_WIDTH + 28.0), -160.0)
	_panel.custom_minimum_size = Vector2(PANEL_WIDTH, 0.0)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.06, 0.09, 0.72)
	style.set_corner_radius_all(10)
	style.set_content_margin_all(18.0)
	style.set_border_width_all(1)
	style.border_color = Color(1.0, 1.0, 1.0, 0.08)
	_panel.add_theme_stylebox_override("panel", style)
	add_child(_panel)

	_box = VBoxContainer.new()
	_box.add_theme_constant_override("separation", 10)
	_panel.add_child(_box)

	_title = Label.new()
	_title.add_theme_font_size_override("font_size", TITLE_SIZE)
	_title.add_theme_color_override("font_color", Color(0.95, 0.96, 1.0))
	_box.add_child(_title)

	_rule = ColorRect.new()
	_rule.color = Color(0.62, 0.48, 0.92, 0.55)
	_rule.custom_minimum_size = Vector2(0.0, 1.5)
	_box.add_child(_rule)

	_bullets = VBoxContainer.new()
	_bullets.add_theme_constant_override("separation", 6)
	_box.add_child(_bullets)

	_source = Label.new()
	_source.add_theme_font_size_override("font_size", SOURCE_SIZE)
	_source.add_theme_color_override("font_color", Color(0.75, 0.75, 0.82, 0.85))
	_box.add_child(_source)

	_hide_timer = Timer.new()
	_hide_timer.one_shot = true
	_hide_timer.timeout.connect(hide_panel)
	add_child(_hide_timer)

	visible = false


# While recording: a single line saying what Mireth just took in.
func show_stored(text: String) -> void:
	_title.text = "Mireth will remember"
	_source.text = ""
	_fill_bullets([text])
	_present()


# While recalling: every fact she read back, one bullet each, and where they
# came from — world memory or the local fallback — named plainly.
func show_recalled(lines: Array, source: String) -> void:
	_title.text = "Mireth remembers"
	_source.text = "from %s" % source
	_fill_bullets(lines)
	_present()


func hide_panel() -> void:
	visible = false
	_hide_timer.stop()


func panel() -> PanelContainer:
	return _panel


func title_label() -> Label:
	return _title


func source_label() -> Label:
	return _source


func bullet_rows() -> VBoxContainer:
	return _bullets


func _fill_bullets(lines: Array) -> void:
	for child in _bullets.get_children():
		child.queue_free()

	var delay := 0.0
	for raw_line in lines:
		var row := Label.new()
		row.text = "• " + String(raw_line)
		row.add_theme_font_size_override("font_size", BULLET_SIZE)
		row.add_theme_color_override("font_color", Color(0.92, 0.92, 0.96))
		row.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		row.custom_minimum_size = Vector2(PANEL_WIDTH - 36.0, 0.0)
		_bullets.add_child(row)

		if is_inside_tree():
			row.modulate = Color(1.0, 1.0, 1.0, 0.0)
			var tween := create_tween()
			tween.tween_interval(delay)
			tween.tween_property(row, "modulate:a", 1.0, FADE_TIME)
		else:
			row.modulate = Color(1.0, 1.0, 1.0, 1.0)

		delay += BULLET_STAGGER


func _present() -> void:
	visible = true
	# CanvasLayer (this script's own base) carries no modulate property --
	# only a CanvasItem does, and _panel (a PanelContainer) is the one here.
	# This line pointed at self and never actually compiled once anything
	# tried to preload this script; nothing in the test suite did until
	# world.gd wired memory_panel.gd in for spec 002.
	_panel.modulate = Color(1.0, 1.0, 1.0, 1.0)
	if auto_hide_seconds > 0.0 and is_inside_tree():
		_hide_timer.start(auto_hide_seconds)
