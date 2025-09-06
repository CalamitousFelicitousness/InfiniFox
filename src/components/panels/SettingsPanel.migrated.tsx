import { useState, useEffect } from 'preact/hooks'
import { SettingsIcon, ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon } from '../../components/icons'
import { progressService } from '../../services/progress/ProgressService'
import { useStore } from '../../store/store'
import { Dropdown } from '../common/Dropdown'

/**
 * Settings Panel Component - Migrated to Theme System
 * 
 * Migration changes:
 * 1. Replaced emoji icons with lucide icons
 * 2. Using semantic class names from theme system
 * 3. Removed component-specific CSS in favor of theme classes
 * 4. Using design tokens for all styling
 */
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
    setApiSettings({ 
      apiUrl: defaultApiUrl, 
      wsUrl: defaultWsUrl, 
      progressMethod: 'auto' as ProgressMethod, 
      apiType: 'sdnext' as const 
    })
    setConnectionStatus(null)
  }

  return (
    <div class="settings-panel">
      <div class="settings-header">
        <div class="d-flex items-center gap-2">
          <SettingsIcon size={16} class="text-secondary" />
          <h3>API Settings</h3>
        </div>
        <button
          class="icon-btn"
          onPointerDown={(e) => {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronDownIcon size={16} />
          ) : (
            <ChevronRightIcon size={16} />
          )}
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
            <div class="form-help">
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
            <div class="form-help">
              Example: 127.0.0.1:7860 (without protocol)
            </div>
          </div>

          <Dropdown
            label="Progress Monitoring"
            value={progressMethod}
            onInput={(val) => setProgressMethod(val as any)}
            options={['auto', 'websocket', 'rest', 'none']}
          />
          <div class="form-help">
            Auto will detect the best available method
          </div>

          <Dropdown
            label="API Type"
            value={apiType}
            onInput={(val) => setApiType(val as any)}
            options={['sdnext', 'a1111', 'comfyui', 'custom']}
          />
          <div class="form-help">
            Helps optimize compatibility with different backends
            {apiType && (
              <div class="mt-1 text-xs">
                Supports: {getApiFeatures(apiType).websocket ? (
                  <CheckCircleIcon size={12} class="text-success d-inline-block" />
                ) : (
                  <XCircleIcon size={12} class="text-error d-inline-block" />
                )} WebSocket,
                {' '}{getApiFeatures(apiType).rest ? (
                  <CheckCircleIcon size={12} class="text-success d-inline-block" />
                ) : (
                  <XCircleIcon size={12} class="text-error d-inline-block" />
                )} REST Polling
              </div>
            )}
          </div>

          {connectionStatus && (
            <div class={`connection-status ${connectionStatus}`}>
              <div class="d-flex items-center gap-2">
                {connectionStatus === 'success' ? (
                  <>
                    <CheckCircleIcon size={16} />
                    <span>Connected! API: {apiType}, Progress: {detectedProgressMethod}</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon size={16} />
                    <span>Connection failed!</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {detectedProgressMethod && connectionStatus === 'success' && (
            <div class="form-help">
              Progress monitoring: {detectedProgressMethod}
            </div>
          )}

          <div class="d-flex gap-2">
            <button 
              class="btn btn-secondary" 
              onPointerDown={handleTest} 
              disabled={isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              class="btn btn-primary" 
              onPointerDown={handleSave} 
              disabled={isTesting}
            >
              Save Settings
            </button>
            <button 
              class="btn btn-ghost" 
              onPointerDown={handleReset} 
              disabled={isTesting}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
