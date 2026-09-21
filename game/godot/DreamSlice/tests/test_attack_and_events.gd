extends RefCounted

# Checks for the light attack chain and for the world event envelope.
# Loaded by tests/run_tests.gd so there is still one command to run.

var runner


func run(r) -> void:
	runner = r
	_test_attack_windows()
	_test_attack_chain()
	_test_envelope_shape()
	_test_event_log()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_attack_windows() -> void:
	print("light attack windows")
	var AttackState := load("res://scripts/attack_state.gd")
	var a = AttackState.new()

	check("a fresh attack is idle", not a.is_attacking())
	check("an idle attack lands nothing", not a.is_active())

	a.start()
	check("a started attack is running", a.is_attacking())
	check("the startup lands nothing", not a.is_active())

	a.advance(AttackState.STARTUP + 0.01)
	check("the active window can land a hit", a.is_active())
	check("a hit is only counted once per swing", a.take_hit_window())
	check("the same swing cannot hit twice", not a.take_hit_window())

	a.advance(AttackState.ACTIVE)
	check("after the active window nothing lands", not a.is_active())
	check("the swing is still in recovery", a.is_attacking())

	a.advance(AttackState.RECOVERY)
	check("the swing ends after its full length", not a.is_attacking())


func _test_attack_chain() -> void:
	print("light attack chain")
	var AttackState := load("res://scripts/attack_state.gd")
	var a = AttackState.new()

	check("the first swing is number one", a.next_step() == 1)
	a.start()
	a.advance(AttackState.STARTUP + AttackState.ACTIVE + 0.01)
	check("the cancel window is open during recovery", a.can_chain())
	check("chaining continues the count", a.next_step() == 2)

	a.start()
	check("a chained swing is running", a.is_attacking())
	check("the second swing hits harder than the first",
		a.damage_for_step(2) > a.damage_for_step(1))

	# Letting the recovery run out drops the chain back to the beginning.
	a.advance(AttackState.STARTUP + AttackState.ACTIVE + AttackState.RECOVERY + 0.5)
	check("the chain resets when the window is missed", a.next_step() == 1)


func _test_envelope_shape() -> void:
	print("world event envelope")
	var WorldEvent := load("res://scripts/world_event.gd")
	var event: Dictionary = WorldEvent.perfect_dodge(
		"player-001", "cross-eyed-0001", "openaeye-001", "Focus Beam", "first-gate")

	for field in ["schemaVersion", "eventId", "eventName", "timestamp", "correlationId",
			"region", "involvedEntityIds", "structuredPayload", "privacyClassification",
			"ageModeClassification", "salienceMetadata"]:
		check("the envelope carries %s" % field, event.has(field))

	check("the event is named by the contract", event["eventName"] == "player.perfect_dodge")
	check("the schema version is the contract's", event["schemaVersion"] == "0.1.0")
	check("the timestamp is UTC and ends in Z", (event["timestamp"] as String).ends_with("Z"))
	check("the entity list names the player, the boss and the encounter",
		event["involvedEntityIds"].has("player:player-001")
		and event["involvedEntityIds"].has("npc:openaeye-001")
		and event["involvedEntityIds"].has("encounter:cross-eyed-0001"))

	var payload: Dictionary = event["structuredPayload"]
	for field in ["playerId", "encounterId", "bossId", "attackName", "dodgeResult",
			"iFrameConfirmed", "combatOutcomeId"]:
		check("the payload carries %s" % field, payload.has(field))
	check("the dodge is recorded as perfect", payload["dodgeResult"] == "perfect")
	check("the invulnerability frames are confirmed", payload["iFrameConfirmed"] == true)

	check("nothing in the event is a real-world identity",
		not JSON.stringify(event).to_lower().contains("@"))

	var second: Dictionary = WorldEvent.perfect_dodge(
		"player-001", "cross-eyed-0001", "openaeye-001", "Focus Beam", "first-gate")
	check("each event has its own identifier", second["eventId"] != event["eventId"])


func _test_event_log() -> void:
	print("event log")
	var WorldEvent := load("res://scripts/world_event.gd")
	var EventLog := load("res://scripts/event_log.gd")
	var path := "user://test-world-events.jsonl"
	var log_file = EventLog.new()
	log_file.open(path, true)

	log_file.append(WorldEvent.perfect_dodge("p", "e", "b", "Focus Beam", "first-gate"))
	log_file.append(WorldEvent.perfect_dodge("p", "e", "b", "Focus Beam", "first-gate"))

	var lines := FileAccess.get_file_as_string(path).strip_edges().split("\n")
	check("one line is written per event", lines.size() == 2)

	var parsed = JSON.parse_string(lines[0])
	check("every line is valid JSON on its own", parsed != null and parsed is Dictionary)
	check("the parsed line is the event", parsed["eventName"] == "player.perfect_dodge")

	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
