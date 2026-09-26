extends RefCounted

# GeminEYE, the one-eyed floating guardian companion (Joshua's idea,
# 2026-09-25): a timed convenience pet, pay-for-convenience only per
# AGENTS.md ("NEEDs shop items must not provide gameplay advantage"). This
# file holds the pet's rules only -- timer, life/death, looting state, the
# chat-bubble text, and which cosmetic skin it wears -- with no engine
# dependency at all, the same "pure state first" shape dash_state.gd and
# guard_state.gd already use for the combat skills. scripts/pet.gd is the
# only place that turns this into a mesh, a light and a Label3D.
#
# GeminEYE never affects combat: it does not fight, does not buff the
# player, and a skin choice only changes its colour. The only thing NEEDs
# ever buys here is more time and a different colour.

const LIFE_MAX := 3600.0        # 60 minutes, Joshua's own ruling
const EXTEND_SECONDS := 3600.0  # what one "extend" purchase adds
const LOOT_REWARD_NAME := "Dreamshard"

const SKIN_DEFAULT := "default"
const SKIN_EMBER := "ember"
const SKIN_FROST := "frost"
const SKIN_VOID := "void"

# Shell/eye colour pairs per skin, read by pet.gd when it paints the model.
# Kept here, not in pet.gd, so a skin choice is provable with no engine
# object at all (tests/test_pet.gd's own "choosing a skin changes the pet's
# colours" check).
const SKIN_COLOURS := {
	SKIN_DEFAULT: {"shell": Color(0.14, 0.15, 0.17), "eye": Color(0.55, 0.92, 0.90)},
	SKIN_EMBER: {"shell": Color(0.20, 0.09, 0.06), "eye": Color(1.00, 0.55, 0.20)},
	SKIN_FROST: {"shell": Color(0.10, 0.14, 0.20), "eye": Color(0.60, 0.85, 1.00)},
	SKIN_VOID: {"shell": Color(0.05, 0.03, 0.09), "eye": Color(0.72, 0.40, 1.00)},
}

var life_seconds := LIFE_MAX
var alive := true
var looting := false
var loot_count := 0
var bubble_text := ""
var skin := SKIN_DEFAULT

var _bubble_hold := 0.0
const BUBBLE_HOLD_TIME := 2.2   # seconds a "+1 Dreamshard" bubble stays up


func _init(starting_life: float = LIFE_MAX) -> void:
	life_seconds = starting_life


# Ticks the life timer down and clears the bubble once its hold time has
# passed. Called every frame by pet.gd; kept here so the countdown-to-death
# rule is testable with no Node, no _process and no live SceneTree.
func advance(delta: float) -> void:
	if alive:
		life_seconds = maxf(0.0, life_seconds - delta)
		if life_seconds <= 0.0:
			_die()
	if _bubble_hold > 0.0:
		_bubble_hold = maxf(0.0, _bubble_hold - delta)
		if _bubble_hold <= 0.0:
			bubble_text = ""


func _die() -> void:
	alive = false
	looting = false
	bubble_text = ""
	_bubble_hold = 0.0


func is_dead() -> bool:
	return not alive


# A convenience purchase: 60 more minutes of life, 50 NEEDs (pet_shop.gd owns
# the cost and the balance). Also revives a dead pet -- the tombstone is the
# same "pay to keep the convenience going" moment a real player would reach
# for the shop from, not a dead end that needs a fresh pet.
func extend(seconds: float = EXTEND_SECONDS) -> void:
	life_seconds += seconds
	alive = true


func set_skin(new_skin: String) -> void:
	if SKIN_COLOURS.has(new_skin):
		skin = new_skin


func shell_colour() -> Color:
	return SKIN_COLOURS[skin]["shell"]


func eye_colour() -> Color:
	return SKIN_COLOURS[skin]["eye"]


# A ground-truth flag, not a request: pet.gd reads this once per frame and
# starts the actual flight to the glint. Kept separate from collect_loot()
# so "flying toward loot" and "loot banked" are two distinct, checkable
# moments, the same way attack_state.gd separates can_start() from the hit
# window.
func start_looting() -> void:
	if not alive:
		return
	looting = true
	bubble_text = "Looting..."
	_bubble_hold = 0.0   # held open by looting itself, not the hold timer


func collect_loot(amount: int = 1) -> void:
	if not alive:
		return
	loot_count += amount
	looting = false
	bubble_text = "+%d %s" % [amount, LOOT_REWARD_NAME]
	_bubble_hold = BUBBLE_HOLD_TIME


# "59:12" while alive, "RIP" once dead -- the one line the HUD or the pet's
# own bubble shows under its name. minutes:seconds, floored, never negative.
func time_label() -> String:
	if not alive:
		return "RIP"
	var total := int(floor(life_seconds))
	var minutes := total / 60
	var seconds := total % 60
	return "%d:%02d" % [minutes, seconds]
