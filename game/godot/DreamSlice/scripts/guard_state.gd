extends RefCounted

# The guard stance, Q alone. A short active window that blocks most of a hit
# instead of dodging it clean the way the dash does; the trade is that it
# costs no travel and can be held near a target, but it still leaves a real
# opening in recovery and a cooldown before it can be raised again.

const STARTUP := 0.08
const ACTIVE := 0.45
const RECOVERY := 0.25
const COOLDOWN := 1.10        # from the start of the stance, so it outlasts recovery
const STAMINA_COST := 15.0
const BLOCK_REDUCTION := 0.75  # of the incoming hit is absorbed while active

var _t := -1.0
var _cooldown_left := 0.0


func total_length() -> float:
	return STARTUP + ACTIVE + RECOVERY


func is_guarding() -> bool:
	return _t >= 0.0


func is_active() -> bool:
	return _t >= STARTUP and _t < STARTUP + ACTIVE


func can_start(stamina: float) -> bool:
	return not is_guarding() and _cooldown_left <= 0.0 and stamina >= STAMINA_COST


func start() -> void:
	_t = 0.0
	_cooldown_left = COOLDOWN


func advance(delta: float) -> void:
	if _t >= 0.0:
		_t += delta
		if _t >= total_length():
			_t = -1.0
	_cooldown_left = maxf(0.0, _cooldown_left - delta)


func cooldown_left() -> float:
	return _cooldown_left


func phase() -> String:
	if _t < 0.0:
		return "cooling" if _cooldown_left > 0.0 else "ready"
	if _t < STARTUP:
		return "raising"
	if _t < STARTUP + ACTIVE:
		return "guarding"
	return "recovering"


# 0..1 through the stance's own timeline, for character_model.gd's pose
# functions. 0.0 when idle or cooling.
func progress() -> float:
	if _t < 0.0:
		return 0.0
	return clampf(_t / total_length(), 0.0, 1.0)
