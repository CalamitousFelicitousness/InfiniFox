import { X, Minimize2, Maximize2, ChevronDown, ChevronUp } from 'lucide-react'
import { ReactNode } from 'react'

interface HeaderProps {
  title: string | ReactNode
  subtitle?: string
  className?: string
  actions?: ReactNode
  onClose?: () => void
  onMinimize?: () => void
  onMaximize?: () => void
  onCollapse?: () => void
  isCollapsed?: boolean
  variant?: 'default' | 'panel' | 'modal' | 'floating'
}

export function Header({
  title,
  subtitle,
  className = '',
  actions,
  onClose,
  onMinimize,
  onMaximize,
  onCollapse,
  isCollapsed = false,
  variant = 'default',
}: HeaderProps) {
  const headerClass = ['header', variant !== 'default' && `header-${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={headerClass}>
      <div className="header-content">
        {onCollapse && (
          <button
            className="header-action header-collapse"
            onClick={onCollapse}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}

        <div className="header-title-group">
          <h2 className="header-title">{title}</h2>
          {subtitle && <span className="header-subtitle">{subtitle}</span>}
        </div>

        {actions && <div className="header-actions">{actions}</div>}

        <div className="header-controls">
          {onMinimize && (
            <button
              className="header-action header-minimize"
              onClick={onMinimize}
              aria-label="Minimize"
            >
              <Minimize2 size={16} />
            </button>
          )}

          {onMaximize && (
            <button
              className="header-action header-maximize"
              onClick={onMaximize}
              aria-label="Maximize"
            >
              <Maximize2 size={16} />
            </button>
          )}

          {onClose && (
            <button className="header-action header-close" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
