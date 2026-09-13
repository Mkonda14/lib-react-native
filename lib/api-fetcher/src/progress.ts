/**
 * Upload / Download with progress (via XHR)
 * ==========================================
 *
 * React Native's `fetch` does not expose progress events. For uploads and
 * downloads with progress, we fall back to `XMLHttpRequest`, which is
 * supported natively in RN.
 *
 * The same interceptors / retry / error types are used as with fetch.
 */

import type { ProgressEvent } from './types'
import { ApiNetworkError, ApiAbortError } from './errors'

export interface XhrOptions {
  method: string
  url: string
  headers: Record<string, string>
  body?: BodyInit | null
  timeout: number
  signal?: AbortSignal
  onProgress?: (e: ProgressEvent) => void
}

export interface XhrResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  ok: boolean
  text: () => Promise<string>
}

/**
 * Send a request via XMLHttpRequest, with progress tracking.
 */
export function sendViaXHR(opts: XhrOptions): Promise<XhrResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(opts.method, opts.url, true)

    // Set headers
    for (const [key, value] of Object.entries(opts.headers)) {
      try {
        xhr.setRequestHeader(key, value)
      } catch {
        // Some headers can't be set (e.g. User-Agent on iOS WKWebView)
      }
    }

    // Separate speed tracking for upload and download phases
    let uploadLastLoaded = 0
    let uploadLastTime = Date.now()
    let downloadLastLoaded = 0
    let downloadLastTime = Date.now()

    xhr.upload.onprogress = (e: globalThis.ProgressEvent) => {
      if (!e.lengthComputable) return
      const loaded = (e as any).loaded as number
      const total = (e as any).total as number
      const now = Date.now()
      const speed = computeSpeed(loaded - uploadLastLoaded, now - uploadLastTime)
      uploadLastLoaded = loaded
      uploadLastTime = now
      opts.onProgress?.({
        loaded,
        total,
        progress: total ? loaded / total : 0,
        speed,
      })
    }

    xhr.onprogress = (e: globalThis.ProgressEvent) => {
      if (!e.lengthComputable) return
      const loaded = (e as any).loaded as number
      const total = (e as any).total as number
      const now = Date.now()
      const speed = computeSpeed(loaded - downloadLastLoaded, now - downloadLastTime)
      downloadLastLoaded = loaded
      downloadLastTime = now
      opts.onProgress?.({
        loaded,
        total,
        progress: total ? loaded / total : 0,
        speed,
      })
    }

    xhr.onload = () => {
      opts.signal?.removeEventListener('abort', onAbort)
      const status = xhr.status
      resolve({
        status,
        statusText: xhr.statusText,
        headers: parseXHRHeaders(xhr.getAllResponseHeaders()),
        body: xhr.responseText,
        ok: status >= 200 && status < 300,
        text: () => Promise.resolve(xhr.responseText),
      })
    }

    xhr.onerror = () => {
      opts.signal?.removeEventListener('abort', onAbort)
      reject(new ApiNetworkError('XMLHttpRequest failed', { url: opts.url, method: opts.method }))
    }

    xhr.ontimeout = () => {
      opts.signal?.removeEventListener('abort', onAbort)
      reject(new ApiNetworkError(`XHR timed out after ${opts.timeout}ms`, { url: opts.url, method: opts.method }))
    }

    xhr.timeout = opts.timeout

    // Abort support
    const onAbort = () => {
      xhr.abort()
      reject(new ApiAbortError('Request aborted'))
    }

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort()
        reject(new ApiAbortError('Aborted before send'))
        return
      }
      opts.signal.addEventListener('abort', onAbort, { once: true })
    }

    // Send
    try {
      xhr.send((opts.body as any) ?? null)
    } catch (err) {
      opts.signal?.removeEventListener('abort', onAbort)
      reject(new ApiNetworkError(`XHR send failed: ${(err as Error).message}`))
    }
  })
}

function computeSpeed(bytes: number, ms: number): number {
  if (ms <= 0) return 0
  return (bytes / ms) * 1000 // bytes per second
}

function parseXHRHeaders(rawHeaders: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!rawHeaders) return headers
  const lines = rawHeaders.trim().split(/\r?\n/)
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    headers[key] = value
  }
  return headers
}
