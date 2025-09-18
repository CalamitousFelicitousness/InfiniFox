import { render as rtlRender, RenderOptions } from '@testing-library/react'
import React, { ReactElement } from 'react'
import { vi } from 'vitest'

import type { LayerNode } from '../../store/slices/layerSystemSlice'
import type { Store } from '../../store/store'

// Create mock store
export const createMockStore = (): Partial<Store> => ({
  // Layer system
  layers: new Map(),
  layerOrder: [],
  activeArtboardId: null,
  selectedLayerIds: new Set(),

  addArtboard: vi.fn(),
  addLayer: vi.fn(),
  updateLayer: vi.fn(),
  deleteLayer: vi.fn(),
  moveLayer: vi.fn(),
  duplicateLayer: vi.fn(),
  groupLayers: vi.fn(),
  ungroupLayers: vi.fn(),
  setActiveArtboard: vi.fn(),
  toggleLayerVisibility: vi.fn(),
  toggleLayerLock: vi.fn(),
  setLayerVisibility: vi.fn(),
  setLayerLocked: vi.fn(),
  applyFilter: vi.fn(),
  removeFilter: vi.fn(),
  updateFilter: vi.fn(),
  clearFilters: vi.fn(),
  getLayer: vi.fn(),
  getArtboards: vi.fn(() => []),
  getRootLayers: vi.fn(() => []),
  getLayerChildren: vi.fn(() => []),
  clearAllLayers: vi.fn(),
  exportLayerStructure: vi.fn(() => '{}'),
  importLayerStructure: vi.fn(),
  persistLayerStructure: vi.fn(),
  restoreLayerStructure: vi.fn(),
  migrateFromFlatImages: vi.fn(),

  // Canvas state
  viewport: { x: 0, y: 0, scale: 1 },
  selectedImageIds: [],
  tool: 'select',

  setViewport: vi.fn(),
  setTool: vi.fn(),

  // Drawing state
  drawingColor: '#000000',
  brushSize: 10,
  isDrawing: false,

  setDrawingColor: vi.fn(),
  setBrushSize: vi.fn(),
  setIsDrawing: vi.fn(),
})

// Custom render with providers
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    ...renderOptions
  }: {
    preloadedState?: Partial<Store>
    renderOptions?: Omit<RenderOptions, 'wrapper'>
  } = {}
) {
  const mockStore = { ...createMockStore(), ...preloadedState }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    store: mockStore,
  }
}

// Create test layers
export const createTestLayer = (overrides: Partial<LayerNode> = {}): LayerNode => ({
  id: `layer-${Math.random()}`,
  type: 'image',
  name: 'Test Layer',
  x: 0,
  y: 0,
  visible: true,
  locked: false,
  opacity: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

export const createTestArtboard = (overrides: Partial<LayerNode> = {}): LayerNode => ({
  id: `artboard-${Math.random()}`,
  type: 'artboard',
  name: 'Test Artboard',
  x: 0,
  y: 0,
  visible: true,
  locked: false,
  opacity: 1,
  children: [],
  artboardProps: {
    width: 1920,
    height: 1080,
    backgroundColor: '#ffffff',
    clipped: true,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

// Mock Konva stage
export const createMockKonvaStage = () => ({
  width: vi.fn(() => 800),
  height: vi.fn(() => 600),
  getPointerPosition: vi.fn(() => ({ x: 100, y: 100 })),
  container: vi.fn(() => document.body),
  content: document.createElement('div'),
  on: vi.fn(),
  off: vi.fn(),
  fire: vi.fn(),
  draw: vi.fn(),
  batchDraw: vi.fn(),
  find: vi.fn(() => []),
  findOne: vi.fn(),
  getLayers: vi.fn(() => []),
  add: vi.fn(),
  remove: vi.fn(),
  destroy: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  setSize: vi.fn(),
  scale: vi.fn(() => ({ x: 1, y: 1 })),
  position: vi.fn(() => ({ x: 0, y: 0 })),
  absolutePosition: vi.fn(() => ({ x: 0, y: 0 })),
  setScale: vi.fn(),
  setPosition: vi.fn(),
})

// Wait utility
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Performance measurement utilities
export const measurePerformance = async (fn: () => void | Promise<void>) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  return end - start
}

export const expectWithinFPS = (ms: number, targetFPS = 60) => {
  const maxMs = 1000 / targetFPS
  expect(ms).toBeLessThan(maxMs)
}
