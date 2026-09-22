extends RefCounted

# Checks for the heavy attack, right mouse button. Added 2026-09-22: the input
# table in docs/gdd/02-action-combat.md has named right mouse "Heavy attack /
# class special" from the start, but nothing behind it ever did anything; it
# fell through to the unnamed-skill stub like every other unbuilt combo. One
# committed swing, slower and harder than the light chain, gated by its own
# cooldown rather than a cancel window, so it cannot be spammed the way a
# chained light swing can.

var runner


func run(r) -> void:
	runner = r
	_test_heavy_attack_windows()
	_test_heavy_attack_cooldown()
	_test_heavy_hits_harder_than_a_first_light_swing()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_heavy_attack_windows() -> void:
	print("heavy attack windows")
	var HeavyAttackState := load("res://scripts/heavy_attack_state.gd")
	var h = HeavyAttackState.new()

	check("a fresh heavy attack is idle", not h.is_attacking())
	check("an idle heavy attack lands nothing", not h.is_active())
	check("a fresh heavy attack can start with enough stamina", h.can_start(100.0))
	check("a fresh heavy attack cannot start on no stamina", not h.can_start(0.0))

	h.start()
	check("a started heavy attack is running", h.is_attacking())
	check("the startup lands nothing", not h.is_active())

	h.advance(HeavyAttackState.STARTUP + 0.01)
	check("the active window can land a hit", h.is_active())
	check("a hit is only counted once per swing", h.take_hit_window())
	check("the same swing cannot hit twice", not h.take_hit_window())

	h.advance(HeavyAttackState.ACTIVE)
	check("after the active window nothing lands", not h.is_active())
	check("the swing is still in recovery", h.is_attacking())

	h.advance(HeavyAttackState.RECOVERY)
	check("the swing ends after its full length", not h.is_attacking())


func _test_heavy_attack_cooldown() -> void:
	print("heavy attack cooldown")
	var HeavyAttackState := load("res://scripts/heavy_attack_state.gd")
	var h = HeavyAttackState.new()

	h.start()
	h.advance(HeavyAttackState.STARTUP + HeavyAttackState.ACTIVE + HeavyAttackState.RECOVERY + 0.01)
	check("the swing has ended", not h.is_attacking())
	check("a fresh swing cannot start during the cooldown", not h.can_start(100.0))
	check("the phase names the cooldown", h.phase() == "cooling")

	h.advance(HeavyAttackState.COOLDOWN)
	check("a fresh swing can start once the cooldown clears", h.can_start(100.0))
	check("the phase is ready again", h.phase() == "ready")


func _test_heavy_hits_harder_than_a_first_light_swing() -> void:
	print("heavy attack damage")
	var HeavyAttackState := load("res://scripts/heavy_attack_state.gd")
	var AttackState := load("res://scripts/attack_state.gd")
	check("a heavy swing outdamages the first light swing",
		HeavyAttackState.DAMAGE > AttackState.new().damage_for_step(1))
