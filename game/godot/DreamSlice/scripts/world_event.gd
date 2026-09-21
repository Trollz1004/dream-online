extends RefCounted

# Builds world events in the envelope of
# specs/001-world-bus-cross-eyed-slice/contracts/world-event-envelope.md.
#
# The envelope is built here and nowhere else, so the game, the tests and any
# later server all produce the same shape. Nothing here may carry a credential,
# a real-world identity, a payment state or a model response.

const SCHEMA_VERSION := "0.1.0"

static var _counter := 0
static var _session := ""


static func _session_token() -> String:
	if _session == "":
		_session = "%06x" % (randi() & 0xFFFFFF)
	return _session


static func _new_id(prefix: String) -> String:
	_counter += 1
	return "%s-%s-%06d" % [prefix, _session_token(), _counter]


static func _now() -> String:
	# UTC, as the contract requires.
	return Time.get_datetime_string_from_system(true, true) + "Z"


static func envelope(event_name: String, region: String, correlation_id: String,
		entity_ids: Array, payload: Dictionary, salience: Dictionary) -> Dictionary:
	return {
		"schemaVersion": SCHEMA_VERSION,
		"eventId": _new_id("evt"),
		"eventName": event_name,
		"timestamp": _now(),
		"correlationId": correlation_id,
		"region": region,
		"involvedEntityIds": entity_ids,
		"structuredPayload": payload,
		"privacyClassification": "game-relevant-only",
		"ageModeClassification": "STANDARD",
		"salienceMetadata": salience,
	}


# The P1 event of the slice: a confirmed invulnerability-frame dodge of a
# telegraphed signature attack.
static func perfect_dodge(player_id: String, encounter_id: String, boss_id: String,
		attack_name: String, region: String) -> Dictionary:
	return envelope(
		"player.perfect_dodge",
		region,
		"enc-" + encounter_id,
		[
			"player:" + player_id,
			"npc:" + boss_id,
			"encounter:" + encounter_id,
		],
		{
			"playerId": player_id,
			"encounterId": encounter_id,
			"bossId": boss_id,
			"attackName": attack_name,
			"dodgeResult": "perfect",
			"iFrameConfirmed": true,
			"combatOutcomeId": _new_id("combat-outcome"),
		},
		{
			"candidateReason": "signature dodge against " + attack_name,
			"reactionEligible": true,
		})
