extends RefCounted

# Checks for the stationary NPC the player can talk to. Added 2026-09-22:
# until now the only other body in the slice was the training dummy, which
# is an enemy, not someone to interact with. Range is plain geometry, like
# the dummy's beam, so the same check can run headless and later on a
# server.

var runner


func run(r) -> void:
	runner = r
	_test_range_check()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_range_check() -> void:
	print("npc interact range")
	var NpcScript := load("res://scripts/npc.gd")
	var npc = NpcScript.new()
	npc.npc_name = "Old Wren"
	npc.dialogue_line = "The fields remember more than the fighters do."

	check("standing close enough is in range", npc.is_within_range(Vector3(1.0, 0.0, 1.0)))
	check("standing far away is out of range", not npc.is_within_range(Vector3(20.0, 0.0, 0.0)))
	check("a height difference does not change the range",
		npc.is_within_range(Vector3(1.0, 50.0, 1.0)))
	npc.free()
