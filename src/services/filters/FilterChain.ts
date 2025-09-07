/**
 * FilterChain.ts - Composable Filter Pipeline System for InfiniFox
 *
 * Provides a powerful system for chaining multiple filters together,
 * with support for:
 * - Non-destructive editing with adjustment layers
 * - Preview system with before/after comparison
 * - Preset management (save/load filter combinations)
 * - Performance optimization through caching
 * - Undo/redo support
 *
 * Phase 2.2 of the Professional Image Editing Integration Plan
 */

import Konva from 'konva'
import { v4 as uuidv4 } from 'uuid'

/**
 * Interface for a single filter in the chain
 */
export interface FilterConfig {
  id: string
  name: string
  enabled: boolean
  opacity: number // 0-1, allows for partial application
  blendMode?: string // Optional blend mode for the filter
  params: Record<string, string | number | boolean>
  order: number
}

/**
 * Interface for filter presets
 */
export interface FilterPreset {
  id: string
  name: string
  description?: string
  category?: string
  thumbnail?: string
  filters: Omit<FilterConfig, 'id'>[]
  metadata?: {
    author?: string
    created?: Date
    tags?: string[]
    version?: string
  }
}

/**
 * Filter chain state for serialization
 */
export interface FilterChainState {
  version: string
  filters: FilterConfig[]
  previewMode?: 'split' | 'side-by-side' | 'onion-skin' | 'difference' | null
  previewOpacity?: number
}

/**
 * Options for applying filters
 */
export interface ApplyOptions {
  preview?: boolean
  region?: { x: number; y: number; width: number; height: number }
  progressCallback?: (progress: number) => void
  useCache?: boolean
}

/**
 * Main FilterChain class - manages a pipeline of filters
 */
export class FilterChain {
  private filters: Map<string, FilterConfig> = new Map()
  private history: FilterChainState[] = []
  private historyIndex: number = -1
  private maxHistorySize: number = 50
  private cache: Map<string, ImageData> = new Map()
  private version: string = '1.0.0'

  // Preview state
  private previewMode: 'split' | 'side-by-side' | 'onion-skin' | 'difference' | null = null
  private previewOpacity: number = 0.5
  private originalImageData: ImageData | null = null

  constructor() {
    this.initializeBuiltInFilters()
  }

  /**
   * Initialize with Konva's built-in filters
   */
  private initializeBuiltInFilters(): void {
    // Register commonly used built-in filters
    const builtInFilters = [
      'Blur',
      'Brighten',
      'Contrast',
      'Emboss',
      'Enhance',
      'Grayscale',
      'HSL',
      'HSV',
      'Invert',
      'Kaleidoscope',
      'Mask',
      'Noise',
      'Pixelate',
      'Posterize',
      'RGB',
      'RGBA',
      'Sepia',
      'Solarize',
      'Threshold',
    ]

    // Verify which filters are available
    builtInFilters.forEach((filterName) => {
      if (Konva.Filters[filterName]) {
        console.log(`✓ Built-in filter available: ${filterName}`)
      }
    })
  }

  /**
   * Add a filter to the chain
   */
  addFilter(config: Omit<FilterConfig, 'id' | 'order'>): string {
    const id = uuidv4()
    const order = this.filters.size

    const filterConfig: FilterConfig = {
      id,
      order,
      enabled: true,
      opacity: 1,
      ...config,
    }

    this.filters.set(id, filterConfig)
    this.saveToHistory()

    return id
  }

  /**
   * Remove a filter from the chain
   */
  removeFilter(filterId: string): boolean {
    const deleted = this.filters.delete(filterId)
    if (deleted) {
      this.reorderFilters()
      this.saveToHistory()
      this.clearCache()
    }
    return deleted
  }

  /**
   * Update filter parameters
   */
  updateFilter(filterId: string, updates: Partial<FilterConfig>): void {
    const filter = this.filters.get(filterId)
    if (!filter) {
      throw new Error(`Filter ${filterId} not found`)
    }

    // Update the filter config
    Object.assign(filter, updates)

    // Clear cache for this filter and all subsequent filters
    this.clearCacheFrom(filter.order)
    this.saveToHistory()
  }

  /**
   * Reorder filters in the chain
   */
  reorderFilter(filterId: string, newOrder: number): void {
    const filter = this.filters.get(filterId)
    if (!filter) {
      throw new Error(`Filter ${filterId} not found`)
    }

    const oldOrder = filter.order

    // Update orders for all affected filters
    this.filters.forEach((f) => {
      if (f.id === filterId) {
        f.order = newOrder
      } else if (oldOrder < newOrder && f.order > oldOrder && f.order <= newOrder) {
        f.order--
      } else if (oldOrder > newOrder && f.order < oldOrder && f.order >= newOrder) {
        f.order++
      }
    })

    this.clearCache()
    this.saveToHistory()
  }

  /**
   * Toggle filter enabled state
   */
  toggleFilter(filterId: string): void {
    const filter = this.filters.get(filterId)
    if (filter) {
      filter.enabled = !filter.enabled
      this.clearCacheFrom(filter.order)
      this.saveToHistory()
    }
  }

  /**
   * Apply the filter chain to a Konva node
   */
  async applyToNode(node: Konva.Node, options: ApplyOptions = {}): Promise<void> {
    const { preview = false, progressCallback } = options

    // Get sorted filters
    const sortedFilters = this.getSortedFilters()
    const enabledFilters = sortedFilters.filter((f) => f.enabled)

    if (enabledFilters.length === 0) {
      // Clear any existing filters
      node.filters([])
      node.clearCache()
      return
    }

    // Store original image data for preview
    if (preview && !this.originalImageData) {
      const canvas = node.toCanvas()
      const ctx = canvas.getContext('2d')
      if (ctx) {
        this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      }
    }

    // Build filter array for Konva
    const konvaFilters: ((this: Konva.Node, imageData: ImageData) => void)[] = []
    const filterParams: Record<string, string | number | boolean> = {}

    let progress = 0
    const progressStep = 100 / enabledFilters.length

    for (const filter of enabledFilters) {
      // Check if it's a built-in or custom filter
      const filterFunction = Konva.Filters[filter.name]

      if (!filterFunction) {
        console.warn(`Filter ${filter.name} not found`)
        continue
      }

      konvaFilters.push(filterFunction)

      // Apply filter parameters
      Object.entries(filter.params).forEach(([key, value]) => {
        filterParams[key] = value
      })

      // Handle opacity by modifying the filter params if supported
      if (filter.opacity < 1) {
        filterParams[`${filter.name.toLowerCase()}Opacity`] = filter.opacity
      }

      progress += progressStep
      progressCallback?.(progress)
    }

    // Apply filters to node
    node.filters(konvaFilters)

    // Set all filter parameters
    Object.entries(filterParams).forEach(([key, value]) => {
      if (typeof node[key] === 'function') {
        node[key](value)
      }
    })

    // Cache the node to apply filters
    node.cache()

    // Apply preview mode if enabled
    if (preview && this.previewMode) {
      this.applyPreviewMode(node)
    }

    progressCallback?.(100)
  }

  /**
   * Apply preview mode visualization
   */
  private applyPreviewMode(node: Konva.Node): void {
    if (!this.originalImageData || !this.previewMode) return

    switch (this.previewMode) {
      case 'split':
        this.applySplitPreview(node)
        break
      case 'side-by-side':
        this.applySideBySidePreview(node)
        break
      case 'onion-skin':
        this.applyOnionSkinPreview(node)
        break
      case 'difference':
        this.applyDifferencePreview(node)
        break
    }
  }

  /**
   * Apply split screen preview (left: original, right: filtered)
   */
  private applySplitPreview(_node: Konva.Node): void {
    // Implementation would create a mask to show half original, half filtered
    console.log('Split preview mode - to be implemented with canvas masking')
  }

  /**
   * Apply side-by-side preview
   */
  private applySideBySidePreview(_node: Konva.Node): void {
    console.log('Side-by-side preview mode - to be implemented')
  }

  /**
   * Apply onion skin preview (transparent overlay)
   */
  private applyOnionSkinPreview(node: Konva.Node): void {
    if (node instanceof Konva.Image || node instanceof Konva.Shape) {
      node.opacity(this.previewOpacity)
    }
  }

  /**
   * Apply difference preview (shows what changed)
   */
  private applyDifferencePreview(_node: Konva.Node): void {
    console.log('Difference preview mode - to be implemented with blend modes')
  }

  /**
   * Set preview mode
   */
  setPreviewMode(
    mode: 'split' | 'side-by-side' | 'onion-skin' | 'difference' | null,
    opacity: number = 0.5
  ): void {
    this.previewMode = mode
    this.previewOpacity = opacity
  }

  /**
   * Get sorted filters by order
   */
  private getSortedFilters(): FilterConfig[] {
    return Array.from(this.filters.values()).sort((a, b) => a.order - b.order)
  }

  /**
   * Reorder filters after deletion
   */
  private reorderFilters(): void {
    const sorted = this.getSortedFilters()
    sorted.forEach((filter, index) => {
      filter.order = index
    })
  }

  /**
   * Clear cache from a specific filter order onwards
   */
  private clearCacheFrom(order: number): void {
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      const [, filterOrder] = key.split('-')
      if (parseInt(filterOrder) >= order) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach((key) => this.cache.delete(key))
  }

  /**
   * Clear all cache
   */
  private clearCache(): void {
    this.cache.clear()
  }

  /**
   * Save current state to history
   */
  private saveToHistory(): void {
    // Remove any states after current index
    this.history = this.history.slice(0, this.historyIndex + 1)

    // Add new state
    const state = this.exportState()
    this.history.push(state)

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    } else {
      this.historyIndex++
    }
  }

  /**
   * Undo last action
   */
  undo(): boolean {
    if (this.historyIndex > 0) {
      this.historyIndex--
      this.loadState(this.history[this.historyIndex])
      return true
    }
    return false
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++
      this.loadState(this.history[this.historyIndex])
      return true
    }
    return false
  }

  /**
   * Export current state
   */
  exportState(): FilterChainState {
    return {
      version: this.version,
      filters: this.getSortedFilters(),
      previewMode: this.previewMode,
      previewOpacity: this.previewOpacity,
    }
  }

  /**
   * Load state from export
   */
  loadState(state: FilterChainState): void {
    this.filters.clear()
    state.filters.forEach((filter) => {
      this.filters.set(filter.id, filter)
    })
    this.previewMode = state.previewMode || null
    this.previewOpacity = state.previewOpacity || 0.5
    this.clearCache()
  }

  /**
   * Save filter chain as preset
   */
  saveAsPreset(name: string, description?: string, category?: string): FilterPreset {
    const preset: FilterPreset = {
      id: uuidv4(),
      name,
      description,
      category,
      filters: this.getSortedFilters().map(({ id: _id, ...filter }) => filter),
      metadata: {
        created: new Date(),
        version: this.version,
      },
    }

    // Save to localStorage or IndexedDB
    this.savePresetToStorage(preset)

    return preset
  }

  /**
   * Load preset
   */
  loadPreset(preset: FilterPreset): void {
    this.filters.clear()

    preset.filters.forEach((filterConfig, index) => {
      const id = uuidv4()
      this.filters.set(id, {
        ...filterConfig,
        id,
        order: index,
      })
    })

    this.clearCache()
    this.saveToHistory()
  }

  /**
   * Get all saved presets
   */
  async getPresets(category?: string): Promise<FilterPreset[]> {
    const presets = await this.loadPresetsFromStorage()

    if (category) {
      return presets.filter((p) => p.category === category)
    }

    return presets
  }

  /**
   * Save preset to storage
   */
  private savePresetToStorage(preset: FilterPreset): void {
    try {
      const presets = JSON.parse(
        localStorage.getItem('infinifox-filter-presets') || '[]'
      ) as FilterPreset[]

      presets.push(preset)
      localStorage.setItem('infinifox-filter-presets', JSON.stringify(presets))
    } catch (error) {
      console.error('Failed to save preset:', error)
    }
  }

  /**
   * Load presets from storage
   */
  private async loadPresetsFromStorage(): Promise<FilterPreset[]> {
    try {
      const presets = JSON.parse(
        localStorage.getItem('infinifox-filter-presets') || '[]'
      ) as FilterPreset[]

      return presets
    } catch (error) {
      console.error('Failed to load presets:', error)
      return []
    }
  }

  /**
   * Delete a preset
   */
  async deletePreset(presetId: string): Promise<boolean> {
    try {
      const presets = await this.loadPresetsFromStorage()
      const filtered = presets.filter((p) => p.id !== presetId)
      localStorage.setItem('infinifox-filter-presets', JSON.stringify(filtered))
      return true
    } catch (error) {
      console.error('Failed to delete preset:', error)
      return false
    }
  }

  /**
   * Clear all filters
   */
  clear(): void {
    this.filters.clear()
    this.clearCache()
    this.originalImageData = null
    this.saveToHistory()
  }

  /**
   * Get filter by ID
   */
  getFilter(filterId: string): FilterConfig | undefined {
    return this.filters.get(filterId)
  }

  /**
   * Get all filters
   */
  getAllFilters(): FilterConfig[] {
    return this.getSortedFilters()
  }

  /**
   * Check if chain has any filters
   */
  hasFilters(): boolean {
    return this.filters.size > 0
  }

  /**
   * Get chain info
   */
  getInfo(): {
    filterCount: number
    enabledCount: number
    historySize: number
    cacheSize: number
  } {
    const filters = this.getSortedFilters()
    return {
      filterCount: filters.length,
      enabledCount: filters.filter((f) => f.enabled).length,
      historySize: this.history.length,
      cacheSize: this.cache.size,
    }
  }
}

/**
 * Factory function to create common filter chains
 */
export class FilterChainFactory {
  /**
   * Create a basic photo enhancement chain
   */
  static createPhotoEnhancement(): FilterChain {
    const chain = new FilterChain()

    chain.addFilter({
      name: 'Enhance',
      enabled: true,
      opacity: 0.8,
      params: { enhance: 0.4 },
    })

    chain.addFilter({
      name: 'Contrast',
      enabled: true,
      opacity: 1,
      params: { contrast: 20 },
    })

    chain.addFilter({
      name: 'Brighten',
      enabled: true,
      opacity: 0.6,
      params: { brightness: 0.1 },
    })

    return chain
  }

  /**
   * Create a black and white conversion chain
   */
  static createBlackAndWhite(): FilterChain {
    const chain = new FilterChain()

    chain.addFilter({
      name: 'Grayscale',
      enabled: true,
      opacity: 1,
      params: {},
    })

    chain.addFilter({
      name: 'Contrast',
      enabled: true,
      opacity: 1,
      params: { contrast: 30 },
    })

    return chain
  }

  /**
   * Create a vintage effect chain
   */
  static createVintage(): FilterChain {
    const chain = new FilterChain()

    chain.addFilter({
      name: 'Sepia',
      enabled: true,
      opacity: 0.7,
      params: {},
    })

    chain.addFilter({
      name: 'Noise',
      enabled: true,
      opacity: 0.3,
      params: { noise: 0.2 },
    })

    chain.addFilter({
      name: 'Brighten',
      enabled: true,
      opacity: 0.5,
      params: { brightness: -0.1 },
    })

    return chain
  }

  /**
   * Create a blur background chain
   */
  static createBackgroundBlur(): FilterChain {
    const chain = new FilterChain()

    chain.addFilter({
      name: 'Blur',
      enabled: true,
      opacity: 1,
      params: { blurRadius: 10 },
    })

    return chain
  }
}

/**
 * Default filter presets
 */
export const DefaultFilterPresets: FilterPreset[] = [
  {
    id: 'preset-enhance',
    name: 'Photo Enhancement',
    description: 'Basic photo enhancement for better colors and contrast',
    category: 'Basic',
    filters: [
      {
        name: 'Enhance',
        enabled: true,
        opacity: 0.8,
        params: { enhance: 0.4 },
        order: 0,
      },
      {
        name: 'Contrast',
        enabled: true,
        opacity: 1,
        params: { contrast: 20 },
        order: 1,
      },
    ],
  },
  {
    id: 'preset-bw',
    name: 'Black & White',
    description: 'High contrast black and white conversion',
    category: 'Basic',
    filters: [
      {
        name: 'Grayscale',
        enabled: true,
        opacity: 1,
        params: {},
        order: 0,
      },
      {
        name: 'Contrast',
        enabled: true,
        opacity: 1,
        params: { contrast: 40 },
        order: 1,
      },
    ],
  },
  {
    id: 'preset-vintage',
    name: 'Vintage Film',
    description: 'Retro film look with grain and color shift',
    category: 'Artistic',
    filters: [
      {
        name: 'Sepia',
        enabled: true,
        opacity: 0.6,
        params: {},
        order: 0,
      },
      {
        name: 'Noise',
        enabled: true,
        opacity: 0.4,
        params: { noise: 0.3 },
        order: 1,
      },
      {
        name: 'Contrast',
        enabled: true,
        opacity: 0.8,
        params: { contrast: -10 },
        order: 2,
      },
    ],
  },
]
