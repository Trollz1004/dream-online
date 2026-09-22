extends RefCounted

# The heavy attack, right mouse button. One committed swing, slower and
# harder than the light chain, gated by its own cooldown rather than a cancel
# window, so it cannot be spammed the way a chained light swing can.

const STARTUP := 0.28
const ACTIVE := 0.14
const RECOVERY := 0.50
const COOLDOWN := 1.20        # from the start of the swing, so it outlasts recovery
const STAMINA_COST := 18.0
const DAMAGE := 32.0
const REACH := 3.6           # metres in front of the character
const HALF_ARC := 0.8        # radians either side of facing

var _t := -1.0
var _cooldown_left := 0.0
var _hit_used := false


func total_length() -> float:
	return STARTUP + ACTIVE + RECOVERY


func is_attacking() -> bool:
	return _t >= 0.0


func is_active() -> bool:
	return _t >= STARTUP and _t < STARTUP + ACTIVE


func can_start(stamina: float) -> bool:
	return not is_attacking() and _cooldown_left <= 0.0 and stamina >= STAMINA_COST


func start() -> void:
	_t = 0.0
	_hit_used = false
	_cooldown_left = COOLDOWN


func advance(delta: float) -> void:
	if _t >= 0.0:
		_t += delta
		if _t >= total_length():
			_t = -1.0
	_cooldown_left = maxf(0.0, _cooldown_left - delta)


# True once per swing, so one swing cannot hit the same target twice.
func take_hit_window() -> bool:
	if not is_active() or _hit_used:
		return false
	_hit_used = true
	return true


func phase() -> String:
	if _t < 0.0:
		return "cooling" if _cooldown_left > 0.0 else "ready"
	if _t < STARTUP:
		return "winding up"
	if _t < STARTUP + ACTIVE:
		return "striking"
	return "recovering"
