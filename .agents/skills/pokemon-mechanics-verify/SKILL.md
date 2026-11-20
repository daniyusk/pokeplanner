---
name: pokemon-mechanics-verify
description: >-
  Use whenever creating or modifying generation rules, type effectiveness, ability/item
  defensive interceptors, or move categorization in src/domain/mechanics/ or src/domain/analysis/.
---

# Pokémon Mechanics Verification Runbook

Follow this checklist whenever editing mechanical calculations:

1. **Check `GLOSSARY.md`** for exact domain types (`GameContext`, `PokemonType`, `EffectivenessMultiplier`, `MoveCategory`).
2. **Follow TDD (`tdd` skill)**: Write failing seam tests in `src/domain/mechanics/__tests__/` before changing calculation logic.
3. **Verify Historical Edge Cases**:
   - Gen 1: `Ghost` -> `Psychic` is `0x`; `Ice` -> `Fire` is `1x`; `Bug` <-> `Poison` is `2x`; `Dark`/`Steel`/`Fairy` do not exist.
   - Gen 2–5: `Ghost` -> `Steel` is `0.5x`; `Dark` -> `Steel` is `0.5x`; `Fairy` does not exist.
   - Gen 6+: `Ghost` -> `Steel` is `1x`; `Dark` -> `Steel` is `1x`; `Fairy` exists (`Dragon` -> `Fairy` is `0x`).
   - Pre-Gen 4 split (`physicalSpecialSplit: false`): `Shadow Ball` (Ghost) is `Physical`; `Fire Punch` (Fire) is `Special`; `Bite`/`Crunch` (Dark) are `Special`.
   - Ability interceptors (when `hasAbilities: true`): `Levitate` (`Ground -> 0x`), `Thick Fat` (`Fire/Ice -> 0.5x`), `Wonder Guard` (non-SE -> `0x`), `Flash Fire` (`Fire -> 0x`), `Sap Sipper` (`Grass -> 0x`), `Volt Absorb`/`Lightning Rod`/`Motor Drive` (`Electric -> 0x`), `Water Absorb`/`Storm Drain` (`Water -> 0x`), `Dry Skin` (`Water -> 0x`, `Fire -> 1.25x`), `Heatproof` (`Fire -> 0.5x`), `Earth Eater` (`Ground -> 0x`), `Well-Baked Body` (`Fire -> 0x`), `Purifying Salt` (`Ghost -> 0.5x`), `Filter`/`Solid Rock`/`Prism Armor` (`>= 2x` reduced by `0.75x`), `Fluffy` (`Fire -> 2x`).
   - Held Item interceptors (when `hasHeldItems: true`): `Air Balloon` (`Ground -> 0x`), `Ring Target` (removes natural type immunities, though keeps ability immunities).
4. **Run verification**: `pnpm check; pnpm test`.
