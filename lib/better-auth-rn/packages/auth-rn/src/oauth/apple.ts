/**
 * Apple Sign In (RN)
 * ====================
 *
 * Deux flux :
 *  - Flux web (par défaut, les deux plateformes) : signInWithProvider('apple')
 *  - Flux natif (iOS uniquement) : expo-apple-authentication — pas de changement de navigateur
 *
 * Sur iOS, le flux natif est préféré (meilleure UX). Sur Android,
 * seul le flux web fonctionne.
 *
 * Pas de dépendance à better-auth — tous les appels passent par apiFetch.
 */

import { Platform } from 'react-native'
import { getAuthConfig } from '../client'
import { signInWithProvider } from './social'
import { signInWithAppleToken } from '../auth/auth.api'
import { mmkvStorage } from '../storage/mmkv'
import type { OAuthResult } from '../types'

export async function signInWithApple(): Promise<OAuthResult> {
  const config = getAuthConfig()

  if (!config.oauth?.apple) {
    return { success: false, error: 'Apple OAuth non configuré' }
  }

  // Sur iOS, utiliser le flux natif (expo-apple-authentication)
  if (Platform.OS === 'ios') {
    try {
      const native = await tryNativeAppleAuth()
      if (native) return native
    } catch (e: any) {
      // Fallback vers le flux web
      console.warn('[auth-rn] Auth Apple native échouée, fallback web', e)
    }
  }

  // Flux web (Android ou fallback iOS)
  return signInWithProvider('apple')
}

/**
 * Apple Sign In natif sur iOS (nécessite expo-apple-authentication).
 * Retourne null si la bibliothèque n'est pas installée.
 */
async function tryNativeAppleAuth(): Promise<OAuthResult | null> {
  try {
    const AppleAuthentication = require('expo-apple-authentication')
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })

    if (!credential.identityToken) {
      return { success: false, error: 'Aucun token d\'identité retourné par Apple' }
    }

    const config = getAuthConfig()
    const callbackUrl = `${config.deepLink.scheme}://${config.deepLink.callbackPath}`

    // Envoyer le token d'identité Apple au serveur
    const authSession = await signInWithAppleToken(
      credential.identityToken,
      callbackUrl,
    )

    // Les tokens sont déjà persistés par signInWithAppleToken via persistSession()
    mmkvStorage.setUser(JSON.stringify(authSession.user))

    return { success: true }
  } catch {
    // expo-apple-authentication non installé ou utilisateur annulé
    return null
  }
}
