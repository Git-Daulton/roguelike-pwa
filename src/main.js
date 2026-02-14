import './style.css'
import {
  teleportPlayerNearStairs,
  spawnEnemyNearPlayer,
  startGame,
  stopGame,
  subscribeDebugState,
  subscribeGameSnapshot,
  updateDebugSettings,
  useInventorySlot
} from './game'
import {
  appendRunHistory,
  loadSaveState,
  persistSaveState,
  toRunHistoryEntry
} from './game/save'
import {
  META_UPGRADES,
  getUpgradeEffects,
  normalizeUpgradeRanks,
  purchaseUpgrade
} from './game/meta-upgrades'
import {
  ACHIEVEMENTS,
  evaluateNewUnlocks,
  getAchievementEffects,
  normalizeAchievements,
  normalizeLifetimeStats
} from './game/achievements'
import {
  setAchievementDefinitions,
  hideDebugMenu,
  hideMenu,
  mountDebugMenu,
  mountHud,
  mountMetaShop,
  mountMenu,
  mountRunEnd,
  renderDebugState,
  renderHud,
  hideMetaShop,
  showMetaShop,
  setMenuAchievements,
  setMenuMetaCurrency,
  setMetaShopHandlers,
  setInRunUIVisible,
  setQuitHandler,
  setRunEndContinueHandler,
  hideRunEnd,
  showRunEnd,
  showMenu,
  toggleDebugMenu
} from './ui'

let runActive = false
let unsubscribeSnapshot = () => {}
let unsubscribeDebug = () => {}
const loadedMetaState = loadSaveState()
const metaState = {
  ...loadedMetaState,
  upgrades: normalizeUpgradeRanks(loadedMetaState.upgrades),
  achievements: normalizeAchievements(loadedMetaState.achievements),
  lifetimeStats: normalizeLifetimeStats(loadedMetaState.lifetimeStats)
}

if (
  JSON.stringify(metaState.upgrades) !== JSON.stringify(loadedMetaState.upgrades || {}) ||
  JSON.stringify(metaState.achievements) !== JSON.stringify(loadedMetaState.achievements || {}) ||
  JSON.stringify(metaState.lifetimeStats) !== JSON.stringify(loadedMetaState.lifetimeStats || {})
) {
  persistSaveState(metaState)
}

function renderMenuMetaCurrency() {
  setMenuMetaCurrency(metaState.metaCurrency)
}

function renderMenuAchievements() {
  setMenuAchievements({
    totalKills: metaState.lifetimeStats.totalKills,
    unlockedIds: metaState.achievements.unlocked
  })
}

function openMetaShop() {
  showMetaShop({
    metaCurrency: metaState.metaCurrency,
    upgrades: metaState.upgrades,
    definitions: META_UPGRADES
  })
}

function closeMetaShop() {
  hideMetaShop()
}

function buyUpgrade(upgradeId) {
  const result = purchaseUpgrade({
    metaCurrency: metaState.metaCurrency,
    upgrades: metaState.upgrades,
    upgradeId
  })
  if (!result.ok) return

  metaState.metaCurrency = result.metaCurrency
  metaState.upgrades = result.upgrades
  if (!persistSaveState(metaState)) {
    console.warn('[Save] Failed to persist upgrade purchase.')
  }
  renderMenuMetaCurrency()
  openMetaShop()
}

function quitToMenu() {
  if (!runActive) return
  runActive = false
  stopGame()
  unsubscribeSnapshot()
  unsubscribeDebug()
  unsubscribeSnapshot = () => {}
  unsubscribeDebug = () => {}
  setInRunUIVisible(false)
  hideDebugMenu()
  hideRunEnd()
  hideMetaShop()
  renderHud(null)
  renderMenuMetaCurrency()
  showMenu()
}

function continueFromRunEnd() {
  hideRunEnd()
  stopGame()
  unsubscribeSnapshot()
  unsubscribeDebug()
  unsubscribeSnapshot = () => {}
  unsubscribeDebug = () => {}
  setInRunUIVisible(false)
  hideDebugMenu()
  hideMetaShop()
  renderHud(null)
  renderMenuMetaCurrency()
  showMenu()
}

function handleRunEnd(summary) {
  const reward = summary?.status === 'won' ? (summary?.gold ?? 0) : 0
  metaState.metaCurrency += reward
  const runKills = Number.isFinite(summary?.kills) ? Math.max(0, Math.floor(summary.kills)) : 0
  metaState.lifetimeStats.totalKills += runKills
  const newAchievements = evaluateNewUnlocks({
    previousUnlocked: metaState.achievements.unlocked,
    totalKills: metaState.lifetimeStats.totalKills
  })
  if (newAchievements.length > 0) {
    metaState.achievements.unlocked = [...metaState.achievements.unlocked, ...newAchievements]
    metaState.achievements.lastUnlockedAt = new Date().toISOString()
  }
  const runSummary = {
    ...summary,
    newAchievements
  }
  const entry = toRunHistoryEntry(summary, reward, new Date().toISOString())
  metaState.runHistory = appendRunHistory(metaState, entry)
  if (!persistSaveState(metaState)) {
    console.warn('[Save] Failed to persist meta progress.')
  }

  runActive = false
  setInRunUIVisible(false)
  hideDebugMenu()
  renderMenuMetaCurrency()
  renderMenuAchievements()
  showRunEnd(runSummary)
}

function startRun(runConfig) {
  const upgradeEffects = getUpgradeEffects(metaState.upgrades)
  const achievementEffects = getAchievementEffects(metaState.achievements.unlocked)
  const metaEffects = {
    bonusMaxHp: (upgradeEffects.bonusMaxHp ?? 0) + (achievementEffects.bonusMaxHp ?? 0),
    bonusStartingGold: (upgradeEffects.bonusStartingGold ?? 0) + (achievementEffects.bonusStartingGold ?? 0),
    potionDropChanceBonus: (upgradeEffects.potionDropChanceBonus ?? 0) + (achievementEffects.potionDropChanceBonus ?? 0)
  }
  runActive = true
  hideMenu()
  hideRunEnd()
  hideMetaShop()
  setInRunUIVisible(true)
  hideDebugMenu()
  unsubscribeSnapshot()
  unsubscribeDebug()
  unsubscribeSnapshot = subscribeGameSnapshot(renderHud)
  unsubscribeDebug = subscribeDebugState(renderDebugState)
  startGame(runConfig, { onQuit: quitToMenu, onRunEnd: handleRunEnd, metaEffects })
}

window.addEventListener('keydown', (e) => {
  if (!runActive || e.key !== 'Escape') return
  e.preventDefault()
  quitToMenu()
}, { passive: false })

window.addEventListener('keydown', (e) => {
  if (!runActive || e.key !== '`') return
  e.preventDefault()
  toggleDebugMenu()
}, { passive: false })

mountMenu({ onStart: startRun, onOpenShop: openMetaShop })
mountHud({ onUseInventorySlot: useInventorySlot, onToggleDebug: toggleDebugMenu })
mountRunEnd({ onContinue: continueFromRunEnd })
mountMetaShop({ onBuyUpgrade: buyUpgrade, onClose: closeMetaShop })
mountDebugMenu({
  onUpdateSetting: updateDebugSettings,
  onSpawnEnemy: spawnEnemyNearPlayer,
  onStairFinder: teleportPlayerNearStairs
})
setQuitHandler(quitToMenu)
setRunEndContinueHandler(continueFromRunEnd)
setMetaShopHandlers({ onBuyUpgrade: buyUpgrade, onClose: closeMetaShop })
setAchievementDefinitions(ACHIEVEMENTS)
setInRunUIVisible(false)
hideDebugMenu()
hideRunEnd()
hideMetaShop()
renderHud(null)
renderMenuMetaCurrency()
renderMenuAchievements()
showMenu()
