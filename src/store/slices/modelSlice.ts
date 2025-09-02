import { sdnextApi } from '../../api/sdnextApi'
import type { Sampler, SdModel } from '../../types/sdnext'
import type { SliceCreator } from '../types'

export interface ModelSlice {
  // State
  sampler: string
  samplers: Sampler[]
  sdModel: string
  sdModels: SdModel[]
  
  // Actions
  setSampler: (sampler: string) => void
  setSdModel: (model: string) => Promise<void>
  fetchSdModels: () => Promise<void>
  fetchSamplers: () => Promise<void>
}

export const createModelSlice: SliceCreator<ModelSlice> = (set, get) => ({
  // Initial state
  sampler: 'DPM++ 2M Karras',
  samplers: [],
  sdModel: '',
  sdModels: [],
  
  // Actions
  setSampler: (sampler) => set({ sampler }),
  
  setSdModel: async (model) => {
    try {
      await sdnextApi.setOptions({ sd_model_checkpoint: model })
      set({ sdModel: model })
    } catch (error) {
      console.error('Failed to set model:', error)
      alert('Failed to set model. See console for details.')
    }
  },
  
  fetchSdModels: async () => {
    try {
      const models = await sdnextApi.getSdModels()
      set({ sdModels: models })
      if (models.length > 0 && !get().sdModel) {
        set({ sdModel: models[0].title })
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    }
  },
  
  fetchSamplers: async () => {
    try {
      const samplers = await sdnextApi.getSamplers()
      set({ samplers })
    } catch (error) {
      console.error('Failed to fetch samplers:', error)
    }
  },
})
