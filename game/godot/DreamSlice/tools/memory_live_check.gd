extends SceneTree

# A hand-run check against the REAL, running Live NPC Lab
# (game/server/live-npc-lab, npm start, http://127.0.0.1:9127). It records
# three events, then recalls them back and prints what came back — proving
# the recall genuinely re-reads what was stored there, not a scripted
# replay. Not part of tests/run_tests.gd: that suite must pass with no lab
# running, and this script needs one running to mean anything.
#
# This script can freely await, unlike the headless test suite: it is the
# only thing running and controls its own quit(), so a coroutine that
# suspends here gets to resume on a later engine frame before the process
# exits. tests/run_tests.gd cannot offer that (see test_npc_memory.gd).
#
# Run with the lab already started:
#   cd game/server/live-npc-lab && npm start
#   godot --headless --path game/godot/DreamSlice --script res://tools/memory_live_check.gd

const PLAYER_ID := "player-001"
const ZONE := "first-gate"
const WITNESS := "mireth"


func _init() -> void:
	_run()


func _run() -> void:
	var NpcMemory := load("res://scripts/npc_memory.gd")
	var mem = NpcMemory.new()
	mem.store_path = "user://memory-live-check.json"
	mem.player_id = PLAYER_ID
	mem.zone = ZONE
	mem.witness = WITNESS
	mem.reset_local()
	# The default 9127 is the shared node-wide lab instance; a lane doing a
	# one-off live check should not restart or repoint a service other
	# lanes may depend on. Point at DREAM_LIVE_NPC_PORT when set (this
	# worktree's own instance, started only for this check) and fall back
	# to the shared default otherwise.
	var port_override := OS.get_environment("DREAM_LIVE_NPC_PORT")
	if port_override != "":
		mem.lab_base_url = "http://127.0.0.1:%s" % port_override
	get_root().add_child(mem)

	# A brand-new SceneTree has processed no frames at all the instant
	# _init() starts running, and a freshly added HTTPRequest child needs
	# one before it will accept a request (its enter-tree notification has
	# not settled yet — verified empirically). Real gameplay never hits
	# this: by the time anything calls record() the game has already been
	# running for many frames. This one frame of wait is purely an artifact
	# of this script calling record() immediately in _init().
	await process_frame

	print("Live NPC Lab check")
	print("lab_base_url = %s" % mem.lab_base_url)
	print("posting 3 events as %s, witnessed by %s in %s ..." % [PLAYER_ID, WITNESS, ZONE])

	mem.record("perfect_dodge", {"attackName": "Focus Beam", "timeOfDay": "day"})
	mem.record("perfect_dodge", {"attackName": "Focus Beam", "timeOfDay": "day"})
	mem.record("heavy_hit", {"damage": 28.0, "targetName": "Hollow Sentinel", "timeOfDay": "day"})

	# The lab POST is fire-and-forget (record() never blocks gameplay), so
	# this gives it a moment to actually land before asking the lab to read
	# it back. A SceneTree script fully controls its own quit(), so it is
	# safe to await a real frame-driven timer here.
	await create_timer(0.75).timeout

	print("recalling as Mireth ...")
	mem.recalled.connect(_on_recalled)
	mem.recall(WITNESS)


func _on_recalled(facts: Array, source: String) -> void:
	print("")
	print("source: %s" % source)
	print("facts recalled: %d" % facts.size())
	for fact in facts:
		print("  " + JSON.stringify(fact))

	var NpcMemory := load("res://scripts/npc_memory.gd")
	var summary: Dictionary = NpcMemory.summarize(facts)
	print("")
	print("summary: " + JSON.stringify(summary))

	var day_line: String = NpcMemory.compose_line("Mireth", summary, "day")
	var night_line: String = NpcMemory.compose_line("Mireth", summary, "night")
	print("")
	print("composed line (day):   %s" % day_line)
	print("composed line (night): %s" % night_line)

	var ok := source == "world memory (Live NPC Lab)" and facts.size() >= 3
	print("")
	print("LIVE CHECK %s: %s" % ["PASSED" if ok else "FAILED",
		"the recall came from world memory and includes the events just posted" if ok
		else "the recall did not come back from the lab with the posted events"])

	quit(0 if ok else 1)
