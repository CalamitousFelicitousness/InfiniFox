import { ControlPanel } from './components/layout/ControlPanel'
import { Canvas } from './features/canvas/Canvas'
import { useStore } from './store/store'
import './styles/main.css'

export function App() {
  const { isLoading } = useStore()

  return (
    <div class="app-layout">
      {isLoading && <div class="loader">Generating...</div>}
      <ControlPanel />
      <Canvas />
    </div>
  )
}
