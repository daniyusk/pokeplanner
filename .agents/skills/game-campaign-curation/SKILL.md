---
name: game-campaign-curation
description: >-
  Use when adding or updating a mainline Pokémon game manifest (Gen 1 through Black 2 / White 2
  or newer expansions), including regional Pokédex, checkpoints, level caps, and catch locations.
---

# Game Campaign Curation Runbook

Use this workflow when adding or updating a `GameManifest` under `public/data/games/`:

1. **Scope Check**: Confirm the target `versionGroup` and individual `versions` (e.g., `black-2-white-2` with `black-2` and `white-2`).
2. **Generate Base Data**: Run the data pipeline script (`pnpm data:extract <game-id>`) to pull base regional Pokédex and learnset cross-references.
3. **Curate Checkpoints**:
   - Order all mandatory story milestones (`gym`, `rival`, `elite-four`, `champion`) with sequential `order` integers.
   - Set accurate `levelCap` matching the boss's highest-level Pokémon.
   - List `unlockedLocations` at each checkpoint so availability queries remain accurate.
4. **Map Availability & Trade Evolutions**:
   - Mark `earliestCheckpointId` accurately (accounting for HM gates like Surf, Strength, Cut).
   - Flag `evolutionNotes.requiresTrade: true` when final evolution requires trading so the "Exclude Trade Evolutions" toggle works accurately.
5. **Validate**: Run `pnpm data:validate` and `pnpm test` before committing.
