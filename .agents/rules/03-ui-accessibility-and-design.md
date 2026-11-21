# UI, Accessibility, and Design Rules

Follow `DESIGN.md` as the canonical visual reference for every UI change:

1. **English-Only Copy**: All UI strings, labels, tooltips, and Pokémon terms use standard English.
2. **Minimalist Discipline (Anti-Slop)**:
   - Avoid explanatory tutorial copy, helper paragraphs, decorative borders, excessive outlines, drop shadows on resting cards, and unnecessary technical IDs (`#0000` dex numbers, slot `1–6` indices).
   - Keep **Free Mode** independent of any specific generation label or game restriction.
3. **Minimal Slot Anatomy**: Selected Pokémon cards show only the Pokémon image, discreet name, accessible `TypeBadge`s, Gender button, Shiny button, and Adjust button (opening `BuildDrawer`).
4. **Inline Visual Selection**: Team Pokémon selection happens directly via the bottom sprite-only visual grid (with search and filters, no text names inside grid tiles) rather than a modal picker.
5. **Standalone Journey Progression Tree**: Keep Journey Planner separate from Team Planner, available only when a game is selected, and rendered as a starter-rooted progression tree with intermediate steps and branches (`Capture`, `Train`, `Evolve`, `Replace`, `Goal`).
6. **Never Color-Only**: Every `TypeBadge` and effectiveness cell must include a non-color indicator (SVG type icon + type text, or tabular numeric multiplier `4×`, `2×`, `½×`, `¼×`, `0×`) meeting WCAG 2.2 AA contrast (`>= 4.5:1` for text).
7. **Keyboard Navigation**: Every interactive flow must be operable via keyboard without traps.
