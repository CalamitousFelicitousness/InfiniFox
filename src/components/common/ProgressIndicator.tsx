import { useEffect, useState } from 'preact/hooks'

import { progressService } from '../../services/progress/ProgressService'
import './ProgressIndicator.css'

export function ProgressIndicator() {
  const [progress, setProgress] = useState<{
    current: number
    total: number
    status: string
    phase: string
    preview?: string
  } | null>(null)
  const [hideTimeout, setHideTimeout] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = progressService.onProgress((message) => {
      // Clear any pending hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        setHideTimeout(null)
      }

      setProgress(message)

      // Clear progress after generation completes (based on phase, not steps)
      if (message.phase === 'completed') {
        const timeout = window.setTimeout(() => setProgress(null), 2000)
        setHideTimeout(timeout)
      }
    })

    return () => {
      unsubscribe()
      if (hideTimeout) {
        clearTimeout(hideTimeout)
      }
    }
  }, [hideTimeout])

  if (!progress) return null

  // Calculate percentage based on phase
  let percentage = 0
  let displayText = ''
  
  if (progress.phase === 'sampling' && progress.total > 0) {
    percentage = (progress.current / progress.total) * 100
    displayText = `Sampling ${progress.current}/${progress.total}`
  } else if (progress.phase === 'vae') {
    percentage = 100 // VAE phase shows full bar
    displayText = 'VAE Decoding...'
  } else if (progress.phase === 'postprocessing') {
    percentage = 100
    displayText = 'Post-processing...'
  } else if (progress.phase === 'completed') {
    percentage = 100
    displayText = 'Completed!'
  } else {
    percentage = 0
    displayText = 'Preparing...'
  }

  return (
    <div className="progress-indicator">
      <div className="progress-content">
        <div className="progress-header">
          <span className="progress-status">{displayText}</span>
          <span className="progress-percentage">{Math.round(percentage)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${percentage}%` }} />
        </div>
        {progress.preview && (
          <img
            src={`data:image/png;base64,${progress.preview}`}
            alt="Preview"
            className="progress-preview"
          />
        )}
      </div>
    </div>
  )
}
