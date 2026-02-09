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
let onStart = () => {};
let onQuit = () => {};
let quitButton = null;
let hudRoot = null;
let hudHpLine = null;
let hudFloorLine = null;
let hudGoldLine = null;
let hudInventorySlots = [];
let hudLogList = null;
let onUseInventorySlot = () => {};

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

export function mountMenu({ onStart: onStartCb } = {}) {
  if (typeof onStartCb === "function") onStart = onStartCb;

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

    card.appendChild(title);
    card.appendChild(runButtons);
    card.appendChild(summaryLine);
    card.appendChild(seedWrap);
    card.appendChild(startButton);
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

export function mountHud({ onUseInventorySlot: onUseSlot } = {}) {
  if (hudRoot) return;
  if (typeof onUseSlot === "function") onUseInventorySlot = onUseSlot;
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

  hudRoot.appendChild(playerBlock);
  hudRoot.appendChild(invBlock);
  hudRoot.appendChild(logBlock);
  hudRoot.appendChild(minimapBtn);

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
  if (hudFloorLine) hudFloorLine.textContent = `Floor: ${snapshot.run.currentFloor}/${snapshot.run.totalFloors}`;
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
