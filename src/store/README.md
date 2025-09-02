# Store Architecture

## Overview
The store has been refactored from a monolithic 650+ line file into a modular slice-based architecture using Zustand.

## Structure

```
store/
├── store.ts           # Main store - combines all slices
├── types.ts           # Shared TypeScript types
├── historyStore.ts    # Undo/redo system (unchanged)
├── queueStore.ts      # Batch queue management (unchanged)
└── slices/
    ├── index.ts                  # Barrel export for all slices
    ├── generationSlice.ts        # Generation parameters (prompt, seed, steps, etc.)
    ├── modelSlice.ts             # Model and sampler management
    ├── apiSlice.ts               # API settings and connection testing
    ├── canvasSlice.ts            # Canvas and image management
    └── generationActionsSlice.ts # High-level generation methods
```

## Slices

### GenerationSlice
- **State**: prompt, negativePrompt, seed, steps, cfgScale, width, height
- **Actions**: Simple setters for all parameters
- **Purpose**: Manages all generation parameters

### ModelSlice
- **State**: sampler, samplers[], sdModel, sdModels[]
- **Actions**: setSampler, setSdModel, fetchSdModels, fetchSamplers
- **Purpose**: Handles model and sampler selection

### ApiSlice
- **State**: apiSettings, isLoading
- **Actions**: setApiSettings, setIsLoading, testConnection, detectApiType
- **Purpose**: Manages API configuration and connection

### CanvasSlice
- **State**: images[], activeImageRoles[], canvasSelectionMode
- **Actions**: addImage, removeImage, duplicateImage, updateImagePosition, etc.
- **Purpose**: Handles all canvas and image management

### GenerationActionsSlice
- **Actions**: generateTxt2Img, generateImg2Img, generateInpaint
- **Purpose**: High-level orchestration of generation workflows

## Benefits

1. **Separation of Concerns**: Each slice has a single responsibility
2. **Better Maintainability**: Easier to find and modify specific functionality
3. **Reduced Merge Conflicts**: Team members can work on different slices
4. **Improved Testing**: Slices can be tested independently
5. **Better TypeScript**: Smaller, more focused interfaces

## Usage

Components use the store exactly the same way:

```typescript
import { useStore } from '@/store/store'

function MyComponent() {
  const { prompt, setPrompt, generateTxt2Img } = useStore()
  // ...
}
```

## Persistence

Only essential state is persisted to localStorage:
- Generation parameters (prompt, seed, steps, etc.)
- API settings
- **NOT persisted**: images, isLoading, fetched data (samplers, models)

## Adding New Features

To add new functionality:

1. **Identify the domain**: Is it generation, canvas, API, etc.?
2. **Update or create slice**: Add state/actions to the appropriate slice
3. **Update types if needed**: Add new types to `types.ts`
4. **Export from index**: Ensure it's exported from `slices/index.ts`
5. **Test the integration**: Verify the store still works correctly

## Future Improvements

- Add ImageManager slice for blob/IndexedDB handling
- Consider separate stores for independent features
- Add middleware for logging/debugging
- Implement computed/derived state where appropriate
