import { useState, useEffect } from 'react'

import InfiniFoxIcon from '../../assets/InfiniFox.svg'
import { Img2ImgPanel } from '../../features/generation/Img2ImgPanel'
import { InpaintPanel } from '../../features/generation/InpaintPanel'
import { Txt2ImgPanel } from '../../features/generation/Txt2ImgPanel'
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
    <aside className="control-panel">
      <div className="panel-header">
        <img src={InfiniFoxIcon} alt="InfiniFox" style={{ height: '64px', width: 'auto' }} />
        <Dropdown
          label=""
          value={sdModel}
          onInput={setSdModel}
          options={sdModels.map((m) => m.model_name)}
          disabled={isModelLoading}
          isLoading={isModelLoading}
        />
      </div>

      <div className="control-panel-content">
        <div className="tab-panel">
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="tab-content">
            {activeTab === 'txt2img' && (
              <div className="tab-pane active">
                <Txt2ImgPanel />
              </div>
            )}
            {activeTab === 'img2img' && (
              <div className="tab-pane active">
                <Img2ImgPanel />
              </div>
            )}
            {activeTab === 'inpaint' && (
              <div className="tab-pane active">
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
