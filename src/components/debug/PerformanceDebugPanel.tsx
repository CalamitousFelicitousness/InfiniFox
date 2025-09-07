import { CheckCircle, Check, AlertTriangle, XCircle, Activity } from 'lucide-preact'
import { useEffect, useState, useRef } from 'preact/hooks'

import { PerformanceMonitor } from '../../utils/performanceUtils'
import { Icon } from '../common/Icon'
import './PerformanceDebugPanel.css'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  nodeCount: number
  layerCount: number
  cachedNodes: number
  memoryUsed?: number
  drawCalls: number
}

interface PerformanceDebugPanelProps {
  getCanvasMetrics?: () => { nodeCount: number; layerCount: number; cachedNodes: number }
  visible?: boolean
}

export function PerformanceDebugPanel({
  getCanvasMetrics,
  visible = true,
}: PerformanceDebugPanelProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    nodeCount: 0,
    layerCount: 0,
    cachedNodes: 0,
    memoryUsed: 0,
    drawCalls: 0,
  })

  const [isMinimized, setIsMinimized] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const monitorRef = useRef<PerformanceMonitor | null>(null)
  const drawCallsRef = useRef(0)
  const lastDrawCallResetRef = useRef(performance.now())

  useEffect(() => {
    if (!visible) return

    // Initialize performance monitor
    monitorRef.current = new PerformanceMonitor()
    monitorRef.current.start()

    // Track draw calls by monitoring Canvas 2D context calls
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage
    const originalFillRect = CanvasRenderingContext2D.prototype.fillRect
    const originalStroke = CanvasRenderingContext2D.prototype.stroke

    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      drawCallsRef.current++
      return originalDrawImage.apply(this, args as any)
    }

    CanvasRenderingContext2D.prototype.fillRect = function (...args: any[]) {
      drawCallsRef.current++
      return originalFillRect.apply(this, args as any)
    }

    CanvasRenderingContext2D.prototype.stroke = function (...args: any[]) {
      drawCallsRef.current++
      return originalStroke.apply(this, args as any)
    }

    // Update metrics every second
    const interval = setInterval(() => {
      const currentTime = performance.now()
      const timeSinceReset = currentTime - lastDrawCallResetRef.current

      // Calculate draw calls per second
      const drawCallsPerSecond = Math.round((drawCallsRef.current * 1000) / timeSinceReset)

      // Reset draw call counter
      if (timeSinceReset >= 1000) {
        drawCallsRef.current = 0
        lastDrawCallResetRef.current = currentTime
      }

      // Get memory usage if available
      let memoryUsed = 0
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory
        memoryUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024) // Convert to MB
      }

      // Get canvas metrics if provided
      const canvasMetrics = getCanvasMetrics
        ? getCanvasMetrics()
        : {
            nodeCount: 0,
            layerCount: 0,
            cachedNodes: 0,
          }

      setMetrics({
        fps: monitorRef.current?.getFPS() || 0,
        frameTime: monitorRef.current?.getFrameTime() || 0,
        nodeCount: canvasMetrics.nodeCount,
        layerCount: canvasMetrics.layerCount,
        cachedNodes: canvasMetrics.cachedNodes,
        memoryUsed,
        drawCalls: drawCallsPerSecond,
      })
    }, 250) // Update 4 times per second for more responsive display

    return () => {
      clearInterval(interval)
      monitorRef.current?.stop()

      // Restore original functions
      CanvasRenderingContext2D.prototype.drawImage = originalDrawImage
      CanvasRenderingContext2D.prototype.fillRect = originalFillRect
      CanvasRenderingContext2D.prototype.stroke = originalStroke
    }
  }, [visible, getCanvasMetrics])

  if (!visible) return null

  const getPerformanceStatus = (fps: number) => {
    if (fps >= 55)
      return {
        text: (
          <>
            <Icon icon={CheckCircle} size="sm" /> Smooth
          </>
        ),
        color: '#00ff00',
      }
    if (fps >= 45)
      return {
        text: (
          <>
            <Icon icon={Check} size="sm" /> Good
          </>
        ),
        color: '#90EE90',
      }
    if (fps >= 30)
      return {
        text: (
          <>
            <Icon icon={AlertTriangle} size="sm" /> OK
          </>
        ),
        color: '#ffff00',
      }
    return {
      text: (
        <>
          <Icon icon={XCircle} size="sm" /> Lag
        </>
      ),
      color: '#ff0000',
    }
  }

  const getFrameTimeStatus = (frameTime: number) => {
    if (frameTime <= 16.67) return { text: 'Excellent', color: '#00ff00' }
    if (frameTime <= 22) return { text: 'Good', color: '#90EE90' }
    if (frameTime <= 33) return { text: 'Fair', color: '#ffff00' }
    return { text: 'Poor', color: '#ff0000' }
  }

  const status = getPerformanceStatus(metrics.fps)
  const frameStatus = getFrameTimeStatus(metrics.frameTime)

  return (
    <div className={`performance-debug-panel ${isMinimized ? 'minimized' : ''}`}>
      <div className="performance-header" onClick={() => setIsMinimized(!isMinimized)}>
        <span className="performance-title">
          {isMinimized ? (
            `FPS: ${metrics.fps}`
          ) : (
            <>
              <Icon icon={Activity} size="base" /> Performance
            </>
          )}
        </span>
        <span className="performance-toggle">{isMinimized ? '▼' : '▲'}</span>
      </div>

      {!isMinimized && (
        <div className="performance-content">
          <div className="performance-main">
            <div className="performance-metric">
              <span className="metric-label">FPS:</span>
              <span className="metric-value" style={{ color: status.color }}>
                {metrics.fps}
              </span>
            </div>

            <div className="performance-metric">
              <span className="metric-label">Frame:</span>
              <span className="metric-value" style={{ color: frameStatus.color }}>
                {metrics.frameTime.toFixed(2)}ms
              </span>
            </div>

            <div className="performance-metric">
              <span className="metric-label">Status:</span>
              <span className="metric-value" style={{ color: status.color }}>
                {status.text}
              </span>
            </div>
          </div>

          <button
            className="performance-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>

          {showDetails && (
            <div className="performance-details">
              <div className="performance-metric">
                <span className="metric-label">Draw Calls/s:</span>
                <span className="metric-value">{metrics.drawCalls}</span>
              </div>

              <div className="performance-metric">
                <span className="metric-label">Nodes:</span>
                <span className="metric-value">{metrics.nodeCount}</span>
              </div>

              <div className="performance-metric">
                <span className="metric-label">Layers:</span>
                <span className="metric-value">{metrics.layerCount}</span>
              </div>

              <div className="performance-metric">
                <span className="metric-label">Cached:</span>
                <span className="metric-value">{metrics.cachedNodes}</span>
              </div>

              {metrics.memoryUsed > 0 && (
                <div className="performance-metric">
                  <span className="metric-label">Memory:</span>
                  <span className="metric-value">{metrics.memoryUsed}MB</span>
                </div>
              )}

              <div className="performance-target">
                <div className="target-label">Target: 60 FPS (16.67ms)</div>
              </div>

              <div className="performance-bar">
                <div
                  className="performance-bar-fill"
                  style={{
                    width: `${Math.min(100, (metrics.fps / 60) * 100)}%`,
                    backgroundColor: status.color,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
