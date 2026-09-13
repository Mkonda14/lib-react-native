/**
 * Plugin manager
 * ================
 *
 * Plugins are a higher-level extension mechanism than interceptors.
 * A plugin can implement onRequest / onResponse / onError hooks
 * without needing to manage interceptor ids.
 *
 * Use cases:
 *  - Auth plugin (inject token + refresh on 401)
 *  - Logging plugin (structured logs)
 *  - Analytics plugin (track requests)
 *  - Sentry plugin (capture errors)
 *  - Devtools plugin (request inspector)
 */

import type { ApiPlugin, ApiClientInterface, ResolvedRequestOptions, ApiResponse } from './types'
import type { ApiError } from './errors'

export class PluginManager {
  private plugins: ApiPlugin[] = []

  add(plugin: ApiPlugin): void {
    if (this.plugins.find((p) => p.name === plugin.name)) {
      console.warn(`[api-fetcher] Plugin "${plugin.name}" already registered — skipping`)
      return
    }
    this.plugins.push(plugin)
  }

  remove(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name)
  }

  /** Returns the names of all registered plugins. */
  list(): string[] {
    return this.plugins.map((p) => p.name)
  }

  /** Run setup hooks (called once when the plugin is added). */
  setupAll(client: ApiClientInterface): void {
    for (const plugin of this.plugins) {
      plugin.setup?.(client)
    }
  }

  /** Run onRequest hooks in registration order. */
  async runOnRequest(config: ResolvedRequestOptions): Promise<ResolvedRequestOptions> {
    let current = config
    for (const plugin of this.plugins) {
      if (plugin.onRequest) {
        const result = await plugin.onRequest(current)
        if (result) current = result
      }
    }
    return current
  }

  /** Run onResponse hooks in registration order. */
  async runOnResponse(response: ApiResponse): Promise<ApiResponse> {
    let current = response
    for (const plugin of this.plugins) {
      if (plugin.onResponse) {
        const result = await plugin.onResponse(current)
        if (result) current = result
      }
    }
    return current
  }

  /** Run onError hooks in registration order. */
  async runOnError(error: ApiError): Promise<ApiError> {
    let current = error
    for (const plugin of this.plugins) {
      if (plugin.onError) {
        try {
          const result = await plugin.onError(current)
          if (result) current = result
        } catch (e) {
          current = e as ApiError
        }
      }
    }
    return current
  }
}