/**
 * AuthProvider — fournisseur de contexte racine
 * ==============================================
 *
 * Enveloppez la racine de votre app avec ce fournisseur. Il :
 *  - Initialise la couche d'authentification (MMKV + config apiFetch) une fois au démarrage
 *  - Restaure la session depuis le stockage au démarrage
 *  - Expose le contexte d'authentification via useSession()
 *
 * Tous les appels réseau passent par auth/auth.api.ts (aucune dépendance à better-auth).
 */

import * as React from 'react'
import { initAuthClient } from './client'
import { setOnUnauthenticated, clearPersistedSession } from './utils/fetch'
import {
  getSession,
  loginWithEmail,
  registerWithEmail,
  logout,
} from './auth/auth.api'
import type {
  AuthConfig,
  AuthContextValue,
  AuthStatus,
  Session,
  SignInResult,
  SignUpData,
  SignUpResult,
} from './types'

const AuthContext = React.createContext<AuthContextValue | null>(null)

export interface AuthProviderProps {
  config: AuthConfig
  children: React.ReactNode
}

export function AuthProvider({ config, children }: AuthProviderProps) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [status, setStatus] = React.useState<AuthStatus>('loading')
  const [error, setError] = React.useState<string | null>(null)

  // Connecter le callback "non authentifié" (déclenché quand une requête reçoit un 401)
  React.useEffect(() => {
    setOnUnauthenticated(() => {
      setSession(null)
      setStatus('unauthenticated')
    })
  }, [])

  /* ------------------------------------------------------------------ *
   * Initialisation + restauration de la session au démarrage
   *
   * IMPORTANT : Ces deux opérations DOIVENT être séquentielles.
   * initAuthClient initialise MMKV + configure apiFetch (backendUrl).
   * restoreSession appelle apiFetch pour valider le token.
   * Si restoreSession s'exécute avant initAuthClient, le backend URL
   * n'est pas encore défini et la requête échoue.
   * ------------------------------------------------------------------ */

  React.useEffect(() => {
    let cancelled = false

    async function initAndRestore() {
      // 1. Initialiser le stockage + la config réseau
      await initAuthClient(config)

      // 2. Restauration de la session (apiFetch est maintenant configuré)
      if (cancelled) return
      try {
        const authSession = await getSession()
        if (cancelled) return

        if (!authSession) {
          setSession(null)
          setStatus('unauthenticated')
          return
        }

        setSession({
          user: authSession.user,
          session: {
            id: '',
            token: authSession.accessToken,
            expiresAt: authSession.expiresAt
              ? new Date(authSession.expiresAt)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
        setStatus('authenticated')
      } catch (e) {
        if (cancelled) return
        if (config.debug) console.warn('[auth-rn] restore failed', e)
        setSession(null)
        setStatus('unauthenticated')
      }
    }

    initAndRestore()

    return () => {
      cancelled = true
    }
  }, [config])

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */

  const signInEmail = React.useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        setError(null)
        const authSession = await loginWithEmail(email, password)

        if ((authSession as any)?.requiresTwoFactor) {
          setStatus('requiresTwoFactor')
          return { success: false, requiresTwoFactor: true }
        }

        if (authSession.user && !authSession.user.emailVerified) {
          setStatus('requiresEmailVerification')
          setSession({
            user: authSession.user,
            session: {
              id: '',
              token: authSession.accessToken,
              expiresAt: authSession.expiresAt
                ? new Date(authSession.expiresAt)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          })
          return { success: false, requiresEmailVerification: true }
        }

        setSession({
          user: authSession.user,
          session: {
            id: '',
            token: authSession.accessToken,
            expiresAt: authSession.expiresAt
              ? new Date(authSession.expiresAt)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
        setStatus('authenticated')
        return { success: true }
      } catch (e: any) {
        const msg = e?.message ?? 'Network error'
        setError(msg)
        return { success: false, error: msg }
      }
    },
    []
  )

  const signUpEmail = React.useCallback(
    async (data: SignUpData): Promise<SignUpResult> => {
      try {
        setError(null)
        const authSession = await registerWithEmail(
          data.name ?? '',
          data.email,
          data.password,
        )

        if (authSession.user && !authSession.user.emailVerified) {
          setStatus('requiresEmailVerification')
          setSession({
            user: authSession.user,
            session: {
              id: '',
              token: authSession.accessToken,
              expiresAt: authSession.expiresAt
                ? new Date(authSession.expiresAt)
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          })
          return { success: true, requiresEmailVerification: true }
        }

        setSession({
          user: authSession.user,
          session: {
            id: '',
            token: authSession.accessToken,
            expiresAt: authSession.expiresAt
              ? new Date(authSession.expiresAt)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
        setStatus('authenticated')
        return { success: true }
      } catch (e: any) {
        const msg = e?.message ?? 'Network error'
        setError(msg)
        return { success: false, error: msg }
      }
    },
    []
  )

  const signOut = React.useCallback(async () => {
    try {
      await logout()
    } catch {
      // logout() purge toujours localement même en cas d'erreur réseau
    }
    setSession(null)
    setStatus('unauthenticated')
  }, [])

  const refresh = React.useCallback(async () => {
    try {
      const authSession = await getSession()
      if (!authSession) {
        setSession(null)
        setStatus('unauthenticated')
        return
      }
      setSession({
        user: authSession.user,
        session: {
          id: '',
          token: authSession.accessToken,
          expiresAt: authSession.expiresAt
            ? new Date(authSession.expiresAt)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
      setStatus('authenticated')
    } catch (e) {
      setSession(null)
      setStatus('unauthenticated')
    }
  }, [])

  const clearError = React.useCallback(() => setError(null), [])

  /* ------------------------------------------------------------------ *
   * Valeur du contexte
   * ------------------------------------------------------------------ */

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      isLoading: status === 'loading',
      error,
      clearError,
      signInEmail,
      signUpEmail,
      signOut,
      refresh,
    }),
    [session, status, error, clearError, signInEmail, signUpEmail, signOut, refresh]
  )

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  ) as React.ReactElement
}

/**
 * useSession — hook principal pour accéder à l'état d'authentification.
 */
export function useSession(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error('useSession must be used within <AuthProvider>.')
  }
  return ctx
}
