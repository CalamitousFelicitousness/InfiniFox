import { useState, useEffect } from 'preact/hooks'

import { Img2ImgPanel } from '../../features/generation/Img2ImgPanel'
import { Txt2ImgPanel } from '../../features/generation/Txt2ImgPanel'
import { InpaintPanel } from '../../features/inpaint/InpaintPanel'
import { useStore } from '../../store/store'
import { Dropdown } from '../common/Dropdown'
import { BatchSettingsPanel } from '../panels/BatchSettingsPanel'
import { HistoryPanel } from '../panels/HistoryPanel'
import { QueuePanel } from '../panels/QueuePanel'

import { Tabs } from './Tabs'
import './ControlPanel.css'

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState('txt2img')
  const { sdModel, setSdModel, sdModels, fetchSdModels } = useStore()

  useEffect(() => {
    fetchSdModels()
  }, [fetchSdModels])

  const tabs = [
    { id: 'txt2img', label: 'Text to Image' },
    { id: 'img2img', label: 'Image to Image' },
    { id: 'inpaint', label: 'Inpainting' },
  ]

  const handleModelChange = (modelName: string) => {
    const model = sdModels.find((m) => m.model_name === modelName)
    if (model) {
      setSdModel(model.title)
    }
  }

  return (
    <aside class="control-panel">
      <div class="panel-header">
        <h2>SD.Next</h2>
        <Dropdown
          label=""
          value={sdModel}
          onInput={handleModelChange}
          options={sdModels.map((m) => m.model_name)}
        />
      </div>
      <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      {activeTab === 'txt2img' && <Txt2ImgPanel />}
      {activeTab === 'img2img' && <Img2ImgPanel />}
      {activeTab === 'inpaint' && <InpaintPanel />}

      <BatchSettingsPanel />
      <QueuePanel />
      <HistoryPanel />
    </aside>
  )
}
