---
name: url-schema-migration
description: >-
  Use whenever modifying URL query parameters, team serialization codecs, or Pokémon Showdown
  import/export logic under src/domain/sharing/.
---

# URL Schema Migration Runbook

Shareable team links are **permanent** and have no server-side database. Breaking old URLs invalidates every link ever shared by users.

1. **Never Mutate Existing Decoder Versions**: Keep `v1` decoding logic intact forever.
2. **Introduce a New Prefix for Breaking Changes**: If the compact payload changes structurally, introduce `v2_` while keeping `v1_` routed through a pure migrator (`migrateV1ToV2`).
3. **Freeze Regression Fixtures**: Before changing encoder output, verify all existing frozen URLs in `tests/fixtures/shared-urls.json` still decode identically.
4. **Round-Trip Property Check**: Verify `decodeTeamUrl(encodeTeamUrl(state))` equals `state` across empty slots, full 6-slot builds, Free Mode, and Journey Planner snapshots.
