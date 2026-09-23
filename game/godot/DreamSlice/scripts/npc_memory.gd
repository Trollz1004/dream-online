extends Node

# Mireth's memory link. What she witnesses by day is written into world
# memory; what she recalls by night is read back from the same place, not
# replayed from a script. specs/002-crowdfunding-demo/spec.md, "Memory".
#
# record() writes to a local store immediately and posts to the Live NPC Lab
# (game/server/live-npc-lab) best-effort in the background, so a slow or
# down lab never costs a frame. recall() asks the lab first and falls back
# to the local store, naming its source either way.
#
# recall()'s lab attempt uses HTTPClient directly, polled in a bounded loop,
# rather than an HTTPRequest node driven by _process. That is a deliberate
# trade against Godot's usual non-blocking pattern: this project's headless
# test runner (tests/run_tests.gd) calls every loaded test suite's run()
# synchronously and quits the instant _init() returns, so a signal that only
# resolves on a later engine frame never fires before the process exits
# (verified empirically — see the commit that added this file). recall() is
# a rare, deliberate call (once, at the Nightfall beat), so blocking the
# caller for at most lab_timeout_ms there is an honest trade, not a hidden
# one: it is what makes the fallback path testable without a live lab.
# record()'s POST stays genuinely async, on a disposable HTTPRequest child,
# because it can run every time something happens and must never stall play.

## Emitted once recall() has an answer, from the lab or from the local store.
signal recalled(facts: Array, source: String)

const SOURCE_LAB := "world memory (Live NPC Lab)"
const SOURCE_LOCAL := "local memory"

const _ERROR_STATUSES := [
	HTTPClient.STATUS_CANT_RESOLVE,
	HTTPClient.STATUS_CANT_CONNECT,
	HTTPClient.STATUS_CONNECTION_ERROR,
	HTTPClient.STATUS_TLS_HANDSHAKE_ERROR,
]

# Defaults for the crowdfunding demo. Every one can be overridden per call
# through payload (record) or is read fresh from these fields (recall), so
# the same script still works for a second player or a second witness later.
@export var player_id: String = "player-001"
@export var zone: String = "first-gate"
@export var witness: String = "mireth"
@export var time_of_day: String = "day"
@export var lab_base_url: String = "http://127.0.0.1:9127"
@export var lab_timeout_ms: int = 3000
@export var store_path: String = "user://npc-memory.json"


# Expected payload keys by event type (the world/player lane fills these in;
# npc_memory.gd only requires eventType, everything else is read back as-is
# by summarize() and is optional):
#   perfect_dodge:      { attackName: String }
#   heavy_hit:           { damage: float, targetName: String }
#   skill_used:          { skill: String, damage: float }
#   sentinel_defeated:   { }
#   talked:               { line: String }
func record(event_type: String, payload: Dictionary) -> void:
	var fact := _stamp(event_type, payload)
	var facts := _read_local_facts()
	facts.append(fact)
	_write_local_facts(facts)
	_post_fact_to_lab(fact)


func recall(npc_id: String) -> void:
	var lab_facts = _lab_recall_facts(npc_id)
	if lab_facts != null:
		recalled.emit(lab_facts, SOURCE_LAB)
		return
	recalled.emit(local_facts_for(npc_id), SOURCE_LOCAL)


# What the local store holds for one witness, freshly read from disk every
# time — never a cached copy — so a second instance pointed at the same
# store_path sees what an earlier instance wrote, including across a reload.
func local_facts_for(npc_id: String) -> Array:
	var matched: Array = []
	for fact in _read_local_facts():
		if typeof(fact) == TYPE_DICTIONARY and String(fact.get("witness", "")) == npc_id:
			matched.append(fact)
	return matched


func reset_local() -> void:
	_write_local_facts([])


# Counts per event type, plus the specifics compose_line() needs to speak
# about what actually happened rather than a canned line.
static func summarize(facts: Array) -> Dictionary:
	var counts: Dictionary = {}
	var best_heavy_damage := 0.0
	var sentinel_fell := false
	var skills_used: Dictionary = {}

	for raw_fact in facts:
		if typeof(raw_fact) != TYPE_DICTIONARY:
			continue
		var fact: Dictionary = raw_fact
		var event_type := String(fact.get("eventType", ""))
		counts[event_type] = int(counts.get(event_type, 0)) + 1

		match event_type:
			"heavy_hit":
				var damage := float(fact.get("damage", fact.get("amount", 0.0)))
				if damage > best_heavy_damage:
					best_heavy_damage = damage
			"sentinel_defeated":
				sentinel_fell = true
			"skill_used":
				var skill_name := String(fact.get("skill", "a skill"))
				skills_used[skill_name] = int(skills_used.get(skill_name, 0)) + 1

	return {
		"total": facts.size(),
		"counts": counts,
		"perfect_dodges": int(counts.get("perfect_dodge", 0)),
		"heavy_hits": int(counts.get("heavy_hit", 0)),
		"best_heavy_damage": best_heavy_damage,
		"skills_used": skills_used,
		"sentinel_fell": sentinel_fell,
		"talks": int(counts.get("talked", 0)),
	}


# A natural spoken line in Mireth's voice, built from the summary so it
# changes with the facts: zero dodges, one and several all read differently,
# a heavy blow is named when there was one, and the Sentinel falling is
# never left unsaid. Night lines place her by the old fields and by the day
# she is recalling, so the line never reads as a script replayed at anyone.
static func compose_line(npc_name: String, summary: Dictionary, time_of_day: String) -> String:
	var total := int(summary.get("total", 0))
	if total == 0:
		return "%s: I have watched the old fields since you left, and I remember nothing of you yet." % npc_name

	var dodges := int(summary.get("perfect_dodges", 0))
	var heavy_hits := int(summary.get("heavy_hits", 0))
	var best_damage := float(summary.get("best_heavy_damage", 0.0))
	var sentinel_fell := bool(summary.get("sentinel_fell", false))
	var skills_used: Dictionary = summary.get("skills_used", {})

	var parts := PackedStringArray()

	if time_of_day == "night":
		parts.append("Nightfall has come over the old fields, but I still keep what you showed me by day.")
	else:
		parts.append("I have been watching you today, out across the old fields.")

	if dodges == 0:
		parts.append("You have not slipped a single blow past me yet.")
	elif dodges == 1:
		parts.append("I saw you slip clean through its beam, once, like a held breath.")
	else:
		parts.append("I counted %d clean dodges through its beam — you read that light better each time." % dodges)

	if heavy_hits > 0:
		parts.append("The heaviest blow you landed shook the ground for %d." % int(round(best_damage)))

	if not skills_used.is_empty():
		var skill_names := PackedStringArray(skills_used.keys())
		skill_names.sort()
		parts.append("You called on %s while I watched." % ", ".join(skill_names))

	if sentinel_fell:
		parts.append("And the Sentinel fell before you, stone and bronze and all.")

	return "%s: %s" % [npc_name, " ".join(parts)]


func _stamp(event_type: String, payload: Dictionary) -> Dictionary:
	var fact := payload.duplicate(true)
	fact["eventType"] = event_type
	if not fact.has("timeOfDay"):
		fact["timeOfDay"] = time_of_day
	if not fact.has("witness"):
		fact["witness"] = witness
	if not fact.has("playerId"):
		fact["playerId"] = player_id
	if not fact.has("zone"):
		fact["zone"] = zone
	fact["ts"] = _now_iso()
	return fact


func _now_iso() -> String:
	return Time.get_datetime_string_from_system(true, true) + "Z"


func _read_local_facts() -> Array:
	if not FileAccess.file_exists(store_path):
		return []
	var file := FileAccess.open(store_path, FileAccess.READ)
	if file == null:
		return []
	var text := file.get_as_text()
	file.close()
	if text.strip_edges() == "":
		return []
	var parsed = JSON.parse_string(text)
	if typeof(parsed) == TYPE_ARRAY:
		return parsed
	return []


func _write_local_facts(facts: Array) -> void:
	var file := FileAccess.open(store_path, FileAccess.WRITE)
	if file == null:
		push_error("npc_memory: could not write the local store at " + store_path)
		return
	file.store_string(JSON.stringify(facts))
	file.close()


# Fire-and-forget: a disposable HTTPRequest child that frees itself once the
# POST resolves (or fails). record() never waits on it and never reads its
# result, so a down or slow lab costs nothing but a discarded node. Skipped
# entirely when this node is not in the tree (e.g. a bare .new() in a
# headless test), since an HTTPRequest child cannot process there anyway.
func _post_fact_to_lab(fact: Dictionary) -> void:
	if not is_inside_tree():
		return
	var http := HTTPRequest.new()
	http.timeout = float(lab_timeout_ms) / 1000.0
	add_child(http)
	http.request_completed.connect(func(_result: int, _code: int, _headers: PackedStringArray, _body: PackedByteArray) -> void:
		http.queue_free())

	var body := JSON.stringify({
		"eventType": fact.get("eventType", ""),
		"actorId": fact.get("playerId", player_id),
		"zone": fact.get("zone", zone),
		"payload": fact,
	})
	var err := http.request(lab_base_url + "/npc/event", PackedStringArray(["Content-Type: application/json"]),
		HTTPClient.METHOD_POST, body)
	if err != OK:
		http.queue_free()


# Returns the recalled facts on a 200 from the lab, or null on anything else
# (unreachable, timed out, malformed) so recall() knows to fall back.
func _lab_recall_facts(npc_id: String) -> Variant:
	var query := "/npc/memory?playerId=%s&npcId=%s&zone=%s&scopes=world_event" % [
		player_id.uri_encode(), npc_id.uri_encode(), zone.uri_encode()]
	var response = _lab_get(query, lab_timeout_ms)
	if typeof(response) != TYPE_DICTIONARY or not response.get("ok", false):
		return null

	var facts: Array = []
	for raw_row in response.get("rows", []):
		if typeof(raw_row) == TYPE_DICTIONARY:
			facts.append(_fact_from_lab_row(raw_row))
	return facts


# Normalises a lab response row (eventType/zone/ts/actorId at the top level,
# the rest inside payload) into the same flat shape record() writes locally,
# so summarize() and compose_line() work identically from either source.
func _fact_from_lab_row(row: Dictionary) -> Dictionary:
	var fact: Dictionary = {}
	var payload: Dictionary = row.get("payload", {})
	for key in payload.keys():
		fact[key] = payload[key]
	fact["eventType"] = row.get("eventType", payload.get("eventType", ""))
	fact["zone"] = row.get("zone", payload.get("zone", ""))
	fact["ts"] = row.get("ts", payload.get("ts", ""))
	if not fact.has("timeOfDay"):
		fact["timeOfDay"] = payload.get("timeOfDay", "")
	if not fact.has("witness"):
		fact["witness"] = payload.get("witness", "")
	if not fact.has("playerId"):
		fact["playerId"] = row.get("actorId", payload.get("playerId", ""))
	return fact


func _lab_get(path_and_query: String, timeout_ms: int) -> Variant:
	var hp := _lab_host_port()
	var client := HTTPClient.new()
	if client.connect_to_host(hp["host"], hp["port"]) != OK:
		return null

	var deadline := Time.get_ticks_msec() + timeout_ms
	if not _pump_until(client, [HTTPClient.STATUS_CONNECTED], deadline):
		return null

	if client.request(HTTPClient.METHOD_GET, path_and_query, PackedStringArray(["Accept: application/json"])) != OK:
		return null
	if not _pump_until(client, [HTTPClient.STATUS_BODY, HTTPClient.STATUS_CONNECTED], deadline):
		return null

	var body := PackedByteArray()
	while client.get_status() == HTTPClient.STATUS_BODY:
		client.poll()
		var chunk: PackedByteArray = client.read_response_body_chunk()
		if chunk.size() > 0:
			body.append_array(chunk)
		elif Time.get_ticks_msec() > deadline:
			return null

	if client.get_response_code() != 200:
		return null
	return JSON.parse_string(body.get_string_from_utf8())


func _pump_until(client: HTTPClient, wanted: Array, deadline_ms: int) -> bool:
	while true:
		client.poll()
		var status := client.get_status()
		if wanted.has(status):
			return true
		if _ERROR_STATUSES.has(status):
			return false
		if Time.get_ticks_msec() > deadline_ms:
			return false
		OS.delay_msec(4)
	return false # unreachable: the loop above only exits through a return


func _lab_host_port() -> Dictionary:
	var url := lab_base_url
	var use_tls := url.begins_with("https://")
	url = url.replace("https://", "").replace("http://", "")
	var host := url
	var port := 443 if use_tls else 80

	var slash := url.find("/")
	if slash != -1:
		host = url.substr(0, slash)

	var colon := host.find(":")
	if colon != -1:
		port = host.substr(colon + 1).to_int()
		host = host.substr(0, colon)

	return {"host": host, "port": port}
