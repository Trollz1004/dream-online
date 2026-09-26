extends RefCounted

# Consumables: a red potion (health), a blue potion (stamina -- the slice has
# no mana), and food (a slow heal-over-time buff). Ruled by Joshua on
# 2026-09-25, bound by default to 1, 2, 3 on the keyboard hotbar panel
# (scripts/keyboard_panel.gd), which reads this class's counts and cooldowns
# to draw the stack numbers and the radial sweeps. No engine call anywhere in
# this file -- no Node, no Input, no OS -- so it is unit-testable headless
# with no scene tree, the same split every *_state.gd file in this folder
# already uses for its own timing.

const RED_HEAL := 35.0
const BLUE_STAMINA := 50.0
const FOOD_HEAL_PER_SECOND := 2.0
const FOOD_DURATION := 20.0
const POTION_COOLDOWN := 10.0   # shared: using either potion starts both cooling
const FOOD_COOLDOWN := 30.0

const START_RED := 5
const START_BLUE := 5
const START_FOOD := 3

var red_charges := START_RED
var blue_charges := START_BLUE
var food_charges := START_FOOD

var _potion_cooldown_left := 0.0
var _food_cooldown_left := 0.0
var _food_buff_left := 0.0


func can_use_red() -> bool:
	return red_charges > 0 and _potion_cooldown_left <= 0.0


func can_use_blue() -> bool:
	return blue_charges > 0 and _potion_cooldown_left <= 0.0


func can_use_food() -> bool:
	return food_charges > 0 and _food_cooldown_left <= 0.0


# Returns the new health, clamped to health_max. Unchanged when the potion
# cannot be used -- no charge left, or the shared potion cooldown is still
# running -- so a caller never has to check can_use_red() first just to stay
# safe.
func use_red(health: float, health_max: float) -> float:
	if not can_use_red():
		return health
	red_charges -= 1
	_potion_cooldown_left = POTION_COOLDOWN
	return clampf(health + RED_HEAL, 0.0, health_max)


func use_blue(stamina: float, stamina_max: float) -> float:
	if not can_use_blue():
		return stamina
	blue_charges -= 1
	_potion_cooldown_left = POTION_COOLDOWN
	return clampf(stamina + BLUE_STAMINA, 0.0, stamina_max)


# Starts (or refreshes) the heal-over-time buff. Returns true only when it
# actually started, so a caller can decide whether to say so on the readout.
func use_food() -> bool:
	if not can_use_food():
		return false
	food_charges -= 1
	_food_cooldown_left = FOOD_COOLDOWN
	_food_buff_left = FOOD_DURATION
	return true


# Ticks every cooldown and the food buff by delta. Returns the health to add
# this frame from the food buff -- 0.0 when it is not active -- so the caller
# clamps it against the player's own health_max in the one place that already
# knows that number (the same shape try_hit already clamps health in).
func advance(delta: float) -> float:
	_potion_cooldown_left = maxf(0.0, _potion_cooldown_left - delta)
	_food_cooldown_left = maxf(0.0, _food_cooldown_left - delta)
	if _food_buff_left <= 0.0:
		return 0.0
	var tick: float = minf(delta, _food_buff_left)
	_food_buff_left = maxf(0.0, _food_buff_left - delta)
	return tick * FOOD_HEAL_PER_SECOND


func potion_cooldown_left() -> float:
	return _potion_cooldown_left


func food_cooldown_left() -> float:
	return _food_cooldown_left


func food_buff_active() -> bool:
	return _food_buff_left > 0.0


func food_buff_left() -> float:
	return _food_buff_left
