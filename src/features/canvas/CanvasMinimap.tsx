import type Konva from 'konva'
import { useEffect, useRef, useState, useCallback, useMemo } from 'preact/hooks'
import './CanvasMinimap.css'

interface MinimapProps {
  stageRef: React.MutableRefObject<Konva.Stage | null> | null
  scale: number
  position: { x: number; y: number }
  images: Array<{
    id: string
    x: number
    y: number
    src: string
    width?: number
    height?: number
    borderColor?: string // Color based on role/selection
  }>
  onViewportChange?: (x: number, y: number, scale: number) => void
}

export function CanvasMinimap({
  stageRef,
  scale,
  position,
  images,
  onViewportChange,
}: MinimapProps) {
  // State declarations
  const [isMinimized, setIsMinimized] = useState(false) // Default to open, not minimized
  const [minimapPos, setMinimapPos] = useState({
    x: window.innerWidth - 220,
    y: window.innerHeight - 170,
  })
  const [minimapSize, setMinimapSize] = useState({ width: 200, height: 150 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Memoize images to prevent unnecessary updates when minimized
  const memoizedImages = useMemo(() => {
    // Return empty array when minimized to prevent processing
    return isMinimized ? [] : images
  }, [images, isMinimized])

  const panelRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  // Constants for performance
  const MINIMAP_ZOOM = 0.3 // Zoom out factor (0.3 provides good balance)
  const UPDATE_THROTTLE = 32 // ms between updates (roughly 30fps)
  const lastUpdateTime = useRef(0)

  // Load saved position and size from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('minimapState')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        const maxX = window.innerWidth - parsed.width - 20
        const maxY = window.innerHeight - parsed.height - 20
        setMinimapPos({
          x: Math.min(Math.max(20, parsed.x), maxX),
          y: Math.min(Math.max(20, parsed.y), maxY),
        })
        setMinimapSize({
          width: Math.min(Math.max(150, parsed.width), 400),
          height: Math.min(Math.max(100, parsed.height), 300),
        })
        // Don't restore minimized state - always start open
        // if (parsed.minimized !== undefined) {
        //   setIsMinimized(parsed.minimized)
        // }
      } catch {
        // Invalid saved state, use defaults
      }
    } else {
      // Default to bottom-right corner
      setMinimapPos({
        x: window.innerWidth - 220,
        y: window.innerHeight - 170,
      })
    }
  }, [])

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(
      'minimapState',
      JSON.stringify({
        x: minimapPos.x,
        y: minimapPos.y,
        width: minimapSize.width,
        height: minimapSize.height,
        minimized: isMinimized,
      })
    )
  }, [minimapPos, minimapSize, isMinimized])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setMinimapPos((prev) => ({
        x: Math.min(prev.x, window.innerWidth - minimapSize.width - 20),
        y: Math.min(prev.y, window.innerHeight - minimapSize.height - 20),
      }))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [minimapSize])

  // Throttled render function
  const renderMinimap = useCallback(
    (forceUpdate = false) => {
      // Early exit if minimized - no processing at all
      if (isMinimized) return

      const now = Date.now()
      if (!forceUpdate && now - lastUpdateTime.current < UPDATE_THROTTLE) {
        return
      }
      lastUpdateTime.current = now

      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx || !stageRef?.current) return

      const stage = stageRef.current

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Set canvas background
      ctx.fillStyle = 'rgba(20, 20, 20, 0.8)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Calculate bounds of all content
      let minX = Infinity,
        minY = Infinity
      let maxX = -Infinity,
        maxY = -Infinity

      // Include images in bounds calculation - use actual dimensions from Konva
      memoizedImages.forEach((img) => {
        // Get actual dimensions from the Konva stage if available
        let imgWidth = img.width || 512 // Default fallback
        let imgHeight = img.height || 512 // Default fallback

        // Try to get actual dimensions from Konva node
        if (stageRef.current) {
          const node = stage.findOne(`#${img.id}`)
          if (node && node.width && node.height) {
            imgWidth = node.width() * (node.scaleX ? node.scaleX() : 1)
            imgHeight = node.height() * (node.scaleY ? node.scaleY() : 1)
          }
        }

        minX = Math.min(minX, img.x)
        minY = Math.min(minY, img.y)
        maxX = Math.max(maxX, img.x + imgWidth)
        maxY = Math.max(maxY, img.y + imgHeight)
      })

      // Default bounds if no content
      if (memoizedImages.length === 0) {
        minX = -1000
        minY = -1000
        maxX = 1000
        maxY = 1000
      }

      // Add padding for context around content
      const padding = 500 // Moderate padding for good overview
      minX -= padding
      minY -= padding
      maxX += padding
      maxY += padding

      // Calculate scale to fit content in minimap with more zoom out
      const contentWidth = maxX - minX
      const contentHeight = maxY - minY
      const scaleX = canvas.width / contentWidth
      const scaleY = canvas.height / contentHeight
      const minimapScale = Math.min(scaleX, scaleY) * MINIMAP_ZOOM // Use zoom factor for more overview

      // Center content in minimap
      const offsetX = (canvas.width - contentWidth * minimapScale) / 2
      const offsetY = (canvas.height - contentHeight * minimapScale) / 2

      // Transform function for minimap coordinates
      const toMinimapCoords = (x: number, y: number) => ({
        x: (x - minX) * minimapScale + offsetX,
        y: (y - minY) * minimapScale + offsetY,
      })

      // Draw images as rectangles with role-based colors
      memoizedImages.forEach((img) => {
        // Get actual dimensions
        let imgWidth = img.width || 512
        let imgHeight = img.height || 512

        // Try to get actual dimensions from Konva node
        if (stageRef.current) {
          const node = stage.findOne(`#${img.id}`)
          if (node && node.width && node.height) {
            imgWidth = node.width() * (node.scaleX ? node.scaleX() : 1)
            imgHeight = node.height() * (node.scaleY ? node.scaleY() : 1)
          }
        }

        const pos = toMinimapCoords(img.x, img.y)
        const width = imgWidth * minimapScale
        const height = imgHeight * minimapScale

        // Set colors based on image role/status
        let fillColor = 'rgba(100, 108, 255, 0.3)' // Default blue
        let strokeColor = 'rgba(100, 108, 255, 0.6)'
        let glowColor = null // For active roles

        if (img.borderColor) {
          switch (img.borderColor) {
            case '#00ff00': // img2img
              fillColor = 'rgba(0, 255, 0, 0.3)'
              strokeColor = 'rgba(0, 255, 0, 0.8)'
              glowColor = 'rgba(0, 255, 0, 0.4)'
              break
            case '#ff00ff': // inpaint
              fillColor = 'rgba(255, 0, 255, 0.3)'
              strokeColor = 'rgba(255, 0, 255, 0.8)'
              glowColor = 'rgba(255, 0, 255, 0.4)'
              break
            case '#646cff': // selected
              fillColor = 'rgba(100, 108, 255, 0.4)'
              strokeColor = 'rgba(100, 108, 255, 0.9)'
              glowColor = 'rgba(100, 108, 255, 0.3)'
              break
            default:
              if (img.borderColor !== 'transparent') {
                // Use custom color if provided
                fillColor = img.borderColor.replace(')', ', 0.3)').replace('rgb(', 'rgba(')
                strokeColor = img.borderColor.replace(')', ', 0.8)').replace('rgb(', 'rgba(')
              }
          }
        }

        // Draw glow effect for active roles
        if (glowColor) {
          ctx.shadowColor = glowColor
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
        } else {
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
        }

        ctx.fillStyle = fillColor
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = img.borderColor === '#646cff' ? 2 : 1 // Thicker for selected

        ctx.fillRect(pos.x, pos.y, width, height)
        ctx.strokeRect(pos.x, pos.y, width, height)

        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      })

      // Draw viewport rectangle
      const stageWidth = stage.width()
      const stageHeight = stage.height()
      const viewportX = -position.x / scale
      const viewportY = -position.y / scale
      const viewportWidth = stageWidth / scale
      const viewportHeight = stageHeight / scale

      const viewportPos = toMinimapCoords(viewportX, viewportY)
      const viewportMinimapWidth = viewportWidth * minimapScale
      const viewportMinimapHeight = viewportHeight * minimapScale

      // Draw viewport
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.strokeRect(viewportPos.x, viewportPos.y, viewportMinimapWidth, viewportMinimapHeight)

      // Semi-transparent fill for viewport
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'
      ctx.fillRect(viewportPos.x, viewportPos.y, viewportMinimapWidth, viewportMinimapHeight)

      // Store transform for click navigation
      canvasRef.current.dataset.transform = JSON.stringify({
        minimapScale,
        offsetX,
        offsetY,
        minX,
        minY,
        contentWidth,
        contentHeight,
      })
    },
    [memoizedImages, position, scale, isMinimized, stageRef]
  )

  // Update minimap when dependencies change (throttled)
  useEffect(() => {
    // Skip all updates when minimized for performance
    if (isMinimized) {
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = undefined
      }
      // Clear canvas when minimized
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    // Render immediately on mount or when dependencies change
    // Force update when position or scale changes for responsive minimap
    renderMinimap(true)

    // Then continue with animation frame for future updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => renderMinimap())

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [renderMinimap, isMinimized, position, scale, stageRef, memoizedImages]) // Add all dependencies

  // Force initial render with restored viewport values
  useEffect(() => {
    // Give Konva stage a moment to initialize, then render minimap
    const timer = setTimeout(() => {
      if (!isMinimized && stageRef?.current) {
        renderMinimap(true) // Force update on initial render
      }
    }, 100) // Small delay to ensure stage is ready

    return () => clearTimeout(timer)
  }, [isMinimized, stageRef, renderMinimap]) // Added missing dependencies

  // Handle minimap click for navigation
  const handleMinimapClick = (e: MouseEvent) => {
    // Don't process clicks when minimized
    if (isMinimized || !canvasRef.current || !onViewportChange || !stageRef?.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const transformData = canvasRef.current.dataset.transform
    if (!transformData) return

    const transform = JSON.parse(transformData)

    // Convert click position to world coordinates
    const worldX = (clickX - transform.offsetX) / transform.minimapScale + transform.minX
    const worldY = (clickY - transform.offsetY) / transform.minimapScale + transform.minY

    // Center viewport on clicked position
    const stage = stageRef.current
    const viewportWidth = stage.width() / scale
    const viewportHeight = stage.height() / scale

    const newX = -(worldX - viewportWidth / 2) * scale
    const newY = -(worldY - viewportHeight / 2) * scale

    onViewportChange?.(newX, newY, scale)
  }

  // Handle dragging
  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement

    // Check if clicking on resize handle
    if (target.closest('.minimap-resize-handle')) {
      setIsResizing(true)
      e.preventDefault()
      return
    }

    // Check if clicking on grip
    if (!target.closest('.minimap-grip')) return

    setIsDragging(true)
    // Fix: Use position state instead of getBoundingClientRect
    setDragOffset({
      x: e.clientX - minimapPos.x,
      y: e.clientY - minimapPos.y,
    })
    e.preventDefault()
  }

  // Handle drag and resize
  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y

        const maxX = window.innerWidth - minimapSize.width - 20
        const maxY = window.innerHeight - minimapSize.height - 20

        setMinimapPos({
          x: Math.max(20, Math.min(maxX, newX)),
          y: Math.max(20, Math.min(maxY, newY)),
        })
      } else if (isResizing && panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect()
        const newWidth = Math.max(150, Math.min(400, e.clientX - rect.left))
        const newHeight = Math.max(100, Math.min(300, e.clientY - rect.top))

        setMinimapSize({ width: newWidth, height: newHeight })
      }
    }

    const handlePointerUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, isResizing, dragOffset, minimapSize])

  return (
    <div
      ref={panelRef}
      class={`canvas-minimap ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: `${minimapPos.x}px`,
        top: `${minimapPos.y}px`,
        width: isMinimized ? 'auto' : `${minimapSize.width}px`,
        height: isMinimized ? 'auto' : `${minimapSize.height + 32}px`, // 32px for header
      }}
      onPointerDown={handlePointerDown}
    >
      <div class="minimap-header">
        <div class="minimap-grip" title="Drag to move">
          <span class="grip-icon">⋮⋮</span>
        </div>
        <span class="minimap-title">Minimap</span>
        <button
          class="minimap-minimize-btn"
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? 'Expand' : 'Minimize'}
        >
          {isMinimized ? '□' : '─'}
        </button>
      </div>

      {!isMinimized && (
        <>
          <canvas
            ref={canvasRef}
            class="minimap-canvas"
            width={minimapSize.width - 4}
            height={minimapSize.height - 4}
            onClick={handleMinimapClick}
          />
          <div class="minimap-resize-handle" title="Drag to resize">
            <span class="resize-icon">◢</span>
          </div>
        </>
      )}
    </div>
  )
}
