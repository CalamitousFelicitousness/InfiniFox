import { useEffect } from 'preact/hooks'

import { ProgressIndicator } from './components/common/ProgressIndicator'
import { ControlPanel } from './components/layout/ControlPanel'
import { Canvas } from './features/canvas/Canvas'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useStore } from './store/store'
import './styles/main.css'

export function App() {
  const { generateTxt2Img } = useStore()

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: () => {
      // Trigger generation for the current active panel
      generateTxt2Img()
    },
  })

  return (
    <div class="app-layout">
      <ProgressIndicator />
      <ControlPanel />
      <Canvas />
    </div>
  )
}
