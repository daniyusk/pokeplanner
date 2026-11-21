# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS v4 + TanStack Router + Zustand + TanStack Query + `@pkmn/dex` / `@pkmn/data` + Biome + Vitest + Playwright, deployed statically on Vercel. Chosen for 100% browser-side execution, offline-first PWA capability, strict typing, and fast AI-agent verification loops.

## Users

Mainline Pokémon players planning in-game playthrough teams and balanced casual/semi-competitive rosters who want the instant two-click simplicity of Richi3f's planner paired with deep defensive/offensive analysis, explainable recommendations, and campaign progression planning.

## Product Purpose

Deliver a fast, intuitive, zero-backend Pokémon team planner that works completely in the browser (including offline), helping players build balanced teams, understand type and stat synergies, receive clear explanations for why a Pokémon/move/ability/item fits, and map out their team's evolution and captures across a game's story campaign.

## Positioning

Combines Richi3f Pokémon Team Planner's low-friction 6-slot visual clarity with My Pokémon Team's mechanical accuracy (ability/item type interceptors, moveset coverage, stat balance), plus two differentiators: deterministic explainable recommendations and a Checkpoint-based Journey Planner for story playthroughs.

## Operating Context

- Runs 100% in the browser without a custom backend or user accounts.
- Deployed statically on Vercel CDN with offline PWA support via Service Worker and `IndexedDB`.
- Teams and journeys are shared via permanent, self-contained URLs (no remote database storage) and standard Pokémon Showdown text format.
- Language standard: English-only across all UI copy and Pokémon terminology.

## Capabilities and Constraints

- **Game Selection & Free Mode**: Entry screen presents curated mainline campaigns alongside an independent, generation-free **Free Mode** with unrestricted National Dex access (no generation picker or game restrictions).
- **Team Planner**: 6-slot minimalist team dock (Pokémon sprite, discreet name, accessible types, Gender toggle, Shiny toggle, and Adjust drawer for moves/ability/item/nature/tera) paired with an inline visual sprite browser (search + filters, one-click add/remove, zero tile text clutter). Team Analysis and Smart Recommendations expand on demand.
- **Team Analysis**: Generation-accurate defensive type chart (factoring in abilities like Levitate, Thick Fat, Wonder Guard, Flash Fire, Sap Sipper, Earth Eater, and items like Air Balloon), dual offensive coverage (STAB vs. actual Moveset), base stat balance, and actionable threat summaries.
- **Smart Recommendations**: Local deterministic multi-criteria scoring for Pokémon, moves, abilities, and items with structured human-readable reasons explaining every suggestion.
- **Standalone Journey Planner**: Dedicated campaign progression tree available exclusively when a game is selected. Rooted in starter choice, divided into campaign checkpoints (Gyms, Elite Four, Champion), and supporting parallel/chained intermediate branches (`Capture`, `Train`, `Evolve`, `Replace`, `Goal`) down to the final team. Initial campaign scope covers mainline titles up to **Generation 5 (Black 2 & White 2)**.
- **Team Sharing & Persistence**: Versioned compact shareable URLs (`v1_` and `v2_` supporting gender/shiny), Pokémon Showdown import/export, and local saved-team & journey-plan storage in `IndexedDB`.

## Product Principles

1. **Minimalism & Speed Before Complexity**: Start with game selection; keep team slots stripped to image, name, types, gender, shiny, and adjust; select Pokémon directly from the bottom visual sprite grid; reveal analysis and build drawers progressively.
2. **Mechanical Truth Over Shortcuts**: Never show misleading type charts—always apply generation-specific rules (Gen 1 vs. Gen 2–5 vs. Gen 6+ type charts, Pre-Gen 4 Physical/Special split) and ability/item immunities.
3. **Explain Every Recommendation**: Never show an opaque score or unexplained suggestion; every recommendation must state which team weakness, offensive blind spot, stat gap, or campaign bottleneck it solves.
4. **Accessible by Structure**: Type badges, multipliers, and matrices must never rely solely on color; pair calibrated colors with vector icons and tabular numeric labels.
5. **Offline-Ready & Zero-Lock-In**: Every core feature works offline once cached, and every team can be exported as a permanent URL or Showdown paste.

## Accessibility & Inclusion

- Target **WCAG 2.2 AA** compliance across Light and Dark modes.
- Colorblind-safe type badges and effectiveness multipliers (icon + text/numeric label alongside color).
- Full keyboard navigation (`1`–`6` slot shortcuts, `Cmd/Ctrl+K` quick picker, accessible Radix primitives).
