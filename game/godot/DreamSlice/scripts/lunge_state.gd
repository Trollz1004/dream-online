extends RefCounted

# Dream Lunge, W+F. Spec 002 (specs/002-crowdfunding-demo/spec.md): a forward
# gap-closing thrust that covers 6 metres in 0.25 seconds. A short vulnerable
# startup, a fast travel that carries the one hit window, then a recovery
# that is wide open, the same shape as the heavy swing: gated by its own
# cooldown rather than a cancel window, so it cannot be chained the way the
# light swings are.

const STARTUP := 0.08
const TRAVEL := 0.25
const RECOVERY := 0.22
const COOLDOWN := 4.0          # from the start of the lunge, so it outlasts recovery
const STAMINA_COST := 20.0
const DAMAGE := 18.0
const TRAVEL_DISTANCE := 6.0
const REACH := 6.5             # metres in front of the character: a little past the travel, so a target near the far end of the thrust is still caught
const HALF_ARC := 0.35         # radians either side of facing: a narrow thrust, not a sweep

var _t := -1.0
var _cooldown_left := 0.0
var _hit_used := false


func total_length() -> float:
	return STARTUP + TRAVEL + RECOVERY


func is_lunging() -> bool:
	return _t >= 0.0


# "Active" here means travelling: the only window the thrust can land in.
func is_active() -> bool:
	return _t >= STARTUP and _t < STARTUP + TRAVEL


func can_start(stamina: float) -> bool:
	return _t < 0.0 and _cooldown_left <= 0.0 and stamina >= STAMINA_COST


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


# True once per lunge, so one thrust cannot hit the same target twice.
func take_hit_window() -> bool:
	if not is_active() or _hit_used:
		return false
	_hit_used = true
	return true


func travel_speed() -> float:
	return TRAVEL_DISTANCE / TRAVEL


func cooldown_left() -> float:
	return _cooldown_left


func phase() -> String:
	if _t < 0.0:
		return "cooling" if _cooldown_left > 0.0 else "ready"
	if _t < STARTUP:
		return "startup"
	if _t < STARTUP + TRAVEL:
		return "travel"
	return "recovery"
