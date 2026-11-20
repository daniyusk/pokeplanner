# Architecture Boundaries

Follow the unidirectional dependency rule across the codebase:

`src/app` & `src/features` -> `src/stores` -> `src/domain` -> `src/data` (via typed ports/adapters)

## Rules

1. **Zero UI or Browser Coupling in `src/domain/`**:
   - Files in `src/domain/**` must NEVER import `react`, `react-dom`, `zustand`, `@tanstack/*`, `idb-keyval`, or reference `window`, `document`, `localStorage`, or `navigator`.
2. **No Business Logic in React Components**:
   - Components in `src/features/` and `src/components/` handle presentation, user interaction, and calling store/domain selectors. Type calculations, recommendation scoring, and campaign validation belong exclusively in `src/domain/`.
3. **Validate External Boundaries with Zod**:
   - URL parameters, PokéAPI responses, Pokémon Showdown imports, `IndexedDB` records, and `GameManifest` JSON files must be parsed through Zod schemas before entering `src/stores/` or `src/domain/`.
