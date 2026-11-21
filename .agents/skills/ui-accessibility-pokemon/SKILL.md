---
name: ui-accessibility-pokemon
description: >-
  Use when building or reviewing React UI components, type matrices, stat charts, or pickers
  under src/components/ and src/features/.
---

# Pokémon UI & Accessibility Verification

Consult `DESIGN.md` and `.agents/rules/03-ui-accessibility-and-design.md` before building or modifying any component:

1. **Minimalist Guardrails**: Verify no slot numbers, Pokédex `#0000` numbers, move/item previews inside `TeamSlotCard`, explanatory tutorial copy, generation labels on Free Mode, or resting card shadows/excessive borders were introduced.
2. **Colorblind-Safe Indicators**: Every `TypeBadge` must render an SVG icon + readable text label (or `sr-only` when compact). Every effectiveness cell must render its numeric multiplier (`4×`, `2×`, `½×`, `¼×`, `0×`).
3. **Contrast Compliance**: Verify WCAG 2.2 AA (`>= 4.5:1` for normal text, `>= 3:1` for large text and UI components) in both Light and Dark themes.
4. **Large List Performance**: Lists exceeding 100 entries (`PokemonBrowser` sprite grid, move picker) must use filtering and progressive pagination/IntersectionObserver to avoid main-thread stalls.
5. **Visual Grid Accessibility**: Sprite-only tiles in `PokemonBrowser` omit visible name text by design; always verify each `<button>` retains `aria-label={species.name}`, `title={species.name}`, and `aria-pressed`.
6. **Verification**: Run `pnpm check` (Biome a11y rules + TypeScript) and `pnpm test` before completing UI work.
