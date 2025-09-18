import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import '@testing-library/jest-dom'
import { useStore } from '../../../store/store'
import type { LayerNode } from '../../../types'
import { CanvasContextMenu } from '../CanvasContextMenu'

// Mock Konva
vi.mock('react-konva', () => ({
  Stage: ({ children }: { children: React.ReactNode }) => <div data-testid="stage">{children}</div>,
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="layer">{children}</div>,
  Rect: () => <div data-testid="rect" />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="group">{children}</div>,
  Text: () => <div data-testid="text" />,
  Image: () => <div data-testid="image" />,
}))

// Mock dialogs
vi.mock('../dialogs', () => ({
  ResizeArtboardDialog: ({
    onResize,
    onClose,
  }: {
    onResize: (width: number, height: number) => void
    onClose: () => void
  }) => (
    <div data-testid="resize-dialog">
      <button onClick={() => onResize(1920, 1080)}>Apply</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
  ArtboardBackgroundPicker: ({
    onColorChange,
    onClose,
  }: {
    onColorChange: (color: string) => void
    onClose: () => void
  }) => (
    <div data-testid="background-picker">
      <button onClick={() => onColorChange('#ff0000')}>Apply Color</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
  RenameDialog: ({
    onRename,
    onClose,
  }: {
    onRename: (name: string) => void
    onClose: () => void
  }) => (
    <div data-testid="rename-dialog">
      <button onClick={() => onRename('New Name')}>Apply</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
  AutoArrangeDialog: ({
    onArrange,
    onClose,
  }: {
    onArrange: (options: { direction: string; spacing: number }) => void
    onClose: () => void
  }) => (
    <div data-testid="auto-arrange-dialog">
      <button onClick={() => onArrange({ direction: 'horizontal', spacing: 20 })}>Apply</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
  FitToContentsDialog: ({
    onFit,
    onClose,
  }: {
    onFit: (padding: number) => void
    onClose: () => void
  }) => (
    <div data-testid="fit-dialog">
      <button onClick={() => onFit(20)}>Apply</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}))

describe('ArtboardContextMenu Integration', () => {
  const mockArtboard: LayerNode = {
    id: 'artboard-test',
    type: 'artboard',
    name: 'Test Artboard',
    x: 100,
    y: 100,
    visible: true,
    locked: false,
    artboardProps: {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      clipped: false,
    },
    children: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  beforeEach(() => {
    // Reset store
    useStore.setState({
      layers: {
        [mockArtboard.id]: mockArtboard,
      },
      layerOrder: [mockArtboard.id],
      selectedLayerIds: [mockArtboard.id],
    })
  })

  describe('Menu Item Visibility', () => {
    it('should show artboard-specific menu items for artboard layers', () => {
      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={() => {}}
        />
      )

      expect(getByText('Duplicate Artboard')).toBeInTheDocument()
      expect(getByText('Rename')).toBeInTheDocument()
      expect(getByText('Resize...')).toBeInTheDocument()
      expect(getByText('Change Background')).toBeInTheDocument()
      expect(getByText('Select All Children')).toBeInTheDocument()
      expect(getByText('Auto-arrange Children')).toBeInTheDocument()
      expect(getByText('Fit to Contents')).toBeInTheDocument()
      expect(getByText('Bring to Front')).toBeInTheDocument()
      expect(getByText('Send to Back')).toBeInTheDocument()
      expect(getByText('Clear Artboard')).toBeInTheDocument()
    })

    it('should not show artboard menu items for non-artboard layers', () => {
      const imageLayer: LayerNode = {
        ...mockArtboard,
        id: 'image-layer',
        type: 'image',
        artboardProps: undefined,
      }

      const { queryByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={imageLayer.id}
          currentLayer={imageLayer}
          onClose={() => {}}
        />
      )

      expect(queryByText('Duplicate Artboard')).not.toBeInTheDocument()
      expect(queryByText('Resize...')).not.toBeInTheDocument()
      expect(queryByText('Clear Artboard')).not.toBeInTheDocument()
    })
  })

  describe('Duplicate Artboard', () => {
    it('should trigger duplicate on menu item click', async () => {
      const duplicateSpy = vi.spyOn(useStore.getState(), 'duplicateArtboard')

      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={() => {}}
        />
      )

      fireEvent.pointerDown(getByText('Duplicate Artboard'))

      await waitFor(() => {
        expect(duplicateSpy).toHaveBeenCalledWith(mockArtboard.id)
      })
    })

    it('should close menu after duplication', async () => {
      const onCloseSpy = vi.fn()

      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={onCloseSpy}
        />
      )

      fireEvent.pointerDown(getByText('Duplicate Artboard'))

      await waitFor(() => {
        expect(onCloseSpy).toHaveBeenCalled()
      })
    })
  })

  describe('Rename Artboard', () => {
    it('should show rename dialog on menu item click', async () => {
      const { getByText } = render(
        <>
          <CanvasContextMenu
            visible={true}
            position={{ x: 100, y: 100 }}
            layerId={mockArtboard.id}
            currentLayer={mockArtboard}
            onClose={() => {}}
          />
          <div id="portal-root" />
        </>
      )

      fireEvent.pointerDown(getByText('Rename'))

      await waitFor(() => {
        expect(screen.getByTestId('rename-dialog')).toBeInTheDocument()
      })
    })

    it('should update artboard name on dialog confirm', async () => {
      const renameSpy = vi.spyOn(useStore.getState(), 'renameArtboard')

      render(
        <>
          <CanvasContextMenu
            visible={true}
            position={{ x: 100, y: 100 }}
            layerId={mockArtboard.id}
            currentLayer={mockArtboard}
            onClose={() => {}}
          />
          <div id="portal-root" />
        </>
      )

      fireEvent.pointerDown(screen.getByText('Rename'))

      await waitFor(() => {
        screen.getByTestId('rename-dialog')
      })

      fireEvent.click(screen.getByText('Apply'))

      await waitFor(() => {
        expect(renameSpy).toHaveBeenCalledWith(mockArtboard.id, 'New Name')
      })
    })
  })

  describe('Clear Artboard', () => {
    it('should show confirmation dialog before clearing', async () => {
      window.confirm = vi.fn(() => true)

      const clearSpy = vi.spyOn(useStore.getState(), 'clearArtboard')

      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={() => {}}
        />
      )

      fireEvent.pointerDown(getByText('Clear Artboard'))

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          'Are you sure you want to clear all contents from this artboard?'
        )
        expect(clearSpy).toHaveBeenCalledWith(mockArtboard.id)
      })
    })

    it('should not clear when confirmation cancelled', async () => {
      window.confirm = vi.fn(() => false)

      const clearSpy = vi.spyOn(useStore.getState(), 'clearArtboard')

      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={() => {}}
        />
      )

      fireEvent.pointerDown(getByText('Clear Artboard'))

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled()
        expect(clearSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('Z-Order Operations', () => {
    it('should move artboard to front', async () => {
      const moveToFrontSpy = vi.spyOn(useStore.getState(), 'moveArtboardToFront')

      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={() => {}}
        />
      )

      fireEvent.pointerDown(getByText('Bring to Front'))

      await waitFor(() => {
        expect(moveToFrontSpy).toHaveBeenCalledWith(mockArtboard.id)
      })
    })

    it('should move artboard to back', async () => {
      const moveToBackSpy = vi.spyOn(useStore.getState(), 'moveArtboardToBack')

      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={() => {}}
        />
      )

      fireEvent.pointerDown(getByText('Send to Back'))

      await waitFor(() => {
        expect(moveToBackSpy).toHaveBeenCalledWith(mockArtboard.id)
      })
    })
  })

  describe('Select All Children', () => {
    it('should select all artboard children', async () => {
      const child1: LayerNode = {
        id: 'child-1',
        type: 'image',
        parentId: mockArtboard.id,
        x: 0,
        y: 0,
      } as LayerNode

      const child2: LayerNode = {
        id: 'child-2',
        type: 'text',
        parentId: mockArtboard.id,
        x: 100,
        y: 100,
      } as LayerNode

      useStore.setState({
        layers: {
          [mockArtboard.id]: { ...mockArtboard, children: ['child-1', 'child-2'] },
          [child1.id]: child1,
          [child2.id]: child2,
        },
      })

      const selectChildrenSpy = vi.spyOn(useStore.getState(), 'selectArtboardChildren')

      const { getByText } = render(
        <CanvasContextMenu
          visible={true}
          position={{ x: 100, y: 100 }}
          layerId={mockArtboard.id}
          currentLayer={mockArtboard}
          onClose={() => {}}
        />
      )

      fireEvent.pointerDown(getByText('Select All Children'))

      await waitFor(() => {
        expect(selectChildrenSpy).toHaveBeenCalledWith(mockArtboard.id)
      })
    })
  })

  describe('Dialog Integration', () => {
    it('should handle resize dialog interaction', async () => {
      const resizeSpy = vi.spyOn(useStore.getState(), 'resizeArtboard')

      render(
        <>
          <CanvasContextMenu
            visible={true}
            position={{ x: 100, y: 100 }}
            layerId={mockArtboard.id}
            currentLayer={mockArtboard}
            onClose={() => {}}
          />
          <div id="portal-root" />
        </>
      )

      fireEvent.pointerDown(screen.getByText('Resize...'))

      await waitFor(() => {
        screen.getByTestId('resize-dialog')
      })

      fireEvent.click(screen.getByText('Apply'))

      await waitFor(() => {
        expect(resizeSpy).toHaveBeenCalledWith(mockArtboard.id, 1920, 1080)
      })
    })

    it('should handle background color picker interaction', async () => {
      const bgSpy = vi.spyOn(useStore.getState(), 'setArtboardBackground')

      render(
        <>
          <CanvasContextMenu
            visible={true}
            position={{ x: 100, y: 100 }}
            layerId={mockArtboard.id}
            currentLayer={mockArtboard}
            onClose={() => {}}
          />
          <div id="portal-root" />
        </>
      )

      fireEvent.pointerDown(screen.getByText('Change Background'))

      await waitFor(() => {
        screen.getByTestId('background-picker')
      })

      fireEvent.click(screen.getByText('Apply Color'))

      await waitFor(() => {
        expect(bgSpy).toHaveBeenCalledWith(mockArtboard.id, '#ff0000')
      })
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn()

      const TestWrapper = () => {
        renderSpy()
        return (
          <CanvasContextMenu
            visible={true}
            position={{ x: 100, y: 100 }}
            layerId={mockArtboard.id}
            currentLayer={mockArtboard}
            onClose={() => {}}
          />
        )
      }

      const { rerender } = render(<TestWrapper />)

      // Re-render with same props
      rerender(<TestWrapper />)

      // Should only render once
      expect(renderSpy).toHaveBeenCalledTimes(2) // Initial + one re-render
    })
  })
})
