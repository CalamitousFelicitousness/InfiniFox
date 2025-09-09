/**
 * Icon Wrapper Component
 * Provides consistent icon rendering with proper typing and default props
 */

import { ComponentProps, FunctionComponent } from 'react'
import { memo } from 'react'

import { defaultIconProps } from './index'

interface IconProps extends Omit<ComponentProps<'svg'>, 'icon'> {
  icon: FunctionComponent<ComponentProps<'svg'>> // Lucide icon component
  size?: number
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
      className={`lucide-icon ${className}`}
      color={color}
      {...props}
    />
  )
}

/**
 * Memoized Icon for performance optimization
 * Use this for icons that are frequently re-rendered
 */
export const MemoizedIcon = memo(Icon)

/**
 * Animated Icon wrapper for spinning/rotating animations
 */
interface AnimatedIconProps extends IconProps {
  animation?: 'spin' | 'pulse' | 'bounce'
  duration?: number
}

export function AnimatedIcon({
  animation = 'spin',
  duration = 1,
  className = '',
  ...props
}: AnimatedIconProps) {
  const animationClass = `icon-${animation}`
  const style = {
    '--animation-duration': `${duration}s`,
  }

  return <Icon className={`${className} ${animationClass}`} style={style} {...props} />
}

/**
 * Icon with Tooltip wrapper
 */
interface IconWithTooltipProps extends IconProps {
  tooltip: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
}

export function IconWithTooltip({
  tooltip,
  tooltipPosition = 'top',
  className = '',
  ...props
}: IconWithTooltipProps) {
  return (
    <span
      className={`icon-with-tooltip ${className}`}
      title={tooltip}
      data-tooltip={tooltip}
      data-tooltip-position={tooltipPosition}
    >
      <Icon {...props} />
    </span>
  )
}

/**
 * Icon Button wrapper for clickable icons
 */
interface IconButtonProps extends IconProps {
  onClick?: (e: Event) => void
  label: string // For accessibility
  isActive?: boolean
  disabled?: boolean
}

export function IconButton({
  onClick,
  label,
  isActive = false,
  disabled = false,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      className={`icon-button ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''} ${className}`}
    >
      <Icon {...props} />
    </button>
  )
}
