/**
 * useTwoFactor — inscription + vérification TOTP
 * ================================================
 *
 * Flux :
 *  1. L'utilisateur active le 2FA → generateTOTP() — demande le secret + QR au serveur
 *  2. L'utilisateur scanne le QR avec Google Authenticator / Authy
 *  3. L'utilisateur entre le code à 6 chiffres → enableTOTP(code) — le serveur valide + stocke le secret
 *  4. Le serveur retourne les codes de secours (10 codes)
 *  5. L'utilisateur sauvegarde les codes de secours
 *
 * Pour le flux de connexion :
 *  - Après email/mot de passe OK, si le 2FA est activé, le statut passe à 'requiresTwoFactor'
 *  - L'utilisateur entre le code TOTP → appeler verifyTwoFactor()
 *
 * Pas de dépendance à better-auth — tous les appels passent par apiFetch.
 */

import { useCallback, useState } from 'react'
import {
  generateTOTPSecret,
  enableTOTP as apiEnableTOTP,
  disableTOTP as apiDisableTOTP,
  verifyTOTPCode,
  verifyBackupCode as apiVerifyBackupCode,
  getTwoFactorStatus,
} from '../auth/auth.api'
import { mmkvStorage } from '../storage/mmkv'
import { getQRCodeUrl } from '../two-factor/totp'
import type { TOTPSecret, TwoFactorStatus } from '../types'

export function useTwoFactor() {
  const [totpSecret, setTotpSecret] = useState<TOTPSecret | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ---------------- Générer le secret TOTP (étape 1) ---------------- */

  const generateTOTP = useCallback(async (): Promise<TOTPSecret | null> => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateTOTPSecret()
      const secret: TOTPSecret = {
        secret: data.secret,
        uri: data.uri,
        qrCodeUrl: data.qrCodeUrl ?? getQRCodeUrl(data.uri),
      }
      setTotpSecret(secret)
      mmkvStorage.setTotpSecret(secret.secret)
      return secret
    } catch (e: any) {
      setError(e?.message ?? 'Échec de la génération du secret TOTP')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /* ---------------- Vérifier le code TOTP + activer (étape 2) ---------------- */

  const enableTOTP = useCallback(
    async (code: string): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiEnableTOTP(code)
        const codes = data.backupCodes ?? []
        setBackupCodes(codes)
        return { success: true, backupCodes: codes }
      } catch (e: any) {
        const msg = e?.message ?? 'Échec de l\'activation du 2FA'
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /* ---------------- Désactiver le 2FA ---------------- */

  const disableTOTP = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      setLoading(true)
      setError(null)
      try {
        await apiDisableTOTP(code)
        mmkvStorage.clearTotpSecret()
        return { success: true }
      } catch (e: any) {
        const msg = e?.message ?? 'Échec de la désactivation du 2FA'
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /* ---------------- Vérifier le TOTP lors de la connexion ---------------- */

  const verifyTwoFactor = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      setLoading(true)
      setError(null)
      try {
        await verifyTOTPCode(code)
        return { success: true }
      } catch (e: any) {
        const msg = e?.message ?? 'Code invalide'
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /* ---------------- Vérifier un code de secours lors de la connexion ---------------- */

  const verifyBackupCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      setLoading(true)
      setError(null)
      try {
        await apiVerifyBackupCode(code)
        return { success: true }
      } catch (e: any) {
        const msg = e?.message ?? 'Code de secours invalide'
        setError(msg)
        return { success: false, error: msg }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /* ---------------- Récupérer le statut 2FA ---------------- */

  const getStatus = useCallback(async (): Promise<TwoFactorStatus | null> => {
    try {
      const data = await getTwoFactorStatus()
      return {
        enabled: data.enabled,
        hasBackupCodes: (data.backupCodes?.length ?? 0) > 0,
        backupCodes: data.backupCodes,
      }
    } catch {
      return null
    }
  }, [])

  return {
    totpSecret,
    backupCodes,
    loading,
    error,
    generateTOTP,
    enableTOTP,
    disableTOTP,
    verifyTwoFactor,
    verifyBackupCode,
    getStatus,
    clearError: () => setError(null),
  }
}
