import './NumberInput.css'

interface NumberInputProps {
  label: string
  value: number
  onInput: (value: number) => void
  disabled?: boolean
}

export function NumberInput({ label, value, onInput, disabled = false }: NumberInputProps) {
  return (
    <div class="number-input-group">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        onInput={(e) => onInput(parseInt(e.currentTarget.value, 10))}
        disabled={disabled}
      />
    </div>
  )
}
