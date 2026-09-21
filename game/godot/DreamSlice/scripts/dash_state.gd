extends RefCounted

# The dash with invulnerability frames. Ruled by Joshua on 2026-09-20:
# the dash is the real defence in player against player fighting, it is
# vulnerable on startup, invulnerable through the travel, and wide open
# through the recovery, so a mistimed dash loses the trade.
#
# This class holds the timing only. It knows nothing about the engine, so the
# windows can be tested headlessly and the server can run the identical rules.

const STARTUP := 0.06        # seconds, still hittable
const INVULNERABLE := 0.25   # seconds, cannot be hit
const RECOVERY := 0.30       # seconds, wide open
const COOLDOWN := 0.90       # seconds from the start of one dash to the next
const STAMINA_COST := 25.0
const SPEED := 14.0          # metres per second through the travel

var _t := -1.0               # seconds since this dash started, -1.0 when idle
var _cooldown_left := 0.0


func total_length() -> float:
	return STARTUP + INVULNERABLE + RECOVERY


func can_start(stamina: float) -> bool:
	return _t < 0.0 and _cooldown_left <= 0.0 and stamina >= STAMINA_COST


func start() -> void:
	_t = 0.0
	_cooldown_left = COOLDOWN


func advance(delta: float) -> void:
	if _t >= 0.0:
		_t += delta
		if _t >= total_length():
			_t = -1.0
	_cooldown_left = maxf(0.0, _cooldown_left - delta)


func is_dashing() -> bool:
	return _t >= 0.0


func is_invulnerable() -> bool:
	return _t >= STARTUP and _t < STARTUP + INVULNERABLE


func cooldown_left() -> float:
	return _cooldown_left


func phase() -> String:
	if _t < 0.0:
		return "cooling" if _cooldown_left > 0.0 else "ready"
	if _t < STARTUP:
		return "startup"
	if _t < STARTUP + INVULNERABLE:
		return "invulnerable"
	return "recovery"
