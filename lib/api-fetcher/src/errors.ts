/**
 * API Fetcher — Error hierarchy
 * ==============================
 *
 * All errors extend `ApiError` which is a subclass of `Error`.
 * Each error type has a `code` for programmatic switching:
 *
 *   err instanceof ApiNetworkError    // network failure
 *   err instanceof ApiTimeoutError    // request timed out
 *   err instanceof ApiAbortError      // user aborted
 *   err instanceof ApiHttpError       // HTTP 4xx/5xx
 *     err instanceof ApiClientError  //   4xx
 *       err instanceof ApiAuthError       //   401
 *       err instanceof ApiForbiddenError   //  403
 *       err instanceof ApiNotFoundError    //   404
 *       err instanceof ApiValidationError   //   422
 *       err instanceof ApiRateLimitError   //   429
 *     err instanceof ApiServerError  //   5xx
 *       err instanceof ApiBadGatewayError    //  502
 *       err instanceof ApiServiceUnavailableError // 503
 *       err instanceof ApiGatewayTimeoutError    //  504
 *   err instanceof ApiParseError      // body parse failure
 *
 * Convenience helpers:
 *   isRetryableError(err)
 *   isAuthError(err)
 *   isErrorOfCode(err, 404)
 */

import type { HttpHeaders, ResolvedRequestOptions } from './types'
import { headersToObject } from './utils'

/* ------------------------------------------------------------------ *
 * Base error
 * ------------------------------------------------------------------ */

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORT'
  | 'HTTP'
  | 'CLIENT_ERROR'
  | 'SERVER_ERROR'
  | 'AUTH'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'RATE_LIMIT'
  | 'BAD_GATEWAY'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'PARSE'
  | 'UNKNOWN'

export interface ApiErrorContext {
  /** HTTP status code (undefined for network/timeout/abort/parse errors). */
  status?: number
  /** Response headers. */
  headers?: HttpHeaders
  /** Raw response body (string or parsed object). */
  body?: unknown
  /** Request URL. */
  url?: string
  /** Request method. */
  method?: string
  /** Resolved request config (post-interceptor). */
  config?: ResolvedRequestOptions
  /** Original cause (for wrapped errors). */
  cause?: unknown
  /** Whether this error is retryable. */
  retryable?: boolean
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly context: ApiErrorContext
  readonly timestamp: Date

  constructor(message: string, code: ApiErrorCode, context: ApiErrorContext = {}) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.context = context
    this.timestamp = new Date()

    // Preserve stack trace (V8 / Hermes)
    if (typeof (Error as any).captureStackTrace === 'function') {
      ;(Error as any).captureStackTrace(this, this.constructor)
    }
  }

  /** True if this is an HTTP error (4xx or 5xx). */
  get isHttpError(): boolean {
    return (
      this.code === 'HTTP' ||
      this.code === 'CLIENT_ERROR' ||
      this.code === 'SERVER_ERROR' ||
      this.code === 'AUTH' ||
      this.code === 'FORBIDDEN' ||
      this.code === 'NOT_FOUND' ||
      this.code === 'VALIDATION' ||
      this.code === 'RATE_LIMIT' ||
      this.code === 'BAD_GATEWAY' ||
      this.code === 'SERVICE_UNAVAILABLE' ||
      this.code === 'GATEWAY_TIMEOUT'
    )
  }

  /** True if the error is retryable (network error, 5xx, 429, timeout). */
  get retryable(): boolean {
    return this.context.retryable ?? false
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.context.status,
      url: this.context.url,
      method: this.context.method,
      timestamp: this.timestamp.toISOString(),
    }
  }
}

/* ------------------------------------------------------------------ *
 * Network / Transport errors
 * ------------------------------------------------------------------ */

export class ApiNetworkError extends ApiError {
  constructor(message: string, context: ApiErrorContext = {}) {
    super(message, 'NETWORK', { ...context, retryable: true })
  }
}

export class ApiTimeoutError extends ApiError {
  readonly timeoutMs: number

  constructor(timeoutMs: number, context: ApiErrorContext = {}) {
    super(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT', {
      ...context,
      retryable: true,
    })
    this.timeoutMs = timeoutMs
  }
}

export class ApiAbortError extends ApiError {
  constructor(message = 'Request aborted', context: ApiErrorContext = {}) {
    super(message, 'ABORT', { ...context, retryable: false })
  }
}

/* ------------------------------------------------------------------ *
 * HTTP errors
 * ------------------------------------------------------------------ */

export class ApiHttpError extends ApiError {
  readonly status: number

  constructor(
    message: string,
    status: number,
    context: ApiErrorContext = {},
    retryableOverride?: boolean,
    codeOverride?: ApiErrorCode,
  ) {
    const code: ApiErrorCode = codeOverride ?? (status >= 500 ? 'SERVER_ERROR' : 'CLIENT_ERROR')
    super(message, code, {
      ...context,
      status,
      retryable: retryableOverride ?? (status >= 500 || status === 429),
    })
    this.status = status
  }
}

/* ----- 4xx ----- */

export class ApiClientError extends ApiHttpError {}

export class ApiAuthError extends ApiHttpError {
  constructor(message: string, context: ApiErrorContext = {}, retryable?: boolean) {
    super(message, 401, { ...context }, retryable ?? false, 'AUTH')
  }
}

export class ApiForbiddenError extends ApiHttpError {
  constructor(message: string, context: ApiErrorContext = {}) {
    super(message, 403, { ...context }, false, 'FORBIDDEN')
  }
}

export class ApiNotFoundError extends ApiHttpError {
  constructor(message: string, context: ApiErrorContext = {}) {
    super(message, 404, { ...context }, false, 'NOT_FOUND')
  }
}

export class ApiValidationError extends ApiHttpError {
  /** Parsed validation errors from the server. */
  readonly errors: unknown

  constructor(message: string, errors: unknown, context: ApiErrorContext = {}) {
    super(message, 422, { ...context }, false, 'VALIDATION')
    this.errors = errors
  }
}

export class ApiRateLimitError extends ApiHttpError {
  /** Retry-After header value in ms, if present. */
  readonly retryAfterMs?: number

  constructor(message: string, retryAfterMs: number | undefined, context: ApiErrorContext = {}) {
    super(message, 429, { ...context }, true, 'RATE_LIMIT')
    this.retryAfterMs = retryAfterMs
  }
}

/* ----- 5xx ----- */

export class ApiServerError extends ApiHttpError {}

export class ApiBadGatewayError extends ApiServerError {
  constructor(message: string, context: ApiErrorContext = {}) {
    super(message, 502, context, true, 'BAD_GATEWAY')
  }
}

export class ApiServiceUnavailableError extends ApiServerError {
  constructor(message: string, context: ApiErrorContext = {}) {
    super(message, 503, context, true, 'SERVICE_UNAVAILABLE')
  }
}

export class ApiGatewayTimeoutError extends ApiServerError {
  constructor(message: string, context: ApiErrorContext = {}) {
    super(message, 504, context, true, 'GATEWAY_TIMEOUT')
  }
}

/* ------------------------------------------------------------------ *
 * Parse error
 * ------------------------------------------------------------------ */

export class ApiParseError extends ApiError {
  readonly raw: string

  constructor(message: string, raw: string, context: ApiErrorContext = {}) {
    super(message, 'PARSE', { ...context, retryable: false })
    this.raw = raw
  }
}

/* ------------------------------------------------------------------ *
 * Factory — create the right HTTP error subclass from a Response
 * ------------------------------------------------------------------ */

export async function createHttpError(
  response: Response,
  config: ResolvedRequestOptions,
  url: string,
  method: string,
  parsedBody?: unknown,
): Promise<ApiHttpError> {
  const status = response.status
  const respHeaders = headersToObject(response.headers)

  let body: unknown = parsedBody
  let raw = ''

  if (parsedBody !== undefined) {
    raw = typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)
  } else {
    try {
      raw = await response.text()
      const ct = respHeaders['content-type'] ?? ''
      if (ct.includes('application/json')) {
        body = JSON.parse(raw)
      } else {
        body = raw
      }
    } catch {
      body = raw
    }
  }

  const message = extractMessage(body) ?? response.statusText ?? `HTTP ${status}`
  const baseContext: ApiErrorContext = {
    status,
    headers: respHeaders,
    body,
    url,
    method,
    config,
  }

  switch (status) {
    case 401:
      return new ApiAuthError(message, baseContext)
    case 403:
      return new ApiForbiddenError(message, baseContext)
    case 404:
      return new ApiNotFoundError(message, baseContext)
    case 422:
      return new ApiValidationError(message, (body as any)?.errors ?? body, baseContext)
    case 429: {
      const retryAfter = respHeaders['retry-after']
      const retryAfterMs = retryAfter ? parseRetryAfter(retryAfter) : undefined
      return new ApiRateLimitError(message, retryAfterMs, baseContext)
    }
    case 502:
      return new ApiBadGatewayError(message, baseContext)
    case 503:
      return new ApiServiceUnavailableError(message, baseContext)
    case 504:
      return new ApiGatewayTimeoutError(message, baseContext)
    default:
      return new ApiHttpError(message, status, baseContext)
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function isRetryableError(err: unknown): boolean {
  return err instanceof ApiError && err.retryable
}

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiAuthError || (err instanceof ApiHttpError && err.status === 401)
}

export function isErrorOfCode(err: unknown, code: number): boolean {
  return err instanceof ApiHttpError && err.status === code
}

export function isErrorOfType<T extends ApiError>(
  err: unknown,
  klass: new (...args: any[]) => T
): err is T {
  return err instanceof klass
}

/* ------------------------------------------------------------------ *
 * Internal helpers
 * ------------------------------------------------------------------ */

function extractMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body || undefined
  if (body && typeof body === 'object') {
    const b = body as any
    return (
      b.message ??
      b.error ??
      b.errorMessage ??
      (Array.isArray(b.errors) ? b.errors[0]?.message : undefined) ??
      b.detail ??
      b.title
    )
  }
  return undefined
}

function parseRetryAfter(value: string): number | undefined {
  const asNumber = Number(value)
  if (!isNaN(asNumber)) {
    return asNumber * 1000 // seconds → ms
  }
  const asDate = new Date(value).getTime()
  if (!isNaN(asDate)) {
    return Math.max(0, asDate - Date.now())
  }
  return undefined
}