import React, { useState, useEffect, useRef } from 'react'

import type { StrategyConfig } from '../../store/slices/authSlice'
import { useStore } from '../../store/store'

interface AuthConfigPanelProps {
  isVisible?: boolean
  onToggleDebug?: () => void
  showAuthDebug?: boolean
}

export const AuthConfigPanel: React.FC<AuthConfigPanelProps> = ({ 
  isVisible = true,
  onToggleDebug,
  showAuthDebug = false
}) => {
  const {
    strategies,
    activeStrategy,
    authStatus,
    authError,
    isAuthenticated,
    tokenExpiry,
    registerStrategy,
    unregisterStrategy,
    activateStrategy,
    authenticate,
    refreshToken,
    logout,
    clearError,
  } = useStore()

  const [selectedStrategy, setSelectedStrategy] = useState<string>('')
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>({
    type: 'no-auth',
  })
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [strategyName, setStrategyName] = useState('')
  const [timeToExpiry, setTimeToExpiry] = useState<string>('')

  // Refs for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Token expiry countdown
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!tokenExpiry || !isMountedRef.current || !isVisible) {
      setTimeToExpiry('')
      return
    }

    const updateCountdown = () => {
      if (!isMountedRef.current) return

      const now = Date.now()
      const remaining = tokenExpiry - now
      if (remaining <= 0) {
        setTimeToExpiry('Expired')
        return
      }
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setTimeToExpiry(`${minutes}m ${seconds}s`)
    }

    updateCountdown()
    intervalRef.current = setInterval(updateCountdown, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [tokenExpiry, isVisible])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Clear state to prevent memory leaks
      setSelectedStrategy('')
      setStrategyConfig({ type: 'no-auth' })
      setCredentials({})
      setStrategyName('')
      setTimeToExpiry('')
    }
  }, [])

  const handleRegisterStrategy = () => {
    if (!strategyName || !isMountedRef.current) return
    registerStrategy(strategyName, strategyConfig)
    setStrategyName('')
  }

  const handleActivateStrategy = async () => {
    if (!selectedStrategy || !isMountedRef.current) return
    try {
      await activateStrategy(selectedStrategy)
    } catch (error) {
      console.error('Failed to activate strategy:', error)
    }
  }

  const handleAuthenticate = async () => {
    if (!isMountedRef.current) return
    try {
      await authenticate(credentials)
      if (isMountedRef.current) {
        setCredentials({})
      }
    } catch (error) {
      console.error('Authentication failed:', error)
    }
  }

  const handleRefreshToken = async () => {
    if (!isMountedRef.current) return
    try {
      await refreshToken()
    } catch (error) {
      console.error('Token refresh failed:', error)
    }
  }

  const handleLogout = async () => {
    if (!isMountedRef.current) return
    try {
      await logout()
      if (isMountedRef.current) {
        setCredentials({})
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const getCredentialFields = () => {
    switch (strategyConfig.type) {
      case 'api-key':
        return ['apiKey']
      case 'bearer-token':
        return ['token']
      case 'basic-auth':
        return ['username', 'password']
      case 'oauth2':
        return ['clientId', 'clientSecret', 'code', 'state']
      case 'jwt':
        return ['username', 'password']
      case 'hmac':
        return ['secretKey']
      case 'custom-header':
        return []
      case 'no-auth':
      default:
        return []
    }
  }

  // Memoize strategy keys to prevent recreation
  const strategyKeys = React.useMemo(() => {
    return strategies instanceof Map ? Array.from(strategies.keys()) : []
  }, [strategies])

  return (
    <div className="auth-config-panel glass-panel">
      <h3 className="glass-text mb-4">Authentication Configuration</h3>

      {/* Status Indicator */}
      <div className="auth-status mb-4">
        <div className="flex items-center gap-2">
          <div
            className={`status-indicator ${
              isAuthenticated
                ? 'bg-success'
                : authStatus === 'authenticating' || authStatus === 'refreshing'
                  ? 'bg-warning pulse'
                  : authStatus === 'error'
                    ? 'bg-error'
                    : 'bg-neutral'
            }`}
          />
          <span className="glass-text">
            {authStatus === 'authenticating'
              ? 'Authenticating...'
              : authStatus === 'refreshing'
                ? 'Refreshing token...'
                : authStatus === 'authenticated'
                  ? 'Authenticated'
                  : authStatus === 'error'
                    ? 'Authentication Error'
                    : 'Not Authenticated'}
          </span>
          {tokenExpiry && isAuthenticated && (
            <span className="glass-text-secondary ml-2">(Expires in: {timeToExpiry})</span>
          )}
        </div>
        {authError && (
          <div className="error-message mt-2">
            <span className="text-error">{authError.message}</span>
            <button onClick={clearError} className="ml-2 text-xs underline">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Strategy Registration */}
      <div className="strategy-registration mb-4">
        <h4 className="glass-text-secondary mb-2">Register Strategy</h4>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            placeholder="Strategy name"
            className="glass-input flex-1"
          />
          <select
            value={strategyConfig.type}
            onChange={(e) =>
              setStrategyConfig({
                ...strategyConfig,
                type: e.target.value as StrategyConfig['type'],
              })
            }
            className="glass-select"
          >
            <option value="no-auth">No Auth</option>
            <option value="api-key">API Key</option>
            <option value="bearer-token">Bearer Token</option>
            <option value="basic-auth">Basic Auth</option>
            <option value="oauth2">OAuth2</option>
            <option value="jwt">JWT</option>
            <option value="hmac">HMAC</option>
            <option value="custom-header">Custom Header</option>
          </select>
          <button
            onClick={handleRegisterStrategy}
            disabled={!strategyName}
            className="glass-button"
          >
            Register
          </button>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="strategy-selection mb-4">
        <h4 className="glass-text-secondary mb-2">Active Strategy</h4>
        <div className="flex gap-2">
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="glass-select flex-1"
          >
            <option value="">Select a strategy</option>
            {strategyKeys.map((name) => (
              <option key={name} value={name}>
                {name} ({strategies.get(name)?.type})
              </option>
            ))}
          </select>
          <button
            onClick={handleActivateStrategy}
            disabled={!selectedStrategy}
            className="glass-button"
          >
            Activate
          </button>
          {activeStrategy && (
            <button
              onClick={() => unregisterStrategy(activeStrategy)}
              className="glass-button-danger"
            >
              Remove
            </button>
          )}
        </div>
        {activeStrategy && (
          <div className="mt-2 text-sm glass-text-secondary">Active: {activeStrategy}</div>
        )}
      </div>

      {/* Credentials Form */}
      {activeStrategy && getCredentialFields().length > 0 && (
        <div className="credentials-form mb-4">
          <h4 className="glass-text-secondary mb-2">Credentials</h4>
          {getCredentialFields().map((field) => (
            <div key={field} className="mb-2">
              <input
                type={field.includes('password') || field.includes('secret') ? 'password' : 'text'}
                value={credentials[field] || ''}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    [field]: e.target.value,
                  })
                }
                placeholder={field}
                className="glass-input w-full"
              />
            </div>
          ))}
          <button onClick={handleAuthenticate} className="glass-button mr-2">
            Authenticate
          </button>
        </div>
      )}

      {/* Actions */}
      {isAuthenticated && (
        <div className="auth-actions">
          <button onClick={handleRefreshToken} className="glass-button mr-2">
            Refresh Token
          </button>
          <button onClick={handleLogout} className="glass-button-secondary">
            Logout
          </button>
        </div>
      )}

      {/* Debug Panel Toggle - Development Only */}
      {import.meta.env.DEV && (
        <div className="auth-debug-toggle-section" style={{ marginTop: '1rem' }}>
          <button
            onClick={onToggleDebug}
            className={`btn btn-sm ${showAuthDebug ? 'btn-success' : 'btn-secondary'} w-full`}
          >
            <span style={{ marginRight: '0.5rem' }}>🔍</span>
            {showAuthDebug ? 'Hide' : 'Show'} Debug Panel
          </button>
          {showAuthDebug && (
            <div className="form-help mt-2">
              Debug panel is active - monitoring all auth requests
            </div>
          )}
        </div>
      )}
    </div>
  )
}
