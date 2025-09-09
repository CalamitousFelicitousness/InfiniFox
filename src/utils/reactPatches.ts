// Apply React 18 compatibility patches for react-konva
// This must run before any react-konva imports

import React from 'react'

const internals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED

if (internals) {
  // Add missing ReactCurrentBatchConfig
  if (!internals.ReactCurrentBatchConfig) {
    internals.ReactCurrentBatchConfig = { transition: null }
  }
  
  // Add missing isBatchingLegacy flag
  if (internals.isBatchingLegacy === undefined) {
    internals.isBatchingLegacy = false
  }
  
  // Ensure ReactCurrentDispatcher exists
  if (!internals.ReactCurrentDispatcher) {
    internals.ReactCurrentDispatcher = { current: null }
  }
}

export {}
