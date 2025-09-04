import Konva from 'konva'
import { rafThrottle, simplifyPoints, calculateBoundingBox } from '../../utils/performanceUtils'

interface PerformanceConfig {
  enablePixelRatio: boolean
  enablePerfectDraw: boolean
  enableAntialiasing: boolean
  simplificationTolerance: number
  maxPointsPerStroke: number
  batchDrawDelay: number
  enableFastLayer: boolean
  regionUpdatePadding: number
}

export class CanvasPerformanceManager {
  private stage: Konva.Stage | null = null
  private config: PerformanceConfig = {
    enablePixelRatio: true,
    enablePerfectDraw: true,
    enableAntialiasing: true,
    simplificationTolerance: 2,
    maxPointsPerStroke: 1000,
    batchDrawDelay: 16,
    enableFastLayer: true,
    regionUpdatePadding: 20
  }
  
  private batchDrawTimer: NodeJS.Timeout | null = null
  private pendingDraws = new Set<Konva.Layer>()
  private isDrawingMode = false
  private cachedNodes = new WeakSet<Konva.Node>()
  
  constructor(stage?: Konva.Stage) {
    if (stage) {
      this.attachToStage(stage)
    }
  }
  
  attachToStage(stage: Konva.Stage): void {
    this.stage = stage
    this.optimizeStageSettings()
  }
  
  private optimizeStageSettings(): void {
    if (!this.stage) return
    
    // Optimize stage settings for performance
    this.stage.listening(true)
    
    // Set pixel ratio based on drawing mode
    this.updatePixelRatio()
    
    // Configure Konva global settings for better performance
    Konva.dragDistance = 3 // Small threshold to prevent accidental drags
    Konva.hitOnDragEnabled = false // Disable hit detection during drag for better performance
  }
  
  setDrawingMode(enabled: boolean): void {
    this.isDrawingMode = enabled
    this.updatePixelRatio()
    this.updatePerfectDraw()
    this.updateAntialiasing()
  }
  
  private updatePixelRatio(): void {
    if (!this.stage) return
    
    // Lower pixel ratio during drawing for better performance
    // But keep it reasonable to avoid too much quality loss
    const pixelRatio = this.isDrawingMode ? 
      Math.min(1.5, window.devicePixelRatio) : 
      window.devicePixelRatio
    
    this.stage.pixelRatio(this.config.enablePixelRatio ? pixelRatio : 1)
  }
  
  private updatePerfectDraw(): void {
    if (!this.stage) return
    
    // Disable perfect draw during drawing for better performance
    const layers = this.stage.getLayers()
    layers.forEach(layer => {
      // Skip drawing layers which should never have perfectDraw enabled
      if (layer.name() !== 'drawing-layer') {
        layer.perfectDrawEnabled(!this.isDrawingMode && this.config.enablePerfectDraw)
      }
    })
  }
  
  private updateAntialiasing(): void {
    if (!this.stage) return
    
    // Control antialiasing for performance
    const layers = this.stage.getLayers()
    layers.forEach(layer => {
      if (layer.name() === 'drawing-layer') {
        // Drawing layer should have antialiasing disabled during drawing
        layer.imageSmoothingEnabled(!this.isDrawingMode && this.config.enableAntialiasing)
      }
    })
  }
  
  /**
   * Batch multiple draw calls together for better performance
   */
  batchDraw(layer: Konva.Layer): void {
    if (!layer) return
    
    this.pendingDraws.add(layer)
    
    if (this.batchDrawTimer) {
      clearTimeout(this.batchDrawTimer)
    }
    
    // Use requestAnimationFrame for smoother updates
    this.batchDrawTimer = setTimeout(() => {
      requestAnimationFrame(() => this.executeBatchDraw())
    }, this.config.batchDrawDelay)
  }
  
  private executeBatchDraw(): void {
    // Use batchDraw for better performance
    this.stage?.batchDraw(() => {
      this.pendingDraws.forEach(layer => {
        layer.draw()
      })
    })
    
    this.pendingDraws.clear()
    this.batchDrawTimer = null
  }
  
  /**
   * Optimize drawing layer for real-time drawing
   */
  createDrawingLayer(): Konva.Layer | Konva.FastLayer {
    // Use FastLayer if available and enabled
    const LayerClass = this.config.enableFastLayer && Konva.FastLayer ? 
      Konva.FastLayer : 
      Konva.Layer
    
    const layer = new LayerClass({
      clearBeforeDraw: false, // Don't clear to preserve strokes
      listening: true,
      name: 'drawing-layer'
    })
    
    // Disable features that slow down drawing
    layer.hitGraphEnabled(false) // No hit detection needed during drawing
    layer.perfectDrawEnabled(false) // No subpixel rendering
    layer.imageSmoothingEnabled(false) // No antialiasing during drawing
    
    return layer
  }
  
  /**
   * Optimize points for a stroke
   */
  optimizeStrokePoints(points: number[]): number[] {
    // Don't optimize if we have few points
    if (points.length < 100) return points
    
    // Simplify points if there are too many
    if (points.length > this.config.maxPointsPerStroke * 2) {
      return simplifyPoints(points, this.config.simplificationTolerance)
    }
    
    return points
  }
  
  /**
   * Create region-based update for partial canvas redraws
   */
  drawRegion(layer: Konva.Layer, points: number[], brushSize: number): void {
    if (!layer || points.length < 2) return
    
    // Calculate bounding box for the new stroke points
    const bbox = calculateBoundingBox(points)
    
    // Add padding for brush size
    const padding = brushSize + this.config.regionUpdatePadding
    const region = {
      x: bbox.x - padding,
      y: bbox.y - padding,
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2
    }
    
    // Use Konva's clip to only redraw specific region
    const oldClip = layer.getClip()
    
    layer.clip(region)
    layer.batchDraw()
    
    // Restore original clip
    if (oldClip) {
      layer.clip(oldClip)
    } else {
      layer.clip(undefined as any)
    }
  }
  
  /**
   * Cache static elements for better performance
   */
  cacheStaticElements(node: Konva.Node): void {
    // Don't cache if already cached
    if (this.cachedNodes.has(node) || node.isCached()) return
    
    // Cache the node
    node.cache()
    
    // Use cache for hit detection too
    node.drawHitFromCache()
    
    // Track cached nodes
    this.cachedNodes.add(node)
  }
  
  /**
   * Clear cache for dynamic elements
   */
  clearCache(node: Konva.Node): void {
    if (!node.isCached()) return
    
    node.clearCache()
    this.cachedNodes.delete(node)
  }
  
  /**
   * Optimize image nodes for better performance
   */
  optimizeImage(image: Konva.Image): void {
    // Enable image smoothing only when not dragging
    image.on('dragstart', () => {
      image.imageSmoothingEnabled(false)
      this.cacheStaticElements(image)
    })
    
    image.on('dragend', () => {
      image.imageSmoothingEnabled(true)
      this.clearCache(image)
    })
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): {
    nodeCount: number
    layerCount: number
    cachedNodes: number
    drawingMode: boolean
    pixelRatio: number
  } {
    if (!this.stage) {
      return { 
        nodeCount: 0, 
        layerCount: 0, 
        cachedNodes: 0,
        drawingMode: false,
        pixelRatio: 1
      }
    }
    
    const layers = this.stage.getLayers()
    let nodeCount = 0
    let cachedNodes = 0
    
    layers.forEach(layer => {
      const nodes = layer.find('*')
      nodeCount += nodes.length
      cachedNodes += nodes.filter(n => n.isCached()).length
    })
    
    return {
      nodeCount,
      layerCount: layers.length,
      cachedNodes,
      drawingMode: this.isDrawingMode,
      pixelRatio: this.stage.pixelRatio()
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config }
    this.optimizeStageSettings()
  }
  
  /**
   * Get current configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config }
  }
  
  /**
   * Enable debug mode with performance overlay
   */
  enableDebugMode(): void {
    if (!this.stage) return
    
    console.log('Canvas Performance Manager - Debug Mode Enabled')
    console.log('Current Metrics:', this.getMetrics())
    console.log('Configuration:', this.getConfig())
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchDrawTimer) {
      clearTimeout(this.batchDrawTimer)
    }
    this.pendingDraws.clear()
    this.cachedNodes = new WeakSet()
    this.stage = null
  }
}
