# AGENTS.md — Pokémon Team Planner

This repository is an **agent-first, 100% client-side** Pokémon team planning application built with React, TypeScript, Vite, Tailwind CSS, and `@pkmn/dex` / `@pkmn/data`.

## 1. Non-Negotiable Architectural Constraints

1. **100% Frontend-Only (No Backend)**:
   - Never add server-side API routes, databases, authentication servers, or runtime dependencies requiring a backend process.
   - All calculations, recommendations, local persistence (`IndexedDB`), offline caching, and URL sharing happen entirely in the user's browser.
2. **Pure Domain Core (`src/domain/`)**:
   - Everything inside `src/domain/` must be **pure TypeScript** with **zero imports** from `react`, `react-dom`, `zustand`, `@tanstack/*`, `window`, `document`, `localStorage`, or `indexedDB`.
   - External data sources (`@pkmn/dex`, PokéAPI, JSON manifests) enter through typed interfaces or adapters in `src/data/`.
3. **Generation-Accurate Mechanics**:
   - Never hardcode Generation 9 assumptions globally.
   - Every mechanical function in `src/domain/mechanics/` and `src/domain/analysis/` must accept a `GameContext` specifying generation (`1..9`) and mechanics flags (`hasAbilities`, `hasHeldItems`, `hasNatures`, `physicalSpecialSplit`).
4. **English-Only Standard**:
   - All UI copy, Pokémon terms, documentation, code comments, and commit messages are in **English** (Conventional Commits format).

## 2. Official Commands

Always run verification checks using `pnpm`:

- `pnpm dev` — Start local Vite development server
- `pnpm check` — Run Biome (lint + format + static a11y) and TypeScript (`tsc --noEmit`)
- `pnpm test` — Run unit and domain tests via Vitest
- `pnpm test:coverage` — Run Vitest with coverage reporting
- `pnpm build` — Build production static bundle into `dist/`

## 3. Canonical Documentation & Source of Truth

Before making architectural or domain changes, consult:
- `GLOSSARY.md` — Ubiquitous domain vocabulary (use exact type and symbol names).
- `PRODUCT.md` — Confirmed product scope, users, constraints, and campaign roadmap.
- `docs/adr/` — Architecture Decision Records explaining why key choices were made.
- `.agents/rules/` and `.agents/skills/` — Project-specific rules and operational runbooks.

## 4. Definition of Done

Before considering any task complete:
1. New or modified domain logic in `src/domain/` is developed test-first (TDD) against public seams.
2. `pnpm check` passes with zero errors or warnings.
3. `pnpm test` passes cleanly.
4. `pnpm build` succeeds cleanly.
5. Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`) in English.
