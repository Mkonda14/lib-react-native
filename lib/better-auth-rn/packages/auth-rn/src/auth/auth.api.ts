/**
 * Auth API — fonctions métier d'authentification
 * ================================================
 *
 * Chaque fonction normalise/valide ses entrées, appelle l'API,
 * persiste la session et lève une ApiError en cas d'échec.
 *
 * Tous les imports sont locaux à ce package (pas d'alias @/).
 */

import { apiFetch, clearPersistedSession } from '../utils/fetch'
import { ApiError } from '../errors'
import { tokenStorage } from '../storage/secure-store'
import { mmkvStorage } from '../storage/mmkv'
import { getAuthConfig } from '../client'
import type { AuthUser, BetterAuthResponse } from '../types'

/* ------------------------------------------------------------------ *
 * Fonctions utilitaires internes
 * ------------------------------------------------------------------ */

/** Normaliser l'email en minuscules + suppression des espaces. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Réponse Better Auth → forme AuthSession. */
interface AuthSession {
  user: AuthUser
  accessToken: string
  expiresAt?: Date | string
}

function mapToAuthSession(data: BetterAuthResponse): AuthSession {
  const token = data.token ?? data.session?.token ?? ''
  return {
    user: data.user!,
    accessToken: token,
    expiresAt: data.session?.expiresAt,
  }
}

async function persistSession(session: AuthSession): Promise<void> {
  if (session.accessToken) {
    await tokenStorage.setAccessToken(session.accessToken)
  }
  if (session.user) {
    mmkvStorage.setUser(JSON.stringify(session.user))
  }
}

/** Construire l'URL de deep link pour la réinitialisation du mot de passe. */
function buildResetPasswordUrl(token: string): string {
  const config = getAuthConfig()
  return `${config.deepLink.scheme}://reset-password?token=${token}`
}

/* ------------------------------------------------------------------ *
 * Fonctions API
 * ------------------------------------------------------------------ */

/**
 * Connexion Email / Mot de passe.
 *
 * @param email Adresse email (normalisée)
 * @param password Mot de passe en clair
 * @returns AuthSession persistée
 * @throws ApiError 401 credentials invalides · 0 NETWORK_ERROR
 * @permission Public (non authentifié)
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiFetch<BetterAuthResponse>(
    '/api/auth/sign-in/email',
    {
      method: 'POST',
      auth: false,
      body: { email: normalizeEmail(email), password },
    },
  )
  
  const session = mapToAuthSession(data)
  await persistSession(session)
  return session
}

/**
 * Inscription Email / Mot de passe.
 *
 * @param name Nom complet (trim avant envoi)
 * @param email Adresse email (normalisée)
 * @param password Mot de passe (8+ caractères)
 * @returns AuthSession persistée
 * @throws ApiError 409 email déjà utilisé · 400 payload invalide
 * @permission Public (non authentifié)
 */
export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const data = await apiFetch<BetterAuthResponse>(
    '/api/auth/sign-up/email',
    {
      method: 'POST',
      auth: false,
      body: { name: name.trim(), email: normalizeEmail(email), password },
    },
  )

  const session = mapToAuthSession(data)
  await persistSession(session)
  return session
}

/**
 * Connexion via Google OAuth (idToken).
 *
 * @param idToken Jeton d'identité Google (base64url)
 * @returns AuthSession persistée
 * @throws ApiError 400 INVALID_TOKEN · erreurs OAuth serveur
 * @permission Public (non authentifié)
 */
export async function loginWithGoogle(idToken: string): Promise<AuthSession> {
  if (!idToken?.trim()) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Token Google invalide.')
  }

  const data = await apiFetch<BetterAuthResponse>(
    '/api/auth/sign-in/social',
    {
      method: 'POST',
      auth: false,
      body: { provider: 'google', idToken: { token: idToken } },
    },
  )

  const session = mapToAuthSession(data)
  await persistSession(session)
  return session
}

/**
 * Déconnexion.
 *
 * Invalide la session côté serveur et purge TOUJOURS la session locale,
 * même si l'appel réseau échoue (hors-ligne).
 * @permission Authentifié
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/api/auth/sign-out', {
      method: 'POST',
      auth: true,
      body: {},
    })
  } finally {
    await clearPersistedSession()
  }
}

/**
 * Récupération de la session active.
 *
 * - Token absent → null
 * - 401/403 → le refresh est tenté par apiFetch, puis purge si échec
 * - Réseau KO (code 0) → session en cache si non expirée, sinon null
 *
 * @returns AuthSession active ou null
 * @permission Authentifié
 */
export async function getSession(): Promise<AuthSession | null> {
  const token = await tokenStorage.getAccessToken()
  const cachedUser = mmkvStorage.getUser()

  if (!token) return null

  try {
    const data = await apiFetch<BetterAuthResponse>(
      '/api/auth/get-session',
      { method: 'GET', auth: true },
    )

    if (!data?.user) {
      return null
    }

    const session = mapToAuthSession({
      ...data,
      token: data.token ?? token,
      session: { token: data.session?.token ?? token, expiresAt: data.session?.expiresAt },
    })

    await persistSession(session)
    return session
  } catch (error) {
    // apiFetch gère déjà le refresh sur 401 et la purge si échec.
    // On n'appelle PAS clearPersistedSession() ici pour éviter le double clear.
    if (error instanceof ApiError && error.isAuthError) {
      return null
    }

    if (error instanceof ApiError && error.isNetworkError) {
      // Hors-ligne : tenter de lire la session en cache depuis MMKV
      if (cachedUser) {
        try {
          return { user: JSON.parse(cachedUser), accessToken: token }
        } catch {
          return null
        }
      }
      return null
    }

    if (cachedUser) {
      try {
        return { user: JSON.parse(cachedUser), accessToken: token }
      } catch {}
    }

    return null
  }
}

/**
 * Demande de réinitialisation de mot de passe.
 *
 * Envoie un email de réinitialisation via Better Auth.
 * Le lien redirige vers le deep link de l'app.
 *
 * @param email Adresse du compte (normalisée)
 * @throws ApiError 400 si email invalide
 * @permission Public (non authentifié)
 */
export async function forgotPassword(email: string): Promise<void> {
  const config = getAuthConfig()
  const redirectTo = `${config.deepLink.scheme}://reset-password`

  await apiFetch<void>('/api/auth/forget-password', {
    method: 'POST',
    auth: false,
    body: { email: normalizeEmail(email), redirectTo },
  })
}

/**
 * Réinitialisation du mot de passe avec un token.
 *
 * @param newPassword Nouveau mot de passe
 * @param token Token de réinitialisation (deep link ou saisi manuellement)
 * @throws ApiError 400 INVALID_TOKEN · token expiré/invalide
 * @permission Public (non authentifié)
 */
export async function resetPassword(
  newPassword: string,
  token: string,
): Promise<void> {
  if (!token?.trim()) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Token de réinitialisation invalide.')
  }

  await apiFetch<void>('/api/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { newPassword, token: token.trim() },
  })
}

/**
 * Envoi de l'email de vérification.
 *
 * @permission Public (non authentifié) ou Authentifié (si vérification après inscription)
 */
export async function sendEmailVerification(): Promise<void> {
  await apiFetch<void>('/api/auth/send-verification-email', {
    method: 'POST',
    auth: false,
  })
}

/**
 * Vérification de l'email avec le code/token.
 *
 * @param token Token de vérification
 * @throws ApiError 400 INVALID_TOKEN
 * @permission Public (non authentifié)
 */
export async function verifyEmail(token: string): Promise<void> {
  if (!token?.trim()) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Token de vérification invalide.')
  }

  await apiFetch<void>('/api/auth/verify-email', {
    method: 'POST',
    auth: false,
    body: { token: token.trim() },
  })
}

/**
 * Changement de mot de passe.
 *
 * @param currentPassword Mot de passe actuel
 * @param newPassword Nouveau mot de passe
 * @permission Authentifié
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<void>('/api/auth/change-password', {
    method: 'POST',
    auth: true,
    body: { currentPassword, newPassword },
  })
}

/* ------------------------------------------------------------------ *
 * 2FA — TOTP
 * ------------------------------------------------------------------ */

export interface TOTPGenerateResult {
  secret: string
  uri: string
  qrCodeUrl?: string
}

export interface TOTPEnableResult {
  backupCodes?: string[]
}

export interface TwoFactorStatusResult {
  enabled: boolean
  backupCodes?: string[]
}

/**
 * Génère un secret TOTP côté serveur.
 *
 * @returns Secret + URI otpauth:// + URL QR optionnelle
 * @permission Authentifié
 */
export async function generateTOTPSecret(): Promise<TOTPGenerateResult> {
  return apiFetch<TOTPGenerateResult>('/api/auth/two-factor/generate', {
    method: 'POST',
    auth: true,
  })
}

/**
 * Active le 2FA TOTP en validant le premier code.
 *
 * @param code Code à 6 chiffres
 * @returns Codes de secours générés par le serveur
 * @permission Authentifié
 */
export async function enableTOTP(code: string): Promise<TOTPEnableResult> {
  return apiFetch<TOTPEnableResult>('/api/auth/two-factor/enable', {
    method: 'POST',
    auth: true,
    body: { code },
  })
}

/**
 * Désactive le 2FA TOTP.
 *
 * @param code Code TOTP ou code de secours pour confirmation
 * @permission Authentifié
 */
export async function disableTOTP(code: string): Promise<void> {
  await apiFetch<void>('/api/auth/two-factor/disable', {
    method: 'POST',
    auth: true,
    body: { code },
  })
}

/**
 * Vérifie un code TOTP lors du sign-in (étape 2FA).
 *
 * @param code Code à 6 chiffres
 * @permission Semi-authentifié (session 2FA pending)
 */
export async function verifyTOTPCode(code: string): Promise<void> {
  await apiFetch<void>('/api/auth/two-factor/verify-totp', {
    method: 'POST',
    auth: false,
    body: { code },
  })
}

/**
 * Vérifie un code de secours lors du sign-in.
 *
 * @param code Code de secours (8 caractères)
 * @permission Semi-authentifié (session 2FA pending)
 */
export async function verifyBackupCode(code: string): Promise<void> {
  await apiFetch<void>('/api/auth/two-factor/verify-backup', {
    method: 'POST',
    auth: false,
    body: { code },
  })
}

/**
 * Récupère le statut 2FA de l'utilisateur connecté.
 *
 * @permission Authentifié
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatusResult> {
  return apiFetch<TwoFactorStatusResult>('/api/auth/two-factor/status', {
    method: 'GET',
    auth: true,
  })
}

/* ------------------------------------------------------------------ *
 * OAuth — Connexion sociale
 * ------------------------------------------------------------------ */

export interface SocialSignInResult {
  url?: string  // URL de redirection (web flow)
  session?: { token: string; expiresAt?: string | Date }
  user?: AuthUser
  refreshToken?: string
}

/**
 * Initie la connexion sociale (Google / Apple — web flow).
 *
 * En mode web-flow, le backend retourne une `url` vers laquelle
 * l'app doit ouvrir un browser (expo-web-browser).
 *
 * @param provider 'google' | 'apple'
 * @param callbackUrl Deep link de retour (ex. myapp1://auth-callback)
 * @param disableRedirect Si true, le backend retourne l'URL sans rediriger
 * @permission Public (non authentifié)
 */
export async function signInWithSocial(
  provider: string,
  callbackUrl: string,
  disableRedirect = true,
): Promise<SocialSignInResult> {
  return apiFetch<SocialSignInResult>('/api/auth/sign-in/social', {
    method: 'POST',
    auth: false,
    body: { provider, callbackURL: callbackUrl, disableRedirect },
  })
}

/**
 * Connexion Apple native iOS — envoie le `identityToken` directement.
 *
 * @param identityToken JWT fourni par Apple Sign In
 * @param callbackUrl Deep link de retour
 * @permission Public (non authentifié)
 */
export async function signInWithAppleToken(
  identityToken: string,
  callbackUrl: string,
): Promise<AuthSession> {
  const data = await apiFetch<BetterAuthResponse>('/api/auth/sign-in/social', {
    method: 'POST',
    auth: false,
    body: {
      provider: 'apple',
      callbackURL: callbackUrl,
      idToken: identityToken,
    },
  })
  const session = mapToAuthSession(data)
  await persistSession(session)
  return session
}
