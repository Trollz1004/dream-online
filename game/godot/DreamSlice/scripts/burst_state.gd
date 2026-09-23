extends RefCounted

# Nightveil Burst, R. Spec 002 (specs/002-crowdfunding-demo/spec.md): a
# wind-up telegraph, then a single radial shockwave around the player. There
# is no reach or facing to read the way the swings and the lunge have one:
# everything inside the radius when it goes off is caught, so the answer to
# it is space, not an angle. Gated by its own cooldown, the same shape as the
# heavy swing and the lunge.

const STARTUP := 0.30
const ACTIVE := 0.10           # the instant the shockwave is live; brief, but a real window rather than a single frame, so take_hit_window has room to open in
const RECOVERY := 0.35
const COOLDOWN := 8.0          # from the start of the burst, so it outlasts recovery
const STAMINA_COST := 25.0
const DAMAGE := 25.0
const RADIUS := 4.0

var _t := -1.0
var _cooldown_left := 0.0
var _hit_used := false


func total_length() -> float:
	return STARTUP + ACTIVE + RECOVERY


func is_bursting() -> bool:
	return _t >= 0.0


func is_active() -> bool:
	return _t >= STARTUP and _t < STARTUP + ACTIVE


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


# True once per burst, so one shockwave cannot hit the same target twice.
func take_hit_window() -> bool:
	if not is_active() or _hit_used:
		return false
	_hit_used = true
	return true


func cooldown_left() -> float:
	return _cooldown_left


func phase() -> String:
	if _t < 0.0:
		return "cooling" if _cooldown_left > 0.0 else "ready"
	if _t < STARTUP:
		return "windup"
	if _t < STARTUP + ACTIVE:
		return "burst"
	return "recovery"


# Flat-distance check: height is ignored, since the shockwave is a ring
# spreading across the ground rather than a sphere, the same way the swings
# resolve on flat facing rather than a full 3D cone.
static func hits(center: Vector3, target_pos: Vector3) -> bool:
	var flat := Vector3(target_pos.x - center.x, 0.0, target_pos.z - center.z)
	return flat.length() <= RADIUS
