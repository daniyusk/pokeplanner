# ADR 0002: Hybrid Pokémon Data Architecture

## Status
Accepted

## Context
Public APIs alone cannot satisfy all requirements:
- PokéAPI GraphQL enforces a strict 100 req/hr/IP limit with daily restarts, making it unsuitable for production browser queries.
- PokéAPI REST requires N+1 requests to reconstruct generation-specific rules and lacks campaign milestones (Gym order, level caps, story unlock gates).
- `@pkmn/dex` and `@pkmn/data` provide fast, offline, generation-accurate mechanical data (Gen 1–9), but do not contain story campaign progression or wild encounter tables.

## Decision
Adopt a **3-layer hybrid data architecture**:
1. **Mechanical Core (Local Bundle)**: `@pkmn/dex` + `@pkmn/data` wrapped in `src/data/dex/` for zero-latency, offline-capable types, stats, abilities, items, natures, and learnsets across Gen 1–9.
2. **Campaign Manifests (Lazy-Loaded Static JSON)**: Curated, Zod-validated `GameManifest` JSON files under `public/data/games/` covering mainline titles up to Generation 5 (Black 2 / White 2) initially, containing checkpoints, level caps, and catch availability.
3. **Visuals & Secondary Enrichment (Cached Network)**: Sprites and optional flavor details cached locally via Service Worker and `IndexedDB`.

## Consequences
- **Positive**: All type analysis and recommendations run in `< 15ms` offline with zero API rate-limit failures.
- **Negative**: Campaign manifests up to Black 2 / White 2 require build-time curation and Zod validation scripts.
