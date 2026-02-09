import './style.css'
import { startGame, stopGame } from './game'
import { hideMenu, mountMenu, setInRunUIVisible, setQuitHandler, showMenu } from './ui'

let runActive = false

function quitToMenu() {
  if (!runActive) return
  runActive = false
  stopGame()
  setInRunUIVisible(false)
  showMenu()
}

function startRun(runConfig) {
  runActive = true
  hideMenu()
  setInRunUIVisible(true)
  startGame(runConfig, { onQuit: quitToMenu })
}

window.addEventListener('keydown', (e) => {
  if (!runActive || e.key !== 'Escape') return
  e.preventDefault()
  quitToMenu()
}, { passive: false })

mountMenu({ onStart: startRun })
setQuitHandler(quitToMenu)
setInRunUIVisible(false)
showMenu()
