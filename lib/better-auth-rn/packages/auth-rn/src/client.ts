/**
 * auth-rn — Façade du client d'authentification
 * ===============================================
 *
 * Ce module ne dépend PAS de `better-auth`. Il gère :
 *  - Le stockage de la config active (backendUrl, etc.)
 *  - L'initialisation de MMKV (storage chiffré)
 *  - L'initialisation de apiFetch (backendUrl + scheme)
 *
 * Toutes les opérations réseau passent directement par `apiFetch` (utils/fetch)
 * et les fonctions de `auth/auth.api.ts`.
 *
 * Initialiser UNE SEULE FOIS au démarrage via `initAuthClient(config)` (appelé par <AuthProvider>).
 */

import { Platform } from 'react-native'
import type { AuthConfig } from './types'
import { initMMKV } from './storage/mmkv'
import { setApiConfig, setAuthConfig } from './utils/fetch'

let activeConfig: AuthConfig | null = null

function resolveBackendUrl(url: string): string {
  if (Platform.OS === 'android') {
    return url.replace('127.0.0.1', '10.0.2.2').replace('localhost', '10.0.2.2')
  }
  return url
}

/**
 * Initialize the auth layer.
 * Called by <AuthProvider> on app boot.
 *
 * - Initializes MMKV (encrypted session storage)
 * - Registers the backend URL and deep link scheme for `apiFetch`
 *
 * Idempotent: safe to call multiple times with the same config.
 */
export async function initAuthClient(config: AuthConfig): Promise<void> {
  const resolvedBackendUrl = resolveBackendUrl(config.backendUrl)
  const resolvedConfig = { ...config, backendUrl: resolvedBackendUrl }

  // Ignorer la réinitialisation si l'URL du backend n'a pas changé
  if (activeConfig?.backendUrl === resolvedConfig.backendUrl) {
    return
  }

  activeConfig = resolvedConfig

  // 1. Init encrypted MMKV storage
  await initMMKV(resolvedConfig)

  // 2. Register backendUrl + deep-link scheme for apiFetch
  setApiConfig(resolvedConfig.backendUrl, resolvedConfig.deepLink.scheme)
  setAuthConfig(resolvedConfig)

  if (resolvedConfig.debug) {
    console.log('[auth-rn] initAuthClient — backendUrl:', resolvedConfig.backendUrl)
  }
}

/**
 * Récupérer la config d'authentification active.
 * Lance une erreur si non initialisé.
 */
export function getAuthConfig(): AuthConfig {
  if (!activeConfig) {
    throw new Error(
      'Auth config not set. Wrap your app in <AuthProvider config={...}>.'
    )
  }
  return activeConfig
}

/**
 * Réinitialiser le client (utilisé pour les tests).
 */
export function resetAuthClient() {
  activeConfig = null
}
