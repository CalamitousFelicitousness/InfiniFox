import { useEffect } from 'react'

import { Dropdown } from '../../components/common/Dropdown'
import { NumberInput } from '../../components/common/NumberInput'
import { Slider } from '../../components/common/Slider'
import { Tooltip } from '../../components/common/Tooltip'
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
    setIsLoading,
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

  const handleCancel = () => {
    // Emergency cancel button
    setIsLoading(false)
  }

  return (
    <div className="generation-panel">
      <h3 className="generation-panel-header">Text to Image</h3>
      <form className="generation-form" onSubmit={handleGenerate}>
        <div className="prompt-group">
          <label className="prompt-label">Prompt</label>
          <textarea
            className="prompt-textarea"
            value={prompt}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            disabled={isLoading}
          />
        </div>

        <div className="prompt-group">
          <label className="prompt-label">Negative Prompt</label>
          <Tooltip content="Describe what you DON'T want to see in the image">
            <textarea
              className="prompt-textarea"
              value={negativePrompt}
              onInput={(e) => setNegativePrompt(e.currentTarget.value)}
              disabled={isLoading}
              placeholder="Things to avoid in the generation..."
            />
          </Tooltip>
        </div>

        <Dropdown
          label="Sampler"
          value={sampler}
          onInput={(val) => setSampler(val)}
          options={samplers.map((s) => s.name)}
          disabled={isLoading}
        />

        <Tooltip content="Use -1 for a random seed">
          <NumberInput
            label="Seed"
            value={seed}
            onInput={(val) => setSeed(val)}
            disabled={isLoading}
          />
        </Tooltip>

        <Tooltip content="More steps = higher quality but slower generation">
          <Slider
            label="Steps"
            value={steps}
            onInput={(val) => setSteps(val)}
            min={1}
            max={100}
            step={1}
            disabled={isLoading}
          />
        </Tooltip>

        <Tooltip content="How closely to follow the prompt (7-9 is usually best)">
          <Slider
            label="CFG Scale"
            value={cfgScale}
            onInput={(val) => setCfgScale(val)}
            min={1}
            max={30}
            step={0.5}
            disabled={isLoading}
          />
        </Tooltip>

        <div className="size-inputs-group">
          <NumberInput
            label="Width"
            value={width}
            onInput={(val) => setWidth(val)}
            min={256}
            max={2048}
            step={16}
            disabled={isLoading}
          />
          <NumberInput
            label="Height"
            value={height}
            onInput={(val) => setHeight(val)}
            min={256}
            max={2048}
            step={16}
            disabled={isLoading}
          />
        </div>

        <div className="generation-actions">
          <Tooltip content="Ctrl/Cmd + Enter">
            <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate'}
            </button>
          </Tooltip>

          {isLoading && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onPointerDown={(e) => {
                e.preventDefault()
                handleCancel()
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
