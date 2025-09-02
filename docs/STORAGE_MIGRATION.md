# Base64 to Object URL + IndexedDB

## Overview
This document describes the migration from inefficient Base64 string storage to a modern, performant storage system using Object URLs for display and IndexedDB for persistence.

## Architecture

### Storage Layers

1. **Object URLs (Session Storage)**
   - Used for displaying images in the UI
   - Created from Blobs via `URL.createObjectURL()`
   - Must be revoked to prevent memory leaks
   - Lost on page refresh

2. **IndexedDB (Persistent Storage)**
   - Stores actual image Blobs
   - Survives browser restarts
   - Indexed for fast retrieval
   - Supports complex queries

3. **Zustand Store (State Management)**
   - Only stores image metadata and Object URLs

## Implementation Details

### ImageStorageService
Located at: `src/services/storage/ImageStorageService.ts`

Key features:
- Singleton pattern for global access
- Automatic IndexedDB initialization
- Base64 to Blob conversion
- Object URL lifecycle management
- Storage statistics tracking

### Key Methods

```typescript
// Convert Base64 to efficient storage
createFromBase64(id: string, base64: string, metadata: ImageMetadata): Promise<StoredImage>

// Upload file directly
createFromFile(id: string, file: File, metadata: ImageMetadata): Promise<StoredImage>

// Export for API usage
exportAsBase64(id: string): Promise<string>

// Load persisted images
loadAllFromIndexedDB(): Promise<StoredImage[]>

// Cleanup memory
cleanup(): void
```

### Store Updates

#### Canvas Slice
- Added `uploadImageToCanvas()` for proper file handling
- Added `exportImageAsBase64()` for API requests
- Updated `removeImage()` to clean up storage
- Added `duplicateImage()` with proper blob duplication

#### Generation Actions Slice
- Updated all generation methods to use Object URLs
- Added `loadImagesFromStorage()` for app initialization
- Added `updateStorageStats()` for monitoring

## Usage Examples

### Generating an Image
```typescript
// API returns Base64
const response = await sdnextApi.txt2img(params)

// Convert to efficient storage
const storedImage = await imageStorage.createFromBase64(
  imageId,
  response.images[0],
  metadata
)

// Add to canvas with Object URL
const newImage = {
  id: imageId,
  src: storedImage.objectUrl,  // Object URL, not Base64!
  x: position.x,
  y: position.y,
  blobId: imageId
}
```

### Uploading an Image
```typescript
// File upload directly creates Object URL
await uploadImageToCanvas(file, x, y)
// This internally:
// 1. Creates Object URL from file
// 2. Stores in IndexedDB
// 3. Adds to canvas
```

### Using Image for img2img
```typescript
// Export as Base64 when needed for API
const base64 = await exportImageAsBase64(imageId)
// Send to API
await sdnextApi.img2img({ init_images: [base64], ... })
```

## Storage Management

### Automatic Cleanup
- Object URLs are revoked on component unmount
- Periodic cleanup of unused URLs
- Storage stats displayed to user

### Manual Management
- Clear Storage button in UI
- Per-image deletion cleans up both URL and IndexedDB

### Storage Stats Component
Shows:
- Total images stored
- Total storage size
- Active memory URLs

## Best Practices

### DO:
- Always revoke Object URLs when done
- Use `exportAsBase64()` only when sending to API
- Store metadata alongside images
- Handle IndexedDB errors gracefully

### DON'T:
- Store Base64 in component state
- Keep Object URLs longer than needed
- Forget to clean up on unmount
- Use Base64 for display

## Browser Compatibility

### Required APIs:
- Blob API (all modern browsers)
- URL.createObjectURL (all modern browsers)
- IndexedDB (all modern browsers)
- FileReader API (all modern browsers)

### Tested On:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Common Issues

1. **"Failed to execute 'createObjectURL'"**
   - Cause: Browser security restrictions
   - Solution: Ensure HTTPS or localhost

2. **IndexedDB quota exceeded**
   - Cause: Storage full
   - Solution: Clear old images or request more quota

3. **Images not persisting**
   - Cause: IndexedDB disabled/blocked
   - Solution: Check browser settings

4. **Memory leak warnings**
   - Cause: Object URLs not revoked
   - Solution: Ensure cleanup() is called

## Future Enhancements

1. **Image Compression**
   - Compress before IndexedDB storage
   - WebP format support

2. **Lazy Loading**
   - Load images on demand
   - Virtual scrolling for galleries

3. **Cloud Backup**
   - Optional cloud storage integration
   - Sync across devices

4. **Advanced Queries**
   - Search by prompt
   - Filter by date/settings
   - Tag system
