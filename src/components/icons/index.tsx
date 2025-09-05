/**
 * Central Icon Management Module
 * Exports all lucide-preact icons used throughout InfiniFox
 */

export { 
  // Canvas Tools
  MousePointer2 as SelectIcon,
  Brush as BrushIcon,
  Eraser as EraserIcon,
  Hand as PanIcon,
  
  // UI Controls
  Filter as FilterIcon,
  GripVertical as GripIcon,
  X as CloseIcon,
  Minimize2 as MinimizeIcon,
  Maximize2 as MaximizeIcon,
  Settings as SettingsIcon,
  
  // Actions
  Upload as UploadIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Undo2 as UndoIcon,
  Redo2 as RedoIcon,
  Copy as CopyIcon,
  Trash2 as DeleteIcon,
  Download,
  RefreshCw,
  Upload,
  
  // Status
  Check as CheckIcon,
  AlertCircle as AlertIcon,
  Info as InfoIcon,
  Loader2 as LoadingIcon,
  Trash2,
  
  // Drawing
  Palette as PaletteIcon,
  Pipette as ColorPickerIcon,
  Circle as ShapeIcon,
  Square as RectangleIcon,
  Move as MoveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Droplet,
  
  // Navigation
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  MoreVertical,
  MoreHorizontal,
  
  // Common
  Plus,
  Minus,
  Image as ImageIcon,
  Layers as LayersIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  RefreshCw as RefreshIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipForward as SkipIcon,
  
  // File operations
  FolderOpen as FolderIcon,
  File as FileIcon,
  FileImage as FileImageIcon,
  
  // Effects
  Sparkles as EffectsIcon,
  Sliders as SlidersIcon,
  
  // Communication
  MessageSquare as MessageIcon,
  HelpCircle as HelpIcon,
  
  // Window controls
  Minimize,
  Maximize,
  X as WindowCloseIcon,
  
  // Additional tools
  Crop as CropIcon,
  RotateCw as RotateIcon,
  FlipHorizontal as FlipIcon,
  PenTool as PenIcon,
  Type as TextIcon
} from 'lucide-preact'

// Default icon props for consistent styling
export const defaultIconProps = {
  size: 16,
  strokeWidth: 2,
  class: 'lucide-icon'
}

// Icon size constants
export const iconSizes = {
  xs: 12,  // Tiny icons (badges, indicators)
  sm: 14,  // Small buttons
  md: 16,  // Default size
  lg: 20,  // Large buttons
  xl: 24,  // Headers, prominent actions
  xxl: 32  // Feature icons
}
