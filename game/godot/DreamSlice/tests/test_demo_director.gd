extends RefCounted

# Checks for scripts/demo_director.gd's pure camera-timing helpers. Spec 003
# lever 5 asks for "weighted" camera moves -- eased in and out rather than
# gliding at one constant speed, which is what a plain linear lerp(f) always
# reads as. ease_in_out(f) is the pure function the director's own movers
# (_play_shot, _orbit_player) run their 0..1 progress through before it ever
# touches a lerp; kept static and side-effect free so it can be checked here
# without a camera, a world or a live SceneTree, the same shape as
# BurstState.hits() in test_skills_new.gd.

var runner


func run(r) -> void:
	runner = r
	_test_ease_endpoints()
	_test_ease_is_weighted_toward_the_middle()
	_test_ease_is_monotonic()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_ease_endpoints() -> void:
	print("camera easing holds its endpoints")
	var DemoDirector := load("res://scripts/demo_director.gd")
	check("ease_in_out(0.0) is exactly 0.0", DemoDirector.ease_in_out(0.0) == 0.0)
	check("ease_in_out(1.0) is exactly 1.0", DemoDirector.ease_in_out(1.0) == 1.0)
	check("ease_in_out(0.5) is exactly the midpoint, by symmetry",
		absf(DemoDirector.ease_in_out(0.5) - 0.5) < 0.0001)


# The weighting spec 003 lever 5 asks for: slow at the start and slow at the
# end, so the shot reads as something a camera operator eased into rather
# than a robotic constant-speed glide. A quarter of the way through the
# shot's own duration, a weighted move has covered less than a quarter of the
# distance; three-quarters of the way through, by the same symmetry, it has
# covered more than three-quarters.
func _test_ease_is_weighted_toward_the_middle() -> void:
	print("camera easing is slow at both ends, not linear")
	var DemoDirector := load("res://scripts/demo_director.gd")
	check("a quarter into the move covers less than a quarter of the distance",
		DemoDirector.ease_in_out(0.25) < 0.25)
	check("three-quarters into the move covers more than three-quarters of the distance",
		DemoDirector.ease_in_out(0.75) > 0.75)


func _test_ease_is_monotonic() -> void:
	print("camera easing never runs backward")
	var DemoDirector := load("res://scripts/demo_director.gd")
	var prev := -1.0
	var monotonic := true
	for i in range(21):
		var f: float = float(i) / 20.0
		var eased: float = DemoDirector.ease_in_out(f)
		if eased < prev:
			monotonic = false
		prev = eased
	check("ease_in_out never decreases as f rises from 0 to 1", monotonic)
