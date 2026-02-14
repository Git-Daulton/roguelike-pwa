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
  hideDebugMenu,
  hideMenu,
  mountDebugMenu,
  mountHud,
  mountMenu,
  mountRunEnd,
  renderDebugState,
  renderHud,
  setMenuMetaCurrency,
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
const metaState = loadSaveState()

function renderMenuMetaCurrency() {
  setMenuMetaCurrency(metaState.metaCurrency)
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
  runActive = true
  hideMenu()
  hideRunEnd()
  setInRunUIVisible(true)
  hideDebugMenu()
  unsubscribeSnapshot()
  unsubscribeDebug()
  unsubscribeSnapshot = subscribeGameSnapshot(renderHud)
  unsubscribeDebug = subscribeDebugState(renderDebugState)
  startGame(runConfig, { onQuit: quitToMenu, onRunEnd: handleRunEnd })
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

mountMenu({ onStart: startRun })
mountHud({ onUseInventorySlot: useInventorySlot, onToggleDebug: toggleDebugMenu })
mountRunEnd({ onContinue: continueFromRunEnd })
mountDebugMenu({
  onUpdateSetting: updateDebugSettings,
  onSpawnEnemy: spawnEnemyNearPlayer,
  onStairFinder: teleportPlayerNearStairs
})
setQuitHandler(quitToMenu)
setRunEndContinueHandler(continueFromRunEnd)
setInRunUIVisible(false)
hideDebugMenu()
hideRunEnd()
renderHud(null)
renderMenuMetaCurrency()
showMenu()
