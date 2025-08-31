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
    images,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [selectionMode, setSelectionMode] = useState<'upload' | 'canvas'>('upload')

  const handleImageSelect = (base64: string, imgWidth: number, imgHeight: number) => {
    setBaseImage(base64)
    if (imgWidth && imgHeight) {
      // Optionally update dimensions to match source image
      setWidth(imgWidth)
      setHeight(imgHeight)
    }
  }

  const handleSelectFromCanvas = () => {
    setSelectionMode('canvas')
    startCanvasSelection('img2img', (imageId: string, imageSrc: string) => {
      // Remove data URL prefix if present
      const base64 = imageSrc.includes('base64,') 
        ? imageSrc.split(',')[1] 
        : imageSrc
      
      // Get image dimensions
      const img = new Image()
      img.onload = () => {
        setBaseImage(base64)
        setWidth(img.width)
        setHeight(img.height)
        setSelectionMode('upload')
      }
      img.src = imageSrc.includes('data:image') ? imageSrc : `data:image/png;base64,${imageSrc}`
    })
  }

  const handleGenerate = (e: Event) => {
    e.preventDefault()
    if (!baseImage) {
      alert('Please upload an image first')
      return
    }
    if (!isLoading) {
      generateImg2Img(baseImage, denoisingStrength)
    }
  }

  return (
    <>
      <h3>Image to Image</h3>
      <form onSubmit={handleGenerate}>
        <div class="img2img-source-section">
          <label>Source Image</label>
          
          {images.length > 0 && (
            <div class="source-mode-toggle">
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
          
          <ImageUpload onImageSelect={handleImageSelect} currentImage={baseImage ? `data:image/png;base64,${baseImage}` : undefined} disabled={isLoading} />
        </div>

        <label>Prompt</label>
        <textarea
          value={prompt}
          onInput={(e) => setPrompt(e.currentTarget.value)}
          disabled={isLoading}
        />

        <label>Negative Prompt</label>
        <textarea
          value={negativePrompt}
          onInput={(e) => setNegativePrompt(e.currentTarget.value)}
          disabled={isLoading}
        />

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

        <div class="size-inputs">
          <NumberInput label="Width" value={width} onInput={setWidth} disabled={isLoading} />
          <NumberInput label="Height" value={height} onInput={setHeight} disabled={isLoading} />
        </div>

        <button type="submit" class="generate-btn" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </form>
    </>
  )
}
