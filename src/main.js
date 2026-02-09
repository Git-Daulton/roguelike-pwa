import './style.css'
import {
  spawnEnemyNearPlayer,
  startGame,
  stopGame,
  subscribeDebugState,
  subscribeGameSnapshot,
  updateDebugSettings,
  useInventorySlot
} from './game'
import {
  hideDebugMenu,
  hideMenu,
  mountDebugMenu,
  mountHud,
  mountMenu,
  renderDebugState,
  renderHud,
  setInRunUIVisible,
  setQuitHandler,
  showMenu,
  toggleDebugMenu
} from './ui'

let runActive = false
let unsubscribeSnapshot = () => {}
let unsubscribeDebug = () => {}

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
  renderHud(null)
  showMenu()
}

function startRun(runConfig) {
  runActive = true
  hideMenu()
  setInRunUIVisible(true)
  hideDebugMenu()
  unsubscribeSnapshot()
  unsubscribeDebug()
  unsubscribeSnapshot = subscribeGameSnapshot(renderHud)
  unsubscribeDebug = subscribeDebugState(renderDebugState)
  startGame(runConfig, { onQuit: quitToMenu, onRunComplete: quitToMenu })
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
mountDebugMenu({ onUpdateSetting: updateDebugSettings, onSpawnEnemy: spawnEnemyNearPlayer })
setQuitHandler(quitToMenu)
setInRunUIVisible(false)
hideDebugMenu()
renderHud(null)
showMenu()
