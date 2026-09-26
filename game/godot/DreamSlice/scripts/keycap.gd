extends Panel

# One key on the keyboard hotbar panel (scripts/keyboard_panel.gd). Draws its
# own keycap background (a Panel stylebox, so rounding and a border cost
# nothing extra), the key letter in the top-left corner, a bound icon as a
# simple drawn shape -- no copied art -- its cooldown as a dark radial sweep
# with the remaining seconds in plain numbers, and a stack count in the
# bottom-right corner. Every number it draws is handed in from outside
# (scripts/hotbar_layout.gd and scripts/consumables.gd hold the real logic),
# so this file has nothing worth a test of its own; scripts/keyboard_panel.gd
# wires it and tests/test_keyboard_hotbar.gd checks the numbers feeding it.

const ICON_COLOURS := {
	"swing": Color(0.90, 0.95, 0.85),
	"heavy": Color(0.95, 0.65, 0.95),
	"guard": Color(0.70, 0.85, 1.0),
	"dash": Color(1.0, 0.95, 0.55),
	"lunge": Color(0.80, 0.70, 1.0),
	"burst": Color(0.90, 0.65, 1.0),
	"nightfall": Color(0.65, 0.65, 1.0),
	"red_potion": Color(1.0, 0.40, 0.40),
	"blue_potion": Color(0.45, 0.70, 1.0),
	"food": Color(0.80, 0.95, 0.55),
}

var key_label := ""
var icon_kind := ""       # "" when this key has nothing bound
var fraction := 0.0       # 0..1, cooldown remaining as a fraction (see hotbar_layout.cooldown_fraction)
var seconds_left := 0.0
var show_seconds := false
var count := -1           # -1 when this key has no stack count to show
var locked := false       # W and E: never a slot, drawn muted, never a sweep
var ready_now := true

var _style: StyleBoxFlat


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE   # scripts/keyboard_panel.gd turns this on only while the mouse is free
	_style = StyleBoxFlat.new()
	_style.set_corner_radius_all(8)
	_style.set_border_width_all(1)
	add_theme_stylebox_override("panel", _style)
	_apply_style()


# Called every frame by scripts/keyboard_panel.gd with the fields above,
# already computed by hotbar_layout.gd/consumables.gd. Left as one dictionary
# rather than eight parameters so a caller can hand over only the fields that
# actually changed for a given key kind (a free key has no count, no icon).
func configure(data: Dictionary) -> void:
	key_label = data.get("key_label", key_label)
	icon_kind = data.get("icon_kind", icon_kind)
	fraction = data.get("fraction", fraction)
	seconds_left = data.get("seconds_left", seconds_left)
	show_seconds = data.get("show_seconds", show_seconds)
	count = data.get("count", count)
	locked = data.get("locked", locked)
	ready_now = data.get("ready_now", ready_now)
	_apply_style()
	queue_redraw()


func _apply_style() -> void:
	if _style == null:
		return
	if locked:
		_style.bg_color = Color(0.07, 0.07, 0.09, 0.40)
		_style.border_color = Color(1.0, 1.0, 1.0, 0.05)
	elif ready_now:
		_style.bg_color = Color(0.11, 0.12, 0.16, 0.85)
		_style.border_color = Color(1.0, 1.0, 1.0, 0.24)
	else:
		_style.bg_color = Color(0.07, 0.07, 0.09, 0.85)
		_style.border_color = Color(1.0, 1.0, 1.0, 0.10)


func _draw() -> void:
	var font := ThemeDB.fallback_font
	var key_colour := Color(1.0, 1.0, 1.0, 0.85 if not locked else 0.32)
	draw_string(font, Vector2(6.0, 15.0), key_label, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, key_colour)

	if icon_kind != "" and ICON_COLOURS.has(icon_kind):
		_draw_icon(icon_kind, ICON_COLOURS[icon_kind])

	if fraction > 0.0:
		_draw_sweep(size * 0.5, minf(size.x, size.y) * 0.44, fraction)

	if show_seconds and seconds_left > 0.0:
		var txt := "%d" % int(ceilf(seconds_left))
		var w: float = font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 18).x
		draw_string(font, Vector2(size.x * 0.5 - w * 0.5, size.y * 0.5 + 7.0), txt,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(1.0, 1.0, 1.0, 0.95))

	if count >= 0:
		var txt2 := str(count)
		var w2: float = font.get_string_size(txt2, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x
		draw_string(font, Vector2(size.x - w2 - 6.0, size.y - 5.0), txt2,
			HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(1.0, 1.0, 1.0, 0.85))


func _draw_icon(kind: String, colour: Color) -> void:
	var c: Color = colour if ready_now else colour.darkened(0.55)
	var center := size * 0.5
	var r: float = minf(size.x, size.y) * 0.20
	match kind:
		"food":
			draw_rect(Rect2(center - Vector2(r, r), Vector2(r, r) * 2.0), c, true)
		"nightfall":
			draw_circle(center, r, c)
			# A lighter disc offset over the dark moon carves a simple crescent,
			# rather than a copied icon.
			draw_circle(center + Vector2(r * 0.55, -r * 0.20), r * 0.85, _style.bg_color)
		_:
			draw_circle(center, r, c)


func _draw_sweep(center: Vector2, radius: float, frac: float) -> void:
	var points := PackedVector2Array()
	points.append(center)
	var start := -PI * 0.5
	var stop: float = start + TAU * clampf(frac, 0.0, 1.0)
	var steps := 20
	for i in range(steps + 1):
		var t: float = lerpf(start, stop, float(i) / float(steps))
		points.append(center + Vector2(cos(t), sin(t)) * radius)
	draw_colored_polygon(points, Color(0.0, 0.0, 0.0, 0.60))
