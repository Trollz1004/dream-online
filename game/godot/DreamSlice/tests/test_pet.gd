extends RefCounted

# Checks for GeminEYE, the timed companion pet (Joshua's idea, 2026-09-25):
# scripts/pet_state.gd (timer, life/death, looting, skins) and
# scripts/pet_shop.gd (the demo NEEDs balance and its two purchases). Pure
# logic only, no Node, no Control, no live SceneTree -- the same shape
# test_guard.gd and test_heavy_attack.gd already use for the combat states.

var runner


func run(r) -> void:
	runner = r
	_test_timer_counts_down_and_dies_at_zero()
	_test_dead_pet_stops_looting_and_shows_the_tombstone_flag()
	_test_extending_adds_an_hour_and_costs_fifty_needs()
	_test_cannot_buy_with_too_few_needs()
	_test_choosing_a_skin_changes_the_pets_colours()
	_test_loot_pickup_increments_the_count_and_shows_the_bubble()
	_test_world_wires_pets_capture_only_cmdline_flags()


func check(label: String, condition: bool) -> void:
	runner.check(label, condition)


func _test_timer_counts_down_and_dies_at_zero() -> void:
	print("GeminEYE life timer")
	var PetState := load("res://scripts/pet_state.gd")
	var pet = PetState.new(10.0)

	check("a fresh pet is alive", not pet.is_dead())
	check("the timer starts at the life it was given", pet.life_seconds == 10.0)
	check("the timer label reads minutes:seconds", pet.time_label() == "0:10")

	pet.advance(4.0)
	check("the timer counts down", pet.life_seconds == 6.0)
	check("still alive with time left", not pet.is_dead())

	pet.advance(6.0)
	check("the timer reaches zero, not negative", pet.life_seconds == 0.0)
	check("the pet is dead once the timer reaches zero", pet.is_dead())

	pet.advance(5.0)
	check("advancing a dead pet does not go negative", pet.life_seconds == 0.0)


func _test_dead_pet_stops_looting_and_shows_the_tombstone_flag() -> void:
	print("a dead GeminEYE stops looting and shows RIP")
	var PetState := load("res://scripts/pet_state.gd")
	var pet = PetState.new(1.0)

	pet.start_looting()
	check("a live pet can start looting", pet.looting)

	pet.advance(2.0)
	check("the pet is dead once its time runs out", pet.is_dead())
	check("a dead pet is not looting", not pet.looting)
	check("a dead pet's timer label is RIP -- the tombstone flag", pet.time_label() == "RIP")

	pet.start_looting()
	check("a dead pet cannot be told to start looting", not pet.looting)
	pet.collect_loot()
	check("a dead pet cannot collect loot either", pet.loot_count == 0)


func _test_extending_adds_an_hour_and_costs_fifty_needs() -> void:
	print("extending GeminEYE costs 50 NEEDs and adds an hour")
	var PetState := load("res://scripts/pet_state.gd")
	var PetShop := load("res://scripts/pet_shop.gd")
	var pet = PetState.new(30.0)
	var shop = PetShop.new(100)

	check("the extend item costs 50 NEEDs", PetShop.EXTEND_COST == 50)
	var bought: bool = shop.buy_extend(pet)
	check("the purchase succeeds with enough NEEDs", bought)
	check("an hour (3600s) was added to the timer", pet.life_seconds == 30.0 + 3600.0)
	check("50 NEEDs were spent", shop.needs_balance == 50)

	# A dead pet extended back to life -- the shop is the way back from the
	# tombstone, not a dead end needing a fresh pet.
	var dead_pet = PetState.new(0.0)
	dead_pet.advance(0.1)
	check("the second pet is dead", dead_pet.is_dead())
	shop.buy_extend(dead_pet)
	check("extending a dead pet revives it", not dead_pet.is_dead())


func _test_cannot_buy_with_too_few_needs() -> void:
	print("too few NEEDs refuses every purchase")
	var PetState := load("res://scripts/pet_state.gd")
	var PetShop := load("res://scripts/pet_shop.gd")
	var pet = PetState.new(30.0)
	var shop = PetShop.new(10)   # far short of the 50 NEEDs extend costs

	check("the shop starts unable to afford the extend", not shop.can_afford(PetShop.EXTEND_COST))
	var bought: bool = shop.buy_extend(pet)
	check("the extend purchase is refused", not bought)
	check("the timer is untouched", pet.life_seconds == 30.0)
	check("no NEEDs were spent on a refused purchase", shop.needs_balance == 10)

	var skin_bought: bool = shop.buy_skin(pet, "void")
	check("a skin purchase is refused with too few NEEDs", not skin_bought)
	check("the skin never changed on a refused purchase", pet.skin == PetState.SKIN_DEFAULT)


func _test_choosing_a_skin_changes_the_pets_colours() -> void:
	print("choosing a skin changes GeminEYE's colours")
	var PetState := load("res://scripts/pet_state.gd")
	var PetShop := load("res://scripts/pet_shop.gd")
	var pet = PetState.new(30.0)
	var default_shell: Color = pet.shell_colour()
	var default_eye: Color = pet.eye_colour()

	var shop = PetShop.new(200)
	check("void costs more than ember (rarer colour)", PetShop.SKIN_COSTS["void"] > PetShop.SKIN_COSTS["ember"])

	var bought: bool = shop.buy_skin(pet, "ember")
	check("the ember skin purchase succeeds with enough NEEDs", bought)
	check("the pet actually wears the ember skin now", pet.skin == "ember")
	check("the shell colour actually changed", pet.shell_colour() != default_shell)
	check("the eye colour actually changed", pet.eye_colour() != default_eye)
	check("NEEDs were spent on the skin", shop.needs_balance == 200 - PetShop.SKIN_COSTS["ember"])

	var frost_bought: bool = shop.buy_skin(pet, "frost")
	check("a second, different skin purchase also succeeds", frost_bought)
	check("the pet now wears frost, not ember", pet.skin == "frost")
	check("frost's colours differ from ember's", pet.shell_colour() != PetState.SKIN_COLOURS["ember"]["shell"])


func _test_loot_pickup_increments_the_count_and_shows_the_bubble() -> void:
	print("collecting a loot glint increments the count and shows the bubble")
	var PetState := load("res://scripts/pet_state.gd")
	var pet = PetState.new(30.0)

	check("a fresh pet has looted nothing", pet.loot_count == 0)
	check("a fresh pet has no bubble text", pet.bubble_text == "")

	pet.start_looting()
	check("looting shows the Looting bubble", pet.bubble_text == "Looting...")
	check("looting is flagged true", pet.looting)

	pet.collect_loot()
	check("collecting increments the loot count", pet.loot_count == 1)
	check("collecting shows a reward bubble", pet.bubble_text == "+1 Dreamshard")
	check("collecting clears the looting flag", not pet.looting)

	pet.start_looting()
	pet.collect_loot(1)
	check("a second pickup counts up, not resets", pet.loot_count == 2)


# world.gd's own cmdline parsing is the one place these flags are wired
# (--pet-time for a short-lived pet so a capture can show the tombstone
# without waiting an hour; --pet-loot-demo and --pet-shop-open so a
# capture can show the Looting bubble and the shop panel with no fight
# staged and no key press to drive them). Same source-string technique
# _test_capture_mode_is_read_at_ready in tests/run_tests.gd already uses
# to pin a cmdline contract that cannot be driven by changing the test
# runner's own real cmdline.
func _test_world_wires_pets_capture_only_cmdline_flags() -> void:
	print("world.gd reads GeminEYE's own capture-only cmdline flags")
	var source := FileAccess.get_file_as_string("res://scripts/world.gd")
	check("--pet-time overrides the pet's starting life",
		source.find('args[i] == "--pet-time"') != -1)
	check("--pet-loot-demo spawns loot with no fight staged",
		source.find('args[i] == "--pet-loot-demo"') != -1)
	check("--pet-shop-open opens the shop panel with no key press",
		source.find('args[i] == "--pet-shop-open"') != -1)
	check("world.gd hooks GeminEYE's looting into the Sentinel's defeated signal",
		source.find("pet.spawn_loot_burst(sentinel.position)") != -1)
