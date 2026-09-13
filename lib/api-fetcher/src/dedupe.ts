/**
 * Request deduplication
 * ======================
 *
 * When the same GET request is fired multiple times in parallel
 * (e.g. by different components mounting at the same time), only ONE
 * actual HTTP request is made. All callers share the same promise.
 *
 * Key derivation:
 *  - method + url + serialized query + body hash (for POST/PUT)
 *
 * The dedupe map is cleared when the request completes (success or error).
 */

import type { ResolvedRequestOptions } from './types'
import { serializeQuery } from './serializer'

export class RequestDeduplicator {
  private inFlight = new Map<string, Promise<unknown>>()

  /**
   * Compute a dedupe key for a request config.
   */
  buildKey(config: ResolvedRequestOptions): string {
    const qs = config.query ? serializeQuery(config.query) : ''
    const bodyHash = config.body ? hashBody(config.body) : ''
    return `${config.method}:${config.url || ''}:${qs}:${bodyHash}`
  }

  /**
   * Get or create an in-flight promise for the given key.
   * If a request with the same key is already in flight, returns its promise.
   */
  dedupe<T>(
    config: ResolvedRequestOptions,
    factory: () => Promise<T>
  ): { promise: Promise<T>; deduped: boolean } {
    const key = this.buildKey(config)

    const existing = this.inFlight.get(key)
    if (existing) {
      return { promise: existing as Promise<T>, deduped: true }
    }

    const promise = factory().finally(() => {
      this.inFlight.delete(key)
    })

    this.inFlight.set(key, promise)
    return { promise, deduped: false }
  }

  /**
   * Cancel all in-flight deduped requests (for tests or logout).
   */
  clear(): void {
    this.inFlight.clear()
  }

  /**
   * Get the count of currently in-flight deduped requests.
   */
  get size(): number {
    return this.inFlight.size
  }
}

/**
 * Hash a body (for dedupe key).
 * For FormData / ArrayBuffer, we skip (return empty) — they can't be hashed cheaply.
 */
function hashBody(body: unknown): string {
  if (!body) return ''
  if (typeof body === 'string') return `s:${body}`
  if (typeof FormData !== 'undefined' && body instanceof FormData) return 'fd'
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return 'ab'
  try {
    return 'j:' + JSON.stringify(body)
  } catch {
    return '?'
  }
}