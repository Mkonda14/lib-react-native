/**
 * TOTP — helpers côté client pour la génération QR
 * =================================================
 *
 * Utilisé pour afficher le code QR sur l'écran « Activer 2FA ».
 * Le secret est généré côté serveur par Better Auth, mais on génère
 * l'URI otpauth:// en tant que code QR côté client.
 *
 * Pour le rendu QR, utilisez n'importe quelle bibliothèque QR
 * (ex. react-native-qrcode-svg).
 */

export interface TOTPOptions {
  issuer: string
  label: string // généralement l'email de l'utilisateur
  secret?: string // si non fourni, un nouveau secret est généré
  digits?: number // par défaut 6
  period?: number // par défaut 30s
}

/**
 * Générateur robuste de secret Base32 (alphabet RFC 4648).
 * Compatible avec React Native / Expo sans polyfill Web Crypto.
 */
export function generateRandomBase32Secret(length = 32): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''

  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(length)
    globalThis.crypto.getRandomValues(bytes)
    for (let i = 0; i < length; i++) {
      secret += alphabet[bytes[i] % 32]
    }
    return secret
  }

  // Fallback utilisant Math.random + entropie timestamp
  for (let i = 0; i < length; i++) {
    const rand = Math.floor(Math.random() * 32)
    secret += alphabet[rand]
  }

  return secret
}

/**
 * Construire une URI TOTP à partir des options (otpauth://totp/...).
 */
export function buildTOTPURI(opts: TOTPOptions): {
  uri: string
  secret: string
} {
  const secret = opts.secret ?? generateRandomBase32Secret(32)
  const digits = opts.digits ?? 6
  const period = opts.period ?? 30

  const uri = `otpauth://totp/${encodeURIComponent(opts.issuer)}:${encodeURIComponent(
    opts.label
  )}?secret=${secret}&issuer=${encodeURIComponent(opts.issuer)}&algorithm=SHA1&digits=${digits}&period=${period}`

  return { uri, secret }
}

/**
 * Générer une URL de code QR via un service public (fallback si
 * react-native-qrcode-svg non installé). Pour la production, installez
 * react-native-qrcode-svg et rendez le SVG en local.
 */
export function getQRCodeUrl(uri: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    uri
  )}`
}

/**
 * Générer des codes de secours en local (10 codes, 8 caractères chacun).
 * Note : Better Auth les génère côté serveur, ceci est un fallback
 * côté client uniquement à des fins d'affichage.
 */
export function generateBackupCodes(count = 10, length = 8): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans caractères ambigus
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < length; j++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    codes.push(code)
  }
  return codes
}
