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
  upgrades: normalizeUpgradeRanks(loadedMetaState.upgrades)
}

if (JSON.stringify(metaState.upgrades) !== JSON.stringify(loadedMetaState.upgrades || {})) {
  persistSaveState(metaState)
}

function renderMenuMetaCurrency() {
  setMenuMetaCurrency(metaState.metaCurrency)
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
  const entry = toRunHistoryEntry(summary, reward, new Date().toISOString())
  metaState.runHistory = appendRunHistory(metaState, entry)
  if (!persistSaveState(metaState)) {
    console.warn('[Save] Failed to persist meta progress.')
  }

  runActive = false
  setInRunUIVisible(false)
  hideDebugMenu()
  showRunEnd(summary)
}

function startRun(runConfig) {
  const metaEffects = getUpgradeEffects(metaState.upgrades)
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
setInRunUIVisible(false)
hideDebugMenu()
hideRunEnd()
hideMetaShop()
renderHud(null)
renderMenuMetaCurrency()
showMenu()
