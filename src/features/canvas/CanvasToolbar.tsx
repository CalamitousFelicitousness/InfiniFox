import React, { useState, useRef, useEffect } from 'react'

import {
  GridIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Magnet,
  Ruler,
  GripIcon,
  AlignHorizontalSpaceAroundIcon,
  AlignVerticalSpaceAroundIcon,
  AlignStartVerticalIcon,
  AlignEndVerticalIcon,
  AlignStartHorizontalIcon,
  AlignEndHorizontalIcon,
  AlignCenterHorizontalIcon,
  AlignCenterVerticalIcon,
  GroupIcon,
  UngroupIcon,
  Layers2Icon,
} from '../../components/icons'
import { snappingManager } from '../../services/canvas/SnappingManager'
import { useStore } from '../../store/store'

import './CanvasToolbar.css'

const SNAP_CONFIG_KEY = 'infinifox-snap-config'
const TOOLBAR_POSITION_KEY = 'infinifox-toolbar-position'

interface CanvasToolbarProps {
  className?: string
  onSnapConfigChange?: (config: {
    gridEnabled: boolean
    gridSize: number
    objectSnapEnabled: boolean
    snapThreshold: number
    showSnapGuides: boolean
  }) => void
}

export function CanvasToolbar({ className = '', onSnapConfigChange }: CanvasToolbarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [expandedPanel, setExpandedPanel] = useState<'snap' | 'align' | null>(null)

  // Store hooks
  const {
    selectedIds,
    images,
    batchUpdatePositions,
    createGroup,
    dissolveGroup,
    groups,
    // getItemGroup,
    selectItems,
  } = useStore()

  // Load saved position or use defaults
  const loadSavedPosition = () => {
    try {
      const saved = localStorage.getItem(TOOLBAR_POSITION_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load panel position:', err)
    }
    return { x: 420, y: 200 }
  }

  const [position, setPosition] = useState(loadSavedPosition())

  // Load saved config or use defaults
  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem(SNAP_CONFIG_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load snap config:', err)
    }
    return snappingManager.getConfig()
  }

  const [config, setConfig] = useState(loadSavedConfig())

  // Save config to localStorage and update snapping manager
  useEffect(() => {
    snappingManager.updateConfig(config)
    onSnapConfigChange?.(config)

    // Save to localStorage
    try {
      localStorage.setItem(SNAP_CONFIG_KEY, JSON.stringify(config))
    } catch (err) {
      console.error('Failed to save snap config:', err)
    }
  }, [config, onSnapConfigChange])

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.toolbar-grip')) return

    setIsDragging(true)
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
    e.preventDefault()
  }

  // Handle dragging with document-level events
  useEffect(() => {
    if (!isDragging) return

    const handlePointerMove = (e: PointerEvent) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 0)
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 0)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    }

    const handlePointerUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, dragOffset])

  // Save position after drag completes
  useEffect(() => {
    if (!isDragging) {
      try {
        localStorage.setItem(TOOLBAR_POSITION_KEY, JSON.stringify(position))
      } catch (err) {
        console.error('Failed to save panel position:', err)
      }
    }
  }, [isDragging, position])

  const togglePanel = (panel: 'snap' | 'align') => {
    setExpandedPanel(expandedPanel === panel ? null : panel)
  }

  // Alignment functions
  const getSelectedImages = () => {
    return images.filter((img) => selectedIds.has(img.id))
  }

  const alignLeft = () => {
    const selected = getSelectedImages()
    console.log('alignLeft - selected images:', selected)
    if (selected.length < 2) return

    const leftMost = Math.min(...selected.map((img) => img.x))
    const updates = selected.map((img) => ({
      id: img.id,
      x: leftMost,
      y: img.y,
    }))
    console.log('alignLeft - updates:', updates)
    console.log('batchUpdatePositions function:', batchUpdatePositions)
    console.log('typeof batchUpdatePositions:', typeof batchUpdatePositions)
    if (batchUpdatePositions) {
      batchUpdatePositions(updates)
    } else {
      console.error('batchUpdatePositions is not defined!')
    }
  }

  const alignRight = () => {
    const selected = getSelectedImages()
    if (selected.length < 2) return

    const rightMost = Math.max(
      ...selected.map((img) => img.x + (img.width || 512) * (img.scaleX || 1))
    )
    const updates = selected.map((img) => {
      const width = (img.width || 512) * (img.scaleX || 1)
      return {
        id: img.id,
        x: rightMost - width,
        y: img.y,
      }
    })
    batchUpdatePositions(updates)
  }

  const alignTop = () => {
    const selected = getSelectedImages()
    if (selected.length < 2) return

    const topMost = Math.min(...selected.map((img) => img.y))
    const updates = selected.map((img) => ({
      id: img.id,
      x: img.x,
      y: topMost,
    }))
    batchUpdatePositions(updates)
  }

  const alignBottom = () => {
    const selected = getSelectedImages()
    if (selected.length < 2) return

    const bottomMost = Math.max(
      ...selected.map((img) => img.y + (img.height || 512) * (img.scaleY || 1))
    )
    const updates = selected.map((img) => {
      const height = (img.height || 512) * (img.scaleY || 1)
      return {
        id: img.id,
        x: img.x,
        y: bottomMost - height,
      }
    })
    batchUpdatePositions(updates)
  }

  const alignCenterHorizontal = () => {
    const selected = getSelectedImages()
    if (selected.length < 2) return

    // Find the center Y position (horizontal line)
    const minY = Math.min(...selected.map((img) => img.y))
    const maxY = Math.max(
      ...selected.map((img) => {
        const height = (img.height || 512) * (img.scaleY || 1)
        return img.y + height
      })
    )
    const centerY = (minY + maxY) / 2

    const updates = selected.map((img) => {
      const height = (img.height || 512) * (img.scaleY || 1)
      return {
        id: img.id,
        x: img.x,
        y: centerY - height / 2,
      }
    })
    batchUpdatePositions(updates)
  }

  const alignCenterVertical = () => {
    const selected = getSelectedImages()
    if (selected.length < 2) return

    // Find the center X position (vertical line)
    const minX = Math.min(...selected.map((img) => img.x))
    const maxX = Math.max(
      ...selected.map((img) => {
        const width = (img.width || 512) * (img.scaleX || 1)
        return img.x + width
      })
    )
    const centerX = (minX + maxX) / 2

    const updates = selected.map((img) => {
      const width = (img.width || 512) * (img.scaleX || 1)
      return {
        id: img.id,
        x: centerX - width / 2,
        y: img.y,
      }
    })
    batchUpdatePositions(updates)
  }

  const distributeHorizontal = () => {
    const selected = getSelectedImages()
    if (selected.length < 3) return

    // Sort by x position
    const sorted = [...selected].sort((a, b) => a.x - b.x)

    const firstX = sorted[0].x
    const lastX = sorted[sorted.length - 1].x
    const totalWidth = lastX - firstX

    const spacing = totalWidth / (sorted.length - 1)

    const updates = sorted
      .map((img, index) => {
        if (index > 0 && index < sorted.length - 1) {
          return {
            id: img.id,
            x: firstX + spacing * index,
            y: img.y,
          }
        }
        return null
      })
      .filter(Boolean) as Array<{ id: string; x: number; y: number }>

    if (updates.length > 0) {
      batchUpdatePositions(updates)
    }
  }

  const distributeVertical = () => {
    const selected = getSelectedImages()
    if (selected.length < 3) return

    // Sort by y position
    const sorted = [...selected].sort((a, b) => a.y - b.y)

    const firstY = sorted[0].y
    const lastY = sorted[sorted.length - 1].y
    const totalHeight = lastY - firstY

    const spacing = totalHeight / (sorted.length - 1)

    const updates = sorted
      .map((img, index) => {
        if (index > 0 && index < sorted.length - 1) {
          return {
            id: img.id,
            x: img.x,
            y: firstY + spacing * index,
          }
        }
        return null
      })
      .filter(Boolean) as Array<{ id: string; x: number; y: number }>

    if (updates.length > 0) {
      batchUpdatePositions(updates)
    }
  }

  const toggleGridSnap = () => {
    setConfig((prev) => ({ ...prev, gridEnabled: !prev.gridEnabled }))
  }

  const toggleObjectSnap = () => {
    setConfig((prev) => ({ ...prev, objectSnapEnabled: !prev.objectSnapEnabled }))
  }

  const toggleSnapGuides = () => {
    setConfig((prev) => ({ ...prev, showSnapGuides: !prev.showSnapGuides }))
  }

  const updateGridSize = (size: number) => {
    setConfig((prev) => ({ ...prev, gridSize: size }))
  }

  const updateSnapThreshold = (threshold: number) => {
    setConfig((prev) => ({ ...prev, snapThreshold: threshold }))
  }

  // Remove unused variable since alignment button is always enabled
  // Individual functions check selection count internally

  const containerClasses = [
    'toolbar',
    'toolbar-horizontal',
    'toolbar-floating',
    'toolbar-draggable',
    'canvas-toolbar-container',
    isDragging && 'dragging',
    expandedPanel && 'expanded',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="toolbar-grip" title="Drag to move">
        <GripIcon className="lucide-icon" />
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={`toolbar-item ${expandedPanel === 'snap' ? 'active' : ''}`}
          onClick={() => togglePanel('snap')}
          title="Snap Settings"
          data-tooltip="Snap Settings"
        >
          <GridIcon />
          {expandedPanel === 'snap' ? (
            <ChevronUpIcon className="toolbar-chevron" />
          ) : (
            <ChevronDownIcon className="toolbar-chevron" />
          )}
        </button>

        <button
          className={`toolbar-item ${expandedPanel === 'align' ? 'active' : ''}`}
          onClick={() => togglePanel('align')}
          title="Alignment Tools"
          data-tooltip="Alignment Tools"
        >
          <Layers2Icon />
          {expandedPanel === 'align' ? (
            <ChevronUpIcon className="toolbar-chevron" />
          ) : (
            <ChevronDownIcon className="toolbar-chevron" />
          )}
        </button>
      </div>

      {expandedPanel === 'snap' && (
        <div className="toolbar-panel snap-panel">
          <div className="snap-features">
            <button
              className={`toolbar-item ${config.gridEnabled ? 'active' : ''}`}
              onClick={toggleGridSnap}
              title="Grid Snap"
            >
              <GridIcon />
              <span className="toolbar-item-label">Grid</span>
            </button>

            <button
              className={`toolbar-item ${config.objectSnapEnabled ? 'active' : ''}`}
              onClick={toggleObjectSnap}
              title="Object Snap"
            >
              <Magnet />
              <span className="toolbar-item-label">Objects</span>
            </button>

            <button
              className={`toolbar-item ${config.showSnapGuides ? 'active' : ''}`}
              onClick={toggleSnapGuides}
              title="Snap Guides"
            >
              <Ruler />
              <span className="toolbar-item-label">Guides</span>
            </button>
          </div>

          {(config.gridEnabled || config.objectSnapEnabled) && (
            <>
              <div className="toolbar-panel-separator" />
              <div className="toolbar-settings">
                {config.gridEnabled && (
                  <div className="toolbar-setting">
                    <label className="toolbar-label">Grid Size</label>
                    <select
                      value={config.gridSize}
                      onChange={(e) => updateGridSize(Number(e.target.value))}
                      className="toolbar-select"
                    >
                      <option value={25}>25px</option>
                      <option value={50}>50px</option>
                      <option value={100}>100px</option>
                      <option value={150}>150px</option>
                      <option value={200}>200px</option>
                    </select>
                  </div>
                )}

                {config.objectSnapEnabled && (
                  <div className="toolbar-setting">
                    <label className="toolbar-label">Snap Range</label>
                    <select
                      value={config.snapThreshold}
                      onChange={(e) => updateSnapThreshold(Number(e.target.value))}
                      className="toolbar-select"
                    >
                      <option value={15}>15px</option>
                      <option value={20}>20px</option>
                      <option value={30}>30px</option>
                      <option value={40}>40px</option>
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="toolbar-panel-separator" />

          <div className="toolbar-presets">
            <span className="toolbar-presets-label">Presets</span>
            <div className="toolbar-preset-buttons">
              <button
                className="toolbar-item toolbar-preset"
                onClick={() =>
                  setConfig({
                    gridEnabled: true,
                    gridSize: 50,
                    objectSnapEnabled: false,
                    snapThreshold: 20,
                    showSnapGuides: true,
                  })
                }
                title="Grid Only"
              >
                Grid
              </button>
              <button
                className="toolbar-item toolbar-preset"
                onClick={() =>
                  setConfig({
                    gridEnabled: false,
                    gridSize: 50,
                    objectSnapEnabled: true,
                    snapThreshold: 20,
                    showSnapGuides: true,
                  })
                }
                title="Smart Snap"
              >
                Smart
              </button>
              <button
                className="toolbar-item toolbar-preset"
                onClick={() =>
                  setConfig({
                    gridEnabled: true,
                    gridSize: 25,
                    objectSnapEnabled: true,
                    snapThreshold: 30,
                    showSnapGuides: true,
                  })
                }
                title="All Snapping"
              >
                All
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedPanel === 'align' && (
        <div className="toolbar-panel align-panel">
          <div className="align-section">
            <span className="toolbar-section-label">Align</span>
            <div className="align-buttons">
              <button
                className="toolbar-item align-button"
                onClick={alignLeft}
                title={selectedIds.size < 2 ? 'Select 2+ items to align' : 'Align Left'}
                disabled={selectedIds.size < 2}
              >
                <AlignStartVerticalIcon />
              </button>
              <button
                className="toolbar-item align-button"
                onClick={alignCenterHorizontal}
                title={
                  selectedIds.size < 2 ? 'Select 2+ items to align' : 'Align Center Horizontal'
                }
                disabled={selectedIds.size < 2}
              >
                <AlignCenterHorizontalIcon />
              </button>
              <button
                className="toolbar-item align-button"
                onClick={alignRight}
                title={selectedIds.size < 2 ? 'Select 2+ items to align' : 'Align Right'}
                disabled={selectedIds.size < 2}
              >
                <AlignEndVerticalIcon />
              </button>
              <div className="align-separator" />
              <button
                className="toolbar-item align-button"
                onClick={alignTop}
                title={selectedIds.size < 2 ? 'Select 2+ items to align' : 'Align Top'}
                disabled={selectedIds.size < 2}
              >
                <AlignStartHorizontalIcon />
              </button>
              <button
                className="toolbar-item align-button"
                onClick={alignCenterVertical}
                title={selectedIds.size < 2 ? 'Select 2+ items to align' : 'Align Center Vertical'}
                disabled={selectedIds.size < 2}
              >
                <AlignCenterVerticalIcon />
              </button>
              <button
                className="toolbar-item align-button"
                onClick={alignBottom}
                title={selectedIds.size < 2 ? 'Select 2+ items to align' : 'Align Bottom'}
                disabled={selectedIds.size < 2}
              >
                <AlignEndHorizontalIcon />
              </button>
            </div>
          </div>

          <div className="align-section">
            <span className="toolbar-section-label">Distribute</span>
            <div className="align-buttons">
              <button
                className="toolbar-item align-button"
                onClick={distributeHorizontal}
                title={
                  selectedIds.size < 3 ? 'Select 3+ items to distribute' : 'Distribute Horizontal'
                }
                disabled={selectedIds.size < 3}
              >
                <AlignHorizontalSpaceAroundIcon />
              </button>
              <button
                className="toolbar-item align-button"
                onClick={distributeVertical}
                title={
                  selectedIds.size < 3 ? 'Select 3+ items to distribute' : 'Distribute Vertical'
                }
                disabled={selectedIds.size < 3}
              >
                <AlignVerticalSpaceAroundIcon />
              </button>
            </div>
          </div>

          <div className="align-section">
            <span className="toolbar-section-label">Group</span>
            <div className="align-buttons">
              <button
                className="toolbar-item align-button"
                onClick={() => {
                  const selectedArray = Array.from(selectedIds)
                  console.log('Group button clicked, selected items:', selectedArray)
                  if (selectedArray.length >= 2) {
                    const groupId = createGroup(selectedArray, `Group ${groups.size + 1}`)
                    console.log('Created group:', groupId)
                  }
                }}
                title={selectedIds.size < 2 ? 'Select 2+ items to group' : 'Group Selection'}
                disabled={selectedIds.size < 2}
              >
                <GroupIcon />
                <span className="toolbar-item-label">Group</span>
              </button>
              <button
                className="toolbar-item align-button"
                onClick={() => {
                  // Find groups containing selected items
                  const groupsToDissolve = new Set<string>()
                  groups.forEach((group, groupId) => {
                    if (Array.from(selectedIds).some((id) => group.itemIds.has(id))) {
                      groupsToDissolve.add(groupId)
                    }
                  })

                  console.log('Dissolving groups:', Array.from(groupsToDissolve))
                  groupsToDissolve.forEach((groupId) => dissolveGroup(groupId))
                }}
                title={(() => {
                  const hasGroupedItems = Array.from(groups.values()).some((group) =>
                    Array.from(selectedIds).some((id) => group.itemIds.has(id))
                  )
                  return !hasGroupedItems ? 'No grouped items selected' : 'Ungroup Selection'
                })()}
                disabled={
                  !Array.from(groups.values()).some((group) =>
                    Array.from(selectedIds).some((id) => group.itemIds.has(id))
                  )
                }
              >
                <UngroupIcon />
                <span className="toolbar-item-label">Ungroup</span>
              </button>
            </div>
          </div>

          <div className="align-info">
            <span className="align-info-text">
              {selectedIds.size === 0
                ? 'No items selected'
                : selectedIds.size === 1
                  ? '1 item selected (select 2+ for alignment)'
                  : `${selectedIds.size} items selected`}
            </span>
          </div>

          {/* Groups List */}
          {groups.size > 0 && (
            <>
              <div className="toolbar-panel-separator" />
              <div className="align-section">
                <span className="toolbar-section-label">Existing Groups</span>
                <div className="groups-list">
                  {Array.from(groups.entries()).map(([groupId, group]) => {
                    const isSelected = Array.from(group.itemIds).every((id) => selectedIds.has(id))
                    return (
                      <button
                        key={groupId}
                        className={`group-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => selectItems(Array.from(group.itemIds))}
                        title={`Select all items in ${group.name}`}
                      >
                        <span className="group-name">{group.name}</span>
                        <span className="group-count">{group.itemIds.size} items</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
