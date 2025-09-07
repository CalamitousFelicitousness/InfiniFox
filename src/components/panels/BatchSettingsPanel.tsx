import { useRef, useState } from 'preact/hooks'
import { Layers, ChevronRight } from 'lucide-preact'

import { useQueueStore } from '../../store/queueStore'

export function BatchSettingsPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { batchSettings, setBatchSettings } = useQueueStore()
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
    <div class={`panel batch-settings-panel ${isExpanded ? '' : 'collapsed'}`} ref={panelRef}>
      <div class="panel-header">
        <div class="d-flex items-center gap-2">
          <Layers class="icon-base" />
          <h3 class="panel-title">Batch Settings</h3>
        </div>
        <div class="d-flex items-center gap-2">
          <button
            class="settings-toggle"
            onPointerDown={(e) => {
              e.preventDefault()
              setIsExpanded(!isExpanded)
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronRight class="icon-base" />
          </button>
        </div>
      </div>

      <div class={`panel-content ${!isExpanded ? 'collapsed' : ''}`}>
        {isExpanded && (
          <>
            <div class="form-group">
              <label class="form-label">Batch Count</label>
              <input
                type="number"
                class="text-input-field"
                min="1"
                max="100"
                value={batchSettings.count}
                onInput={(e) =>
                  setBatchSettings({ count: parseInt(e.currentTarget.value) || 1 })
                }
              />
            </div>

            <div class="batch-variations">
              <h4 class="section-title">Variations</h4>
              
              <div class="form-group">
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    class="checkbox-input"
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
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">Vary Seed</span>
                </label>
                {batchSettings.variations.seed && (
                  <input
                    type="number"
                    class="text-input-field mt-2"
                    placeholder="Seed increment"
                    value={batchSettings.seedIncrement}
                    onInput={(e) =>
                      setBatchSettings({ seedIncrement: parseInt(e.currentTarget.value) || 1 })
                    }
                  />
                )}
              </div>

              <div class="form-group">
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    class="checkbox-input"
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
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">Vary Prompt</span>
                </label>
                {batchSettings.variations.prompt && (
                  <textarea
                    class="text-input-field textarea-field mt-2"
                    placeholder="Enter prompts (one per line)"
                    value={batchSettings.promptVariations.join('\n')}
                    onInput={(e) => handlePromptVariationsChange(e.currentTarget.value)}
                    rows={3}
                  />
                )}
              </div>

              <div class="form-group">
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    class="checkbox-input"
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
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">Vary Steps</span>
                </label>
                {batchSettings.variations.steps && (
                  <input
                    type="text"
                    class="text-input-field mt-2"
                    placeholder="e.g., 10, 20, 30"
                    value={batchSettings.stepsVariations.join(', ')}
                    onInput={(e) => handleStepsVariationsChange(e.currentTarget.value)}
                  />
                )}
              </div>

              <div class="form-group">
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    class="checkbox-input"
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
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">Vary CFG Scale</span>
                </label>
                {batchSettings.variations.cfgScale && (
                  <input
                    type="text"
                    class="text-input-field mt-2"
                    placeholder="e.g., 5.5, 7.5, 9.5"
                    value={batchSettings.cfgScaleVariations.join(', ')}
                    onInput={(e) => handleCfgScaleVariationsChange(e.currentTarget.value)}
                  />
                )}
              </div>
            </div>

            <div class="panel-footer">
              <p class="text-sm text-secondary">
                Total generations:{' '}
                <strong class="text-primary">
                  {batchSettings.count *
                    (batchSettings.variations.prompt ? batchSettings.promptVariations.length || 1 : 1) *
                    (batchSettings.variations.steps ? batchSettings.stepsVariations.length || 1 : 1) *
                    (batchSettings.variations.cfgScale ? batchSettings.cfgScaleVariations.length || 1 : 1)}
                </strong>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
