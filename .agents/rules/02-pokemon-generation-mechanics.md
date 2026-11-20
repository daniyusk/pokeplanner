# Pokémon Generation Mechanics Invariants

When editing `src/domain/mechanics/`, `src/domain/analysis/`, or `src/domain/recommendations/`:

1. **Always parameterize by `GameContext`**:
   - Never assume Generation 9 type charts or mechanics globally.
   - Generation 1 (`1`): 15 types (no Dark, Steel, Fairy); `Ghost` deals `0x` to `Psychic`; `Ice` deals `1x` to `Fire`; `Bug` and `Poison` are `2x` to each other.
   - Generations 2–5 (`2..5`): 17 types (no Fairy); `Steel` resists (`0.5x`) `Ghost` and `Dark`.
   - Generations 6–9 (`6..9`): 18 types (includes `Fairy`); `Steel` is neutral (`1x`) to `Ghost` and `Dark`.
2. **Physical / Special Split**:
   - In Generations `1..3` (`physicalSpecialSplit: false`), damaging moves' category (`Physical` vs. `Special`) is determined by the **move's type**, not the move itself. Status moves remain `Status`.
   - In Generation `4+` (`physicalSpecialSplit: true`), use the move's individual category.
3. **Abilities, Held Items, and Natures**:
   - Only apply Ability defensive interceptors when `context.mechanics.hasAbilities` is `true` (Gen 3+, excluding Let's Go and Legends: Arceus).
   - Only apply Held Item defensive interceptors (e.g., `Air Balloon`) when `context.mechanics.hasHeldItems` is `true` (Gen 2+, excluding Let's Go and Legends: Arceus).
