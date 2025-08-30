# SD.Next New UI

A modern, professional web interface for SD.Next with an infinite canvas powered by Konva.js.

## 🚀 Features Implemented

### Core Functionality
- ✅ **Text-to-Image Generation** - Full txt2img implementation with all parameters
- ✅ **Image-to-Image Generation** - Complete img2img with drag-and-drop upload
- ✅ **Model Selection** - Dynamic model loading and switching
- ✅ **Sampler Selection** - All available samplers from API

### Canvas Features
- ✅ **Infinite Canvas** - Powered by Konva.js for high performance
- ✅ **Zoom & Pan** - Mouse wheel zoom, drag to pan
- ✅ **Image Manipulation** - Select, move, and transform images
- ✅ **Context Menu** - Right-click options for images:
  - Send to img2img
  - Duplicate
  - Download
  - Delete

### State Management
- ✅ **Persistent Storage** - Settings and images saved to localStorage
- ✅ **Session Management** - Restore your work after page refresh

### Real-time Updates
- ✅ **WebSocket Integration** - Live progress updates during generation
- ✅ **Progress Indicator** - Visual feedback with step counter and preview

### User Experience
- ✅ **Keyboard Shortcuts**:
  - `Ctrl/Cmd + Enter` - Generate
  - `Delete/Backspace` - Delete selected image
  - `Ctrl/Cmd + D` - Duplicate selected image
  - `Ctrl/Cmd + Shift + Delete` - Clear canvas
- ✅ **Drag & Drop** - Upload images by dragging onto upload area
- ✅ **Responsive Design** - Clean, modern UI with dark theme

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- SD.Next running with API enabled (default: http://localhost:7860)

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration
Create a `.env.local` file for custom API endpoints:
```env
VITE_SDNEXT_API_URL=http://localhost:7860/sdapi/v1
VITE_SDNEXT_WS_URL=localhost:7860
```

## 📁 Project Structure

```
src/
├── api/                 # API service layer
│   └── sdnextApi.ts    # SD.Next API client
├── components/         
│   ├── common/         # Reusable UI components
│   │   ├── Dropdown.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── NumberInput.tsx
│   │   ├── ProgressIndicator.tsx
│   │   └── Slider.tsx
│   └── layout/         # Layout components
│       ├── ControlPanel.tsx
│       └── Tabs.tsx
├── features/           
│   ├── canvas/         # Canvas functionality
│   │   ├── Canvas.tsx
│   │   └── CanvasContextMenu.tsx
│   └── generation/     # Generation panels
│       ├── Txt2ImgPanel.tsx
│       └── Img2ImgPanel.tsx
├── hooks/              # Custom React hooks
│   └── useKeyboardShortcuts.ts
├── services/           # External services
│   └── websocket.ts    # WebSocket client
├── store/              # State management
│   └── store.ts        # Zustand store
├── styles/             # Global styles
│   └── main.css
└── types/              # TypeScript definitions
    └── sdnext.ts
```

## 🎯 Usage Guide

### Text-to-Image
1. Enter your prompt in the text area
2. Adjust parameters (steps, CFG scale, dimensions)
3. Click "Generate" or press `Ctrl/Cmd + Enter`
4. Generated images appear on the canvas

### Image-to-Image
1. Switch to "Image to Image" tab
2. Upload an image via drag-and-drop or click to browse
3. Enter your prompt for modifications
4. Adjust denoising strength (0-1, higher = more changes)
5. Generate to see results on canvas

### Canvas Operations
- **Zoom**: Mouse wheel or zoom buttons
- **Pan**: Click and drag on empty space
- **Select**: Click on an image
- **Move**: Drag selected image
- **Context Menu**: Right-click on image for options

## 🔄 Next Steps

### High Priority
- [ ] Inpainting mode with mask drawing
- [ ] Batch generation support
- [ ] History/undo system
- [ ] Image metadata display

### Medium Priority
- [ ] ControlNet integration
- [ ] Regional prompting
- [ ] Canvas layers
- [ ] Export project files

### Low Priority
- [ ] Workflow automation
- [ ] Plugin system
- [ ] Collaborative features

## 🐛 Known Issues
- WebSocket connection may need manual reconnection after network interruption
- Large images (>4K) may impact canvas performance
- Some samplers may not be available depending on SD.Next configuration

## 📝 License
MIT

## 🤝 Contributing
Contributions are welcome! Please follow the existing code style and add tests for new features.

---
Built with ❤️ using Preact, TypeScript, Konva.js, and Zustand
