# SD.Next New UI

A modern, professional web interface for SD.Next with an infinite canvas powered by Konva.js. Features universal input support for mouse, touch, and stylus devices with pressure sensitivity.

## 🚀 Features Implemented

### Core Generation
- ✅ **Text-to-Image (txt2img)** - Full implementation with all parameters
- ✅ **Image-to-Image (img2img)** - Complete with drag-and-drop upload
- ✅ **Inpainting** - Advanced mask drawing system with brush/eraser tools
  - Pressure-sensitive drawing for stylus devices
  - Adjustable brush size (1-100px)
  - Real-time red overlay preview
  - Mask upload/download support
  - Multiple fill modes and blur options

### Canvas System
- ✅ **Infinite Canvas** - Powered by Konva.js for 60fps performance
- ✅ **Zoom & Pan** - Mouse wheel zoom, drag to pan, pinch-to-zoom ready
- ✅ **Image Manipulation** - Select, move, transform, and layer images
- ✅ **Context Menu** - Right-click options:
  - Send to img2img
  - Send to inpaint
  - Duplicate
  - Download
  - Delete

### Advanced Features
- ✅ **Batch Processing & Queue Management**
  - Batch generation with parameter variations
  - Visual queue with drag-to-reorder
  - Auto-retry on failure
  - Progress tracking per item
  - Start/pause/cancel controls
  
- ✅ **History System with Undo/Redo**
  - Command pattern implementation
  - Visual history panel
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
  - 50 action limit with auto-trimming

- ✅ **State Persistence**
  - LocalStorage integration
  - Session restoration
  - Settings preservation

### Modern Input Handling
- ✅ **Universal Device Support** via Pointer Events API
  - Mouse, touch, and pen unified handling
  - Pressure-sensitive drawing for stylus/pen
  - Touch-friendly 44px minimum targets
  - Photoshop-style drag-to-change number inputs
  
- ✅ **Professional Custom Controls**
  - Visual slider with drag support
  - Custom dropdown with keyboard navigation
  - Enhanced number inputs with scroll wheel support

### Real-time Features
- ✅ **WebSocket Integration** - Live progress updates
- ✅ **Progress Indicator** - Step counter with preview
- ✅ **Model/Sampler Selection** - Dynamic loading from API

### User Experience
- ✅ **Keyboard Shortcuts**:
  - `Ctrl/Cmd + Enter` - Generate
  - `Ctrl/Cmd + Z` - Undo
  - `Ctrl/Cmd + Shift + Z` - Redo
  - `Delete` - Delete selected
  - `Ctrl/Cmd + D` - Duplicate
  - `Ctrl/Cmd + Shift + Delete` - Clear canvas
  
- ✅ **Modern UI**
  - Dark theme with consistent design
  - Tooltips and contextual help
  - Responsive controls
  - Custom scrollbars

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- SD.Next running with `--api` flag
- Modern browser with Pointer Events support (all browsers since 2019)

### Installation
```bash
# Clone the repository
git clone https://github.com/CalamitousFelicitousness/sdnextnewui
cd sdnextnewui

# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration
Create a `.env.local` file for custom endpoints:
```env
VITE_SDNEXT_API_URL=http://localhost:7860/sdapi/v1
VITE_SDNEXT_WS_URL=localhost:7860
```

### Build for Production
```bash
# Create optimized build
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── api/                    # API Layer
│   └── sdnextApi.ts       # SD.Next API client
├── components/            
│   ├── common/            # Reusable UI components
│   │   ├── Dropdown.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── NumberInput.tsx
│   │   ├── ProgressIndicator.tsx
│   │   ├── Slider.tsx
│   │   └── Tooltip.tsx
│   ├── layout/            # Layout components
│   │   ├── ControlPanel.tsx
│   │   └── Tabs.tsx
│   └── panels/            # Feature panels
│       ├── BatchSettingsPanel.tsx
│       ├── HistoryPanel.tsx
│       └── QueuePanel.tsx
├── features/              
│   ├── canvas/            # Canvas system
│   │   ├── Canvas.tsx
│   │   └── CanvasContextMenu.tsx
│   ├── generation/        # Generation interfaces
│   │   ├── Txt2ImgPanel.tsx
│   │   └── Img2ImgPanel.tsx
│   └── inpaint/           # Inpainting system
│       ├── InpaintPanel.tsx
│       └── MaskEditor.tsx
├── hooks/                 # Custom hooks
│   ├── useKeyboardShortcuts.ts
│   ├── usePointerDrag.ts
│   ├── usePointerHover.ts
│   └── usePinchZoom.ts
├── services/              
│   └── websocket.ts       # WebSocket client
├── store/                 # State management
│   ├── store.ts          # Main app state
│   ├── historyStore.ts   # Undo/redo system
│   └── queueStore.ts     # Batch queue
├── utils/
│   └── pointerEvents.ts  # Input handling utilities
└── types/
    └── sdnext.ts         # TypeScript definitions
```

## 🎯 Usage Guide

### Text-to-Image
1. Enter prompt and negative prompt
2. Adjust parameters (steps, CFG, dimensions)
3. Press `Ctrl/Cmd + Enter` or click Generate
4. Images appear on canvas automatically

### Image-to-Image
1. Switch to "Image to Image" tab
2. Drag & drop or click to upload source image
3. Enter prompt for modifications
4. Adjust denoising strength (0-1)
5. Generate to see results

### Inpainting
1. Switch to "Inpainting" tab
2. Upload base image
3. Draw mask with brush tool (red areas = regenerate)
4. Use eraser to refine mask
5. Enter prompt for masked area
6. Adjust mask blur and fill mode
7. Generate inpainted result

### Batch Processing
1. Enable "Batch Mode" in settings panel
2. Configure variations:
   - Seed incrementing
   - Multiple prompts (line-separated)
   - Steps variations (comma-separated)
   - CFG variations
3. Generate to add all variations to queue
4. Monitor progress in Queue panel

### Canvas Operations
- **Zoom**: Mouse wheel or buttons (10%-500%)
- **Pan**: Drag on empty space
- **Select**: Click on image
- **Transform**: Drag corners to resize
- **Multi-select**: Hold Shift (planned)
- **Context Menu**: Right-click for options

### Keyboard Shortcuts
- `Ctrl/Cmd + Enter` - Generate
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Delete` - Delete selected
- `Ctrl/Cmd + D` - Duplicate selected
- `Ctrl/Cmd + Shift + Delete` - Clear canvas

## 🔧 Development

### Scripts
```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview build
npm run lint       # Run ESLint
npm run format     # Format with Prettier
npm run type-check # TypeScript check
```

### Code Standards
- TypeScript with strict mode (in progress)
- Functional components with hooks
- Zustand for state management
- Pointer Events for input handling
- 44px minimum touch targets
- JSDoc for public APIs

## 📈 Current Development Phase

**"Polish Before Progress"** - The project is in a refinement phase, focusing on perfecting existing features before adding new ones.

### Recently Completed Polish Work
- ✅ Migrated all components to Pointer Events API
- ✅ Implemented pressure-sensitive stylus support
- ✅ Created professional custom form controls
- ✅ Added Photoshop-style number inputs
- ✅ Unified input handling for all devices

### Current Polish Priorities
1. Canvas performance optimization for large images
2. Bug fixes (queue scroll, history panel auto-scroll)
3. Comprehensive error handling
4. Test coverage (70% target)
5. Bundle size optimization
6. Accessibility improvements

## 🎯 Roadmap

### Phase 1: Polish & Refinement (Current)
- Performance optimization
- Bug fixes and stability
- Test implementation
- Documentation
- Accessibility

### Phase 2: Feature Expansion (After Polish)
- ControlNet integration
- Model/LoRA management UI
- Canvas layers system
- Workflow automation
- Gallery view

### Phase 3: Advanced Features (Future)
- SDXL support
- Regional prompting
- Plugin system
- Collaboration features
- Mobile app

## 🐛 Known Issues

### Priority Bugs
- Canvas zoom occasionally jumps near limits
- Queue panel scroll position resets on update
- Mask editor cursor sometimes lags
- History panel doesn't auto-scroll to current
- Images jumping after being dragged
- UI elements misaligned
- Image generation error despite correct generation and image appearing on canvas

### Limitations
- Large images (>4K) may impact performance
- No SDXL-specific parameters yet
- Mobile layout incomplete (touch support ready)
- WebSocket may need reconnection after interruption

## 📝 License

MIT

## 🙏 Acknowledgments

Built with:
- [Preact](https://preactjs.com/) - Fast React alternative
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Konva.js](https://konvajs.org/) - 2D canvas library
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [SD.Next](https://github.com/vladmandic/sdnext) - Backend API

---

**Device Support:** Mouse, Touch, Stylus (with pressure)  
**Performance Target:** 60fps with 50+ images