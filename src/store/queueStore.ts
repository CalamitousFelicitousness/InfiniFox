import { create } from 'zustand'

import { sdnextApi } from '../api/sdnextApi'

export interface QueueItem {
  id: string
  type: 'txt2img' | 'img2img' | 'inpaint'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  params: any
  result?: string
  error?: string
  progress?: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  retryCount: number
  maxRetries: number
}

interface BatchSettings {
  seedIncrement: number
  variations: {
    seed: boolean
    prompt: boolean
    steps: boolean
    cfgScale: boolean
  }
  promptVariations: string[]
  stepsVariations: number[]
  cfgScaleVariations: number[]
  count: number
}

interface QueueState {
  queue: QueueItem[]
  currentItem: QueueItem | null
  isProcessing: boolean
  maxConcurrent: number
  autoStart: boolean
  completedCount: number
  failedCount: number
  batchSettings: BatchSettings

  // Queue management
  addToQueue: (item: Omit<QueueItem, 'id' | 'createdAt' | 'retryCount' | 'maxRetries'>) => void
  addBatch: (baseParams: any, type: 'txt2img' | 'img2img' | 'inpaint') => void
  removeFromQueue: (id: string) => void
  clearQueue: () => void
  moveInQueue: (id: string, direction: 'up' | 'down') => void
  
  // Processing
  startProcessing: () => void
  stopProcessing: () => void
  processNext: () => Promise<void>
  retryItem: (id: string) => void
  cancelItem: (id: string) => void
  
  // Batch settings
  setBatchSettings: (settings: Partial<BatchSettings>) => void
  
  // Stats
  getQueueStats: () => {
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    cancelled: number
  }
}

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: [],
  currentItem: null,
  isProcessing: false,
  maxConcurrent: 1,
  autoStart: true,
  completedCount: 0,
  failedCount: 0,
  batchSettings: {
    seedIncrement: 1,
    variations: {
      seed: true,
      prompt: false,
      steps: false,
      cfgScale: false,
    },
    promptVariations: [],
    stepsVariations: [20],
    cfgScaleVariations: [7.5],
    count: 1,
  },

  addToQueue: (item) => {
    const newItem: QueueItem = {
      ...item,
      id: `queue-${Date.now()}-${Math.random()}`,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: 3,
    }
    
    set((state) => ({
      queue: [...state.queue, newItem],
    }))
    
    // Auto-start if enabled
    const { autoStart, isProcessing } = get()
    if (autoStart && !isProcessing) {
      get().startProcessing()
    }
  },

  addBatch: (baseParams, type) => {
    const { batchSettings } = get()
    const items: QueueItem[] = []
    
    if (batchSettings.count <= 1) {
      // Just add single item
      get().addToQueue({ type, status: 'pending', params: baseParams })
      return
    }
    
    // Generate variations
    const seeds = batchSettings.variations.seed
      ? Array.from({ length: batchSettings.count }, (_, i) => 
          baseParams.seed === -1 ? -1 : baseParams.seed + i * batchSettings.seedIncrement
        )
      : [baseParams.seed]
    
    const prompts = batchSettings.variations.prompt && batchSettings.promptVariations.length > 0
      ? batchSettings.promptVariations
      : [baseParams.prompt]
    
    const steps = batchSettings.variations.steps && batchSettings.stepsVariations.length > 0
      ? batchSettings.stepsVariations
      : [baseParams.steps]
    
    const cfgScales = batchSettings.variations.cfgScale && batchSettings.cfgScaleVariations.length > 0
      ? batchSettings.cfgScaleVariations
      : [baseParams.cfg_scale]
    
    // Create all combinations
    for (const seed of seeds) {
      for (const prompt of prompts) {
        for (const step of steps) {
          for (const cfgScale of cfgScales) {
            items.push({
              id: `queue-${Date.now()}-${Math.random()}`,
              type,
              status: 'pending',
              params: {
                ...baseParams,
                seed,
                prompt,
                steps: step,
                cfg_scale: cfgScale,
              },
              createdAt: Date.now(),
              retryCount: 0,
              maxRetries: 3,
            })
          }
        }
      }
    }
    
    set((state) => ({
      queue: [...state.queue, ...items],
    }))
    
    // Auto-start if enabled
    const { autoStart, isProcessing } = get()
    if (autoStart && !isProcessing) {
      get().startProcessing()
    }
  },

  removeFromQueue: (id) => {
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    }))
  },

  clearQueue: () => {
    set({ queue: [], currentItem: null })
  },

  moveInQueue: (id, direction) => {
    const { queue } = get()
    const index = queue.findIndex((item) => item.id === id)
    
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= queue.length) return
    
    const newQueue = [...queue]
    const [item] = newQueue.splice(index, 1)
    newQueue.splice(newIndex, 0, item)
    
    set({ queue: newQueue })
  },

  startProcessing: () => {
    set({ isProcessing: true })
    get().processNext()
  },

  stopProcessing: () => {
    set({ isProcessing: false })
  },

  processNext: async () => {
    const { queue, isProcessing } = get()
    
    if (!isProcessing) return
    
    const pendingItem = queue.find((item) => item.status === 'pending')
    
    if (!pendingItem) {
      set({ isProcessing: false, currentItem: null })
      return
    }
    
    // Update item status
    set((state) => ({
      currentItem: pendingItem,
      queue: state.queue.map((item) =>
        item.id === pendingItem.id
          ? { ...item, status: 'processing' as const, startedAt: Date.now() }
          : item
      ),
    }))
    
    try {
      // Process based on type
      let response
      switch (pendingItem.type) {
        case 'txt2img':
          response = await sdnextApi.txt2img(pendingItem.params)
          break
        case 'img2img':
          response = await sdnextApi.img2img(pendingItem.params)
          break
        case 'inpaint':
          response = await sdnextApi.img2img({
            ...pendingItem.params,
            mask: pendingItem.params.maskImage,
          })
          break
      }
      
      // Update with result
      set((state) => ({
        queue: state.queue.map((item) =>
          item.id === pendingItem.id
            ? {
                ...item,
                status: 'completed' as const,
                result: response?.images[0],
                completedAt: Date.now(),
              }
            : item
        ),
        completedCount: state.completedCount + 1,
      }))
      
      // Add to canvas if successful
      if (response?.images[0]) {
        const useStore = (await import('./store')).useStore
        const newImage = {
          src: `data:image/png;base64,${response.images[0]}`,
          x: Math.random() * (window.innerWidth - 200),
          y: Math.random() * (window.innerHeight - 200),
          id: `img-${Date.now()}`,
        }
        useStore.getState().addImage(newImage)
      }
    } catch (error) {
      // Handle error
      set((state) => ({
        queue: state.queue.map((item) =>
          item.id === pendingItem.id
            ? {
                ...item,
                status: 'failed' as const,
                error: error instanceof Error ? error.message : 'Unknown error',
                completedAt: Date.now(),
              }
            : item
        ),
        failedCount: state.failedCount + 1,
      }))
      
      // Retry if under max retries
      if (pendingItem.retryCount < pendingItem.maxRetries) {
        setTimeout(() => {
          get().retryItem(pendingItem.id)
        }, 2000)
      }
    }
    
    // Process next item
    setTimeout(() => {
      get().processNext()
    }, 100)
  },

  retryItem: (id) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'pending' as const,
              retryCount: item.retryCount + 1,
              error: undefined,
            }
          : item
      ),
    }))
  },

  cancelItem: (id) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? { ...item, status: 'cancelled' as const }
          : item
      ),
    }))
  },

  setBatchSettings: (settings) => {
    set((state) => ({
      batchSettings: { ...state.batchSettings, ...settings },
    }))
  },

  getQueueStats: () => {
    const { queue } = get()
    return {
      total: queue.length,
      pending: queue.filter((item) => item.status === 'pending').length,
      processing: queue.filter((item) => item.status === 'processing').length,
      completed: queue.filter((item) => item.status === 'completed').length,
      failed: queue.filter((item) => item.status === 'failed').length,
      cancelled: queue.filter((item) => item.status === 'cancelled').length,
    }
  },
}))
