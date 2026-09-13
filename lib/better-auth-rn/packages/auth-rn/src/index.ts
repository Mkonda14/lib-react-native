/**
 * @your-org/auth-rn — API publique
 * =================================
 *
 * Utilisation rapide :
 *
 *   // app/_layout.tsx
 *   import { AuthProvider, registerNavigator } from '@your-org/auth-rn'
 *   import { router } from 'expo-router'
 *
 *   registerNavigator((path) => router.replace(path))
 *
 *   export default function RootLayout() {
 *     return (
 *       <AuthProvider config={authConfig}>
 *         <Slot />
 *       </AuthProvider>
 *     )
 *   }
 *
 *   // app/(protected)/_layout.tsx
 *   import { RequireAuth } from '@your-org/auth-rn'
 *   export default function Layout() {
 *     return <RequireAuth redirectTo="/sign-in"><Slot /></RequireAuth>
 *   }
 *
 *   // n'importe quel écran
 *   import { useSession, useAuthActions, useTwoFactor, useBiometric } from '@your-org/auth-rn'
 */

// Provider + hook principal
export { AuthProvider, useSession } from './provider'

// Autres hooks
export { useAuthActions } from './hooks/use-auth-actions'
export { useTwoFactor } from './hooks/use-two-factor'
export { useBiometric } from './hooks/use-biometric'

// Client (gestion de config — pas de dépendance better-auth)
export {
  initAuthClient,
  getAuthConfig,
  resetAuthClient,
} from './client'

// Config
export {
  defineAuthConfig,
  authConfigSchema,
  buildApiUrl,
  buildCallbackUrl,
} from './config'

// Stockage (pour accès direct aux tokens)
export {
  initMMKV,
  getMMKV,
  createMMKVStorageAdapter,
  mmkvStorage,
} from './storage/mmkv'

export {
  secureStorage,
  tokenStorage,
} from './storage/secure-store'

// OAuth
export { signInWithProvider } from './oauth/social'
export { signInWithGoogle } from './oauth/google'
export { signInWithApple } from './oauth/apple'

// Helpers 2FA
export {
  buildTOTPURI,
  generateRandomBase32Secret,
  getQRCodeUrl,
  generateBackupCodes,
} from './two-factor/totp'

// Middleware
export {
  RequireAuth,
  RedirectIfAuth,
  RequireRole,
  registerNavigator,
} from './middleware/navigation'

// Wrappers fetch
export {
  createAuthFetch,
  apiFetch,
  unwrapPayload,
  clearPersistedSession,
  setOnUnauthenticated,
  setApiConfig,
  setAuthConfig,
  refreshIfNeeded,
} from './utils/fetch'

// Erreurs
export { ApiError, parseErrorBody } from './errors'

// API Auth (fonctions métier)
export {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  getSession,
  forgotPassword,
  resetPassword,
  sendEmailVerification,
  verifyEmail,
  changePassword,
  // 2FA
  generateTOTPSecret,
  enableTOTP,
  disableTOTP,
  verifyTOTPCode,
  verifyBackupCode,
  getTwoFactorStatus,
  // OAuth
  signInWithSocial,
  signInWithAppleToken,
} from './auth/auth.api'

// Types
export type {
  AuthConfig,
  AuthPlugin,
  AuthContextValue,
  AuthUser,
  Session,
  AuthStatus,
  SignInResult,
  SignUpData,
  SignUpResult,
  OAuthProvider,
  OAuthResult,
  TOTPSecret,
  TwoFactorStatus,
  BiometricStatus,
  StorageAdapter,
  RequireAuthProps,
  RequireRoleProps,
  RedirectIfAuthProps,
  QueryParams,
  ApiFetchOptions,
  BetterAuthResponse,
} from './types'

export type {
  TOTPGenerateResult,
  TOTPEnableResult,
  TwoFactorStatusResult,
  SocialSignInResult,
} from './auth/auth.api'
