---
name: url-schema-migration
description: >-
  Use whenever modifying URL query parameters, team serialization codecs, or Pokémon Showdown
  import/export logic under src/domain/sharing/.
---

# URL Schema Migration Runbook

Shareable team links are **permanent** and have no server-side database. Breaking old URLs invalidates every link ever shared by users.

1. **Never Mutate Existing Decoder Versions**: Keep `v1` (`v1_`) decoding logic intact forever.
2. **Versioned Extensions (`v2_` and beyond)**: `v2_` adds `gender` and `shiny` tuple slots while preserving `v1_` compatibility. Any future structural change must introduce `v3_` while retaining all prior decoders.
3. **Freeze Regression Fixtures**: Before changing encoder output, verify all existing frozen URLs in `tests/fixtures/shared-urls.json` still decode identically.
4. **Round-Trip Property Check**: Verify `decodeTeamUrl(encodeTeamUrl(state))` equals `state` across empty slots, full 6-slot builds (with gender/shiny), Free Mode, and campaign teams.
