import { useState, useRef, useEffect } from 'preact/hooks'

import './Dropdown.css'

interface DropdownProps {
  label: string
  value: string
  onInput: (value: string) => void
  options: string[]
  disabled?: boolean
}

export function Dropdown({ label, value, onInput, options, disabled = false }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
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
      {label && <label>{label}</label>}
      <div class="dropdown-container">
        <button
          type="button"
          class="dropdown-trigger"
          onPointerDown={(e) => {
            e.preventDefault()
            if (!disabled) setIsOpen(!isOpen)
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{value}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        
        {isOpen && (
          <div class="dropdown-menu" role="listbox">
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
    </div>
  )
}
