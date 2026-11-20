---
name: ui-accessibility-pokemon
description: >-
  Use when building or reviewing React UI components, type matrices, stat charts, or pickers
  under src/components/ and src/features/.
---

# Pokémon UI & Accessibility Verification

1. **Colorblind-Safe Indicators**: Every `TypeBadge` must render an SVG icon + readable text label. Every effectiveness cell must render its numeric multiplier (`4×`, `2×`, `½×`, `¼×`, `0×`).
2. **Contrast Compliance**: Verify WCAG 2.2 AA (`>= 4.5:1` for normal text, `>= 3:1` for large text and UI components) in both Light and Dark themes.
3. **Large List Performance**: Lists exceeding 100 entries (species picker, move picker) must use filtering/pagination or virtualization to avoid main-thread stalls.
4. **Verification**: Run `pnpm check` (Biome a11y rules + TypeScript) and Playwright Axe E2E audits (`pnpm test:e2e`) when available.
