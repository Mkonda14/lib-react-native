/**
 * useBiometric — déverrouillage Face ID / Touch ID
 * ==================================================
 *
 * Après la connexion, l'utilisateur peut activer le déverrouillage biométrique.
 * Au prochain lancement de l'app, si la biométrie est activée, on tente de lire
 * le refresh token depuis SecureStore (qui nécessite l'auth biométrique sur iOS
 * via `requireAuthentication`).
 *
 * Note : le refresh token est stocké avec `AFTER_FIRST_UNLOCK` (sans nécessiter
 * la biométrie), la biométrie est donc imposée au niveau de l'app via un
 * drapeau séparé protégé par biométrie.
 */

import { useCallback, useEffect, useState } from 'react'
import { mmkvStorage } from '../storage/mmkv'
import type { BiometricStatus } from '../types'

function getLocalAuth(): typeof import('expo-local-authentication') | null {
  try { return require('expo-local-authentication') } catch { return null }
}

export function useBiometric() {
  const [status, setStatus] = useState<BiometricStatus>({
    available: false,
    enrolled: false,
    types: [],
  })
  const [enabled, setEnabled] = useState<boolean>(mmkvStorage.isBiometricEnabled())

  // Vérifier la disponibilité de la biométrie au montage
  useEffect(() => {
    const check = async () => {
      const LA = getLocalAuth()
      if (!LA) {
        setStatus({ available: false, enrolled: false, types: [] })
        return
      }
      
      try {
        const compatible = await LA.hasHardwareAsync()
        const enrolled = await LA.isEnrolledAsync()
        const supportedTypes = await LA.supportedAuthenticationTypesAsync()

        const mapped = supportedTypes.map((t: number) => {
          switch (t) {
            case 1: // FINGERPRINT
              return 'fingerprint'
            case 12: // FACIAL_RECOGNITION
              return 'facial'
            case 4: // IRIS
              return 'iris'
            default:
              return 'fingerprint'
          }
        })

        setStatus({
          available: compatible,
          enrolled,
          types: mapped as BiometricStatus['types'],
        })
      } catch (e) {
        setStatus({ available: false, enrolled: false, types: [] })
      }
    }
    check()
  }, [])

  /* ---------------- Activer la biométrie ---------------- */

  const enable = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!status.available || !status.enrolled) {
      return { success: false, error: 'Biométrie non disponible ou non configurée' }
    }
    const LA = getLocalAuth()
    if (!LA) return { success: false, error: 'Module biométrie indisponible' }
    const result = await LA.authenticateAsync({
      promptMessage: 'Activez le déverrouillage biométrique',
      cancelLabel: 'Annuler',
      fallbackLabel: 'Utiliser le code',
    })
    if (!result.success) {
      return { success: false, error: result.error ?? 'Échec de l\'authentification' }
    }
    mmkvStorage.setBiometricEnabled(true)
    setEnabled(true)
    return { success: true }
  }, [status])

  /* ---------------- Désactiver la biométrie ---------------- */

  const disable = useCallback(() => {
    mmkvStorage.setBiometricEnabled(false)
    setEnabled(false)
  }, [])

  /* ---------------- Authentifier (déverrouiller l'app) ---------------- */

  const authenticate = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      if (!enabled) return { success: false, error: 'Biométrie non activée' }
      const LA = getLocalAuth()
      if (!LA) return { success: false, error: 'Module biométrie indisponible' }
      const result = await LA.authenticateAsync({
        promptMessage: 'Déverrouillez l\'application',
        cancelLabel: 'Annuler',
        fallbackLabel: 'Utiliser le code',
        disableDeviceFallback: false,
      })
      if (!result.success) {
        return { success: false, error: result.error ?? 'Échec de l\'authentification' }
      }
      return { success: true }
    },
    [enabled]
  )

  return {
    status,
    enabled,
    enable,
    disable,
    authenticate,
  }
}
