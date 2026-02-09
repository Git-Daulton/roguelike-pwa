# AGENT.md — Codex Operating Guide (Roguelike PWA)

## Role
You are an implementation agent working in this repo. Optimize for shipping playable vertical slices quickly while keeping code maintainable and data-driven.

## Primary Goals
- Maintain a complete playable loop at all times.
- Prefer small, shippable vertical slices over broad refactors.
- Keep gameplay deterministic and debuggable.

## Repo Basics
- Tooling: Vite (vanilla JS, ESM).
- Primary runtime: browser canvas + minimal DOM.
- Persistence: localStorage (v1).

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- When testing mobile on LAN: use `vite` server host binding in `vite.config.js` (`server.host=true`).

## Architecture Principles
- Data-driven design:
  - Enemies, items, equipment slots, and floor pacing should be defined in data modules (plain JS objects).
- Modularize early:
  - `src/game/` owns game logic; `src/ui/` owns minimal DOM UI; renderer isolated.
- Avoid framework adoption:
  - No React/Vue/etc. for v1 unless explicitly requested.
- Avoid deep rewrites unless they unlock multiple milestones.

## Suggested File Layout
- `src/main.js` — boot + wiring
- `src/game/state.js` — state shape + init
- `src/game/systems/` — turn loop, combat, AI, FOV, loot
- `src/game/content/` — enemies, items, bosses, progression tables
- `src/game/gen/` — map generation + set-pieces
- `src/render/` — canvas renderer + animation/fx hooks
- `src/ui/` — menu, run summary, meta shop, mobile controls

(Exact layout can evolve, but keep boundaries clear.)

## Gameplay Constraints (v1)
- Turn-based. One player action = one turn.
- Bump-to-attack only for v1 combat.
- Fog of war always enabled; support modifiers (items/effects).
- Runs are finite with a final boss.
- Desktop keyboard-first; mobile portrait supported but secondary.

## UX Rules
- Desktop should not scroll when using arrow keys.
- Mobile controls only shown on touch devices.
- Avoid UI overlays covering the playfield by default.

## Persistence Rules
- Use one localStorage namespace key (e.g., `rlpwa.v1`).
- Store:
  - meta currency
  - unlocked upgrades/achievements
  - run history (small capped list)
- Never corrupt saves silently:
  - version the save schema
  - fallback to defaults on parse failures

## Testing Expectations
Every change must include:
- manual run-through of a short run (start → floor transition → combat → end)
- smoke test that localStorage still loads
- no console errors
- `npm run build` must succeed before finalizing

## Performance Expectations
- Keep per-turn work bounded.
- Avoid large allocations each frame.
- A* should be bounded or only used for active enemies.

## Codex Output Format (important)
When proposing work, include:
- Plan: ON/OFF
- Reasoning effort: Low/Medium/High
- Single recommended path (no alternatives unless requested)
- At the end, include a short commit/push changelog.

## Git Hygiene
- Small commits aligned to slices.
- Commit messages: imperative, scoped.
  - Example: `Add run-length selection and floor transitions`
- Do not commit build artifacts (`dist/`).

## Safe Defaults
When uncertain, prefer:
- minimal stats system
- clear feedback over complex mechanics
- data tables over hardcoded branching
