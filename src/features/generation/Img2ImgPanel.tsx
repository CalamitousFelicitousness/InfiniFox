import { useState, useEffect } from 'preact/hooks'

import { Dropdown } from '../../components/common/Dropdown'
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
    exportImageAsBase64,
    images,
    activeImageRoles,
    setImageRole,
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

  // Auto-load image with img2img_init role
  useEffect(() => {
    const roleImage = activeImageRoles.find((r) => r.role === 'img2img_init')
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
    }
  }, [activeImageRoles, images])

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
      alert('Please select an image from canvas first')
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

        <Slider
          label="Steps"
          value={steps}
          onInput={setSteps}
          min={1}
          max={100}
          step={1}
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
