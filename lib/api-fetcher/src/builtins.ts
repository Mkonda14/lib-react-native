/**
 * Built-in plugins
 * =================
 * Ready-to-use plugins that ship with the library:
 *  - AuthPlugin: token injection + auto-refresh on 401
 *  - LoggingPlugin: structured request/response/error logs
 *  - RetryPlugin: custom retry logic (alternative to the built-in retry config)
 *  - DevtoolsPlugin: in-memory request log (for debug UIs)
 *  - MetricsPlugin: track request count, duration, error rate
 */

import type { ApiPlugin, ApiResponse, ResolvedRequestOptions, HttpHeaders } from './types'
import {
  ApiError,
  ApiAuthError,
  isAuthError,
} from './errors'

/* ------------------------------------------------------------------ *
 * AuthPlugin
 * ------------------------------------------------------------------ */

export interface AuthPluginOptions {
  /** Get the access token (sync or async). */
  getAuthToken: () => string | null | Promise<string | null>
  /** Auth scheme. Default 'Bearer'. */
  scheme?: string
  /** Header name. Default 'Authorization'. */
  headerName?: string
  /** Called on 401. Should refresh the token (e.g. call /auth/refresh, store new token). */
  onUnauthorized?: (error: ApiError) => Promise<void>
  /** Skip auth for these path patterns. */
  skipAuthPaths?: Array<string | RegExp>
  /** Max refresh attempts before giving up. Default 1. */
  maxRefreshAttempts?: number
}

export function createAuthPlugin(opts: AuthPluginOptions): ApiPlugin {
  let refreshAttempts = 0
  let refreshPromise: Promise<void> | null = null

  return {
    name: 'auth',
    onRequest: (config) => {
      // Skip auth for excluded paths
      if (opts.skipAuthPaths) {
        for (const pattern of opts.skipAuthPaths) {
          if (typeof pattern === 'string') {
            if (config.url.includes(pattern)) {
              return { ...config, skipAuth: true }
            }
          } else if (pattern.test(config.url)) {
            return { ...config, skipAuth: true }
          }
        }
      }
      return config
    },
    onError: async (error) => {
      if (!isAuthError(error)) return error
      if (!opts.onUnauthorized) return error

      const max = opts.maxRefreshAttempts ?? 1
      if (refreshAttempts >= max) {
        refreshAttempts = 0
        return error
      }

      // Dedupe concurrent refreshes
      if (!refreshPromise) {
        refreshAttempts += 1
        refreshPromise = opts.onUnauthorized(error).finally(() => {
          refreshPromise = null
        })
      }

      try {
        await refreshPromise
        // After successful refresh, mark error as retryable so the retry layer re-executes the request
        return new ApiAuthError(
          'Token refreshed — retrying request',
          { config: error.context.config },
          true,
        )
      } catch (refreshErr) {
        refreshAttempts = 0
        return new ApiAuthError(
          'Authentication failed and refresh did not succeed',
          { cause: refreshErr, config: error.context.config },
        )
      }
    },
  }
}

/* ------------------------------------------------------------------ *
 * LoggingPlugin
 * ------------------------------------------------------------------ */

export interface LoggingPluginOptions {
  /** Log level: 'debug' | 'info' | 'warn' | 'error'. */
  level?: 'debug' | 'info' | 'warn' | 'error'
  /** Custom logger (default: console). */
  logger?: {
    debug: (...args: any[]) => void
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
  /** Redact these headers from logs (e.g. Authorization). */
  redactHeaders?: string[]
  /** Max body length to log. Default 500. */
  maxBodyLength?: number
}

export function createLoggingPlugin(opts: LoggingPluginOptions = {}): ApiPlugin {
  const logger = opts.logger ?? console
  const redact = new Set(
    (opts.redactHeaders ?? ['authorization', 'cookie']).map((h) => h.toLowerCase())
  )
  const maxBody = opts.maxBodyLength ?? 500

  return {
    name: 'logging',
    onRequest: (config) => {
      const sanitizedHeaders: HttpHeaders = {}
      for (const [k, v] of Object.entries(config.headers)) {
        sanitizedHeaders[k] = redact.has(k.toLowerCase()) ? '[REDACTED]' : v
      }
      logger.debug?.(
        `[api] → ${config.method} ${config.url}`,
        {
          headers: sanitizedHeaders,
          query: config.query,
          tags: config.tags,
        }
      )
      return config
    },
    onResponse: (response) => {
      const body = typeof response.data === 'string'
        ? response.data.slice(0, maxBody)
        : typeof response.data === 'object'
        ? JSON.stringify(response.data).slice(0, maxBody)
        : String(response.data).slice(0, maxBody)

      logger.debug?.(
        `[api] ← ${response.config.method} ${response.config.url}`,
        {
          status: response.status,
          duration: `${response.duration}ms`,
          fromCache: response.fromCache,
          retries: response.retries,
          bodyPreview: body,
        }
      )
      return response
    },
    onError: (error) => {
      logger.error?.(
        `[api] ✗ ${error.context.method ?? '??'} ${error.context.url ?? '??'}`,
        {
          code: error.code,
          status: error.context.status,
          message: error.message,
          retryable: error.retryable,
        }
      )
      return error
    },
  }
}

/* ------------------------------------------------------------------ *
 * DevtoolsPlugin — in-memory request log
 * ------------------------------------------------------------------ */

export interface DevtoolsEntry {
  id: string
  method: string
  url: string
  status?: number
  duration?: number
  error?: string
  timestamp: number
  request: {
    headers: HttpHeaders
    query?: any
    body?: any
  }
  response?: {
    headers: HttpHeaders
    body: any
  }
}

export interface DevtoolsPluginOptions {
  /** Max entries to keep in memory. Default 100. */
  maxEntries?: number
}

export function createDevtoolsPlugin(opts: DevtoolsPluginOptions = {}): ApiPlugin & {
  getEntries: () => DevtoolsEntry[]
  clear: () => void
  subscribe: (cb: (entries: DevtoolsEntry[]) => void) => () => void
} {
  const entries: DevtoolsEntry[] = []
  const subscribers = new Set<(entries: DevtoolsEntry[]) => void>()
  const maxEntries = opts.maxEntries ?? 100

  const notify = () => {
    const snapshot = [...entries]
    subscribers.forEach((cb) => cb(snapshot))
  }

  return {
    name: 'devtools',
    onRequest: (config) => {
      const entry: DevtoolsEntry = {
        id: Math.random().toString(36).slice(2),
        method: config.method,
        url: config.url,
        timestamp: Date.now(),
        request: {
          headers: config.headers,
          query: config.query,
          body: config.body,
        },
      }
      entries.unshift(entry)
      if (entries.length > maxEntries) entries.pop()
      ;(config.meta as any).__devtoolsId = entry.id
      notify()
      return config
    },
    onResponse: (response) => {
      const id = (response.config.meta as any).__devtoolsId
      if (!id) return response
      const entry = entries.find((e) => e.id === id)
      if (entry) {
        entry.status = response.status
        entry.duration = response.duration
        entry.response = {
          headers: response.headers,
          body: response.data,
        }
        notify()
      }
      return response
    },
    onError: (error) => {
      const id = (error.context.config?.meta as any)?.__devtoolsId
      if (!id) return error
      const entry = entries.find((e) => e.id === id)
      if (entry) {
        entry.status = error.context.status
        entry.error = error.message
        entry.duration = Date.now() - entry.timestamp
        notify()
      }
      return error
    },
    getEntries: () => [...entries],
    clear: () => {
      entries.length = 0
      notify()
    },
    subscribe: (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
  }
}

/* ------------------------------------------------------------------ *
 * MetricsPlugin — track stats
 * ------------------------------------------------------------------ */

export interface Metrics {
  totalRequests: number
  totalErrors: number
  totalRetries: number
  averageDuration: number
  successRate: number
  byStatus: Record<number, number>
  byEndpoint: Record<string, { count: number; errors: number; avgDuration: number }>
}

export function createMetricsPlugin(): ApiPlugin & {
  getMetrics: () => Metrics
  reset: () => void
} {
  const metrics: Metrics = {
    totalRequests: 0,
    totalErrors: 0,
    totalRetries: 0,
    averageDuration: 0,
    successRate: 1,
    byStatus: {},
    byEndpoint: {},
  }
  let totalDuration = 0

  return {
    name: 'metrics',
    onResponse: (response) => {
      metrics.totalRequests += 1
      metrics.totalRetries += response.retries
      totalDuration += response.duration
      metrics.averageDuration = totalDuration / metrics.totalRequests
      metrics.successRate = (metrics.totalRequests - metrics.totalErrors) / metrics.totalRequests

      const status = response.status
      metrics.byStatus[status] = (metrics.byStatus[status] ?? 0) + 1

      const endpoint = `${response.config.method} ${response.config.url}`
      const existing = metrics.byEndpoint[endpoint] ?? { count: 0, errors: 0, avgDuration: 0 }
      existing.count += 1
      existing.avgDuration = (existing.avgDuration * (existing.count - 1) + response.duration) / existing.count
      metrics.byEndpoint[endpoint] = existing

      return response
    },
    onError: (error) => {
      metrics.totalRequests += 1
      metrics.totalErrors += 1
      metrics.successRate = (metrics.totalRequests - metrics.totalErrors) / metrics.totalRequests
      if (error.context.status) {
        metrics.byStatus[error.context.status] = (metrics.byStatus[error.context.status] ?? 0) + 1
      }
      const endpoint = `${error.context.method ?? '??'} ${error.context.url ?? '??'}`
      const existing = metrics.byEndpoint[endpoint] ?? { count: 0, errors: 0, avgDuration: 0 }
      existing.count += 1
      existing.errors += 1
      metrics.byEndpoint[endpoint] = existing
      return error
    },
    getMetrics: () => ({
      ...metrics,
      byStatus: { ...metrics.byStatus },
      byEndpoint: Object.fromEntries(
        Object.entries(metrics.byEndpoint).map(([k, v]) => [k, { ...v }])
      ),
    }),
    reset: () => {
      metrics.totalRequests = 0
      metrics.totalErrors = 0
      metrics.totalRetries = 0
      metrics.averageDuration = 0
      metrics.successRate = 1
      metrics.byStatus = {}
      metrics.byEndpoint = {}
      totalDuration = 0
    },
  }
}