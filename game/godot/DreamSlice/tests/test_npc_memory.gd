extends RefCounted

# Checks for Mireth's memory link (specs/002-crowdfunding-demo/spec.md,
# "Memory"). These must all pass with no Live NPC Lab running: recall()'s
# lab attempt is pointed at an unreachable port so its fallback is exercised
# for real. The check against the actual running lab lives separately, by
# hand, in tools/memory_live_check.gd — a SceneTree script can use await
# there because it controls its own quit(); this suite cannot, because
# tests/run_tests.gd calls every loaded suite's run() synchronously and
# quits the instant _init() returns, before a later engine frame would ever
# resume a suspended coroutine (verified empirically before this was
# written). That is also why npc_memory.gd's recall() itself is a bounded,
# synchronous call rather than a signal fired from a later frame.

# GDScript lambdas capture outer locals by value, so a `func(...): outer = x`
# closure never actually writes back to the enclosing function's variable.
# This tiny object gives recalled.connect() a real method to call instead,
# so its own fields genuinely hold what the signal handed it.
class RecallReceiver:
	extends RefCounted
	var facts: Array = []
	var source: String = ""

	func on_recalled(received_facts: Array, received_source: String) -> void:
		facts = received_facts
		source = received_source


var runner


func run(r) -> void:
	runner = r
	_test_record_survives_a_reload_from_disk()
	_test_summarize_counts_correctly()
	_test_compose_line_changes_with_the_facts()
	_test_recall_falls_back_to_local_when_the_lab_is_unreachable()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _fresh_memory(path: String):
	var NpcMemory := load("res://scripts/npc_memory.gd")
	var mem = NpcMemory.new()
	mem.store_path = path
	mem.player_id = "player-001"
	mem.zone = "first-gate"
	mem.witness = "mireth"
	mem.reset_local()
	return mem


func _test_record_survives_a_reload_from_disk() -> void:
	print("record survives a reload from disk")
	var path := "user://test-npc-memory.json"
	var first = _fresh_memory(path)

	first.record("perfect_dodge", {"attackName": "Focus Beam", "timeOfDay": "day"})
	first.record("heavy_hit", {"damage": 22.0, "timeOfDay": "day"})

	# A second, unrelated instance, pointed at the same path: if this sees
	# the facts, they came from the disk, not from memory carried in `first`.
	var NpcMemory := load("res://scripts/npc_memory.gd")
	var second = NpcMemory.new()
	second.store_path = path
	second.witness = "mireth"

	var facts: Array = second.local_facts_for("mireth")
	check("both events written by the first instance are on disk for the second",
		facts.size() == 2)
	check("the stored facts keep their event type",
		facts[0]["eventType"] == "perfect_dodge" and facts[1]["eventType"] == "heavy_hit")
	check("the stored facts keep the witness they were stamped with",
		facts[0]["witness"] == "mireth" and facts[1]["witness"] == "mireth")

	first.reset_local()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	first.free()
	second.free()


func _test_summarize_counts_correctly() -> void:
	print("summarize counts correctly")
	var NpcMemory := load("res://scripts/npc_memory.gd")
	var facts: Array = [
		{"eventType": "perfect_dodge", "attackName": "Focus Beam"},
		{"eventType": "perfect_dodge", "attackName": "Focus Beam"},
		{"eventType": "heavy_hit", "damage": 14.0},
		{"eventType": "heavy_hit", "damage": 31.0},
		{"eventType": "sentinel_defeated"},
		{"eventType": "talked"},
	]
	var summary: Dictionary = NpcMemory.summarize(facts)

	check("the total is every fact given", summary["total"] == 6)
	check("perfect dodges are counted", summary["perfect_dodges"] == 2)
	check("heavy hits are counted", summary["heavy_hits"] == 2)
	check("the best heavy hit is the largest one seen, not the last",
		summary["best_heavy_damage"] == 31.0)
	check("the sentinel falling is remembered", summary["sentinel_fell"] == true)


func _test_compose_line_changes_with_the_facts() -> void:
	print("compose_line changes with the facts")
	var NpcMemory := load("res://scripts/npc_memory.gd")

	var no_dodges: Dictionary = NpcMemory.summarize([
		{"eventType": "talked"},
	])
	var two_dodges: Dictionary = NpcMemory.summarize([
		{"eventType": "perfect_dodge"},
		{"eventType": "perfect_dodge"},
		{"eventType": "heavy_hit", "damage": 19.0},
	])

	var line_zero: String = NpcMemory.compose_line("Mireth", no_dodges, "night")
	var line_two: String = NpcMemory.compose_line("Mireth", two_dodges, "night")

	check("a line was actually composed for zero dodges", line_zero != "")
	check("a line was actually composed for two dodges", line_two != "")
	check("the zero-dodge line and the two-dodge line are not the same canned text",
		line_zero != line_two)
	check("the two-dodge line mentions the heavy blow that was landed",
		line_two.contains("19") and line_two.to_lower().contains("blow"))
	check("a night line speaks of the old fields", line_zero.to_lower().contains("old fields"))
	check("a night line speaks of the day", line_zero.to_lower().contains("day"))


func _test_recall_falls_back_to_local_when_the_lab_is_unreachable() -> void:
	print("recall falls back to local memory when the lab is unreachable")
	var path := "user://test-npc-memory-fallback.json"
	var mem = _fresh_memory(path)
	# Nothing listens on 9 in this environment, so the connection is refused
	# almost immediately rather than waiting out the full timeout.
	mem.lab_base_url = "http://127.0.0.1:9"
	mem.lab_timeout_ms = 500

	mem.record("perfect_dodge", {"attackName": "Focus Beam", "timeOfDay": "day"})

	var receiver := RecallReceiver.new()
	mem.recalled.connect(receiver.on_recalled)

	mem.recall("mireth")

	check("the recall names local memory as its source when the lab cannot be reached",
		receiver.source == "local memory")
	check("the recall actually reads back what record() wrote, not an empty stub",
		receiver.facts.size() == 1 and receiver.facts[0]["eventType"] == "perfect_dodge")

	mem.reset_local()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	mem.free()
