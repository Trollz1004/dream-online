extends RefCounted

# The copy check (spec 005, FR-017, FR-020, T072): every player-facing line
# this pass added -- the combo list rows, the play screen's labels, the
# hotbar's labels -- and the source of every script this pass touched are
# checked against three word lists: other games and studios (the repo's
# clean-room rule), real-money wording (NEEDs are never a real-money
# benefit), and mocking wording (the tutorial never mocks or scolds).
#
# The first list is kept encoded, so this file does not itself put the names
# into the repository in readable form; it is decoded when the check runs.

const ComboList := preload("res://scripts/combo_list.gd")

const OTHER_TITLES_B64 := [
	"bG9zdCBhcms=", "YmxhY2sgZGVzZXJ0", "cGVhcmwgYWJ5c3M=", "YmxhZGUgJiBzb3Vs", "YmxhZGUgYW5kIHNvdWw=",
	"Z3VpbGQgd2Fycw==", "YXJlbmFuZXQ=", "d29ybGQgb2Ygd2FyY3JhZnQ=", "d2FyY3JhZnQ=", "ZmluYWwgZmFudGFzeQ==",
	"c3F1YXJlIGVuaXg=", "ZWxkZXIgc2Nyb2xscw==", "emVuaW1heA==", "dGhyb25lIGFuZCBsaWJlcnR5", "bmNzb2Z0",
	"c21pbGVnYXRl", "Z2Vuc2hpbg==", "bWlob3lv", "aG95b3ZlcnNl", "bWFwbGVzdG9yeQ==", "bmV4b24=",
	"YWxiaW9uIG9ubGluZQ==", "dGFyaXNsYW5k", "d3V0aGVyaW5nIHdhdmVz", "dG93ZXIgb2YgZmFudGFzeQ==",
	"Ymx1ZSBwcm90b2NvbA==", "YmFuZGFpIG5hbWNv", "YmxpenphcmQ=", "dGVuY2VudA==", "bmV0bWFyYmxl",
	"a2FrYW8gZ2FtZXM=", "YW1hem9uIGdhbWVz", "cmFnbmFyb2sgb25saW5l", "cnVuZXNjYXBl", "amFnZXg=",
	"c3RhciBjaXRpemVu",
]

const REAL_MONEY_WORDS := ["real money", "real-money", "usd", "dollar", "euro", "credit card", "pay to win", "pay-to-win", "$"]
const MOCKING_WORDS := ["noob", "loser", "pathetic", "stupid", "useless", "git gud", "terrible", "you suck", "idiot", "lol"]

const TOUCHED_SCRIPTS := [
	"res://scripts/render_profile.gd", "res://scripts/dream_env.gd", "res://scripts/player.gd",
	"res://scripts/character_model.gd", "res://scripts/hud.gd", "res://scripts/hotbar_layout.gd",
	"res://scripts/keycap.gd", "res://scripts/keyboard_panel.gd", "res://scripts/combo_list.gd",
	"res://scripts/combo_list_panel.gd", "res://scripts/world.gd", "res://scripts/pet.gd",
	"res://scripts/pet_shop_panel.gd",
]

var runner


func run(r) -> void:
	runner = r
	_test_no_other_game_or_studio_is_named()
	_test_player_facing_copy_is_kind_and_never_real_money()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


static func other_titles() -> Array:
	var out: Array = []
	for b in OTHER_TITLES_B64:
		out.append(Marshalls.base64_to_utf8(b))
	return out


static func _has_word(text: String, word: String) -> bool:
	var lower := text.to_lower()
	var at := lower.find(word)
	while at != -1:
		var before_ok := at == 0 or not _is_letter(lower[at - 1])
		var end := at + word.length()
		var after_ok := end >= lower.length() or not _is_letter(lower[end])
		if before_ok and after_ok:
			return true
		at = lower.find(word, at + 1)
	return false


static func _is_letter(ch: String) -> bool:
	return (ch >= "a" and ch <= "z") or (ch >= "0" and ch <= "9")


# The combo list rows, the play screen's own labels after a frame of state,
# and the hotbar's labels: every line this pass puts in front of a player.
func _player_facing_lines() -> Array:
	var lines: Array = []
	for r in ComboList.rows():
		lines.append(r["name"])
		lines.append(r["keys"])
		lines.append(r["sentence"])
		lines.append(r["tag"])
	var hud = load("res://scripts/hud.gd").new()
	hud._ready()
	hud.show_state({
		"health": 50.0, "health_max": 100.0, "stamina": 50.0, "stamina_max": 100.0, "auto_sprint": true,
		"dash": load("res://scripts/dash_state.gd").new(), "attack": load("res://scripts/attack_state.gd").new(),
		"heavy": load("res://scripts/heavy_attack_state.gd").new(), "guard": load("res://scripts/guard_state.gd").new(),
		"lunge": load("res://scripts/lunge_state.gd").new(), "burst": load("res://scripts/burst_state.gd").new(),
		"target_health": 60.0, "target_health_max": 120.0, "target_name": "Hollow Sentinel",
		"events_written": 0, "event": "", "event_age": 9.0, "mouse_captured": false, "nearby_npc_name": "Mireth",
	})
	_collect_label_text(hud, lines)
	hud.free()
	var panel = load("res://scripts/keyboard_panel.gd").new()
	panel._ready()
	_collect_label_text(panel, lines)
	panel.free()
	var screen = load("res://scripts/combo_list_panel.gd").new()
	screen._ready()
	for i in range(screen.rows().size()):
		screen.select(i)
		lines.append(screen.help_text())
		lines.append(screen.help_tag_text())
	_collect_label_text(screen, lines)
	screen.free()
	return lines


func _collect_label_text(node: Node, out: Array) -> void:
	if node is Label or node is Button:
		out.append(node.text)
	for c in node.get_children():
		_collect_label_text(c, out)


func _test_no_other_game_or_studio_is_named() -> void:
	print("copy: no other game or studio is named in the new copy or the touched scripts")
	var titles := other_titles()
	check("the encoded list decodes to real names", titles.size() >= 30 and titles[0].length() > 3)
	var hits := PackedStringArray()
	for line in _player_facing_lines():
		for t in titles:
			if _has_word(String(line), t):
				hits.append("copy")
	check("no player-facing line names another game or studio", hits.is_empty())
	var source_hits := PackedStringArray()
	for path in TOUCHED_SCRIPTS:
		var text := FileAccess.get_file_as_string(path)
		for t in titles:
			if _has_word(text, t):
				source_hits.append(path.get_file())
	check("no touched script names another game or studio (%s)" % ", ".join(source_hits), source_hits.is_empty())


func _test_player_facing_copy_is_kind_and_never_real_money() -> void:
	print("copy: player-facing lines are kind and never speak of real money")
	var lines := _player_facing_lines()
	check("there is player-facing copy to check", lines.size() > 40)
	var money := PackedStringArray()
	var mocking := PackedStringArray()
	for line in lines:
		for w in REAL_MONEY_WORDS:
			if (w == "$" and String(line).contains("$")) or (w != "$" and _has_word(String(line), w)):
				money.append(String(line))
		for w in MOCKING_WORDS:
			if _has_word(String(line), w):
				mocking.append(String(line))
	check("no line speaks of real money (%s)" % " | ".join(money), money.is_empty())
	check("no line mocks, scolds or grades the player (%s)" % " | ".join(mocking), mocking.is_empty())
	var pet_row := ""
	for r in ComboList.rows():
		if r["id"] == "pet_shop":
			pet_row = r["sentence"]
	check("the pet shop row says NEEDs and that the pet never fights (convenience only)",
		pet_row.contains("NEEDs") and pet_row.contains("never fights"))
