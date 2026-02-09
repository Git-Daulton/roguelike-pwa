function fatal(msg, err) {
  console.error(msg, err)
  document.body.innerHTML = `
    <div style="padding:16px;font-family:monospace;background:#070a0e;color:#e6edf3;">
      <h2>Boot error</h2>
      <pre>${msg}${err ? '\n\n' + (err.stack || err) : ''}</pre>
    </div>
  `
}

// --- Canvas + DPI setup ---
const canvas = document.getElementById('c')
if (!canvas) fatal('Canvas #c not found. index.html must include <canvas id="c"> and nothing should overwrite #app.')

let ctx = null
try {
  ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) fatal('2D context unavailable (ctx is null).')
} catch (e) {
  fatal('Failed to create 2D context.', e)
}


function resizeCanvasToCSSPixels() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.floor(rect.width));
  const cssH = Math.max(1, Math.floor(rect.height));
  const w = Math.max(1, Math.floor(cssW * dpr));
  const h = Math.max(1, Math.floor(cssH * dpr));

  canvas.width = w;
  canvas.height = h;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;

  return { cssW, cssH, w, h, dpr };
}
let view = { cssW: 0, cssH: 0, w: 0, h: 0, dpr: 1 };
let running = false;
let cleanupFns = [];
let activeRunConfig = null;
const snapshotListeners = new Set();

// --- RNG ---
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Tiles / state ---
const T = { Wall: 0, Floor: 1 };

const state = {
  gridW: 90,
  gridH: 55,

  tiles: null,
  explored: null,
  visible: null,

  // Player
  px: 2,
  py: 2,
  php: 10,
  pMax: 10,

  // Enemy (single)
  ex: 0,
  ey: 0,
  ehp: 5,
  eMax: 5,
  eAlive: true,

  // FOV
  fovRadius: 8,

  // Camera / render
  camX: 0,
  camY: 0,
  margin: 12,
  tileSize: 16,
  viewTilesW: 40,
  viewTilesH: 25,

  // Rolling log
  log: [],
  logMax: 8,
};

const pf = {
  cameFrom: null,
  gScore: null,
  inOpen: null,
  closed: null,
  open: [], // array of {i,f}
};

function allocBuffers() {
  const n = state.gridW * state.gridH;
  state.tiles = new Uint8Array(n);
  state.explored = new Uint8Array(n);
  state.visible = new Uint8Array(n);

  pf.cameFrom = new Int32Array(n);
  pf.gScore = new Int32Array(n);
  pf.inOpen = new Uint8Array(n);
  pf.closed = new Uint8Array(n);
  pf.open.length = 0;
}

function idx(x, y) { return y * state.gridW + x; }
function inBounds(x, y) { return x >= 0 && y >= 0 && x < state.gridW && y < state.gridH; }
function isWalkable(x, y) {
  if (!inBounds(x, y)) return false;
  return state.tiles[idx(x, y)] === T.Floor;
}
function blocksSight(x, y) {
  if (!inBounds(x, y)) return true;
  return state.tiles[idx(x, y)] === T.Wall;
}

function logPush(s) {
  if (!s) return;
  state.log.push(s);
  if (state.log.length > state.logMax) state.log.shift();
}

function getSnapshot() {
  const totalFloors = activeRunConfig?.floorPlan?.floors ?? 1;
  return {
    player: { hp: state.php, maxHp: state.pMax },
    run: { currentFloor: 1, totalFloors },
    inventory: Array(9).fill(""),
    log: state.log.slice(-state.logMax),
  };
}

function emitSnapshot() {
  const snapshot = getSnapshot();
  for (const listener of snapshotListeners) listener(snapshot);
}

export function subscribeGameSnapshot(listener) {
  if (typeof listener !== "function") return () => {};
  snapshotListeners.add(listener);
  listener(getSnapshot());
  return () => snapshotListeners.delete(listener);
}

// --- Dungeon generation (rooms + corridors) ---
function fillWalls() {
  state.tiles.fill(T.Wall);
  state.explored.fill(0);
  state.visible.fill(0);
}
function carveRoom(x, y, w, h) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (inBounds(xx, yy)) state.tiles[idx(xx, yy)] = T.Floor;
    }
  }
}
function carveH(x1, x2, y) {
  const a = Math.min(x1, x2);
  const b = Math.max(x1, x2);
  for (let x = a; x <= b; x++) if (inBounds(x, y)) state.tiles[idx(x, y)] = T.Floor;
}
function carveV(y1, y2, x) {
  const a = Math.min(y1, y2);
  const b = Math.max(y1, y2);
  for (let y = a; y <= b; y++) if (inBounds(x, y)) state.tiles[idx(x, y)] = T.Floor;
}
function roomsOverlap(a, b, pad = 1) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function placeEnemyFarFromPlayer() {
  // Try to put enemy far from player on a floor tile.
  let best = null;
  for (let tries = 0; tries < 3000; tries++) {
    const x = randInt(1, state.gridW - 2);
    const y = randInt(1, state.gridH - 2);
    if (!isWalkable(x, y)) continue;
    const d = Math.abs(x - state.px) + Math.abs(y - state.py);
    if (!best || d > best.d) best = { x, y, d };
  }
  state.ex = best ? best.x : state.px + 8;
  state.ey = best ? best.y : state.py + 8;
}

function generateDungeon() {
  fillWalls();
  state.log = [];

  const rooms = [];
  const maxRooms = 22;
  const roomW = [5, 13];
  const roomH = [5, 11];

  for (let i = 0; i < 600 && rooms.length < maxRooms; i++) {
    const w = randInt(roomW[0], roomW[1]);
    const h = randInt(roomH[0], roomH[1]);
    const x = randInt(1, state.gridW - w - 2);
    const y = randInt(1, state.gridH - h - 2);
    const room = { x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) };

    let ok = true;
    for (const r of rooms) if (roomsOverlap(room, r, 1)) { ok = false; break; }
    if (!ok) continue;

    carveRoom(room.x, room.y, room.w, room.h);

    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1];
      if (Math.random() < 0.5) {
        carveH(prev.cx, room.cx, prev.cy);
        carveV(prev.cy, room.cy, room.cx);
      } else {
        carveV(prev.cy, room.cy, prev.cx);
        carveH(prev.cx, room.cx, room.cy);
      }
    }

    rooms.push(room);
  }

  // Player start
  if (rooms.length > 0) {
    state.px = rooms[0].cx;
    state.py = rooms[0].cy;
  } else {
    carveRoom(2, 2, 8, 8);
    state.px = 5; state.py = 5;
  }

  // Player stats
  state.php = state.pMax;

  // Enemy
  state.eAlive = true;
  state.eMax = 5;
  state.ehp = 5;

  if (rooms.length >= 2) {
    const r = rooms[rooms.length - 1];
    state.ex = r.cx;
    state.ey = r.cy;
  } else {
    placeEnemyFarFromPlayer();
  }

  logPush("New floor. Find the enemy.");
  recomputeFOV();
  updateCamera();
}

// --- LOS / FOV ---
function hasLineOfSight(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }

    if (x === x1 && y === y1) break;
    if (blocksSight(x, y)) return false;
  }
  return true;
}

function recomputeFOV() {
  state.visible.fill(0);

  const r = state.fovRadius;
  const r2 = r * r;
  const x0 = state.px, y0 = state.py;

  const i0 = idx(x0, y0);
  state.visible[i0] = 1;
  state.explored[i0] = 1;

  for (let y = y0 - r; y <= y0 + r; y++) {
    for (let x = x0 - r; x <= x0 + r; x++) {
      if (!inBounds(x, y)) continue;
      const dx = x - x0, dy = y - y0;
      if (dx * dx + dy * dy > r2) continue;

      if (hasLineOfSight(x0, y0, x, y)) {
        const i = idx(x, y);
        state.visible[i] = 1;
        state.explored[i] = 1;
      }
    }
  }
}

// --- Camera / viewport ---
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function computeViewport() {
  const { w, h } = view;
  const margin = Math.max(1, Math.floor(state.margin * view.dpr));

  const usableW = Math.max(1, w - margin * 2);
  const usableH = Math.max(1, h - margin * 2);

  const tile = Math.floor(Math.min(usableW / 40, usableH / 25));
  const minTile = Math.max(1, Math.floor(12 * view.dpr));
  const maxTile = Math.max(minTile, Math.floor(22 * view.dpr));
  state.tileSize = clamp(tile, minTile, maxTile);

  state.viewTilesW = Math.floor(usableW / state.tileSize);
  state.viewTilesH = Math.floor(usableH / state.tileSize);

  state.viewTilesW = Math.max(20, state.viewTilesW);
  state.viewTilesH = Math.max(12, state.viewTilesH);

  state.viewTilesW = Math.min(state.gridW, state.viewTilesW);
  state.viewTilesH = Math.min(state.gridH, state.viewTilesH);
}

function updateCamera() {
  const halfW = Math.floor(state.viewTilesW / 2);
  const halfH = Math.floor(state.viewTilesH / 2);

  const maxX = state.gridW - state.viewTilesW;
  const maxY = state.gridH - state.viewTilesH;

  state.camX = clamp(state.px - halfW, 0, Math.max(0, maxX));
  state.camY = clamp(state.py - halfH, 0, Math.max(0, maxY));
}

// --- Turn helpers ---
function distManhattan(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}
function isAdjacent(ax, ay, bx, by) {
  return distManhattan(ax, ay, bx, by) === 1;
}
function enemyCanSeePlayer() {
  if (!state.eAlive) return false;
  const dx = state.px - state.ex;
  const dy = state.py - state.ey;
  if (dx * dx + dy * dy > state.fovRadius * state.fovRadius) return false;
  return hasLineOfSight(state.ex, state.ey, state.px, state.py);
}

// --- A* Pathfinding (bounded, reused arrays) ---
function astarNextStep(sx, sy, gx, gy, maxNodes = 1800) {
  if (sx === gx && sy === gy) return null;

  const W = state.gridW;
  const H = state.gridH;

  const startI = idx(sx, sy);
  const goalI = idx(gx, gy);

  const cameFrom = pf.cameFrom;
  const gScore = pf.gScore;
  const inOpen = pf.inOpen;
  const closed = pf.closed;
  const open = pf.open;

  cameFrom.fill(-1);
  gScore.fill(1_000_000);
  inOpen.fill(0);
  closed.fill(0);
  open.length = 0;

  function heuristic(i) {
    const x = i % W;
    const y = (i / W) | 0;
    return Math.abs(x - gx) + Math.abs(y - gy);
  }

  gScore[startI] = 0;
  open.push({ i: startI, f: heuristic(startI) });
  inOpen[startI] = 1;

  let processed = 0;

  while (open.length > 0) {
    // pop best f (linear scan; bounded by maxNodes)
    let bestK = 0;
    for (let k = 1; k < open.length; k++) {
      if (open[k].f < open[bestK].f) bestK = k;
    }
    const current = open[bestK].i;
    open.splice(bestK, 1);
    inOpen[current] = 0;

    if (current === goalI) {
      // Reconstruct: return the step after start
      let cur = current;
      let prev = cameFrom[cur];
      while (prev !== -1 && prev !== startI) {
        cur = prev;
        prev = cameFrom[cur];
      }
      return { nx: cur % W, ny: (cur / W) | 0 };
    }

    closed[current] = 1;
    processed++;
    if (processed > maxNodes) break;

    const cx = current % W;
    const cy = (current / W) | 0;

    // 4-way neighbors
    const neigh = [];
    if (cx + 1 < W) neigh.push({ x: cx + 1, y: cy });
    if (cx - 1 >= 0) neigh.push({ x: cx - 1, y: cy });
    if (cy + 1 < H) neigh.push({ x: cx, y: cy + 1 });
    if (cy - 1 >= 0) neigh.push({ x: cx, y: cy - 1 });

    for (const n of neigh) {
      const ni = idx(n.x, n.y);
      if (closed[ni]) continue;
      if (state.tiles[ni] !== T.Floor) continue;

      const tentativeG = gScore[current] + 1;
      if (tentativeG < gScore[ni]) {
        cameFrom[ni] = current;
        gScore[ni] = tentativeG;
        const f = tentativeG + heuristic(ni);

        if (!inOpen[ni]) {
          open.push({ i: ni, f });
          inOpen[ni] = 1;
        } else {
          for (let k = 0; k < open.length; k++) {
            if (open[k].i === ni) { open[k].f = f; break; }
          }
        }
      }
    }
  }

  return null;
}

// --- Enemy turn ---
function enemyTurn() {
  if (!state.eAlive || state.php === 0) return;

  if (isAdjacent(state.ex, state.ey, state.px, state.py)) {
    const dmg = 1;
    state.php = Math.max(0, state.php - dmg);
    logPush(`Enemy damages you (-${dmg}). HP: ${state.php}/${state.pMax}`);
    if (state.php === 0) logPush("You were defeated.");
    return;
  }

  if (!enemyCanSeePlayer()) return;

  const step = astarNextStep(state.ex, state.ey, state.px, state.py, 1800);
  if (!step) return;

  if (step.nx === state.px && step.ny === state.py) return;
  state.ex = step.nx;
  state.ey = step.ny;
}

// --- Player action / turn loop ---
function playerAct(type, dx = 0, dy = 0) {
  if (state.php === 0) return;

  let acted = false;

  if (type === "move") {
    const nx = state.px + dx;
    const ny = state.py + dy;

    if (state.eAlive && nx === state.ex && ny === state.ey) {
      const dmg = 1;
      state.ehp = Math.max(0, state.ehp - dmg);
      logPush(`You damage enemy (-${dmg}). Enemy HP: ${state.ehp}/${state.eMax}`);
      if (state.ehp === 0) {
        state.eAlive = false;
        logPush("Enemy defeated.");
      }
      acted = true;
    } else if (isWalkable(nx, ny)) {
      state.px = nx;
      state.py = ny;
      acted = true;
    }
  } else if (type === "wait") {
    acted = true;
  } else if (type === "reset") {
    generateDungeon();
    draw();
    emitSnapshot();
    return;
  }

  if (!acted) {
    draw();
    emitSnapshot();
    return;
  }

  recomputeFOV();
  updateCamera();

  enemyTurn();

  recomputeFOV();
  updateCamera();

  draw();
  emitSnapshot();
}

// --- Rendering helpers ---
function drawBar(x, y, w, h, pct, bg, fg, border) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  const iw = Math.max(0, Math.floor(w * clamp(pct, 0, 1)));
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, iw, h);

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// --- Rendering ---
function draw() {
  const { w, h } = view;
  ctx.fillStyle = "#070a0e";
  ctx.fillRect(0, 0, w, h);

  const tileSize = state.tileSize;
  const gridPxW = state.viewTilesW * tileSize;
  const gridPxH = state.viewTilesH * tileSize;
  const ox = Math.floor((w - gridPxW) / 2);
  const oy = Math.floor((h - gridPxH) / 2);

  ctx.font = `${Math.max(8, Math.floor(tileSize * 0.92))}px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Tiles
  for (let vy = 0; vy < state.viewTilesH; vy++) {
    const y0 = state.camY + vy;
    for (let vx = 0; vx < state.viewTilesW; vx++) {
      const x0 = state.camX + vx;
      const i = idx(x0, y0);

      const vis = state.visible[i] === 1;
      const exp = state.explored[i] === 1;
      if (!vis && !exp) continue;

      const t = state.tiles[i];
      const cx = ox + vx * tileSize + Math.floor(tileSize / 2);
      const cy = oy + vy * tileSize + Math.floor(tileSize / 2);

      if (t === T.Wall) {
        ctx.fillStyle = vis ? "#b7c5d3" : "#3d4a57";
        ctx.fillText("#", cx, cy);
      } else {
        ctx.fillStyle = vis ? "#556575" : "#24303c";
        ctx.fillText(".", cx, cy);
      }
    }
  }

  // Enemy (hp bar above it when visible)
  if (state.eAlive) {
    const ei = idx(state.ex, state.ey);
    const vis = state.visible[ei] === 1;
    const exp = state.explored[ei] === 1;

    if (vis || exp) {
      const vx = state.ex - state.camX;
      const vy = state.ey - state.camY;

      if (vx >= 0 && vy >= 0 && vx < state.viewTilesW && vy < state.viewTilesH) {
        const cx = ox + vx * tileSize + Math.floor(tileSize / 2);
        const cy = oy + vy * tileSize + Math.floor(tileSize / 2);

        ctx.fillStyle = vis ? "#ffcf99" : "#6b5745";
        ctx.fillText("g", cx, cy);

        if (vis) {
          const barW = Math.max(18, Math.floor(tileSize * 1.4));
          const barH = 6;
          const barX = cx - Math.floor(barW / 2);
          const barY = cy - Math.floor(tileSize * 0.75);
          drawBar(
            barX,
            barY,
            barW,
            barH,
            state.ehp / state.eMax,
            "rgba(0,0,0,0.55)",
            "rgba(255,160,80,0.95)",
            "rgba(255,255,255,0.25)"
          );
        }
      }
    }
  }

  // Player
  {
    const vx = state.px - state.camX;
    const vy = state.py - state.camY;
    if (vx >= 0 && vy >= 0 && vx < state.viewTilesW && vy < state.viewTilesH) {
      const cx = ox + vx * tileSize + Math.floor(tileSize / 2);
      const cy = oy + vy * tileSize + Math.floor(tileSize / 2);
      ctx.fillStyle = "#e6edf3";
      ctx.fillText("@", cx, cy);
    }
  }

}

// --- Input wiring ---
function applyTouchClass() {
  const isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  document.documentElement.classList.toggle("touch", isTouch);
}

function handleAction(act) {
  if (!running) return;
  switch (act) {
    case "up": return playerAct("move", 0, -1);
    case "down": return playerAct("move", 0, 1);
    case "left": return playerAct("move", -1, 0);
    case "right": return playerAct("move", 1, 0);
    case "wait": return playerAct("wait");
    case "reset": return playerAct("reset");
  }
}

function bindControls() {
  const controls = document.getElementById("controls");
  if (!controls) return () => {};

  const onControlsClick = (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    handleAction(btn.dataset.act);
  };
  const onControlsContextMenu = (e) => e.preventDefault();
  const preventKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "]);
  const onWindowKeyDown = (e) => {
    const k = e.key;
    if (preventKeys.has(k)) e.preventDefault();
    if (k === "ArrowUp") handleAction("up");
    else if (k === "ArrowDown") handleAction("down");
    else if (k === "ArrowLeft") handleAction("left");
    else if (k === "ArrowRight") handleAction("right");
    else if (k === " " || k === "Enter") handleAction("wait");
  };

  controls.addEventListener("click", onControlsClick);
  controls.addEventListener("contextmenu", onControlsContextMenu);
  window.addEventListener("keydown", onWindowKeyDown, { passive: false });

  return () => {
    controls.removeEventListener("click", onControlsClick);
    controls.removeEventListener("contextmenu", onControlsContextMenu);
    window.removeEventListener("keydown", onWindowKeyDown);
  };
}

export function startGame(runConfig, options = {}) {
  if (running) stopGame();
  running = true;
  activeRunConfig = runConfig;
  void options;

  applyTouchClass();
  allocBuffers();
  cleanupFns.push(bindControls());
  generateDungeon();

  const applyResize = () => {
    view = resizeCanvasToCSSPixels();
    computeViewport();
    updateCamera();
    draw();
  };

  window.addEventListener("resize", applyResize);
  cleanupFns.push(() => window.removeEventListener("resize", applyResize));
  applyResize();
  emitSnapshot();
}

export function stopGame() {
  if (!running) return;
  for (let i = cleanupFns.length - 1; i >= 0; i--) cleanupFns[i]();
  cleanupFns = [];
  running = false;
  activeRunConfig = null;
}
