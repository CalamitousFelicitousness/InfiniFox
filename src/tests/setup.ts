import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock console methods to avoid clutter in test output
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock ResizeObserver
class MockResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  cb(0)
  return 0
})

global.cancelAnimationFrame = vi.fn()

// Mock performance.now()
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
}

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      close: vi.fn(),
      createObjectStore: vi.fn(() => ({
        createIndex: vi.fn(),
      })),
      objectStoreNames: { contains: vi.fn(() => false) },
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          put: vi.fn(() => ({ onsuccess: null, onerror: null })),
          get: vi.fn(() => ({ onsuccess: null, onerror: null })),
          delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
          clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
          getAll: vi.fn(() => ({ onsuccess: null, onerror: null })),
        })),
      })),
    },
  })),
  deleteDatabase: vi.fn(() => ({ onsuccess: null, onerror: null })),
}

global.indexedDB = mockIndexedDB as unknown as IDBFactory

// Mock canvas context for Konva
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
  if (type === '2d') {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createPattern: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      rect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      isPointInPath: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      drawImage: vi.fn(),
      createImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(),
        width: 0,
        height: 0,
      })),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(),
        width: 0,
        height: 0,
      })),
      putImageData: vi.fn(),
      canvas: {
        width: 800,
        height: 600,
      },
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
    }
  }
  return null
})

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock Blob
global.Blob = class Blob {
  constructor(
    public parts: Array<ArrayBuffer | ArrayBufferView | Blob | string>,
    public options?: BlobPropertyBag
  ) {}
  size = 1024
  type = 'image/jpeg'
  slice() {
    return new Blob([])
  }
  text() {
    return Promise.resolve('')
  }
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(0))
  }
}

// Mock File
global.File = class File extends Blob {
  constructor(
    parts: Array<ArrayBuffer | ArrayBufferView | Blob | string>,
    public name: string,
    options?: FilePropertyBag
  ) {
    super(parts, options)
  }
  lastModified = Date.now()
}
