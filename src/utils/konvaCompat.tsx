// React-Konva React 18 Compatibility Fix
// Patches missing React internals that react-konva expects

import React from 'react'

// Apply React 18 compatibility patches
if (typeof window !== 'undefined' && React) {
  const internals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
  
  if (internals) {
    // Add missing ReactCurrentBatchConfig
    if (!internals.ReactCurrentBatchConfig) {
      internals.ReactCurrentBatchConfig = { transition: null }
    }
    
    // Add missing isBatchingLegacy flag used by react-konva
    if (internals.isBatchingLegacy === undefined) {
      internals.isBatchingLegacy = false
    }
    
    // Ensure ReactCurrentDispatcher has required properties
    if (internals.ReactCurrentDispatcher) {
      const dispatcher = internals.ReactCurrentDispatcher
      if (dispatcher.current && !dispatcher.current.readContext) {
        dispatcher.current.readContext = () => null
      }
    }
  }
}

// Now we can safely import and re-export from react-konva
export {
  Stage,
  Layer,
  FastLayer,
  Group,
  Label,
  Rect,
  Circle,
  Ellipse,
  Wedge,
  Line,
  Sprite,
  Image,
  Text,
  TextPath,
  Star,
  Ring,
  Arc,
  Tag,
  Path,
  RegularPolygon,
  Arrow,
  Shape,
  Transformer,
} from 'react-konva'

// Re-export types
export type { KonvaNodeEvents, KonvaNodeComponent, StageProps } from 'react-konva'
