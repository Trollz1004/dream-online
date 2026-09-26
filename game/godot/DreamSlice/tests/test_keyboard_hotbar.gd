extends RefCounted

# Checks for the keyboard hotbar panel: scripts/consumables.gd (the red/blue
# potions and food, kept apart from any drawing so it is unit-testable) and
# scripts/hotbar_layout.gd (the grid math, the cooldown-fraction mapping, the
# viewport clamp and the saved-layout dictionary, also engine-free). Same
# pattern as test_guard.gd and test_skills_new.gd: this class is loaded and
# run from tests/run_tests.gd, which owns the pass/fail count.
# scripts/keycap.gd and scripts/keyboard_panel.gd do the actual drawing and
# input and are judged visually from a --capture picture instead, the same
# way hud.gd's own pixel layout is never unit-tested, only its label text.

var runner


func run(r) -> void:
	runner = r
	_test_red_potion_heals_and_clamps()
	_test_blue_potion_restores_stamina_and_clamps()
	_test_charges_decrement_and_stop_at_zero()
	_test_shared_potion_cooldown_blocks_the_other_potion()
	_test_food_heals_over_time_and_ends()
	_test_food_has_its_own_cooldown()
	_test_cooldown_fraction_maps_from_seconds_left()
	_test_skill_paint_spec_reads_a_real_skill_state()
	_test_skill_paint_spec_reads_a_busy_non_cooling_state()
	_test_drag_position_clamps_inside_the_viewport()
	_test_layout_position_round_trips_through_a_dictionary()
	_test_bindings_encode_and_decode_round_trip()
	_test_swap_bindings()
	_test_panel_geometry_is_sane()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


# ---------------------------------------------------------------------------
# scripts/consumables.gd
# ---------------------------------------------------------------------------

func _test_red_potion_heals_and_clamps() -> void:
	print("red potion heals and clamps at max health")
	var Consumables := load("res://scripts/consumables.gd")
	var c = Consumables.new()

	var healed: float = c.use_red(50.0, 100.0)
	check("the red potion heals for its rated amount",
		absf(healed - (50.0 + Consumables.RED_HEAL)) < 0.001)

	c.advance(Consumables.POTION_COOLDOWN + 0.1)   # clear the shared cooldown the first sip started
	var over: float = c.use_red(90.0, 100.0)
	check("the red potion clamps at max health rather than overhealing",
		absf(over - 100.0) < 0.001)


func _test_blue_potion_restores_stamina_and_clamps() -> void:
	print("blue potion restores stamina and clamps at max stamina")
	var Consumables := load("res://scripts/consumables.gd")
	var c = Consumables.new()

	var restored: float = c.use_blue(40.0, 100.0)
	check("the blue potion restores stamina for its rated amount",
		absf(restored - (40.0 + Consumables.BLUE_STAMINA)) < 0.001)

	c.advance(Consumables.POTION_COOLDOWN + 0.1)   # clear the shared cooldown the first sip started
	var over: float = c.use_blue(80.0, 100.0)
	check("the blue potion clamps at max stamina", absf(over - 100.0) < 0.001)


func _test_charges_decrement_and_stop_at_zero() -> void:
	print("consumable charges decrement and stop at zero")
	var Consumables := load("res://scripts/consumables.gd")
	var c = Consumables.new()

	check("red starts with 5 charges", c.red_charges == Consumables.START_RED)
	check("blue starts with 5 charges", c.blue_charges == Consumables.START_BLUE)
	check("food starts with 3 charges", c.food_charges == Consumables.START_FOOD)

	var health := 10.0
	for i in range(Consumables.START_RED):
		health = c.use_red(health, 1000.0)
		c.advance(Consumables.POTION_COOLDOWN + 0.1)   # clear the shared cooldown between uses
	check("every red charge is spent", c.red_charges == 0)
	check("red cannot be used on an empty stack", not c.can_use_red())

	var health_after_empty := health
	health = c.use_red(health, 1000.0)
	check("using an empty red potion changes nothing", absf(health - health_after_empty) < 0.001)
	check("using an empty red potion does not go negative", c.red_charges == 0)


func _test_shared_potion_cooldown_blocks_the_other_potion() -> void:
	print("the shared potion cooldown blocks the other potion too")
	var Consumables := load("res://scripts/consumables.gd")
	var c = Consumables.new()

	c.use_red(50.0, 100.0)
	check("the potion cooldown starts the instant red is drunk",
		absf(c.potion_cooldown_left() - Consumables.POTION_COOLDOWN) < 0.001)
	check("blue cannot be used while the shared cooldown is running", not c.can_use_blue())

	var before: float = c.blue_charges
	var stamina: float = c.use_blue(50.0, 100.0)
	check("a blocked blue potion changes nothing", absf(stamina - 50.0) < 0.001)
	check("a blocked blue potion does not spend a charge", c.blue_charges == before)

	c.advance(Consumables.POTION_COOLDOWN + 0.1)
	check("the cooldown clears after its own length", c.potion_cooldown_left() <= 0.0)
	check("blue can be used again once the shared cooldown clears", c.can_use_blue())


func _test_food_heals_over_time_and_ends() -> void:
	print("food heals over time, then ends")
	var Consumables := load("res://scripts/consumables.gd")
	var c = Consumables.new()

	check("food starts up", c.use_food())
	check("the food buff is active the instant it starts", c.food_buff_active())
	check("a food charge is spent", c.food_charges == Consumables.START_FOOD - 1)

	var total_healed := 0.0
	var step := 0.1
	var elapsed := 0.0
	while elapsed < Consumables.FOOD_DURATION + 1.0:
		total_healed += c.advance(step)
		elapsed += step

	check("the food buff ends once its duration has passed", not c.food_buff_active())
	var expected: float = Consumables.FOOD_DURATION * Consumables.FOOD_HEAL_PER_SECOND
	check("the food buff heals its full rated total over its duration",
		absf(total_healed - expected) < 0.5)


func _test_food_has_its_own_cooldown() -> void:
	print("food has its own cooldown, separate from the potions")
	var Consumables := load("res://scripts/consumables.gd")

	var c = Consumables.new()
	c.use_food()
	check("using food does not touch the shared potion cooldown", c.potion_cooldown_left() <= 0.0)
	check("a potion can still be used right after food", c.can_use_red())
	check("food cannot be reused until its own cooldown clears", not c.can_use_food())

	var c2 = Consumables.new()
	c2.use_red(50.0, 100.0)
	check("using a potion does not touch the food cooldown", c2.food_cooldown_left() <= 0.0)
	check("food can still be used right after a potion", c2.can_use_food())

	c.advance(Consumables.FOOD_COOLDOWN + 0.1)
	check("food's own cooldown clears after its own length", c.food_cooldown_left() <= 0.0)
	check("food can be used again once its own cooldown clears", c.can_use_food())


# ---------------------------------------------------------------------------
# scripts/hotbar_layout.gd
# ---------------------------------------------------------------------------

func _test_cooldown_fraction_maps_from_seconds_left() -> void:
	print("cooldown fraction maps seconds-left over a skill's own cooldown length")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")

	check("a cooldown that has fully elapsed reads as zero",
		HotbarLayout.cooldown_fraction(0.0, 10.0) == 0.0)
	check("a cooldown that just started reads as one",
		HotbarLayout.cooldown_fraction(10.0, 10.0) == 1.0)
	check("a cooldown halfway through reads as one half",
		absf(HotbarLayout.cooldown_fraction(5.0, 10.0) - 0.5) < 0.001)
	check("a zero-length cooldown never divides by zero",
		HotbarLayout.cooldown_fraction(3.0, 0.0) == 0.0)
	check("the fraction never reads over one even with a stale seconds-left",
		HotbarLayout.cooldown_fraction(99.0, 10.0) == 1.0)


func _test_skill_paint_spec_reads_a_real_skill_state() -> void:
	print("the paint spec reads a real skill's cooldown while it is cooling and once ready")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")
	var DashState := load("res://scripts/dash_state.gd")
	var d = DashState.new()

	d.start()
	# The cooldown starts ticking the instant start() is called, alongside the
	# dash's own animation timer (dash_state.gd's advance() reduces both by the
	# same delta) -- so only a hair past the animation's own length is added,
	# leaving most of DashState.COOLDOWN still running rather than also
	# exhausting it in the same breath.
	d.advance(d.total_length() + 0.02)
	check("the dash is cooling after its full length has passed", d.phase() == "cooling")

	var spec: Dictionary = HotbarLayout.skill_paint_spec(d, DashState.COOLDOWN)
	check("the paint spec is not ready while cooling", spec["ready_now"] == false)
	check("the paint spec shows a seconds countdown while cooling", spec["show_seconds"] == true)
	check("the paint spec's fraction matches the dash's own cooldown_left over its total",
		absf(spec["fraction"] - (d.cooldown_left() / DashState.COOLDOWN)) < 0.001)

	d.advance(DashState.COOLDOWN)
	check("the dash is ready once the cooldown has fully elapsed", d.phase() == "ready")
	var spec2: Dictionary = HotbarLayout.skill_paint_spec(d, DashState.COOLDOWN)
	check("the paint spec reads ready once the skill is ready", spec2["ready_now"] == true)
	check("a ready key has no sweep left", spec2["fraction"] == 0.0)
	check("a ready key shows no seconds countdown", spec2["show_seconds"] == false)


func _test_skill_paint_spec_reads_a_busy_non_cooling_state() -> void:
	print("the paint spec reads a skill that is mid-use, not cooling by the clock, as fully dark")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")
	var GuardState := load("res://scripts/guard_state.gd")
	var g = GuardState.new()

	g.start()
	check("a just-started guard is not in the cooling phase yet", g.phase() != "cooling")
	var spec: Dictionary = HotbarLayout.skill_paint_spec(g, GuardState.COOLDOWN)
	check("a mid-use key reads as not ready", spec["ready_now"] == false)
	check("a mid-use key reads as a full dark sweep", spec["fraction"] == 1.0)
	check("a mid-use key shows no seconds countdown -- it is not cooling by the clock yet",
		spec["show_seconds"] == false)


# ---------------------------------------------------------------------------
# Dragging and the saved layout
# ---------------------------------------------------------------------------

func _test_drag_position_clamps_inside_the_viewport() -> void:
	print("dragging the panel clamps its position inside the viewport")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")
	var panel_size := Vector2(300.0, 200.0)
	var viewport_size := Vector2(1920.0, 1080.0)

	var inside: Vector2 = HotbarLayout.clamp_position(Vector2(100.0, 100.0), panel_size, viewport_size)
	check("a position already inside the viewport is left alone",
		inside.is_equal_approx(Vector2(100.0, 100.0)))

	var off_left: Vector2 = HotbarLayout.clamp_position(Vector2(-500.0, -500.0), panel_size, viewport_size)
	check("a position off the top-left clamps to the origin", off_left.is_equal_approx(Vector2.ZERO))

	var off_right: Vector2 = HotbarLayout.clamp_position(Vector2(5000.0, 5000.0), panel_size, viewport_size)
	check("a position off the bottom-right clamps so the panel stays fully on screen",
		off_right.is_equal_approx(viewport_size - panel_size))

	var tiny_viewport: Vector2 = HotbarLayout.clamp_position(Vector2(50.0, 50.0), panel_size, Vector2(100.0, 50.0))
	check("a viewport smaller than the panel never clamps to a negative position",
		tiny_viewport.x >= 0.0 and tiny_viewport.y >= 0.0)


func _test_layout_position_round_trips_through_a_dictionary() -> void:
	print("the saved position round-trips through a plain dictionary")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")
	var pos := Vector2(123.5, 77.0)
	var data: Dictionary = HotbarLayout.layout_to_dict(pos)
	var restored: Vector2 = HotbarLayout.position_from_dict(data, Vector2(0.0, 0.0))
	check("the position saved and loaded again matches exactly", restored.is_equal_approx(pos))

	var fallback := Vector2(24.0, 460.0)
	var missing: Vector2 = HotbarLayout.position_from_dict({}, fallback)
	check("a missing saved position falls back to the given default", missing.is_equal_approx(fallback))


func _test_bindings_encode_and_decode_round_trip() -> void:
	print("consumable bindings round-trip through the saved string")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")
	var bindings := {"1": "red", "2": "blue", "3": "food"}
	var encoded: String = HotbarLayout.encode_bindings(bindings)
	var decoded: Dictionary = HotbarLayout.decode_bindings(encoded)
	check("every binding survives the round trip", decoded.size() == bindings.size())
	for k in bindings.keys():
		check("binding %s survives the round trip" % k, decoded.get(k, "") == bindings[k])

	check("an empty binding set encodes to an empty string", HotbarLayout.encode_bindings({}) == "")
	check("an empty string decodes to an empty binding set", HotbarLayout.decode_bindings("").is_empty())


func _test_swap_bindings() -> void:
	print("dragging a keycap's contents onto another keycap swaps the bindings")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")
	var bindings := {"1": "red", "2": "blue", "3": "food"}

	var swapped: Dictionary = HotbarLayout.swap_bindings(bindings, "1", "2")
	check("the two bound keys trade places", swapped["1"] == "blue" and swapped["2"] == "red")
	check("a key untouched by the swap keeps its own binding", swapped["3"] == "food")

	var moved: Dictionary = HotbarLayout.swap_bindings(bindings, "1", "5")
	check("dragging onto an empty key moves the item there", moved["5"] == "red")
	check("the source key is cleared once its item has moved", not moved.has("1"))


func _test_panel_geometry_is_sane() -> void:
	print("the panel's own geometry is internally consistent")
	var HotbarLayout := load("res://scripts/hotbar_layout.gd")

	var content: Vector2 = HotbarLayout.content_size()
	var total: Vector2 = HotbarLayout.panel_total_size()
	check("the panel is wider and taller than its own content, for the margin and grip",
		total.x > content.x and total.y > content.y)
	check("the number row (six keys) sets the panel's width",
		absf(HotbarLayout.grid_width() - (6.0 * HotbarLayout.step() - HotbarLayout.KEY_GAP)) < 0.01)

	var q_pos: Vector2 = HotbarLayout.key_local_position(1, 0)
	var w_pos: Vector2 = HotbarLayout.key_local_position(1, 1)
	check("keys in the same row are laid out left to right", w_pos.x > q_pos.x)
	check("keys in the same row share the same row height", absf(w_pos.y - q_pos.y) < 0.001)

	var row0: Vector2 = HotbarLayout.key_local_position(0, 0)
	var row1: Vector2 = HotbarLayout.key_local_position(1, 0)
	check("the second row sits below the first, like a real keyboard", row1.y > row0.y)
