import { useRef } from 'preact/hooks'

import { useQueueStore } from '../../store/queueStore'
import './BatchSettingsPanel.css'

export function BatchSettingsPanel() {
  const { batchSettings, setBatchSettings, toggleBatchMode } = useQueueStore()
  const panelRef = useRef<HTMLDivElement>(null)

  const handlePromptVariationsChange = (value: string) => {
    const variations = value.split('\n').filter((v) => v.trim())
    setBatchSettings({ promptVariations: variations })
  }

  const handleStepsVariationsChange = (value: string) => {
    const variations = value
      .split(',')
      .map((v) => parseInt(v.trim()))
      .filter((v) => !isNaN(v))
    setBatchSettings({ stepsVariations: variations })
  }

  const handleCfgScaleVariationsChange = (value: string) => {
    const variations = value
      .split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v))
    setBatchSettings({ cfgScaleVariations: variations })
  }

  return (
    <div class="batch-settings-panel" ref={panelRef}>
      <div class="batch-header">
        <h3>Batch Settings</h3>
        <label 
          class="batch-toggle"
          onPointerDown={(e) => {
            e.preventDefault()
            toggleBatchMode()
          }}
        >
          <input
            type="checkbox"
            checked={batchSettings.enabled}
            onChange={toggleBatchMode}
            tabIndex={-1}
          />
          <span>Enable Batch Mode</span>
        </label>
      </div>

      {batchSettings.enabled && (
        <div class="batch-content">
          <div class="batch-count">
            <label>Batch Count</label>
            <input
              type="number"
              min="1"
              max="100"
              value={batchSettings.count}
              onInput={(e) =>
                setBatchSettings({ count: parseInt(e.currentTarget.value) || 1 })
              }
            />
          </div>

          <div class="batch-variations">
            <h4>Variations</h4>
            
            <div class="variation-group">
              <label>
                <input
                  type="checkbox"
                  checked={batchSettings.variations.seed}
                  onChange={(e) =>
                    setBatchSettings({
                      variations: {
                        ...batchSettings.variations,
                        seed: e.currentTarget.checked,
                      },
                    })
                  }
                />
                <span>Vary Seed</span>
              </label>
              {batchSettings.variations.seed && (
                <input
                  type="number"
                  placeholder="Seed increment"
                  value={batchSettings.seedIncrement}
                  onInput={(e) =>
                    setBatchSettings({ seedIncrement: parseInt(e.currentTarget.value) || 1 })
                  }
                />
              )}
            </div>

            <div class="variation-group">
              <label>
                <input
                  type="checkbox"
                  checked={batchSettings.variations.prompt}
                  onChange={(e) =>
                    setBatchSettings({
                      variations: {
                        ...batchSettings.variations,
                        prompt: e.currentTarget.checked,
                      },
                    })
                  }
                />
                <span>Vary Prompt</span>
              </label>
              {batchSettings.variations.prompt && (
                <textarea
                  placeholder="Enter prompts (one per line)"
                  value={batchSettings.promptVariations.join('\n')}
                  onInput={(e) => handlePromptVariationsChange(e.currentTarget.value)}
                  rows={3}
                />
              )}
            </div>

            <div class="variation-group">
              <label>
                <input
                  type="checkbox"
                  checked={batchSettings.variations.steps}
                  onChange={(e) =>
                    setBatchSettings({
                      variations: {
                        ...batchSettings.variations,
                        steps: e.currentTarget.checked,
                      },
                    })
                  }
                />
                <span>Vary Steps</span>
              </label>
              {batchSettings.variations.steps && (
                <input
                  type="text"
                  placeholder="e.g., 10, 20, 30"
                  value={batchSettings.stepsVariations.join(', ')}
                  onInput={(e) => handleStepsVariationsChange(e.currentTarget.value)}
                />
              )}
            </div>

            <div class="variation-group">
              <label>
                <input
                  type="checkbox"
                  checked={batchSettings.variations.cfgScale}
                  onChange={(e) =>
                    setBatchSettings({
                      variations: {
                        ...batchSettings.variations,
                        cfgScale: e.currentTarget.checked,
                      },
                    })
                  }
                />
                <span>Vary CFG Scale</span>
              </label>
              {batchSettings.variations.cfgScale && (
                <input
                  type="text"
                  placeholder="e.g., 5.5, 7.5, 9.5"
                  value={batchSettings.cfgScaleVariations.join(', ')}
                  onInput={(e) => handleCfgScaleVariationsChange(e.currentTarget.value)}
                />
              )}
            </div>
          </div>

          <div class="batch-info">
            <p>
              Total generations: {' '}
              <strong>
                {batchSettings.count *
                  (batchSettings.variations.prompt ? batchSettings.promptVariations.length || 1 : 1) *
                  (batchSettings.variations.steps ? batchSettings.stepsVariations.length || 1 : 1) *
                  (batchSettings.variations.cfgScale ? batchSettings.cfgScaleVariations.length || 1 : 1)}
              </strong>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
