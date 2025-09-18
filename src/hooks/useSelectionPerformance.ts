/**
 * Performance optimization hook for multi-selection operations
 * Provides optimized handlers and memoized values for selection state
 */

import { useCallback, useMemo, useRef, useEffect } from 'react'

import { useStore } from '../store/store'
import type { ImageData } from '../store/types'

interface SelectionPerformanceMetrics {
  lastOperationTime: number
  averageOperationTime: number
  peakMemoryUsage: number
  renderCount: number
}

interface UseSelectionPerformanceOptions {
  /** Maximum items before switching to virtualization */
  virtualizationThreshold?: number
  /** Debounce delay for selection box updates */
  selectionBoxDebounce?: number
  /** Enable performance monitoring */
  enableMetrics?: boolean
  /** Batch size for operations */
  batchSize?: number
}

export function useSelectionPerformance(options: UseSelectionPerformanceOptions = {}) {
  const {
    virtualizationThreshold = 100,
    // selectionBoxDebounce = 16,
    batchSize = 50,
    enableMetrics = false,
  } = options

  // Store subscriptions with specific selectors for performance
  const selectedIds = useStore((state) => state.selectedIds)
  const images = useStore((state) => state.images)
  // const selectionBox = useStore((state) => state.selectionBox)

  // Store actions
  const {
    selectItem,
    deselectItem,
    selectItems,
    deselectAll,
    batchUpdatePositions,
    // batchUpdateTransforms,
  } = useStore()

  // Performance metrics tracking
  const metricsRef = useRef<SelectionPerformanceMetrics>({
    lastOperationTime: 0,
    averageOperationTime: 0,
    peakMemoryUsage: 0,
    renderCount: 0,
  })

  const operationTimesRef = useRef<number[]>([])
  const renderCountRef = useRef(0)

  // Track render count
  useEffect(() => {
    if (enableMetrics) {
      renderCountRef.current++
      metricsRef.current.renderCount = renderCountRef.current
    }
  })

  /**
   * Measure operation performance
   */
  const measureOperation = useCallback(
    <T extends unknown[], R>(operation: (...args: T) => R) => {
      if (!enableMetrics) return operation

      return (...args: T): R => {
        const startTime = performance.now()
        const startMemory =
          (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize || 0

        const result = operation(...args)

        const endTime = performance.now()
        const endMemory =
          (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize || 0
        const operationTime = endTime - startTime
        const memoryUsed = endMemory - startMemory

        // Update metrics
        operationTimesRef.current.push(operationTime)
        if (operationTimesRef.current.length > 100) {
          operationTimesRef.current.shift()
        }

        metricsRef.current.lastOperationTime = operationTime
        metricsRef.current.averageOperationTime =
          operationTimesRef.current.reduce((a, b) => a + b, 0) / operationTimesRef.current.length
        metricsRef.current.peakMemoryUsage = Math.max(
          metricsRef.current.peakMemoryUsage,
          memoryUsed
        )

        return result
      }
    },
    [enableMetrics]
  )

  /**
   * Memoized selected images for efficient access
   */
  const selectedImages = useMemo(() => {
    const selected: ImageData[] = []
    for (const id of selectedIds) {
      const image = images.find((img) => img.id === id)
      if (image) selected.push(image)
    }
    return selected
  }, [selectedIds, images])

  /**
   * Memoized selection bounds calculation
   */
  const selectionBounds = useMemo(() => {
    if (selectedImages.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const image of selectedImages) {
      minX = Math.min(minX, image.x)
      minY = Math.min(minY, image.y)
      maxX = Math.max(maxX, image.x + image.width * (image.scaleX || 1))
      maxY = Math.max(maxY, image.y + image.height * (image.scaleY || 1))
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }, [selectedImages])

  /**
   * Check if virtualization should be enabled
   */
  const shouldVirtualize = useMemo(() => {
    return selectedIds.size > virtualizationThreshold
  }, [selectedIds.size, virtualizationThreshold])

  /**
   * Optimized batch selection with chunking
   */
  const selectItemsBatched = useCallback(
    (itemIds: string[]) =>
      measureOperation((itemIds: string[]) => {
        if (itemIds.length <= batchSize) {
          selectItems(itemIds)
          return
        }

        // Process in batches to avoid blocking
        const chunks: string[][] = []
        for (let i = 0; i < itemIds.length; i += batchSize) {
          chunks.push(itemIds.slice(i, i + batchSize))
        }

        let currentChunk = 0
        const processNextChunk = () => {
          if (currentChunk < chunks.length) {
            selectItems(chunks[currentChunk])
            currentChunk++
            requestAnimationFrame(processNextChunk)
          }
        }

        processNextChunk()
      })(itemIds),
    [selectItems, batchSize, measureOperation]
  )

  /**
   * Optimized batch position update
   */
  const updatePositionsBatched = useCallback(
    (updates: Array<{ id: string; x: number; y: number }>) =>
      measureOperation((updates: Array<{ id: string; x: number; y: number }>) => {
        if (updates.length <= batchSize) {
          batchUpdatePositions(updates)
          return
        }

        // Process in chunks
        const chunks: (typeof updates)[] = []
        for (let i = 0; i < updates.length; i += batchSize) {
          chunks.push(updates.slice(i, i + batchSize))
        }

        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            batchUpdatePositions(chunk)
          }, index * 0) // Use 0 delay to yield to event loop
        })
      })(updates),
    [batchUpdatePositions, batchSize, measureOperation]
  )

  /**
   * Debounced selection box update
   */
  const updateSelectionBoxDebounced = useMemo(() => {
    let timeoutId: number | null = null

    return (x: number, y: number) => {
      if (timeoutId) {
        cancelAnimationFrame(timeoutId)
      }

      timeoutId = requestAnimationFrame(() => {
        useStore.getState().updateSelectionBox(x, y)
      })
    }
  }, [])

  /**
   * Optimized selection toggle
   */
  const toggleSelectionOptimized = useCallback(
    (id: string) =>
      measureOperation((id: string) => {
        if (selectedIds.has(id)) {
          deselectItem(id)
        } else {
          selectItem(id)
        }
      })(id),
    [selectedIds, selectItem, deselectItem, measureOperation]
  )

  /**
   * Clear selection with cleanup
   */
  const clearSelectionOptimized = useCallback(
    () =>
      measureOperation(() => {
        // Clear in batches if many items selected
        if (selectedIds.size > batchSize) {
          const ids = Array.from(selectedIds)
          const chunks: string[][] = []

          for (let i = 0; i < ids.length; i += batchSize) {
            chunks.push(ids.slice(i, i + batchSize))
          }

          chunks.forEach((chunk, index) => {
            setTimeout(() => {
              chunk.forEach((id) => deselectItem(id))
            }, index * 0)
          })
        } else {
          deselectAll()
        }
      })(),
    [selectedIds, deselectAll, deselectItem, batchSize, measureOperation]
  )

  /**
   * Get performance metrics
   */
  const getMetrics = useCallback((): SelectionPerformanceMetrics => {
    return { ...metricsRef.current }
  }, [])

  /**
   * Reset performance metrics
   */
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      lastOperationTime: 0,
      averageOperationTime: 0,
      peakMemoryUsage: 0,
      renderCount: 0,
    }
    operationTimesRef.current = []
    renderCountRef.current = 0
  }, [])

  return {
    // Optimized data
    selectedImages,
    selectionBounds,
    shouldVirtualize,

    // Optimized operations
    selectItemsBatched,
    updatePositionsBatched,
    updateSelectionBoxDebounced,
    toggleSelectionOptimized,
    clearSelectionOptimized,

    // Metrics
    metrics: enableMetrics ? metricsRef.current : undefined,
    getMetrics,
    resetMetrics,
  }
}

/**
 * Hook for memoizing selection callbacks
 */
export function useSelectionCallbacks() {
  const { selectItem, deselectItem, toggleSelection, selectRange, selectAll, deselectAll } =
    useStore()

  // Memoize all selection callbacks
  const handleSelectItem = useCallback(
    (id: string, mode?: 'none' | 'shift' | 'ctrl') => {
      selectItem(id, mode)
    },
    [selectItem]
  )

  const handleDeselectItem = useCallback(
    (id: string) => {
      deselectItem(id)
    },
    [deselectItem]
  )

  const handleToggleSelection = useCallback(
    (id: string) => {
      toggleSelection(id)
    },
    [toggleSelection]
  )

  const handleSelectRange = useCallback(
    (fromId: string, toId: string) => {
      selectRange(fromId, toId)
    },
    [selectRange]
  )

  const handleSelectAll = useCallback(() => {
    selectAll()
  }, [selectAll])

  const handleDeselectAll = useCallback(() => {
    deselectAll()
  }, [deselectAll])

  return {
    handleSelectItem,
    handleDeselectItem,
    handleToggleSelection,
    handleSelectRange,
    handleSelectAll,
    handleDeselectAll,
  }
}
