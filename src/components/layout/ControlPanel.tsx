import { useState, useEffect } from 'preact/hooks'

import { Img2ImgPanel } from '../../features/generation/Img2ImgPanel'
import { Txt2ImgPanel } from '../../features/generation/Txt2ImgPanel'
import { InpaintPanel } from '../../features/generation/InpaintPanel'

import { useStore } from '../../store/store'
import { Dropdown } from '../common/Dropdown'
import { BatchSettingsPanel } from '../panels/BatchSettingsPanel'
import { HistoryPanel } from '../panels/HistoryPanel'
import { QueuePanel } from '../panels/QueuePanel'
import { SettingsPanel } from '../panels/SettingsPanel'
import { StorageStats } from '../panels/StorageStats'

import { Tabs } from './Tabs'

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState('txt2img')
  const { sdModel, setSdModel, sdModels, fetchSdModels, isModelLoading } = useStore()

  useEffect(() => {
    fetchSdModels()
  }, [fetchSdModels])

  const tabs = [
    { id: 'txt2img', label: 'Text to Image' },
    { id: 'img2img', label: 'Image to Image' },
    { id: 'inpaint', label: 'Inpainting' },
  ]

  return (
    <aside class="control-panel">
      <div class="panel-header">
        <h2>InfiniFox</h2>
        <Dropdown
          label=""
          value={sdModel}
          onInput={setSdModel}
          options={sdModels.map((m) => m.model_name)}
          disabled={isModelLoading}
          isLoading={isModelLoading}
        />
      </div>
      
      <div class="control-panel-content">
        <div class="tab-panel">
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
          <div class="tab-content">
            {activeTab === 'txt2img' && (
              <div class="tab-pane active">
                <Txt2ImgPanel />
              </div>
            )}
            {activeTab === 'img2img' && (
              <div class="tab-pane active">
                <Img2ImgPanel />
              </div>
            )}
            {activeTab === 'inpaint' && (
              <div class="tab-pane active">
                <InpaintPanel />
              </div>
            )}
          </div>
        </div>

        <SettingsPanel />
        <StorageStats />
        <BatchSettingsPanel />
        <QueuePanel />
        <HistoryPanel />
      </div>
    </aside>
  )
}
