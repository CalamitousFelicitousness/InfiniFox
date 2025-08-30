import { useState } from 'preact/hooks'

import './ImageUpload.css'

interface ImageUploadProps {
  onImageSelect: (base64: string, width: number, height: number) => void
  currentImage?: string
  disabled?: boolean
}

export function ImageUpload({ onImageSelect, currentImage, disabled = false }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setPreview(base64)

      // Get image dimensions
      const img = new Image()
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height })
        // Remove data URL prefix for API
        const base64Data = base64.split(',')[1]
        onImageSelect(base64Data, img.width, img.height)
      }
      img.src = base64
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer?.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInput = (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const clearImage = () => {
    setPreview(null)
    setDimensions(null)
    onImageSelect('', 0, 0)
  }

  return (
    <div class="image-upload">
      <div
        class={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPointerDown={(e) => {
          if (!disabled && e.pointerType === 'mouse' || e.pointerType === 'pen' || e.pointerType === 'touch') {
            document.getElementById('file-input')?.click()
          }
        }}
      >
        <input id="file-input" type="file" accept="image/*" onInput={handleFileInput} disabled={disabled} />
        <div class="upload-prompt">
          Drop an image here or <span>click to browse</span>
        </div>
      </div>

      {preview && (
        <div class="image-preview">
          <img src={preview} alt="Preview" />
          <div class="image-info">
            <span>{dimensions ? `${dimensions.width} × ${dimensions.height}` : 'Loading...'}</span>
            <button class="clear-image-btn" onClick={clearImage} disabled={disabled}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
