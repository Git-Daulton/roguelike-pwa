export const ACHIEVEMENTS = [
  {
    id: "kill_25",
    label: "First Bloodline",
    description: "Reach 25 lifetime kills.",
    effectText: "+1 Max HP",
    unlockAtKills: 25,
    effects: { bonusMaxHp: 1, bonusStartingGold: 0, potionDropChanceBonus: 0 },
  },
  {
    id: "kill_75",
    label: "Seasoned Hunter",
    description: "Reach 75 lifetime kills.",
    effectText: "+1 Starting Gold",
    unlockAtKills: 75,
    effects: { bonusMaxHp: 0, bonusStartingGold: 1, potionDropChanceBonus: 0 },
  },
  {
    id: "kill_150",
    label: "Relic Reaper",
    description: "Reach 150 lifetime kills.",
    effectText: "+5% Potion Drop Chance",
    unlockAtKills: 150,
    effects: { bonusMaxHp: 0, bonusStartingGold: 0, potionDropChanceBonus: 0.05 },
  },
];

const achievementIds = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
const achievementsById = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

function toFiniteNonNegativeInt(value) {
  const n = Number.isFinite(value) ? Math.floor(value) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function normalizeUnlockedIds(value) {
  if (!Array.isArray(value)) return [];
  const unlocked = [];
  const seen = new Set();
  for (const rawId of value) {
    if (typeof rawId !== "string") continue;
    if (!achievementIds.has(rawId)) continue;
    if (seen.has(rawId)) continue;
    seen.add(rawId);
    unlocked.push(rawId);
  }
  return unlocked;
}

export function normalizeAchievements(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const unlocked = normalizeUnlockedIds(src.unlocked);
  const lastUnlockedAt = typeof src.lastUnlockedAt === "string" && src.lastUnlockedAt.length > 0
    ? src.lastUnlockedAt
    : null;

  return { unlocked, lastUnlockedAt };
}

export function normalizeLifetimeStats(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return { totalKills: toFiniteNonNegativeInt(src.totalKills) };
}

export function evaluateNewUnlocks({ previousUnlocked, totalKills }) {
  const unlockedSet = new Set(normalizeUnlockedIds(previousUnlocked));
  const kills = toFiniteNonNegativeInt(totalKills);
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    if (kills < achievement.unlockAtKills) continue;
    if (unlockedSet.has(achievement.id)) continue;
    newlyUnlocked.push(achievement.id);
  }

  return newlyUnlocked;
}

export function getAchievementEffects(unlockedIds) {
  const unlockedSet = new Set(normalizeUnlockedIds(unlockedIds));
  const totals = { bonusMaxHp: 0, bonusStartingGold: 0, potionDropChanceBonus: 0 };

  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedSet.has(achievement.id)) continue;
    totals.bonusMaxHp += Number(achievement.effects.bonusMaxHp) || 0;
    totals.bonusStartingGold += Number(achievement.effects.bonusStartingGold) || 0;
    totals.potionDropChanceBonus += Number(achievement.effects.potionDropChanceBonus) || 0;
  }

  return totals;
}

export function getAchievementById(id) {
  return achievementsById.get(id) ?? null;
}
