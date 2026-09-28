extends RefCounted

# Checks for the combo list screen (spec 005, FR-016, User Story 4, T043):
# scripts/combo_list.gd's rows against scripts/combo.gd and a real player,
# and scripts/combo_list_panel.gd's three-column screen on L.

const ComboList := preload("res://scripts/combo_list.gd")
const Combo := preload("res://scripts/combo.gd")
const HotbarLayout := preload("res://scripts/hotbar_layout.gd")

var runner


func run(r) -> void:
	runner = r
	_test_every_working_move_is_listed_once()
	_test_every_listed_move_really_works()
	_test_defensive_tags_are_honest()
	_test_stubs_are_marked_not_yet()
	_test_the_old_help_block_lives_here_now()
	_test_the_screen_builds_one_row_per_move_and_a_back_control()
	_test_the_screen_opens_on_l()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _ids(rows: Array) -> Array:
	var out: Array = []
	for r in rows:
		out.append(r["id"])
	return out


func _test_every_working_move_is_listed_once() -> void:
	print("combo list: every working move appears exactly once")
	var ids := _ids(ComboList.rows())
	for id in ["dash", "light_chain", "heavy", "guard", "lunge", "burst", "talk"]:
		check("%s appears exactly once" % id, ids.count(id) == 1)
	var complete := true
	for r in ComboList.rows():
		if String(r["keys"]).strip_edges() == "" or String(r["sentence"]).strip_edges() == "" or String(r["tag"]) == "":
			complete = false
	check("every row has its keys, a plain sentence and a tag", complete)
	# Every non-Shift key set combo.gd resolves to a working move is covered by
	# a fighting or other row: the light chain and the heavy take any
	# direction, the rest are the four fixed sets.
	var fixed := {"Q": "guard", "R": "burst", "W+F": "lunge", "E": "talk"}
	var covered := true
	for direction in [""] + Combo.DIRECTIONS:
		for key in Combo.ACTION_KEYS:
			if not ComboList.is_working(direction, false, key):
				continue
			var skill := Combo.resolve(direction, false, key)
			if key == "LMB" or key == "RMB":
				continue
			if not ids.has(fixed.get(skill, "")):
				covered = false
	check("every working key set combo.gd resolves has its row", covered)


# Drives a fresh player with each row's own example key set, through the
# same resolution code a key press takes, and checks the move really starts.
func _test_every_listed_move_really_works() -> void:
	print("combo list: every listed fighting move really starts on its keys")
	for r in ComboList.FIGHTING:
		var player = load("res://scripts/player.gd").new()
		player._ready()
		var ex: Array = r["example"]
		check("%s: its example keys resolve to a skill, not movement" % r["id"],
			Combo.resolve(ex[0], ex[1], ex[2]) != Combo.MOVEMENT)
		player.demo_skill(ex[0], ex[1], ex[2])
		var state = player.get(r["state"])
		check("%s: pressing its keys starts the move" % r["id"], state != null and state.phase() != "ready")
		player.free()

	var talker = load("res://scripts/player.gd").new()
	talker._ready()
	var npc = load("res://scripts/npc.gd").new()
	npc.npc_name = "Mireth"
	npc.dialogue_line = "Mind the Sentinel, stranger."
	npc.after_dodge_line = "Clean through its beam."
	talker.npc = npc
	var talk: Dictionary = ComboList.OTHER[0]
	talker.demo_skill(talk["example"][0], talk["example"][1], talk["example"][2])
	check("talk: E alone near someone makes them answer", talker._last_event.begins_with("Mireth:"))
	talker.free()
	npc.free()


func _test_defensive_tags_are_honest() -> void:
	print("combo list: defensive tags match what each move actually does")
	var tags := {}
	for r in ComboList.rows():
		tags[r["id"]] = r["tag"]
	check("the dash carries invulnerability frames", tags["dash"] == ComboList.TAG_IFRAMES)
	check("the guard is tagged guard", tags["guard"] == ComboList.TAG_GUARD)
	var none_claim_armour := true
	for id in ["light_chain", "heavy", "lunge", "burst"]:
		if tags[id] != ComboList.TAG_NONE:
			none_claim_armour = false
	check("nothing claims super armour or frames the build does not give it", none_claim_armour)
	var known := true
	for r in ComboList.rows():
		if not r["stub"] and not ComboList.TAGS.has(r["tag"]):
			known = false
	check("every working row's tag is one of the four named tags", known)


func _test_stubs_are_marked_not_yet() -> void:
	print("combo list: key sets that only print their name are marked not yet in this build")
	var stub_rows := ComboList.stub_rows()
	check("there are stub rows to mark", stub_rows.size() >= 4)
	var listed := PackedStringArray()
	var all_marked := true
	for r in stub_rows:
		if r["tag"] != ComboList.NOT_YET or not r["stub"]:
			all_marked = false
		for s in r["stub_sets"]:
			listed.append(s)
	check("every stub row says not yet in this build", all_marked)
	var complete := true
	var honest := true
	for direction in [""] + Combo.DIRECTIONS:
		for key in Combo.ACTION_KEYS:
			if ComboList.is_working(direction, false, key):
				continue
			if not listed.has(ComboList.display_keys(direction, false, key)):
				complete = false
			var player = load("res://scripts/player.gd").new()
			player._ready()
			player.demo_skill(direction, false, key)
			var started := false
			for st in ["dash", "attack", "heavy", "guard", "lunge", "burst"]:
				if player.get(st).phase() != "ready":
					started = true
			if started or not player._last_event.begins_with("Skill "):
				honest = false
			player.free()
	check("every key set that only prints its name is listed as a stub", complete)
	check("pressing a stub really does nothing but name it", honest)


func _test_the_old_help_block_lives_here_now() -> void:
	print("combo list: the old five-line help block's content lives here now")
	var ids := _ids(ComboList.rows())
	for id in ["move", "sprint", "auto_sprint", "dash", "light_chain", "heavy", "guard", "lunge", "burst", "nightfall"]:
		check("the list covers %s" % id, ids.has(id))


func _test_the_screen_builds_one_row_per_move_and_a_back_control() -> void:
	print("combo list screen: three columns, one row per move, one Back control")
	var PanelScript := load("res://scripts/combo_list_panel.gd")
	var panel = PanelScript.new()
	panel._ready()
	check("the screen starts closed", not panel.is_open())
	check("the screen builds one row per data row", panel.row_nodes().size() == panel.rows().size())
	var back: Button = panel.back_button()
	check("there is one Back control, in plain words", back != null and back.text == "Back")
	check("Back sits at the bottom centre",
		absf(back.position.x + back.size.x * 0.5 - PanelScript.PANEL_SIZE.x * 0.5) < 1.0
		and back.position.y > PanelScript.PANEL_SIZE.y * 0.85)
	var fits := true
	for vp in [Vector2(1920.0, 1080.0), HotbarLayout.canvas_size_for_window(Vector2(1280.0, 720.0))]:
		if PanelScript.PANEL_SIZE.x > vp.x or PanelScript.PANEL_SIZE.y > vp.y:
			fits = false
	check("the screen fits the 1920x1080 and the 1280x720 frame", fits)
	var last: Control = panel.row_nodes()[panel.row_nodes().size() - 1]
	check("the last row ends above the Back control", last.position.y + last.size.y <= back.position.y)
	panel.select(3)
	check("choosing a row explains it in the help column", panel.help_text() == panel.rows()[3]["sentence"])
	var stub_index := -1
	for i in range(panel.rows().size()):
		if panel.rows()[i]["stub"]:
			stub_index = i
			break
	panel.select(stub_index)
	check("a stub row's help says it is not in this build yet", panel.help_tag_text().to_lower().contains("not yet"))
	panel.free()


func _test_the_screen_opens_on_l() -> void:
	print("combo list screen: opens on L, which nothing else uses")
	var panel_src := FileAccess.get_file_as_string("res://scripts/combo_list_panel.gd")
	check("the screen toggles on L", panel_src.contains("event.keycode == KEY_L"))
	var player_src := FileAccess.get_file_as_string("res://scripts/player.gd")
	var world_src := FileAccess.get_file_as_string("res://scripts/world.gd")
	var hotbar_src := FileAccess.get_file_as_string("res://scripts/keyboard_panel.gd")
	check("L is not taken by the player, the world or the hotbar",
		not player_src.contains("KEY_L") and not world_src.contains("KEY_L") and not hotbar_src.contains("KEY_L"))
	check("the world builds the screen", world_src.contains("ComboListPanelScript.new()"))
	check("the play HUD steps out from behind the open screen",
		world_src.contains("func _on_combo_list_open_changed"))
