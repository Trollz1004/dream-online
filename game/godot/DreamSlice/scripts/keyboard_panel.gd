extends CanvasLayer

# The keyboard hotbar: a moveable panel drawn as keycaps laid out like part
# of a real keyboard (scripts/hotbar_layout.gd has the grid math and every
# other pure number this file uses), showing cooldowns for the skills that
# already exist and the three consumables (scripts/consumables.gd has that
# logic; scripts/keycap.gd draws one key). Joshua's ruling in
# docs/gdd/02-action-combat.md: a skill bar's job is to show what is ready
# and what is cooling down -- a readout first, never the only way a skill
# fires.
#
# This panel never steals Shift, W, A, S, D or E -- E is reserved for talking
# to a nearby NPC (player.gd's own E branch) -- and it never rebinds a combat
# key: it only reads player.gd's already-public state (dash, attack, heavy,
# guard, lunge, burst, health, stamina, time_of_day) and draws it. Only the
# three consumable slots (1, 2, 3, with 4, 5, 6 free) are ever actually bound
# or rebound here.

const HotbarLayout := preload("res://scripts/hotbar_layout.gd")
const ConsumablesScript := preload("res://scripts/consumables.gd")
const KeycapScript := preload("res://scripts/keycap.gd")
const DashState := preload("res://scripts/dash_state.gd")
const HeavyAttackState := preload("res://scripts/heavy_attack_state.gd")
const GuardState := preload("res://scripts/guard_state.gd")
const LungeState := preload("res://scripts/lunge_state.gd")
const BurstState := preload("res://scripts/burst_state.gd")

const LAYOUT_PATH := "user://hud_layout.cfg"
const DEFAULT_POSITION := Vector2(24.0, 460.0)
const NUMBER_KEYS := ["1", "2", "3", "4", "5", "6"]
const NUMBER_KEYCODES := {
	KEY_1: "1", KEY_2: "2", KEY_3: "3", KEY_4: "4", KEY_5: "5", KEY_6: "6",
}

var player: Node = null
var hud: Node = null
var consumables := ConsumablesScript.new()

var _root: Control
var _grip: Control
var _keycaps: Dictionary = {}   # id ("1".."6", "Q".."N", "DASH", "LMB", "RMB") -> KeycapScript
var _bindings := {"1": "red", "2": "blue", "3": "food"}   # number key -> consumable id

var _dragging := false
var _drag_offset := Vector2.ZERO
var _item_drag_source := ""
var _mouse_was_captured_for_alt := false


func _ready() -> void:
	layer = 5   # above hud.gd's default CanvasLayer, so keycaps draw over the plain readout
	_build_ui()
	_load_layout()
	if hud != null and hud.has_method("set_skill_labels_visible"):
		hud.set_skill_labels_visible(false)


func _build_ui() -> void:
	var total: Vector2 = HotbarLayout.panel_total_size()
	_root = Control.new()
	_root.size = total
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_root)

	var bg := Panel.new()
	bg.size = total
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	# Calm, dark, see-through: docs/gdd/09-interface-style.md.
	style.bg_color = Color(0.04, 0.045, 0.07, 0.55)
	style.border_color = Color(1.0, 1.0, 1.0, 0.14)
	style.set_border_width_all(1)
	style.set_corner_radius_all(10)
	bg.add_theme_stylebox_override("panel", style)
	_root.add_child(bg)

	_grip = ColorRect.new()
	_grip.color = Color(1.0, 1.0, 1.0, 0.10)
	_grip.size = Vector2(total.x, HotbarLayout.GRIP_HEIGHT)
	_grip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_grip.gui_input.connect(_on_grip_input)
	_root.add_child(_grip)

	var grip_label := Label.new()
	grip_label.text = "HOTBAR   (drag here; Alt frees the mouse)"
	grip_label.add_theme_font_size_override("font_size", 12)
	grip_label.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 0.6))
	grip_label.position = Vector2(8.0, 2.0)
	grip_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_grip.add_child(grip_label)

	var origin := Vector2(HotbarLayout.PANEL_MARGIN, HotbarLayout.PANEL_MARGIN + HotbarLayout.GRIP_HEIGHT)
	for row in range(HotbarLayout.ROWS.size()):
		var keys: Array = HotbarLayout.ROWS[row]
		for col in range(keys.size()):
			var key_name: String = keys[col]
			var pos: Vector2 = origin + HotbarLayout.key_local_position(row, col)
			_add_keycap(key_name, key_name, pos, Vector2(HotbarLayout.KEY_SIZE, HotbarLayout.KEY_SIZE))

	var extra_y: float = origin.y + HotbarLayout.grid_height() + HotbarLayout.ROW_GAP
	var extra_x: float = origin.x
	var extra_labels := {"DASH": "SHIFT", "LMB": "LMB", "RMB": "RMB"}
	for name in HotbarLayout.EXTRA_ORDER:
		var w: float = HotbarLayout.EXTRA_CHIP_WIDTHS[name]
		_add_keycap(name, extra_labels[name], Vector2(extra_x, extra_y), Vector2(w, HotbarLayout.EXTRA_ROW_HEIGHT))
		extra_x += w + HotbarLayout.KEY_GAP

	# F is Dream Lunge, but only together with W held (docs/gdd/02-action-combat.md:
	# a skill is a direction, an optional Shift, and one action key). The corner
	# label says so rather than leaving a bare "F" that reads as F-alone.
	if _keycaps.has("F"):
		_keycaps["F"].key_label = "W+F"


func _add_keycap(id: String, label: String, pos: Vector2, sz: Vector2) -> void:
	var cap: Control = KeycapScript.new()
	cap.position = pos
	cap.size = sz
	cap.key_label = label
	cap.gui_input.connect(_on_keycap_input.bind(id))
	_root.add_child(cap)
	_keycaps[id] = cap


func _viewport_size() -> Vector2:
	if is_inside_tree() and get_viewport() != null:
		return get_viewport().get_visible_rect().size
	return Vector2(1920.0, 1080.0)


# ---------------------------------------------------------------------------
# Per-frame readout
# ---------------------------------------------------------------------------

func _process(delta: float) -> void:
	# The panel is a readout first (docs/gdd/02-action-combat.md's ruling): it
	# never eats a click meant for combat. Made interactive -- so the grip and
	# the number keys can actually be dragged onto -- only while the mouse is
	# already free, the same moment player.gd's own "Click to look around"
	# hint is showing.
	var interactive := Input.mouse_mode == Input.MOUSE_MODE_VISIBLE
	var filter := Control.MOUSE_FILTER_STOP if interactive else Control.MOUSE_FILTER_IGNORE
	if _grip.mouse_filter != filter:
		_grip.mouse_filter = filter
		for key_name in _keycaps.keys():
			_keycaps[key_name].mouse_filter = filter

	if player == null:
		return

	var heal: float = consumables.advance(delta)
	if heal > 0.0:
		player.health = clampf(player.health + heal, 0.0, player.HEALTH_MAX)

	_update_consumable_keys()
	_update_skill_keys()


func _update_consumable_keys() -> void:
	for key_name in NUMBER_KEYS:
		var cap: Control = _keycaps.get(key_name)
		if cap == null:
			continue
		var item: String = _bindings.get(key_name, "")
		match item:
			"red":
				cap.configure({
					"icon_kind": "red_potion", "count": consumables.red_charges,
					"fraction": HotbarLayout.cooldown_fraction(
						consumables.potion_cooldown_left(), ConsumablesScript.POTION_COOLDOWN),
					"seconds_left": consumables.potion_cooldown_left(), "show_seconds": true,
					"ready_now": consumables.can_use_red(), "locked": false,
				})
			"blue":
				cap.configure({
					"icon_kind": "blue_potion", "count": consumables.blue_charges,
					"fraction": HotbarLayout.cooldown_fraction(
						consumables.potion_cooldown_left(), ConsumablesScript.POTION_COOLDOWN),
					"seconds_left": consumables.potion_cooldown_left(), "show_seconds": true,
					"ready_now": consumables.can_use_blue(),
					"locked": false,
				})
			"food":
				cap.configure({
					"icon_kind": "food", "count": consumables.food_charges,
					"fraction": HotbarLayout.cooldown_fraction(
						consumables.food_cooldown_left(), ConsumablesScript.FOOD_COOLDOWN),
					"seconds_left": consumables.food_cooldown_left(),
					"show_seconds": consumables.food_cooldown_left() > 0.0,
					"ready_now": consumables.can_use_food(), "locked": false,
				})
			_:
				cap.configure({
					"icon_kind": "", "count": -1, "fraction": 0.0, "show_seconds": false,
					"ready_now": true, "locked": false,
				})


func _update_skill_keys() -> void:
	_paint_free("T")
	_paint_free("Z")
	_paint_free("C")
	_paint_locked("W")
	_paint_locked("E")

	_paint_state("Q", "guard", player.guard, GuardState.COOLDOWN)
	_paint_state("R", "burst", player.burst, BurstState.COOLDOWN)
	_paint_state("F", "lunge", player.lunge, LungeState.COOLDOWN)
	_paint_state("LMB", "swing", player.attack, 0.0)
	_paint_state("RMB", "heavy", player.heavy, HeavyAttackState.COOLDOWN)
	_paint_state("DASH", "dash", player.dash, DashState.COOLDOWN)
	_paint_nightfall()


func _paint_locked(key_name: String) -> void:
	var cap: Control = _keycaps.get(key_name)
	if cap != null:
		cap.configure({"locked": true, "icon_kind": "", "fraction": 0.0, "count": -1, "show_seconds": false, "ready_now": true})


func _paint_free(key_name: String) -> void:
	var cap: Control = _keycaps.get(key_name)
	if cap != null:
		cap.configure({"locked": false, "icon_kind": "", "fraction": 0.0, "count": -1, "show_seconds": false, "ready_now": true})


func _paint_state(key_name: String, icon_kind: String, state, cooldown_total: float) -> void:
	var cap: Control = _keycaps.get(key_name)
	if cap == null:
		return
	var spec: Dictionary = HotbarLayout.skill_paint_spec(state, cooldown_total)
	spec["icon_kind"] = icon_kind
	spec["count"] = -1
	spec["locked"] = false
	cap.configure(spec)


func _paint_nightfall() -> void:
	var cap: Control = _keycaps.get("N")
	if cap == null:
		return
	# Nightfall (world.gd) is a one-way transition, not a repeating cooldown:
	# once it fires there is nothing left for the key to do, so it reads as
	# spent rather than cooling down.
	var used: bool = player.time_of_day == "night"
	cap.configure({
		"icon_kind": "nightfall", "fraction": 1.0 if used else 0.0,
		"show_seconds": false, "ready_now": not used, "count": -1, "locked": false,
	})


# ---------------------------------------------------------------------------
# Dragging the whole panel
# ---------------------------------------------------------------------------

func _on_grip_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and Input.mouse_mode == Input.MOUSE_MODE_VISIBLE:
			_dragging = true
			_drag_offset = get_global_mouse_position() - _root.position


func _input(event: InputEvent) -> void:
	# Holding Alt frees the mouse for a moment so the panel can be reached
	# without first pressing Escape, matching the parenthetical in the card
	# ("holding Alt or when the cursor is free"); releasing it restores
	# whatever mode was active, unless a drag is still in progress.
	if event is InputEventKey and not event.echo and event.keycode == KEY_ALT:
		if event.pressed and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
			_mouse_was_captured_for_alt = true
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		elif not event.pressed and _mouse_was_captured_for_alt:
			_mouse_was_captured_for_alt = false
			if not _dragging:
				Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		return

	if event is InputEventMouseMotion and _dragging:
		var target: Vector2 = get_global_mouse_position() - _drag_offset
		_root.position = HotbarLayout.clamp_position(target, HotbarLayout.panel_total_size(), _viewport_size())
		return

	if event is InputEventMouseButton and not event.pressed and event.button_index == MOUSE_BUTTON_LEFT and _dragging:
		_dragging = false
		_save_layout()


# ---------------------------------------------------------------------------
# Dragging a keycap's contents onto another keycap (nice to have)
# ---------------------------------------------------------------------------

func _on_keycap_input(event: InputEvent, key_name: String) -> void:
	if not NUMBER_KEYS.has(key_name):
		return
	if not (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT):
		return
	if event.pressed:
		if Input.mouse_mode == Input.MOUSE_MODE_VISIBLE and _bindings.has(key_name):
			_item_drag_source = key_name
	elif _item_drag_source != "":
		var target := _keycap_at(get_global_mouse_position())
		if target != "" and NUMBER_KEYS.has(target) and target != _item_drag_source:
			_bindings = HotbarLayout.swap_bindings(_bindings, _item_drag_source, target)
			_save_layout()
		_item_drag_source = ""


func _keycap_at(global_pos: Vector2) -> String:
	for key_name in _keycaps.keys():
		var cap: Control = _keycaps[key_name]
		if cap.get_global_rect().has_point(global_pos):
			return key_name
	return ""


# ---------------------------------------------------------------------------
# Number-key presses: use a consumable
# ---------------------------------------------------------------------------

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and NUMBER_KEYCODES.has(event.keycode):
		_use_slot(NUMBER_KEYCODES[event.keycode])


func _use_slot(key_name: String) -> void:
	if player == null:
		return
	var item: String = _bindings.get(key_name, "")
	match item:
		"red":
			player.health = consumables.use_red(player.health, player.HEALTH_MAX)
		"blue":
			player.stamina = consumables.use_blue(player.stamina, player.STAMINA_MAX)
		"food":
			consumables.use_food()


# ---------------------------------------------------------------------------
# Saved layout: user://hud_layout.cfg
# ---------------------------------------------------------------------------

func _load_layout() -> void:
	var pos := DEFAULT_POSITION
	var cfg := ConfigFile.new()
	if cfg.load(LAYOUT_PATH) == OK:
		var data := {"x": cfg.get_value("panel", "x", pos.x), "y": cfg.get_value("panel", "y", pos.y)}
		pos = HotbarLayout.position_from_dict(data, DEFAULT_POSITION)
		var bindings_str: String = cfg.get_value("panel", "bindings", "")
		var loaded: Dictionary = HotbarLayout.decode_bindings(bindings_str)
		if not loaded.is_empty():
			_bindings = loaded
	_root.position = HotbarLayout.clamp_position(pos, HotbarLayout.panel_total_size(), _viewport_size())


func _save_layout() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("panel", "x", _root.position.x)
	cfg.set_value("panel", "y", _root.position.y)
	cfg.set_value("panel", "bindings", HotbarLayout.encode_bindings(_bindings))
	cfg.save(LAYOUT_PATH)
