extends CanvasLayer

# The combo list screen (spec 005, FR-016, User Story 4), opened and closed
# with L. The three-column see-through screen of
# docs/gdd/09-interface-style.md: a large thin title at the top left over a
# fine rule; the moves down the left, one per row, the chosen row carrying a
# soft highlight bar; their keys in dark boxes in small capitals, with the
# defensive tag, in the middle; and a help panel on the right that explains
# the chosen row in plain sentences. One Back control at the bottom centre.
# White on dark, no ornament. The rows are scripts/combo_list.gd's plain
# data; this file only draws them.

const ComboList := preload("res://scripts/combo_list.gd")
const HudScript := preload("res://scripts/hud.gd")

const PANEL_SIZE := Vector2(1480.0, 900.0)
const ROW_HEIGHT := 29.0
const NAME_WIDTH := 360.0
const KEYS_WIDTH := 560.0
const TITLE_SIZE := 40
const ROW_SIZE := 17
const KEY_SIZE := 14
const HELP_SIZE := 19

var _root: Control
var _panel: Panel
var _rows: Array = []            # the data rows, scripts/combo_list.gd
var _row_nodes: Array = []       # one HBoxContainer per data row
var _highlights: Array = []      # one highlight bar per data row
var _help_title: Label
var _help_keys: Label
var _help_body: Label
var _help_tag: Label
var _back: Button
var _selected := 0
var _mouse_mode_before := Input.MOUSE_MODE_VISIBLE

## Emitted when the screen opens (true) or closes (false), so world.gd can
## clear the play HUD away from behind it.
signal open_changed(is_open: bool)


func _ready() -> void:
	layer = 20
	_rows = ComboList.rows()
	_build()
	_root.visible = false
	select(0)


func _build() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_root)

	# The world stays visible behind the menu, dimmed.
	var dim := ColorRect.new()
	dim.color = Color(0.0, 0.0, 0.02, 0.38)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(dim)

	_panel = Panel.new()
	var style := HudScript.panel_style(14.0, 0.0, 0.0)
	style.bg_color = Color(0.03, 0.035, 0.055, 0.78)
	_panel.add_theme_stylebox_override("panel", style)
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_panel)
	_place_panel()
	if is_inside_tree() and get_viewport() != null:
		get_viewport().size_changed.connect(_place_panel)

	var title := Label.new()
	title.text = "Combo list"
	title.add_theme_font_size_override("font_size", TITLE_SIZE)
	title.add_theme_color_override("font_color", Color(0.96, 0.97, 1.0, 0.92))
	title.position = Vector2(48.0, 30.0)
	_panel.add_child(title)
	var rule := ColorRect.new()
	rule.color = Color(1.0, 1.0, 1.0, 0.22)
	rule.position = Vector2(48.0, 92.0)
	rule.size = Vector2(PANEL_SIZE.x - 96.0, 1.0)
	_panel.add_child(rule)

	# Left and middle columns: one row per move, grouped under a quiet
	# section heading.
	var y := 112.0
	var last_section := ""
	for i in range(_rows.size()):
		var r: Dictionary = _rows[i]
		if r["section"] != last_section:
			last_section = r["section"]
			var head := Label.new()
			head.text = last_section.to_upper()
			head.add_theme_font_size_override("font_size", 13)
			head.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 0.45))
			head.position = Vector2(48.0, y + 6.0)
			_panel.add_child(head)
			y += ROW_HEIGHT
		var bar := ColorRect.new()
		bar.color = Color(1.0, 1.0, 1.0, 0.0)
		bar.position = Vector2(36.0, y)
		bar.size = Vector2(NAME_WIDTH + KEYS_WIDTH + 24.0, ROW_HEIGHT - 3.0)
		bar.mouse_filter = Control.MOUSE_FILTER_STOP
		bar.mouse_entered.connect(select.bind(i))
		_panel.add_child(bar)
		_highlights.append(bar)

		var row := HBoxContainer.new()
		row.position = Vector2(48.0, y)
		row.size = Vector2(NAME_WIDTH + KEYS_WIDTH, ROW_HEIGHT - 3.0)
		row.add_theme_constant_override("separation", 12)
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_panel.add_child(row)
		var name_label := Label.new()
		name_label.text = r["name"]
		name_label.custom_minimum_size = Vector2(NAME_WIDTH - 12.0, 0.0)
		name_label.add_theme_font_size_override("font_size", ROW_SIZE)
		name_label.add_theme_color_override("font_color",
			Color(1.0, 1.0, 1.0, 0.55) if r["stub"] else Color(0.95, 0.96, 0.98))
		name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		name_label.clip_text = true
		row.add_child(name_label)
		var keys := Label.new()
		keys.text = String(r["keys"]).to_upper()
		keys.custom_minimum_size = Vector2(KEYS_WIDTH, 0.0)
		keys.add_theme_font_size_override("font_size", KEY_SIZE)
		keys.add_theme_color_override("font_color", Color(0.90, 0.92, 0.96, 0.9))
		var box := StyleBoxFlat.new()
		box.bg_color = Color(0.0, 0.0, 0.0, 0.42)
		box.set_corner_radius_all(5)
		box.content_margin_left = 10.0
		box.content_margin_right = 10.0
		keys.add_theme_stylebox_override("normal", box)
		keys.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		keys.clip_text = true
		keys.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		row.add_child(keys)
		_row_nodes.append(row)
		y += ROW_HEIGHT

	# Right column: the help panel for the chosen row.
	var help := PanelContainer.new()
	var help_style := StyleBoxFlat.new()
	help_style.bg_color = Color(1.0, 1.0, 1.0, 0.04)
	help_style.set_corner_radius_all(10)
	help_style.set_content_margin_all(22.0)
	help.add_theme_stylebox_override("panel", help_style)
	var help_x := 48.0 + NAME_WIDTH + KEYS_WIDTH + 44.0
	help.position = Vector2(help_x, 112.0)
	help.size = Vector2(PANEL_SIZE.x - help_x - 48.0, 420.0)
	help.custom_minimum_size = help.size
	help.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.add_child(help)
	var help_col := VBoxContainer.new()
	help_col.add_theme_constant_override("separation", 14)
	help.add_child(help_col)
	_help_title = Label.new()
	_help_title.add_theme_font_size_override("font_size", 26)
	help_col.add_child(_help_title)
	_help_keys = Label.new()
	_help_keys.add_theme_font_size_override("font_size", 15)
	_help_keys.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 0.7))
	_help_keys.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	help_col.add_child(_help_keys)
	_help_body = Label.new()
	_help_body.add_theme_font_size_override("font_size", HELP_SIZE)
	_help_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_help_body.custom_minimum_size = Vector2(help.size.x - 44.0, 0.0)
	help_col.add_child(_help_body)
	_help_tag = Label.new()
	_help_tag.add_theme_font_size_override("font_size", 15)
	_help_tag.add_theme_color_override("font_color", Color(0.85, 0.90, 1.0, 0.85))
	help_col.add_child(_help_tag)

	_back = Button.new()
	_back.text = "Back"
	_back.flat = false
	var back_style := HudScript.panel_style(8.0, 28.0, 8.0)
	_back.add_theme_stylebox_override("normal", back_style)
	var back_hover := HudScript.panel_style(8.0, 28.0, 8.0)
	back_hover.bg_color = Color(1.0, 1.0, 1.0, 0.16)
	_back.add_theme_stylebox_override("hover", back_hover)
	_back.add_theme_stylebox_override("pressed", back_hover)
	_back.add_theme_stylebox_override("focus", back_style)
	_back.add_theme_font_size_override("font_size", 18)
	_back.size = Vector2(160.0, 44.0)
	_back.position = Vector2((PANEL_SIZE.x - _back.size.x) * 0.5, PANEL_SIZE.y - 44.0 - 24.0)
	_back.pressed.connect(close)
	_panel.add_child(_back)


const HotbarLayout := preload("res://scripts/hotbar_layout.gd")
const TOP_GAP := 14.0


## Where the screen sits on a canvas of `viewport_size`: centred across, and
## low enough that the browser build's real-slice label (a fixed strip at the
## top right, scripts/hotbar_layout.gd's "stamp" rectangle) never covers its
## top edge, while its bottom stays on screen.
static func panel_rect(viewport_size: Vector2) -> Rect2:
	var stamp: Rect2 = HotbarLayout.hud_rects(viewport_size)["stamp"]
	var x: float = (viewport_size.x - PANEL_SIZE.x) * 0.5
	var y: float = maxf((viewport_size.y - PANEL_SIZE.y) * 0.5, stamp.end.y + TOP_GAP)
	y = minf(y, viewport_size.y - TOP_GAP - PANEL_SIZE.y)
	return Rect2(Vector2(x, y), PANEL_SIZE)


func _place_panel() -> void:
	var vp := HotbarLayout.BASE_CANVAS
	if is_inside_tree() and get_viewport() != null:
		vp = get_viewport().get_visible_rect().size
	var r := panel_rect(vp)
	_panel.position = r.position
	_panel.size = r.size


## Marks one row chosen: its highlight bar lights and the help panel
## explains it.
func select(index: int) -> void:
	if _rows.is_empty():
		return
	_selected = clampi(index, 0, _rows.size() - 1)
	for i in range(_highlights.size()):
		_highlights[i].color = Color(1.0, 1.0, 1.0, 0.09 if i == _selected else 0.0)
	var r: Dictionary = _rows[_selected]
	_help_title.text = r["name"]
	_help_keys.text = String(r["keys"]).to_upper()
	_help_body.text = r["sentence"]
	if r["stub"]:
		_help_tag.text = "Not yet in this build."
	elif r["tag"] == ComboList.TAG_NONE:
		_help_tag.text = "Defence: none. Timing and distance keep you safe."
	else:
		_help_tag.text = "Defence: %s." % r["tag"]


func is_open() -> bool:
	return _root != null and _root.visible


func toggle() -> void:
	if is_open():
		close()
	else:
		open()


func open() -> void:
	_root.visible = true
	_mouse_mode_before = Input.mouse_mode
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	open_changed.emit(true)


func close() -> void:
	_root.visible = false
	if _mouse_mode_before == Input.MOUSE_MODE_CAPTURED:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	open_changed.emit(false)


func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey) or not event.pressed or event.echo:
		return
	if event.keycode == KEY_L:
		toggle()
		get_viewport().set_input_as_handled()
		return
	if not is_open():
		return
	match event.keycode:
		KEY_ESCAPE:
			close()
		KEY_UP:
			select(_selected - 1)
		KEY_DOWN:
			select(_selected + 1)
		_:
			pass
	# While the list is open, keys read the list, not the fight.
	get_viewport().set_input_as_handled()


# ---------------------------------------------------------------------------
# For tests/test_combo_list.gd
# ---------------------------------------------------------------------------

func rows() -> Array:
	return _rows


func row_nodes() -> Array:
	return _row_nodes


func back_button() -> Button:
	return _back


func panel() -> Panel:
	return _panel


func help_text() -> String:
	return _help_body.text


func help_tag_text() -> String:
	return _help_tag.text
