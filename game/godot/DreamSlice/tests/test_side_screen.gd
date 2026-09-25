extends RefCounted

# Checks for keeping capture and demo windows off Joshua's main screen. Added
# 2026-09-24: every capture a worker took opened the game on his primary
# monitor and took the keyboard away from whatever he was doing.

var runner


func run(r) -> void:
	runner = r
	_test_pick_screen()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_pick_screen() -> void:
	print("side screen")
	var SideScreen := load("res://scripts/side_screen.gd")
	check("with two screens and the first primary, the second is picked", SideScreen.pick_screen(2, 0) == 1)
	check("with two screens and the second primary, the first is picked", SideScreen.pick_screen(2, 1) == 0)
	check("with one screen there is no side screen", SideScreen.pick_screen(1, 0) == -1)
	check("with three screens the first non-primary one is picked", SideScreen.pick_screen(3, 0) == 1)
