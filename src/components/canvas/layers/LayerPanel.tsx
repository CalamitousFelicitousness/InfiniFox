import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Folder,
  Image,
  Type,
  PenTool,
  Square,
  Layers,
  Trash2,
  Copy,
  FolderPlus,
  Brush,
} from 'lucide-react'
import React, { useCallback, useState, useRef } from 'react'

import type { LayerNode } from '../../../store/slices/layerSystemSlice'
import { useStore } from '../../../store/store'
import './LayerPanel.css'

interface LayerPanelProps {
  className?: string
  onLayerSelect?: (layerId: string) => void
  onLayerDoubleClick?: (layerId: string) => void
}

// Create context for LayerPanel state
const LayerPanelContext = React.createContext<{
  expandedLayers: Set<string>
  renamingLayerId: string | null
  draggedLayerId: string | null
  dropTargetId: string | null
  dropPosition: 'before' | 'after' | 'inside' | null
} | null>(null)

/**
 * Layer Panel component for managing the layer hierarchy
 * Provides a tree view of all layers with drag-drop reordering
 */
export const LayerPanel: React.FC<LayerPanelProps> = ({
  className,
  onLayerSelect,
  onLayerDoubleClick,
}) => {
  const {
    getRootLayers,
    selectedLayerIds,
    selectLayer,
    selectLayers,
    deselectAllLayers,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    groupLayers,
    addArtboard,
    addLayer,
    moveLayer,
    createNewDrawingLayer,
    activeArtboardId,
  } = useStore()

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set())
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null)
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null)

  const rootLayers = getRootLayers()
  const lastSelectionTimeRef = useRef<number>(0)

  // Toggle layer expansion
  const toggleExpanded = useCallback((layerId: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) {
        next.delete(layerId)
      } else {
        next.add(layerId)
      }
      return next
    })
  }, [])

  // Handle layer selection
  const handleSelect = useCallback(
    (layerId: string, e: React.MouseEvent) => {
      // Prevent event bubbling that could cause double selection
      e.stopPropagation()
      e.preventDefault()

      // Debounce rapid duplicate selections (browser quirk with shift+click)
      const now = Date.now()
      const timeDiff = now - lastSelectionTimeRef.current
      if (timeDiff < 50) {
        return
      }
      lastSelectionTimeRef.current = now

      if (e.ctrlKey || e.metaKey) {
        selectLayer(layerId, true, false, 'menu') // Add to selection
      } else if (e.shiftKey) {
        // Range selection - uses hierarchical order in menu
        selectLayer(layerId, e.ctrlKey || e.metaKey, true, 'menu')
      } else {
        selectLayer(layerId, false, false, 'menu') // Replace selection
      }
      onLayerSelect?.(layerId)
    },
    [selectLayer, onLayerSelect]
  )

  // Handle layer renaming
  const handleRename = useCallback(
    (layerId: string, newName: string) => {
      if (newName.trim()) {
        updateLayer(layerId, { name: newName })
      }
      setRenamingLayerId(null)
    },
    [updateLayer]
  )

  // Handle creating new layers
  const handleNewArtboard = useCallback(() => {
    const id = addArtboard({
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    })
    selectLayer(id, false, false, 'menu')
  }, [addArtboard, selectLayer])

  const handleNewGroup = useCallback(() => {
    if (selectedLayerIds.size > 0) {
      const groupId = groupLayers(Array.from(selectedLayerIds))
      selectLayer(groupId, false, false, 'menu')
    } else {
      const id = addLayer({
        type: 'group',
        name: 'New Group',
      })
      selectLayer(id, false, false, 'menu')
    }
  }, [selectedLayerIds, groupLayers, addLayer, selectLayer])

  const handleNewDrawingLayer = useCallback(() => {
    // Create drawing layer in the active artboard if there is one
    createNewDrawingLayer(activeArtboardId)
  }, [createNewDrawingLayer, activeArtboardId])

  const handleDelete = useCallback(() => {
    selectedLayerIds.forEach((id) => deleteLayer(id))
    deselectAllLayers()
  }, [selectedLayerIds, deleteLayer, deselectAllLayers])

  const handleDuplicate = useCallback(() => {
    const newIds: string[] = []
    selectedLayerIds.forEach((id) => {
      const newId = duplicateLayer(id)
      if (newId) newIds.push(newId)
    })
    selectLayers(newIds)
  }, [selectedLayerIds, duplicateLayer, selectLayers])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetId: string, position: 'before' | 'after' | 'inside') => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDropTargetId(targetId)
      setDropPosition(position)
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string, position: 'before' | 'after' | 'inside') => {
      e.preventDefault()

      if (!draggedLayerId || draggedLayerId === targetId) {
        return
      }

      // Perform the move based on position
      if (position === 'inside') {
        moveLayer(draggedLayerId, targetId)
      } else {
        // TODO: Implement before/after positioning
        moveLayer(draggedLayerId, targetId)
      }

      // Clear drag state
      setDraggedLayerId(null)
      setDropTargetId(null)
      setDropPosition(null)
    },
    [draggedLayerId, moveLayer]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedLayerId(null)
    setDropTargetId(null)
    setDropPosition(null)
  }, [])

  // Provide context for child components
  const contextValue = React.useMemo(
    () => ({
      expandedLayers,
      renamingLayerId,
      draggedLayerId,
      dropTargetId,
      dropPosition,
    }),
    [expandedLayers, renamingLayerId, draggedLayerId, dropTargetId, dropPosition]
  )

  return (
    <LayerPanelContext.Provider value={contextValue}>
      <div className={`layer-panel ${className || ''}`}>
        {/* Toolbar */}
        <div className="layer-panel-toolbar">
          <button className="layer-panel-tool" onClick={handleNewArtboard} title="New Artboard">
            <Square size={16} />
          </button>
          <button className="layer-panel-tool" onClick={handleNewGroup} title="New Group">
            <FolderPlus size={16} />
          </button>
          <button className="layer-panel-tool" onClick={handleNewDrawingLayer} title="New Drawing Layer">
            <Brush size={16} />
          </button>
          <button
            className="layer-panel-tool"
            onClick={handleDuplicate}
            disabled={selectedLayerIds.size === 0}
            title="Duplicate"
          >
            <Copy size={16} />
          </button>
          <button
            className="layer-panel-tool"
            onClick={handleDelete}
            disabled={selectedLayerIds.size === 0}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          {/* Selection count indicator */}
          {selectedLayerIds.size > 1 && (
            <div className="layer-panel-selection-count">{selectedLayerIds.size} selected</div>
          )}
        </div>

        {/* Layer tree */}
        <div className="layer-panel-tree">
          {rootLayers.length === 0 ? (
            <div className="layer-panel-empty">
              <Layers size={48} />
              <p>No layers</p>
              <button onClick={handleNewArtboard}>Create Artboard</button>
            </div>
          ) : (
            rootLayers.map((layer) => (
              <LayerTreeItem
                key={layer.id}
                layer={layer}
                depth={0}
                isSelected={selectedLayerIds.has(layer.id)}
                isExpanded={expandedLayers.has(layer.id)}
                isRenaming={renamingLayerId === layer.id}
                isDragging={draggedLayerId === layer.id}
                isDropTarget={dropTargetId === layer.id}
                dropPosition={dropTargetId === layer.id ? dropPosition : null}
                onSelect={handleSelect}
                onDoubleClick={onLayerDoubleClick}
                onToggleExpanded={toggleExpanded}
                onToggleVisibility={toggleLayerVisibility}
                onToggleLock={toggleLayerLock}
                onStartRename={setRenamingLayerId}
                onRename={handleRename}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </div>
      </div>
    </LayerPanelContext.Provider>
  )
}

/**
 * Individual layer tree item component
 */
interface LayerTreeItemProps {
  layer: LayerNode
  depth: number
  isSelected: boolean
  isExpanded: boolean
  isRenaming: boolean
  isDragging: boolean
  isDropTarget: boolean
  dropPosition: 'before' | 'after' | 'inside' | null
  onSelect: (layerId: string, e: React.MouseEvent) => void
  onDoubleClick?: (layerId: string) => void
  onToggleExpanded: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onToggleLock: (layerId: string) => void
  onStartRename: (layerId: string | null) => void
  onRename: (layerId: string, newName: string) => void
  onDragStart: (e: React.DragEvent, layerId: string) => void
  onDragOver: (
    e: React.DragEvent,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void
  onDrop: (e: React.DragEvent, targetId: string, position: 'before' | 'after' | 'inside') => void
  onDragEnd: () => void
}

const LayerTreeItem: React.FC<LayerTreeItemProps> = ({
  layer,
  depth,
  isSelected,
  isExpanded,
  isRenaming,
  isDragging,
  isDropTarget,
  dropPosition,
  onSelect,
  onDoubleClick,
  onToggleExpanded,
  onToggleVisibility,
  onToggleLock,
  onStartRename,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const { getLayerChildren } = useStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const children = getLayerChildren(layer.id)
  const hasChildren = children.length > 0

  // Focus input when renaming starts
  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  // Get layer icon based on type
  const getLayerIcon = () => {
    switch (layer.type) {
      case 'artboard':
        return <Square size={14} />
      case 'group':
        return <Folder size={14} />
      case 'image':
        return <Image size={14} />
      case 'text':
        return <Type size={14} />
      case 'shape':
        return <Square size={14} />
      case 'drawing':
        return <PenTool size={14} />
      default:
        return <Layers size={14} />
    }
  }

  // Handle drag over with position detection
  const handleDragOverWithPosition = useCallback(
    (e: React.DragEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const height = rect.height

      let position: 'before' | 'after' | 'inside' = 'inside'

      if (y < height * 0.25) {
        position = 'before'
      } else if (y > height * 0.75) {
        position = 'after'
      } else if (layer.type === 'group' || layer.type === 'artboard') {
        position = 'inside'
      }

      onDragOver(e, layer.id, position)
    },
    [layer.id, layer.type, onDragOver]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onRename(layer.id, e.currentTarget.value)
      } else if (e.key === 'Escape') {
        onStartRename(null)
      }
    },
    [layer.id, onRename, onStartRename]
  )

  const itemClasses = [
    'layer-tree-item',
    isSelected && 'selected',
    isDragging && 'dragging',
    isDropTarget && `drop-target-${dropPosition}`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div
        className={itemClasses}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        draggable={!isRenaming}
        onDragStart={(e) => onDragStart(e, layer.id)}
        onDragOver={handleDragOverWithPosition}
        onDrop={(e) => onDrop(e, layer.id, dropPosition!)}
        onDragEnd={onDragEnd}
        onClick={(e) => onSelect(layer.id, e)}
        onDoubleClick={(e) => {
          // Don't handle double-click when shift is held (range selection)
          if (e.shiftKey) return

          if (hasChildren) {
            onToggleExpanded(layer.id)
          } else {
            onStartRename(layer.id)
          }
          onDoubleClick?.(layer.id)
        }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren && (
          <button
            className="layer-tree-expand"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpanded(layer.id)
            }}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}

        {/* Layer icon */}
        <span className="layer-tree-icon">{getLayerIcon()}</span>

        {/* Layer name */}
        {isRenaming ? (
          <input
            ref={inputRef}
            className="layer-tree-rename"
            defaultValue={layer.name}
            onKeyDown={handleKeyDown}
            onBlur={(e) => onRename(layer.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="layer-tree-name">{layer.name}</span>
        )}

        {/* Action buttons */}
        <div className="layer-tree-actions">
          <button
            className="layer-tree-action"
            onClick={(e) => {
              e.stopPropagation()
              onToggleLock(layer.id)
            }}
            title={layer.locked ? 'Unlock' : 'Lock'}
          >
            {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>

          <button
            className="layer-tree-action"
            onClick={(e) => {
              e.stopPropagation()
              onToggleVisibility(layer.id)
            }}
            title={layer.visible ? 'Hide' : 'Show'}
          >
            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div className="layer-tree-children">
          {children.map((child) => (
            <ConnectedLayerTreeItem
              key={child.id}
              layer={child}
              depth={depth + 1}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              onToggleExpanded={onToggleExpanded}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onStartRename={onStartRename}
              onRename={onRename}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </>
  )
}

/**
 * Connected wrapper for LayerTreeItem that gets its own state from store
 */
interface ConnectedLayerTreeItemProps {
  layer: LayerNode
  depth: number
  onSelect: (layerId: string, e: React.MouseEvent) => void
  onDoubleClick?: (layerId: string) => void
  onToggleExpanded: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onToggleLock: (layerId: string) => void
  onStartRename: (layerId: string | null) => void
  onRename: (layerId: string, newName: string) => void
  onDragStart: (e: React.DragEvent, layerId: string) => void
  onDragOver: (
    e: React.DragEvent,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void
  onDrop: (e: React.DragEvent, targetId: string, position: 'before' | 'after' | 'inside') => void
  onDragEnd: () => void
}

const ConnectedLayerTreeItem: React.FC<ConnectedLayerTreeItemProps> = (props) => {
  const { selectedLayerIds } = useStore()

  // Get state from parent component context
  const layerPanel = React.useContext(LayerPanelContext)
  if (!layerPanel) {
    throw new Error('ConnectedLayerTreeItem must be used within LayerPanel')
  }

  const { expandedLayers, renamingLayerId, draggedLayerId, dropTargetId, dropPosition } = layerPanel

  return (
    <LayerTreeItem
      {...props}
      isSelected={selectedLayerIds.has(props.layer.id)}
      isExpanded={expandedLayers.has(props.layer.id)}
      isRenaming={renamingLayerId === props.layer.id}
      isDragging={draggedLayerId === props.layer.id}
      isDropTarget={dropTargetId === props.layer.id}
      dropPosition={dropTargetId === props.layer.id ? dropPosition : null}
    />
  )
}

export default LayerPanel
