# Contrat Backend — Better Auth

Ce document est la **source unique de vérité** pour l'implémentation backend.
Tout le code doit respecter ce contrat.

---

## 1. Routes API

Le backend expose un **single catch-all endpoint** : `/api/auth/[...all]`

Toutes les routes Better Auth sont montées sous ce préfixe.
Le handler doit être compatible **Next.js App Router** (`GET` + `POST` exports).

### 1.1 Authentification email/mot de passe

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/sign-in/email` | POST | Connexion par email + mot de passe |
| `/api/auth/sign-up/email` | POST | Inscription (email + mot de passe + nom) |
| `/api/auth/sign-out` | POST | Déconnexion (détruit la session) |
| `/api/auth/get-session` | GET | Récupère la session courante (via Bearer token) |

### 1.2 Gestion du mot de passe

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/forget-password` | POST | Envoie un email de réinitialisation |
| `/api/auth/reset-password` | POST | Réinitialise le mot de passe avec le token |

### 1.3 Vérification d'email

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/send-verification-email` | POST | Renvoie l'email de vérification |
| `/api/auth/verify-email` | POST | Vérifie l'email avec le code/token |

### 1.4 OAuth social

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/sign-in/social` | POST | Initie le flow OAuth (google/apple) |
| `/api/auth/callback/google` | GET | Callback Google OAuth |
| `/api/auth/callback/apple` | GET | Callback Apple Sign In |

### 1.5 Deux facteurs (TOTP)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/two-factor/generate` | POST | Génère un secret TOTP (avant activation) |
| `/api/auth/two-factor/enable` | POST | Active le 2FA (vérifie le code + génère backup codes) |
| `/api/auth/two-factor/disable` | POST | Désactive le 2FA |
| `/api/auth/two-factor/verify-totp` | POST | Vérifie un code TOTP (6 chiffres) |
| `/api/auth/two-factor/verify-backup` | POST | Vérifie un backup code (8 caractères) |
| `/api/auth/two-factor/status` | GET | Retourne le statut 2FA de l'utilisateur |

### 1.6 Gestion de session

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/list-sessions` | GET | Liste les sessions actives de l'utilisateur |
| `/api/auth/revoke-session` | POST | Révoque une session spécifique |
| `/api/auth/revoke-all-sessions` | POST | Révoque toutes les sessions sauf l'actuelle |
| `/api/auth/update-user` | POST | Met à jour les infos utilisateur |

### 1.7 Refresh token

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/auth/refresh` | POST | Rafraîchit l'access token via le refresh token |

---

## 2. Prisma Schema — Modèles

### 2.1 `User`

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(cuid())` | Identifiant unique |
| `email` | String | `@unique` | Email de l'utilisateur |
| `emailVerified` | Boolean | `@default(false)` | Email vérifié ou non |
| `name` | String? | — | Nom complet |
| `image` | String? | — | URL de l'avatar |
| `appId` | String? | — | App d'origine (inscription) |
| `role` | String | `@default("PATIENT")` | Rôle (`PATIENT` / `PHARMA_OWNER` / `PHARMA_STAFF`) |
| `pharmacyId` | String? | — | ID de la pharmacie liée (organisation) |
| `twoFactorEnabled` | Boolean | `@default(false)` | 2FA activé |
| `twoFactorSecret` | String? | — | Secret TOTP chiffré |
| `backupCodes` | String[] | `@default([])` | Codes de récupération (hashés) |
| `createdAt` | DateTime | `@default(now())` | Date de création |
| `updatedAt` | DateTime | `@updatedAt` | Dernière mise à jour |

**Relations** : `sessions`, `accounts`, `passkeys`

### 2.2 `Session`

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(cuid())` | Identifiant unique |
| `userId` | String | `FK → User.id` | Utilisateur propriétaire |
| `expiresAt` | DateTime | — | Date d'expiration |
| `token` | String | `@unique` | Token de session (Bearer) |
| `ipAddress` | String? | — | IP du client |
| `userAgent` | String? | — | User-Agent du client |
| `appId` | String? | — | App qui a créé la session |
| `createdAt` | DateTime | `@default(now())` | Date de création |
| `updatedAt` | DateTime | `@updatedAt` | Dernière mise à jour |

**Index** : `@@index([userId])`
**On Delete** : `Cascade`

### 2.3 `Account`

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(cuid())` | Identifiant unique |
| `userId` | String | `FK → User.id` | Utilisateur propriétaire |
| `accountId` | String | — | ID du compte chez le provider |
| `providerId` | String | — | `google` / `apple` / `credential` |
| `accessToken` | String? | — | Token d'accès OAuth |
| `refreshToken` | String? | — | Token de rafraîchissement OAuth |
| `accessTokenExpiresAt` | DateTime? | — | Expiration access token |
| `refreshTokenExpiresAt` | DateTime? | — | Expiration refresh token |
| `scope` | String? | — | Portée OAuth |
| `idToken` | String? | — | ID token (OIDC) |
| `password` | String? | — | Hash du mot de passe (provider=credential) |
| `createdAt` | DateTime | `@default(now())` | Date de création |
| `updatedAt` | DateTime | `@updatedAt` | Dernière mise à jour |

**Contraintes** :
- `@@unique([providerId, accountId])` — un seul compte par provider
- `@@index([userId])`
- **On Delete** : `Cascade`

### 2.4 `Verification`

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(cuid())` | Identifiant unique |
| `identifier` | String | — | Type de vérification |
| `value` | String | — | Token/code de vérification |
| `expiresAt` | DateTime | — | Date d'expiration |
| `createdAt` | DateTime | `@default(now())` | Date de création |

**Index** : `@@index([identifier])`

**Valeurs de `identifier`** :
- `email-verification` — vérification d'email à l'inscription
- `reset-password` — réinitialisation de mot de passe

### 2.5 `Organization` (plugin `organization`)

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(cuid())` | Identifiant unique |
| `name` | String | — | Nom de la pharmacie |
| `slug` | String | `@unique` | Slug URL-friendly |
| `logo` | String? | — | URL du logo |
| `createdAt` | DateTime | `@default(now())` | Date de création |
| `updatedAt` | DateTime | `@updatedAt` | Dernière mise à jour |

**Champs additionnels** (`additionalFields`) :
- `address` (String, requis) — Adresse de la pharmacie
- `phone` (String, optionnel) — Téléphone
- `email` (String, optionnel) — Email contact
- `status` (String, optionnel) — Statut de la pharmacie
- `longitude` (Number, optionnel) — Longitude GPS
- `latitude` (Number, optionnel) — Latitude GPS

### 2.6 `Member` (plugin `organization`)

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(cuid())` | Identifiant unique |
| `userId` | String | `FK → User.id` | Utilisateur membre |
| `organizationId` | String | `FK → Organization.id` | Pharmacie |
| `role` | String | — | `owner` / `staff` / `assistant` |
| `createdAt` | DateTime | `@default(now())` | Date de création |

### 2.7 `Invitation` (plugin `organization`)

| Champ | Type | Contrainte | Description |
|-------|------|------------|-------------|
| `id` | String | `@id @default(cuid())` | Identifiant unique |
| `email` | String | — | Email invité |
| `organizationId` | String | `FK → Organization.id` | Pharmacie cible |
| `inviterId` | String | `FK → User.id` | Utilisateur invitant |
| `role` | String | — | Rôle proposé |
| `status` | String | — | `pending` / `accepted` / `rejected` |
| `expiresAt` | DateTime | — | Date d'expiration (7 jours par défaut) |
| `createdAt` | DateTime | `@default(now())` | Date de création |

---

## 3. Variables d'environnement

### 3.1 Backend (Next.js)

| Variable | Exemple | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environnement d'exécution |
| `NEXT_PUBLIC_APP_NAME` | `My App` | Nom de l'app (utilisé comme issuer TOTP) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | URL publique du backend |
| `BETTER_AUTH_URL` | `http://localhost:3000` | URL Better Auth (base URL interne) |

### 3.2 Base de données

| Variable | Exemple | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/better_auth` | URL de connexion PostgreSQL |

### 3.3 Auth secret

| Variable | Exemple | Description |
|----------|---------|-------------|
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | Secret Better Auth (signing JWT, tokens) |
| `WEB_ORIGINS` | `http://localhost:3000,http://localhost:8081` | Origines web autorisées (CSRF + CORS) |

### 3.4 Mobile (Expo — côté client)

| Variable | Exemple | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_BACKEND_URL` | `http://192.168.x.x:3000` | URL du backend accessible depuis l'appareil |
| `EXPO_PUBLIC_MMKV_KEY` | `openssl rand -hex 32` | Clé de chiffrement MMKV (32+ caractères) |
| `NEXT_PUBLIC_MOBILE_ORIGIN` | `http://192.168.x.x:8081` | URL Expo Go Metro bundler |
| `NEXT_PUBLIC_MOBILE_EXP_ORIGIN` | `exp://192.168.x.x:8081` | URL Expo Go deep link |

### 3.5 Google OAuth

| Variable | Exemple | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | Client ID (Console Google Cloud) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxx` | Client secret |

### 3.6 Apple Sign In

| Variable | Exemple | Description |
|----------|---------|-------------|
| `APPLE_CLIENT_ID` | `com.yourorg.auth` | Services ID (pas l'App ID) |
| `APPLE_CLIENT_SECRET` | — | JWT pré-généré (optionnel si vars ci-dessous présentes) |
| `APPLE_TEAM_ID` | `XXXXXXXXXX` | Team ID Apple |
| `APPLE_KEY_ID` | `XXXXXXXXXX` | Key ID (clé Sign in with Apple) |
| `APPLE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n..."` | Contenu du fichier .p8 |
| `APPLE_APP_BUNDLE_ID` | `com.yourorg.app1` | Bundle ID iOS (flow natif) |

### 3.7 Email

| Variable | Exemple | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | `re_xxxx` | Clé API Resend (ou SendGrid/Postmark) |
| `EMAIL_FROM` | `noreply@exemple.com` | Adresse d'envoi des emails |

### 3.8 Cache (optionnel)

| Variable | Exemple | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | URL Redis (rate limiting distribué) |

---

## 4. Configuration Better Auth — Implémentation réelle

### 4.1 Config globale

```ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { organization, twoFactor, bearer } from "better-auth/plugins"
import { expo } from "@better-auth/expo"
import { nextCookies } from "better-auth/next-js"

export const auth = betterAuth({
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  baseURL: process.env.BETTER_AUTH_URL || undefined,

  trustedOrigins: [ /* ...voir section 4.5 */ ],

  advanced: {
    disableCSRFCheck: false,
    trustedProxyHeaders: true,
  },

  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: { /* ...voir section 4.2 */ },
  session: { /* ...voir section 4.4 */ },

  plugins: [
    expo(),
    twoFactor({ /* ... */ }),
    organization({ /* ... */ }),
    bearer(),
    nextCookies(), // DOIT être le dernier plugin
  ],

  user: { /* ...voir section 4.7 */ },
})
```

**Ordre des plugins** :
1. `expo()` — remapping du header `expo-origin` vers `Origin`
2. `twoFactor()` — authentification à 2 facteurs TOTP
3. `organization()` — gestion des pharmacies (multi-tenancy)
4. `bearer()` — authentification par Bearer token (RN)
5. `nextCookies()` — gestion des cookies Next.js (DOIT être dernier)

### 4.2 Email / Mot de passe

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
  sendResetPassword: async ({ user, url }) => {
    const { sendResetPasswordEmail } = await import("@/emails/utils")
    await sendResetPasswordEmail({ to: user.email, url })
  },
  sendVerificationEmail: async ({ user, url }) => {
    const { sendVerificationEmail } = await import("@/emails/utils")
    await sendVerificationEmail({ to: user.email, url })
  },
}
```

### 4.3 Social Providers

#### Google

```ts
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectURLs: [
      ...WEB_ORIGINS,
      'mypharmacymobile://auth-callback',
    ],
  },
}
```

#### Apple

```ts
socialProviders: {
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    appBundleIdentifier: process.env.APPLE_APP_BUNDLE_ID,
    redirectURLs: ['mypharmacymobile://auth-callback'],
  },
}
```

### 4.4 Session

```ts
session: {
  expiresIn: 60 * 60 * 24 * 7,  // 7 jours
  updateAge: 60 * 60 * 24,       // Refresh après 1 jour
  cookieCache: { enabled: false },
  deferSessionRefresh: true,
}
```

### 4.5 Trusted Origins (CSRF)

```ts
trustedOrigins: [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://*.trycloudflare.com",
  process.env.NEXT_PUBLIC_MOBILE_ORIGIN ?? "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:8082",
  "http://127.0.0.1:8082",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  process.env.NEXT_PUBLIC_MOBILE_EXP_ORIGIN ?? "exp://localhost:8081",
  "mypharmacymobile://",
  "myapp1://",
]
```

### 4.6 Hooks d'organisation

```ts
organization: {
  ac,
  roles: {
    owner: pharmacyRoles.owner,
    staff: pharmacyRoles.staff,
    assistant: pharmacyRoles.assistant,
  },
  defaultRole: "assistant",

  schema: {
    organization: {
      modelName: "Pharmacy",
      additionalFields: {
        address: { type: "string", required: true },
        phone: { type: "string", required: false },
        email: { type: "string", required: false },
        status: { type: "string", required: false },
        longitude: { type: "number", required: false },
        latitude: { type: "number", required: false },
      },
    },
  },

  async beforeCreateInvitation({ invitation }) {
    return {
      data: {
        ...invitation,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    }
  },

  async afterAddMember({ member }) {
    const isOwner = member.role === "owner"
    await db.user.update({
      where: { id: member.userId },
      data: {
        pharmacyId: member.organizationId,
        role: isOwner ? "PHARMA_OWNER" : "PHARMA_STAFF",
      },
    })
  },

  async afterAcceptInvitation({ member }) {
    const isOwner = member.role === "owner"
    await db.user.update({
      where: { id: member.userId },
      data: {
        pharmacyId: member.organizationId,
        role: isOwner ? "PHARMA_OWNER" : "PHARMA_STAFF",
      },
    })
  },

  async afterRemoveMember({ member }) {
    await db.user.update({
      where: { id: member.userId },
      data: { pharmacyId: null, role: "PATIENT" },
    })
  },
}
```

### 4.7 User fields additionnels

```ts
user: {
  additionalFields: {
    role: {
      type: "string",
      required: true,
      defaultValue: "PATIENT",
      input: false,
    },
    pharmacyId: {
      type: "string",
      required: false,
      input: false,
    },
  },
}
```

**Rôles** :
- `PATIENT` — rôle par défaut
- `PHARMA_OWNER` — propriétaire de pharmacie
- `PHARMA_STAFF` — employé de pharmacie

---

## 5. Notes d'intégration React Native

### 5.1 Header `expo-origin`

React Native ne peut pas définir le header `Origin` (interdit par le runtime).
Le plugin `expo()` de Better Auth remappe `expo-origin` → `Origin`.

Le catch-all handler doit appliquer ce remapping :

```ts
// app/api/auth/[...all]/route.ts
function withExpoOrigin(request: Request): Request {
  const expoOrigin = request.headers.get("expo-origin")
  if (!expoOrigin) return request
  const origin = request.headers.get("origin")
  if (origin && origin !== "null") return request
  request.headers.set("origin", expoOrigin)
  return request
}

export async function GET(request: Request) {
  return auth.handler(withExpoOrigin(request))
}

export async function POST(request: Request) {
  return auth.handler(withExpoOrigin(request))
}
```

### 5.2 Bearer token (pas de cookie)

Le client RN stocke les tokens dans :
- **expo-secure-store** (keychain OS) : refresh token + access token
- **MMKV chiffré** : session cache, profil, secret TOTP

Chaque requête inclut `Authorization: Bearer <token>`.
Le cookie cache est désactivé (`cookieCache: { enabled: false }`).

### 5.3 Deep links

Les schemes d'app doivent être déclarés dans :
- **Expo** : `app.json` → `scheme`
- **Better Auth** : `trustedOrigins` + `socialProviders.*.redirectURLs`
- **Google Cloud Console** : URIs de redirection autorisées
- **Apple Developer** : Redirect URLs du Services ID

### 5.4 Dépannage

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Invalid origin: myapp1://` | Schéma manquant dans `trustedOrigins` | Ajouter `"myapp1://"` au tableau |
| `Failed to get NitroModules` | react-native-mmkv v4 nécessite NitroModules | Rétrograder en MMKV v3 (`^3.3.3`) |
| `Impossible de joindre le serveur` | URL backend incorrecte pour l'appareil | Vérifier l'IP dans `EXPO_PUBLIC_BACKEND_URL` |
| `Session expirée` après refresh | `deferSessionRefresh` non activé | Activer `deferSessionRefresh: true` |
| `nextCookies` erreur | Plugin mal positionné | Mettre `nextCookies()` en dernier |
