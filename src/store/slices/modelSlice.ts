import { sdnextApi } from '../../api/sdnextApi'
import type { Sampler, SdModel } from '../../types/sdnext'
import type { SliceCreator } from '../types'

export interface ModelSlice {
  // State
  sampler: string
  samplers: Sampler[]
  sdModel: string
  sdModels: SdModel[]
  isModelLoading: boolean

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
  isModelLoading: false,

  // Actions
  setSampler: (sampler) => set({ sampler }),

  setSdModel: async (modelName) => {
    // Store the previous model in case we need to revert
    const previousModel = get().sdModel

    // Optimistically update the UI immediately
    set({ sdModel: modelName, isModelLoading: true })

    try {
      // Find the model to get its title for the API
      const { sdModels } = get()
      const model = sdModels.find((m) => m.model_name === modelName)
      if (model) {
        await sdnextApi.setOptions({ sd_model_checkpoint: model.title })
        // Success - just clear the loading state (model is already set)
        set({ isModelLoading: false })
      } else {
        // Model not found, revert
        console.error('Model not found:', modelName)
        set({ sdModel: previousModel, isModelLoading: false })
        alert('Selected model not found')
      }
    } catch (error) {
      console.error('Failed to set model:', error)
      // Revert to previous model on error
      set({ sdModel: previousModel, isModelLoading: false })
      alert('Failed to set model. See console for details.')
    }
  },

  fetchSdModels: async () => {
    try {
      const models = await sdnextApi.getSdModels()
      // Sort models: directories first, then alphabetically within each group
      const modelsWithDirs = models.filter((m) => m.model_name.includes('/'))
      const modelsWithoutDirs = models.filter((m) => !m.model_name.includes('/'))

      modelsWithDirs.sort((a, b) => a.model_name.localeCompare(b.model_name))
      modelsWithoutDirs.sort((a, b) => a.model_name.localeCompare(b.model_name))

      const sortedModels = [...modelsWithDirs, ...modelsWithoutDirs]
      set({ sdModels: sortedModels })

      const currentModel = get().sdModel
      if (currentModel) {
        // Check if we have an old title stored instead of model_name
        const modelByTitle = sortedModels.find((m) => m.title === currentModel)
        if (modelByTitle && !sortedModels.find((m) => m.model_name === currentModel)) {
          // Migrate from title to model_name
          console.log('Migrating model selection from title to model_name')
          set({ sdModel: modelByTitle.model_name })
        }
      } else if (sortedModels.length > 0) {
        // No model selected, use first one
        set({ sdModel: sortedModels[0].model_name })
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
