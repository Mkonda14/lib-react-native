/**
 * @your-org/auth-rn — Définitions de types
 * =========================================
 */

import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ *
 * Plugin d'authentification (hook d'extension — défini localement,
 * aucune dépendance à better-auth)
 * ------------------------------------------------------------------ */

/**
 * Interface générique pour les plugins d'authentification.
 * Permet aux apps de passer des hooks d'extension sans importer better-auth.
 */
export interface AuthPlugin {
  name: string
  [key: string]: unknown
}

/* ------------------------------------------------------------------ *
 * Configuration d'authentification (par app)
 * ------------------------------------------------------------------ */
export interface AuthConfig {
  /** URL du backend (ex. https://api.exemple.com). */
  backendUrl: string

  /** Identifiant de l'app — utilisé pour taguer les sessions (quelle app utilise l'utilisateur). */
  appId: string

  /** Nom d'affichage de l'app (pour les emails, les logs). */
  appName: string

  /** Configuration des fournisseurs OAuth. */
  oauth?: {
    google?: {
      webClientId: string
      iosClientId?: string
      androidClientId?: string
    }
    apple?: {
      clientId: string
    }
  }

  /** Configuration du stockage. */
  storage: {
    /** Clé de chiffrement MMKV (32+ caractères). Utiliser la variable d'env EXPO_PUBLIC_MMKV_KEY. */
    mmkvEncryptionKey: string
    /** Activer le déverrouillage biométrique (Face ID / Touch ID). */
    enableBiometric?: boolean
    /** ID de l'instance MMKV (pour l'isolation multi-apps sur un même appareil). */
    mmkvInstanceId?: string
  }

  /** Configuration de l'authentification à 2 facteurs. */
  twoFactor?: {
    /** Forcer le 2FA pour ces rôles (ex. ['admin']). */
    enforceForRoles?: string[]
    /** Émetteur TOTP (par défaut : appName). */
    issuer?: string
  }

  /** Configuration des deep links (pour le callback OAuth). */
  deepLink: {
    /** Schéma d'URL (ex. 'myapp1'). */
    scheme: string
    /** Chemin de callback (ex. 'auth-callback'). Par défaut : 'auth-callback'. */
    callbackPath?: string
  }

  /** Plugins d'authentification personnalisés (hooks d'extension). */
  plugins?: AuthPlugin[]

  /** Délai d'attente des requêtes (ms). Par défaut : 30000. */
  timeout?: number

  /** Mode debug (journalise les requêtes). Par défaut : false. */
  debug?: boolean
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  name?: string | null
  image?: string | null
  appId?: string | null
  role?: string | null
  twoFactorEnabled?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  user: AuthUser
  session: {
    id: string
    token: string
    expiresAt: Date
    appId?: string | null
  }
}

export type AuthStatus =
  | 'loading'                    // état initial
  | 'unauthenticated'            // non connecté
  | 'authenticated'              // connecté, session valide
  | 'requiresTwoFactor'          // connecté mais 2FA requis
  | 'requiresEmailVerification'  // inscrit mais email non vérifié

/* ------------------------------------------------------------------ *
 * Contexte d'authentification
 * ------------------------------------------------------------------ */

export interface AuthContextValue {
  /** Session courante (null si non authentifié). */
  session: Session | null
  /** Utilisateur courant (null si non authentifié). */
  user: AuthUser | null
  /** Statut d'authentification. */
  status: AuthStatus
  /** Vrai si la session est en cours de chargement. */
  isLoading: boolean
  /** Message d'erreur (de la dernière opération échouée). */
  error: string | null
  /** Effacer le message d'erreur. */
  clearError: () => void
  /** Connexion par email + mot de passe. */
  signInEmail: (email: string, password: string) => Promise<SignInResult>
  /** Inscription par email + mot de passe. */
  signUpEmail: (data: SignUpData) => Promise<SignUpResult>
  /** Déconnexion. */
  signOut: () => Promise<void>
  /** Rafraîchir la session (manuel). */
  refresh: () => Promise<void>
}

export interface SignInResult {
  success: boolean
  requiresTwoFactor?: boolean
  requiresEmailVerification?: boolean
  error?: string
}

export interface SignUpData {
  email: string
  password: string
  name?: string
}

export interface SignUpResult {
  success: boolean
  requiresEmailVerification?: boolean
  error?: string
}

/* ------------------------------------------------------------------ *
 * OAuth
 * ------------------------------------------------------------------ */

export type OAuthProvider = 'google' | 'apple'

export interface OAuthResult {
  success: boolean
  error?: string
}

/* ------------------------------------------------------------------ *
 * Authentification à 2 facteurs (2FA)
 * ------------------------------------------------------------------ */

export interface TOTPSecret {
  secret: string
  uri: string // otpauth://totp/...
  qrCodeUrl: string // data:image/png;base64,...
}

export interface TwoFactorStatus {
  enabled: boolean
  hasBackupCodes: boolean
  backupCodes?: string[]
}

/* ------------------------------------------------------------------ *
 * Biométrie
 * ------------------------------------------------------------------ */

export interface BiometricStatus {
  available: boolean
  enrolled: boolean
  types: ('fingerprint' | 'facial' | 'iris')[]
}

/* ------------------------------------------------------------------ *
 * Stockage
 * ------------------------------------------------------------------ */

export interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem: (key: string) => void | Promise<void>
}

/* ------------------------------------------------------------------ *
 * Middleware (React Navigation / Expo Router)
 * ------------------------------------------------------------------ */

export interface RequireAuthProps {
  children: ReactNode
  /** Rediriger vers cette route si non authentifié. */
  redirectTo?: string
  /** Afficher un loader pendant la vérification d'authentification. */
  loadingFallback?: ReactNode
}

export interface RequireRoleProps extends RequireAuthProps {
  /** Rôles requis (l'un de ces rôles donne accès). */
  roles: string[]
  /** Rediriger vers cette route si le rôle ne correspond pas. */
  fallbackRoute?: string
}

export interface RedirectIfAuthProps {
  children: ReactNode
  /** Rediriger vers cette route si déjà authentifié. */
  redirectTo?: string
}

/* ------------------------------------------------------------------ *
 * Types API
 * ------------------------------------------------------------------ */

/** Paramètres de chaîne de requête — gère les tableaux, ignore null/undefined. */
export type QueryParams = Record<string, string | number | boolean | string[] | null | undefined>

/** Options pour `apiFetch()`. */
export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Injecter le token Bearer. Par défaut : true. */
  auth?: boolean
  /** Lancer une erreur 401 si aucun token. Par défaut : false. */
  requireAuth?: boolean
  /** Délai d'attente en ms. Par défaut : config.timeout. */
  timeout?: number
  /** Paramètres de chaîne de requête. */
  params?: QueryParams
  /** Corps JSON (sérialisé automatiquement). */
  body?: unknown
  /** En-têtes supplémentaires. */
  headers?: Record<string, string>
}

/** Format standard de réponse Better Auth. */
export interface BetterAuthResponse {
  user?: AuthUser
  session?: {
    token: string
    expiresAt?: string | Date
  }
  token?: string
  /** Enveloppe de données générique (certains endpoints retournent { data: T }). */
  data?: unknown
}
