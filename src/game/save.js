export const SAVE_KEY = "rlpwa.v1";
export const SAVE_VERSION = 1;
export const RUN_HISTORY_LIMIT = 20;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toFiniteNonNegativeInt(value) {
  const n = Number.isFinite(value) ? Math.floor(value) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function normalizeStatus(value) {
  if (value === "won" || value === "lost") return value;
  return "unknown";
}

function normalizeRunHistoryEntry(entry) {
  const src = isPlainObject(entry) ? entry : {};
  const endedAt = typeof src.endedAt === "string" && src.endedAt.length > 0
    ? src.endedAt
    : new Date().toISOString();

  return {
    endedAt,
    status: normalizeStatus(src.status),
    floorsCleared: toFiniteNonNegativeInt(src.floorsCleared),
    totalFloors: toFiniteNonNegativeInt(src.totalFloors),
    gold: toFiniteNonNegativeInt(src.gold),
    reward: toFiniteNonNegativeInt(src.reward),
    turns: toFiniteNonNegativeInt(src.turns),
    kills: toFiniteNonNegativeInt(src.kills),
    seed: typeof src.seed === "string" ? src.seed : null,
    runLength: typeof src.runLength === "string" ? src.runLength : null,
  };
}

function normalizeRunHistoryArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeRunHistoryEntry(entry))
    .slice(0, RUN_HISTORY_LIMIT);
}

function sanitizeSaveState(state) {
  const src = isPlainObject(state) ? state : {};
  return {
    version: SAVE_VERSION,
    metaCurrency: toFiniteNonNegativeInt(src.metaCurrency),
    upgrades: isPlainObject(src.upgrades) ? { ...src.upgrades } : {},
    runHistory: normalizeRunHistoryArray(src.runHistory),
  };
}

export function createDefaultSaveState() {
  return {
    version: SAVE_VERSION,
    metaCurrency: 0,
    upgrades: {},
    runHistory: [],
  };
}

function migrateSaveState(raw) {
  if (!isPlainObject(raw)) return createDefaultSaveState();
  switch (raw.version) {
    case SAVE_VERSION:
      return sanitizeSaveState(raw);
    default:
      return createDefaultSaveState();
  }
}

function getStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadSaveState() {
  const storage = getStorage();
  if (!storage) return createDefaultSaveState();

  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSaveState();
    const parsed = JSON.parse(raw);
    return migrateSaveState(parsed);
  } catch {
    return createDefaultSaveState();
  }
}

export function persistSaveState(state) {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const safe = sanitizeSaveState(state);
    storage.setItem(SAVE_KEY, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}

export function toRunHistoryEntry(summary, reward, nowIso) {
  return normalizeRunHistoryEntry({
    endedAt: typeof nowIso === "string" && nowIso.length > 0 ? nowIso : new Date().toISOString(),
    status: summary?.status,
    floorsCleared: summary?.floorsCleared,
    totalFloors: summary?.totalFloors,
    gold: summary?.gold,
    reward,
    turns: summary?.turns,
    kills: summary?.kills,
    seed: summary?.seed,
    runLength: summary?.runLength,
  });
}

export function appendRunHistory(state, entry) {
  const normalizedEntry = normalizeRunHistoryEntry(entry);
  const existing = normalizeRunHistoryArray(state?.runHistory);
  return [normalizedEntry, ...existing].slice(0, RUN_HISTORY_LIMIT);
}
