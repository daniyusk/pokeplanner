# Contributing to PokéPlanner

Thank you for your interest in contributing to **PokéPlanner**! We welcome bug reports, documentation improvements, campaign manifests, mechanics fixes, and UI/UX refinements.

Before you start, please read our [Code of Conduct](./CODE_OF_CONDUCT.md) and review [AGENTS.md](./AGENTS.md) for the non-negotiable architectural rules of this repository.

## Getting Started

### Prerequisites

- **Node.js** (LTS recommended — CI runs Node.js 22)
- **pnpm** (`11.x` — configured via `packageManager` in `package.json`)

### Local Setup

```bash
git clone https://github.com/daniyusk/pokeplanner.git
cd pokeplanner
pnpm install
pnpm dev
```

## Non-Negotiable Architecture Rules

1. **100% Client-Side (No Backend)**:
   Never introduce server-side API routes, databases, authentication servers, or runtime dependencies requiring a backend process. Everything runs in the browser (`IndexedDB`, URL sharing, offline PWA).
2. **Pure Domain Core (`src/domain/`)**:
   Everything inside `src/domain/` must remain **pure TypeScript** with **zero imports** from `react`, `react-dom`, `zustand`, `@tanstack/*`, `window`, `document`, `localStorage`, or `indexedDB`.
3. **Generation-Accurate Mechanics**:
   Never hardcode Generation 9 assumptions globally. Mechanical functions in `src/domain/mechanics/` and `src/domain/analysis/` accept a `GameContext` (`generation`, `hasAbilities`, `hasHeldItems`, `hasNatures`, `physicalSpecialSplit`).
4. **Test-First Domain Changes**:
   New or modified logic in `src/domain/` should be developed test-first (TDD) with unit tests covering public seams.
5. **English-Only Standard**:
   All UI copy, Pokémon terminology, documentation, code comments, and commit messages must be in **English**.

Please also consult [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), [GLOSSARY.md](./GLOSSARY.md), and [docs/adr/](./docs/adr/) when making product, UI, or architectural changes.

## Campaign Manifest Workflow

Campaign data lives in `scripts/data-pipeline/campaigns/` and generates the JSON manifests under `public/data/games/`.

If you edit or add campaign data:

```bash
pnpm data:build
pnpm data:validate
```

## Commit & Pull Request Guidelines

### Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/) in English:

- `feat:` — New features or game campaign manifests
- `fix:` — Bug fixes or mechanical corrections
- `docs:` — Documentation updates
- `test:` — Adding or updating tests
- `refactor:` — Code restructuring without behavior changes
- `chore:` — Tooling, dependencies, or CI maintenance

### Pre-PR Verification Checklist

Before opening a pull request, verify that all checks pass locally:

```bash
pnpm check
pnpm data:validate
pnpm test
pnpm build
```

1. Fork the repository and create a feature branch from `main`.
2. Keep changes focused and well-scoped.
3. Fill out the Pull Request template completely and link any relevant issue.
4. Ensure all CI checks in `.github/workflows/ci.yml` pass.

## License

By contributing to PokéPlanner, you agree that your contributions will be licensed under the [Apache License, Version 2.0](./LICENSE), and will be governed by Section 5 ("Submission of Contributions") of that license.
