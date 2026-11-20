# Domain Glossary

Use this exact vocabulary across TypeScript types, function names, tests, and documentation.

## Core Entities

- **`GenerationNumber`**: Integer from `1` to `9` representing a mainline Pokémon generation.
- **`PokemonType`**: Canonical English type name (`Normal`, `Fire`, `Water`, `Electric`, `Grass`, `Ice`, `Fighting`, `Poison`, `Ground`, `Flying`, `Psychic`, `Bug`, `Rock`, `Ghost`, `Dragon`, `Dark`, `Steel`, `Fairy`).
- **`SpeciesSlug`**: Normalized lowercase identifier for a species or specific form (e.g., `'charizard'`, `'rotom-wash'`, `'darmanitan-galar'`).
- **`MoveSlug`**: Normalized lowercase identifier for a move (e.g., `'earthquake'`, `'volt-switch'`).
- **`AbilitySlug`**: Normalized lowercase identifier for an ability (e.g., `'levitate'`, `'thick-fat'`).
- **`ItemSlug`**: Normalized lowercase identifier for a held item (e.g., `'air-balloon'`, `'leftovers'`).
- **`NatureId`**: Canonical nature name (e.g., `'Adamant'`, `'Timid'`, `'Modest'`).
- **`TeamSlotIndex`**: Fixed slot position in a 6-member team (`0 | 1 | 2 | 3 | 4 | 5`).
- **`TeamMember`**: A configured Pokémon in a `TeamSlot`, containing `speciesSlug`, optional `abilitySlug`, optional `itemSlug`, optional `natureId`, up to 4 `moveSlugs`, optional `teraType`, and optional `level`.
- **`Team`**: Fixed-length array of 6 slots (`[TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot, TeamSlot]`), where each `TeamSlot` is `TeamMember | null`.

## Rules & Context

- **`GameMechanicsFlags`**: Generation/title-specific mechanical rules (`hasAbilities`, `hasHeldItems`, `hasNatures`, `physicalSpecialSplit`, `gimmick`).
- **`GameContext`**: Active ruleset for planning — either `FreeModeContext` (unrestricted National Dex at a chosen `GenerationNumber`) or `CampaignGameContext` (scoped to a specific `GameManifest` and `VersionId`).
- **`GameManifest`**: Curated static JSON dataset for a specific mainline game (up to Black 2 / White 2 initially), containing regional Pokédex availability, version exclusives, encounter locations, and campaign checkpoints.
- **`Checkpoint`**: A sequential story milestone in a `GameManifest` (e.g., Gym Leader, Elite Four, Champion) with `order`, `levelCap`, `bossNotablePokemon`, and `unlockedLocations`.
- **`JourneySnapshot`**: The planned team state at a specific `Checkpoint`, allowing early-game temporary members and evolutionary stages distinct from the final team.

## Analysis & Recommendations

- **`MoveCategory`**: `'Physical' | 'Special' | 'Status'`.
- **`EffectivenessMultiplier`**: Damage multiplier (`0 | 0.25 | 0.5 | 1 | 1.25 | 2 | 4` or `0.75` / `1.5` when modifiers like `Filter` or `Dry Skin` apply).
- **`DefensiveProfile`**: Aggregated team resistances, immunities, and weaknesses across all types available in the active `GenerationNumber`, factoring in abilities and items.
- **`OffensiveCoverage`**: Super-effective type coverage across all types available in the active `GenerationNumber`, evaluated in both STAB mode and Moveset mode.
- **`RecommendationReason`**: Structured explanation attached to any recommended Pokémon, move, ability, or item (`category`, `impact`, `summary`, `types`).
