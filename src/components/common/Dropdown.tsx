import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'preact/hooks'

interface DropdownProps {
  label: string
  value: string
  onInput: (value: string) => void
  options: string[]
  disabled?: boolean
  isLoading?: boolean
}

export function Dropdown({
  label,
  value,
  onInput,
  options,
  disabled = false,
  isLoading = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleGlobalPointerCancel = () => {
      setIsOpen(false)
      setHighlightedIndex(-1)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('pointercancel', handleGlobalPointerCancel)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointercancel', handleGlobalPointerCancel)
    }
  }, [])

  const handleSelect = (option: string) => {
    onInput(option)
    setIsOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(options[highlightedIndex])
        } else {
          setIsOpen(!isOpen)
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setHighlightedIndex(Math.max(0, highlightedIndex - 1))
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (isOpen) {
          setHighlightedIndex(Math.min(options.length - 1, highlightedIndex + 1))
        } else {
          setIsOpen(true)
        }
        break
    }
  }

  return (
    <div class="dropdown-group" ref={dropdownRef}>
      {label && <label class="dropdown-label">{label}</label>}
      <button
        type="button"
        class="dropdown-button"
        onPointerDown={(e) => {
          e.preventDefault()
          if (!disabled) setIsOpen(!isOpen)
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flex: 1 }}>
          {value}
          {isLoading && <span class="dropdown-spinner" />}
        </span>
        <ChevronDown size={14} class="dropdown-icon" />
      </button>

      {isOpen && (
        <div class={`dropdown-menu ${isOpen ? 'open' : ''}`} role="listbox">
          {options.map((option, index) => (
            <div
              key={option}
              class={`dropdown-option ${value === option ? 'selected' : ''} ${highlightedIndex === index ? 'highlighted' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault()
                handleSelect(option)
              }}
              onPointerEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={value === option}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
