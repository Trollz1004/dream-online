extends RefCounted

# The copy check (spec 005, FR-017, FR-020, T072): every player-facing line
# this pass added -- the combo list rows, the play screen's labels, the
# hotbar's labels -- and the source of every script this pass touched are
# checked against three word lists: other games and studios (the repo's
# clean-room rule), real-money wording (NEEDs are never a real-money
# benefit), and mocking wording (the tutorial never mocks or scolds).
#
# The first list is kept only as SHA-256 hashes, which cannot be turned back
# into the names: each name was lowercased, split into words on anything that
# is not a letter or a digit, and hashed twice -- words joined by one space,
# and words run together. The check hashes every one-, two- and three-word
# window of the text under test the same two ways and looks for a match.

const ComboList := preload("res://scripts/combo_list.gd")

const OTHER_TITLE_HASHES := [
	"0650bb044aa37d436bf02a38819efd0e9962667fa2b83741674dffee1842811a",
	"0d53820772a05c89e3da9ac37d716007d49e06902bb36821ee1ff79a63533ff5",
	"138abfd4a795675ff20ff3eee93626ea467ddab7ebd5aeeacd0331be495f2603",
	"13c2be373f75d1da56dc7b30d5eb5d047a6ae4a964df1e3641e48bba99323233",
	"141b6c64eb8c87e5bc55e87707d18ed85d0dacac96ddad6d1395bc48108d0300",
	"1ae7fb49efce1e90d07dabbd37b1457548350a68ce61fbeaf8ec2ce4fd5dbd5a",
	"1b74fd829ddef908e356a4b9c0a0597b56282111299fcb4834d08345898b68bd",
	"2812ab44c3259d2c006f4cb484f49d4ec1a23a6f26e3f24bb9d6e1df063a4ef3",
	"2a7a3a17ef9e36c15738c412f49d1d56ec10f8c825809f879af0f4481af86cf0",
	"2ab8ebe854ac5da655a468464e2bc4c3aafb85e58b0f7f3fe7352b8e3d994b5c",
	"306ff8b247031f79835d33f36718ae825d0678de4e1c735d9d8f75d6078088fc",
	"309841b08f839136fa72918bb61237bbd1e16a31fa44f253c03c45cd2d760528",
	"36a5015e063304342ae15f554b2fb3a56abaea5c24c6ea621ceaa1d52135ba9f",
	"3738f9baa6cd8012af244a9e364efd66d989aba9f697ea7f78ff28075b1f3888",
	"3bc12bc2024ad9b752470879951395ba51d25629a5a00d4f9841e7d3d4235fd3",
	"3d7dd07e0152d1e527ac8caa9e92fbe9acac7e1fe9ae65ab8f652780a796e005",
	"3f9be82c12cc57bf0a7d524168f18fafac1e905aac1a5e760dfd82204a494f96",
	"525fc2fc69319ee94d21cc42c12927d22d55e3502812224c2b38fd0661d6f077",
	"579d45e0f5ca37c1a4f632549810d0cd18b65263476bb3821ed3a535625d7d89",
	"7471ac4390e022f017c7ac499a20ce302c6948aad68ab8400de3562d4c8b3697",
	"765ad9f4c7e62e31e7d0cde6f25e71304116c7df6c8bd45206376f825ff8f0fb",
	"793da17aec26d53f08e3ddcff38c18e08032a6372468a4a6704a3ba86a4fc155",
	"7a75f8b57fd66d97bafcf528aaefbae8d991055b31ca766e5332d4ac76cb11b5",
	"7dd421f3ee4d0a0f5cd8cf952a13a9d5b5d51109703950a14ee0507f48681720",
	"84cec2ece8fcc93499912ac433caa7fd5a07b5dfd63156dc9d89ef6e648a8e25",
	"8914c6ae54be15472e0d09c0e109e19f9439b64ccc21f3fca1bf4f30c0c30cf0",
	"8aa8396f815b92c56259ca18f89542661fc41a2320627192fbd59326ac9c4312",
	"94d68a464b8a699c5879aac216b5d271e00ab9742d575bf9a78c62dc99133901",
	"969ecd52c459a7d86c4003265db093143ace8d660dca97bf28310a897cf0c5d5",
	"96f4620f18079bd18c2aac00c7cb3af7524a9c7e9d68b14de9d5777c941d45e8",
	"9878bedc8d27ee048ff2ad79251cb5de40144bcd52cccacf31d6d72ee8b64507",
	"9ac868d73a98a7df9b988142bfa4b35d118981a9c2cd895d96faa734947d4749",
	"9c8ae69b84f21a2e46df9edf0063a697afec050188ff2884ddc8ab32b5e58c43",
	"9ea585afde906df82b493a4311f04a0d3b418c85908d69ba1ddfeeaaf931b798",
	"9efdc7925d55049cb9a264506ef2e63a0136cbd814552610a21863a460492ede",
	"a7d4b613e99d6c47a9bb6314b1f76c0fcfd655aa0b7b302952c2aa6ccf200471",
	"aee5f3c6f780e115dfc469a000ab61fc34794c8b0454074f42f4f9bf4c4a1684",
	"b4ab7d5f1c2b8b858b2b68fe618dd0b51518bd532116fc8272fb7492f97e1ef7",
	"b8d8cf5d3746f15245929281cca2d4c06bc3d7775458bcfcb13eb42475379922",
	"b9dc2a516cbb24e235ab90515c705ea117c0732eff1c67ca124e8904c3259b9f",
	"bc057e642a4dd127b6c35a33c2cd867d09e7744bdc43c8fa3dee7043709a5feb",
	"bdcd7acb362526e81bb2f82ae6df411494d3ffa294407536837c534af2b416cd",
	"c5986a16a8c179088a3d76dfcab108af40bf9138679b9742cd55a1e574a34119",
	"d08371761e2f7cf35e32abcbe1f02716d7037bd93de7c49eea221223528f65ef",
	"d3961cd04f219b55eb0ac97ed4f0219dccc9a4e8d00a415de1f4d6ce38848dfd",
	"d49277820f608e1518f610a8684e184ccd4ca366f07ab8b2d89bd4bfe98f9101",
	"d76f0537c65b59b6a07ec0e3df4f42ea41191e2a5ef04fd6f85a0e842ea848e3",
	"dcce42d9045d0be1c87db259901381bfd961a2974508ff5658e767e9ab7701fd",
	"e57525b0d5b400246af00a4929249cb02d2c903098ca7eecfc21b7560ab00f95",
	"e76a51e6e3357925df0c9d0bfbb017fd44220846fa07b2e21b196c3d77debb38",
	"ed8f8c47dec1b612430815b7410b91d07ed4d5e86f645b12bf8154d21d50607e",
	"efbb430c65ed2be1b0f05915f106fdd14a7f2f2cc3f13578aaad0cfb457a6e85",
	"f0f4df9d1cac9f163cea9e79152351d6ffac1d3d5a5c031f166f892d6a4ad490",
	"f38a5076e7938612c4a5b7b601d6b8ac178a325d1f0bd03c7d3605756e26cc4d",
	"f40a789dfb4086388d1a1bc44c847df26c517e19dd0408e5798a27da1668111d",
	"f4b96d74b2d0b7cc2c773d898edb8e91a08e28dcba238b183ab8a565fec70622",
]


const REAL_MONEY_WORDS := ["real money", "real-money", "usd", "dollar", "euro", "credit card", "pay to win", "pay-to-win", "$"]
const MOCKING_WORDS := ["noob", "loser", "pathetic", "stupid", "useless", "git gud", "terrible", "you suck", "idiot", "lol"]

const TOUCHED_SCRIPTS := [
	"res://scripts/render_profile.gd", "res://scripts/dream_env.gd", "res://scripts/player.gd",
	"res://scripts/character_model.gd", "res://scripts/hud.gd", "res://scripts/hotbar_layout.gd",
	"res://scripts/keycap.gd", "res://scripts/keyboard_panel.gd", "res://scripts/combo_list.gd",
	"res://scripts/combo_list_panel.gd", "res://scripts/world.gd", "res://scripts/pet.gd",
	"res://scripts/pet_shop_panel.gd", "res://scripts/glow_halo.gd", "res://scripts/dummy.gd",
]

var runner


func run(r) -> void:
	runner = r
	_test_no_other_game_or_studio_is_named()
	_test_player_facing_copy_is_kind_and_never_real_money()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


const WINDOW_MAX := 3


# Every one-, two- and three-word window of `text`, lowercased, hashed both
# with the words joined by a space and run together; true when any window's
# hash is on the list.
static func names_other_title(text: String) -> bool:
	var re := RegEx.new()
	re.compile("[a-z0-9]+")
	var words: Array = []
	for m in re.search_all(text.to_lower()):
		words.append(m.get_string())
	var listed := {}
	for h in OTHER_TITLE_HASHES:
		listed[h] = true
	for i in range(words.size()):
		var spaced := ""
		var joined := ""
		for n in range(WINDOW_MAX):
			if i + n >= words.size():
				break
			spaced = words[i] if n == 0 else spaced + " " + words[i + n]
			joined += words[i + n]
			if listed.has(spaced.sha256_text()) or listed.has(joined.sha256_text()):
				return true
	return false


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
	check("the hashed list holds real SHA-256 entries and the window check finds nothing in plain copy",
		OTHER_TITLE_HASHES.size() >= 40 and String(OTHER_TITLE_HASHES[0]).length() == 64
		and not names_other_title("Mind the Sentinel, stranger. The Dream Lunge closes six metres."))
	var hits := 0
	for line in _player_facing_lines():
		if names_other_title(String(line)):
			hits += 1
	check("no player-facing line names another game or studio", hits == 0)
	var source_hits := PackedStringArray()
	for path in TOUCHED_SCRIPTS:
		if names_other_title(FileAccess.get_file_as_string(path)):
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
