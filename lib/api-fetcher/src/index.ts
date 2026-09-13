/**
 * API Fetcher — Public API
 * =========================
 *
 * Zero-dependency, fully-typed HTTP client for React Native.
 *
 * Quick usage:
 *
 *   import { ApiClient, createAuthPlugin, createLoggingPlugin } from './api-fetcher'
 *
 *   const api = new ApiClient({
 *     baseURL: 'https://api.exemple.com',
 *     timeout: 30000,
 *   })
 *
 *   // Plugins (optional)
 *   api.addPlugin(createLoggingPlugin({ level: 'debug' }))
 *   api.addPlugin(createAuthPlugin({
 *     getAuthToken: () => getTokenFromStorage(),
 *     onUnauthorized: async (err, retry) => {
 *       await refreshSession()
 *       await retry()
 *     },
 *   }))
 *
 *   // Make requests
 *   const { data } = await api.get<User[]>('/users', {
 *     query: { page: 1, limit: 20 },
 *     tags: ['users'],
 *   })
 *
 *   await api.post('/users', { name: 'John' })
 *
 *   // Cancel
 *   const controller = new AbortController()
 *   api.get('/slow', { signal: controller.signal })
 *   controller.abort()
 *
 *   // Upload with progress
 *   const fd = new FormData()
 *   fd.append('file', { uri, name, type })
 *   await api.upload('/upload', {
 *     body: fd,
 *     onProgress: ({ progress, speed }) => console.log(`${progress}% - ${speed} bps`),
 *   })
 */

// Main client
export { ApiClient } from './client'

// Errors
export {
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
  ApiAbortError,
  ApiHttpError,
  ApiClientError,
  ApiAuthError,
  ApiForbiddenError,
  ApiNotFoundError,
  ApiValidationError,
  ApiRateLimitError,
  ApiServerError,
  ApiBadGatewayError,
  ApiServiceUnavailableError,
  ApiGatewayTimeoutError,
  ApiParseError,
  createHttpError,
  isRetryableError,
  isAuthError,
  isErrorOfCode,
  isErrorOfType,
} from './errors'

// Built-in plugins
export {
  createAuthPlugin,
  createLoggingPlugin,
  createDevtoolsPlugin,
  createMetricsPlugin,
} from './builtins'

// Managers (for advanced usage)
export { InterceptorManager } from './interceptors'
export { RequestDeduplicator } from './dedupe'
export { MemoryCache } from './cache'
export { PluginManager } from './plugins'

// Utilities (for building custom plugins / serializers)
export {
  serializeQuery,
  serializeBody,
  parseResponseBody,
} from './serializer'
export {
  sleep,
  buildURL,
  applyPathParams,
  mergeHeaders,
  deepMerge,
  uniqueId,
  isAbortError,
  headersToObject,
  formatBytes,
  safeStringify,
} from './utils'
export { withRetry } from './retry'
export { sendViaXHR } from './progress'

// Constants
export {
  DEFAULT_TIMEOUT,
  DEFAULT_RETRY,
  DEFAULT_CACHE,
  DEFAULT_CONFIG,
} from './constants'

// Types
export type {
  HttpMethod,
  HttpHeaders,
  QueryParams,
  PathParams,
  Body,
  RequestOptions,
  ResolvedRequestOptions,
  ResponseType,
  ApiResponse,
  RetryConfig,
  RetryInfo,
  CacheConfig,
  CacheEntry,
  RequestInterceptor,
  ResponseInterceptor,
  ApiPlugin,
  ApiClientConfig,
  ApiClientInterface,
  Logger,
  ProgressEvent,
  UploadOptions,
  DownloadOptions,
} from './types'