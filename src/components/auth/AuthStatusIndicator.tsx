import React, { useState, useEffect } from 'react'

import { useStore } from '../../store/store'

export const AuthStatusIndicator: React.FC = () => {
  const { authStatus, isAuthenticated, tokenExpiry } = useStore()

  const [timeToExpiry, setTimeToExpiry] = useState<string>('')

  useEffect(() => {
    if (!tokenExpiry) {
      setTimeToExpiry('')
      return
    }

    const updateCountdown = () => {
      const now = Date.now()
      const remaining = tokenExpiry - now
      if (remaining <= 0) {
        setTimeToExpiry('Expired')
        return
      }

      if (remaining < 60000) {
        const seconds = Math.floor(remaining / 1000)
        setTimeToExpiry(`${seconds}s`)
      } else if (remaining < 3600000) {
        const minutes = Math.floor(remaining / 60000)
        const seconds = Math.floor((remaining % 60000) / 1000)
        setTimeToExpiry(`${minutes}m ${seconds}s`)
      } else {
        const hours = Math.floor(remaining / 3600000)
        const minutes = Math.floor((remaining % 3600000) / 60000)
        setTimeToExpiry(`${hours}h ${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [tokenExpiry])

  const getStatusColor = () => {
    if (isAuthenticated) return 'success'
    if (authStatus === 'authenticating' || authStatus === 'refreshing') return 'warning'
    if (authStatus === 'error') return 'error'
    return 'neutral'
  }

  const getStatusText = () => {
    switch (authStatus) {
      case 'authenticating':
        return 'Authenticating'
      case 'refreshing':
        return 'Refreshing'
      case 'authenticated':
        return 'Authenticated'
      case 'error':
        return 'Auth Error'
      case 'unauthenticated':
      default:
        return 'Not Authenticated'
    }
  }

  const shouldPulse = authStatus === 'authenticating' || authStatus === 'refreshing'
  const showWarning = tokenExpiry && tokenExpiry - Date.now() < 300000 // 5 minutes

  return (
    <div className="auth-status-indicator inline-flex items-center gap-2">
      <div className={`relative`}>
        <div
          className={`w-2 h-2 rounded-full bg-${getStatusColor()} ${
            shouldPulse ? 'animate-pulse' : ''
          }`}
        />
        {shouldPulse && (
          <div
            className={`absolute inset-0 w-2 h-2 rounded-full bg-${getStatusColor()} animate-ping`}
          />
        )}
      </div>
      <span className="text-xs glass-text-secondary">{getStatusText()}</span>
      {isAuthenticated && timeToExpiry && (
        <span className={`text-xs ${showWarning ? 'text-warning' : 'glass-text-tertiary'}`}>
          ({timeToExpiry})
        </span>
      )}
    </div>
  )
}
