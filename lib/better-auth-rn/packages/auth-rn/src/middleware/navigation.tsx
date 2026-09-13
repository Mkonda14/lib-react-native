/**
 * Middleware de navigation — gardes React Navigation
 * ====================================================
 *
 * Enveloppe les écrans avec des vérifications d'authentification :
 *  - <RequireAuth>     → n'affiche les enfants que si authentifié
 *  - <RedirectIfAuth>  → n'affiche les enfants que si NON authentifié
 *  - <RequireRole>     → n'affiche les enfants que si l'utilisateur a l'un des rôles
 *
 * Fonctionne avec Expo Router, React Navigation ou Solito.
 * La prop `redirectTo` est une chaîne de route (ex. '/sign-in').
 */

import * as React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { useSession } from '../provider'
import type { RequireAuthProps, RequireRoleProps, RedirectIfAuthProps } from '../types'

/* ------------------------------------------------------------------ *
 * <RequireAuth>
 * ------------------------------------------------------------------ */

export function RequireAuth({
  children,
  redirectTo,
  loadingFallback,
}: RequireAuthProps) {
  const { status } = useSession()

  const shouldRedirect =
    status === 'unauthenticated' ||
    status === 'requiresEmailVerification' ||
    status === 'requiresTwoFactor'

  React.useEffect(() => {
    if (shouldRedirect && redirectTo) {
      navigateTo(redirectTo)
    }
  }, [shouldRedirect, redirectTo])

  if (status === 'loading') {
    return <>{loadingFallback ?? <DefaultLoader />}</>
  }

  if (shouldRedirect) {
    return null
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ *
 * <RedirectIfAuth>
 * ------------------------------------------------------------------ */

export function RedirectIfAuth({
  children,
  redirectTo,
}: RedirectIfAuthProps) {
  const { status } = useSession()

  const shouldRedirect = status === 'authenticated'

  React.useEffect(() => {
    if (shouldRedirect && redirectTo) {
      navigateTo(redirectTo)
    }
  }, [shouldRedirect, redirectTo])

  if (shouldRedirect) {
    return null
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ *
 * <RequireRole>
 * ------------------------------------------------------------------ */

export function RequireRole({
  children,
  roles,
  redirectTo,
  fallbackRoute,
  loadingFallback,
}: RequireRoleProps) {
  const { user, status } = useSession()

  const isUnauthorized = !user || !roles.includes(user.role ?? 'user')
  const targetRoute = fallbackRoute ?? redirectTo

  React.useEffect(() => {
    if (status !== 'loading' && isUnauthorized && targetRoute) {
      navigateTo(targetRoute)
    }
  }, [status, isUnauthorized, targetRoute])

  if (status === 'loading') {
    return <>{loadingFallback ?? <DefaultLoader />}</>
  }

  if (isUnauthorized) {
    return null
  }

  return <>{children}</>
}

/* ------------------------------------------------------------------ *
 * Registre de navigation (pour que le middleware puisse déclencher
 * la navigation sans ref)
 * ------------------------------------------------------------------ */

type NavigateFn = (path: string) => void
let navFn: NavigateFn | null = null

/**
 * Enregistrer votre fonction de navigation (router.replace) globalement.
 *
 * @example
 * // app/_layout.tsx
 * import { registerNavigator } from '@your-org/auth-rn'
 * import { router } from 'expo-router'
 *
 * registerNavigator((path) => router.replace(path))
 */
export function registerNavigator(fn: NavigateFn) {
  navFn = fn
}

function navigateTo(path: string) {
  if (navFn) {
    navFn(path)
  } else {
    console.warn(
      `[auth-rn] Aucun navigateur enregistré. Appelez registerNavigator(router.replace) à la racine de votre app. Tentative de navigation vers : ${path}`
    )
  }
}

/* ------------------------------------------------------------------ *
 * Loader par défaut
 * ------------------------------------------------------------------ */

function DefaultLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" />
      <Text style={styles.loaderText}>Vérification de la session…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: '#71717A',
  },
})
