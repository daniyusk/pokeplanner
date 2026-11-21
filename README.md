# PokéPlanner

[![CI](https://github.com/daniyusk/pokeplanner/actions/workflows/ci.yml/badge.svg)](https://github.com/daniyusk/pokeplanner/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)

> **Status: Work in Progress (WIP)** — Core team planning, mechanical analysis, explainable recommendations, and Gen 1–5 campaign journey planning are actively being built and refined.

A fast, intuitive, **100% client-side** Pokémon team planner designed to help players build balanced teams, understand generation-accurate type and stat synergies, and plan their playthrough journey across mainline games — all directly in the browser with offline PWA support.

## Why PokéPlanner?

- **Fast 6-Slot Visual Planning**: Minimalist 6-slot team dock paired with an inline visual sprite browser, quick filters, gender/shiny toggles, and an adjust drawer for moves, abilities, held items, natures, and Tera types.
- **Generation-Accurate Mechanics**: Respects generation-specific rules (`Gen 1` vs. `Gen 2–5` vs. `Gen 6+` type charts, pre-Gen 4 Physical/Special split) and defensive interceptors from abilities (e.g., *Levitate*, *Thick Fat*, *Wonder Guard*, *Flash Fire*, *Sap Sipper*, *Earth Eater*) and items (*Air Balloon*).
- **Explainable Recommendations**: Deterministic multi-criteria scoring for Pokémon, moves, abilities, and items — every suggestion explains *which* defensive weakness, offensive blind spot, or stat gap it addresses.
- **Checkpoint-Based Journey Planner**: Dedicated campaign progression tree for mainline playthroughs, rooted in your starter choice and organized around checkpoints (Gyms, Elite Four, Champion) with `Capture`, `Train`, `Evolve`, `Replace`, and `Goal` steps.
- **Zero Backend, Offline-Ready**: No accounts or remote database. Works offline as a PWA with local persistence in `IndexedDB`, compact shareable URLs, and Pokémon Showdown import/export.

## Current Status & Roadmap

### Implemented
- **Game Selection & Free Mode**: Curated mainline campaigns up to **Generation 5 (Black 2 & White 2)** alongside an unrestricted National Dex **Free Mode**.
- **Team Planner**: 6-slot team dock, sprite browser, search/filters, and build customization.
- **Team Analysis**: Defensive type effectiveness matrix, STAB vs. moveset offensive coverage, SVG base stat radar, and threat summaries.
- **Smart Recommendations & Auto-Build**: Explainable suggestions and picker filters.
- **Journey Planner**: Campaign manifest schemas, progression engine, and interactive journey UI for Gen 1–5 titles.
- **Sharing & Persistence**: Compact URL codecs, Showdown format import/export, `IndexedDB` storage, and offline PWA caching.

### Planned / In Progress
- Mainline campaign manifests beyond Generation 5.
- Ongoing UI/UX polish, accessibility refinements (targeting WCAG 2.2 AA), and expanded test coverage.

## Tech Stack

- **Framework & Language**: React 19, TypeScript, Vite
- **Styling & UI**: Tailwind CSS v4, Radix UI, Lucide Icons, `@dnd-kit/core`
- **Routing & State**: TanStack Router, TanStack Query, Zustand
- **Pokémon Data**: `@pkmn/dex`, `@pkmn/data`
- **Persistence & Offline**: `idb-keyval` (`IndexedDB`), `lz-string`, `vite-plugin-pwa`
- **Quality & Testing**: Biome (lint + format + static a11y), Vitest, Testing Library

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- [`pnpm`](https://pnpm.io/) (`packageManager` is configured as `pnpm`)

### Installation & Local Development

```bash
pnpm install
pnpm dev
```

### Useful Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the local Vite development server |
| `pnpm check` | Run Biome checks and TypeScript typechecking (`tsc --noEmit`) |
| `pnpm test` | Run unit and domain tests with Vitest |
| `pnpm test:coverage` | Run Vitest with coverage reporting |
| `pnpm build` | Typecheck and build the production bundle into `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm data:build` | Build campaign manifests via the data pipeline |
| `pnpm data:validate` | Validate campaign manifests |

## Architecture Overview

- `src/domain/` — Pure TypeScript domain core (mechanics, analysis, recommendations, journey engine, URL codecs) with zero React, Zustand, or browser API dependencies.
- `src/data/` — Adapters for `@pkmn/dex`, `@pkmn/data`, and curated campaign manifests.
- `src/features/`, `src/components/`, `src/stores/`, `src/hooks/`, `src/app/` — React UI, state management, routing, and browser persistence.

## Documentation

For deeper architectural, product, and design details, see:

- [PRODUCT.md](./PRODUCT.md) — Product purpose, positioning, principles, and scope
- [DESIGN.md](./DESIGN.md) — UI/UX design system, component anatomies, and guardrails
- [GLOSSARY.md](./GLOSSARY.md) — Ubiquitous domain vocabulary
- [AGENTS.md](./AGENTS.md) — Non-negotiable architectural constraints and workflow rules
- [docs/adr/](./docs/adr/) — Architecture Decision Records

## Contributing

Contributions are welcome! Before opening an issue or pull request, please review our [Contributing Guide](./CONTRIBUTING.md), [Code of Conduct](./CODE_OF_CONDUCT.md), and [AGENTS.md](./AGENTS.md):

1. Keep `src/domain/` 100% pure TypeScript (no UI or browser imports) and develop domain changes test-first.
2. Keep all UI copy, code comments, documentation, and commit messages in **English** using [Conventional Commits](https://www.conventionalcommits.org/).
3. Ensure `pnpm check`, `pnpm data:validate`, `pnpm test`, and `pnpm build` pass cleanly.

For security disclosures, please see our [Security Policy](./SECURITY.md).

## License & Attribution

PokéPlanner is licensed under the **[Apache License, Version 2.0](./LICENSE)**.

If you use, fork, redistribute, or build upon this project, you must:

1. Include a copy of the [LICENSE](./LICENSE) and preserve all copyright, patent, trademark, and attribution notices.
2. Preserve the attribution notices in the [NOTICE](./NOTICE) file (in your `NOTICE` file, source documentation, or an in-app attribution display).
3. Clearly mark any modified files with prominent notices stating that you changed them.

You can also use the repository's [CITATION.cff](./CITATION.cff) metadata (or GitHub's **"Cite this repository"** button) to cite PokéPlanner in documentation, videos, or academic work.

Example attribution for derivative projects:

> Based on [PokéPlanner](https://github.com/daniyusk/pokeplanner) by Daniyusk, licensed under the Apache License, Version 2.0.

## Disclaimer & Acknowledgements

- **Non-Affiliation Disclaimer**: Pokémon, Pokémon character names, and related assets are trademarks and copyrights of Nintendo, Game Freak, and The Pokémon Company. PokéPlanner is an independent, non-commercial, open-source fan project and is not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, or The Pokémon Company.
- **Data & Libraries**: Pokémon species, move, ability, item, and type chart data are powered by [`@pkmn/dex` and `@pkmn/data`](https://github.com/pkmn/ps).
