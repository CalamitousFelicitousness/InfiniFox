import { NotebookPen } from 'lucide-react'

import { Icon } from '../../components/common/Icon'
import { useStore } from '../../store/store'
import './DrawingTab.css'

/**
 * DrawingTab - Placeholder for the drawing tab
 * All drawing controls have been moved to the floating panel on the canvas
 */
export function DrawingTab() {
  const { drawingStrokes } = useStore()

  return (
    <div className="drawing-tab">
      <div className="drawing-info">
        <h3>
          <Icon icon={NotebookPen} size="lg" /> Drawing Tools
        </h3>
        <p className="info-text">
          Drawing tools are now integrated directly into the canvas. Select the Brush or Eraser tool
          from the canvas toolbar to start drawing.
        </p>

        <div className="drawing-tips">
          <h4>Quick Tips:</h4>
          <ul>
            <li>
              <strong>B</strong> - Select Brush tool
            </li>
            <li>
              <strong>E</strong> - Select Eraser tool
            </li>
            <li>
              <strong>V</strong> - Select tool
            </li>
            <li>
              <strong>H</strong> - Pan tool
            </li>
          </ul>
        </div>

        <div className="drawing-stats-summary">
          <p>Total strokes: {drawingStrokes.length}</p>
        </div>
      </div>
    </div>
  )
}
