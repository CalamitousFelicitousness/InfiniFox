# Store Refactoring Migration Guide

## File Structure

```
store/
├── store.ts (50 lines - just combines slices)
├── types.ts (shared types)
├── historyStore.ts (unchanged)
├── queueStore.ts (unchanged)
└── slices/
    ├── generationSlice.ts (generation params)
    ├── modelSlice.ts (models/samplers)
    ├── apiSlice.ts (API settings)
    ├── canvasSlice.ts (canvas/images)
    └── generationActionsSlice.ts (generation methods)
```

## Code details

### Finding Code

If you're looking for specific functionality:

- **Generation parameters** (prompt, seed, steps) → `slices/generationSlice.ts`
- **Model/sampler code** → `slices/modelSlice.ts`
- **API/connection code** → `slices/apiSlice.ts`
- **Canvas/image management** → `slices/canvasSlice.ts`
- **Generation methods** (txt2img, img2img) → `slices/generationActionsSlice.ts`

### Adding New Features

1. **Identify the right slice** based on the feature domain
2. **Add to existing slice** if it fits
3. **Create new slice** for completely new domains
4. **Update types.ts** for shared types
5. **Import in store.ts** to combine with other slices

Example - Adding a new generation parameter:
```typescript
// In slices/generationSlice.ts
export interface GenerationSlice {
  // Add new state
  newParam: number
  
  // Add setter
  setNewParam: (value: number) => void
}

// In the implementation
newParam: 42,
setNewParam: (newParam) => set({ newParam }),
```