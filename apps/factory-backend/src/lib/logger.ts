/**
 * Structured Logging for SaaS Factory
 * 
 * Provides:
 * - JSON structured logs for machine parsing
 * - Correlation IDs for request tracing
 * - Log levels (debug, info, warn, error)
 * - Component tagging for filtering
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  component: string
  message: string
  correlationId?: string
  projectId?: string
  phase?: string
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, unknown>
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

export function createLogger(component: string) {
  return {
    debug(message: string, metadata?: Record<string, unknown>): void {
      if (shouldLog('debug')) {
        console.log(formatLog({
          timestamp: new Date().toISOString(),
          level: 'debug',
          component,
          message,
          ...metadata,
        }))
      }
    },

    info(message: string, metadata?: Record<string, unknown>): void {
      if (shouldLog('info')) {
        console.log(formatLog({
          timestamp: new Date().toISOString(),
          level: 'info',
          component,
          message,
          ...metadata,
        }))
      }
    },

    warn(message: string, metadata?: Record<string, unknown>): void {
      if (shouldLog('warn')) {
        console.warn(formatLog({
          timestamp: new Date().toISOString(),
          level: 'warn',
          component,
          message,
          ...metadata,
        }))
      }
    },

    error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
      if (shouldLog('error')) {
        console.error(formatLog({
          timestamp: new Date().toISOString(),
          level: 'error',
          component,
          message,
          error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : undefined,
          ...metadata,
        }))
      }
    },

    withCorrelationId(correlationId: string) {
      return {
        debug(message: string, metadata?: Record<string, unknown>): void {
          if (shouldLog('debug')) {
            console.log(formatLog({
              timestamp: new Date().toISOString(),
              level: 'debug',
              component,
              message,
              correlationId,
              ...metadata,
            }))
          }
        },
        info(message: string, metadata?: Record<string, unknown>): void {
          if (shouldLog('info')) {
            console.log(formatLog({
              timestamp: new Date().toISOString(),
              level: 'info',
              component,
              message,
              correlationId,
              ...metadata,
            }))
          }
        },
        warn(message: string, metadata?: Record<string, unknown>): void {
          if (shouldLog('warn')) {
            console.warn(formatLog({
              timestamp: new Date().toISOString(),
              level: 'warn',
              component,
              message,
              correlationId,
              ...metadata,
            }))
          }
        },
        error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
          if (shouldLog('error')) {
            console.error(formatLog({
              timestamp: new Date().toISOString(),
              level: 'error',
              component,
              message,
              correlationId,
              error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              } : undefined,
              ...metadata,
            }))
          }
        },
      }
    },
  }
}

// Pre-configured loggers for different components
export const workerLogger = createLogger('worker')
export const activityLogger = createLogger('activity')
export const workflowLogger = createLogger('workflow')
export const agentLogger = createLogger('agent')
export const llmLogger = createLogger('llm')

// Timing utility for performance tracking
export function startTimer(): () => { duration: number } {
  const start = process.hrtime.bigint()
  return () => {
    const end = process.hrtime.bigint()
    return { duration: Number(end - start) / 1_000_000 } // ms
  }
}
