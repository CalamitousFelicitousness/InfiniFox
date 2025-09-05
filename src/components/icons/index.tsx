/**
 * Centralized Icon Management for InfiniFox
 * All Lucide icons are imported and re-exported from this module
 * This provides a single source of truth for all icons used in the application
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
  X,
  X as CloseIcon,
  Minimize2 as MinimizeIcon,
  Maximize2 as MaximizeIcon,
  Settings as SettingsIcon,
  
  // Actions
  Upload as UploadIcon,
  Download as DownloadIcon,
  Download, // Also export Download directly for aliasing
  Save as SaveIcon,
  Undo2 as UndoIcon,
  Redo2 as RedoIcon,
  Copy as CopyIcon,
  Trash2 as DeleteIcon,
  Trash2, // Also export Trash2 directly for aliasing
  
  // Status
  Check as CheckIcon,
  AlertCircle as AlertIcon,
  Info as InfoIcon,
  Loader2 as LoadingIcon,
  
  // Drawing
  Palette as PaletteIcon,
  Pipette as ColorPickerIcon,
  Circle as ShapeIcon,
  Square as RectangleIcon,
  Move as MoveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  
  // Filter Controls
  Sliders as SlidersIcon,
  Sun as BrightnessIcon,
  Contrast as ContrastIcon,
  Droplet as SaturationIcon,
  Thermometer as TemperatureIcon,
  
  // Misc
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  MoreVertical,
  MoreHorizontal,
  Plus,
  Minus,
  Image,
  Layers,
  Eye,
  EyeOff,
  RefreshCw,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Lock,
  Unlock
} from 'lucide-preact'

// Default icon props for consistent sizing
export const defaultIconProps = {
  size: 16,
  strokeWidth: 2,
  class: 'lucide-icon'
}

// Icon size presets
export const iconSizes = {
  xs: 12,  // Tiny icons (badges, indicators)
  sm: 14,  // Small buttons
  md: 16,  // Default size
  lg: 20,  // Large buttons
  xl: 24,  // Headers, prominent actions
  xxl: 32  // Feature icons
}
