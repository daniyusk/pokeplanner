# ADR 0004: URL Sharing Codec & Showdown Interop

## Status
Accepted

## Context
Users must be able to share permanent team links (including full builds and campaign state) without a backend database, while keeping links compact and reliable.

## Decision
Use a **hybrid URL codec**:
- Short human-readable query parameters (`g` and `s`) for simple species-only Free Mode teams.
- `lz-string` Base64URL-compressed positional payloads (`p`) with a 10-field slot tuple (species, ability, item, nature, moves, Tera type, level, nickname, gender, shiny) for configured builds and campaigns.
- Support standard Pokémon Showdown text paste import/export via a pure parser/serializer.

## Consequences
- **Positive**: Links never expire, require zero server storage, and keep all build attributes (including gender and shiny) in a single compact schema.
- **Negative**: Future breaking changes after launch will require preserving compatibility for unprefixed `p` payloads.
