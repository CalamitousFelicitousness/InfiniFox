import { useState, useEffect } from 'preact/hooks'

import { Dropdown } from '../../components/common/Dropdown'
import { ImageUpload } from '../../components/common/ImageUpload'
import { NumberInput } from '../../components/common/NumberInput'
import { Slider } from '../../components/common/Slider'
import { useStore } from '../../store/store'

import { MaskEditor } from './MaskEditor'
import './InpaintPanel.css'

export function InpaintPanel() {
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
    generateInpaint,
    isLoading,
    startCanvasSelection,
    images,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [maskImage, setMaskImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [maskBlur, setMaskBlur] = useState(4)
  const [maskMode, setMaskMode] = useState<'draw' | 'upload'>('draw')
  const [imageSourceMode, setImageSourceMode] = useState<'upload' | 'canvas'>('upload')
  const [inpaintingFill, setInpaintingFill] = useState<'fill' | 'original' | 'latent_noise' | 'latent_nothing'>('original')
  const [inpaintFullRes, setInpaintFullRes] = useState(true)
  const [inpaintFullResPadding, setInpaintFullResPadding] = useState(32)

  const handleImageSelect = (base64: string, imgWidth: number, imgHeight: number) => {
    setBaseImage(base64)
    if (imgWidth && imgHeight) {
      setWidth(imgWidth)
      setHeight(imgHeight)
    }
  }

  const handleSelectFromCanvas = () => {
    setImageSourceMode('canvas')
    startCanvasSelection('inpaint', (imageId: string, imageSrc: string) => {
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
        setImageSourceMode('upload')
      }
      img.src = imageSrc.includes('data:image') ? imageSrc : `data:image/png;base64,${imageSrc}`
    })
  }

  const handleMaskSelect = (base64: string) => {
    setMaskImage(base64)
  }

  const handleMaskDrawn = (maskDataUrl: string) => {
    // Convert data URL to base64
    const base64 = maskDataUrl.split(',')[1]
    setMaskImage(base64)
  }

  const handleGenerate = (e: Event) => {
    e.preventDefault()
    if (!baseImage) {
      alert('Please upload an image first')
      return
    }
    if (!maskImage) {
      alert('Please draw or upload a mask')
      return
    }
    if (!isLoading) {
      generateInpaint({
        baseImage,
        maskImage,
        denoisingStrength,
        maskBlur,
        inpaintingFill,
        inpaintFullRes,
        inpaintFullResPadding,
      })
    }
  }

  return (
    <div class="generation-panel">
      <h3 class="generation-panel-header">Inpainting</h3>
      <form class="generation-form" onSubmit={handleGenerate}>
        <div class="image-source-section">
          <label class="prompt-label">Base Image</label>
          
          {images.length > 0 && (
            <div class="toggle-group">
              <button
                type="button"
                class={imageSourceMode === 'upload' ? 'active' : ''}
                onClick={() => setImageSourceMode('upload')}
                disabled={isLoading}
              >
                Upload New
              </button>
              <button
                type="button"
                class={imageSourceMode === 'canvas' ? 'active' : ''}
                onClick={handleSelectFromCanvas}
                disabled={isLoading}
              >
                Select from Canvas ({images.length})
              </button>
            </div>
          )}
          
          <ImageUpload onImageSelect={handleImageSelect} currentImage={baseImage ? `data:image/png;base64,${baseImage}` : undefined} disabled={isLoading} />
        </div>

        {baseImage && (
          <div class="mask-section">
            <div class="toggle-group toggle-group-compact">
              <button
                type="button"
                class={maskMode === 'draw' ? 'active' : ''}
                onClick={() => setMaskMode('draw')}
              >
                Draw Mask
              </button>
              <button
                type="button"
                class={maskMode === 'upload' ? 'active' : ''}
                onClick={() => setMaskMode('upload')}
              >
                Upload Mask
              </button>
            </div>

            {maskMode === 'draw' ? (
              <MaskEditor
                baseImage={`data:image/png;base64,${baseImage}`}
                onMaskUpdate={handleMaskDrawn}
                disabled={isLoading}
              />
            ) : (
              <ImageUpload
                onImageSelect={(base64) => handleMaskSelect(base64)}
                disabled={isLoading}
              />
            )}
          </div>
        )}

        <div class="prompt-group">
          <label class="prompt-label">Prompt</label>
          <textarea
            class="prompt-textarea"
            value={prompt}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            disabled={isLoading}
            placeholder="Describe what should appear in the masked area..."
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

        <Slider
          label="Mask Blur"
          value={maskBlur}
          onInput={setMaskBlur}
          min={0}
          max={64}
          step={1}
          disabled={isLoading}
        />

        <Dropdown
          label="Inpainting Fill Mode"
          value={inpaintingFill}
          onInput={(val) => setInpaintingFill(val as any)}
          options={['fill', 'original', 'latent_noise', 'latent_nothing']}
          disabled={isLoading}
        />

        <div class="checkbox-group">
          <input
            type="checkbox"
            id="inpaint-full-res"
            class="checkbox-input"
            checked={inpaintFullRes}
            onChange={(e) => setInpaintFullRes(e.currentTarget.checked)}
            disabled={isLoading}
          />
          <div class="checkbox-box"></div>
          <label for="inpaint-full-res" class="checkbox-label">
            Inpaint at Full Resolution
          </label>
        </div>

        {inpaintFullRes && (
          <Slider
            label="Full Resolution Padding"
            value={inpaintFullResPadding}
            onInput={setInpaintFullResPadding}
            min={0}
            max={256}
            step={4}
            disabled={isLoading}
          />
        )}

        <Dropdown
          label="Sampler"
          value={sampler}
          onInput={setSampler}
          options={samplers.map((s) => s.name)}
          disabled={isLoading}
        />

        <NumberInput label="Seed" value={seed} onInput={setSeed} disabled={isLoading} />
        <Slider label="Steps" value={steps} onInput={setSteps} min={1} max={100} disabled={isLoading} />
        <Slider label="CFG Scale" value={cfgScale} onInput={setCfgScale} min={1} max={30} step={0.5} disabled={isLoading} />

        <div class="generation-actions">
          <button type="submit" class="btn btn-primary btn-block" disabled={isLoading || !maskImage}>
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  )
}
