/**
 * Flux OAuth pour React Native
 * ==============================
 *
 * Le flux de connexion sociale de Better Auth fonctionne ainsi sur RN :
 *  1. Appeler `signInWithSocial(provider, callbackURL)` — retourne une URL de redirection
 *  2. Ouvrir cette URL dans un navigateur in-app (expo-web-browser)
 *  3. L'utilisateur s'authentifie avec Google/Apple dans le navigateur
 *  4. Better Auth termine le flux côté serveur
 *  5. Redirige vers `callbackURL` (ex. `myapp1://auth-callback?token=...`)
 *  6. L'app intercepte le deep link (expo-linking) et extrait le token
 *  7. Stocker le token + rafraîchir la session
 *
 * Pour Apple sur iOS, on peut utiliser le flux natif
 * (expo-apple-authentication) qui est plus fluide — voir apple.ts.
 *
 * Pas de dépendance à better-auth — tous les appels passent par apiFetch.
 */

import * as Linking from 'expo-linking'
import { getAuthConfig } from '../client'
import { buildCallbackUrl } from '../config'
import { tokenStorage } from '../storage/secure-store'
import { mmkvStorage } from '../storage/mmkv'
import { signInWithSocial as apiSignInWithSocial, getSession } from '../auth/auth.api'
import type { OAuthProvider, OAuthResult } from '../types'

function getWebBrowser(): typeof import('expo-web-browser') | null {
  try { return require('expo-web-browser') } catch { return null }
}

/**
 * Connexion avec un fournisseur social (Google ou Apple) via le flux web.
 * Fonctionne sur iOS et Android.
 */
export async function signInWithProvider(
  provider: OAuthProvider
): Promise<OAuthResult> {
  const config = getAuthConfig()
  const callbackUrl = buildCallbackUrl(config)
  const WebBrowser = getWebBrowser()

  try {
    // Étape 1 : Récupérer l'URL OAuth depuis le serveur
    const data = await apiSignInWithSocial(provider, callbackUrl, true)

    if (!data?.url) {
      return { success: false, error: 'Aucune URL OAuth retournée' }
    }

    if (!WebBrowser) {
      return { success: false, error: 'Module navigateur OAuth indisponible' }
    }

    // Étape 2 : Ouvrir l'URL dans un navigateur in-app
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      callbackUrl,
      {
        showInRecents: true,
        // iOS : préférer la session éphémère (pas de cookies partagés)
        preferEphemeralSession: false,
      }
    )

    if (result.type !== 'success') {
      return { success: false, error: 'L\'utilisateur a annulé' }
    }

    // Étape 3 : Parser l'URL de callback
    const parsed = Linking.parse(result.url)
    const params = parsed.queryParams ?? {}

    // Better Auth redirige avec un token dans les paramètres de requête
    const token = params.token as string | undefined
    const refreshToken = params.refreshToken as string | undefined

    if (!token) {
      return { success: false, error: 'Aucun token dans le callback' }
    }

    // Étape 4 : Stocker les tokens
    await tokenStorage.setAccessToken(token)
    if (refreshToken) {
      await tokenStorage.setRefreshToken(refreshToken)
    }

    // Étape 5 : Récupérer et mettre en cache la session
    const authSession = await getSession()
    if (!authSession) {
      return { success: false, error: 'Échec de la récupération de la session' }
    }

    mmkvStorage.setUser(JSON.stringify(authSession.user))

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Erreur réseau' }
  } finally {
    WebBrowser?.dismissBrowser()
  }
}
