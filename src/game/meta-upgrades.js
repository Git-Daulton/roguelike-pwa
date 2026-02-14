export const META_UPGRADES = [
  {
    id: "max_hp_boost",
    label: "Iron Vitality",
    description: "+1 Max HP per rank at run start",
    maxRank: 3,
    costs: [20, 40, 70],
  },
  {
    id: "starting_gold_boost",
    label: "Scavenger Purse",
    description: "+2 starting gold per rank",
    maxRank: 3,
    costs: [15, 30, 55],
  },
  {
    id: "potion_drop_boost",
    label: "Alchemist's Luck",
    description: "+10% potion drop chance per rank",
    maxRank: 3,
    costs: [25, 45, 75],
  },
];

const upgradesById = new Map(META_UPGRADES.map((u) => [u.id, u]));

function toNonNegativeInt(value) {
  const n = Number.isFinite(value) ? Math.floor(value) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function getUpgradeById(id) {
  return upgradesById.get(id) ?? null;
}

export function normalizeUpgradeRanks(rawUpgrades) {
  const source = rawUpgrades && typeof rawUpgrades === "object" ? rawUpgrades : {};
  const normalized = {};
  for (const definition of META_UPGRADES) {
    const rank = toNonNegativeInt(source[definition.id]);
    normalized[definition.id] = Math.min(definition.maxRank, rank);
  }
  return normalized;
}

export function getUpgradeRank(upgrades, id) {
  const definition = getUpgradeById(id);
  if (!definition) return 0;
  const normalized = normalizeUpgradeRanks(upgrades);
  return normalized[id] ?? 0;
}

export function getUpgradeCost(upgradeId, nextRank) {
  const definition = getUpgradeById(upgradeId);
  if (!definition) return null;
  const idx = toNonNegativeInt(nextRank) - 1;
  if (idx < 0 || idx >= definition.maxRank) return null;
  return definition.costs[idx] ?? null;
}

export function getUpgradeEffects(upgrades) {
  const normalized = normalizeUpgradeRanks(upgrades);
  return {
    bonusMaxHp: (normalized.max_hp_boost ?? 0) * 1,
    bonusStartingGold: (normalized.starting_gold_boost ?? 0) * 2,
    potionDropChanceBonus: (normalized.potion_drop_boost ?? 0) * 0.1,
  };
}

export function canPurchaseUpgrade({ metaCurrency, upgrades, upgradeId }) {
  const definition = getUpgradeById(upgradeId);
  if (!definition) return { ok: false, reason: "unknown_upgrade" };

  const normalized = normalizeUpgradeRanks(upgrades);
  const currentRank = normalized[upgradeId] ?? 0;
  if (currentRank >= definition.maxRank) return { ok: false, reason: "max_rank" };

  const cost = getUpgradeCost(upgradeId, currentRank + 1);
  if (cost === null) return { ok: false, reason: "max_rank" };

  const funds = toNonNegativeInt(metaCurrency);
  if (funds < cost) return { ok: false, reason: "insufficient_funds" };

  return { ok: true, cost };
}

export function purchaseUpgrade({ metaCurrency, upgrades, upgradeId }) {
  const check = canPurchaseUpgrade({ metaCurrency, upgrades, upgradeId });
  const normalized = normalizeUpgradeRanks(upgrades);
  const funds = toNonNegativeInt(metaCurrency);

  if (!check.ok) {
    return {
      ok: false,
      reason: check.reason,
      metaCurrency: funds,
      upgrades: normalized,
      costPaid: 0,
    };
  }

  const nextUpgrades = { ...normalized };
  nextUpgrades[upgradeId] = (nextUpgrades[upgradeId] ?? 0) + 1;

  return {
    ok: true,
    metaCurrency: funds - check.cost,
    upgrades: nextUpgrades,
    costPaid: check.cost,
  };
}
