# UI, Accessibility, and Design Rules

1. **English-Only Copy**: All UI strings, labels, tooltips, and Pokémon terms use standard English.
2. **Never Color-Only**: Every `TypeBadge` and effectiveness cell must include a non-color indicator (SVG type icon + type text, or tabular numeric multiplier `4×`, `2×`, `½×`, `¼×`, `0×`) meeting WCAG 2.2 AA contrast (`>= 4.5:1` for text).
3. **Progressive Disclosure**: Keep the top 6-slot Team Dock clean and immediate (inspired by Richi3f). Place deep move/ability/item/nature customization inside an on-demand Build Drawer and detailed charts inside structured analysis tabs.
4. **Keyboard Navigation**: Every interactive flow must be operable via keyboard without traps.
