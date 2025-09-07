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
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  ChevronLeft as ChevronLeftIcon,

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
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
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
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,

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
  FileText as FileTextIcon,

  // Effects
  Sparkles as EffectsIcon,
  Sliders as SlidersIcon,
  Wand2 as MagicWandIcon,

  // Communication
  MessageSquare as MessageIcon,
  HelpCircle as HelpIcon,
  AlertTriangle as WarningIcon,

  // Window controls
  Minimize,
  Maximize,
  X as WindowCloseIcon,

  // Additional tools
  Crop as CropIcon,
  RotateCw as RotateIcon,
  FlipHorizontal as FlipIcon,
  PenTool as PenIcon,
  Type as TextIcon,

  // Layout & UI
  Grid as GridIcon,
  List as ListIcon,
  Menu as MenuIcon,
  Sidebar as SidebarIcon,
  PanelLeft as PanelLeftIcon,
  PanelRight as PanelRightIcon,

  // Media controls
  Volume2 as VolumeIcon,
  VolumeX as MuteIcon,
  Mic as MicrophoneIcon,
  Video as VideoIcon,

  // System
  Power as PowerIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Shield as ShieldIcon,
  Cpu as CpuIcon,
  HardDrive as StorageIcon,

  // Social & Sharing
  Share2 as ShareIcon,
  Link as LinkIcon,
  ExternalLink as ExternalLinkIcon,

  // Editing
  Edit as EditIcon,
  Edit2 as Edit2Icon,
  Edit3 as Edit3Icon,
  Scissors as ScissorsIcon,

  // Time
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  Timer as TimerIcon,

  // Weather & Nature
  Sun as SunIcon,
  Moon as MoonIcon,
  Cloud as CloudIcon,
  Zap as LightningIcon,

  // Miscellaneous
  Search as SearchIcon,
  Filter as FilterIcon2,
  Star as StarIcon,
  Heart as HeartIcon,
  Home as HomeIcon,
  User as UserIcon,
  Users as UsersIcon,
  Bell as BellIcon,
  BellOff as BellOffIcon,
  Bookmark as BookmarkIcon,
  Tag as TagIcon,
  Hash as HashIcon,
  AtSign as AtSignIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Database as DatabaseIcon,
  Server as ServerIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Activity as ActivityIcon,
  BarChart as ChartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from 'lucide-preact'

// Default icon props for consistent styling
export const defaultIconProps = {
  size: 16,
  strokeWidth: 2,
  class: 'lucide-icon',
}

// Icon size constants
export const iconSizes = {
  xs: 12, // Tiny icons (badges, indicators)
  sm: 14, // Small buttons
  md: 16, // Default size
  lg: 20, // Large buttons
  xl: 24, // Headers, prominent actions
  xxl: 32, // Feature icons
}

// Icon categories for organization
export const iconCategories = {
  tools: ['SelectIcon', 'BrushIcon', 'EraserIcon', 'PanIcon', 'CropIcon', 'RotateIcon'],
  ui: ['CloseIcon', 'MinimizeIcon', 'MaximizeIcon', 'SettingsIcon', 'MenuIcon'],
  actions: ['SaveIcon', 'UndoIcon', 'RedoIcon', 'CopyIcon', 'DeleteIcon'],
  status: ['CheckIcon', 'AlertIcon', 'InfoIcon', 'LoadingIcon', 'WarningIcon'],
  navigation: ['ChevronRightIcon', 'ChevronDownIcon', 'ArrowUp', 'ArrowDown'],
  media: ['ImageIcon', 'VideoIcon', 'VolumeIcon', 'MuteIcon'],
} as const

// Helper function to get icon by name
export function getIconByName(name: string): any {
  const icons = {
    SelectIcon,
    BrushIcon,
    EraserIcon,
    PanIcon,
    FilterIcon,
    GripIcon,
    CloseIcon,
    MinimizeIcon,
    MaximizeIcon,
    SettingsIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ChevronLeftIcon,
    UploadIcon,
    DownloadIcon,
    SaveIcon,
    UndoIcon,
    RedoIcon,
    CopyIcon,
    DeleteIcon,
    CheckIcon,
    CheckCircleIcon,
    XCircleIcon,
    AlertIcon,
    InfoIcon,
    LoadingIcon,
    PaletteIcon,
    ColorPickerIcon,
    ShapeIcon,
    RectangleIcon,
    MoveIcon,
    ZoomInIcon,
    ZoomOutIcon,
    ImageIcon,
    LayersIcon,
    EyeIcon,
    EyeOffIcon,
    // Add more as needed
  }
  return icons[name as keyof typeof icons]
}
