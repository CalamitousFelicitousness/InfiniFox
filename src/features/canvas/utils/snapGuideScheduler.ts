import type { SnapGuide } from '../../../services/canvas/SnappingManager'

/**
 * Utility class to handle snap guide scheduling with RAF throttling
 */
export class SnapGuideScheduler {
  private rafRef: number | null = null
  private pendingSnapGuides: SnapGuide[] | null = null
  private onGuideChange: ((guides: SnapGuide[]) => void) | null = null

  constructor(onGuideChange?: (guides: SnapGuide[]) => void) {
    this.onGuideChange = onGuideChange || null
  }

  /**
   * Schedule snap guide update with minimal throttling
   */
  scheduleUpdate(guides: SnapGuide[]): void {
    this.pendingSnapGuides = guides

    // Update immediately for responsiveness
    if (this.onGuideChange) {
      this.onGuideChange(guides)
    }

    // Cancel previous RAF to prevent buildup
    if (this.rafRef !== null) {
      cancelAnimationFrame(this.rafRef)
      this.rafRef = null
    }
  }

  /**
   * Clear guides and cancel any pending updates
   */
  clear(): void {
    if (this.rafRef) {
      cancelAnimationFrame(this.rafRef)
      this.rafRef = null
    }
    this.pendingSnapGuides = null
    this.onGuideChange?.([])
  }

  /**
   * Update the guide change callback
   */
  setOnGuideChange(callback: (guides: SnapGuide[]) => void): void {
    this.onGuideChange = callback
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear()
    this.onGuideChange = null
  }
}

/**
 * Factory function to create a snap guide scheduler
 */
export function createSnapGuideScheduler(
  onGuideChange?: (guides: SnapGuide[]) => void
): SnapGuideScheduler {
  return new SnapGuideScheduler(onGuideChange)
}
