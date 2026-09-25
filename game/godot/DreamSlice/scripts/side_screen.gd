extends RefCounted

# Keeps capture and demo windows off Joshua's main screen. Added 2026-09-24:
# every capture a worker took opened the game on his primary monitor and took
# the keyboard away from whatever he was doing. Capture and demo runs now open
# on the first screen that is not the primary one, and never take focus.
# Interactive play is untouched.


# The first screen that is not the primary one, or -1 when there is only one.
static func pick_screen(screen_count: int, primary: int) -> int:
	for s in screen_count:
		if s != primary:
			return s
	return -1


static func apply(win: Window) -> void:
	win.set_flag(Window.FLAG_NO_FOCUS, true)
	var side := pick_screen(DisplayServer.get_screen_count(), DisplayServer.get_primary_screen())
	if side < 0:
		return
	win.mode = Window.MODE_WINDOWED
	win.current_screen = side
	win.position = DisplayServer.screen_get_position(side)
