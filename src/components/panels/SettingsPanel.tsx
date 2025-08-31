import { useState, useEffect } from 'preact/hooks'

import { progressService } from '../../services/progress/ProgressService'
import { useStore } from '../../store/store'
import { Dropdown } from '../common/Dropdown'
import './SettingsPanel.css'

export function SettingsPanel() {
  const { apiSettings, setApiSettings, testConnection, detectApiType } = useStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [apiUrl, setApiUrl] = useState(apiSettings.apiUrl)
  const [wsUrl, setWsUrl] = useState(apiSettings.wsUrl)
  const [progressMethod, setProgressMethod] = useState(apiSettings.progressMethod)
  const [apiType, setApiType] = useState(apiSettings.apiType)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)
  const [detectedProgressMethod, setDetectedProgressMethod] = useState<string>('')

  const getApiFeatures = (type: string) => {
    const features: Record<string, { websocket: boolean; rest: boolean }> = {
      'sdnext': { websocket: false, rest: true },
      'a1111': { websocket: true, rest: true },
      'comfyui': { websocket: true, rest: false },
      'custom': { websocket: true, rest: true },
    }
    return features[type] || features.custom
  }

  useEffect(() => {
    setApiUrl(apiSettings.apiUrl)
    setWsUrl(apiSettings.wsUrl)
    setProgressMethod(apiSettings.progressMethod)
    setApiType(apiSettings.apiType)
  }, [apiSettings])

  const handleSave = async () => {
    await setApiSettings({ apiUrl, wsUrl, progressMethod, apiType })
    
    // Reconnect progress service
    progressService.disconnect()
    setTimeout(() => {
      progressService.connect().catch(console.error)
    }, 100)
    
    setConnectionStatus(null)
  }

  const handleTest = async () => {
    setIsTesting(true)
    setConnectionStatus(null)
    
    // Save settings temporarily for testing
    const originalSettings = { ...apiSettings }
    await setApiSettings({ apiUrl, wsUrl, progressMethod, apiType })
    
    const result = await testConnection()
    
    if (!result.connected) {
      // Restore original settings if test failed
      await setApiSettings(originalSettings)
    } else {
      // Detect API type
      const detectedType = await detectApiType()
      setApiType(detectedType as any)
      setDetectedProgressMethod(result.progressMethod)
    }
    
    setConnectionStatus(result.connected ? 'success' : 'error')
    setIsTesting(false)
    
    // Update the detected progress method
    setDetectedProgressMethod(result.progressMethod)
    
    // Clear status after 3 seconds
    setTimeout(() => setConnectionStatus(null), 3000)
  }

  const handleReset = () => {
    const defaultApiUrl = 'http://127.0.0.1:7860/sdapi/v1'
    const defaultWsUrl = '127.0.0.1:7860'
    setApiUrl(defaultApiUrl)
    setWsUrl(defaultWsUrl)
    setProgressMethod('auto')
    setApiType('sdnext')
    setApiSettings({ apiUrl: defaultApiUrl, wsUrl: defaultWsUrl, progressMethod: 'auto' as ProgressMethod, apiType: 'sdnext' as const })
    setConnectionStatus(null)
  }

  return (
    <div class="settings-panel">
      <div class="settings-header">
        <h3>⚙️ API Settings</h3>
        <button
          class="settings-toggle"
          onPointerDown={(e) => {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div class="settings-content">
          <div class="settings-group">
            <label>API URL</label>
            <div class="settings-input-group">
              <input
                type="text"
                class="settings-input"
                value={apiUrl}
                onInput={(e) => setApiUrl(e.currentTarget.value)}
                placeholder="http://127.0.0.1:7860/sdapi/v1"
              />
            </div>
            <div class="settings-hint">
              Example: http://127.0.0.1:7860/sdapi/v1
            </div>
          </div>

          <div class="settings-group">
            <label>WebSocket URL</label>
            <div class="settings-input-group">
              <input
                type="text"
                class="settings-input"
                value={wsUrl}
                onInput={(e) => setWsUrl(e.currentTarget.value)}
                placeholder="127.0.0.1:7860"
              />
            </div>
            <div class="settings-hint">
              Example: 127.0.0.1:7860 (without protocol)
            </div>
          </div>

          <Dropdown
            label="Progress Monitoring"
            value={progressMethod}
            onInput={(val) => setProgressMethod(val as any)}
            options={['auto', 'websocket', 'rest', 'none']}
          />
          <div class="settings-hint">
            Auto will detect the best available method
          </div>

          <Dropdown
            label="API Type"
            value={apiType}
            onInput={(val) => setApiType(val as any)}
            options={['sdnext', 'a1111', 'comfyui', 'custom']}
          />
          <div class="settings-hint">
            Helps optimize compatibility with different backends
            {apiType && (
              <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                Supports: {getApiFeatures(apiType).websocket ? '✅' : '❌'} WebSocket, 
                {' '}{getApiFeatures(apiType).rest ? '✅' : '❌'} REST Polling
              </div>
            )}
          </div>

          {connectionStatus && (
            <div class={`connection-status ${connectionStatus}`}>
              {connectionStatus === 'success' 
                ? `✅ Connected! API: ${apiType}, Progress: ${detectedProgressMethod}` 
                : '❌ Connection failed!'}
            </div>
          )}
          
          {detectedProgressMethod && connectionStatus === 'success' && (
            <div class="settings-hint">
              Progress monitoring: {detectedProgressMethod}
            </div>
          )}

          <div class="settings-input-group">
            <button class="test-btn" onPointerDown={handleTest} disabled={isTesting}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button class="test-btn" onPointerDown={handleSave} disabled={isTesting}>
              Save Settings
            </button>
            <button class="test-btn" onPointerDown={handleReset} disabled={isTesting}>
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
