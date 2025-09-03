/**
 * Native Konva Filter Extensions for InfiniFox
 * Professional image editing filters built on Konva's filter architecture
 * 
 * These filters are designed to provide professional-grade image editing
 * capabilities while maintaining high performance through optimized algorithms
 * and lookup tables.
 */

// Import all custom filters
import './Curves';
import './Levels';
import './SelectiveColor';
import './ChromaticAberration';
import './Sharpening';

// Import filter pipeline system (Phase 2.2)
export * from '../FilterChain';
export * from '../AdjustmentLayer';

// Re-export types and presets for easy access
export { CurveChannel, CurvePresets } from './Curves';
export { LevelsAdjustment, LevelsHelpers, LevelsPresets, calculateHistogram } from './Levels';
export { SelectiveColorAdjustment, ColorRange, ColorAdjustment, SelectiveColorPresets } from './SelectiveColor';
export { ChromaticAberrationConfig, ChromaticAberrationPresets } from './ChromaticAberration';
export { SharpeningConfig, SharpeningPresets } from './Sharpening';

// Export filter names for reference
export const CustomFilters = {
  Curves: 'Curves',
  Levels: 'Levels',
  SelectiveColor: 'SelectiveColor',
  ChromaticAberration: 'ChromaticAberration',
  Sharpening: 'Sharpening'
} as const;

// Export a helper to check if custom filters are loaded
export const areCustomFiltersLoaded = (): boolean => {
  try {
    const Konva = require('konva');
    return !!(
      Konva.Filters.Curves &&
      Konva.Filters.Levels &&
      Konva.Filters.SelectiveColor &&
      Konva.Filters.ChromaticAberration &&
      Konva.Filters.Sharpening
    );
  } catch {
    return false;
  }
};

/**
 * Initialize all custom filters
 * Call this once when the app starts to ensure all filters are registered
 */
export const initializeCustomFilters = (): void => {
  // Filters are automatically registered when imported
  // This function serves as a explicit initialization point
  if (!areCustomFiltersLoaded()) {
    console.error('Custom filters failed to load properly');
  } else {
    console.log('InfiniFox custom filters initialized successfully');
  }
};

// Export filter combinations for common effects
export const FilterCombinations = {
  /**
   * Professional portrait enhancement
   */
  portraitEnhancement: () => [
    { 
      filter: 'Levels',
      config: LevelsPresets.brightenShadows()
    },
    {
      filter: 'SelectiveColor',
      config: SelectiveColorPresets.enhanceSkinTones()
    },
    {
      filter: 'Sharpening',
      config: SharpeningPresets.subtle()
    }
  ],
  
  /**
   * Landscape enhancement
   */
  landscapeEnhancement: () => [
    {
      filter: 'Levels',
      config: LevelsPresets.increaseContrast()
    },
    {
      filter: 'SelectiveColor',
      config: SelectiveColorPresets.vibrantLandscape()
    },
    {
      filter: 'Sharpening',
      config: SharpeningPresets.standard()
    }
  ],
  
  /**
   * Vintage film look
   */
  vintageFilm: () => [
    {
      filter: 'Curves',
      config: CurvePresets.film()
    },
    {
      filter: 'Levels',
      config: LevelsPresets.fade()
    },
    {
      filter: 'ChromaticAberration',
      config: ChromaticAberrationPresets.vintageLens()
    }
  ],
  
  /**
   * High contrast black and white
   */
  highContrastBW: () => [
    {
      filter: 'Grayscale', // Built-in Konva filter
      config: {}
    },
    {
      filter: 'Curves',
      config: CurvePresets.contrast()
    },
    {
      filter: 'Sharpening',
      config: SharpeningPresets.edgesOnly()
    }
  ],
  
  /**
   * Cinematic look
   */
  cinematic: () => [
    {
      filter: 'Curves',
      config: CurvePresets.crossProcess()
    },
    {
      filter: 'ChromaticAberration',
      config: ChromaticAberrationPresets.anamorphic()
    },
    {
      filter: 'Levels',
      config: LevelsPresets.darkenHighlights()
    }
  ]
};

// Export performance utilities
export const FilterPerformance = {
  /**
   * Estimate processing time for a filter based on image size
   */
  estimateProcessingTime: (
    filterName: string,
    imageWidth: number,
    imageHeight: number
  ): number => {
    const pixelCount = imageWidth * imageHeight;
    const megapixels = pixelCount / 1000000;
    
    // Rough estimates based on filter complexity (ms per megapixel)
    const filterComplexity: { [key: string]: number } = {
      Curves: 15,
      Levels: 10,
      SelectiveColor: 25,
      ChromaticAberration: 30,
      Sharpening: 20
    };
    
    const complexity = filterComplexity[filterName] || 20;
    return Math.round(megapixels * complexity);
  },
  
  /**
   * Check if an image is too large for real-time filtering
   */
  needsProgressiveRendering: (
    imageWidth: number,
    imageHeight: number
  ): boolean => {
    const pixelCount = imageWidth * imageHeight;
    // Images over 4 megapixels should use progressive rendering
    return pixelCount > 4000000;
  }
};
