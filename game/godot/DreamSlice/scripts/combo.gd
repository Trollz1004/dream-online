extends RefCounted

# The combo grammar, ruled by Joshua on 2026-09-20 and corrected by him the same
# evening. A direction with Shift is movement and nothing else. A skill is a
# direction, an optional Shift, and one action key. Every distinct set of keys is
# its own separate skill, and the Shift is part of the set, so W + F and
# W + Shift + F are two skills rather than one skill pressed two ways.

const MOVEMENT := "MOVEMENT"
const ACTION_KEYS := ["Q", "E", "R", "F", "Z", "C", "LMB", "RMB"]
const DIRECTIONS := ["W", "A", "S", "D"]


# Returns the skill identifier for a key set, or MOVEMENT when the set carries
# no action key and is therefore movement.
static func resolve(direction: String, shift: bool, action_key: String) -> String:
	if not ACTION_KEYS.has(action_key):
		return MOVEMENT
	var parts := PackedStringArray()
	if direction != "":
		parts.append(direction)
	if shift:
		parts.append("SHIFT")
	parts.append(action_key)
	return "+".join(parts)
