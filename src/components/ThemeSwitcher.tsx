/**
 * Theme Switcher Component
 * UI control for switching between themes
 */

import { h } from 'preact'
import { useState, useEffect, useCallback } from 'preact/hooks'

import { useThemeTransition, useSystemTheme } from '../hooks/useThemeTransition'
import { useTheme } from '../themes/ThemeProvider'
import './ThemeSwitcher.css'

export interface ThemeSwitcherProps {
  /** Position of the switcher */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom'
  /** Show theme preview on hover */
  showPreview?: boolean
  /** Show theme name label */
  showLabel?: boolean
  /** Enable animations */
  animated?: boolean
  /** Custom class name */
  className?: string
  /** Compact mode */
  compact?: boolean
  /** Show system option */
  showSystemOption?: boolean
  /** Custom icons */
  icons?: {
    light?: h.JSX.Element
    dark?: h.JSX.Element
    system?: h.JSX.Element
  }
}

/**
 * Theme Switcher Component
 */
export function ThemeSwitcher({
  position = 'top-right',
  showPreview = false,
  showLabel = true,
  animated = true,
  className = '',
  compact = false,
  showSystemOption = true,
  icons,
}: ThemeSwitcherProps) {
  const { theme, themes, currentThemeName } = useTheme()
  const { switchTheme, isTransitioning } = useThemeTransition({
    duration: animated ? 300 : 0,
    measurePerformance: true,
  })
  const systemTheme = useSystemTheme()

  const [isOpen, setIsOpen] = useState(false)
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<'light' | 'dark' | 'system'>(() => {
    const stored = localStorage.getItem('theme-mode')
    return (stored as 'light' | 'dark' | 'system') || 'system'
  })

  // Default icons
  const defaultIcons = {
    light: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
    dark: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    system: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  }

  const themeIcons = {
    light: icons?.light || defaultIcons.light,
    dark: icons?.dark || defaultIcons.dark,
    system: icons?.system || defaultIcons.system,
  }

  // Handle theme mode selection
  const handleModeSelect = useCallback(
    (mode: 'light' | 'dark' | 'system') => {
      setSelectedMode(mode)
      localStorage.setItem('theme-mode', mode)

      if (mode === 'system') {
        const targetTheme = systemTheme === 'dark' ? 'infinifox-dark' : 'infinifox-light'
        switchTheme(targetTheme)
      } else {
        const targetTheme = mode === 'dark' ? 'infinifox-dark' : 'infinifox-light'
        switchTheme(targetTheme)
      }

      setIsOpen(false)
    },
    [systemTheme, switchTheme]
  )

  // Handle theme selection
  const handleThemeSelect = useCallback(
    (themeName: string) => {
      switchTheme(themeName)
      setIsOpen(false)

      // Update mode based on selected theme
      if (themeName.includes('light')) {
        setSelectedMode('light')
      } else if (themeName.includes('dark')) {
        setSelectedMode('dark')
      }
    },
    [switchTheme]
  )

  // Apply system theme when it changes
  useEffect(() => {
    if (selectedMode === 'system') {
      const targetTheme = systemTheme === 'dark' ? 'infinifox-dark' : 'infinifox-light'
      if (currentThemeName !== targetTheme && themes[targetTheme]) {
        switchTheme(targetTheme)
      }
    }
  }, [systemTheme, selectedMode, currentThemeName, themes, switchTheme])

  // Get current icon
  const getCurrentIcon = () => {
    if (selectedMode === 'system') {
      return themeIcons.system
    }
    return theme.mode === 'dark' ? themeIcons.dark : themeIcons.light
  }

  // Get position classes
  const getPositionClasses = () => {
    if (position === 'custom') return ''
    return `theme-switcher--${position}`
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.theme-switcher')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div
      className={`theme-switcher ${getPositionClasses()} ${className} ${
        compact ? 'theme-switcher--compact' : ''
      } ${animated ? 'theme-switcher--animated' : ''} ${
        isTransitioning ? 'theme-switcher--transitioning' : ''
      }`}
    >
      <button
        className="theme-switcher__toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="theme-switcher__icon">{getCurrentIcon()}</span>
        {showLabel && !compact && (
          <span className="theme-switcher__label">
            {selectedMode === 'system' ? 'System' : theme.mode === 'dark' ? 'Dark' : 'Light'}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="theme-switcher__dropdown" role="menu">
          {/* Quick mode switcher */}
          <div className="theme-switcher__modes">
            <button
              className={`theme-switcher__mode ${
                selectedMode === 'light' ? 'theme-switcher__mode--active' : ''
              }`}
              onClick={() => handleModeSelect('light')}
              role="menuitem"
              aria-label="Light mode"
            >
              {themeIcons.light}
              {!compact && <span>Light</span>}
            </button>

            <button
              className={`theme-switcher__mode ${
                selectedMode === 'dark' ? 'theme-switcher__mode--active' : ''
              }`}
              onClick={() => handleModeSelect('dark')}
              role="menuitem"
              aria-label="Dark mode"
            >
              {themeIcons.dark}
              {!compact && <span>Dark</span>}
            </button>

            {showSystemOption && (
              <button
                className={`theme-switcher__mode ${
                  selectedMode === 'system' ? 'theme-switcher__mode--active' : ''
                }`}
                onClick={() => handleModeSelect('system')}
                role="menuitem"
                aria-label="System theme"
              >
                {themeIcons.system}
                {!compact && <span>System</span>}
              </button>
            )}
          </div>

          {/* Theme list */}
          {Object.keys(themes).length > 2 && (
            <>
              <div className="theme-switcher__divider" />
              <div className="theme-switcher__themes">
                <div className="theme-switcher__heading">All Themes</div>
                {Object.entries(themes).map(([name, themeOption]) => (
                  <button
                    key={name}
                    className={`theme-switcher__theme ${
                      currentThemeName === name ? 'theme-switcher__theme--active' : ''
                    }`}
                    onClick={() => handleThemeSelect(name)}
                    onMouseEnter={() => showPreview && setHoveredTheme(name)}
                    onMouseLeave={() => setHoveredTheme(null)}
                    role="menuitem"
                  >
                    <span className="theme-switcher__theme-name">
                      {themeOption.description || name}
                    </span>
                    {currentThemeName === name && (
                      <svg
                        className="theme-switcher__check"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Theme preview */}
          {showPreview && hoveredTheme && (
            <div className="theme-switcher__preview">
              <div
                className="theme-switcher__preview-colors"
                style={
                  {
                    '--preview-bg': themes[hoveredTheme]?.colors?.semantic?.background?.primary,
                    '--preview-text': themes[hoveredTheme]?.colors?.semantic?.text?.primary,
                    '--preview-primary': themes[hoveredTheme]?.colors?.semantic?.primary?.base,
                    '--preview-border': themes[hoveredTheme]?.colors?.semantic?.border?.default,
                  } as h.JSX.CSSProperties & Record<string, string | undefined>
                }
              >
                <div className="theme-switcher__preview-bg" />
                <div className="theme-switcher__preview-text">Aa</div>
                <div className="theme-switcher__preview-primary" />
                <div className="theme-switcher__preview-border" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ThemeSwitcher
