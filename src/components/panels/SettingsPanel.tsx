import { Settings, ChevronRight, CheckCircle, XCircle, Shield } from 'lucide-react'
import { useState, useEffect, useRef, lazy, Suspense, memo, createContext, useContext } from 'react'

// Context for Auth Debug Panel state
export const AuthDebugContext = createContext<{
  showAuthDebug: boolean
  setShowAuthDebug: (show: boolean) => void
}>({
  showAuthDebug: false,
  setShowAuthDebug: () => {},
})

import { progressService } from '../../services/progress/ProgressService'
import type { ProgressMethod } from '../../services/progress/types'
import { useStore } from '../../store/store'
import { AuthStatusIndicator } from '../auth/AuthStatusIndicator'
import { Dropdown } from '../common/Dropdown'
import { Input } from '../common/Input'

// Lazy load AuthConfigPanel to prevent unnecessary imports
const AuthConfigPanel = lazy(() =>
  import('../auth/AuthConfigPanel').then((module) => ({ default: module.AuthConfigPanel }))
)

// Memoize panel content to prevent recreation
const SettingsPanelContent = memo(function SettingsPanelContent({
  apiUrl,
  setApiUrl,
  wsUrl,
  setWsUrl,
  progressMethod,
  setProgressMethod,
  apiType,
  setApiType,
  handleSave,
  handleTest,
  handleReset,
  isTesting,
  connectionStatus,
  detectedProgressMethod,
  showAuthConfig,
  toggleAuthConfig,
  showAuthDebug,
  toggleAuthDebug,
}: {
  apiUrl: string
  setApiUrl: (url: string) => void
  wsUrl: string
  setWsUrl: (url: string) => void
  progressMethod: string
  setProgressMethod: (method: ProgressMethod) => void
  apiType: string
  setApiType: (type: 'sdnext' | 'a1111' | 'comfyui' | 'custom') => void
  handleSave: () => void
  handleTest: () => void
  handleReset: () => void
  isTesting: boolean
  connectionStatus: 'success' | 'error' | null
  detectedProgressMethod: string
  showAuthConfig: boolean
  toggleAuthConfig: () => void
  showAuthDebug: boolean
  toggleAuthDebug: () => void
}) {
  const getApiFeatures = (type: string) => {
    const features: Record<string, { websocket: boolean; rest: boolean }> = {
      sdnext: { websocket: false, rest: true },
      a1111: { websocket: true, rest: true },
      comfyui: { websocket: true, rest: false },
      custom: { websocket: true, rest: true },
    }
    return features[type] || features.custom
  }

  return (
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

      {/* Authentication Section */}
      <div className="settings-group">
        <button
          className="btn btn-sm btn-secondary w-full"
          onPointerDown={(e) => {
            e.preventDefault()
            toggleAuthConfig()
          }}
        >
          <Shield className="icon-sm inline-icon" />
          {showAuthConfig ? 'Hide' : 'Configure'} Authentication
        </button>
      </div>

      <div className={`auth-config-section ${!showAuthConfig ? 'collapsed' : ''}`}>
        <Suspense fallback={<div>Loading authentication settings...</div>}>
          <AuthConfigPanel
            isVisible={showAuthConfig}
            onToggleDebug={toggleAuthDebug}
            showAuthDebug={showAuthDebug}
          />
        </Suspense>
      </div>

      <div className="settings-actions">
        <button
          className="btn btn-sm btn-secondary"
          onPointerDown={handleTest}
          disabled={isTesting}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button className="btn btn-sm btn-primary" onPointerDown={handleSave} disabled={isTesting}>
          Save Settings
        </button>
        <button className="btn btn-sm btn-ghost" onPointerDown={handleReset} disabled={isTesting}>
          Reset to Default
        </button>
      </div>
    </>
  )
})

export function SettingsPanel() {
  const { apiSettings, setApiSettings, testConnection, detectApiType } = useStore()
  const { showAuthDebug, setShowAuthDebug } = useContext(AuthDebugContext)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAuthConfig, setShowAuthConfig] = useState(false)
  const [apiUrl, setApiUrl] = useState(apiSettings.apiUrl)
  const [wsUrl, setWsUrl] = useState(apiSettings.wsUrl)
  const [progressMethod, setProgressMethod] = useState(apiSettings.progressMethod)
  const [apiType, setApiType] = useState(apiSettings.apiType)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null)
  const [detectedProgressMethod, setDetectedProgressMethod] = useState<string>('')

  // Track mounted state
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      setShowAuthConfig(false)
    }
  }, [])

  useEffect(() => {
    setApiUrl(apiSettings.apiUrl)
    setWsUrl(apiSettings.wsUrl)
    setProgressMethod(apiSettings.progressMethod)
    setApiType(apiSettings.apiType)
  }, [apiSettings])

  // Clean up auth config when collapsed
  useEffect(() => {
    if (!isExpanded) {
      setShowAuthConfig(false)
    }
  }, [isExpanded])

  const handleSave = async () => {
    if (!isMountedRef.current) return

    await setApiSettings({ apiUrl, wsUrl, progressMethod, apiType })

    // Reconnect progress service
    progressService.disconnect()
    setTimeout(() => {
      if (isMountedRef.current) {
        progressService.connect().catch(console.error)
      }
    }, 100)

    setConnectionStatus(null)
  }

  const handleTest = async () => {
    if (!isMountedRef.current) return

    setIsTesting(true)
    setConnectionStatus(null)

    // Save settings temporarily for testing
    const originalSettings = { ...apiSettings }
    await setApiSettings({ apiUrl, wsUrl, progressMethod, apiType })

    const result = await testConnection()

    if (!isMountedRef.current) return

    if (!result.connected) {
      // Restore original settings if test failed
      await setApiSettings(originalSettings)
    } else {
      // Detect API type
      const detectedType = await detectApiType()
      if (isMountedRef.current) {
        setApiType(detectedType)
        setDetectedProgressMethod(result.progressMethod)
      }
    }

    if (isMountedRef.current) {
      setConnectionStatus(result.connected ? 'success' : 'error')
      setIsTesting(false)
      setDetectedProgressMethod(result.progressMethod)

      // Clear status after 3 seconds
      setTimeout(() => {
        if (isMountedRef.current) {
          setConnectionStatus(null)
        }
      }, 3000)
    }
  }

  const handleReset = () => {
    if (!isMountedRef.current) return

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

  const toggleAuthDebug = () => {
    setShowAuthDebug((prev) => {
      const newState = !prev
      localStorage.setItem('authDebugPanel', newState.toString())
      return newState
    })
  }

  const toggleAuthConfig = () => {
    setShowAuthConfig((prev) => !prev)
  }

  return (
    <div className={`panel settings-panel ${isExpanded ? '' : 'collapsed'}`}>
      <div className="settings-header">
        <div className="d-flex items-center gap-2">
          <Settings className="icon-base" />
          <h3>API Settings</h3>
          <AuthStatusIndicator />
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

      <div className={`settings-content ${!isExpanded ? 'collapsed' : ''}`}>
        <SettingsPanelContent
          apiUrl={apiUrl}
          setApiUrl={setApiUrl}
          wsUrl={wsUrl}
          setWsUrl={setWsUrl}
          progressMethod={progressMethod}
          setProgressMethod={setProgressMethod}
          apiType={apiType}
          setApiType={setApiType}
          handleSave={handleSave}
          handleTest={handleTest}
          handleReset={handleReset}
          isTesting={isTesting}
          connectionStatus={connectionStatus}
          detectedProgressMethod={detectedProgressMethod}
          showAuthConfig={showAuthConfig}
          toggleAuthConfig={toggleAuthConfig}
          showAuthDebug={showAuthDebug}
          toggleAuthDebug={toggleAuthDebug}
        />
      </div>
    </div>
  )
}
