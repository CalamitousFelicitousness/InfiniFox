import { ProgressIndicator } from './components/common/ProgressIndicator'
import { ControlPanel } from './components/layout/ControlPanel'
import { Canvas } from './features/canvas/Canvas'
import './styles/main.css'

export function App() {
  return (
    <div class="app-layout">
      <ProgressIndicator />
      <ControlPanel />
      <Canvas />
    </div>
  )
}
