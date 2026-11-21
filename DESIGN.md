# Design System — Pokémon Team Planner

<!-- impeccable:design-schema 1 -->

## Design Philosophy

A minimalist, operate-first workspace where Pokémon sprites, type identities, and campaign decisions lead immediately without visual noise.

- **Recognition over explanation:** Visual sprites, calibrated type badges, and clean controls communicate state without tutorial banners, helper paragraphs, or decorative labels.
- **Tonal separation over heavy borders:** Separate surfaces through subtle neutral contrast (`--surface-canvas`, `--surface-card`, `--surface-elevated`) rather than heavy card outlines or drop shadows.
- **Zero decorative chrome:** No radial aura glows behind Pokémon, no gradient text, no pill clutter, and no generic AI-slop dashboards.

---

## Color & Tonal Tokens

Defined in [`src/styles/index.css`](src/styles/index.css) with WCAG 2.2 AA contrast across Light and Dark modes:

### Surfaces & Ink

| Token | Light Mode | Dark Mode | Purpose |
|---|---|---|---|
| `--surface-canvas` | `#f7f8fa` | `#0e1116` | Page background |
| `--surface-card` | `#ffffff` | `#161b22` | Primary surface blocks, grid tiles, drawers |
| `--surface-elevated` | `#f1f3f6` | `#1c222b` | Nested controls, icon buttons, active chips |
| `--surface-muted` | `#e6e9ef` | `#252d3a` | Hover fills and muted backgrounds |
| `--border-subtle` | `#e2e6ed` | `#262f3d` | Hairline dividers and input edges |
| `--border-strong` | `#cbd2de` | `#374357` | Tree stems, focus separators, active borders |
| `--ink-primary` | `#111827` | `#f3f4f6` | Primary text and headings |
| `--ink-secondary` | `#4b5563` | `#c4cbd6` | Secondary labels and interactive controls |
| `--ink-muted` | `#6b7280` | `#8b95a5` | Subtle metadata and empty state icons |
| `--accent-primary` | `#d93829` | `#e5483b` | Primary actions, active selections, focus rings |

### Shadows & Elevation

- `--shadow-card: none` — Flat tonal cards on the page canvas.
- `--shadow-overlay` — Reserved strictly for floating dialogs and slide-over drawers (`BuildDrawer`, `JourneyStepEditor`, modals).

### Type Badges (`--type-*`)

Every type uses a calibrated high-contrast fill paired with an SVG glyph (`TypeIcon`) and text label (`TypeBadge`) — never color alone.

---

## Typography & Rhythm

- **Font stack:** System sans (`Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `sans-serif`) with `.tabular-nums` for levels, base stats, and multipliers.
- **Scale:** Compact operational scale (`12px`–`18px`) without oversized display headers or decorative kickers/eyebrows.

---

## Canonical Surface Anatomies

### 1. Game Selector (`/`)
- Centered single-title header with theme toggle.
- Independent **Free Mode** selector option with zero generation label (`All Pokémon · No game restrictions`).
- Responsive 4-column **Games** grid displaying clean tonal tiles with version color bars, game title, and region.

### 2. Minimalist 6-Slot Team Dock (`/free`, `/game/$gameId/team`)
- Empty slots render as calm circular placeholders (`h-24 w-24 rounded-full`) that focus the bottom search input on click — no slot numbers (`1..6`) and no `"Add Pokémon"` copy.
- Filled slots display **only**:
  1. Pokémon sprite over a soft circular type-tinted backdrop (with hover/focus remove `×` button).
  2. Discreet species name (or nickname) directly above the types.
  3. Accessible `TypeBadge` chips.
  4. Compact 3-button action row: **Gender** (`♂`/`♀`/`—`), **Shiny** (`Sparkles`), and **Adjust** (`SlidersHorizontal` opening `BuildDrawer`).
- No Pokédex `#0000` IDs, no slot numbers, no move/ability/item summary boxes inside slot cards.

### 3. Inline Visual Pokémon Browser
- Permanently placed below the team dock and action strip (`Team Analysis` / `Recommendations` / `Clear`), eliminating modal pickers for team building.
- Compact toolbar: search input (`Ctrl/Cmd+K`), version selector (multi-version games), and expandable `Filters` tray (types, region in Free Mode, catchable/trade/evolved toggles).
- Dense sprite-only grid (`aspect-square` tiles) with **no visible species names** inside grid cells (`aria-label` + `title` provide accessibility). Clicking immediately adds to the next open slot or removes if already selected.

### 4. Progressive Analysis & Recommendations
- Collapsed by default so the workspace stays calm on entry.
- Opened via centered `Team Analysis` or `Recommendations` toggles between the 6-slot dock and the bottom Pokémon grid.

### 5. Standalone Journey Planner Progression Tree (`/game/$gameId/journey`)
- Available only when a specific campaign game is selected, switched via the header `Team Planner | Journey Planner` control.
- Centered vertical progression tree with hairline trunk and orthogonal branches:
  - **Root:** Starter Pokémon selection (`JourneyStarterNode`).
  - **Intermediate Branches:** Typified step cards (`Capture`, `Train`, `Evolve`, `Replace`, `Goal`) arranged in parallel or chained branches between checkpoints, each directly addable/chainable/editable.
  - **Milestones:** Campaign checkpoints showing level cap, specialty type, computed active team, and expandable boss matchup details.
  - **End Anchor:** Final 6-Pokémon team summary.

---

## Forbidden Anti-Patterns (Regression Guardrails)

Never reintroduce any of the following in future UI changes:
- Re-adding slot index badges, Pokédex `#0000` numbers, or move/item/ability preview blocks to `TeamSlotCard`.
- Displaying generation numbers or game ruleset metadata on Free Mode selectors or workspace headers.
- Replacing the inline bottom visual `PokemonBrowser` with a modal picker flow.
- Adding species name labels inside the bottom visual grid tiles.
- Putting instructional onboarding prose (`"Click a Pokémon below to..."`, `"Press Ctrl+K..."`) on main surfaces.
- Coupling Journey Planner directly inside a Team Planner tab or reverting it from a progression tree back to a flat team-snapshot list.
- Reintroducing drop shadows (`--shadow-card`), heavy borders, or gradient glows on resting cards.
