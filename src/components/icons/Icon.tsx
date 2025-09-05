/**
 * Icon Wrapper Component
 * Provides consistent rendering and styling for all Lucide icons
 */

import { ComponentProps } from 'preact'
import { defaultIconProps } from './index'

interface IconProps extends Omit<ComponentProps<'svg'>, 'size'> {
  icon: any // Lucide icon component
  size?: number | string
  color?: string
  strokeWidth?: number
  className?: string
}

export function Icon({ 
  icon: IconComponent, 
  size = defaultIconProps.size,
  strokeWidth = defaultIconProps.strokeWidth,
  className = '',
  color,
  ...props 
}: IconProps) {
  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      class={`lucide-icon ${className}`}
      {...props}
    />
  )
}

// Memoized version for performance-critical components
import { memo } from 'preact/compat'

export const MemoizedIcon = memo(Icon)
