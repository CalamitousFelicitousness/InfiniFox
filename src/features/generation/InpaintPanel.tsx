import { useState, useEffect } from 'preact/hooks'

import { Dropdown } from '../../components/common/Dropdown'
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
    images,
    activeImageRoles,
    setImageRole,
    exportImageAsBase64,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [maskImage, setMaskImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [maskBlur, setMaskBlur] = useState(4)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [inpaintingFill, setInpaintingFill] = useState<
    'fill' | 'original' | 'latent_noise' | 'latent_nothing'
  >('original')
  const [inpaintFullRes, setInpaintFullRes] = useState(true)
  const [inpaintFullResPadding, setInpaintFullResPadding] = useState(32)

  // Auto-load image with inpaint_image role
  useEffect(() => {
    const roleImage = activeImageRoles.find((r) => r.role === 'inpaint_image')
    if (roleImage) {
      const image = images.find((img) => img.id === roleImage.imageId)
      if (image) {
        exportImageAsBase64(roleImage.imageId)
          .then((base64) => {
            setBaseImage(base64)
            setSelectedImageId(roleImage.imageId)
            if (image.width && image.height) {
              setWidth(image.width)
              setHeight(image.height)
            }
          })
          .catch((error) => {
            console.error('Failed to load role-assigned image:', error)
          })
      }
    } else {
      setBaseImage('')
      setSelectedImageId(null)
      setMaskImage('')
    }
  }, [activeImageRoles, images])

  const handleMaskDrawn = (maskDataUrl: string) => {
    // Convert data URL to base64
    const base64 = maskDataUrl.split(',')[1]
    setMaskImage(base64)
  }

  const handleGenerate = (e: Event) => {
    e.preventDefault()
    if (!baseImage) {
      alert('Please select an image from canvas first')
      return
    }
    if (!maskImage) {
      alert('Please draw a mask')
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
        {baseImage && (
          <div class="mask-section">
            <MaskEditor
              baseImage={`data:image/png;base64,${baseImage}`}
              onMaskUpdate={handleMaskDrawn}
              disabled={isLoading}
            />
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
        <Slider
          label="Steps"
          value={steps}
          onInput={setSteps}
          min={1}
          max={100}
          disabled={isLoading}
        />
        <Slider
          label="CFG Scale"
          value={cfgScale}
          onInput={setCfgScale}
          min={1}
          max={30}
          step={0.5}
          disabled={isLoading}
        />

        <div class="generation-actions">
          <button
            type="submit"
            class="btn btn-primary btn-block"
            disabled={isLoading || !maskImage}
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </form>
    </div>
  )
}
