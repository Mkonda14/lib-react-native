/**
 * Wrappers fetch — createAuthFetch + apiFetch
 * ===========================================
 *
 * Deux couches :
 *  1. `createAuthFetch(config)` — interne, utilisé par le client Better Auth.
 *     Injecte le token Bearer, rafraîchit sur 401, déduplique les rafraîchissements concourants.
 *  2. `apiFetch<T>(endpoint, options)` — public, pour les appels API de l'app.
 *     Ajoute le délai d'attente, les paramètres de requête, la normalisation des erreurs, l'en-tête expo-origin.
 *
 * Les deux partagent le même stockage de tokens (MMKV + SecureStore).
 */

import { tokenStorage } from '../storage/secure-store'
import { mmkvStorage } from '../storage/mmkv'
import { buildApiUrl } from '../config'
import { ApiError, parseErrorBody } from '../errors'
import type { AuthConfig, ApiFetchOptions, QueryParams } from '../types'

/* ------------------------------------------------------------------ *
 * État global
 * ------------------------------------------------------------------ */

let refreshPromise: Promise<boolean> | null = null
let onUnauthenticatedCallback: (() => void) | null = null
let _activeConfig: AuthConfig | null = null

/**
 * Définir un callback déclenché lorsque la session devient invalide (échec du rafraîchissement).
 * L'AuthProvider l'utilise pour rediriger vers l'écran de connexion.
 */
export function setOnUnauthenticated(cb: () => void) {
  onUnauthenticatedCallback = cb
}

/* ------------------------------------------------------------------ *
 * Couche 1 : createAuthFetch — wrapper client Better Auth
 * ------------------------------------------------------------------ */

/**
 * Construire une fonction fetch authentifiée liée à une config.
 * Utilisée en interne par le client Better Auth (via `customFetchImpl`).
 */
export function createAuthFetch(config: AuthConfig) {
  return async function authFetch(
    input: string | URL,
    init: RequestInit = {},
  ): Promise<Response> {
    const url =
      typeof input === 'string' && input.startsWith('/')
        ? buildApiUrl(config, input)
        : input.toString()

    const headers = new Headers(init.headers)

    // Injection de l'en-tête Authorization
    const accessToken = await tokenStorage.getAccessToken()
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json')
    }

    let response = await fetch(url, { ...init, headers })

    // En cas de 401, tenter un rafraîchissement + nouvelle tentative (une seule fois)
    if (response.status === 401) {
      const refreshed = await refreshIfNeeded(config)
      if (refreshed) {
        const newToken = await tokenStorage.getAccessToken()
        if (newToken) headers.set('Authorization', `Bearer ${newToken}`)
        response = await fetch(url, { ...init, headers })
      } else {
        await clearPersistedSession()
        onUnauthenticatedCallback?.()
      }
    }

    return response
  }
}

/* ------------------------------------------------------------------ *
 * Logique de rafraîchissement (dédupliquée — les 401 concourants
 * partagent la même promesse)
 * ------------------------------------------------------------------ */

export async function refreshIfNeeded(config?: AuthConfig): Promise<boolean> {
  const cfg = config ?? _activeConfig
  if (!cfg) return false
  if (refreshPromise) return refreshPromise

  refreshPromise = doRefresh(cfg).finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

async function doRefresh(config: AuthConfig): Promise<boolean> {
  try {
    const refreshToken = await tokenStorage.getRefreshToken()
    if (!refreshToken) return false

    const res = await fetch(buildApiUrl(config, '/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return false

    const data = await res.json()
    if (data?.session?.token) {
      await tokenStorage.setAccessToken(data.session.token)
    }
    if (data?.refreshToken) {
      await tokenStorage.setRefreshToken(data.refreshToken)
    }
    if (data?.session) {
      mmkvStorage.setSession(JSON.stringify(data.session))
    }
    if (data?.user) {
      mmkvStorage.setUser(JSON.stringify(data.user))
    }
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ *
 * Couche 2 : apiFetch — API publique pour les appels de niveau app
 * ------------------------------------------------------------------ */

/**
 * Construire la chaîne de requête à partir des paramètres.
 * Gère les tableaux (clé répétée).
 */
function buildQueryString(params?: QueryParams): string {
  if (!params) return ''

  const url = new URL('https://placeholder.com')

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item))
      }
    } else {
      url.searchParams.set(key, String(value))
    }
  }

  const qs = url.searchParams.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Déballer les réponses de type `{ data: T }`.
 * Si le payload est enveloppé dans { data }, retourne la valeur interne.
 */
export function unwrapPayload<T>(payload: T | { data: T }): T {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data: T }).data !== undefined
  ) {
    return (payload as { data: T }).data
  }
  return payload as T
}

/**
 * Fetch API centralisé avec :
 *  - Injection du token Bearer
 *  - En-tête expo-origin (pour le plugin Better Auth)
 *  - Délai d'attente via AbortController
 *  - Constructeur de paramètres de requête
 *  - Normalisation des erreurs (ApiError)
 *  - Tentative de refresh sur 401 avant purge
 *
 * @example
 * ```ts
 * const user = await apiFetch<User>('/api/user', { params: { id: '123' } })
 * const res = await apiFetch<void>('/api/thing', { method: 'POST', body: { name: 'x' } })
 * ```
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    auth = true,
    requireAuth = false,
    timeout,
    params,
    body,
    headers: customHeaders,
    method,
  } = options

  // Construction de l'URL
  const base = buildApiUrlConfig()
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const queryString = buildQueryString(params)
  const url = `${base}${path}${queryString}`

  // Construction des en-têtes
  const headers = new Headers()
  headers.set('Accept', 'application/json')
  headers.set('Content-Type', 'application/json')
  headers.set('expo-origin', buildExpoOrigin())

  if (customHeaders) {
    for (const [key, value] of Object.entries(customHeaders)) {
      headers.set(key, value)
    }
  }

  const hasJsonBody = body !== undefined && body !== null

  // Injection du token
  if (auth || requireAuth) {
    const token = await tokenStorage.getAccessToken()

    if (requireAuth && !token) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'Session expirée. Veuillez vous reconnecter.')
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
      headers.set('Cache-Control', 'no-store')
    }
  }

  // Délai d'attente
  const timeoutMs = timeout ?? 30000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const httpMethod = method ?? (hasJsonBody ? 'POST' : 'GET')
  const isPostOrPut = httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH'
  const finalBody = hasJsonBody ? JSON.stringify(body) : (isPostOrPut ? '{}' : undefined)

  try {
    let response = await fetch(url, {
      method: httpMethod,
      headers,
      body: finalBody,
      signal: controller.signal,
    })

    // Sur 401 avec auth → tenter un refresh AVANT de purger
    if (response.status === 401 && auth) {
      const refreshed = await refreshIfNeeded()
      if (refreshed) {
        // Relancer la requête avec le nouveau token
        const newToken = await tokenStorage.getAccessToken()
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`)
        }
        response = await fetch(url, {
          method: method ?? (hasJsonBody ? 'POST' : 'GET'),
          headers,
          body: hasJsonBody ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })
      }
    }

    // Gestion des erreurs
    if (!response.ok) {
      const { code, message } = await parseErrorBody(response)

      // Purge de la session sur 401 (seulement si le refresh a échoué ou n'a pas été tenté)
      if (response.status === 401 && auth) {
        await clearPersistedSession()
        onUnauthenticatedCallback?.()
      }

      throw new ApiError(response.status, code, message)
    }

    // Pas de contenu
    if (response.status === 204) {
      return undefined as T
    }

    const text = await response.text()
    if (!text) return undefined as T

    try {
      return JSON.parse(text) as T
    } catch {
      throw new ApiError(500, 'INVALID_JSON', 'Réponse serveur invalide (JSON attendu).')
    }
  } catch (error) {
    if (error instanceof ApiError) throw error

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', 'La requête a expiré. Vérifiez votre connexion.')
    }

    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur. Vérifiez votre connexion.')
  } finally {
    clearTimeout(timeoutId)
  }
}

/* ------------------------------------------------------------------ *
 * Fonctions utilitaires
 * ------------------------------------------------------------------ */

/** Lire l'URL du backend depuis la config active (lance une erreur si non définie). */
function buildApiUrlConfig(): string {
  if (!_activeBackendUrl) {
    throw new Error(
      'Backend URL not set. Call setApiConfig() first (usually in AuthProvider).',
    )
  }
  return _activeBackendUrl.replace(/\/$/, '')
}

/** Construire la valeur de l'en-tête expo-origin. */
function buildExpoOrigin(): string {
  if (!_activeScheme) return ''
  return `${_activeScheme}://`
}

/** Config au niveau du module (définie par l'AuthProvider). */
let _activeBackendUrl: string | null = null
let _activeScheme: string | null = null

/**
 * Définir la config API. Appelé par l'AuthProvider au démarrage.
 */
export function setApiConfig(backendUrl: string, scheme: string) {
  _activeBackendUrl = backendUrl
  _activeScheme = scheme
}

/**
 * Définir la config complète (pour le refresh token).
 */
export function setAuthConfig(config: AuthConfig) {
  _activeConfig = config
}

/**
 * Purger toutes les données de session persistées (MMKV + SecureStore).
 * Appelé lors de la déconnexion ou si le rafraîchissement échoue.
 */
export async function clearPersistedSession() {
  await tokenStorage.clearAll()
  mmkvStorage.clearAll()
}
