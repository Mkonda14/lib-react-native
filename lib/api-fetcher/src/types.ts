/**
 * API Fetcher — Type definitions
 * =================================
 * Zero-dependency, fully-typed HTTP client for React Native.
 */

import type { ApiError } from './errors'

/* ------------------------------------------------------------------ *
 * HTTP primitives
 * ------------------------------------------------------------------ */

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'

export type HttpHeaders = Record<string, string>

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined | Array<string | number>
>

export type PathParams = Record<string, string | number>

export type Body =
  | string
  | Record<string, unknown>
  | Array<unknown>
  | FormData
  | ArrayBuffer
  | null
  | undefined

/* ------------------------------------------------------------------ *
 * Request config
 * ------------------------------------------------------------------ */

export interface RequestOptions {
  /** HTTP method. Default 'GET'. */
  method?: HttpMethod

  /** Query parameters (?key=value). */
  query?: QueryParams

  /** Path parameters (/users/:id → /users/123). */
  params?: PathParams

  /** Request body. */
  body?: Body

  /** Request headers (merged with instance defaults). */
  headers?: HttpHeaders

  /** Per-request timeout in ms. Overrides instance default. */
  timeout?: number

  /** Per-request retry config. Overrides instance default. */
  retry?: RetryConfig | false

  /** Per-request cache config. Overrides instance default. */
  cache?: CacheConfig | false

  /** Deduplicate this request with identical in-flight ones. */
  dedupe?: boolean

  /** AbortSignal for cancellation. */
  signal?: AbortSignal

  /** Response type (how to parse the body). */
  responseType?: ResponseType

  /** Custom metadata accessible in interceptors/plugins. */
  meta?: Record<string, unknown>

  /** Skip auth (don't inject Authorization header). */
  skipAuth?: boolean

  /** Skip interceptors (request + response). Default false. */
  skipInterceptors?: boolean

  /** Tags for grouping/logging. */
  tags?: string[]
}

export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream' | 'none'

/* ------------------------------------------------------------------ *
 * Response
 * ------------------------------------------------------------------ */

export interface ApiResponse<T = unknown> {
  /** Parsed body (typed as T). */
  data: T

  /** Raw response object. */
  response: Response

  /** Status code. */
  status: number

  /** Response headers. */
  headers: HttpHeaders

  /** Time taken in ms. */
  duration: number

  /** Original request config (post-interceptor). */
  config: ResolvedRequestOptions

  /** Number of retries attempted. */
  retries: number

  /** Whether this came from cache. */
  fromCache: boolean
}

/* ------------------------------------------------------------------ *
 * Resolved options (post-merge of instance + request)
 * ------------------------------------------------------------------ */

export interface ResolvedRequestOptions extends Required<Omit<RequestOptions, 'signal' | 'body' | 'query' | 'params' | 'headers' | 'meta' | 'tags'>> {
  method: HttpMethod
  url: string
  query?: QueryParams
  params?: PathParams
  body?: Body
  headers: HttpHeaders
  timeout: number
  retry: RetryConfig | false
  cache: CacheConfig | false
  dedupe: boolean
  responseType: ResponseType
  skipAuth: boolean
  skipInterceptors: boolean
  signal?: AbortSignal
  meta: Record<string, unknown>
  tags: string[]
}

/* ------------------------------------------------------------------ *
 * Retry config
 * ------------------------------------------------------------------ */

export interface RetryConfig {
  /** Max retry attempts. Default 3. */
  attempts: number

  /** Initial delay in ms. Default 500. */
  initialDelayMs: number

  /** Multiplier for exponential backoff. Default 2. */
  backoffMultiplier: number

  /** Max delay cap in ms. Default 30000. */
  maxDelayMs: number

  /** Add jitter to delay (random 0-50%). Default true. */
  jitter: boolean

  /** Retry on these status codes. Default [408, 429, 500, 502, 503, 504]. */
  retryOnStatus: number[]

  /** Retry on network errors. Default true. */
  retryOnNetworkError: boolean

  /** Custom retry condition (called after status/network checks). */
  shouldRetry?: (error: ApiError, attempt: number) => boolean

  /** Callback on each retry. */
  onRetry?: (info: RetryInfo) => void
}

export interface RetryInfo {
  attempt: number
  totalAttempts: number
  delayMs: number
  error: ApiError
  /** The Retry-After header value in ms, if present. */
  retryAfterMs?: number
}

/* ------------------------------------------------------------------ *
 * Cache config
 * ------------------------------------------------------------------ */

export interface CacheConfig {
  /** TTL in ms. Default 60000 (1 min). */
  ttlMs: number

  /** Cache key builder. Default: method + url + query. */
  keyBuilder?: (config: ResolvedRequestOptions) => string

  /** Cache only these methods. Default ['GET']. */
  methods: HttpMethod[]

  /** Max entries. Default 100. */
  maxEntries: number

  /** Custom invalidation predicate. */
  invalidate?: (cached: CacheEntry, config: ResolvedRequestOptions) => boolean
}

export interface CacheEntry {
  key: string
  data: unknown
  headers: HttpHeaders
  status: number
  cachedAt: number
  expiresAt: number
  /** Original tags for selective invalidation. */
  tags: string[]
}

/* ------------------------------------------------------------------ *
 * Interceptors
 * ------------------------------------------------------------------ */

export interface RequestInterceptor {
  id: string
  /** Return modified config or throw to fail the request. */
  onFulfilled: (config: ResolvedRequestOptions) => ResolvedRequestOptions | Promise<ResolvedRequestOptions>
  /** Called when a prior interceptor throws. */
  onRejected?: (error: ApiError) => ApiError | Promise<ApiError>
}

export interface ResponseInterceptor {
  id: string
  /** Return modified response or throw to fail. */
  onFulfilled: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>
  /** Called when the request failed OR an earlier interceptor threw. */
  onRejected?: (error: ApiError) => ApiError | Promise<ApiError>
}

/* ------------------------------------------------------------------ *
 * Plugin system
 * ------------------------------------------------------------------ */

export interface ApiPlugin {
  name: string
  /** Called once when the plugin is registered. */
  setup?: (client: ApiClientInterface) => void
  /** Called when the plugin is removed or the client is destroyed. */
  teardown?: (client: ApiClientInterface) => void
  /** Modify the request config before sending. */
  onRequest?: (config: ResolvedRequestOptions) => ResolvedRequestOptions | Promise<ResolvedRequestOptions>
  /** Modify the response before returning. */
  onResponse?: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>
  /** Handle errors (return modified error or throw). */
  onError?: (error: ApiError) => ApiError | Promise<ApiError>
}

/* ------------------------------------------------------------------ *
 * Client interface (for plugins)
 * ------------------------------------------------------------------ */

export interface ApiClientInterface {
  config: ApiClientConfig
  get: <T = unknown>(path: string, options?: RequestOptions) => Promise<ApiResponse<T>>
  post: <T = unknown>(path: string, body?: Body, options?: RequestOptions) => Promise<ApiResponse<T>>
  put: <T = unknown>(path: string, body?: Body, options?: RequestOptions) => Promise<ApiResponse<T>>
  patch: <T = unknown>(path: string, body?: Body, options?: RequestOptions) => Promise<ApiResponse<T>>
  delete: <T = unknown>(path: string, options?: RequestOptions) => Promise<ApiResponse<T>>
  head: <T = unknown>(path: string, options?: RequestOptions) => Promise<ApiResponse<T>>
  options: <T = unknown>(path: string, options?: RequestOptions) => Promise<ApiResponse<T>>
  request: <T = unknown>(path: string, options?: RequestOptions) => Promise<ApiResponse<T>>
  upload: <T = unknown>(path: string, options: UploadOptions) => Promise<ApiResponse<T>>
  download: <T = unknown>(path: string, options?: DownloadOptions) => Promise<ApiResponse<T>>
  addPlugin: (plugin: ApiPlugin) => void
  removePlugin: (name: string) => void
  addRequestInterceptor: (interceptor: Omit<RequestInterceptor, 'id'>) => string
  addResponseInterceptor: (interceptor: Omit<ResponseInterceptor, 'id'>) => string
  removeInterceptor: (id: string) => void
  clearCache: (tags?: string[]) => void
  invalidateCacheURL: (pattern: string | RegExp) => void
  clearDedupe: () => void
  setAuthToken: (token: string | null) => void
  getAuthToken: () => string | null
  destroy: () => void
}

/* ------------------------------------------------------------------ *
 * Client config
 * ------------------------------------------------------------------ */

export interface ApiClientConfig {
  /** Base URL (e.g. https://api.exemple.com). */
  baseURL: string

  /** Default headers. */
  headers?: HttpHeaders

  /** Default timeout in ms. Default 30000. */
  timeout?: number

  /** Default retry config. Default: 3 attempts. */
  retry?: RetryConfig | false

  /** Default cache config. Set to false to disable. */
  cache?: CacheConfig | false

  /** Enable deduplication by default. Default true. */
  dedupe?: boolean

  /** Default response type. Default 'json'. */
  responseType?: ResponseType

  /** Auth token getter (called on each request unless skipAuth). */
  getAuthToken?: () => string | null | Promise<string | null>

  /** Auth scheme. Default 'Bearer'. */
  authScheme?: string

  /** Called when a 401 is received. Should refresh the token (e.g. call /auth/refresh, store new token). */
  onUnauthorized?: (error: ApiError) => Promise<void>

  /** Query params serializer (default: built-in). */
  serializeQuery?: (params: QueryParams) => string

  /** Body serializer (default: JSON.stringify for objects). */
  serializeBody?: (body: Body, headers: HttpHeaders) => { body: Body; headers: HttpHeaders }

  /** Debug mode. Default false. */
  debug?: boolean

  /** Logger (default: console). */
  logger?: Logger

  /** Default tags applied to all requests. */
  defaultTags?: string[]

  /** User agent (sent as User-Agent header). */
  userAgent?: string

  /** Optional connectivity check. Return false to fast-fail with ApiNetworkError. */
  checkConnectivity?: () => boolean | Promise<boolean>
}

export interface Logger {
  debug: (...args: any[]) => void
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
}

/* ------------------------------------------------------------------ *
 * Upload / download progress
 * ------------------------------------------------------------------ */

export interface ProgressEvent {
  loaded: number
  total: number
  /** 0..1 */
  progress: number
  /** Bytes per second (computed). */
  speed: number
}

export interface UploadOptions extends RequestOptions {
  /** Files to upload (FormData). */
  body: FormData
  /** Progress callback. */
  onProgress?: (e: ProgressEvent) => void
}

export interface DownloadOptions extends RequestOptions {
  /** Progress callback. */
  onProgress?: (e: ProgressEvent) => void
}