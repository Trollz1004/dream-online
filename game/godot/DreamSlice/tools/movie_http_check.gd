extends SceneTree

# A fast, standalone check: does npc_memory.gd's blocking HTTPClient recall()
# actually reach a real Live NPC Lab while running under --write-movie
# (fixed time steps, not real time)? Ruling 3 of the crowdfunding-demo
# integration card asks this to be verified before the real ~80 s recording
# is attempted, so a broken HTTP path under movie mode is caught in a few
# seconds of render, not after a slow offline 80 s one.
#
# Run with a lab already listening (see Record-Demo.cmd for the worktree's
# own 9227 instance):
#   godot --path game/godot/DreamSlice --write-movie <tmp.avi> --fixed-fps 30 \
#       --resolution 320x180 --script res://tools/movie_http_check.gd -- \
#       --lab-url http://127.0.0.1:9227
#
# Prints MOVIE_HTTP_CHECK source=<...> facts=<n> and exits 0 when the
# source is the lab, 1 otherwise (including when nothing answers -- the
# fallback still proves the code path runs, just not the lab itself).

var _mem
var _frame := 0
var _done := false


func _initialize() -> void:
	var NpcMemory := load("res://scripts/npc_memory.gd")
	_mem = NpcMemory.new()
	_mem.store_path = "user://movie-http-check.json"
	_mem.witness = "mireth"
	_mem.player_id = "player-001"
	_mem.zone = "first-gate"
	var args := OS.get_cmdline_user_args()
	for i in args.size():
		if args[i] == "--lab-url" and i + 1 < args.size():
			_mem.lab_base_url = args[i + 1]
	print("MOVIE_HTTP_CHECK lab_base_url=%s" % _mem.lab_base_url)
	_mem.reset_local()
	get_root().add_child(_mem)


func _process(_delta: float) -> bool:
	_frame += 1
	# One settled frame before the first record(), the same reason
	# tools/memory_live_check.gd waits one: a brand-new HTTPRequest child
	# needs a frame before it will accept a request.
	if _frame == 2:
		_mem.record("perfect_dodge", {"attackName": "Focus Beam", "timeOfDay": "day"})
	if _frame == 6:
		_mem.recalled.connect(_on_recalled)
		_mem.recall("mireth")
	if _frame > 40 and not _done:
		_done = true
		print("MOVIE_HTTP_CHECK source=NONE facts=0 (recall never answered)")
		quit(1)
	return _done


func _on_recalled(facts: Array, source: String) -> void:
	_done = true
	print("MOVIE_HTTP_CHECK source=%s facts=%d" % [source, facts.size()])
	quit(0 if source.begins_with("world memory") else 1)
