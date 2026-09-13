/**
 * Google Sign In (RN)
 * ====================
 *
 * Deux flux disponibles :
 *  - Flux web (par défaut) : utilise signInWithProvider('google') — ouvre le navigateur
 *  - Flux natif (optionnel) : utilise expo-auth-session + @react-native-google-signin/google
 *    → plus rapide, pas de changement de navigateur, mais nécessite une config native supplémentaire
 *
 * Ce fichier exporte un helper `signInWithGoogle()` qui choisit le meilleur
 * flux en fonction de la plateforme et de la config.
 */

import { getAuthConfig } from '../client'
import { signInWithProvider } from './social'
import type { OAuthResult } from '../types'

export async function signInWithGoogle(): Promise<OAuthResult> {
  const config = getAuthConfig()

  if (!config.oauth?.google) {
    return { success: false, error: 'Google OAuth non configuré' }
  }

  // Utiliser le flux web (fonctionne partout, config la plus simple)
  return signInWithProvider('google')

  // Pour le flux natif, voir :
  // https://docs.expo.dev/guides/google-authentication/
  // Nécessite : expo-auth-session, expo-crypto, @react-native-google-signin/google-signin
}

/**
 * Récupérer l'URL OAuth Google pour un flux personnalisé (ex. one-tap sur Android).
 */
export function getGoogleOAuthURL(): string {
  const config = getAuthConfig()
  if (!config.oauth?.google) {
    throw new Error('Google OAuth non configuré')
  }
  return `${config.backendUrl}/api/auth/oauth/google?callbackURL=${encodeURIComponent(
    `${config.deepLink.scheme}://${config.deepLink.callbackPath}`
  )}`
}
