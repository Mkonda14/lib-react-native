/**
 * @your-org/auth-rn — Schéma de config + validation
 * ===================================================
 *
 * Chaque app consommatrice définit sa config via `defineAuthConfig()`.
 * La config est validée au moment de l'exécution via Zod pour attraper
 * les variables d'environnement manquantes avant le démarrage de l'app.
 */

import { z } from 'zod'
import type { AuthConfig } from './types'

/* ------------------------------------------------------------------ *
 * Schéma
 * ------------------------------------------------------------------ */

export const authConfigSchema = z.object({
  backendUrl: z
    .string()
    .url('backendUrl doit être une URL valide (https://api.exemple.com)'),

  appId: z
    .string()
    .min(1, 'appId est requis')
    .regex(/^[a-z0-9-]+$/, 'appId doit être en kebab-case minuscule'),

  appName: z.string().min(1, 'appName est requis'),

  oauth: z
    .object({
      google: z
        .object({
          webClientId: z.string().min(1),
          iosClientId: z.string().optional(),
          androidClientId: z.string().optional(),
        })
        .optional(),
      apple: z
        .object({
          clientId: z.string().min(1),
        })
        .optional(),
    })
    .optional(),

  storage: z.object({
    mmkvEncryptionKey: z
      .string()
      .min(32, 'mmkvEncryptionKey doit faire au moins 32 caractères'),
    enableBiometric: z.boolean().default(false),
    mmkvInstanceId: z.string().optional(),
  }),

  twoFactor: z
    .object({
      enforceForRoles: z.array(z.string()).default([]),
      issuer: z.string().optional(),
    })
    .optional(),

  deepLink: z.object({
    scheme: z
      .string()
      .min(1)
      .regex(/^[a-z][a-z0-9-]*$/, 'deepLink.scheme doit être un schéma d\'URL valide'),
    callbackPath: z.string().min(1).default('auth-callback'),
  }),

  plugins: z.array(z.any()).optional(),

  timeout: z.number().positive().default(30000),
  debug: z.boolean().default(false),
})

/* ------------------------------------------------------------------ *
 * defineAuthConfig — helper qui valide au moment de l'exécution
 * ------------------------------------------------------------------ */

export function defineAuthConfig(config: AuthConfig): AuthConfig {
  const parsed = authConfigSchema.parse(config)
  return parsed as AuthConfig
}

/* ------------------------------------------------------------------ *
 * Helper : construire l'URL de callback OAuth
 * ------------------------------------------------------------------ */

export function buildCallbackUrl(config: AuthConfig): string {
  const path = config.deepLink.callbackPath ?? 'auth-callback'
  return `${config.deepLink.scheme}://${path}`
}

/* ------------------------------------------------------------------ *
 * Helper : construire l'URL de l'API backend
 * ------------------------------------------------------------------ */

export function buildApiUrl(config: AuthConfig, path: string): string {
  const base = config.backendUrl.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}
