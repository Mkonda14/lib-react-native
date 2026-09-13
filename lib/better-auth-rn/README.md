# Better Auth RN — Architecture multi-apps

Solution complète d'authentification **Better Auth** pour React Native (Expo), partagée entre plusieurs apps via un package npm interne autonome (sans dépendance directe à `better-auth` côté mobile).

---

## Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────┐
│  Backend Next.js (api.exemple.com)                             │
│  ├─ app/api/auth/[...all]/route.ts  ← Better Auth handler      │
│  ├─ auth.ts                         ← config Better Auth        │
│  │   ├─ emailAndPassword plugin                                │
│  │   ├─ socialProviders: { google, apple }                     │
│  │   ├─ twoFactor: { totp }                                     │
│  │   ├─ organization: { pharmacy }                             │
│  │   ├─ bearer()                                                │
│  │   └─ trustedOrigins: [app1, app2, exp://...]                │
│  └─ prisma/schema.prisma             ← User, Session, etc.    │
└────────────────────────────────────────────────────────────────┘
                          ▲
                          │ HTTPS + Bearer token REST API
                          ▼
┌────────────────────────────────────────────────────────────────┐
│  Package npm interne @your-org/auth-rn                         │
│  (0 dep better-auth — client HTTP léger)                       │
│  ├─ config.ts          ← schema Zod + validation runtime       │
│  ├─ client.ts          ← Façade d'initialisation (MMKV + API)  │
│  ├─ storage/           ← MMKV chiffré + SecureStore            │
│  ├─ provider.tsx       ← <AuthProvider> + contexte              │
│  ├─ hooks/             ← useSession, useAuthActions, etc.      │
│  ├─ oauth/             ← Google + Apple flows                  │
│  ├─ two-factor/        ← TOTP (Base32 natif) + verify         │
│  └─ middleware/         ← RequireAuth, RequireRole              │
└────────────────────────────────────────────────────────────────┘
                          ▲
                          │ npm install @your-org/auth-rn
                          ▼
┌────────────────────────────────────────────────────────────────┐
│  App RN 1 (makuta-share) │  App RN 2 (app2)  │  App RN 3     │
│  src/lib/auth/           │  src/lib/auth/     │  src/lib/auth/ │
│  └─ auth.config.ts       │  └─ auth.config.ts │  └─ auth.conf │
│  (appId: 'makuta')       │  (appId: 'app2')   │  (appId: 'adm')│
└────────────────────────────────────────────────────────────────┘
```

---

## Décisions d'architecture

### 1. Package npm interne autonome (0 dépendance à `better-auth`)

Le package client `packages/auth-rn/` est publié sur un registry privé. Chaque app RN l'installe via `npm install @your-org/auth-rn` et fournit sa propre config.
Il ne dépend pas du package `better-auth` côté mobile et communique via un client HTTP léger (`apiFetch`).

**Avantages** :
- Une seule source de vérité
- Versioning semver (`@your-org/auth-rn@1.0.0`)
- Poids de bundle minimal et compatibilité React Native garantie
- Pas de divergence entre les applications du groupe

### 2. Storage hybride (MMKV chiffré + SecureStore)

| Storage | Usage | Raison |
|---------|-------|--------|
| **SecureStore** (keychain OS) | Refresh token + Access token | Clés sensibles isolées dans le TEE/Keychain |
| **MMKV chiffré** (AES-256) | Session cache, profil, secret TOTP | Performance synchrone ultra-rapide + sécurité |

> **Version MMKV** : Utilisez `react-native-mmkv@^3.3.3` (pas v4). La v4 nécessite `react-native-nitro-modules` qui n'est pas compatible avec Expo Go.

### 3. Bearer token (pas de cookies)

RN ne gère pas nativement les cookies cross-origin de manière fiable. L'API d'authentification fonctionne en mode Bearer token. Chaque requête API inclut un header `Authorization: Bearer <access_token>`.

### 4. OAuth via deep link + expo-web-browser

Flow OAuth pour Google et Apple :
1. `signInWithSocial('google' | 'apple')` demande l'URL OAuth au backend via `/api/auth/sign-in/social`
2. `expo-web-browser.openAuthSessionAsync(url)` ouvre le navigateur in-app
3. Better Auth complète le flow côté backend
4. Redirect vers `myapp://auth-callback?token=...`
5. `expo-linking` intercepte le deep link et extrait les jetons
6. Sur iOS, Apple Sign In natif (`expo-apple-authentication`) est pris en charge en priorité

### 5. 2FA TOTP (Base32 robuste)

- **Génération du secret** : Générateur Base32 natif (`generateRandomBase32Secret`) compatible React Native.
- **QR Code** : Rendu `otpauth://` via `getQRCodeUrl` ou `react-native-qrcode-svg`.
- **Validation** : Saisie du code à 6 chiffres validée côté backend, avec support des codes de secours.

### 6. Biometric unlock (optionnel)

Après login initial, l'utilisateur peut activer Face ID / Touch ID pour re-déverrouiller l'app. Le refresh token reste dans SecureStore et l'état biométrique est géré dans MMKV.

### 7. Multi-tenancy via Organization plugin

Le plugin `organization` de Better Auth gère les pharmacies (multi-tenancy) :
- Rôles : `owner`, `staff`, `assistant`
- Invitations avec expiration (7 jours)
- Hooks automatiques pour assigner les rôles (`afterAddMember`, `afterAcceptInvitation`)

---

## Structure des livrables

```
better-auth-rn/
├── README.md                                   ← ce fichier
├── backend/                                    ← Contrat backend
│   └── contrat.md                              ← Spec API, Prisma, config
├── packages/
│   └── auth-rn/                                 ← Package npm interne
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                         ← API publique
│           ├── types.ts                         ← Types TypeScript
│           ├── config.ts                        ← Schema Zod & validation
│           ├── client.ts                        ← Façade de configuration
│           ├── errors/                          ← ApiError & parseErrorBody
│           ├── storage/
│           │   ├── mmkv.ts                      ← MMKV chiffré (v3)
│           │   └── secure-store.ts              ← SecureStore
│           ├── provider.tsx                     ← <AuthProvider> Context
│           ├── hooks/
│           │   ├── use-session.ts
│           │   ├── use-auth-actions.ts
│           │   ├── use-two-factor.ts
│           │   └── use-biometric.ts
│           ├── oauth/
│           │   ├── social.ts                    ← Flow Web Browser
│           │   ├── google.ts
│           │   └── apple.ts                     ← Flow iOS Natif + Web
│           ├── two-factor/
│           │   └── totp.ts                      ← Helpers TOTP Base32
│           ├── middleware/
│           │   └── navigation.tsx               ← RequireAuth, RequireRole
│           ├── auth/
│           │   └── auth.api.ts                  ← Toutes les fonctions API
│           └── utils/
│               └── fetch.ts                     ← apiFetch + auto-refresh
└── demo-app/                                    ← Guide d'intégration
    ├── integration.md                           ← Guide pas-à-pas
    └── app/
        ├── _layout.tsx                          ← Root + AuthProvider
        ├── (auth)/
        │   ├── _layout.tsx                      ← RedirectIfAuth
        │   ├── sign-in.tsx
        │   ├── sign-up.tsx
        │   ├── forgot-password.tsx
        │   ├── verify-email.tsx
        │   ├── two-factor-setup.tsx
        │   └── two-factor-verify.tsx
        └── (protected)/
            ├── _layout.tsx                     ← RequireAuth
            └── profile.tsx
```

---

## Setup rapide

### 1. Backend

```bash
cd backend
npm install better-auth @prisma/client @better-auth/expo @better-auth/social-providers
npx prisma migrate dev --name init
cp .env.example .env  # remplir les vars
npm run dev
```

### 2. Package auth-rn

```bash
cd packages/auth-rn
npm install
npm run build
# Publier sur votre registry privé :
npm publish --registry=https://npm.pkg.github.com
```

### 3. App RN

```bash
# Installer le package
npm install @your-org/auth-rn react-native-mmkv@^3.3.3

# Créer .env
echo 'EXPO_PUBLIC_BACKEND_URL=http://<IP>:3000' >> .env
echo 'EXPO_PUBLIC_MMKV_KEY=<cle-32-chars>' >> .env

# Lancer
npx expo start
```

---

## Configuration par app

Chaque app RN crée sa propre configuration :

```ts
import { defineAuthConfig } from '@your-org/auth-rn'

export const authConfig = defineAuthConfig({
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://api.exemple.com',
  appId: 'app1',
  appName: 'Mon App Client',
  oauth: {
    google: {
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    },
    apple: {
      clientId: 'com.yourorg.app1',
    },
  },
  storage: {
    mmkvEncryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY!,
    enableBiometric: true,
  },
  twoFactor: {
    enforceForRoles: ['admin'],
    issuer: 'Mon App Client',
  },
  deepLink: {
    scheme: 'myapp1',
    callbackPath: 'auth-callback',
  },
})
```

---

## Pré-requis

### Backend
- Node.js 20+
- PostgreSQL (recommandé) ou MySQL/SQLite
- Better Auth v1+
- Prisma ORM

### App RN
- Expo SDK 57+
- React Native 0.86+
- react-native-mmkv `^3.3.3` (pas v4)
- expo-secure-store
- expo-web-browser
- expo-linking
- expo-local-authentication
- expo-apple-authentication (optionnel pour Apple Sign-In natif sur iOS)

---

## Sécurité

| Couche | Mesure |
|--------|--------|
| Transport | HTTPS obligatoire, HSTS sur le backend |
| Tokens | Access token + refresh token dans TEE/Keychain OS avec rotation |
| Stockage RN | Refresh token dans SecureStore (keychain), reste dans MMKV AES-256 |
| 2FA | TOTP avec secret unique par user, 10 backup codes |
| Biometric | Face ID / Touch ID optionnel via `expo-local-authentication` |
| OAuth | Flow sécurisé in-app browser + Apple Sign In natif iOS |
| CSRF | Plugin `expo()` remappe `expo-origin` → `Origin` pour Better Auth |
| Errors | Normalisation avec `ApiError` et `parseErrorBody` |

---

## Dépannage

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Failed to get NitroModules` | react-native-mmkv v4 installé | `npm install react-native-mmkv@^3.3.3` |
| `Impossible de joindre le serveur` | URL backend incorrecte | Vérifier `EXPO_PUBLIC_BACKEND_URL` |
| `Invalid origin: xxx://` | Schéma manquant dans `trustedOrigins` | Ajouter le schéma côté backend |
| `Cannot find module '@your-org/auth-rn'` | Package non linké | Vérifier `tsconfig.json` paths |
| `Unable to resolve module` | Cache Metro | `npx expo start --clear` |
| `Session expirée` après refresh | `deferSessionRefresh` non activé | Activer `deferSessionRefresh: true` |

---

## API publique

### Hooks

| Hook | Import | Description |
|------|--------|-------------|
| `useSession()` | `@your-org/auth-rn` | État de session + actions (signIn, signUp, signOut) |
| `useAuthActions()` | `@your-org/auth-rn` | Actions d'auth (reset password, verify email, etc.) |
| `useTwoFactor()` | `@your-org/auth-rn` | Gestion 2FA TOTP (generate, enable, verify) |
| `useBiometric()` | `@your-org/auth-rn` | Face ID / Touch ID (enable, disable, authenticate) |

### Composants

| Composant | Import | Description |
|-----------|--------|-------------|
| `AuthProvider` | `@your-org/auth-rn` | Fournit le contexte de session |
| `RequireAuth` | `@your-org/auth-rn` | Protège une route (redirige si non auth) |
| `RedirectIfAuth` | `@your-org/auth-rn` | Redirige si déjà auth (écrans login) |
| `RequireRole` | `@your-org/auth-rn` | Protège une route par rôle |

### Fonctions

| Fonction | Import | Description |
|----------|--------|-------------|
| `defineAuthConfig` | `@your-org/auth-rn` | Valide et retourne la config (Zod) |
| `registerNavigator` | `@your-org/auth-rn` | Enregistre le navigator pour les redirects |
| `signInWithGoogle` | `@your-org/auth-rn` | Flow Google OAuth |
| `signInWithApple` | `@your-org/auth-rn` | Flow Apple (natif iOS + web fallback) |
| `apiFetch` | `@your-org/auth-rn` | Fetch API avec Bearer token auto |
| `getQRCodeUrl` | `@your-org/auth-rn` | Génère l'URL du QR code TOTP |
| `generateRandomBase32Secret` | `@your-org/auth-rn` | Génère un secret Base32 pour TOTP |

---

## Roadmap

- [x] Backend Next.js + Better Auth
- [x] Package auth-rn autonome (config, client REST, storage, hooks, OAuth, TOTP, biométrie)
- [x] Middleware React Navigation / Expo Router (`RequireAuth`, `RequireRole`, `RedirectIfAuth`)
- [x] Démo E2E (7 écrans auth + 1 écran protégé)
- [x] Plugin `organization` (multi-tenancy pharmacies)
- [x] MMKV v3 (compatible Expo Go)
- [ ] SSO cross-app (une seule login → toutes les apps connectées)
- [ ] Passkeys / WebAuthn
- [ ] Magic link
