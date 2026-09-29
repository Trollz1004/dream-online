extends RefCounted

# Checks for the spec 005 play screen (FR-001, FR-006 to FR-009, SB-10,
# SB-11, SB-13, SB-14): the see-through HUD, the layout rectangles at
# 1280x720 and 1920x1080, the hotbar kept clear of the prompt, the drawn
# keycap icons, the text-wall sweep, the hero's framing and rim, and the
# browser build's query string and frame-ready flag. Headless, no pixels:
# settings, nodes, text and rectangles only.

const HotbarLayout := preload("res://scripts/hotbar_layout.gd")
const KeycapScript := preload("res://scripts/keycap.gd")

const SIZES := [Vector2(1280.0, 720.0), Vector2(1920.0, 1080.0)]

var runner


func run(r) -> void:
	runner = r
	_test_the_play_hud_is_calm_by_default()
	_test_the_prompt_line_is_one_short_line()
	_test_the_play_bar_and_target_frame_read_real_numbers()
	_test_text_wall_sweep()
	_test_layout_rectangles_never_overlap()
	_test_hud_nodes_sit_on_their_rectangles()
	_test_hotbar_default_and_restored_positions_stay_clear()
	_test_keycaps_draw_real_icons()
	_test_hero_chase_framing()
	_test_hero_rim_light_and_material_rim()
	_test_dream_query_string_and_frame_ready_flag()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _hud():
	var hud = load("res://scripts/hud.gd").new()
	hud._ready()
	return hud


func _state(mouse_captured := true, nearby := "", event := "", event_age := 9.0) -> Dictionary:
	return {
		"health": 82.0, "health_max": 100.0,
		"stamina": 64.0, "stamina_max": 100.0,
		"auto_sprint": false,
		"dash": load("res://scripts/dash_state.gd").new(),
		"attack": load("res://scripts/attack_state.gd").new(),
		"heavy": load("res://scripts/heavy_attack_state.gd").new(),
		"guard": load("res://scripts/guard_state.gd").new(),
		"lunge": load("res://scripts/lunge_state.gd").new(),
		"burst": load("res://scripts/burst_state.gd").new(),
		"target_health": 90.0, "target_health_max": 120.0,
		"target_name": "Hollow Sentinel",
		"events_written": 0,
		"event": event, "event_age": event_age,
		"mouse_captured": mouse_captured,
		"nearby_npc_name": nearby,
	}


# Every Label under `node` that would actually show: its own visibility and
# every Control or CanvasLayer ancestor's, up to `node`.
func _visible_labels(node: Node, out: Array) -> void:
	if node is CanvasItem and not node.visible:
		return
	if node is Label:
		out.append(node)
	for child in node.get_children():
		_visible_labels(child, out)


func _test_the_play_hud_is_calm_by_default() -> void:
	print("play screen: the default HUD is calm, dark and see-through")
	var hud = _hud()
	hud.show_state(_state())
	check("the five-line help block is not on the play screen", not hud.help_label().visible)
	check("the old text column's health line is hidden by default", not hud.readout_labels()[0].visible)
	check("the old text column's frame-rate line is hidden by default (the corner one shows instead)",
		not hud.readout_labels()[hud.readout_labels().size() - 1].visible)
	check("the health and stamina bar is the default play HUD", hud.play_bar().visible)
	var style = hud.play_bar().get_theme_stylebox("panel")
	check("the play bar sits on a dark see-through panel",
		style is StyleBoxFlat and style.bg_color.a > 0.2 and style.bg_color.a < 0.9
		and style.bg_color.get_luminance() < 0.15)
	check("the frame-rate line stays on screen", hud.fps_label().visible and hud.fps_label().text.contains("frames per second"))
	check("the frame-rate line is small", hud.fps_label().get_theme_font_size("font_size") <= 16)
	hud.set_text_readout_visible(true)
	check("the full text column can still be brought back", hud.readout_labels()[0].visible)
	hud.set_text_readout_visible(false)
	hud.set_cinematic(true)
	check("the demo's own bar replaces the play bar in cinematic mode", not hud.play_bar().visible)
	hud.set_cinematic(false)
	check("leaving cinematic mode restores the play bar", hud.play_bar().visible)
	hud.free()


func _test_the_prompt_line_is_one_short_line() -> void:
	print("play screen: the one tutorial prompt line")
	var hud = _hud()
	hud.show_state(_state())
	check("the prompt line is empty and hidden until a prompt is set", not hud.prompt_label().visible)
	hud.set_prompt("W A S D to walk. The mouse looks.")
	check("a prompt shows on its own line", hud.prompt_label().visible and hud.prompt_label().text.begins_with("W A S D"))
	var prompt_style = hud.prompt_label().get_theme_stylebox("normal")
	check("the prompt sits on the see-through panel style", prompt_style is StyleBoxFlat and prompt_style.bg_color.a < 0.9)
	hud.set_prompt("x".repeat(140))
	check("a prompt longer than 90 characters is cut to 90", hud.prompt_label().text.length() == 90)
	hud.set_prompt("")
	check("an empty prompt hides the line", not hud.prompt_label().visible)
	hud.set_prompt("Watch its eye.")
	hud.show_state(_state(false, "Mireth"))
	check("with the click hint and the talk prompt both up, the band shows no more than two lines",
		hud.steady_lines().size() <= 2)
	hud.show_state(_state(true, ""))
	check("the prompt comes back once the band has room", hud.prompt_label().visible)
	check("the click hint lives in the same bottom band", hud.hint_label().get_parent() == hud.prompt_label().get_parent())
	hud.free()


func _test_the_play_bar_and_target_frame_read_real_numbers() -> void:
	print("play screen: the bars read the real numbers")
	var hud = _hud()
	hud.show_state(_state())
	check("the health bar reads the given health", absf(hud.play_health_bar().value - 82.0) < 0.01)
	check("the stamina bar reads the given stamina", absf(hud.play_stamina_bar().value - 64.0) < 0.01)
	check("the target frame shows while there is a target", hud.target_frame().visible)
	var labels: Array = []
	_visible_labels(hud.target_frame(), labels)
	var named := false
	for l in labels:
		if l.text == "Hollow Sentinel":
			named = true
	check("the target frame names its target in plain words", named)
	var no_target := _state()
	no_target["target_health_max"] = 0.0
	hud.show_state(no_target)
	check("the target frame leaves when there is no target", not hud.target_frame().visible)
	hud.free()


# T071 / SB-14 / SC-006: every visible label on the play screen is short,
# and the tutorial band never holds more than two lines.
func _test_text_wall_sweep() -> void:
	print("text-wall sweep: no visible play-screen label is a wall of text")
	for case in [[true, ""], [false, ""], [false, "Mireth"], [true, "Mireth"]]:
		var hud = _hud()
		hud.set_prompt("Watch its eye. Shift, a direction, then F as it fires.")
		hud.show_state(_state(case[0], case[1], "Swing 1 hit for 12", 0.5))
		var labels: Array = []
		_visible_labels(hud, labels)
		var longest := 0
		var multi_line := 0
		for l in labels:
			longest = maxi(longest, l.text.length())
			if l.text.contains("\n"):
				multi_line += 1
		var tag := "mouse %s, %s" % ["held" if case[0] else "loose", "Mireth near" if case[1] != "" else "nobody near"]
		check("%s: no visible label is longer than 90 characters" % tag, longest <= 90)
		check("%s: no visible label runs to several lines" % tag, multi_line == 0)
		check("%s: at most two tutorial lines are up at once" % tag, hud.steady_lines().size() <= 2)
		hud.free()

	var panel = load("res://scripts/keyboard_panel.gd").new()
	panel._ready()
	var labels2: Array = []
	_visible_labels(panel, labels2)
	var ok := true
	for l in labels2:
		if l.text.length() > 90:
			ok = false
	check("the hotbar's own labels are short too", ok)
	panel.free()


func _all_rects(vp: Vector2) -> Dictionary:
	return HotbarLayout.hud_rects(vp)


func _test_layout_rectangles_never_overlap() -> void:
	print("layout: hotbar, prompt, play bar, frame rate, target frame and label never overlap")
	var cases := [
		["1280x720 canvas", Vector2(1280.0, 720.0)],
		["1920x1080 canvas", Vector2(1920.0, 1080.0)],
		["a 1280x720 window under the project's stretch", HotbarLayout.canvas_size_for_window(Vector2(1280.0, 720.0))],
		["a 1920x1080 window under the project's stretch", HotbarLayout.canvas_size_for_window(Vector2(1920.0, 1080.0))],
	]
	for c in cases:
		var vp: Vector2 = c[1]
		var rects: Dictionary = _all_rects(vp)
		var names: Array = rects.keys()
		var overlaps := PackedStringArray()
		for i in range(names.size()):
			for j in range(i + 1, names.size()):
				if (rects[names[i]] as Rect2).intersects(rects[names[j]]):
					overlaps.append("%s/%s" % [names[i], names[j]])
		check("%s: no two play-screen rectangles overlap (%s)" % [c[0], ", ".join(overlaps)], overlaps.is_empty())
		var inside := true
		var screen := Rect2(Vector2.ZERO, vp)
		for n in names:
			if not screen.encloses(rects[n]):
				inside = false
		check("%s: every rectangle sits inside the frame" % c[0], inside)
		check("%s: the prompt band sits above the play bar, never under the hotbar" % c[0],
			rects["prompt"].end.y <= rects["play_bar"].position.y
			and not rects["prompt"].intersects(rects["hotbar"]))
		check("%s: the prompt band holds a full 90-character line or wraps to two" % c[0],
			rects["prompt"].size.y >= HotbarLayout.PROMPT_LINE_HEIGHT * 2.0)
	check("a 1280x720 window lays out the same 1920x1080 canvas (canvas_items stretch)",
		HotbarLayout.canvas_size_for_window(Vector2(1280.0, 720.0)).is_equal_approx(Vector2(1920.0, 1080.0)))


func _test_hud_nodes_sit_on_their_rectangles() -> void:
	print("layout: the HUD places its nodes on the shared rectangles")
	var hud = _hud()
	var rects: Dictionary = _all_rects(HotbarLayout.BASE_CANVAS)
	check("the play bar sits on its rectangle", hud.play_bar().position.is_equal_approx(rects["play_bar"].position))
	check("the target frame sits on its rectangle", hud.target_frame().position.is_equal_approx(rects["target"].position))
	check("the frame-rate line sits on its rectangle at the bottom right",
		hud.fps_label().get_parent().position.is_equal_approx(rects["fps"].position))
	hud.show_state(_state(false))
	var column: Control = hud.column()
	check("the prompt band's column ends on the band's bottom edge",
		absf(column.position.y + column.size.y - rects["prompt"].end.y) < 1.0)
	check("the prompt band's column stays inside the band's width",
		column.position.x >= rects["prompt"].position.x - 0.5
		and column.position.x + column.size.x <= rects["prompt"].end.x + 0.5)
	hud.free()


func _test_hotbar_default_and_restored_positions_stay_clear() -> void:
	print("layout: the hotbar's default and any restored position stay clear of the HUD")
	var KeyboardPanel := load("res://scripts/keyboard_panel.gd")
	for vp in SIZES:
		var tag := "%dx%d" % [int(vp.x), int(vp.y)]
		var size := HotbarLayout.panel_total_size()
		var default_pos: Vector2 = HotbarLayout.default_hotbar_position(vp)
		check("%s: the default hotbar sits at the bottom left" % tag,
			default_pos.x <= HotbarLayout.HUD_MARGIN + 0.01
			and absf(default_pos.y + size.y - (vp.y - HotbarLayout.HUD_MARGIN)) < 0.01)
		for pos in [KeyboardPanel.LEGACY_DEFAULT_POSITION, _all_rects(vp)["prompt"].get_center() - size * 0.5,
				_all_rects(vp)["play_bar"].position, Vector2(vp.x, vp.y), Vector2(-400.0, -400.0)]:
			var p: Vector2 = HotbarLayout.clamp_clear_of_hud(pos, vp)
			var r := Rect2(p, size)
			var clear := true
			for other in HotbarLayout.protected_rects(vp):
				if r.intersects(other):
					clear = false
			check("%s: a hotbar restored or dropped at %s ends clear of the prompt, bar, frame rate and labels"
				% [tag, str(pos)], clear and Rect2(Vector2.ZERO, vp).encloses(r))


func _test_keycaps_draw_real_icons() -> void:
	print("keycaps: real drawn icons, never a plain dot")
	var every_kind_drawn := true
	for kind in KeycapScript.ICON_COLOURS.keys():
		var shape: String = KeycapScript.icon_shape(kind)
		if shape == "" or shape == "dot" or shape == "circle":
			every_kind_drawn = false
	check("every icon kind has its own drawing, none of them a dot", every_kind_drawn)
	check("the potions draw as bottles", KeycapScript.icon_shape("red_potion") == "flask"
		and KeycapScript.icon_shape("blue_potion") == "flask")
	check("food draws as a loaf", KeycapScript.icon_shape("food") == "bread_loaf")
	check("the guard draws as a shield", KeycapScript.icon_shape("guard") == "shield")
	var source := FileAccess.get_file_as_string("res://scripts/keycap.gd")
	check("the keycap's drawing code no longer falls back to a plain circle for an icon",
		not source.contains("_:\n\t\t\tdraw_circle(center, r, c)"))

	var player = load("res://scripts/player.gd").new()
	player._ready()
	var panel = load("res://scripts/keyboard_panel.gd").new()
	panel.player = player
	panel._ready()
	panel._update_consumable_keys()
	panel._update_skill_keys()
	var blank := PackedStringArray()
	var undrawn := PackedStringArray()
	for id in panel.keycaps().keys():
		var cap = panel.keycaps()[id]
		if cap.icon_kind == "" and not cap.empty:
			blank.append(id)
		if cap.icon_kind != "" and KeycapScript.icon_shape(cap.icon_kind) == "":
			undrawn.append(id)
	check("every keycap shows an icon or reads as an open socket (%s)" % ", ".join(blank), blank.is_empty())
	check("every bound icon has a drawing (%s)" % ", ".join(undrawn), undrawn.is_empty())
	check("slot 1 carries the red bottle", panel.keycaps()["1"].icon_kind == "red_potion")
	check("W and E show what they do rather than a blank tile",
		panel.keycaps()["W"].icon_kind == "move" and panel.keycaps()["E"].icon_kind == "talk")
	panel.free()
	player.free()


func _test_hero_chase_framing() -> void:
	print("hero: the default chase framing (SB-07)")
	var PlayerScript := load("res://scripts/player.gd")
	var player = PlayerScript.new()
	player._ready()
	check("the spring arm pulls back to the chase distance",
		absf(player._spring.spring_length - PlayerScript.DEFAULT_SPRING_LENGTH) < 0.001
		and PlayerScript.DEFAULT_SPRING_LENGTH >= 4.5 and PlayerScript.DEFAULT_SPRING_LENGTH <= 6.0)
	# The body's origin sits at its hips (the capsule's centre), so a pivot a
	# little over a metre above it is at the shoulder.
	check("the camera pivots at the hero's shoulder, above the hips",
		player._spring.position.y >= 1.0 and player._spring.position.y <= 1.8)
	check("the camera looks a little down, so the horizon sits above the midline",
		player._pitch < -0.1 and player._pitch > -0.35)
	check("the field of view is a grounded 55 to 65 degrees", player._camera.fov >= 55.0 and player._camera.fov <= 65.0)
	check("the camera sits over one shoulder, so the hero is off the frame's centre",
		absf(player._camera.h_offset) > 0.3)
	check("a fresh start faces down the fight lane toward the landmark", absf(player._yaw - PlayerScript.SPAWN_YAW) < 0.001)
	player.set_camera_distance(3.0, 1.2)
	check("set_camera_distance still sets the spring and the mount",
		absf(player._spring.spring_length - 3.0) < 0.001 and absf(player._spring.position.y - 1.2) < 0.001)
	player._update_camera_shake(0.016)
	check("the shoulder offset survives the camera shake update", absf(player._camera.h_offset - PlayerScript.SHOULDER_OFFSET) < 0.001)
	player.free()


func _collect_meshes(node: Node, out: Array) -> void:
	if node is VisualInstance3D:
		out.append(node)
	for c in node.get_children():
		_collect_meshes(c, out)


func _test_hero_rim_light_and_material_rim() -> void:
	print("hero: a rim light and a material rim shape the silhouette (SB-04, SB-05)")
	var PlayerScript := load("res://scripts/player.gd")
	var player = PlayerScript.new()
	player._ready()
	var rim: SpotLight3D = player.rim_light()
	check("the player carries a rim light", rim != null and rim is SpotLight3D)
	check("the rim light is not a child of the spring arm (which would move it to the camera)",
		rim != null and rim.get_parent() != player._spring)
	check("the rim light sits on the far side of the hero from the camera", rim != null and rim.position.z < -1.0)
	check("the rim light is aimed back at the hero",
		rim != null and (-rim.transform.basis.z).dot((PlayerScript.RIM_AIM - rim.position).normalized()) > 0.99)
	check("the rim light reaches only the hero's own layer",
		rim != null and rim.light_cull_mask == (1 << (PlayerScript.HERO_LAYER - 1)))
	var meshes: Array = []
	_collect_meshes(player._model, meshes)
	var on_layer := meshes.size() > 0
	for m in meshes:
		if (m.layers & (1 << (PlayerScript.HERO_LAYER - 1))) == 0:
			on_layer = false
	check("every mesh of the hero draws on the hero layer", on_layer)
	var mats: Array = player._model.rim_materials()
	check("the hero's materials carry a rim", mats.size() >= 3)
	var all_rim := true
	for m in mats:
		if not m.rim_enabled or m.roughness > 0.73:
			all_rim = false
	check("every rim material has its rim on and stays below full roughness (an edge, not a wash)", all_rim)
	var day_color: Color = rim.light_color
	player.set_time_of_day("night")
	check("night gives the rim its own cooler colour", rim.light_color.b > day_color.b and rim.light_color != day_color)
	check("the camera-following fill light is still there", player._fill_light != null)
	player.free()


func _test_dream_query_string_and_frame_ready_flag() -> void:
	print("web: the dream query string and the frame-ready flag (T004)")
	var World := load("res://scripts/world.gd")
	check("?dream=night opens the night", World.dream_from_query("?dream=night") == "night")
	check("?dream=day opens the day", World.dream_from_query("?dream=day") == "day")
	check("dream is found among other keys", World.dream_from_query("?x=1&dream=night&y=2") == "night")
	check("the value is read without regard to case", World.dream_from_query("?dream=NIGHT") == "night")
	check("any other value is ignored", World.dream_from_query("?dream=noon") == "")
	check("no dream key is ignored", World.dream_from_query("?world=night") == "")
	check("an empty query is ignored", World.dream_from_query("") == "")
	check("only the browser build reads the query string", World.should_read_query(true) and not World.should_read_query(false))
	var source := FileAccess.get_file_as_string("res://scripts/world.gd")
	check("the query read is guarded by the web check",
		source.contains("if should_read_query(OS.has_feature(\"web\")):"))
	check("the frame-ready flag is only ever set in the browser",
		source.contains("if OS.has_feature(\"web\"):\n\t\t\tJavaScriptBridge.eval(\"window.dreamFrameReady = true;"))
	check("the flag waits a number of frames, not seconds", World.FRAME_READY_FRAMES >= 5)
	check("the --dream flag is still read on the desktop", source.contains("args[i] == \"--dream\""))
