extends Node3D

# Builds the whole crowdfunding-demo slice in code, so there is no scene file
# to hand-wire and every part of the world can be read, reviewed and changed
# as text. specs/002-crowdfunding-demo/spec.md and integration-card.md.
#
# The Day Dream and Night Dream environments (scripts/dream_env.gd) replace
# this file's own sky/ground/scenery building. world.gd's own job is
# orchestration: which mode is showing, wiring the player, Mireth and the
# Hollow Sentinel to their signals, and turning those signals into world
# memory (scripts/npc_memory.gd) and the panel that shows it
# (scripts/memory_panel.gd) -- the one place in the codebase that decides
# "Mireth witnessed this," so no other script needs to know she exists.

const PlayerScript := preload("res://scripts/player.gd")
const DummyScript := preload("res://scripts/dummy.gd")
const NpcScript := preload("res://scripts/npc.gd")
const HudScript := preload("res://scripts/hud.gd")
const DreamEnvScript := preload("res://scripts/dream_env.gd")
const NpcMemoryScript := preload("res://scripts/npc_memory.gd")
const MemoryPanelScript := preload("res://scripts/memory_panel.gd")
const DemoDirectorScript := preload("res://scripts/demo_director.gd")

const MIRETH_WITNESS_RADIUS := 40.0
const DEFAULT_LAB_URL := "http://127.0.0.1:9127"

var player: Node3D = null
var sentinel: Node3D = null
var npc: Node3D = null
var hud: Node = null
var npc_memory: Node = null
var memory_panel: Node = null

var _capture_path := ""
var _capture_at := 2.0
var _demo_move := Vector3.ZERO
var _demo_yaw := 0.0
var _dream_mode := "day"
var _demo_mode := false
var _lab_url := DEFAULT_LAB_URL

var _env: Node3D = null
var _fade_layer: CanvasLayer
var _fade_rect: ColorRect

var _night_recall_facts: Array = []
var _night_recall_source := ""
var _night_recall_ready := false

## The line Mireth just spoke, day or night -- the demo director reads this
## right after driving an E press, to show it as a subtitle. Set inside
## _on_talked, which fires synchronously off player.gd's own talked signal,
## so it is already current by the time a caller's own demo_skill() call
## returns (signals in Godot fire synchronously, not on a later frame).
var last_spoken_line := ""


func _ready() -> void:
	_read_args()
	if (_capture_path != "" or _demo_mode) and DisplayServer.get_name() != "headless":
		load("res://scripts/side_screen.gd").apply(get_window())
	_build_fade_overlay()

	_env = DreamEnvScript.new()
	_env.mode = _dream_mode
	_env.demo_quality = _demo_mode
	add_child(_env)

	hud = HudScript.new()
	add_child(hud)

	npc_memory = NpcMemoryScript.new()
	npc_memory.player_id = "player-001"
	npc_memory.zone = "first-gate"
	npc_memory.witness = "mireth"
	npc_memory.time_of_day = _dream_mode
	npc_memory.lab_base_url = _lab_url
	add_child(npc_memory)

	memory_panel = MemoryPanelScript.new()
	add_child(memory_panel)

	player = PlayerScript.new()
	player.position = Vector3(0.0, 1.2, 6.0)
	player.hud = hud
	player.time_of_day = _dream_mode
	# Everything the player reads inside _ready has to be set before it is added
	# to the tree, because add_child is what runs _ready. These three used to be
	# assigned after, and two things were quietly wrong for it: a capture run
	# took the real mouse pointer, because the player saw capture_mode as false
	# and grabbed it; and `--yaw` did nothing at all, because demo_yaw is read
	# only at _ready and always arrived a moment too late. Found on 2026-09-21 by
	# probing a real run after a captured frame failed to show a new line.
	player.capture_mode = _capture_path != "" or _demo_mode
	player.demo_yaw = _demo_yaw
	add_child(player)
	if _demo_move != Vector3.ZERO:
		player.demo_move(_demo_move)

	sentinel = DummyScript.new()
	sentinel.position = Vector3(0.0, 0.0, -6.0)
	sentinel.player = player
	add_child(sentinel)
	sentinel.set_time_of_day(_dream_mode)
	player.target = sentinel

	# Until 2026-09-22 the training dummy, an enemy, was the only other body in
	# the slice. Off to the side of the fight lane so a beam or a dash never
	# reaches her. She now asks the player to prove they can read the
	# Sentinel's beam, per spec 002.
	npc = NpcScript.new()
	npc.npc_name = "Mireth"
	npc.dialogue_line = "Mind the Sentinel, stranger. Prove to me you can read its beam."
	npc.after_dodge_line = "You danced clean through its beam. I have not seen that done in a long while."
	npc.position = Vector3(-6.0, 0.0, 9.0)
	add_child(npc)
	npc.set_time_of_day(_dream_mode)
	player.npc = npc

	player.perfect_dodge_confirmed.connect(_on_perfect_dodge)
	player.heavy_hit_landed.connect(_on_heavy_hit)
	player.skill_used.connect(_on_skill_used)
	player.talked.connect(_on_talked)
	sentinel.defeated.connect(_on_sentinel_defeated)

	if _demo_mode:
		var director := DemoDirectorScript.new()
		director.world = self
		add_child(director)

	if _capture_path != "":
		_capture_after(_capture_at)


# The demo director's own reach for the live Environment resource (spec 003
# lever 3, the demo-only expensive rendering: SDFGI, SSIL, boosted
# volumetric fog). `_env` is rebuilt from scratch by nightfall() partway
# through the timeline, so the director re-reads this after nightfall
# rather than caching the Environment it got at _ready.
func current_environment() -> Environment:
	return _env.env() if _env != null else null


func _unhandled_input(event: InputEvent) -> void:
	# Ruling 4 of the integration card: the game stays playable by hand in
	# both day and night. N triggers nightfall in manual play, the same
	# transition the demo director drives on its own timeline.
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_N:
		if _dream_mode != "night":
			nightfall(4.0)


# Run with:  godot --path <project> -- --capture <file.png>
# The lane looks at the picture itself; a worker's word on its own image is
# never accepted (the trap of 2026-09-20).
func _read_args() -> void:
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--capture" and i + 1 < args.size():
			_capture_path = args[i + 1]
		if args[i] == "--at" and i + 1 < args.size():
			_capture_at = float(args[i + 1])
		if args[i] == "--move" and i + 1 < args.size():
			var pair := args[i + 1].split(",")
			if pair.size() == 2:
				_demo_move = Vector3(float(pair[0]), 0.0, float(pair[1]))
		if args[i] == "--yaw" and i + 1 < args.size():
			_demo_yaw = float(args[i + 1])
		if args[i] == "--dream" and i + 1 < args.size():
			_dream_mode = args[i + 1]
		if args[i] == "--demo":
			_demo_mode = true
		if args[i] == "--lab-url" and i + 1 < args.size():
			_lab_url = args[i + 1]


func _capture_after(seconds: float) -> void:
	var timer := get_tree().create_timer(seconds)
	timer.timeout.connect(_save_picture)


func _save_picture() -> void:
	await RenderingServer.frame_post_draw
	var image := get_viewport().get_texture().get_image()
	var err := image.save_png(_capture_path)
	print("capture: ", _capture_path, " result ", err)
	get_tree().quit(0 if err == OK else 1)


# ---------------------------------------------------------------------------
# Nightfall
# ---------------------------------------------------------------------------

func _build_fade_overlay() -> void:
	_fade_layer = CanvasLayer.new()
	_fade_layer.layer = 30
	add_child(_fade_layer)
	_fade_rect = ColorRect.new()
	_fade_rect.color = Color(0.0, 0.0, 0.0, 0.0)
	_fade_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade_layer.add_child(_fade_rect)


func _fade_to(target_alpha: float, duration: float) -> void:
	if duration <= 0.0 or not is_inside_tree():
		_fade_rect.color = Color(0.0, 0.0, 0.0, target_alpha)
		return
	var start_alpha: float = _fade_rect.color.a
	var t := 0.0
	while t < duration:
		t += get_process_delta_time()
		var f: float = clampf(t / duration, 0.0, 1.0)
		_fade_rect.color = Color(0.0, 0.0, 0.0, lerpf(start_alpha, target_alpha, f))
		await get_tree().process_frame
	_fade_rect.color = Color(0.0, 0.0, 0.0, target_alpha)


# Fades a full-screen dark overlay in, swaps the Day Dream environment for
# the Night Dream one at the same spot, tells every character model night
# has come, and fades back out. The blocking world-memory recall (up to 3 s,
# scripts/npc_memory.gd) happens in the black at the middle of the fade --
# ruling 3 of the integration card -- and its result is cached for the
# night conversation with Mireth (_on_talked below), never replayed from a
# script.
func nightfall(duration: float) -> void:
	if _dream_mode == "night":
		return
	var half: float = duration * 0.5
	await _fade_to(1.0, half)

	if _env != null:
		_env.free()
	_dream_mode = "night"
	npc_memory.time_of_day = "night"
	if sentinel != null:
		sentinel.set_time_of_day("night")
	if player != null:
		player.set_time_of_day("night")
	if npc != null:
		npc.set_time_of_day("night")

	_env = DreamEnvScript.new()
	_env.mode = "night"
	_env.demo_quality = _demo_mode
	add_child(_env)

	npc_memory.recalled.connect(_on_recalled_for_night, CONNECT_ONE_SHOT)
	npc_memory.recall("mireth")

	await _fade_to(0.0, half)


func _on_recalled_for_night(facts: Array, source: String) -> void:
	_night_recall_facts = facts
	_night_recall_source = source
	_night_recall_ready = true
	print("nightfall recall: source=%s facts=%d" % [source, facts.size()])


# ---------------------------------------------------------------------------
# World memory: turning player/Sentinel signals into what Mireth remembers
# ---------------------------------------------------------------------------

# She is the witness: nothing is recorded unless she is actually close
# enough to have seen it, per the integration card's Part 1 step 5.
func _mireth_witnessing() -> bool:
	if npc == null or player == null or not npc.is_inside_tree() or not player.is_inside_tree():
		return false
	return npc.global_position.distance_to(player.global_position) <= MIRETH_WITNESS_RADIUS


func _on_perfect_dodge(attack_name: String) -> void:
	if not _mireth_witnessing():
		return
	npc_memory.record("perfect_dodge", {"attackName": attack_name, "timeOfDay": _dream_mode})
	memory_panel.show_stored("you slipped clean through its beam")


func _on_heavy_hit(damage: float) -> void:
	if not _mireth_witnessing():
		return
	var target_name: String = sentinel.display_name if sentinel != null else "the Sentinel"
	npc_memory.record("heavy_hit", {"damage": damage, "targetName": target_name, "timeOfDay": _dream_mode})
	memory_panel.show_stored("you landed a heavy blow")


func _on_skill_used(skill_name: String) -> void:
	if not _mireth_witnessing():
		return
	npc_memory.record("skill_used", {"skill": skill_name, "timeOfDay": _dream_mode})
	memory_panel.show_stored("you called on %s" % skill_name)


func _on_sentinel_defeated() -> void:
	if not _mireth_witnessing():
		return
	npc_memory.record("sentinel_defeated", {"timeOfDay": _dream_mode})
	memory_panel.show_stored("the Sentinel fell before you")


func _on_talked(npc_name: String, line: String) -> void:
	if _mireth_witnessing():
		npc_memory.record("talked", {"line": line, "timeOfDay": _dream_mode})

	if _dream_mode == "night" and npc != null and npc_name == npc.npc_name and _night_recall_ready:
		var summary: Dictionary = NpcMemoryScript.summarize(_night_recall_facts)
		var night_line: String = NpcMemoryScript.compose_line(npc_name, summary, "night")
		player.say(night_line)
		last_spoken_line = night_line
		memory_panel.show_recalled(_recall_bullets(summary), _night_recall_source)
	else:
		last_spoken_line = "%s: %s" % [npc_name, line]
		if _mireth_witnessing():
			memory_panel.show_stored("you spoke with her")


# One bullet per notable fact, the shape memory_panel.show_recalled wants --
# built locally rather than as a change to npc_memory.gd's own compose_line,
# which composes one spoken paragraph, not a list.
func _recall_bullets(summary: Dictionary) -> Array:
	var lines: Array = []
	var dodges := int(summary.get("perfect_dodges", 0))
	if dodges > 0:
		lines.append("%d perfect dodge%s through its beam" % [dodges, "" if dodges == 1 else "s"])
	var heavy_hits := int(summary.get("heavy_hits", 0))
	if heavy_hits > 0:
		lines.append("a heavy blow landed for %d" % int(round(float(summary.get("best_heavy_damage", 0.0)))))
	var skills_used: Dictionary = summary.get("skills_used", {})
	var skill_names := PackedStringArray(skills_used.keys())
	skill_names.sort()
	for skill_name in skill_names:
		lines.append("%s used" % String(skill_name))
	if bool(summary.get("sentinel_fell", false)):
		lines.append("the Sentinel fell before you")
	if int(summary.get("talks", 0)) > 0:
		lines.append("you spoke with her")
	if lines.is_empty():
		lines.append("nothing yet")
	return lines
