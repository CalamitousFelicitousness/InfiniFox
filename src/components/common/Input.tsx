interface InputProps {
  label?: string
  type?: 'text' | 'email' | 'password' | 'url' | 'search' | 'tel'
  value: string
  onInput: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  autoFocus?: boolean
  className?: string
}

export function Input({
  label,
  type = 'text',
  value,
  onInput,
  placeholder,
  disabled = false,
  required = false,
  autoFocus = false,
  className = '',
}: InputProps) {
  return (
    <div class={`text-input-group ${className}`}>
      {label && (
        <label class="text-input-label">
          {label}
          {required && <span class="text-error ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        class="text-input-field"
        value={value}
        onInput={(e) => onInput(e.currentTarget.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
      />
    </div>
  )
}

// Textarea variant
interface TextareaProps {
  label?: string
  value: string
  onInput: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  required?: boolean
  className?: string
}

export function Textarea({
  label,
  value,
  onInput,
  placeholder,
  rows = 3,
  disabled = false,
  required = false,
  className = '',
}: TextareaProps) {
  return (
    <div class={`text-input-group ${className}`}>
      {label && (
        <label class="text-input-label">
          {label}
          {required && <span class="text-error ml-1">*</span>}
        </label>
      )}
      <textarea
        class="text-input-field textarea-field"
        value={value}
        onInput={(e) => onInput(e.currentTarget.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
      />
    </div>
  )
}
