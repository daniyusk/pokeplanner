# ADR 0003: Pure Domain Core Separation (Functional Core, Imperative Shell)

## Status
Accepted

## Context
Complex Pokémon domain logic (historical generation type charts, Physical/Special split, ability/item interceptors, multi-criteria recommendation scoring, campaign validation) becomes hard to test and prone to regressions if mixed with React hooks, Zustand stores, or DOM APIs.

## Decision
Isolate all domain logic inside `src/domain/` as **100% pure TypeScript** functions and types. `src/domain/` must never import UI frameworks, browser globals, or state management libraries. Data providers enter through explicit typed interfaces (`DexGateway`, `GameContext`).

## Consequences
- **Positive**: Sub-second deterministic Vitest execution; strict TDD on public seams; domain logic can easily move to a Web Worker later if needed without rewriting code.
- **Negative**: Requires an explicit adapter layer (`src/data/dex/`) mapping external package structures into canonical domain shapes.
