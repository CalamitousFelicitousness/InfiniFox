/**
 * TypeScript definitions for Icon System
 */

import { ComponentProps, FunctionComponent } from 'preact'

// Lucide icon component type
export type LucideIcon = FunctionComponent<ComponentProps<'svg'>>

// Icon size type
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | number

// Animation types
export type IconAnimation = 'spin' | 'pulse' | 'bounce'

// Tooltip position
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

// Canvas tool type with icon
export interface ToolWithIcon {
  id: string
  icon: LucideIcon
  label: string
  tooltip: string
  shortcut?: string
}

// Icon map for dynamic icon loading
export type IconMap = Record<string, LucideIcon>

// Export specific icon props for consistency
export interface BaseIconProps {
  size?: IconSize
  color?: string
  strokeWidth?: number
  className?: string
}
