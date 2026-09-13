/**
 * Auth barrel — fonctions métier d'authentification
 * ==================================================
 *
 * Réexporte toutes les fonctions API d'authentification + ApiError.
 */

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
} from './auth.api'

export type {
  TOTPGenerateResult,
  TOTPEnableResult,
  TwoFactorStatusResult,
  SocialSignInResult,
} from './auth.api'

export { ApiError } from '../errors'
