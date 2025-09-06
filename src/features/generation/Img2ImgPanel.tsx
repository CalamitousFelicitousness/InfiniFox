import { useState } from 'preact/hooks'

import { Dropdown } from '../../components/common/Dropdown'
import { ImageUpload } from '../../components/common/ImageUpload'
import { NumberInput } from '../../components/common/NumberInput'
import { Slider } from '../../components/common/Slider'
import { useStore } from '../../store/store'

import './Img2ImgPanel.css'

export function Img2ImgPanel() {
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    sampler,
    setSampler,
    samplers,
    seed,
    setSeed,
    steps,
    setSteps,
    cfgScale,
    setCfgScale,
    width,
    setWidth,
    height,
    setHeight,
    generateImg2Img,
    isLoading,
    startCanvasSelection,
    exportImageAsBase64,
    images,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [selectionMode, setSelectionMode] = useState<'upload' | 'canvas'>('upload')
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

  const handleImageSelect = (base64: string, imgWidth: number, imgHeight: number) => {
    setBaseImage(base64)
    setSelectedImageId(null) // Clear canvas selection
    if (imgWidth && imgHeight) {
      // Optionally update dimensions to match source image
      setWidth(imgWidth)
      setHeight(imgHeight)
    }
  }

  const handleSelectFromCanvas = () => {
    setSelectionMode('canvas')
    startCanvasSelection('img2img', async (imageId: string, imageSrc: string) => {
      try {
        // Export the image as base64 for API usage
        const base64 = await exportImageAsBase64(imageId)
        
        // Get image dimensions from the canvas image
        const selectedImage = images.find(img => img.id === imageId)
        if (selectedImage) {
          setBaseImage(base64)
          setSelectedImageId(imageId)
          if (selectedImage.width && selectedImage.height) {
            setWidth(selectedImage.width)
            setHeight(selectedImage.height)
          }
        }
        
        setSelectionMode('upload')
      } catch (error) {
        console.error('Failed to export image:', error)
        alert('Failed to export image for img2img')
      }
    })
  }

  const handleGenerate = async (e: Event) => {
    e.preventDefault()
    
    // If we have a selected canvas image, export it fresh
    let finalBase64 = baseImage
    if (selectedImageId) {
      try {
        finalBase64 = await exportImageAsBase64(selectedImageId)
      } catch (error) {
        console.error('Failed to export image:', error)
        alert('Failed to export image')
        return
      }
    }
    
    if (!finalBase64) {
      alert('Please upload an image first')
      return
    }
    
    if (!isLoading) {
      generateImg2Img(finalBase64, denoisingStrength)
    }
  }

  return (
    <div class="generation-panel">
      <h3 class="generation-panel-header">Image to Image</h3>
      <form class="generation-form" onSubmit={handleGenerate}>
        <div class="image-source-section">
          <label class="prompt-label">Source Image</label>
          
          {images.length > 0 && (
            <div class="toggle-group">
              <button
                type="button"
                class={selectionMode === 'upload' ? 'active' : ''}
                onClick={() => setSelectionMode('upload')}
                disabled={isLoading}
              >
                Upload New
              </button>
              <button
                type="button"
                class={selectionMode === 'canvas' ? 'active' : ''}
                onClick={handleSelectFromCanvas}
                disabled={isLoading}
              >
                Select from Canvas ({images.length})
              </button>
            </div>
          )}
          
          {selectedImageId && (
            <div class="selected-image-info">
              Selected: {selectedImageId}
            </div>
          )}
          
          <ImageUpload 
            onImageSelect={handleImageSelect} 
            currentImage={baseImage ? `data:image/png;base64,${baseImage}` : undefined} 
            disabled={isLoading} 
          />
        </div>

        <div class="prompt-group">
          <label class="prompt-label">Prompt</label>
          <textarea
            class="prompt-textarea"
            value={prompt}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            disabled={isLoading}
          />
        </div>

        <div class="prompt-group">
          <label class="prompt-label">Negative Prompt</label>
          <textarea
            class="prompt-textarea"
            value={negativePrompt}
            onInput={(e) => setNegativePrompt(e.currentTarget.value)}
            disabled={isLoading}
          />
        </div>

        <Slider
          label="Denoising Strength"
          value={denoisingStrength}
          onInput={setDenoisingStrength}
          min={0}
          max={1}
          step={0.05}
          disabled={isLoading}
        />

        <Dropdown
          label="Sampler"
          value={sampler}
          onInput={setSampler}
          options={samplers.map((s) => s.name)}
          disabled={isLoading}
        />

        <NumberInput label="Seed" value={seed} onInput={setSeed} disabled={isLoading} />

        <Slider label="Steps" value={steps} onInput={setSteps} min={1} max={100} step={1} disabled={isLoading} />

        <Slider label="CFG Scale" value={cfgScale} onInput={setCfgScale} min={1} max={30} step={0.5} disabled={isLoading} />

        <div class="size-inputs-group">
          <NumberInput label="Width" value={width} onInput={setWidth} disabled={isLoading} />
          <NumberInput label="Height" value={height} onInput={setHeight} disabled={isLoading} />
        </div>

        <div class="generation-actions">
          <button type="submit" class="btn btn-primary btn-block" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  )
}
