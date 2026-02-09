import './style.css'
import { startGame, stopGame, subscribeGameSnapshot, useInventorySlot } from './game'
import { hideMenu, mountHud, mountMenu, renderHud, setInRunUIVisible, setQuitHandler, showMenu } from './ui'

let runActive = false
let unsubscribeSnapshot = () => {}

function quitToMenu() {
  if (!runActive) return
  runActive = false
  stopGame()
  unsubscribeSnapshot()
  unsubscribeSnapshot = () => {}
  setInRunUIVisible(false)
  renderHud(null)
  showMenu()
}

function startRun(runConfig) {
  runActive = true
  hideMenu()
  setInRunUIVisible(true)
  unsubscribeSnapshot()
  unsubscribeSnapshot = subscribeGameSnapshot(renderHud)
  startGame(runConfig, { onQuit: quitToMenu })
}

window.addEventListener('keydown', (e) => {
  if (!runActive || e.key !== 'Escape') return
  e.preventDefault()
  quitToMenu()
}, { passive: false })

mountMenu({ onStart: startRun })
mountHud({ onUseInventorySlot: useInventorySlot })
setQuitHandler(quitToMenu)
setInRunUIVisible(false)
renderHud(null)
showMenu()
