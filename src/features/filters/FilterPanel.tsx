/**
 * FilterPanel.tsx - Professional Image Editing Filter Panel
 * Phase 2.3 of the Professional Image Editing Integration Plan
 * 
 * Main filter panel component with glass morphism design
 * Provides real-time filter adjustments with non-destructive editing
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'preact/hooks'
import { useStore } from '../../store/store'
import Konva from 'konva'
import type { Node as KonvaNode, Image as KonvaImage } from 'konva/lib/Node'

import { FilterChain, DefaultFilterPresets } from '../../services/filters/FilterChain'
import type { FilterConfig, FilterPreset } from '../../services/filters/FilterChain'
import { FilterManager } from './FilterManager'
import { 
  FilterList, 
  FilterControls, 
  PreviewModeSelector, 
  FilterPresets, 
  FilterHistory,
  FilterApply 
} from './components'

import './FilterPanel.css'

interface FilterPanelProps {
  canvasRef?: any // RefObject<Konva.Stage>
  selectedNode?: KonvaNode
  onFilterApply?: (filters: FilterConfig[]) => void
  isFloating?: boolean
  position?: { x: number; y: number }
  onClose?: () => void
}

export function FilterPanel({
  canvasRef,
  selectedNode,
  onFilterApply,
  isFloating = false,
  position = { x: 100, y: 100 },
  onClose
}: FilterPanelProps) {
  // State management
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([])
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'split' | 'side-by-side' | 'onion-skin' | 'difference' | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [panelPosition, setPanelPosition] = useState(position)
  
  // Refs
  const panelRef = useRef<HTMLDivElement>(null)
  const filterManagerRef = useRef<FilterManager | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  
  // Initialize FilterManager
  useEffect(() => {
    if (!filterManagerRef.current) {
      filterManagerRef.current = new FilterManager()
    }
    
    // Load saved filters from localStorage
    const savedFilters = localStorage.getItem('infinifox-active-filters')
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters)
        setActiveFilters(filters)
        filters.forEach((filter: FilterConfig) => {
          filterManagerRef.current?.addFilter(filter.name, filter.params)
        })
      } catch (error) {
        console.error('Failed to load saved filters:', error)
      }
    }
    
    return () => {
      // Cleanup
      filterManagerRef.current?.cleanup()
    }
  }, [])
  
  // Apply filters to selected node with throttling
  const applyFiltersToNode = useCallback(async (preview = true) => {
    if (!selectedNode || !filterManagerRef.current) return
    
    try {
      await filterManagerRef.current.applyToNode(selectedNode, preview)
      
      // Force canvas redraw
      const stage = canvasRef?.current
      if (stage) {
        stage.batchDraw()
      }
    } catch (error) {
      console.error('Failed to apply filters:', error)
    }
  }, [selectedNode, canvasRef])
  
  // Throttle preview updates for performance (60fps)
  const throttledPreview = useMemo(() => {
    let timeoutId: number | null = null
    return (callback: () => void, delay = 16) => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(callback, delay) as any
    }
  }, [])
  
  // Handle filter addition
  const handleAddFilter = useCallback((filterName: string) => {
    if (!filterManagerRef.current) return
    
    const filterId = filterManagerRef.current.addFilter(filterName)
    const newFilter = filterManagerRef.current.getFilter(filterId)
    
    if (newFilter) {
      setActiveFilters(prev => [...prev, newFilter])
      setSelectedFilterId(filterId)
      
      // Save to localStorage
      const updatedFilters = [...activeFilters, newFilter]
      localStorage.setItem('infinifox-active-filters', JSON.stringify(updatedFilters))
      
      // Apply with preview
      throttledPreview(() => applyFiltersToNode(true), 100)
    }
  }, [activeFilters, applyFiltersToNode, throttledPreview])
  
  // Handle filter update
  const handleUpdateFilter = useCallback((filterId: string, params: any) => {
    if (!filterManagerRef.current) return
    
    filterManagerRef.current.updateFilter(filterId, params)
    
    setActiveFilters(prev => prev.map(filter => 
      filter.id === filterId ? { ...filter, ...params } : filter
    ))
    
    // Throttled preview update
    throttledPreview(() => applyFiltersToNode(true))
  }, [applyFiltersToNode, throttledPreview])
  
  // Handle filter removal
  const handleRemoveFilter = useCallback((filterId: string) => {
    if (!filterManagerRef.current) return
    
    filterManagerRef.current.removeFilter(filterId)
    setActiveFilters(prev => prev.filter(f => f.id !== filterId))
    
    // Update localStorage
    const updatedFilters = activeFilters.filter(f => f.id !== filterId)
    localStorage.setItem('infinifox-active-filters', JSON.stringify(updatedFilters))
    
    // Clear selection if removed filter was selected
    if (selectedFilterId === filterId) {
      setSelectedFilterId(null)
    }
    
    // Update preview
    throttledPreview(() => applyFiltersToNode(true))
  }, [activeFilters, selectedFilterId, applyFiltersToNode, throttledPreview])
  
  // Handle filter toggle
  const handleToggleFilter = useCallback((filterId: string) => {
    if (!filterManagerRef.current) return
    
    filterManagerRef.current.toggleFilter(filterId)
    
    setActiveFilters(prev => prev.map(filter => 
      filter.id === filterId ? { ...filter, enabled: !filter.enabled } : filter
    ))
    
    // Update preview
    throttledPreview(() => applyFiltersToNode(true))
  }, [applyFiltersToNode, throttledPreview])
  
  // Handle filter reorder
  const handleReorderFilter = useCallback((filterId: string, newOrder: number) => {
    if (!filterManagerRef.current) return
    
    filterManagerRef.current.reorderFilter(filterId, newOrder)
    
    // Update local state to reflect new order
    const updatedFilters = filterManagerRef.current.getAllFilters()
    setActiveFilters(updatedFilters)
    
    // Update preview
    throttledPreview(() => applyFiltersToNode(true))
  }, [applyFiltersToNode, throttledPreview])
  
  // Handle preset selection
  const handlePresetSelect = useCallback((preset: FilterPreset) => {
    if (!filterManagerRef.current) return
    
    // Clear existing filters
    filterManagerRef.current.clear()
    
    // Load preset
    filterManagerRef.current.loadPreset(preset)
    
    // Update state
    const newFilters = filterManagerRef.current.getAllFilters()
    setActiveFilters(newFilters)
    
    // Apply preview
    throttledPreview(() => applyFiltersToNode(true))
  }, [applyFiltersToNode, throttledPreview])
  
  // Handle preview mode change
  const handlePreviewModeChange = useCallback((mode: typeof previewMode) => {
    setPreviewMode(mode)
    if (filterManagerRef.current) {
      filterManagerRef.current.setPreviewMode(mode)
      applyFiltersToNode(true)
    }
  }, [applyFiltersToNode])
  
  // Handle final apply
  const handleApply = useCallback(async () => {
    setIsApplying(true)
    
    try {
      await applyFiltersToNode(false) // Apply without preview mode
      
      // Notify parent component
      onFilterApply?.(activeFilters)
      
      // Clear the filter manager for next use
      filterManagerRef.current?.clear()
      setActiveFilters([])
      
      // Close panel if requested
      onClose?.()
    } catch (error) {
      console.error('Failed to apply filters:', error)
    } finally {
      setIsApplying(false)
    }
  }, [activeFilters, applyFiltersToNode, onFilterApply, onClose])
  
  // Handle cancel
  const handleCancel = useCallback(() => {
    // Clear any preview
    if (selectedNode && selectedNode.filters()) {
      selectedNode.filters([])
      selectedNode.clearCache()
      
      // Force redraw
      const stage = canvasRef?.current
      if (stage) {
        stage.batchDraw()
      }
    }
    
    // Clear filters
    filterManagerRef.current?.clear()
    setActiveFilters([])
    
    // Close panel
    onClose?.()
  }, [selectedNode, canvasRef, onClose])
  
  // Handle undo/redo
  const handleUndo = useCallback(() => {
    if (filterManagerRef.current?.undo()) {
      setActiveFilters(filterManagerRef.current.getAllFilters())
      throttledPreview(() => applyFiltersToNode(true))
    }
  }, [applyFiltersToNode, throttledPreview])
  
  const handleRedo = useCallback(() => {
    if (filterManagerRef.current?.redo()) {
      setActiveFilters(filterManagerRef.current.getAllFilters())
      throttledPreview(() => applyFiltersToNode(true))
    }
  }, [applyFiltersToNode, throttledPreview])
  
  // Draggable panel logic (for floating mode)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!isFloating) return
    
    const target = e.target as HTMLElement
    if (!target.classList.contains('filter-panel-header')) return
    
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - panelPosition.x,
      y: e.clientY - panelPosition.y
    }
  }, [isFloating, panelPosition])
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    setPanelPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    })
  }, [isDragging])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // Add event listeners for dragging
  useEffect(() => {
    if (isFloating) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isFloating, handleMouseMove, handleMouseUp])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
      // Escape: Close panel
      else if (e.key === 'Escape' && isFloating) {
        handleCancel()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleCancel, isFloating])
  
  const selectedFilter = activeFilters.find(f => f.id === selectedFilterId)
  
  return (
    <div 
      ref={panelRef}
      class={`filter-panel ${isFloating ? 'floating' : ''} ${isDragging ? 'dragging' : ''}`}
      style={isFloating ? {
        position: 'fixed',
        left: `${panelPosition.x}px`,
        top: `${panelPosition.y}px`,
        zIndex: 1000
      } : undefined}
    >
      <div class="filter-panel-header" onMouseDown={handleMouseDown as any}>
        <h3>🎨 Filters & Adjustments</h3>
        {isFloating && (
          <button class="close-btn" onClick={handleCancel} aria-label="Close filter panel">
            ✕
          </button>
        )}
      </div>
      
      <div class="filter-panel-content">
        {/* Preview Mode Selector */}
        <PreviewModeSelector 
          mode={previewMode}
          onChange={handlePreviewModeChange}
        />
        
        {/* Filter List */}
        <FilterList
          filters={activeFilters}
          selectedFilterId={selectedFilterId}
          onSelectFilter={setSelectedFilterId}
          onToggleFilter={handleToggleFilter}
          onRemoveFilter={handleRemoveFilter}
          onReorderFilter={handleReorderFilter}
          onAddFilter={handleAddFilter}
        />
        
        {/* Filter Controls */}
        {selectedFilter && (
          <FilterControls
            filter={selectedFilter}
            onUpdate={(params) => handleUpdateFilter(selectedFilter.id, params)}
          />
        )}
        
        {/* Filter Presets */}
        <FilterPresets
          presets={DefaultFilterPresets}
          onSelectPreset={handlePresetSelect}
          onSavePreset={(name, description) => {
            if (filterManagerRef.current) {
              const preset = filterManagerRef.current.saveAsPreset(name, description)
              console.log('Saved preset:', preset)
            }
          }}
        />
        
        {/* History Controls */}
        <FilterHistory
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={!!filterManagerRef.current?.canUndo()}
          canRedo={!!filterManagerRef.current?.canRedo()}
        />
        
        {/* Apply/Cancel Buttons */}
        <FilterApply
          onApply={handleApply}
          onCancel={handleCancel}
          isApplying={isApplying}
          hasFilters={activeFilters.length > 0}
        />
      </div>
    </div>
  )
}
