import { ReactNode, PointerEvent } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: (e: PointerEvent<HTMLButtonElement>) => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  fullWidth?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'base',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  fullWidth = false,
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const isDisabled = disabled || loading

  const buttonClasses = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-block',
    loading && 'btn-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={buttonClasses} onClick={onClick} disabled={isDisabled}>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {icon && iconPosition === 'left' && <span className="btn-icon btn-icon-left">{icon}</span>}
      <span className="btn-text">{children}</span>
      {icon && iconPosition === 'right' && <span className="btn-icon btn-icon-right">{icon}</span>}
    </button>
  )
}

// Icon Button variant
interface IconButtonProps {
  icon: ReactNode
  onClick?: (e: PointerEvent<HTMLButtonElement>) => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  ariaLabel: string
}

export function IconButton({
  icon,
  onClick,
  variant = 'ghost',
  size = 'base',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  ariaLabel,
}: IconButtonProps) {
  const isDisabled = disabled || loading

  const buttonClasses = [
    'btn',
    'btn-icon-only',
    `btn-${variant}`,
    `btn-${size}`,
    loading && 'btn-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : icon}
    </button>
  )
}

// Button Group component
interface ButtonGroupProps {
  children: ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ButtonGroup({
  children,
  className = '',
  orientation = 'horizontal',
}: ButtonGroupProps) {
  return <div className={`btn-group btn-group-${orientation} ${className}`}>{children}</div>
}
