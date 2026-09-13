/**
 * In-memory cache with TTL + tag-based invalidation
 * =================================================
 *
 * LRU-style: when `maxEntries` is exceeded, the oldest entry is evicted.
 * Entries expire after `ttlMs` and are removed on next access.
 *
 * Tag-based invalidation: each entry stores its tags. `clearCache(tags)`
 * removes only entries matching at least one of the given tags.
 */

import type { CacheConfig, CacheEntry, ResolvedRequestOptions, HttpMethod, HttpHeaders } from './types'
import { serializeQuery } from './serializer'

export class MemoryCache {
  private store = new Map<string, CacheEntry>()
  private config: Required<CacheConfig>

  constructor(config: CacheConfig) {
    this.config = {
      keyBuilder: defaultKeyBuilder,
      ...config,
    } as Required<CacheConfig>
  }

  /**
   * Get a cached entry, or null if expired/missing.
   */
  get(config: ResolvedRequestOptions): CacheEntry | null {
    if (!this.config.methods.includes(config.method as HttpMethod)) return null

    const key = this.config.keyBuilder(config)
    const entry = this.store.get(key)
    if (!entry) return null

    // Expired?
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    // Custom invalidation
    if (this.config.invalidate?.(entry, config)) {
      this.store.delete(key)
      return null
    }

    // LRU: move to end (most recently used)
    this.store.delete(key)
    this.store.set(key, entry)
    return entry
  }

  /**
   * Store a response in the cache.
   */
  set(
    config: ResolvedRequestOptions,
    data: unknown,
    headers: HttpHeaders,
    status: number
  ): void {
    if (!this.config.methods.includes(config.method as HttpMethod)) return

    const key = this.config.keyBuilder(config)
    const now = Date.now()

    // Evict oldest if at capacity
    if (this.store.size >= this.config.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value
      if (oldestKey) this.store.delete(oldestKey)
    }

    const entry: CacheEntry = {
      key,
      data,
      headers,
      status,
      cachedAt: now,
      expiresAt: now + this.config.ttlMs,
      tags: config.tags,
    }
    this.store.set(key, entry)
  }

  /**
   * Invalidate entries by tag. If no tags provided, clears all.
   */
  clear(tags?: string[]): void {
    if (!tags || tags.length === 0) {
      this.store.clear()
      return
    }
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.some((t) => tags.includes(t))) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Invalidate entries by URL pattern (substring match).
   */
  invalidateURL(pattern: string | RegExp): void {
    for (const [key, entry] of this.store.entries()) {
      if (typeof pattern === 'string') {
        if (key.includes(pattern)) this.store.delete(key)
      } else if (pattern.test(key)) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Current cache size.
   */
  get size(): number {
    return this.store.size
  }

  /**
   * Reconfigure the cache (e.g. change TTL on the fly).
   */
  reconfigure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config } as Required<CacheConfig>
  }
}

/**
 * Default key builder: METHOD:URL?query
 */
function defaultKeyBuilder(config: ResolvedRequestOptions): string {
  const qs = config.query ? serializeQuery(config.query) : ''
  return `${config.method}:${config.url || ''}${qs ? `?${qs}` : ''}`
}