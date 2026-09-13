/**
 * SecureStore — stockage clavier OS
 * ==================================
 *
 * Utilisé pour : le refresh token (la donnée d'identification la plus sensible).
 *
 * Sur iOS : stocké dans le Keychain (survit à la désinstallation si on utilise
 * `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`)
 * Sur Android : stocké dans Android Keystore (chiffré, non extractible)
 *
 * expo-secure-store gère les deux plateformes de manière transparente.
 *
 * IMPORTANT : L'import de expo-secure-store est lazy (require dynamique)
 * pour éviter un crash au démarrage si le module natif n'est pas lié
 * (par ex. Expo Go, dev client non prébuildé).
 */

import type { StorageAdapter } from '../types'

let SecureStore: typeof import('expo-secure-store') | null = null
let secureStoreAvailable = false

function getSecureStore(): typeof import('expo-secure-store') | null {
  if (SecureStore) return SecureStore
  try {
    SecureStore = require('expo-secure-store')
    secureStoreAvailable = true
    return SecureStore
  } catch {
    secureStoreAvailable = false
    return null
  }
}

/* ------------------------------------------------------------------ *
 * Adaptateur de stockage Better Auth (uniquement pour le refresh token)
 * ------------------------------------------------------------------ */

const REFRESH_TOKEN_KEY = 'auth_refresh_token'
const ACCESS_TOKEN_KEY = 'auth_access_token'

/**
 * Adaptateur de stockage basé sur SecureStore pour le refresh token.
 *
 * Note : expo-secure-store est async par défaut (depuis SDK 50+).
 * L'adaptateur de stockage Better Auth accepte les retours en Promise.
 *
 * Fallback si SecureStore n'est pas disponible : Map en mémoire (non persistant).
 */
const memoryFallback = new Map<string, string>()

function getSecureStoreOptions(SS: typeof import('expo-secure-store')) {
  return SS.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
    ? { keychainAccessible: SS.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
    : undefined
}

export const secureStorage: StorageAdapter = {
  getItem: async (key: string) => {
    const SS = getSecureStore()
    if (!SS) return memoryFallback.get(key) ?? null
    try {
      return await SS.getItemAsync(key)
    } catch {
      return memoryFallback.get(key) ?? null
    }
  },
  setItem: async (key: string, value: string) => {
    const SS = getSecureStore()
    if (!SS) {
      memoryFallback.set(key, value)
      return
    }
    try {
      const options = getSecureStoreOptions(SS)
      if (options) {
        await SS.setItemAsync(key, value, options)
      } else {
        await SS.setItemAsync(key, value)
      }
    } catch (e) {
      console.warn('[auth-rn] SecureStore.setItemAsync échoué, fallback mémoire', e)
      memoryFallback.set(key, value)
    }
  },
  removeItem: async (key: string) => {
    const SS = getSecureStore()
    if (!SS) {
      memoryFallback.delete(key)
      return
    }
    try {
      await SS.deleteItemAsync(key)
    } catch {
      memoryFallback.delete(key)
    }
  },
}

/* ------------------------------------------------------------------ *
 * Helpers typés
 * ------------------------------------------------------------------ */

export const tokenStorage = {
  getRefreshToken: async () => {
    const SS = getSecureStore()
    if (!SS) return memoryFallback.get(REFRESH_TOKEN_KEY) ?? null
    try {
      return await SS.getItemAsync(REFRESH_TOKEN_KEY)
    } catch {
      return memoryFallback.get(REFRESH_TOKEN_KEY) ?? null
    }
  },
  setRefreshToken: async (token: string) => {
    const SS = getSecureStore()
    if (!SS) { memoryFallback.set(REFRESH_TOKEN_KEY, token); return }
    try {
      const options = getSecureStoreOptions(SS)
      if (options) {
        await SS.setItemAsync(REFRESH_TOKEN_KEY, token, options)
      } else {
        await SS.setItemAsync(REFRESH_TOKEN_KEY, token)
      }
    } catch (e) {
      console.warn('[auth-rn] setRefreshToken échoué, fallback mémoire', e)
      memoryFallback.set(REFRESH_TOKEN_KEY, token)
    }
  },
  clearRefreshToken: async () => {
    const SS = getSecureStore()
    if (!SS) { memoryFallback.delete(REFRESH_TOKEN_KEY); return }
    try {
      await SS.deleteItemAsync(REFRESH_TOKEN_KEY)
    } catch {
      memoryFallback.delete(REFRESH_TOKEN_KEY)
    }
  },

  getAccessToken: async () => {
    const SS = getSecureStore()
    if (!SS) return memoryFallback.get(ACCESS_TOKEN_KEY) ?? null
    try {
      return await SS.getItemAsync(ACCESS_TOKEN_KEY)
    } catch {
      return memoryFallback.get(ACCESS_TOKEN_KEY) ?? null
    }
  },
  setAccessToken: async (token: string) => {
    const SS = getSecureStore()
    if (!SS) { memoryFallback.set(ACCESS_TOKEN_KEY, token); return }
    try {
      const options = getSecureStoreOptions(SS)
      if (options) {
        await SS.setItemAsync(ACCESS_TOKEN_KEY, token, options)
      } else {
        await SS.setItemAsync(ACCESS_TOKEN_KEY, token)
      }
    } catch (e) {
      console.warn('[auth-rn] setAccessToken échoué, fallback mémoire', e)
      memoryFallback.set(ACCESS_TOKEN_KEY, token)
    }
  },
  clearAccessToken: async () => {
    const SS = getSecureStore()
    if (!SS) { memoryFallback.delete(ACCESS_TOKEN_KEY); return }
    try {
      await SS.deleteItemAsync(ACCESS_TOKEN_KEY)
    } catch {
      memoryFallback.delete(ACCESS_TOKEN_KEY)
    }
  },

  clearAll: async () => {
    const SS = getSecureStore()
    if (!SS) { memoryFallback.clear(); return }
    try {
      await SS.deleteItemAsync(REFRESH_TOKEN_KEY)
      await SS.deleteItemAsync(ACCESS_TOKEN_KEY)
    } catch {
      memoryFallback.clear()
    }
  },
} as const

export type TokenStorage = typeof tokenStorage
