/**
 * AuthDebugPanel - Debug panel for authentication system
 */

import React, { useState, useEffect, useRef } from 'react'

import { useStore } from '../../store/store'
import './AuthDebugPanel.css'

interface RequestLog {
  id: string
  timestamp: Date
  method: string
  url: string
  headers: Record<string, string>
  status?: number
  duration?: number
  authStrategy?: string
  tenantId?: string
  error?: string
}

interface TokenInfo {
  strategy: string
  token: string
  decoded?: unknown
  expiresAt?: Date
  isExpired: boolean
}

// Store original fetch globally to prevent multiple wrapping
const originalFetch = window.fetch
let interceptorCount = 0

export const AuthDebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'requests' | 'tokens' | 'strategies' | 'performance'>(
    'requests'
  )
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([])
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgAuthTime: 0,
    totalRequests: 0,
    failedRequests: 0,
    successRate: 0,
    cacheHitRate: 0,
  })

  const requestLogsRef = useRef<RequestLog[]>([])
  const performanceMetricsRef = useRef(performanceMetrics)

  // Use individual selectors to avoid object creation
  const strategies = useStore((state) => state.strategies)
  const activeStrategy = useStore((state) => state.activeStrategy)
  // const authStatus = useStore((state) => state.authStatus)
  // const authError = useStore((state) => state.authError)
  // const isAuthenticated = useStore((state) => state.isAuthenticated)
  const tokenExpiry = useStore((state) => state.tokenExpiry)

  // const authManager = AuthManager.getInstance()
  // const tenantManager = TenantManager.getInstance()

  // Update refs when state changes
  useEffect(() => {
    requestLogsRef.current = requestLogs
  }, [requestLogs])

  useEffect(() => {
    performanceMetricsRef.current = performanceMetrics
  }, [performanceMetrics])

  // Setup request interceptor for logging - only once per app lifecycle
  useEffect(() => {
    interceptorCount++

    if (interceptorCount === 1) {
      window.fetch = async (...args) => {
        const startTime = Date.now()
        const [input, init] = args
        const url = typeof input === 'string' ? input : input.url
        const method = init?.method || 'GET'

        const requestLog: RequestLog = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          method,
          url,
          headers: {},
          authStrategy: useStore.getState().activeStrategy || undefined,
        }

        // Capture headers
        if (init?.headers) {
          const headers = new Headers(init.headers)
          headers.forEach((value, key) => {
            requestLog.headers[key] = value
          })
        }

        try {
          const response = await originalFetch(...args)
          requestLog.status = response.status
          requestLog.duration = Date.now() - startTime

          // Update using refs to avoid closure issues
          const currentLogs = requestLogsRef.current
          setRequestLogs([...currentLogs.slice(-99), requestLog])

          // Update performance metrics
          const currentMetrics = performanceMetricsRef.current
          const totalRequests = currentMetrics.totalRequests + 1
          const failedRequests = currentMetrics.failedRequests
          const successRate = ((totalRequests - failedRequests) / totalRequests) * 100
          const avgAuthTime = requestLog.duration
            ? (currentMetrics.avgAuthTime * currentMetrics.totalRequests + requestLog.duration) /
              totalRequests
            : currentMetrics.avgAuthTime

          setPerformanceMetrics({
            ...currentMetrics,
            avgAuthTime,
            totalRequests,
            failedRequests,
            successRate,
          })

          return response
        } catch (error) {
          requestLog.error = error instanceof Error ? error.message : 'Request failed'
          requestLog.duration = Date.now() - startTime

          const currentLogs = requestLogsRef.current
          setRequestLogs([...currentLogs.slice(-99), requestLog])

          // Update performance metrics for failed request
          const currentMetrics = performanceMetricsRef.current
          const totalRequests = currentMetrics.totalRequests + 1
          const failedRequests = currentMetrics.failedRequests + 1
          const successRate = ((totalRequests - failedRequests) / totalRequests) * 100
          const avgAuthTime = requestLog.duration
            ? (currentMetrics.avgAuthTime * currentMetrics.totalRequests + requestLog.duration) /
              totalRequests
            : currentMetrics.avgAuthTime

          setPerformanceMetrics({
            ...currentMetrics,
            avgAuthTime,
            totalRequests,
            failedRequests,
            successRate,
          })

          throw error
        }
      }
    }

    return () => {
      interceptorCount--
      if (interceptorCount === 0) {
        window.fetch = originalFetch
      }
    }
  }, []) // Empty dependency array - run only once per component instance

  // Update token information
  useEffect(() => {
    const updateTokens = () => {
      const tokenInfos: TokenInfo[] = []

      // Check if strategies is a Map
      if (strategies instanceof Map) {
        for (const [strategy, config] of strategies) {
          const token = config.credentials?.token

          if (token) {
            tokenInfos.push({
              strategy,
              token,
              decoded: decodeToken(token),
              expiresAt: tokenExpiry ? new Date(tokenExpiry) : undefined,
              isExpired: tokenExpiry ? Date.now() > tokenExpiry : false,
            })
          }
        }
      }

      // Only update if tokens changed
      setTokens((prev) => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(tokenInfos)
        return hasChanged ? tokenInfos : prev
      })
    }

    updateTokens()
    // Reduce frequency to 5 seconds and only run if panel is open
    if (isOpen) {
      const interval = setInterval(updateTokens, 5000)
      return () => clearInterval(interval)
    }
  }, [strategies, tokenExpiry, isOpen])

  const decodeToken = (token: string): unknown => {
    try {
      // Try JWT decode
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = parts[1]
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        return JSON.parse(decoded)
      }
      return null
    } catch {
      return null
    }
  }

  const formatHeaders = (headers: Record<string, string>): string => {
    return Object.entries(headers)
      .filter(([key]) => !key.toLowerCase().includes('authorization'))
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
  }

  const clearLogs = () => {
    setRequestLogs([])
    setPerformanceMetrics({
      avgAuthTime: 0,
      totalRequests: 0,
      failedRequests: 0,
      successRate: 0,
      cacheHitRate: 0,
    })
  }

  // Get strategies as array for rendering
  const strategiesArray = strategies instanceof Map ? Array.from(strategies) : []

  return (
    <>
      <button className="debugToggle" onClick={() => setIsOpen(!isOpen)} title="Auth Debug Panel">
        🔐
      </button>

      {isOpen && (
        <div className="debugPanel">
          <div className="header">
            <h3>Auth Debug Panel</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="tabs">
            <button
              className={activeTab === 'requests' ? 'active' : ''}
              onClick={() => setActiveTab('requests')}
            >
              Requests ({requestLogs.length})
            </button>
            <button
              className={activeTab === 'tokens' ? 'active' : ''}
              onClick={() => setActiveTab('tokens')}
            >
              Tokens ({tokens.length})
            </button>
            <button
              className={activeTab === 'strategies' ? 'active' : ''}
              onClick={() => setActiveTab('strategies')}
            >
              Strategies ({strategiesArray.length})
            </button>
            <button
              className={activeTab === 'performance' ? 'active' : ''}
              onClick={() => setActiveTab('performance')}
            >
              Performance
            </button>
          </div>

          <div className="content">
            {activeTab === 'requests' && (
              <div className="requests">
                <div className="toolbar">
                  <button onClick={clearLogs}>Clear Logs</button>
                </div>
                <div className="requestList">
                  {requestLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`requestItem ${log.error ? 'error' : ''}`}
                      onClick={() => setSelectedRequest(log)}
                    >
                      <span className="method">{log.method}</span>
                      <span className="url">{log.url}</span>
                      <span className="status">{log.status || 'ERR'}</span>
                      <span className="duration">{log.duration}ms</span>
                    </div>
                  ))}
                </div>
                {selectedRequest && (
                  <div className="requestDetail">
                    <h4>Request Details</h4>
                    <div className="detailItem">
                      <strong>Time:</strong> {selectedRequest.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="detailItem">
                      <strong>Method:</strong> {selectedRequest.method}
                    </div>
                    <div className="detailItem">
                      <strong>URL:</strong> {selectedRequest.url}
                    </div>
                    <div className="detailItem">
                      <strong>Strategy:</strong> {selectedRequest.authStrategy || 'None'}
                    </div>
                    <div className="detailItem">
                      <strong>Headers:</strong>
                      <pre>{formatHeaders(selectedRequest.headers)}</pre>
                    </div>
                    {selectedRequest.error && (
                      <div className="detailItem">
                        <strong>Error:</strong> {selectedRequest.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tokens' && (
              <div className="tokens">
                {tokens.map((token) => (
                  <div key={token.strategy} className="tokenItem">
                    <h4>{token.strategy}</h4>
                    <div className="tokenInfo">
                      <div className="tokenValue">{token.token.substring(0, 20)}...</div>
                      {token.expiresAt && (
                        <div className={`expiry ${token.isExpired ? 'expired' : ''}`}>
                          Expires: {token.expiresAt.toLocaleString()}
                        </div>
                      )}
                      {token.decoded && (
                        <details>
                          <summary>Decoded Payload</summary>
                          <pre>{JSON.stringify(token.decoded, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'strategies' && (
              <div className="strategies">
                {strategiesArray.map(([name, config]) => (
                  <div key={name} className="strategyItem">
                    <h4>{name}</h4>
                    <div className="strategyInfo">
                      <div>Type: {config.type}</div>
                      <div>Enabled: {config.enabled ? '✅' : '❌'}</div>
                      <div>Active: {activeStrategy === name ? '✅' : '❌'}</div>
                      <details>
                        <summary>Configuration</summary>
                        <pre>{JSON.stringify(config, null, 2)}</pre>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="performance">
                <div className="metric">
                  <span>Average Auth Time:</span>
                  <strong>{performanceMetrics.avgAuthTime.toFixed(2)}ms</strong>
                </div>
                <div className="metric">
                  <span>Total Requests:</span>
                  <strong>{performanceMetrics.totalRequests}</strong>
                </div>
                <div className="metric">
                  <span>Failed Requests:</span>
                  <strong>{performanceMetrics.failedRequests}</strong>
                </div>
                <div className="metric">
                  <span>Success Rate:</span>
                  <strong>{performanceMetrics.successRate.toFixed(1)}%</strong>
                </div>
                <div className="metric">
                  <span>Cache Hit Rate:</span>
                  <strong>{performanceMetrics.cacheHitRate.toFixed(1)}%</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
