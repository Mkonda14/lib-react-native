/**
 * Internal utilities — pure functions, zero deps
 * ================================================
 */

/* ------------------------------------------------------------------ *
 * Sleep with abort support
 * ------------------------------------------------------------------ */

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('Aborted'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/* ------------------------------------------------------------------ *
 * Random integer in range [min, max]
 * ------------------------------------------------------------------ */

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/* ------------------------------------------------------------------ *
 * Build a full URL with query string
 * ------------------------------------------------------------------ */

export function buildURL(
  baseURL: string,
  path: string,
  queryString?: string
): string {
  const base = baseURL.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const qs = queryString ? `?${queryString}` : ''
  return `${base}${cleanPath}${qs}`
}

/* ------------------------------------------------------------------ *
 * Apply path params (/users/:id → /users/123)
 * ------------------------------------------------------------------ */

export function applyPathParams(path: string, params?: Record<string, string | number>): string {
  if (!params) return path
  let result = path
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(String(value)))
    result = result.replace(`{${key}}`, encodeURIComponent(String(value)))
  }
  return result
}

/* ------------------------------------------------------------------ *
 * Merge headers (later values win)
 * ------------------------------------------------------------------ */

export function mergeHeaders(
  ...sources: Array<Record<string, string> | undefined>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const src of sources) {
    if (!src) continue
    for (const [key, value] of Object.entries(src)) {
      if (value !== undefined && value !== null) {
        result[key] = value
      }
    }
  }
  return result
}

/* ------------------------------------------------------------------ *
 * Deep merge plain objects (for config)
 * ------------------------------------------------------------------ */

export function deepMerge<T extends Record<string, any>>(base: T, ...overrides: Array<Partial<T>>): T {
  const result: any = Array.isArray(base) ? [...base] : { ...base }
  for (const override of overrides) {
    if (!override) continue
    for (const [key, value] of Object.entries(override)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof (result as any)[key] === 'object' &&
        !Array.isArray((result as any)[key])
      ) {
        ;(result as any)[key] = deepMerge((result as any)[key], value)
      } else if (value !== undefined) {
        ;(result as any)[key] = value
      }
    }
  }
  return result
}

/* ------------------------------------------------------------------ *
 * Generate a unique id (no UUID lib)
 * ------------------------------------------------------------------ */

let _idCounter = 0
export function uniqueId(prefix = 'id'): string {
  return `${prefix}_${++_idCounter}`
}

/* ------------------------------------------------------------------ *
 * Check if an error is an AbortError
 * ------------------------------------------------------------------ */

export function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.name === 'AbortError' || (err as any).code === 'ABORT'
  }
  return false
}

/* ------------------------------------------------------------------ *
 * Convert Headers to plain object
 * ------------------------------------------------------------------ */

export function headersToObject(headers: Headers): Record<string, string> {
  const obj: Record<string, string> = {}
  headers.forEach((value, key) => {
    obj[key.toLowerCase()] = value
  })
  return obj
}

/* ------------------------------------------------------------------ *
 * Timeout promise (rejects after ms)
 * ------------------------------------------------------------------ */

export function timeoutPromise(ms: number, signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('__ABORT'))
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      reject(new Error(`__TIMEOUT_${ms}`))
    }, ms)

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

/* ------------------------------------------------------------------ *
 * Format bytes (for progress reporting)
 * ------------------------------------------------------------------ */

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/* ------------------------------------------------------------------ *
 * Stringify JSON safely (handles circular refs)
 * ------------------------------------------------------------------ */

export function safeStringify(value: unknown): string {
  const seen = new WeakSet()
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]'
      seen.add(val)
    }
    return val
  })
}