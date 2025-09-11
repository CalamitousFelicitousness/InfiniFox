/**
 * Logging utility for auth operations
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class AuthLogger {
  private context: string
  private level: LogLevel

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context
    this.level = level
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.level) return

    const timestamp = new Date().toISOString()
    const levelStr = LogLevel[level]
    const logMessage = `[${timestamp}] [${levelStr}] [${this.context}] ${message}`

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data)
        break
      case LogLevel.INFO:
        console.info(logMessage, data)
        break
      case LogLevel.WARN:
        console.warn(logMessage, data)
        break
      case LogLevel.ERROR:
        console.error(logMessage, data)
        break
    }

    // Mask sensitive data
    if (data) {
      data = this.maskSensitiveData(data)
    }
  }

  private maskSensitiveData(data: unknown): unknown {
    if (!data) return data

    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization']
    const masked = { ...data }

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        masked[key] = '***MASKED***'
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskSensitiveData(masked[key])
      }
    }

    return masked
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data)
  }

  error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data)
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }
}
