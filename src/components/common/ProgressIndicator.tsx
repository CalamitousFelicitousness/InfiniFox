import { useEffect, useState } from 'preact/hooks'

import { progressService } from '../../services/progress/ProgressService'
import './ProgressIndicator.css'

export function ProgressIndicator() {
  const [progress, setProgress] = useState<{
    current: number
    total: number
    status: string
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

      // Clear progress after generation completes
      if (
        message.current > 0 &&
        message.total > 0 &&
        message.current >= message.total &&
        message.status === 'completed'
      ) {
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

  const percentage = (progress.current / progress.total) * 100

  return (
    <div className="progress-indicator">
      <div className="progress-content">
        <div className="progress-text">
          {progress.status} {progress.current}/{progress.total}
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
