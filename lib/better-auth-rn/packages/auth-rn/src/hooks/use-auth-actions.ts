/**
 * useAuthActions — connexion, inscription, déconnexion, réinitialisation mot de passe
 * ===================================================================================
 *
 * Wrapper fin autour de auth/auth.api + le contexte AuthProvider.
 * Utilisez-le dans les écrans au lieu d'appeler apiFetch directement.
 *
 * Pas de dépendance à better-auth — tous les appels passent par apiFetch.
 */

import { useCallback } from 'react'
import { useSession } from '../provider'
import {
  forgotPassword,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
  changePassword,
} from '../auth/auth.api'

import type { SignInResult, SignUpData, SignUpResult } from '../types'

export function useAuthActions() {
  const { signInEmail, signUpEmail, signOut, status } = useSession()

  /* ---------------- Réinitialisation du mot de passe ---------------- */

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await forgotPassword(email)
        return { success: true }
      } catch (e: any) {
        return { success: false, error: e?.message ?? 'Erreur réseau' }
      }
    },
    []
  )

  const handleResetPassword = useCallback(
    async (
      token: string,
      newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await resetPassword(newPassword, token)
        return { success: true }
      } catch (e: any) {
        return { success: false, error: e?.message ?? 'Erreur réseau' }
      }
    },
    []
  )

  /* ---------------- Vérification de l'email ---------------- */

  const handleSendEmailVerification = useCallback(
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        await sendEmailVerification()
        return { success: true }
      } catch (e: any) {
        return { success: false, error: e?.message ?? 'Erreur réseau' }
      }
    },
    []
  )

  const handleVerifyEmail = useCallback(
    async (token: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await verifyEmail(token)
        return { success: true }
      } catch (e: any) {
        return { success: false, error: e?.message ?? 'Erreur réseau' }
      }
    },
    []
  )

  /* ---------------- Changement de mot de passe (authentifié) ---------------- */

  const handleChangePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await changePassword(currentPassword, newPassword)
        return { success: true }
      } catch (e: any) {
        return { success: false, error: e?.message ?? 'Erreur réseau' }
      }
    },
    []
  )

  return {
    signInEmail,
    signUpEmail,
    signOut,
    requestPasswordReset,
    resetPassword: handleResetPassword,
    sendEmailVerification: handleSendEmailVerification,
    verifyEmail: handleVerifyEmail,
    changePassword: handleChangePassword,
    status,
  }
}
