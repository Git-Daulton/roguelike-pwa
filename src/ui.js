export const RUN_PRESETS = {
  short: { floors: 2, bosses: 1, hasFinal: true },
  medium: { floors: 4, bosses: 1, hasFinal: true },
  long: { floors: 8, bosses: 1, hasFinal: true }
};

let menuOverlay = null;
let selectedRunLength = null;
let seedInput = null;
let startButton = null;
let summaryLine = null;
let menuMetaLine = null;
let onStart = () => {};
let onOpenShop = () => {};
let onQuit = () => {};
let quitButton = null;
let runEndOverlay = null;
let runEndTitle = null;
let runEndList = null;
let onRunEndContinue = () => {};
let shopOverlay = null;
let shopCurrencyLine = null;
let shopList = null;
let onMetaShopBuy = () => {};
let onMetaShopClose = () => {};
let hudRoot = null;
let hudHpLine = null;
let hudFloorLine = null;
let hudGoldLine = null;
let hudInventorySlots = [];
let hudLogList = null;
let onUseInventorySlot = () => {};
let onToggleDebugMenu = () => {};
let debugMenuRoot = null;
let debugForm = null;
let onUpdateDebugSettings = () => {};
let onSpawnEnemy = () => {};
let onStairFinder = () => {};

function normalizeSeed(value) {
  const trimmed = String(value || "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function generateSeed() {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 1e9).toString(36);
  return `${t}-${r}`;
}

function toLabel(runLength) {
  return runLength[0].toUpperCase() + runLength.slice(1);
}

function runPlanText(runLength) {
  const preset = RUN_PRESETS[runLength];
  return `${preset.floors} floors + bosses + final`;
}

export function buildRunConfig(runLength, seedValue) {
  const preset = RUN_PRESETS[runLength];
  if (!preset) throw new Error(`Unknown run length: ${runLength}`);

  return {
    runLength,
    floorPlan: { ...preset },
    seed: normalizeSeed(seedValue) || generateSeed()
  };
}

function updateRunButtonState() {
  if (!menuOverlay) return;
  const buttons = menuOverlay.querySelectorAll("button[data-run-length]");
  for (const button of buttons) {
    const isSelected = button.dataset.runLength === selectedRunLength;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  }
}

function updateStartButtonState() {
  if (!startButton) return;
  const disabled = !selectedRunLength;
  startButton.disabled = disabled;
  startButton.classList.toggle("disabled", disabled);
  startButton.setAttribute("aria-disabled", disabled ? "true" : "false");
}

function updateSummaryLine() {
  if (!summaryLine) return;

  const seedText = normalizeSeed(seedInput ? seedInput.value : "") || "random on begin";
  if (!selectedRunLength) {
    summaryLine.textContent = `Selected: none | Seed: ${seedText}`;
    return;
  }

  summaryLine.textContent = `Selected: ${toLabel(selectedRunLength)} (${runPlanText(selectedRunLength)}) | Seed: ${seedText}`;
}

function updateMenuState() {
  updateRunButtonState();
  updateStartButtonState();
  updateSummaryLine();
}

function selectLength(runLength) {
  selectedRunLength = runLength;
  updateMenuState();
}

function beginRun() {
  if (!selectedRunLength) return;
  const runConfig = buildRunConfig(selectedRunLength, seedInput ? seedInput.value : "");
  if (seedInput) seedInput.value = runConfig.seed;
  updateSummaryLine();
  onStart(runConfig);
}

export function mountMenu({ onStart: onStartCb, onOpenShop: onOpenShopCb } = {}) {
  if (typeof onStartCb === "function") onStart = onStartCb;
  if (typeof onOpenShopCb === "function") onOpenShop = onOpenShopCb;

  if (!menuOverlay) {
    const app = document.getElementById("app");
    if (!app) throw new Error("Menu mount failed: #app not found.");

    menuOverlay = document.createElement("section");
    menuOverlay.className = "menu-overlay";
    menuOverlay.setAttribute("aria-label", "Run Start Menu");

    const card = document.createElement("div");
    card.className = "menu-card";

    const title = document.createElement("h1");
    title.className = "menu-title";
    title.textContent = "Roguelike PWA";

    const runButtons = document.createElement("div");
    runButtons.className = "menu-run-buttons";

    for (const runLength of ["short", "medium", "long"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-btn";
      button.dataset.runLength = runLength;
      button.textContent = toLabel(runLength);
      button.addEventListener("click", () => selectLength(runLength));
      runButtons.appendChild(button);
    }

    summaryLine = document.createElement("p");
    summaryLine.className = "menu-selection-summary";

    menuMetaLine = document.createElement("p");
    menuMetaLine.className = "menu-selection-summary menu-meta-currency";
    menuMetaLine.textContent = "Meta Currency: 0";

    const seedWrap = document.createElement("label");
    seedWrap.className = "menu-seed-wrap";
    seedWrap.textContent = "Seed (optional)";

    seedInput = document.createElement("input");
    seedInput.type = "text";
    seedInput.className = "menu-seed";
    seedInput.placeholder = "Random";
    seedInput.autocomplete = "off";
    seedInput.addEventListener("input", updateSummaryLine);
    seedWrap.appendChild(seedInput);

    startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "menu-btn menu-btn-start";
    startButton.textContent = "Begin Run";
    startButton.addEventListener("click", beginRun);

    const shopButton = document.createElement("button");
    shopButton.type = "button";
    shopButton.className = "menu-btn menu-shop-btn";
    shopButton.textContent = "Meta Shop";
    shopButton.addEventListener("click", () => onOpenShop());

    card.appendChild(title);
    card.appendChild(runButtons);
    card.appendChild(summaryLine);
    card.appendChild(menuMetaLine);
    card.appendChild(seedWrap);
    card.appendChild(startButton);
    card.appendChild(shopButton);
    menuOverlay.appendChild(card);
    app.appendChild(menuOverlay);

    quitButton = document.createElement("button");
    quitButton.type = "button";
    quitButton.className = "btn inrun-quit";
    quitButton.textContent = "Quit to Menu";
    quitButton.addEventListener("click", () => onQuit());
    app.appendChild(quitButton);

    updateMenuState();
  }
}

export function setMenuMetaCurrency(value) {
  if (!menuMetaLine) return;
  const amount = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  menuMetaLine.textContent = `Meta Currency: ${amount}`;
}

export function setQuitHandler(handler) {
  onQuit = typeof handler === "function" ? handler : () => {};
}

export function showMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.remove("is-hidden");
  updateMenuState();
}

export function hideMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.add("is-hidden");
}

export function setInRunUIVisible(isVisible) {
  if (!quitButton) return;
  quitButton.classList.toggle("is-visible", Boolean(isVisible));
}

function summaryLabel(status) {
  return status === "won" ? "Victory" : "Defeat";
}

function summaryLines(summary) {
  if (!summary) return [];
  return [
    `Status: ${summary.status ?? "unknown"}`,
    `Floors: ${summary.floorsCleared ?? 0}/${summary.totalFloors ?? 0}`,
    `Gold: ${summary.gold ?? 0}`,
    `Turns: ${summary.turns ?? 0}`,
    `Kills: ${summary.kills ?? 0}`,
    `Seed: ${summary.seed ?? "n/a"}`,
    `Run: ${summary.runLength ?? "n/a"}`
  ];
}

export function mountRunEnd({ onContinue } = {}) {
  if (typeof onContinue === "function") onRunEndContinue = onContinue;
  if (runEndOverlay) return;

  const app = document.getElementById("app");
  if (!app) return;

  runEndOverlay = document.createElement("section");
  runEndOverlay.className = "runend-overlay is-hidden";
  runEndOverlay.setAttribute("aria-label", "Run End Summary");

  const card = document.createElement("div");
  card.className = "runend-card";

  runEndTitle = document.createElement("h2");
  runEndTitle.className = "runend-title";
  runEndTitle.textContent = "Run End";

  runEndList = document.createElement("ul");
  runEndList.className = "runend-list";

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.className = "runend-btn";
  continueButton.textContent = "Continue";
  continueButton.addEventListener("click", () => onRunEndContinue());

  card.appendChild(runEndTitle);
  card.appendChild(runEndList);
  card.appendChild(continueButton);
  runEndOverlay.appendChild(card);
  app.appendChild(runEndOverlay);
}

export function setRunEndContinueHandler(handler) {
  onRunEndContinue = typeof handler === "function" ? handler : () => {};
}

export function showRunEnd(summary) {
  if (!runEndOverlay) return;
  if (runEndTitle) runEndTitle.textContent = summaryLabel(summary?.status);
  if (runEndList) {
    runEndList.innerHTML = "";
    for (const line of summaryLines(summary)) {
      const li = document.createElement("li");
      li.textContent = line;
      runEndList.appendChild(li);
    }
  }
  runEndOverlay.classList.remove("is-hidden");
}

export function hideRunEnd() {
  if (!runEndOverlay) return;
  runEndOverlay.classList.add("is-hidden");
}

export function mountMetaShop({ onBuyUpgrade, onClose } = {}) {
  if (typeof onBuyUpgrade === "function") onMetaShopBuy = onBuyUpgrade;
  if (typeof onClose === "function") onMetaShopClose = onClose;
  if (shopOverlay) return;

  const app = document.getElementById("app");
  if (!app) return;

  shopOverlay = document.createElement("section");
  shopOverlay.className = "shop-overlay is-hidden";
  shopOverlay.setAttribute("aria-label", "Meta Shop");

  const card = document.createElement("div");
  card.className = "shop-card";

  const title = document.createElement("h2");
  title.className = "shop-title";
  title.textContent = "Meta Shop";

  shopCurrencyLine = document.createElement("p");
  shopCurrencyLine.className = "shop-currency";

  shopList = document.createElement("div");
  shopList.className = "shop-list";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "shop-close-btn";
  closeButton.textContent = "Close";
  closeButton.addEventListener("click", () => onMetaShopClose());

  card.appendChild(title);
  card.appendChild(shopCurrencyLine);
  card.appendChild(shopList);
  card.appendChild(closeButton);
  shopOverlay.appendChild(card);
  app.appendChild(shopOverlay);
}

export function setMetaShopHandlers({ onBuyUpgrade, onClose } = {}) {
  if (typeof onBuyUpgrade === "function") onMetaShopBuy = onBuyUpgrade;
  if (typeof onClose === "function") onMetaShopClose = onClose;
}

export function showMetaShop({ metaCurrency = 0, upgrades = {}, definitions = [] } = {}) {
  if (!shopOverlay || !shopCurrencyLine || !shopList) return;

  const funds = Number.isFinite(metaCurrency) ? Math.max(0, Math.floor(metaCurrency)) : 0;
  shopCurrencyLine.textContent = `Meta Currency: ${funds}`;
  shopList.innerHTML = "";

  for (const definition of definitions) {
    const rankRaw = upgrades?.[definition.id];
    const rank = Number.isFinite(rankRaw) ? Math.max(0, Math.floor(rankRaw)) : 0;
    const nextRank = rank + 1;
    const cost = nextRank <= definition.maxRank ? definition.costs[nextRank - 1] : null;
    const canBuy = cost !== null && funds >= cost;

    const row = document.createElement("div");
    row.className = "shop-row";

    const text = document.createElement("div");
    text.className = "shop-row-text";
    const effect = document.createElement("div");
    effect.className = "shop-effect";
    const costText = cost === null ? "Maxed" : `Next cost: ${cost}`;
    text.textContent = `${definition.label} (${rank}/${definition.maxRank})`;
    effect.textContent = `${definition.description} | ${costText}`;

    const buyButton = document.createElement("button");
    buyButton.type = "button";
    buyButton.className = "shop-buy-btn";
    buyButton.textContent = cost === null ? "Maxed" : `Buy (${cost})`;
    buyButton.disabled = !canBuy;
    buyButton.addEventListener("click", () => onMetaShopBuy(definition.id));

    row.appendChild(text);
    row.appendChild(effect);
    row.appendChild(buyButton);
    shopList.appendChild(row);
  }

  shopOverlay.classList.remove("is-hidden");
}

export function hideMetaShop() {
  if (!shopOverlay) return;
  shopOverlay.classList.add("is-hidden");
}

export function mountHud({ onUseInventorySlot: onUseSlot, onToggleDebug } = {}) {
  if (hudRoot) return;
  if (typeof onUseSlot === "function") onUseInventorySlot = onUseSlot;
  if (typeof onToggleDebug === "function") onToggleDebugMenu = onToggleDebug;
  hudRoot = document.getElementById("hud");
  if (!hudRoot) return;

  const playerBlock = document.createElement("section");
  playerBlock.className = "hud-block";

  const playerTitle = document.createElement("h2");
  playerTitle.className = "hud-title";
  playerTitle.textContent = "Player";
  hudHpLine = document.createElement("div");
  hudHpLine.className = "hud-line";
  hudFloorLine = document.createElement("div");
  hudFloorLine.className = "hud-line";
  hudGoldLine = document.createElement("div");
  hudGoldLine.className = "hud-line";
  playerBlock.appendChild(playerTitle);
  playerBlock.appendChild(hudHpLine);
  playerBlock.appendChild(hudFloorLine);
  playerBlock.appendChild(hudGoldLine);

  const invBlock = document.createElement("section");
  invBlock.className = "hud-block";
  const invTitle = document.createElement("h2");
  invTitle.className = "hud-title";
  invTitle.textContent = "Inventory";
  const invGrid = document.createElement("div");
  invGrid.className = "hud-inventory";
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement("div");
    slot.className = "hud-slot";
    slot.dataset.slot = String(i);
    slot.addEventListener("click", () => onUseInventorySlot(i));
    hudInventorySlots.push(slot);
    invGrid.appendChild(slot);
  }
  invBlock.appendChild(invTitle);
  invBlock.appendChild(invGrid);

  const logBlock = document.createElement("section");
  logBlock.className = "hud-block";
  const logTitle = document.createElement("h2");
  logTitle.className = "hud-title";
  logTitle.textContent = "Combat Log";
  hudLogList = document.createElement("ul");
  hudLogList.className = "hud-log";
  logBlock.appendChild(logTitle);
  logBlock.appendChild(hudLogList);

  const minimapBtn = document.createElement("button");
  minimapBtn.type = "button";
  minimapBtn.className = "hud-minimap";
  minimapBtn.textContent = "Minimap (Soon)";
  minimapBtn.addEventListener("click", () => {});

  const debugBtn = document.createElement("button");
  debugBtn.type = "button";
  debugBtn.className = "hud-debug";
  debugBtn.textContent = "Debug";
  debugBtn.addEventListener("click", () => onToggleDebugMenu());

  hudRoot.appendChild(playerBlock);
  hudRoot.appendChild(invBlock);
  hudRoot.appendChild(logBlock);
  hudRoot.appendChild(minimapBtn);
  hudRoot.appendChild(debugBtn);

  renderHud(null);
}

export function renderHud(snapshot) {
  if (!hudRoot) return;

  if (!snapshot) {
    if (hudHpLine) hudHpLine.textContent = "HP: —/—";
    if (hudFloorLine) hudFloorLine.textContent = "Floor: —/—";
    if (hudGoldLine) hudGoldLine.textContent = "Gold: —";
    for (let i = 0; i < hudInventorySlots.length; i++) {
      hudInventorySlots[i].textContent = `${i + 1}: —`;
    }
    if (hudLogList) {
      hudLogList.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = "No events yet.";
      hudLogList.appendChild(li);
    }
    return;
  }

  if (hudHpLine) hudHpLine.textContent = `HP: ${snapshot.player.hp}/${snapshot.player.maxHp}`;
  if (hudFloorLine) {
    const base = `Floor: ${snapshot.run.currentFloor}/${snapshot.run.totalFloors}`;
    hudFloorLine.textContent = snapshot.run.stairsLocked ? `${base} (Stairs Locked - Boss Alive)` : base;
  }
  if (hudGoldLine) hudGoldLine.textContent = `Gold: ${snapshot.player.currency}`;

  for (let i = 0; i < hudInventorySlots.length; i++) {
    const value = snapshot.inventory[i];
    const label = value && value.type === "potion" ? value.label : "—";
    hudInventorySlots[i].textContent = `${i + 1}: ${label}`;
  }

  if (hudLogList) {
    hudLogList.innerHTML = "";
    const lines = snapshot.log.length > 0 ? snapshot.log : ["No events yet."];
    for (const line of lines) {
      const li = document.createElement("li");
      li.textContent = line;
      hudLogList.appendChild(li);
    }
  }
}

function makeDebugRow(labelText, name) {
  const row = document.createElement("label");
  row.className = "debug-row";
  row.textContent = labelText;

  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.className = "debug-input";
  row.appendChild(input);
  return { row, input };
}

export function mountDebugMenu({ onUpdateSetting, onSpawnEnemy: onSpawn, onStairFinder: onFindStairs } = {}) {
  if (typeof onUpdateSetting === "function") onUpdateDebugSettings = onUpdateSetting;
  if (typeof onSpawn === "function") onSpawnEnemy = onSpawn;
  if (typeof onFindStairs === "function") onStairFinder = onFindStairs;
  if (debugMenuRoot) return;

  const app = document.getElementById("app");
  if (!app) return;

  debugMenuRoot = document.createElement("section");
  debugMenuRoot.className = "debug-menu is-hidden";
  debugMenuRoot.setAttribute("aria-label", "Developer Menu");

  const title = document.createElement("h2");
  title.className = "debug-title";
  title.textContent = "Developer Menu";

  debugForm = document.createElement("form");
  debugForm.className = "debug-form";

  const rows = [
    makeDebugRow("Player HP", "php"),
    makeDebugRow("Player Max HP", "pMax"),
    makeDebugRow("Enemy HP", "ehp"),
    makeDebugRow("Gold", "currency"),
    makeDebugRow("FOV Radius", "fovRadius"),
  ];
  for (const { row } of rows) debugForm.appendChild(row);

  const actions = document.createElement("div");
  actions.className = "debug-actions";
  const applyBtn = document.createElement("button");
  applyBtn.type = "submit";
  applyBtn.className = "debug-btn";
  applyBtn.textContent = "Apply";
  const spawnBtn = document.createElement("button");
  spawnBtn.type = "button";
  spawnBtn.className = "debug-btn";
  spawnBtn.textContent = "Spawn Enemy";
  spawnBtn.addEventListener("click", () => onSpawnEnemy());
  const stairFinderBtn = document.createElement("button");
  stairFinderBtn.type = "button";
  stairFinderBtn.className = "debug-btn";
  stairFinderBtn.textContent = "Stair Finder";
  stairFinderBtn.addEventListener("click", () => onStairFinder());
  actions.appendChild(applyBtn);
  actions.appendChild(spawnBtn);
  actions.appendChild(stairFinderBtn);

  debugForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(debugForm);
    const patch = {};
    for (const [key, raw] of data.entries()) {
      if (raw === "") continue;
      const v = Number(raw);
      if (Number.isFinite(v)) patch[key] = v;
    }
    onUpdateDebugSettings(patch);
  });

  debugForm.appendChild(actions);

  debugMenuRoot.appendChild(title);
  debugMenuRoot.appendChild(debugForm);
  app.appendChild(debugMenuRoot);
}

export function renderDebugState(debugState) {
  if (!debugForm || !debugState) return;
  for (const [k, v] of Object.entries(debugState)) {
    const input = debugForm.elements.namedItem(k);
    if (!input || input.tagName !== "INPUT") continue;
    input.value = String(v);
  }
}

export function showDebugMenu() {
  if (!debugMenuRoot) return;
  debugMenuRoot.classList.remove("is-hidden");
}

export function hideDebugMenu() {
  if (!debugMenuRoot) return;
  debugMenuRoot.classList.add("is-hidden");
}

export function toggleDebugMenu() {
  if (!debugMenuRoot) return;
  debugMenuRoot.classList.toggle("is-hidden");
}

export function isDebugMenuVisible() {
  if (!debugMenuRoot) return false;
  return !debugMenuRoot.classList.contains("is-hidden");
}
