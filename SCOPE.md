# Roguelike PWA — Scope (v1)

## Vision
A progressive, RPG-like, turn-based roguelike with permadeath and light meta-progression. Each run escalates through floors, bosses, and a final encounter. The v1 goal is a complete, fun loop that’s polished enough to share with friends for feedback (not store-ready).

## Platforms
- Primary: Desktop keyboard (best experience).
- Secondary: Mobile portrait-only; touch UI is supported but not the design driver.
- Target: PWA first. Android packaging (TWA) is explicitly post-v1.

## Definition of Done (v1)
A complete run can be started, played, and finished:
- Menu → choose run length → play floors → fight bosses → final boss → run end screen
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
- Short: 2 floors + boss + final (fast feedback run)
- Medium: 4 floors + bosses + final
- Long: 8 floors total OR “Two Dungeon” mode (2 dungeons x 4–5 floors) with a mid-boss and final boss

Exact floor counts can be tuned. Structure matters more than the number.

## Progression & Difficulty
- Enemies scale with depth.
- Boss gates: either “reach exit” or “defeat boss to unlock exit”.
- Final boss is always present and should test the player’s build.
- Runs award currency + a run summary (depth reached, kills, time, etc.).

## Meta-Progression (v1)
Light but motivating:
- Currency awarded per run.
- Currency spent in a simple “meta shop” between runs.
- Achievement-style unlocks can grant small permanent upgrades (e.g., “25 melee kills → +1 melee damage”).
- Meta progression must not trivialize early floors; focus on variety and small advantages.

Persistence: localStorage (no accounts, no cloud).

## Content Targets (v1)
- Enemies: target 20 “common” enemies in the data set, but each run samples ~5–8 to keep runs readable.
- Add elites/bosses separately (at least 3 bosses + 1 final boss for v1).
- Items: “full ecosystem” direction, but shipped as minimum viable categories:
  - Consumables (healing, utility, buffs)
  - Weapons/armor (stat modifiers)
  - Trinkets/charms (passives)
  - Optional: scroll-like single-use effects (later in v1 if time)

## Player Systems (v1)
- Stats: keep minimal initially (HP, base damage, maybe defense/mitigation). Expand only if it improves decisions.
- Inventory:
  - 9-slot consumable belt (quick use)
  - Equipment slots are data-driven (editable without refactor)
- Status effects: only a small set initially (poison, blind/reduced FOV, regen, etc.).

## Map Generation (v1)
- Default: rooms + corridors (works).
- Add variation through:
  - Alternate room shapes
  - Occasional loops
  - Set-piece rooms (boss arena, hazard room)
- Hazards: a small handful only if they meaningfully change tactics.

## UI/UX (v1)
- Primary display: ASCII / glyph tiles on canvas.
- Feedback:
  - Combat log is OK for debugging, but player feedback should trend toward clearer indicators (e.g., floating damage numbers, subtle animation).
- HUD: minimalist early; expand only if it increases clarity.
- Mobile: portrait-only; touch UI usable but not the primary design constraint.

## Out of Scope Until After v1
- Multiplayer
- Accounts / login
- Cloud saves
- App Store / Play Store release work (TWA packaging)
- Complex animations/particle systems
- Audio (optional post-v1)

## Milestone Slices (recommended order)
M1 — “Run Shell”
- Main menu + run length selection
- Floors + stairs + boss gate + final boss placeholder
- Run end screen + currency reward + run record

M2 — “Content & Items”
- Data-driven enemy roster sampling per run
- Item drops + inventory + equipment
- Basic meta shop + persistent upgrades

M3 — “Polish for Friends”
- Clear combat feedback (floating numbers or similar)
- Better set-piece rooms + boss arenas
- Balance pass + bug fixes + save robustness
