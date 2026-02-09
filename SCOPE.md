# Roguelike PWA — Scope (v1)

## Vision
A progressive, RPG-like, turn-based roguelike with permadeath and light meta-progression. Each run escalates through floors, bosses, and a final encounter. The v1 goal is a complete, fun loop that’s polished enough to share with friends for feedback (not store-ready).

## Platforms
- Primary: Desktop keyboard (best experience).
- Secondary: Mobile portrait-only; touch UI is supported but not the design driver.
- Target: PWA first. Android packaging (TWA) is explicitly post-v1.

## Definition of Done (v1)
A complete run can be started, played, and finished:
- Menu → choose run length → play floors → fight bosses → final encounter → run end screen
- Rewards granted (currency + run record)
- Meta upgrades persist across runs (localStorage)
- Bugs/edge cases acceptable if they don’t frequently break runs or corrupt saves.

## Core Game Pillars
- Turn-based, grid movement (each action = turn).
- Bump-to-attack for v1.
- Fog of war / FOV is always on and modifiable via effects/items.
- Random maps each run with occasional set-piece rooms (boss arenas, hazards).
- Meaningful itemization: consumables + equipment that change decisions.

## Run Structure / Length Options
Runs are finite and end with a final encounter.
Offer selectable run length at start:
- Short: 2 floors + boss + final
- Medium: 4 floors + bosses + final
- Long: 8 floors total OR “Two Dungeon” mode (2 dungeons x 4–5 floors)

Exact floor counts can be tuned; the structure matters more than the number.

## Progression & Difficulty
- Enemies scale with depth.
- Boss gates: either “reach exit” or “defeat boss to unlock exit”.
- Final boss is always present and should test the player’s build.
- Runs award currency + a run summary (depth reached, kills, turns, etc.).

## Meta-Progression (v1)
Light but motivating:
- Currency awarded per run.
- Currency spent in a simple “meta shop” between runs.
- Achievement-style unlocks can grant small permanent upgrades (e.g., “25 melee kills → +1 melee damage”).
- Meta progression must not trivialize early floors; focus on variety and small advantages.

Persistence: localStorage (no accounts, no cloud).

## Player Systems (v1)
### Damage model
- Mostly flat damage values and small modifiers.
- No RPG stats (STR/DEX/etc.) in v1 unless explicitly added later.

### Health / recovery
- No automatic full heal when changing floors.
- v1 must include a sustainable recovery model (limited healing items, scarce recovery events, or a rest mechanic with tradeoffs) to prevent “death spirals” on longer runs.

### Inventory
- Consumables belt: 9 slots (quick use).
- Pick up / drop / use is part of v1 loop.

### Equipment (classic slots, data-driven)
- Baseline slots: weapon, armor, rings.
- Slot definitions must be data-driven (adding/removing slots later should be config, not a refactor).
- Equipment provides simple, readable modifiers (damage, mitigation, effects, FOV modifiers, etc.).

### Status effects
Start small; expand as it improves decisions:
- Examples: poison, blind/reduced FOV, regen, slow.

## Content Targets (v1)
- Enemies: target 20 “common” enemies in the data set, but each run samples ~5–8 to keep runs readable.
- Bosses: at least 3 bosses + 1 final boss for v1.
- Items: “full ecosystem” direction, shipped as minimum viable categories:
  - Consumables (healing, utility, buffs)
  - Weapons/armor (stat-like modifiers without stats)
  - Rings/trinkets (passives)
  - Optional: scroll-like single-use effects (later in v1 if time)

## Map Generation (v1)
- Default: rooms + corridors.
- Add variation through:
  - Alternate room shapes
  - Occasional loops
  - Set-piece rooms (boss arena, hazard room)
- Hazards: include only if they meaningfully change tactics.

## UI/UX (v1)
- Primary display: ASCII / glyph tiles on canvas.
- Feedback:
  - Combat log is acceptable early, but v1 should move toward clearer player feedback (e.g., floating damage numbers or simple hit animations).
- HUD: minimalist initially; expand only if it increases clarity.
- Mobile: portrait-only; touch UI usable but secondary to keyboard-first design.

## Out of Scope Until After v1
- Multiplayer
- Accounts / login
- Cloud saves
- App Store / Play Store release work (TWA packaging)
- Complex animation systems / particle-heavy effects
- Audio (optional post-v1)

## Roadmap (v1) — Vertical Slices
A “slice” must be playable and testable end-to-end.

### Phase 1 — Run shell (3–4 slices)
1) Main menu + run length selection (short/medium/long)
2) Floor transitions (stairs/door) + finite floor plan per run length
3) Boss gate rule (reach exit vs defeat boss to unlock exit)
4) Run end screen (win/lose) + run summary + award currency

### Phase 2 — Progression backbone (2–3 slices)
5) Meta save system (versioned localStorage schema) + currency + capped run history
6) Meta shop (spend currency on small persistent upgrades)
7) Achievement unlocks (kill counts, etc.) granting small perks

### Phase 3 — Content ecosystem (3–4 slices)
8) Enemy roster system: 20-enemy bestiary data + per-run sampling
9) Item drops + 9-slot inventory: pickup/use flow
10) Equipment: weapon/armor/rings; data-driven slot definitions; modifiers
11) Boss set pieces: 3 bosses + final boss + dedicated arenas

### Phase 4 — Polish for friends (2–3 slices)
12) Combat feedback upgrade (floating numbers or improved hit feedback)
13) Map variety (a couple layout families + set rooms/hazards)
14) Balance + hardening (recovery economy, save safety, bug sweep)
