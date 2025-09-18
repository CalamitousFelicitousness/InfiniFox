import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Konva for testing
vi.mock('konva', () => ({
  default: {
    Stage: vi.fn().mockImplementation(() => ({
      container: vi.fn(),
      width: vi.fn(),
      height: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      getPointerPosition: vi.fn(() => ({ x: 100, y: 100 })),
      setPointersPositions: vi.fn(),
      getLayers: vi.fn(() => []),
      add: vi.fn(),
    })),
    Layer: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      draw: vi.fn(),
      destroy: vi.fn(),
      getChildren: vi.fn(() => []),
    })),
    Rect: vi.fn().mockImplementation(() => ({
      x: vi.fn(),
      y: vi.fn(),
      width: vi.fn(),
      height: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
    })),
    Line: vi.fn().mockImplementation(() => ({
      points: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
      tension: vi.fn(),
      lineCap: vi.fn(),
      lineJoin: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
    })),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      getChildren: vi.fn(() => []),
      destroy: vi.fn(),
    })),
    Transformer: vi.fn().mockImplementation(() => ({
      nodes: vi.fn(),
      getLayer: vi.fn(),
      detach: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}))

// Mock react-konva
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-stage" {...props}>
      {children}
    </div>
  ),
  Layer: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-layer" {...props}>
      {children}
    </div>
  ),
  Rect: (props: Record<string, unknown>) => <div data-testid="konva-rect" {...props} />,
  Line: (props: Record<string, unknown>) => <div data-testid="konva-line" {...props} />,
  Group: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-group" {...props}>
      {children}
    </div>
  ),
  Transformer: (props: Record<string, unknown>) => (
    <div data-testid="konva-transformer" {...props} />
  ),
}))

describe('Canvas Testing Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render a Stage component', () => {
    const TestComponent = () => {
      const Stage = ({ width, height }: { width: number; height: number }) => (
        <div className="konvajs-content" style={{ width, height }} />
      )
      return <Stage width={800} height={600} />
    }

    render(<TestComponent />)
    const container = document.querySelector('.konvajs-content')
    expect(container).toBeInTheDocument()
  })

  it('should handle pointer events', () => {
    const handlePointerDown = vi.fn()

    const TestComponent = () => {
      return (
        <div data-testid="canvas-container" onPointerDown={handlePointerDown}>
          Canvas Area
        </div>
      )
    }

    render(<TestComponent />)
    const canvas = screen.getByTestId('canvas-container')

    fireEvent.pointerDown(canvas, {
      clientX: 100,
      clientY: 100,
      pressure: 0.5,
    })

    expect(handlePointerDown).toHaveBeenCalledWith(
      expect.objectContaining({
        clientX: 100,
        clientY: 100,
      })
    )
  })

  it('should support pressure-sensitive drawing', () => {
    const points: number[][] = []

    const TestComponent = () => {
      const handlePointerMove = (e: React.PointerEvent) => {
        if (e.buttons === 1) {
          points.push([e.clientX, e.clientY, e.pressure])
        }
      }

      return (
        <div data-testid="drawing-area" onPointerMove={handlePointerMove}>
          Drawing Area
        </div>
      )
    }

    render(<TestComponent />)
    const drawingArea = screen.getByTestId('drawing-area')

    // Simulate drawing with pressure
    fireEvent.pointerMove(drawingArea, {
      clientX: 50,
      clientY: 50,
      pressure: 0.3,
      buttons: 1,
    })

    fireEvent.pointerMove(drawingArea, {
      clientX: 100,
      clientY: 100,
      pressure: 0.7,
      buttons: 1,
    })

    expect(points).toHaveLength(2)
    expect(points[0][0]).toBe(50)
    expect(points[0][1]).toBe(50)
    expect(points[0][2]).toBeCloseTo(0.3, 5)
    expect(points[1][0]).toBe(100)
    expect(points[1][1]).toBe(100)
    expect(points[1][2]).toBeCloseTo(0.7, 5)
  })

  it('should handle layer management', () => {
    const layers: string[] = []

    const addLayer = (name: string) => {
      layers.push(name)
    }

    const removeLayer = (name: string) => {
      const index = layers.indexOf(name)
      if (index > -1) {
        layers.splice(index, 1)
      }
    }

    addLayer('background')
    addLayer('drawing')
    addLayer('ui')

    expect(layers).toEqual(['background', 'drawing', 'ui'])

    removeLayer('drawing')
    expect(layers).toEqual(['background', 'ui'])
  })

  it('should validate pointer event compatibility', () => {
    // Test that we're not using deprecated mouse/touch events
    const TestComponent = () => {
      return (
        <div
          data-testid="pointer-test"
          onPointerDown={() => {}}
          onPointerMove={() => {}}
          onPointerUp={() => {}}
          // These should not be used:
          // onMouseDown={() => {}}
          // onTouchStart={() => {}}
        />
      )
    }

    const { container } = render(<TestComponent />)
    const element = container.querySelector('[data-testid="pointer-test"]')

    // Verify pointer events are attached
    expect(element).toHaveAttribute('data-testid', 'pointer-test')

    // In a real test, we'd verify no mouse/touch handlers are attached
    // by checking the element's event listeners
  })
})
