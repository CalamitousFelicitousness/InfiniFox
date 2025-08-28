import './Dropdown.css'

interface DropdownProps {
  label: string
  value: string
  onInput: (value: string) => void
  options: string[]
  disabled?: boolean
}

export function Dropdown({ label, value, onInput, options, disabled = false }: DropdownProps) {
  return (
    <div class="dropdown-group">
      <label>{label}</label>
      <select value={value} onInput={(e) => onInput(e.currentTarget.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
