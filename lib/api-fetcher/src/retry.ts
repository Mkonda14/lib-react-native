/**
 * Retry logic — exponential backoff with jitter
 * ===============================================
 *
 * Honors the `Retry-After` header (in seconds or HTTP-date format).
 * Adds jitter to avoid thundering-herd on retry storms.
 *
 * Retryable conditions:
 *  - Network errors (TypeError: Network request failed)
 *  - Timeout errors
 *  - 429 (rate limit) — respects Retry-After
 *  - Configured 5xx statuses (default: 500, 502, 503, 504)
 *  - 408 (Request Timeout)
 *
 * NOT retried by default:
 *  - 4xx (except 408, 429)
 *  - Abort errors
 *  - Parse errors
 */

import type { RetryConfig, RetryInfo } from './types'
import { ApiError, ApiNetworkError, ApiTimeoutError, ApiAbortError, ApiAuthError, ApiRateLimitError, isRetryableError } from './errors'
import { sleep, randomInt } from './utils'

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig | false,
  signal?: AbortSignal
): Promise<T> {
  if (config === false) {
    return fn()
  }

  const { attempts, onRetry } = config
  let lastError: ApiError | undefined
  let attempt = 0

  while (attempt <= attempts) {
    // Check abort before each attempt
    if (signal?.aborted) {
      throw new ApiAbortError('Aborted before attempt')
    }

    try {
      return await fn()
    } catch (err) {
      lastError = toApiError(err)

      // Never retry abort errors
      if (lastError instanceof ApiAbortError) {
        throw lastError
      }

      // Last attempt — no more retries
      if (attempt >= attempts) {
        throw lastError
      }

      // Check if retryable
      if (!shouldRetry(lastError, config, attempt)) {
        throw lastError
      }

      // Compute delay
      const delayMs = computeDelay(lastError, attempt, config)

      const info: RetryInfo = {
        attempt: attempt + 1,
        totalAttempts: attempts,
        delayMs,
        error: lastError,
        retryAfterMs: lastError instanceof ApiRateLimitError ? lastError.retryAfterMs : undefined,
      }

      onRetry?.(info)

      // Wait (aborted by signal if needed)
      await sleep(delayMs, signal)

      attempt += 1
    }
  }

  // Should never reach here, but TS doesn't know
  throw lastError ?? new Error('Retry loop exited unexpectedly')
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  // Wrap native errors
  const message = err instanceof Error ? err.message : String(err)
  // Detect timeout (our timeoutPromise adds a __TIMEOUT_ prefix)
  if (message.startsWith('__TIMEOUT_')) {
    const ms = parseInt(message.replace('__TIMEOUT_', ''), 10)
    return new ApiTimeoutError(ms)
  }
  // Detect abort
  if (message === '__ABORT' || message === 'Aborted' || (err as any)?.name === 'AbortError') {
    return new ApiAbortError()
  }
  return new ApiNetworkError(message)
}

function shouldRetry(error: ApiError, config: RetryConfig, attempt: number): boolean {
  // Custom shouldRetry takes precedence
  if (config.shouldRetry) {
    return config.shouldRetry(error, attempt)
  }

  // Abort errors: never
  if (error instanceof ApiAbortError) return false
  // Network errors: configurable
  if (error instanceof ApiNetworkError) return config.retryOnNetworkError
  // Timeout errors: retryable
  if (error instanceof ApiTimeoutError) return true

  // Auth errors: retryable only if marked (e.g. after token refresh)
  if (error instanceof ApiAuthError) return error.retryable

  // HTTP errors: check status
  if (error.context.status) {
    return config.retryOnStatus.includes(error.context.status)
  }

  // Fallback to the error's retryable flag
  return error.retryable
}

function computeDelay(error: ApiError, attempt: number, config: RetryConfig): number {
  // Respect Retry-After header (from 429 / 503)
  const retryAfterMs = error instanceof ApiRateLimitError ? error.retryAfterMs : undefined
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.min(retryAfterMs, config.maxDelayMs)
  }

  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const base = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  let delay = Math.min(base, config.maxDelayMs)

  // Add jitter (0-50% of the delay)
  if (config.jitter) {
    const jitter = delay * 0.5 * Math.random()
    delay = delay + jitter
  }

  return Math.floor(delay)
}