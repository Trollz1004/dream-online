extends RefCounted

# The light attack chain. Swings are short, they chain when the next swing is
# entered during the recovery of the last one, and a missed window drops the
# chain back to the first swing. Chains are where damage comes from, which is
# the pattern recorded in docs/gdd/02-action-combat.md.

const STARTUP := 0.10
const ACTIVE := 0.12
const RECOVERY := 0.34
const MAX_STEPS := 3
const STAMINA_COST := 8.0
const REACH := 3.4          # metres in front of the character
const HALF_ARC := 0.9       # radians either side of facing

var _t := -1.0
var _step := 0
var _hit_used := false


func total_length() -> float:
	return STARTUP + ACTIVE + RECOVERY


func is_attacking() -> bool:
	return _t >= 0.0


func is_active() -> bool:
	return _t >= STARTUP and _t < STARTUP + ACTIVE


# The cancel window: the next swing may be entered once this one has stopped
# being dangerous and before it has finished recovering.
func can_chain() -> bool:
	return is_attacking() and _t >= STARTUP + ACTIVE


func next_step() -> int:
	if is_attacking():
		return mini(_step + 1, MAX_STEPS)
	return 1


func step() -> int:
	return _step


func can_start(stamina: float) -> bool:
	if stamina < STAMINA_COST:
		return false
	if not is_attacking():
		return true
	return can_chain()


func start() -> void:
	_step = next_step()
	_t = 0.0
	_hit_used = false


func advance(delta: float) -> void:
	if _t < 0.0:
		return
	_t += delta
	if _t >= total_length():
		# The window was missed, so the chain is lost.
		_t = -1.0
		_step = 0


# True once per swing, so one swing cannot hit the same target twice.
func take_hit_window() -> bool:
	if not is_active() or _hit_used:
		return false
	_hit_used = true
	return true


func damage_for_step(step_number: int) -> float:
	match step_number:
		1:
			return 10.0
		2:
			return 14.0
		_:
			return 21.0


func phase() -> String:
	if _t < 0.0:
		return "ready"
	if _t < STARTUP:
		return "winding up"
	if _t < STARTUP + ACTIVE:
		return "striking"
	return "recovering"


# 0..1 through the swing's own timeline, for character_model.gd's pose
# functions. 0.0 when idle, so a caller never has to branch on is_attacking()
# first just to get a safe value.
func progress() -> float:
	if _t < 0.0:
		return 0.0
	return clampf(_t / total_length(), 0.0, 1.0)
