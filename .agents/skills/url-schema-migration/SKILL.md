---
name: url-schema-migration
description: >-
  Use whenever modifying URL query parameters, team serialization codecs, or Pokémon Showdown
  import/export logic under src/domain/sharing/.
---

# URL Schema Migration Runbook

Shareable team links are **permanent** and have no server-side database. Once publicly deployed, breaking existing URLs invalidates links shared by users.

1. **Preserve Published Tuple Positions**: Never reorder or remove fields in `compactSlotTupleSchema` (`speciesSlug`, `abilitySlug`, `itemSlug`, `natureId`, `moveSlugs`, `teraType`, `level`, `nickname`, `gender`, `shiny`) without keeping full backward decoding for existing `p` payloads.
2. **Safe Schema Evolution**: Any future breaking structural change after launch must introduce an explicit discriminator or prefix while retaining decoding support for the original unprefixed `p` format.
3. **Freeze Regression Fixtures**: Before changing encoder output, verify all existing frozen URLs in `tests/fixtures/shared-urls.json` still decode identically.
4. **Round-Trip Property Check**: Verify `decodeTeamFromSearchParams(encodeTeamToSearchParams(state), dex)` equals `state` across empty slots, full 6-slot builds (with gender/shiny), Free Mode, and campaign teams.
