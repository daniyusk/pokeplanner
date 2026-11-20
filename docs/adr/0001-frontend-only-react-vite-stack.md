# ADR 0001: Frontend-Only React + TypeScript + Vite Stack

## Status
Accepted

## Context
Pokémon Team Planner must operate completely in the browser with zero custom backend, support offline usage (PWA), deploy cleanly on Vercel, provide type-safe URL sharing, and allow high-velocity iteration by both human developers and AI agents.

## Decision
Use **React 19 + TypeScript (Strict) + Vite + Tailwind CSS v4**, paired with:
- **TanStack Router** for type-safe URL search params
- **Zustand** for atomic client state
- **TanStack Query + `idb-keyval`** for optional remote cache and local persistence
- **Biome + Vitest + Playwright** for quality verification

## Consequences
- **Positive**: Zero SSR/hydration friction with `IndexedDB` and URL state; instant Vite builds and Vitest execution; static CDN deployment on Vercel; first-class PWA support via `vite-plugin-pwa`.
- **Negative**: No server-side SEO rendering per team URL (acceptable because this is an interactive client-side utility).
