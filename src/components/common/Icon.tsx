/**
 * Icon Wrapper Component
 * Enforces consistent sizing using theme tokens
 */

import type { FunctionComponent, JSX } from 'react'

import { iconSizeValues, iconStrokes } from '../../themes/tokens/icons'

type IconSize = keyof typeof iconSizeValues
type IconStroke = keyof typeof iconStrokes

// Common props that lucide-react icons accept
interface LucideIconProps {
  size?: number | string
  strokeWidth?: number | string
  stroke?: string
  fill?: string
  strokeLinecap?: 'butt' | 'round' | 'square'
  strokeLinejoin?: 'miter' | 'round' | 'bevel'
  className?: string
  style?: JSX.CSSProperties
}

interface IconProps extends Omit<LucideIconProps, 'size' | 'strokeWidth'> {
  icon: FunctionComponent<LucideIconProps>
  size?: IconSize
  strokeWidth?: IconStroke
}

export function Icon({
  icon: IconComponent,
  size = 'base',
  strokeWidth = 'base',
  className = '',
  ...props
}: IconProps) {
  return (
    <IconComponent
      size={iconSizeValues[size]}
      strokeWidth={iconStrokes[strokeWidth]}
      className={`icon icon-${size} ${className}`}
      {...props}
    />
  )
}
