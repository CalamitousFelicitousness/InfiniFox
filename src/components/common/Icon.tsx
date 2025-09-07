/**
 * Icon Wrapper Component
 * Enforces consistent sizing using theme tokens
 */

import type { FunctionComponent } from 'preact'

import { iconSizeValues, iconStrokes } from '../../themes/tokens/icons'

type IconSize = keyof typeof iconSizeValues
type IconStroke = keyof typeof iconStrokes

interface IconProps {
  icon: FunctionComponent<any>
  size?: IconSize
  strokeWidth?: IconStroke
  className?: string
  [key: string]: any // Allow other props to pass through
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
