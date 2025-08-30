import { useEffect, useState } from 'preact/hooks'

import { webSocketService } from '../../services/websocket'
import './ProgressIndicator.css'

export function ProgressIndicator() {
  const [progress, setProgress] = useState<{
    current: number
    total: number
    status: string
    preview?: string
  } | null>(null)

  useEffect(() => {
    const unsubscribe = webSocketService.onMessage((message) => {
      setProgress(message)
      
      // Clear progress after generation completes
      if (message.current === message.total) {
        setTimeout(() => setProgress(null), 2000)
      }
    })

    return unsubscribe
  }, [])

  if (!progress) return null

  const percentage = (progress.current / progress.total) * 100

  return (
    <div class="progress-indicator">
      <div class="progress-content">
        <div class="progress-header">
          <span class="progress-status">{progress.status}</span>
          <span class="progress-percentage">{Math.round(percentage)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        <div class="progress-steps">
          Step {progress.current} of {progress.total}
        </div>
        {progress.preview && (
          <img src={`data:image/png;base64,${progress.preview}`} alt="Preview" class="progress-preview" />
        )}
      </div>
    </div>
  )
}
