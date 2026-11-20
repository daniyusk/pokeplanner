# ADR 0004: Versioned URL Sharing Codec & Showdown Interop

## Status
Accepted

## Context
Users must be able to share permanent team links (including full builds and Journey Planner progression) without a backend database, while keeping links compact and permanently backward-compatible.

## Decision
Use a **versioned hybrid codec**:
- Short human-readable query parameters for simple species-only teams.
- Version-prefixed (`v1_`) `lz-string` Base64URL-compressed positional payloads for full 6-slot builds and Journey Planner snapshots.
- Support standard Pokémon Showdown text paste import/export via `@pkmn/sets` or a compatible pure parser.

## Consequences
- **Positive**: Links never expire, require zero server storage, and old `v1_` links remain decodable across future schema evolutions via explicit migrators.
- **Negative**: Decoders for retired versions must be retained and tested permanently.
