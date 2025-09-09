import { Settings, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

import { progressService } from '../../services/progress/ProgressService'
import type { ProgressMethod } from '../../services/progress/types'
import { useStore } from '../../store/store'
import { Dropdown } from '../common/Dropdown'
import { Input } from '../common/Input'

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
      sdnext: { websocket: false, rest: true },
      a1111: { websocket: true, rest: true },
      comfyui: { websocket: true, rest: false },
      custom: { websocket: true, rest: true },
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
      setApiType(detectedType)
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
    setApiSettings({
      apiUrl: defaultApiUrl,
      wsUrl: defaultWsUrl,
      progressMethod: 'auto' as ProgressMethod,
      apiType: 'sdnext' as const,
    })
    setConnectionStatus(null)
  }

  return (
    <div className={`panel settings-panel ${isExpanded ? '' : 'collapsed'}`}>
      <div className="settings-header">
        <div className="d-flex items-center gap-2">
          <Settings className="icon-base" />
          <h3>API Settings</h3>
        </div>
        <button
          className="settings-toggle"
          onPointerDown={(e) => {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight className="icon-base" />
        </button>
      </div>

      <div className="settings-content">
        {isExpanded && (
          <>
            <div className="settings-group">
              <Input
                label="API URL"
                value={apiUrl}
                onInput={setApiUrl}
                placeholder="http://127.0.0.1:7860/sdapi/v1"
              />
              <div className="form-help">Example: http://127.0.0.1:7860/sdapi/v1</div>
            </div>

            <div className="settings-group">
              <Input
                label="WebSocket URL"
                value={wsUrl}
                onInput={setWsUrl}
                placeholder="127.0.0.1:7860"
              />
              <div className="form-help">Example: 127.0.0.1:7860 (without protocol)</div>
            </div>

            <div className="settings-group">
              <Dropdown
                label="Progress Monitoring"
                value={progressMethod}
                onInput={(val) => setProgressMethod(val as ProgressMethod)}
                options={['auto', 'websocket', 'rest', 'none']}
              />
              <div className="form-help">Auto will detect the best available method</div>
            </div>

            <div className="settings-group">
              <Dropdown
                label="API Type"
                value={apiType}
                onInput={(val) => setApiType(val as 'sdnext' | 'a1111' | 'comfyui' | 'custom')}
                options={['sdnext', 'a1111', 'comfyui', 'custom']}
              />
              <div className="form-help">
                Helps optimize compatibility with different backends
                {apiType && (
                  <div className="mt-1 text-xs">
                    Supports:{' '}
                    {getApiFeatures(apiType).websocket ? (
                      <CheckCircle className="icon-xs inline-icon success" />
                    ) : (
                      <XCircle className="icon-xs inline-icon error" />
                    )}{' '}
                    WebSocket,{' '}
                    {getApiFeatures(apiType).rest ? (
                      <CheckCircle className="icon-xs inline-icon success" />
                    ) : (
                      <XCircle className="icon-xs inline-icon error" />
                    )}{' '}
                    REST Polling
                  </div>
                )}
              </div>
            </div>

            {connectionStatus && (
              <div className={`settings-status ${connectionStatus}`}>
                {connectionStatus === 'success' ? (
                  <>
                    <CheckCircle className="icon-sm" />
                    <span>
                      Connected! API: {apiType}, Progress: {detectedProgressMethod}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="icon-sm" />
                    <span>Connection failed!</span>
                  </>
                )}
              </div>
            )}

            {detectedProgressMethod && connectionStatus === 'success' && (
              <div className="form-help">Progress monitoring: {detectedProgressMethod}</div>
            )}

            <div className="settings-actions">
              <button
                className="btn btn-sm btn-secondary"
                onPointerDown={handleTest}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                className="btn btn-sm btn-primary"
                onPointerDown={handleSave}
                disabled={isTesting}
              >
                Save Settings
              </button>
              <button className="btn btn-sm btn-ghost" onPointerDown={handleReset} disabled={isTesting}>
                Reset to Default
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
