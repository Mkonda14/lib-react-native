/**
 * Default constants
 * ==================
 */

import type { ApiClientConfig, RetryConfig, CacheConfig } from './types'

export const DEFAULT_TIMEOUT = 30000

export const DEFAULT_RETRY: RetryConfig = {
  attempts: 3,
  initialDelayMs: 500,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  jitter: true,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
  retryOnNetworkError: true,
}

export const DEFAULT_CACHE: CacheConfig = {
  ttlMs: 60000,
  methods: ['GET'],
  maxEntries: 100,
}

export const DEFAULT_CONFIG: Partial<ApiClientConfig> = {
  timeout: DEFAULT_TIMEOUT,
  retry: DEFAULT_RETRY,
  cache: false, // disabled by default; opt-in
  dedupe: true,
  responseType: 'json',
  authScheme: 'Bearer',
  debug: false,
}