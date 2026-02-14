# Next 3 PR Slices (Execution Plan)

This file is the working reference for the next three implementation prompts.

## PR 1 - Run End Screen + Unified Run Finalization

### Goal
Complete Phase 1 by shipping a real run-end flow (win/lose) with a summary screen instead of immediately returning to menu.

### Scope
- Add a unified `endRun(status, summary)` path in game logic.
- Trigger loss end-state when player HP reaches 0.
- Keep win path for final-floor completion.
- Include run summary payload fields:
  - `status` (`won` or `lost`)
  - `floorsCleared`
  - `totalFloors`
  - `gold`
  - `turns`
  - `kills`
  - `seed`
  - `runLength`
- Add a UI overlay/state for run end with:
  - title (`Victory` / `Defeat`)
  - summary lines
  - action button (`Continue`) that returns to menu
- Remove the current immediate quit-on-complete behavior.

### Files likely touched
- `src/game.js`
- `src/main.js`
- `src/ui.js`
- `src/style.css`

### Acceptance criteria
- Finishing final boss/floor shows win screen with summary.
- Dying shows loss screen with summary.
- No auto-return to menu until player confirms.
- Existing run start + floor transition still works.
- No console errors.

### Validation
- Manual short run: start -> clear floor(s) -> win -> end screen -> menu.
- Manual short run: start -> die -> end screen -> menu.
- `npm run build` succeeds.

---

## PR 2 - Versioned Meta Save + Reward Persistence + Run History

### Goal
Implement persistence backbone required by v1: safe localStorage schema, persistent meta currency, and capped run history.

### Scope
- Add one save namespace key: `rlpwa.v1`.
- Save schema includes:
  - `version`
  - `metaCurrency`
  - `upgrades` (empty object for now)
  - `runHistory` (capped list)
- Add robust load behavior:
  - parse guard (`try/catch`)
  - fallback to defaults on invalid/missing data
  - lightweight migration hook by `version`
- On run end, convert run reward to `metaCurrency` and persist.
- Store run summary entry in capped history (for example last 20 runs).
- Show current `metaCurrency` on menu screen.

### Files likely touched
- `src/main.js`
- `src/ui.js`
- `src/game.js`
- `src/game/save.js` (new)

### Acceptance criteria
- Currency persists across page refresh.
- Run history persists and caps correctly.
- Corrupt save data does not crash game; defaults recover safely.
- Menu displays persistent currency.
- No console errors.

### Validation
- Complete one run and confirm currency increased on next run.
- Refresh page and confirm currency/history still present.
- Simulate bad localStorage payload and confirm safe fallback.
- `npm run build` succeeds.

---

## PR 3 - Minimal Meta Shop (Data-Driven Persistent Upgrades)

### Goal
Ship first playable meta-progression spending loop using small, non-trivializing upgrades.

### Scope
- Add data-driven upgrade definitions (id, label, cost, max rank, effect text).
- Add menu-accessible meta shop panel/overlay.
- Allow spending `metaCurrency` to buy upgrades.
- Persist purchased upgrade ranks in save data.
- Apply upgrades at run start (small effects only), e.g.:
  - +1 max HP (ranked)
  - +starting gold (small)
  - small potion-related QoL/economy tweak
- Add basic affordability/limit feedback in UI.

### Files likely touched
- `src/ui.js`
- `src/style.css`
- `src/main.js`
- `src/game.js`
- `src/game/meta-upgrades.js` (new)
- `src/game/save.js`

### Acceptance criteria
- Player can open shop, buy upgrade, and see currency deducted.
- Upgrade ranks persist across refresh.
- Upgrade effects apply in new runs.
- Cannot buy without enough currency or beyond max rank.
- No console errors.

### Validation
- Earn currency, buy an upgrade, start new run, verify effect.
- Refresh and verify upgrade/currency persistence.
- Attempt invalid purchases (no currency / maxed) and verify blocked behavior.
- `npm run build` succeeds.

---

## Delivery Notes for Each PR
- Keep each PR vertically shippable and end-to-end testable.
- Run required checks before finalizing:
  - `git status`
  - `npm run build`
- Commit with clear imperative message aligned to slice.
- Push after successful build.
