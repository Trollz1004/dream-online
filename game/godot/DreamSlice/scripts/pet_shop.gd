extends RefCounted

# The GeminEYE shop's own rules: a demo NEEDs balance and what it can buy.
# Pure and engine-free, the same shape pet_state.gd uses, so "cannot buy
# with too few NEEDs" is provable with no Control, no panel and no player
# in sight. scripts/pet_shop_panel.gd is the only place this turns into a
# screen.
#
# AGENTS.md: "Pay-for-convenience ONLY -- never pay-to-win... NEEDs shop
# items must not provide gameplay advantage." Every item this file knows
# about is either more time on a pet that never fights, or a colour swap on
# it. Nothing here is a real purchase: DEFAULT_BALANCE is demo money, never
# spent or earned against a real account.

const DEFAULT_BALANCE := 500

const EXTEND_ITEM := "extend_1_hour"
const EXTEND_COST := 50
const EXTEND_LABEL := "Extend GeminEYE 1 hour"

# Skin costs. Void is the rarer colour, priced a little higher than the
# other two -- still a cosmetic-only difference, never a gameplay one.
const SKIN_COSTS := {
	"ember": 40,
	"frost": 40,
	"void": 60,
}
const SKIN_LABELS := {
	"ember": "GeminEYE skin: Ember",
	"frost": "GeminEYE skin: Frost",
	"void": "GeminEYE skin: Void",
}

var needs_balance := DEFAULT_BALANCE


func _init(starting_balance: int = DEFAULT_BALANCE) -> void:
	needs_balance = starting_balance


func can_afford(cost: int) -> bool:
	return needs_balance >= cost


func skin_cost(skin_name: String) -> int:
	return int(SKIN_COSTS.get(skin_name, 0))


# Spends the extend cost and calls pet_state.extend() on success. Returns
# false and spends nothing when the balance is short -- the "cannot buy with
# too few NEEDs" rule tests/test_pet.gd pins.
func buy_extend(pet_state) -> bool:
	if not can_afford(EXTEND_COST):
		return false
	needs_balance -= EXTEND_COST
	pet_state.extend(pet_state.EXTEND_SECONDS)
	return true


func buy_skin(pet_state, skin_name: String) -> bool:
	var cost := skin_cost(skin_name)
	if cost <= 0 or not can_afford(cost):
		return false
	needs_balance -= cost
	pet_state.set_skin(skin_name)
	return true
