import { ComponentChildren } from 'preact'
import { X, Minimize2, Maximize2, ChevronDown, ChevronUp } from 'lucide-react'

interface HeaderProps {
  title: string | ComponentChildren
  subtitle?: string
  className?: string
  actions?: ComponentChildren
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
  variant = 'default'
}: HeaderProps) {
  const headerClass = [
    'header',
    variant !== 'default' && `header-${variant}`,
    className
  ].filter(Boolean).join(' ')

  return (
    <header class={headerClass}>
      <div class="header-content">
        {onCollapse && (
          <button
            class="header-action header-collapse"
            onClick={onCollapse}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
        
        <div class="header-title-group">
          <h2 class="header-title">{title}</h2>
          {subtitle && <span class="header-subtitle">{subtitle}</span>}
        </div>
        
        {actions && <div class="header-actions">{actions}</div>}
        
        <div class="header-controls">
          {onMinimize && (
            <button
              class="header-action header-minimize"
              onClick={onMinimize}
              aria-label="Minimize"
            >
              <Minimize2 size={16} />
            </button>
          )}
          
          {onMaximize && (
            <button
              class="header-action header-maximize"
              onClick={onMaximize}
              aria-label="Maximize"
            >
              <Maximize2 size={16} />
            </button>
          )}
          
          {onClose && (
            <button
              class="header-action header-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
