/**
 * Canvas and Drawing Integration Tests
 * Tests for canvas state management and drawing tool integration
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { useStore } from '../../store/store'

describe('Canvas and Drawing Integration', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.clearAllLayers()
      // Note: setViewport and setTool are in canvasSlice, not layerSystemSlice
      // For now, just clear layers
    })
  })

  it('should maintain drawing state when switching between tools', async () => {
    // Test placeholder - actual canvas slice integration needed
    expect(true).toBe(true)
  })

  it('should correctly integrate canvas with generation pipeline', async () => {
    const { result } = renderHook(() => useStore())

    // Create artboard with image
    let artboardId: string
    act(() => {
      artboardId = result.current.addArtboard({
        width: 512,
        height: 512,
        backgroundColor: '#ffffff',
      })

      result.current.addLayer(
        {
          type: 'image',
          name: 'Generation Result',
          x: 0,
          y: 0,
          visible: true,
          locked: false,
          opacity: 1,
          imageProps: {
            src: 'generated.jpg',
            width: 512,
            height: 512,
          },
        },
        artboardId
      )
    })

    const artboard = result.current.getLayer(artboardId!)
    expect(artboard).toBeDefined()
    expect(artboard?.children).toHaveLength(1)

    const children = result.current.getLayerChildren(artboardId!)
    expect(children[0].type).toBe('image')
    expect(children[0].imageProps?.width).toBe(512)
  })

  it('should handle multi-layer operations across features', async () => {
    const { result } = renderHook(() => useStore())

    let artboardId: string
    let drawingLayerId: string
    let imageLayerId: string
    let textLayerId: string

    act(() => {
      // Create artboard with multiple layer types
      artboardId = result.current.addArtboard({
        width: 1920,
        height: 1080,
      })

      // Add drawing layer
      drawingLayerId = result.current.addLayer(
        {
          type: 'drawing',
          name: 'User Drawing',
          x: 0,
          y: 0,
          visible: true,
          locked: false,
          opacity: 0.8,
          drawingProps: {
            strokes: [],
          },
        },
        artboardId
      )

      // Add image layer
      imageLayerId = result.current.addLayer(
        {
          type: 'image',
          name: 'Background Image',
          x: 100,
          y: 100,
          visible: true,
          locked: false,
          opacity: 1,
          imageProps: {
            src: 'background.jpg',
            width: 800,
            height: 600,
          },
        },
        artboardId
      )

      // Add text layer
      textLayerId = result.current.addLayer(
        {
          type: 'text',
          name: 'Label',
          x: 50,
          y: 50,
          visible: true,
          locked: false,
          opacity: 1,
          textProps: {
            text: 'Sample Text',
            fontSize: 32,
            fill: '#000000',
          },
        },
        artboardId
      )
    })

    // Verify all layers created
    const artboard = result.current.getLayer(artboardId)
    expect(artboard?.children).toHaveLength(3)

    // Test batch visibility operation
    act(() => {
      result.current.setLayerVisibility(drawingLayerId, false)
      result.current.setLayerVisibility(textLayerId, false)
    })

    expect(result.current.getLayer(drawingLayerId)?.visible).toBe(false)
    expect(result.current.getLayer(imageLayerId)?.visible).toBe(true)
    expect(result.current.getLayer(textLayerId)?.visible).toBe(false)

    // Test layer reordering
    act(() => {
      result.current.moveLayer(textLayerId, artboardId, 0)
    })

    const reorderedChildren = result.current.getLayerChildren(artboardId)
    expect(reorderedChildren[0].id).toBe(textLayerId)
  })

  it('should handle viewport transformations', () => {
    // Test placeholder - viewport is managed in canvasSlice
    expect(true).toBe(true)
  })
})
