import { useState } from 'preact/hooks'

import { Dropdown } from '../../components/common/Dropdown'
import { ImageUpload } from '../../components/common/ImageUpload'
import { NumberInput } from '../../components/common/NumberInput'
import { Slider } from '../../components/common/Slider'
import { useStore } from '../../store/store'

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
  } = useStore()

  const [baseImage, setBaseImage] = useState<string>('')
  const [denoisingStrength, setDenoisingStrength] = useState(0.75)

  const handleImageSelect = (base64: string, imgWidth: number, imgHeight: number) => {
    setBaseImage(base64)
    if (imgWidth && imgHeight) {
      // Optionally update dimensions to match source image
      setWidth(imgWidth)
      setHeight(imgHeight)
    }
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
        <ImageUpload onImageSelect={handleImageSelect} disabled={isLoading} />

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
