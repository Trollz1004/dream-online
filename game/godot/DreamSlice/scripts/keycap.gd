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
	"swing": Color(0.90, 0.93, 0.98),
	"heavy": Color(0.98, 0.78, 0.55),
	"guard": Color(0.66, 0.82, 1.0),
	"dash": Color(1.0, 0.92, 0.50),
	"lunge": Color(0.80, 0.70, 1.0),
	"burst": Color(0.90, 0.65, 1.0),
	"nightfall": Color(0.78, 0.80, 1.0),
	"red_potion": Color(0.92, 0.22, 0.24),
	"blue_potion": Color(0.26, 0.52, 0.98),
	"food": Color(0.86, 0.62, 0.34),
	"move": Color(0.85, 0.88, 0.95),
	"talk": Color(0.85, 0.88, 0.95),
}

# Every icon is a small drawing made here in code (spec 005, FR-009, SB-11):
# no copied art, and no plain coloured dot standing in for a real icon. The
# shape each kind draws, by name, so tests/test_hud_layout.gd can check that
# every kind the panel binds has a real drawing behind it.
const ICON_SHAPES := {
	"swing": "sword",
	"heavy": "greatsword_impact",
	"guard": "shield",
	"dash": "double_chevron",
	"lunge": "thrust_arrow",
	"burst": "radial_burst",
	"nightfall": "crescent_and_star",
	"red_potion": "flask",
	"blue_potion": "flask",
	"food": "bread_loaf",
	"move": "forward_chevron",
	"talk": "speech_mark",
}


static func icon_shape(kind: String) -> String:
	return ICON_SHAPES.get(kind, "")


var key_label := ""
var icon_kind := ""       # "" when this key has nothing bound
var fraction := 0.0       # 0..1, cooldown remaining as a fraction (see hotbar_layout.cooldown_fraction)
var seconds_left := 0.0
var show_seconds := false
var count := -1           # -1 when this key has no stack count to show
var locked := false       # W and E: never a slot, drawn muted, never a sweep
var ready_now := true
var empty := false        # nothing bound yet: drawn as an open socket

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
	empty = data.get("empty", empty)
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

	if empty and icon_kind == "":
		_draw_socket()
	elif icon_kind != "" and ICON_COLOURS.has(icon_kind):
		var c: Color = ICON_COLOURS[icon_kind]
		if locked:
			c = Color(c.r, c.g, c.b, 0.34)
		elif not ready_now:
			c = c.darkened(0.55)
		_draw_icon(icon_kind, c)

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


# An empty slot: a faint inset outline, the look of a socket waiting for
# something to be dragged onto it.
func _draw_socket() -> void:
	var inset := Rect2(Vector2(9.0, 19.0), size - Vector2(18.0, 27.0))
	var c := Color(1.0, 1.0, 1.0, 0.10)
	var steps := 6
	for side in range(4):
		var a: Vector2
		var b: Vector2
		match side:
			0:
				a = inset.position
				b = Vector2(inset.end.x, inset.position.y)
			1:
				a = Vector2(inset.end.x, inset.position.y)
				b = inset.end
			2:
				a = inset.end
				b = Vector2(inset.position.x, inset.end.y)
			_:
				a = Vector2(inset.position.x, inset.end.y)
				b = inset.position
		for i in range(steps):
			var t0: float = float(i) / float(steps)
			var t1: float = t0 + 0.55 / float(steps)
			draw_line(a.lerp(b, t0), a.lerp(b, t1), c, 1.0, true)


# The icon area: centred a little below the key letter.
func _icon_frame() -> Array:
	var center := Vector2(size.x * 0.5, size.y * 0.5 + 4.0)
	var r: float = minf(size.x, size.y) * 0.30
	return [center, r]


func _draw_icon(kind: String, c: Color) -> void:
	var f := _icon_frame()
	var o: Vector2 = f[0]
	var r: float = f[1]
	match icon_shape(kind):
		"flask":
			_draw_flask(o, r, c)
		"bread_loaf":
			_draw_bread(o, r, c)
		"sword":
			_draw_sword(o, r, c, 1.0)
		"greatsword_impact":
			_draw_sword(o + Vector2(-r * 0.12, 0.0), r * 1.05, c, 1.7)
			for i in range(3):
				var ang: float = -0.5 + float(i) * 0.5
				var d := Vector2(cos(ang), sin(ang))
				draw_line(o + Vector2(r * 0.45, r * 0.45) + d * r * 0.25,
					o + Vector2(r * 0.45, r * 0.45) + d * r * 0.62, c, 2.0, true)
		"shield":
			_draw_shield(o, r, c)
		"double_chevron":
			for k in range(2):
				var x0: float = o.x - r * 0.75 + float(k) * r * 0.7
				draw_polyline(PackedVector2Array([Vector2(x0, o.y - r * 0.7), Vector2(x0 + r * 0.55, o.y),
					Vector2(x0, o.y + r * 0.7)]), c, 3.0, true)
			for k in range(3):
				var y: float = o.y - r * 0.45 + float(k) * r * 0.45
				draw_line(Vector2(o.x - r * 1.15, y), Vector2(o.x - r * 0.85, y), Color(c, c.a * 0.6), 1.5, true)
		"thrust_arrow":
			draw_line(o + Vector2(-r * 1.0, r * 0.55), o + Vector2(r * 0.55, -r * 0.55), c, 3.0, true)
			draw_colored_polygon(PackedVector2Array([o + Vector2(r * 0.95, -r * 0.85),
				o + Vector2(r * 0.25, -r * 0.62), o + Vector2(r * 0.72, -r * 0.15)]), c)
			draw_line(o + Vector2(-r * 1.0, r * 0.95), o + Vector2(-r * 0.35, r * 0.5), Color(c, c.a * 0.5), 1.5, true)
		"radial_burst":
			draw_arc(o, r * 0.42, 0.0, TAU, 24, c, 2.5, true)
			for i in range(8):
				var ang: float = TAU * float(i) / 8.0
				var d := Vector2(cos(ang), sin(ang))
				draw_line(o + d * r * 0.62, o + d * r * (0.98 if i % 2 == 0 else 0.82), c, 2.0, true)
		"crescent_and_star":
			_draw_crescent(o + Vector2(-r * 0.12, r * 0.05), r * 0.8, c)
			_draw_star(o + Vector2(r * 0.62, -r * 0.55), r * 0.24, c)
		"forward_chevron":
			draw_polyline(PackedVector2Array([o + Vector2(-r * 0.6, r * 0.35), o + Vector2(0.0, -r * 0.3),
				o + Vector2(r * 0.6, r * 0.35)]), c, 3.0, true)
			draw_polyline(PackedVector2Array([o + Vector2(-r * 0.6, r * 0.85), o + Vector2(0.0, r * 0.2),
				o + Vector2(r * 0.6, r * 0.85)]), Color(c, c.a * 0.6), 2.0, true)
		"speech_mark":
			var body := Rect2(o + Vector2(-r * 0.85, -r * 0.6), Vector2(r * 1.7, r * 1.05))
			_draw_round_rect(body, r * 0.3, c, false, 2.0)
			draw_colored_polygon(PackedVector2Array([o + Vector2(-r * 0.35, r * 0.44),
				o + Vector2(-r * 0.55, r * 0.9), o + Vector2(0.0, r * 0.44)]), c)
			for i in range(3):
				draw_circle(o + Vector2(-r * 0.4 + float(i) * r * 0.4, -r * 0.08), r * 0.09, c)
		_:
			# Unknown kinds draw nothing rather than a placeholder dot.
			pass


# A round-bellied bottle with a neck, a cork and a highlight on the glass.
func _draw_flask(o: Vector2, r: float, c: Color) -> void:
	var belly_c := o + Vector2(0.0, r * 0.32)
	var glass := Color(1.0, 1.0, 1.0, 0.22 * c.a)
	draw_circle(belly_c, r * 0.72, glass)
	draw_circle(belly_c + Vector2(0.0, r * 0.08), r * 0.62, c)
	# The liquid's surface line, lighter.
	draw_line(belly_c + Vector2(-r * 0.5, -r * 0.22), belly_c + Vector2(r * 0.5, -r * 0.22),
		c.lightened(0.35), 1.5, true)
	var neck := Rect2(o + Vector2(-r * 0.2, -r * 0.72), Vector2(r * 0.4, r * 0.42))
	draw_rect(neck, glass, true)
	draw_rect(neck, Color(1.0, 1.0, 1.0, 0.45 * c.a), false, 1.0)
	var cork := Rect2(o + Vector2(-r * 0.24, -r * 0.98), Vector2(r * 0.48, r * 0.28))
	draw_rect(cork, Color(0.62, 0.44, 0.26, c.a), true)
	draw_circle(belly_c + Vector2(-r * 0.3, -r * 0.05), r * 0.13, Color(1.0, 1.0, 1.0, 0.7 * c.a))


# A round-topped loaf with three scored cuts across its crust.
func _draw_bread(o: Vector2, r: float, c: Color) -> void:
	var pts := PackedVector2Array()
	var base_y: float = o.y + r * 0.55
	pts.append(Vector2(o.x - r * 1.0, base_y))
	for i in range(17):
		var t: float = float(i) / 16.0
		var ang: float = PI + t * PI
		pts.append(Vector2(o.x + cos(ang) * r * 1.0, o.y + r * 0.1 + sin(ang) * r * 0.78))
	pts.append(Vector2(o.x + r * 1.0, base_y))
	draw_colored_polygon(pts, c)
	draw_line(Vector2(o.x - r * 1.0, base_y), Vector2(o.x + r * 1.0, base_y), c.darkened(0.35), 2.0, true)
	for k in range(3):
		var x: float = o.x - r * 0.5 + float(k) * r * 0.5
		draw_line(Vector2(x - r * 0.14, o.y - r * 0.28), Vector2(x + r * 0.14, o.y - r * 0.02),
			c.lightened(0.45), 2.0, true)


# A blade on a diagonal, with a crossguard and a grip. `weight` thickens it.
func _draw_sword(o: Vector2, r: float, c: Color, weight: float) -> void:
	var tip := o + Vector2(r * 0.85, -r * 0.85)
	var hilt := o + Vector2(-r * 0.4, r * 0.4)
	var dir := (tip - hilt).normalized()
	var side := Vector2(-dir.y, dir.x)
	var bw: float = r * 0.13 * weight
	draw_colored_polygon(PackedVector2Array([hilt + side * bw, tip, hilt - side * bw]), c)
	draw_line(hilt + side * r * 0.42, hilt - side * r * 0.42, c.darkened(0.15), 2.5, true)
	draw_line(hilt, hilt - dir * r * 0.5, Color(0.62, 0.46, 0.30, c.a), 3.0, true)
	draw_circle(hilt - dir * r * 0.56, r * 0.09, c)


# A heater shield: flat top, curving to a point, with a rim and a boss.
func _draw_shield(o: Vector2, r: float, c: Color) -> void:
	var pts := PackedVector2Array()
	pts.append(o + Vector2(-r * 0.78, -r * 0.8))
	pts.append(o + Vector2(r * 0.78, -r * 0.8))
	for i in range(9):
		var t: float = float(i) / 8.0
		pts.append(o + Vector2(lerpf(r * 0.78, 0.0, t), lerpf(-r * 0.2, r * 0.95, t * t)))
	for i in range(1, 9):
		var t: float = 1.0 - float(i) / 8.0
		pts.append(o + Vector2(lerpf(-r * 0.78, 0.0, t), lerpf(-r * 0.2, r * 0.95, t * t)))
	draw_colored_polygon(pts, Color(c.r, c.g, c.b, c.a * 0.55))
	var outline := pts.duplicate()
	outline.append(pts[0])
	draw_polyline(outline, c, 2.0, true)
	draw_circle(o + Vector2(0.0, -r * 0.1), r * 0.2, c)


func _draw_crescent(o: Vector2, r: float, c: Color) -> void:
	# The lit edge of a moon: an arc band between two offset circles, drawn
	# as a polygon so it never needs the key's own background colour.
	var pts := PackedVector2Array()
	var steps := 20
	for i in range(steps + 1):
		var a: float = lerpf(PI * 0.35, PI * 1.65, float(i) / float(steps))
		pts.append(o + Vector2(cos(a), sin(a)) * r)
	var inner_o := o + Vector2(r * 0.42, -r * 0.1)
	for i in range(steps, -1, -1):
		var a2: float = lerpf(PI * 0.58, PI * 1.42, float(i) / float(steps))
		pts.append(inner_o + Vector2(cos(a2), sin(a2)) * r * 0.82)
	draw_colored_polygon(pts, c)


func _draw_star(o: Vector2, r: float, c: Color) -> void:
	var pts := PackedVector2Array()
	for i in range(8):
		var a: float = -PI * 0.5 + TAU * float(i) / 8.0
		var rr: float = r if i % 2 == 0 else r * 0.38
		pts.append(o + Vector2(cos(a), sin(a)) * rr)
	draw_colored_polygon(pts, c)


func _draw_round_rect(rect: Rect2, radius: float, c: Color, filled: bool, width: float) -> void:
	var sb := StyleBoxFlat.new()
	sb.draw_center = filled
	sb.bg_color = c
	sb.border_color = c
	sb.set_border_width_all(int(width))
	sb.set_corner_radius_all(int(radius))
	draw_style_box(sb, rect)


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
