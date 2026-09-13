/**
 * ApiClient — main HTTP client
 * ===============================
 *
 * Zero-dependency, fully-typed. Built on `fetch` + `AbortController`.
 *
 * Features:
 *  - All HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 *  - Path params / query params / body (JSON / FormData / string / ArrayBuffer)
 *  - Request + response interceptors (Axios-like)
 *  - Plugin system (auth, logging, analytics…)
 *  - Retry with exponential backoff + Retry-After header
 *  - Request deduplication (in-flight GETs share one HTTP request)
 *  - In-memory cache with TTL + tag-based invalidation
 *  - Auth token injection + auto-refresh on 401
 *  - Configurable timeout per request
 *  - Upload/download progress (via XHR)
 *  - Full typed error hierarchy
 *  - AbortSignal support for cancellation
 *
 * Quick usage:
 *
 *   const api = new ApiClient({
 *     baseURL: 'https://api.exemple.com',
 *     timeout: 30000,
 *     retry: { attempts: 3 },
 *   })
 *
 *   const { data } = await api.get<User[]>('/users', { query: { page: 1 } })
 *   await api.post('/users', { name: 'John' })
 */

import type {
  ApiClientConfig,
  ApiClientInterface,
  ApiPlugin,
  ApiResponse,
  Body,
  CacheConfig,
  CacheEntry,
  HttpMethod,
  HttpHeaders,
  PathParams,
  QueryParams,
  RequestOptions,
  ResolvedRequestOptions,
  ResponseType,
  RetryConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ProgressEvent,
  UploadOptions,
  DownloadOptions,
} from './types'
import { DEFAULT_CONFIG } from './constants'
import {
  ApiAbortError,
  ApiError,
  ApiHttpError,
  ApiNetworkError,
  ApiParseError,
  ApiTimeoutError,
  createHttpError,
  isAuthError,
} from './errors'
import {
  buildURL,
  applyPathParams,
  deepMerge,
  headersToObject,
  mergeHeaders,
  timeoutPromise,
} from './utils'
import { serializeBody, serializeQuery, parseResponseBody } from './serializer'
import { InterceptorManager } from './interceptors'
import { withRetry } from './retry'
import { RequestDeduplicator } from './dedupe'
import { MemoryCache } from './cache'
import { PluginManager } from './plugins'
import { sendViaXHR } from './progress'

type ResolvedConfig = Required<
  Omit<ApiClientConfig, 'getAuthToken' | 'onUnauthorized' | 'serializeQuery' | 'serializeBody' | 'logger' | 'checkConnectivity'>
> & Pick<ApiClientConfig, 'getAuthToken' | 'onUnauthorized' | 'serializeQuery' | 'serializeBody' | 'logger' | 'checkConnectivity'>

export class ApiClient implements ApiClientInterface {
  readonly config: ResolvedConfig

  private interceptors = new InterceptorManager()
  private deduplicator = new RequestDeduplicator()
  private cache: MemoryCache | null
  private plugins = new PluginManager()
  private token: string | null = null

  constructor(config: ApiClientConfig) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      headers: mergeHeaders(DEFAULT_CONFIG.headers, config.headers),
      retry: config.retry === false ? false : (config.retry ?? DEFAULT_CONFIG.retry!),
      cache: config.cache === false ? false : (config.cache ?? DEFAULT_CONFIG.cache!),
      dedupe: config.dedupe ?? DEFAULT_CONFIG.dedupe!,
      responseType: config.responseType ?? DEFAULT_CONFIG.responseType!,
      authScheme: config.authScheme ?? DEFAULT_CONFIG.authScheme!,
      debug: config.debug ?? DEFAULT_CONFIG.debug!,
      defaultTags: config.defaultTags ?? [],
      userAgent: config.userAgent,
      checkConnectivity: config.checkConnectivity,
    } as ResolvedConfig

    // Initialize cache if enabled
    this.cache = this.config.cache ? new MemoryCache(this.config.cache as CacheConfig) : null

    // Setup plugins (if any were added before constructor — not the case here,
    // but PluginManager.setupAll handles it gracefully)
    this.plugins.setupAll(this)
  }

  /* ============================================================= *
   * Public API
   * ============================================================= */

  /* ---------------- HTTP verbs ---------------- */

  get<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T = unknown>(
    path: string,
    body?: Body,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  put<T = unknown>(
    path: string,
    body?: Body,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  patch<T = unknown>(
    path: string,
    body?: Body,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body })
  }

  delete<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  head<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'HEAD' })
  }

  options<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'OPTIONS' })
  }

  /* ---------------- Upload / download with progress ---------------- */

  async upload<T = unknown>(
    path: string,
    options: UploadOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, options, { useXHR: true })
  }

  async download<T = unknown>(
    path: string,
    options: DownloadOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' }, { useXHR: true })
  }

  /* ---------------- Main request method ---------------- */

  async request<T = unknown>(
    path: string,
    options: RequestOptions = {},
    internal: { useXHR?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    // 0. Network connectivity check (fast-fail when offline)
    if (this.config.checkConnectivity) {
      const online = await this.config.checkConnectivity()
      if (!online) {
        throw new ApiNetworkError('Device is offline', {
          url: path,
          method: (options.method ?? 'GET') as string,
        })
      }
    }

    // 1. Resolve options (merge instance defaults + request options)
    const resolved = this.resolveOptions(path, options)
    const startTime = Date.now()

    try {
      // 2. Run plugin onRequest hooks
      const finalConfig = this.config.debug
        ? await this.logRequest(await this.plugins.runOnRequest(resolved))
        : await this.plugins.runOnRequest(resolved)

      // 3. Run request interceptors (if not skipped)
      const interceptedConfig = finalConfig.skipInterceptors
        ? finalConfig
        : await this.interceptors.runRequestChain(finalConfig)

      // 4. Cache check (GET only by default)
      if (this.cache && !internal.useXHR) {
        const cached = this.cache.get(interceptedConfig)
        if (cached) {
          if (this.config.debug) {
            this.config.logger?.debug?.(`[api-fetcher] cache HIT ${interceptedConfig.method} ${path}`)
          }
          const response = this.buildCachedResponse<T>(cached, interceptedConfig, startTime)
          return this.finalizeResponse(response)
        }
      }

      // 5. Deduplicate (if enabled and not an upload)
      if (interceptedConfig.dedupe && !internal.useXHR) {
        const { promise, deduped } = this.deduplicator.dedupe<ApiResponse<T>>(
          interceptedConfig,
          () => this.executeRequest<T>(interceptedConfig, startTime, internal.useXHR ?? false)
        )
        if (deduped && this.config.debug) {
          this.config.logger?.debug?.(`[api-fetcher] deduped ${interceptedConfig.method} ${path}`)
        }
        const response = await promise
        return this.finalizeResponse(response)
      }

      // 6. Execute (with retry)
      const response = await this.executeRequest<T>(
        interceptedConfig,
        startTime,
        internal.useXHR ?? false
      )
      return this.finalizeResponse(response)
    } catch (err) {
      // 7. Run plugin onError + response error interceptor chain
      let apiError = toApiError(err, resolved)
      apiError = await this.plugins.runOnError(apiError)
      if (!resolved.skipInterceptors) {
        await this.interceptors.runResponseErrorChain(apiError)
      }
      throw apiError
    }
  }

  /* ============================================================= *
   * Configuration & extensions
   * ============================================================= */

  /* ---------------- Plugins ---------------- */

  addPlugin(plugin: ApiPlugin): void {
    this.plugins.add(plugin)
    plugin.setup?.(this)
  }

  removePlugin(name: string): void {
    this.plugins.remove(name)
  }

  /* ---------------- Interceptors ---------------- */

  addRequestInterceptor(interceptor: Omit<RequestInterceptor, 'id'>): string {
    return this.interceptors.addRequestInterceptor(interceptor)
  }

  addResponseInterceptor(interceptor: Omit<ResponseInterceptor, 'id'>): string {
    return this.interceptors.addResponseInterceptor(interceptor)
  }

  removeInterceptor(id: string): void {
    this.interceptors.removeInterceptor(id)
  }

  /* ---------------- Auth ---------------- */

  /** Set the auth token (used in subsequent requests). */
  setAuthToken(token: string | null): void {
    this.token = token
  }

  /** Get the current auth token. */
  getAuthToken(): string | null {
    return this.token
  }

  /* ---------------- Cache ---------------- */

  /** Invalidate cache by tags. If no tags, clear all. */
  clearCache(tags?: string[]): void {
    this.cache?.clear(tags)
  }

  /** Invalidate cache entries matching a URL pattern. */
  invalidateCacheURL(pattern: string | RegExp): void {
    this.cache?.invalidateURL(pattern)
  }

  /* ---------------- Dedupe ---------------- */

  /** Clear all in-flight deduped requests. */
  clearDedupe(): void {
    this.deduplicator.clear()
  }

  /* ---------------- Cleanup ---------------- */

  /** Destroy the client instance — clears all state and calls plugin teardown hooks. */
  destroy(): void {
    this.cache?.clear()
    this.deduplicator.clear()
    this.interceptors.clear()
    const pluginNames = this.plugins.list()
    for (const name of pluginNames) {
      this.plugins.remove(name)
    }
  }

  /* ============================================================= *
   * Internal methods
   * ============================================================= */

  /**
   * Merge instance config with per-request options.
   */
  private resolveOptions(path: string, options: RequestOptions): ResolvedRequestOptions {
    const retry: RetryConfig | false =
      options.retry !== undefined
        ? options.retry
        : this.config.retry ?? false

    const cache: CacheConfig | false =
      options.cache !== undefined
        ? options.cache
        : this.config.cache ?? false

    return {
      method: (options.method ?? 'GET') as HttpMethod,
      url: path, // path is set here; URL is built later (after interceptors)
      query: options.query,
      params: options.params,
      body: options.body,
      headers: mergeHeaders(this.config.headers, options.headers),
      timeout: options.timeout ?? this.config.timeout ?? 30000,
      retry,
      cache,
      dedupe: options.dedupe ?? this.config.dedupe ?? true,
      responseType: (options.responseType ?? this.config.responseType ?? 'json') as ResponseType,
      skipAuth: options.skipAuth ?? false,
      skipInterceptors: options.skipInterceptors ?? false,
      signal: options.signal,
      meta: options.meta ?? {},
      tags: [...(this.config.defaultTags ?? []), ...(options.tags ?? [])],
    }
  }

  /**
   * Execute a single HTTP request (called by withRetry).
   */
  private async executeRequest<T>(
    config: ResolvedRequestOptions,
    startTime: number,
    useXHR: boolean
  ): Promise<ApiResponse<T>> {
    const retryConfig = config.retry

    const execute = async () => {
      // Build final URL with path params + query
      const finalPath = applyPathParams(config.url, config.params)
      const queryString = config.query
        ? (this.config.serializeQuery?.(config.query) ?? serializeQuery(config.query))
        : ''
      const url = buildURL(this.config.baseURL, finalPath, queryString)

      // Inject auth header (if token available and not skipAuth)
      let finalHeaders = { ...config.headers }
      if (!config.skipAuth) {
        const token = await this.getAuthTokenAsync()
        if (token) {
          const scheme = this.config.authScheme
          finalHeaders['Authorization'] = `${scheme} ${token}`
        }
      }

      // User agent
      if (this.config.userAgent && !finalHeaders['user-agent']) {
        finalHeaders['User-Agent'] = this.config.userAgent
      }

      // Serialize body
      const serialized = this.config.serializeBody
        ? this.config.serializeBody(config.body, finalHeaders)
        : serializeBody(config.body, finalHeaders)
      finalHeaders = serialized.headers

      // Build AbortController that combines timeout + user signal
      const controller = new AbortController()
      let timedOut = false
      const timeoutId = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, config.timeout)

      // Wire user signal → internal controller
      let signalCleanup: (() => void) | undefined
      if (config.signal) {
        if (config.signal.aborted) {
          controller.abort()
        } else {
          const onAbort = () => controller.abort()
          config.signal.addEventListener('abort', onAbort, { once: true })
          signalCleanup = () => config.signal?.removeEventListener('abort', onAbort)
        }
      }

      try {
        let response: Response | XhrResponseLike
        if (useXHR) {
          // Use XHR for progress tracking
          response = await sendViaXHR({
            method: config.method,
            url,
            headers: finalHeaders,
            body: serialized.body as BodyInit,
            timeout: config.timeout,
            signal: config.signal,
            onProgress: (e: ProgressEvent) => {
              ;(config.meta as any).progress = e
            },
          })
          response = xhrToResponse(response as XhrResponseLike)
        } else {
          response = await fetch(url, {
            method: config.method,
            headers: finalHeaders,
            body: serialized.body as BodyInit | undefined,
            signal: controller.signal,
          })
        }

        // Parse body
        let data: T
        try {
          if (config.responseType === 'none' || config.method === 'HEAD') {
            data = null as T
          } else {
            data = (await parseResponseBody(response, config.responseType)) as T
          }
        } catch (err) {
          throw new ApiParseError(
            `Failed to parse response as ${config.responseType}: ${(err as Error).message}`,
            await response.text().catch(() => ''),
            { url, method: config.method, status: response.status, config }
          )
        }

        // HTTP error → throw
        if (!response.ok) {
          throw await createHttpError(response as Response, config, url, config.method, data)
        }

        const headers = headersToObject(response.headers)
        const apiResponse: ApiResponse<T> = {
          data,
          response: response as Response,
          status: response.status,
          headers,
          duration: Date.now() - startTime,
          config,
          retries: 0, // updated by withRetry wrapper
          fromCache: false,
        }

        // Cache the response (if cache enabled + method cacheable)
        if (this.cache) {
          this.cache.set(config, data, headers, response.status)
        }

        return apiResponse
      } catch (err) {
        // Translate native errors
        if (err instanceof ApiError) throw err

        // AbortError → check if timeout or user abort
        if ((err as Error).name === 'AbortError') {
          if (timedOut) {
            throw new ApiTimeoutError(config.timeout, {
              url,
              method: config.method,
              config,
            })
          }
          throw new ApiAbortError('Request aborted by user')
        }

        // Network error
        throw new ApiNetworkError((err as Error).message ?? 'Network request failed', {
          url,
          method: config.method,
          config,
        })
      } finally {
        clearTimeout(timeoutId)
        signalCleanup?.()
      }
    }

    // Wrap with retry
    const response = retryConfig
      ? await withRetry(
          (async (attempt: number) => {
            const res = await execute()
            res.retries = attempt
            return res
          }) as () => Promise<ApiResponse<T>>,
          retryConfig,
          config.signal
        )
      : await execute()

    return response as ApiResponse<T>
  }

  /**
   * Finalize a response — run response interceptors + plugin onResponse.
   */
  private async finalizeResponse<T>(
    response: ApiResponse<T>
  ): Promise<ApiResponse<T>> {
    let final: ApiResponse = response
    if (!response.config.skipInterceptors) {
      final = await this.interceptors.runResponseChain(final)
    }
    final = await this.plugins.runOnResponse(final)
    return final as ApiResponse<T>
  }

  /**
   * Get the auth token (from memory or via the async getter).
   */
  private async getAuthTokenAsync(): Promise<string | null> {
    if (this.token) return this.token
    if (this.config.getAuthToken) {
      const t = await this.config.getAuthToken()
      this.token = t
      return t
    }
    return null
  }

  /**
   * Build a response from a cache entry (no HTTP request made).
   */
  private buildCachedResponse<T>(
    entry: CacheEntry,
    config: ResolvedRequestOptions,
    startTime: number
  ): ApiResponse<T> {
    return {
      data: entry.data as T,
      response: new Response(null, { status: entry.status, headers: new Headers(entry.headers) }),
      status: entry.status,
      headers: entry.headers,
      duration: Date.now() - startTime,
      config,
      retries: 0,
      fromCache: true,
    }
  }

  /**
   * Debug logger — logs the request config.
   */
  private async logRequest<T>(config: ResolvedRequestOptions): Promise<ResolvedRequestOptions> {
    this.config.logger?.debug?.(
      `[api-fetcher] → ${config.method} ${config.url}`,
      {
        headers: config.headers,
        query: config.query,
        tags: config.tags,
      }
    )
    return config
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

interface XhrResponseLike {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  ok: boolean
  text: () => Promise<string>
}

function xhrToResponse(xhr: XhrResponseLike): Response {
  const response = new Response(xhr.body, {
    status: xhr.status,
    statusText: xhr.statusText,
    headers: new Headers(xhr.headers),
  })
  return response
}

/**
 * Translate unknown errors to ApiError.
 */
function toApiError(err: unknown, config: ResolvedRequestOptions): ApiError {
  if (err instanceof ApiError) return err

  const message = err instanceof Error ? err.message : String(err)

  // Detect timeout prefix
  if (message.startsWith('__TIMEOUT_')) {
    const ms = parseInt(message.replace('__TIMEOUT_', ''), 10)
    return new ApiTimeoutError(ms, { config })
  }

  // Abort detection
  if (message === '__ABORT' || (err as any)?.name === 'AbortError') {
    return new ApiAbortError('Request aborted', { config })
  }

  return new ApiNetworkError(message, { config })
}