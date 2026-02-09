export const RUN_PRESETS = {
  short: { floors: 2, bosses: 1, hasFinal: true },
  medium: { floors: 4, bosses: 1, hasFinal: true },
  long: { floors: 8, bosses: 1, hasFinal: true }
};

let menuOverlay = null;
let selectedRunLength = "medium";
let seedInput = null;
let onStart = () => {};
let onQuit = () => {};
let quitButton = null;

function normalizeSeed(value) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function buildRunConfig(runLength, seedValue) {
  return {
    runLength,
    floorPlan: { ...RUN_PRESETS[runLength] },
    seed: normalizeSeed(seedValue)
  };
}

function updateRunButtonState() {
  if (!menuOverlay) return;
  const buttons = menuOverlay.querySelectorAll("button[data-run-length]");
  for (const button of buttons) {
    const isSelected = button.dataset.runLength === selectedRunLength;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  }
}

function startWithLength(runLength) {
  selectedRunLength = runLength;
  updateRunButtonState();
  const runConfig = buildRunConfig(runLength, seedInput ? seedInput.value : "");
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
      button.textContent = runLength[0].toUpperCase() + runLength.slice(1);
      button.addEventListener("click", () => startWithLength(runLength));
      runButtons.appendChild(button);
    }

    const seedWrap = document.createElement("label");
    seedWrap.className = "menu-seed-wrap";
    seedWrap.textContent = "Seed (optional)";

    seedInput = document.createElement("input");
    seedInput.type = "text";
    seedInput.className = "menu-seed";
    seedInput.placeholder = "Random";
    seedInput.autocomplete = "off";
    seedWrap.appendChild(seedInput);

    const startButton = document.createElement("button");
    startButton.type = "button";
    startButton.className = "menu-btn menu-btn-start";
    startButton.textContent = "Start Run";
    startButton.addEventListener("click", () => startWithLength(selectedRunLength));

    card.appendChild(title);
    card.appendChild(runButtons);
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

    updateRunButtonState();
  }
}

export function setQuitHandler(handler) {
  onQuit = typeof handler === "function" ? handler : () => {};
}

export function showMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.remove("is-hidden");
}

export function hideMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.add("is-hidden");
}

export function setInRunUIVisible(isVisible) {
  if (!quitButton) return;
  quitButton.classList.toggle("is-visible", Boolean(isVisible));
}
