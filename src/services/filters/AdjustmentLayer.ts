/**
 * AdjustmentLayer.ts - Non-destructive Adjustment Layer System
 *
 * Provides non-destructive editing capabilities through adjustment layers
 * that can be stacked, reordered, and toggled without affecting the original image.
 *
 * Part of Phase 2.2 of the Professional Image Editing Integration Plan
 */

import Konva from 'konva'
import { v4 as uuidv4 } from 'uuid'

import { FilterChain } from './FilterChain'

/**
 * Types of adjustment layers
 */
export enum AdjustmentLayerType {
  FILTER = 'filter',
  BLEND = 'blend',
  MASK = 'mask',
  GRADIENT = 'gradient',
  COLOR_FILL = 'color-fill',
  PATTERN = 'pattern',
}

/**
 * Adjustment layer configuration
 */
export interface AdjustmentLayerConfig {
  id: string
  name: string
  type: AdjustmentLayerType
  visible: boolean
  opacity: number
  blendMode: GlobalCompositeOperation
  locked: boolean
  order: number

  // Type-specific properties
  filterChain?: FilterChain
  color?: string
  gradient?: {
    type: 'linear' | 'radial'
    colors: Array<{ offset: number; color: string }>
    angle?: number
  }
  pattern?: {
    image: HTMLImageElement
    repeat: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'
  }
  mask?: {
    shape: Konva.Shape
    inverted: boolean
  }
}

/**
 * Adjustment layer that wraps a Konva layer
 */
export class AdjustmentLayer {
  public readonly id: string
  public config: AdjustmentLayerConfig
  private konvaLayer: Konva.Layer
  private imageNode: Konva.Image | null = null
  private overlayNode: Konva.Rect | null = null
  private maskNode: Konva.Shape | null = null
  private filterChain: FilterChain | null = null

  constructor(config: Partial<AdjustmentLayerConfig> = {}) {
    this.id = config.id || uuidv4()

    this.config = {
      id: this.id,
      name: config.name || `Adjustment Layer ${this.id.slice(0, 8)}`,
      type: config.type || AdjustmentLayerType.FILTER,
      visible: config.visible !== false,
      opacity: config.opacity ?? 1,
      blendMode: config.blendMode || 'normal',
      locked: config.locked || false,
      order: config.order || 0,
      ...config,
    }

    // Create Konva layer
    this.konvaLayer = new Konva.Layer({
      id: this.id,
      visible: this.config.visible,
      opacity: this.config.opacity,
    })

    // Initialize based on type
    this.initialize()
  }

  /**
   * Initialize layer based on type
   */
  private initialize(): void {
    switch (this.config.type) {
      case AdjustmentLayerType.FILTER:
        this.initializeFilterLayer()
        break
      case AdjustmentLayerType.COLOR_FILL:
        this.initializeColorFillLayer()
        break
      case AdjustmentLayerType.GRADIENT:
        this.initializeGradientLayer()
        break
      case AdjustmentLayerType.PATTERN:
        this.initializePatternLayer()
        break
      case AdjustmentLayerType.MASK:
        this.initializeMaskLayer()
        break
      case AdjustmentLayerType.BLEND:
        this.initializeBlendLayer()
        break
    }
  }

  /**
   * Initialize filter adjustment layer
   */
  private initializeFilterLayer(): void {
    this.filterChain = this.config.filterChain || new FilterChain()
  }

  /**
   * Initialize color fill layer
   */
  private initializeColorFillLayer(): void {
    if (!this.config.color) {
      this.config.color = '#000000'
    }

    this.overlayNode = new Konva.Rect({
      x: 0,
      y: 0,
      fill: this.config.color,
      listening: false,
    })

    this.konvaLayer.add(this.overlayNode)
  }

  /**
   * Initialize gradient layer
   */
  private initializeGradientLayer(): void {
    if (!this.config.gradient) {
      this.config.gradient = {
        type: 'linear',
        colors: [
          { offset: 0, color: '#000000' },
          { offset: 1, color: '#ffffff' },
        ],
        angle: 0,
      }
    }

    this.overlayNode = new Konva.Rect({
      x: 0,
      y: 0,
      listening: false,
    })

    this.updateGradient()
    this.konvaLayer.add(this.overlayNode)
  }

  /**
   * Initialize pattern layer
   */
  private initializePatternLayer(): void {
    if (!this.config.pattern) {
      console.warn('Pattern layer created without pattern config')
      return
    }

    this.overlayNode = new Konva.Rect({
      x: 0,
      y: 0,
      fillPatternImage: this.config.pattern.image,
      fillPatternRepeat: this.config.pattern.repeat,
      listening: false,
    })

    this.konvaLayer.add(this.overlayNode)
  }

  /**
   * Initialize mask layer
   */
  private initializeMaskLayer(): void {
    if (!this.config.mask) {
      // Create default mask
      this.config.mask = {
        shape: new Konva.Rect({
          x: 0,
          y: 0,
          fill: 'white',
        }),
        inverted: false,
      }
    }

    this.maskNode = this.config.mask.shape
    this.konvaLayer.add(this.maskNode)
  }

  /**
   * Initialize blend layer
   */
  private initializeBlendLayer(): void {
    // Blend layers are applied through composite operations
    this.konvaLayer.globalCompositeOperation(this.config.blendMode)
  }

  /**
   * Update gradient fill
   */
  private updateGradient(): void {
    if (!this.overlayNode || !this.config.gradient) return

    const { type, colors, angle = 0 } = this.config.gradient

    if (type === 'linear') {
      const radians = (angle * Math.PI) / 180
      const x1 = Math.cos(radians) * 100
      const y1 = Math.sin(radians) * 100

      this.overlayNode.fillLinearGradientStartPoint({ x: -x1, y: -y1 })
      this.overlayNode.fillLinearGradientEndPoint({ x: x1, y: y1 })
      this.overlayNode.fillLinearGradientColorStops(colors.flatMap((c) => [c.offset, c.color]))
    } else {
      this.overlayNode.fillRadialGradientStartRadius(0)
      this.overlayNode.fillRadialGradientEndRadius(100)
      this.overlayNode.fillRadialGradientColorStops(colors.flatMap((c) => [c.offset, c.color]))
    }
  }

  /**
   * Apply adjustment layer to an image
   */
  async apply(sourceImage: Konva.Image, bounds?: { width: number; height: number }): Promise<void> {
    // Clear existing content
    this.konvaLayer.destroyChildren()

    // Set layer bounds
    if (bounds && this.overlayNode) {
      this.overlayNode.width(bounds.width)
      this.overlayNode.height(bounds.height)
    }

    switch (this.config.type) {
      case AdjustmentLayerType.FILTER:
        await this.applyFilterAdjustment(sourceImage)
        break
      case AdjustmentLayerType.COLOR_FILL:
      case AdjustmentLayerType.GRADIENT:
      case AdjustmentLayerType.PATTERN:
        this.applyOverlayAdjustment(bounds)
        break
      case AdjustmentLayerType.MASK:
        this.applyMaskAdjustment(sourceImage)
        break
      case AdjustmentLayerType.BLEND:
        this.applyBlendAdjustment(sourceImage)
        break
    }

    // Apply layer properties
    this.konvaLayer.opacity(this.config.opacity)
    this.konvaLayer.visible(this.config.visible)

    if (this.config.blendMode !== 'normal') {
      this.konvaLayer.globalCompositeOperation(this.config.blendMode)
    }
  }

  /**
   * Apply filter adjustment
   */
  private async applyFilterAdjustment(sourceImage: Konva.Image): Promise<void> {
    if (!this.filterChain) return

    // Clone the source image
    const clone = sourceImage.clone()

    // Apply filter chain to the clone
    await this.filterChain.applyToNode(clone)

    // Add filtered image to layer
    this.imageNode = clone
    this.konvaLayer.add(clone)
  }

  /**
   * Apply overlay adjustment (color, gradient, pattern)
   */
  private applyOverlayAdjustment(bounds?: { width: number; height: number }): void {
    if (!this.overlayNode) return

    if (bounds) {
      this.overlayNode.width(bounds.width)
      this.overlayNode.height(bounds.height)
    }

    if (this.config.type === AdjustmentLayerType.GRADIENT) {
      this.updateGradient()
    }

    this.konvaLayer.add(this.overlayNode)
  }

  /**
   * Apply mask adjustment
   */
  private applyMaskAdjustment(sourceImage: Konva.Image): void {
    if (!this.maskNode) return

    const clone = sourceImage.clone()

    // Apply mask to the clone
    if (this.config.mask?.inverted) {
      // Invert mask logic
      clone.globalCompositeOperation('source-out')
    } else {
      clone.globalCompositeOperation('source-in')
    }

    this.konvaLayer.add(this.maskNode)
    this.konvaLayer.add(clone)

    this.imageNode = clone
  }

  /**
   * Apply blend adjustment
   */
  private applyBlendAdjustment(sourceImage: Konva.Image): void {
    const clone = sourceImage.clone()
    this.imageNode = clone
    this.konvaLayer.add(clone)
  }

  /**
   * Update layer visibility
   */
  setVisible(visible: boolean): void {
    this.config.visible = visible
    this.konvaLayer.visible(visible)
  }

  /**
   * Toggle visibility
   */
  toggleVisibility(): void {
    this.setVisible(!this.config.visible)
  }

  /**
   * Update layer opacity
   */
  setOpacity(opacity: number): void {
    this.config.opacity = Math.max(0, Math.min(1, opacity))
    this.konvaLayer.opacity(this.config.opacity)
  }

  /**
   * Update blend mode
   */
  setBlendMode(blendMode: GlobalCompositeOperation): void {
    this.config.blendMode = blendMode
    this.konvaLayer.globalCompositeOperation(blendMode)
  }

  /**
   * Lock/unlock layer
   */
  setLocked(locked: boolean): void {
    this.config.locked = locked
    this.konvaLayer.listening(!locked)
  }

  /**
   * Get the Konva layer
   */
  getKonvaLayer(): Konva.Layer {
    return this.konvaLayer
  }

  /**
   * Get filter chain (if this is a filter layer)
   */
  getFilterChain(): FilterChain | null {
    return this.filterChain
  }

  /**
   * Update filter chain
   */
  setFilterChain(filterChain: FilterChain): void {
    if (this.config.type !== AdjustmentLayerType.FILTER) {
      throw new Error('Cannot set filter chain on non-filter adjustment layer')
    }
    this.filterChain = filterChain
  }

  /**
   * Export layer configuration
   */
  export(): AdjustmentLayerConfig {
    return {
      ...this.config,
      filterChain: this.filterChain || undefined,
    }
  }

  /**
   * Import layer configuration
   */
  import(config: AdjustmentLayerConfig): void {
    this.config = config

    if (config.filterChain) {
      this.filterChain = new FilterChain()
      this.filterChain.loadState(config.filterChain.exportState())
    }

    // Re-initialize with new config
    this.konvaLayer.destroyChildren()
    this.initialize()
  }

  /**
   * Destroy the layer
   */
  destroy(): void {
    this.konvaLayer.destroy()
    this.imageNode = null
    this.overlayNode = null
    this.maskNode = null
    this.filterChain = null
  }
}

/**
 * Manages multiple adjustment layers
 */
export class AdjustmentLayerManager {
  private layers: Map<string, AdjustmentLayer> = new Map()
  private stage: Konva.Stage | null = null
  private baseLayer: Konva.Layer | null = null
  private sourceImage: Konva.Image | null = null

  constructor(stage?: Konva.Stage) {
    if (stage) {
      this.setStage(stage)
    }
  }

  /**
   * Set the Konva stage
   */
  setStage(stage: Konva.Stage): void {
    this.stage = stage

    // Find or create base layer
    const existingBase = stage.findOne('#base-layer')
    if (existingBase instanceof Konva.Layer) {
      this.baseLayer = existingBase
    } else {
      this.baseLayer = new Konva.Layer({ id: 'base-layer' })
      stage.add(this.baseLayer)
    }
  }

  /**
   * Set the source image to apply adjustments to
   */
  setSourceImage(image: Konva.Image): void {
    this.sourceImage = image

    if (this.baseLayer && !image.getParent()) {
      this.baseLayer.add(image)
    }

    // Re-apply all adjustment layers
    this.updateAllLayers()
  }

  /**
   * Add an adjustment layer
   */
  async addLayer(config?: Partial<AdjustmentLayerConfig>): Promise<AdjustmentLayer> {
    const layer = new AdjustmentLayer({
      ...config,
      order: this.layers.size,
    })

    this.layers.set(layer.id, layer)

    if (this.stage) {
      this.stage.add(layer.getKonvaLayer())
    }

    if (this.sourceImage) {
      const bounds = {
        width: this.sourceImage.width(),
        height: this.sourceImage.height(),
      }
      await layer.apply(this.sourceImage, bounds)
    }

    return layer
  }

  /**
   * Remove an adjustment layer
   */
  removeLayer(layerId: string): boolean {
    const layer = this.layers.get(layerId)
    if (!layer) return false

    layer.destroy()
    this.layers.delete(layerId)

    // Reorder remaining layers
    this.reorderLayers()

    return true
  }

  /**
   * Get a layer by ID
   */
  getLayer(layerId: string): AdjustmentLayer | undefined {
    return this.layers.get(layerId)
  }

  /**
   * Get all layers
   */
  getAllLayers(): AdjustmentLayer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.config.order - b.config.order)
  }

  /**
   * Reorder layers
   */
  reorderLayer(layerId: string, newOrder: number): void {
    const layer = this.layers.get(layerId)
    if (!layer) return

    const oldOrder = layer.config.order

    // Update orders
    this.layers.forEach((l) => {
      if (l.id === layerId) {
        l.config.order = newOrder
      } else if (oldOrder < newOrder && l.config.order > oldOrder && l.config.order <= newOrder) {
        l.config.order--
      } else if (oldOrder > newOrder && l.config.order < oldOrder && l.config.order >= newOrder) {
        l.config.order++
      }
    })

    // Update z-index in stage
    this.updateLayerOrder()
  }

  /**
   * Update layer z-index order
   */
  private updateLayerOrder(): void {
    if (!this.stage) return

    const sortedLayers = this.getAllLayers()

    sortedLayers.forEach((layer, index) => {
      const konvaLayer = layer.getKonvaLayer()
      konvaLayer.zIndex(index + 1) // +1 to keep base layer at 0
    })
  }

  /**
   * Reorder layers after deletion
   */
  private reorderLayers(): void {
    const sorted = this.getAllLayers()
    sorted.forEach((layer, index) => {
      layer.config.order = index
    })
    this.updateLayerOrder()
  }

  /**
   * Update all layers
   */
  private async updateAllLayers(): Promise<void> {
    if (!this.sourceImage) return

    const bounds = {
      width: this.sourceImage.width(),
      height: this.sourceImage.height(),
    }

    const layers = this.getAllLayers()

    for (const layer of layers) {
      await layer.apply(this.sourceImage, bounds)
    }
  }

  /**
   * Merge all visible layers
   */
  async mergeVisible(): Promise<HTMLCanvasElement | null> {
    if (!this.stage) return null

    // Get all visible layers
    // Note: visibility is handled by tempStage cloning below

    // Create temporary stage for merging
    const tempStage = this.stage.clone()

    // Apply only visible layers
    tempStage.find('Layer').forEach((layer: Konva.Node) => {
      const adjLayer = this.layers.get(layer.id())
      if (adjLayer && !adjLayer.config.visible) {
        layer.visible(false)
      }
    })

    // Export as canvas
    return tempStage.toCanvas()
  }

  /**
   * Export all layers configuration
   */
  exportConfiguration(): {
    version: string
    layers: AdjustmentLayerConfig[]
  } {
    return {
      version: '1.0.0',
      layers: this.getAllLayers().map((l) => l.export()),
    }
  }

  /**
   * Import layers configuration
   */
  async importConfiguration(config: {
    version: string
    layers: AdjustmentLayerConfig[]
  }): Promise<void> {
    // Clear existing layers
    this.clear()

    // Import each layer
    for (const layerConfig of config.layers) {
      const layer = new AdjustmentLayer(layerConfig)
      this.layers.set(layer.id, layer)

      if (this.stage) {
        this.stage.add(layer.getKonvaLayer())
      }
    }

    // Apply to source image
    await this.updateAllLayers()
  }

  /**
   * Clear all adjustment layers
   */
  clear(): void {
    this.layers.forEach((layer) => layer.destroy())
    this.layers.clear()
  }

  /**
   * Get manager info
   */
  getInfo(): {
    layerCount: number
    visibleCount: number
    types: Record<AdjustmentLayerType, number>
  } {
    const layers = this.getAllLayers()
    const types = {} as Record<AdjustmentLayerType, number>

    Object.values(AdjustmentLayerType).forEach((type) => {
      types[type as AdjustmentLayerType] = 0
    })

    layers.forEach((layer) => {
      types[layer.config.type]++
    })

    return {
      layerCount: layers.length,
      visibleCount: layers.filter((l) => l.config.visible).length,
      types,
    }
  }
}
