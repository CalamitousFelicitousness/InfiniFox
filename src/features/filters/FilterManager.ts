/**
 * FilterManager.ts - Business Logic Layer for Filter Operations
 * 
 * Manages the interaction between the UI and the FilterChain,
 * providing methods for filter application, preview management,
 * and performance optimization.
 */

import Konva from 'konva'
import type { Node as KonvaNode } from 'konva/lib/Node'
import { FilterChain } from '../../services/filters/FilterChain'
import type { FilterConfig, FilterPreset, FilterChainState } from '../../services/filters/FilterChain'

// Import custom filters
import '../../services/filters/konva-extensions'

export type PreviewMode = 'split' | 'side-by-side' | 'onion-skin' | 'difference' | null

interface ApplyOptions {
  preview?: boolean
  progressCallback?: (progress: number) => void
}

/**
 * FilterManager - Handles all filter-related business logic
 */
export class FilterManager {
  private filterChain: FilterChain
  private targetNode?: KonvaNode
  private originalImageData?: ImageData
  private previewMode: PreviewMode = null
  private previewOpacity: number = 0.5
  
  constructor() {
    this.filterChain = new FilterChain()
  }
  
  /**
   * Add a new filter to the chain
   */
  addFilter(filterName: string, params: Record<string, any> = {}): string {
    // Get default parameters for the filter
    const defaultParams = this.getDefaultFilterParams(filterName)
    
    return this.filterChain.addFilter({
      name: filterName,
      enabled: true,
      opacity: 1,
      params: { ...defaultParams, ...params }
    })
  }
  
  /**
   * Update filter parameters
   */
  updateFilter(filterId: string, updates: Partial<FilterConfig>): void {
    this.filterChain.updateFilter(filterId, updates)
  }
  
  /**
   * Remove a filter from the chain
   */
  removeFilter(filterId: string): boolean {
    return this.filterChain.removeFilter(filterId)
  }
  
  /**
   * Toggle filter enabled state
   */
  toggleFilter(filterId: string): void {
    this.filterChain.toggleFilter(filterId)
  }
  
  /**
   * Reorder filters in the chain
   */
  reorderFilter(filterId: string, newOrder: number): void {
    this.filterChain.reorderFilter(filterId, newOrder)
  }
  
  /**
   * Apply filters to a Konva node
   */
  async applyToNode(node: KonvaNode, preview: boolean = false): Promise<void> {
    if (!node) {
      console.warn('No node provided to apply filters')
      return
    }
    
    this.targetNode = node
    
    // Store original state for preview if needed
    if (preview && !this.originalImageData) {
      this.storeOriginalState(node)
    }
    
    // Apply the filter chain
    await this.filterChain.applyToNode(node, {
      preview,
      progressCallback: (progress) => {
        console.log(`Filter progress: ${progress}%`)
      }
    })
    
    // Apply preview mode if enabled
    if (preview && this.previewMode) {
      this.applyPreviewMode(node)
    }
  }
  
  /**
   * Set preview mode
   */
  setPreviewMode(mode: PreviewMode, opacity: number = 0.5): void {
    this.previewMode = mode
    this.previewOpacity = opacity
    this.filterChain.setPreviewMode(mode, opacity)
  }
  
  /**
   * Store original node state for preview
   */
  private storeOriginalState(node: KonvaNode): void {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      
      if (!context) return
      
      // Get node dimensions
      const rect = node.getClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      
      // Draw node to canvas
      node.toCanvas({
        callback: (nodeCanvas) => {
          context.drawImage(nodeCanvas, 0, 0)
          this.originalImageData = context.getImageData(0, 0, canvas.width, canvas.height)
        }
      })
    } catch (error) {
      console.error('Failed to store original state:', error)
    }
  }
  
  /**
   * Apply preview mode visualization
   */
  private applyPreviewMode(node: KonvaNode): void {
    if (!this.previewMode || !this.originalImageData) return
    
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
   * Apply split screen preview
   */
  private applySplitPreview(node: KonvaNode): void {
    // Implementation would use clipping to show half original, half filtered
    console.log('Split preview mode applied')
  }
  
  /**
   * Apply side-by-side preview
   */
  private applySideBySidePreview(node: KonvaNode): void {
    // Implementation would duplicate the node and show both versions
    console.log('Side-by-side preview mode applied')
  }
  
  /**
   * Apply onion skin preview (transparent overlay)
   */
  private applyOnionSkinPreview(node: KonvaNode): void {
    node.opacity(this.previewOpacity)
  }
  
  /**
   * Apply difference preview
   */
  private applyDifferencePreview(node: KonvaNode): void {
    // Implementation would use blend modes to show differences
    console.log('Difference preview mode applied')
  }
  
  /**
   * Get default parameters for a filter
   */
  private getDefaultFilterParams(filterName: string): Record<string, any> {
    const defaults: Record<string, Record<string, any>> = {
      Blur: { blurRadius: 10 },
      Brighten: { brightness: 0 },
      Contrast: { contrast: 0 },
      Emboss: { embossStrength: 0.5, embossWhiteLevel: 0.5, embossDirection: 'top-left' },
      Enhance: { enhance: 0.4 },
      Grayscale: {},
      HSL: { hue: 0, saturation: 0, luminance: 0 },
      HSV: { hue: 0, saturation: 0, value: 0 },
      Invert: {},
      Mask: { threshold: 128 },
      Noise: { noise: 0.3 },
      Pixelate: { pixelSize: 5 },
      Posterize: { levels: 5 },
      RGB: { red: 100, green: 100, blue: 100 },
      RGBA: { red: 100, green: 100, blue: 100, alpha: 255 },
      Sepia: {},
      Solarize: {},
      Threshold: { threshold: 128 },
      // Custom filters
      Curves: { points: [] },
      Levels: { shadows: 0, midtones: 1, highlights: 255 },
      SelectiveColor: { hueRange: 30, targetHue: 0, replacement: { h: 0, s: 0, l: 0 } },
      ChromaticAberration: { redOffset: 0, greenOffset: 0, blueOffset: 0 },
      Sharpening: { amount: 0.5, radius: 1, threshold: 0 }
    }
    
    return defaults[filterName] || {}
  }
  
  /**
   * Save current filter chain as preset
   */
  saveAsPreset(name: string, description?: string, category?: string): FilterPreset {
    return this.filterChain.saveAsPreset(name, description, category)
  }
  
  /**
   * Load a filter preset
   */
  loadPreset(preset: FilterPreset): void {
    this.filterChain.loadPreset(preset)
  }
  
  /**
   * Get all saved presets
   */
  async getPresets(category?: string): Promise<FilterPreset[]> {
    return this.filterChain.getPresets(category)
  }
  
  /**
   * Delete a preset
   */
  async deletePreset(presetId: string): Promise<boolean> {
    return this.filterChain.deletePreset(presetId)
  }
  
  /**
   * Undo last action
   */
  undo(): boolean {
    return this.filterChain.undo()
  }
  
  /**
   * Redo last undone action
   */
  redo(): boolean {
    return this.filterChain.redo()
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    const info = this.filterChain.getInfo()
    return info.historySize > 1
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    // This would need to be exposed from FilterChain
    return false // Placeholder
  }
  
  /**
   * Clear all filters
   */
  clear(): void {
    this.filterChain.clear()
    this.originalImageData = undefined
    
    // Clear node filters if exists
    if (this.targetNode) {
      this.targetNode.filters([])
      this.targetNode.clearCache()
    }
  }
  
  /**
   * Get filter by ID
   */
  getFilter(filterId: string): FilterConfig | undefined {
    return this.filterChain.getFilter(filterId)
  }
  
  /**
   * Get all filters
   */
  getAllFilters(): FilterConfig[] {
    return this.filterChain.getAllFilters()
  }
  
  /**
   * Export current state
   */
  exportState(): FilterChainState {
    return this.filterChain.exportState()
  }
  
  /**
   * Load state from export
   */
  loadState(state: FilterChainState): void {
    this.filterChain.loadState(state)
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clear()
    this.targetNode = undefined
    this.originalImageData = undefined
  }
  
  /**
   * Get available filter names
   */
  static getAvailableFilters(): string[] {
    return [
      // Built-in Konva filters
      'Blur',
      'Brighten',
      'Contrast',
      'Emboss',
      'Enhance',
      'Grayscale',
      'HSL',
      'HSV',
      'Invert',
      'Mask',
      'Noise',
      'Pixelate',
      'Posterize',
      'RGB',
      'RGBA',
      'Sepia',
      'Solarize',
      'Threshold',
      // Custom filters
      'Curves',
      'Levels',
      'SelectiveColor',
      'ChromaticAberration',
      'Sharpening'
    ]
  }
}
