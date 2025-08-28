import { useEffect } from 'preact/hooks'

import { Dropdown } from '../../components/common/Dropdown'
import { NumberInput } from '../../components/common/NumberInput'
import { Slider } from '../../components/common/Slider'
import { useStore } from '../../store/store'
import './Txt2ImgPanel.css'

export function Txt2ImgPanel() {
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
    fetchSamplers,
    generateTxt2Img,
    isLoading,
  } = useStore()

  useEffect(() => {
    fetchSamplers()
  }, [fetchSamplers])

  const handleGenerate = (e: Event) => {
    e.preventDefault()
    if (!isLoading) {
      generateTxt2Img()
    }
  }

  return (
    <>
      <h3>Text to Image</h3>
      <form onSubmit={handleGenerate}>
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

        <Dropdown
          label="Sampler"
          value={sampler}
          onInput={(val) => setSampler(val)}
          options={samplers.map((s) => s.name)}
          disabled={isLoading}
        />

        <NumberInput
          label="Seed"
          value={seed}
          onInput={(val) => setSeed(val)}
          disabled={isLoading}
        />

        <Slider
          label="Steps"
          value={steps}
          onInput={(val) => setSteps(val)}
          min={1}
          max={100}
          step={1}
          disabled={isLoading}
        />

        <Slider
          label="CFG Scale"
          value={cfgScale}
          onInput={(val) => setCfgScale(val)}
          min={1}
          max={30}
          step={0.5}
          disabled={isLoading}
        />

        <div class="size-inputs">
          <NumberInput
            label="Width"
            value={width}
            onInput={(val) => setWidth(val)}
            disabled={isLoading}
          />
          <NumberInput
            label="Height"
            value={height}
            onInput={(val) => setHeight(val)}
            disabled={isLoading}
          />
        </div>

        <button type="submit" class="generate-btn" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </form>
    </>
  )
}
