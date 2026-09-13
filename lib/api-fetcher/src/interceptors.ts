/**
 * Interceptor chain manager
 * ===========================
 *
 * Manages an ordered list of request/response interceptors.
 * Mirrors Axios semantics:
 *  - Request interceptors run in REVERSE registration order (last added runs first).
 *  - Response interceptors run in registration order (first added runs first).
 *  - If an interceptor throws, the corresponding onRejected handler is called.
 */

import type {
  RequestInterceptor,
  ResponseInterceptor,
  ResolvedRequestOptions,
  ApiResponse,
} from './types'
import type { ApiError } from './errors'
import { uniqueId } from './utils'

export class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  /* ---------------- Request interceptors ---------------- */

  addRequestInterceptor(interceptor: Omit<RequestInterceptor, 'id'>): string {
    const id = uniqueId('req')
    this.requestInterceptors.push({ id, ...interceptor })
    return id
  }

  removeInterceptor(id: string): void {
    this.requestInterceptors = this.requestInterceptors.filter((i) => i.id !== id)
    this.responseInterceptors = this.responseInterceptors.filter((i) => i.id !== id)
  }

  clear(): void {
    this.requestInterceptors = []
    this.responseInterceptors = []
  }

  /* ---------------- Response interceptors ---------------- */

  addResponseInterceptor(interceptor: Omit<ResponseInterceptor, 'id'>): string {
    const id = uniqueId('res')
    this.responseInterceptors.push({ id, ...interceptor })
    return id
  }

  /* ---------------- Run chains ---------------- */

  async runRequestChain(
    config: ResolvedRequestOptions
  ): Promise<ResolvedRequestOptions> {
    let currentConfig = config
    // Reverse order — last added runs first (matches Axios)
    for (const interceptor of [...this.requestInterceptors].reverse()) {
      try {
        const result = await interceptor.onFulfilled(currentConfig)
        if (result) currentConfig = result
      } catch (err) {
        if (interceptor.onRejected) {
          const handled = await interceptor.onRejected(err as ApiError)
          if (handled) throw handled
        }
        throw err
      }
    }
    return currentConfig
  }

  async runResponseChain(
    response: ApiResponse
  ): Promise<ApiResponse> {
    let currentResponse = response
    for (const interceptor of this.responseInterceptors) {
      try {
        const result = await interceptor.onFulfilled(currentResponse)
        if (result) currentResponse = result
      } catch (err) {
        if (interceptor.onRejected) {
          const handled = await interceptor.onRejected(err as ApiError)
          if (handled) throw handled
        }
        throw err
      }
    }
    return currentResponse
  }

  async runResponseErrorChain(error: ApiError): Promise<never> {
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onRejected) {
        try {
          const handled = await interceptor.onRejected(error)
          if (handled) error = handled
        } catch (e) {
          error = e as ApiError
        }
      }
    }
    throw error
  }

  /* ---------------- Introspection ---------------- */

  get requestCount(): number {
    return this.requestInterceptors.length
  }

  get responseCount(): number {
    return this.responseInterceptors.length
  }
}