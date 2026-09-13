# API Fetcher

> HTTP client **zero-dependency** pour React Native, fully-typed, extensible.

## Sommaire

- [Installation](#installation)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Méthodes HTTP](#méthodes-http)
- [Query params](#query-params)
- [Path params](#path-params)
- [Body](#body)
- [Headers](#headers)
- [Timeout](#timeout)
- [Retry](#retry)
- [Cancellation (AbortSignal)](#cancellation-abortsignal)
- [Déduplication](#déduplication)
- [Cache](#cache)
- [Interceptors](#interceptors)
- [Plugins](#plugins)
- [Auth + refresh auto](#auth--refresh-auto)
- [Upload / Download avec progress](#upload--download-avec-progress)
- [Hiérarchie d'erreurs](#hiérarchie-derreurs)
- [Typed responses](#typed-responses)
- [Recipes](#recipes)
- [API complète](#api-complète)

---

## Installation

Aucune dépendance externe. Copiez le dossier `api-fetcher/src/` dans votre projet, ou publiez-le en package interne.

```bash
# Option 1: copier les fichiers
cp -r api-fetcher/src/ /votre-projet/lib/api-fetcher/

# Option 2: package interne (npm publish sur Verdaccio / GitHub Packages)
# Puis: npm install @your-org/api-fetcher
```

**Pré-requis** : React Native ≥ 0.60 (pour `fetch` + `AbortController` natifs).

---

## Démarrage rapide

```typescript
import { ApiClient } from '@/lib/api-fetcher'

const api = new ApiClient({
  baseURL: 'https://api.exemple.com',
  timeout: 30000,
})

// GET
const { data, status } = await api.get<User[]>('/users', {
  query: { page: 1, limit: 20 },
})

// POST
await api.post('/users', {
  name: 'John Doe',
  email: 'john@exemple.com',
})

// DELETE
await api.delete(`/users/${userId}`)
```

---

## Configuration

### Toutes les options

```typescript
const api = new ApiClient({
  // Base URL — préfixée à tous les chemins
  baseURL: 'https://api.exemple.com',

  // Headers par défaut (mergés avec ceux de chaque requête)
  headers: {
    'Accept': 'application/json',
    'X-App-Version': '1.0.0',
  },

  // Timeout global (ms) — peut être overridé par requête
  timeout: 30000,

  // Retry (false pour désactiver)
  retry: {
    attempts: 3,
    initialDelayMs: 500,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
    jitter: true,
    retryOnStatus: [408, 429, 500, 502, 503, 504],
    retryOnNetworkError: true,
    onRetry: (info) => console.log(`retry ${info.attempt}/${info.totalAttempts}`),
  },

  // Cache en mémoire (false pour désactiver)
  cache: {
    ttlMs: 60000,        // 1 minute
    methods: ['GET'],
    maxEntries: 100,
  },

  // Déduplication des requêtes GET parallèles
  dedupe: true,

  // Type de réponse par défaut
  responseType: 'json',

  // Auth
  authScheme: 'Bearer',
  getAuthToken: () => SecureStore.getItemAsync('token'),
  onUnauthorized: async (error, retry) => {
    await refreshSession()
    await retry()
  },

  // User-Agent (envoyé comme header)
  userAgent: 'my-app/1.0.0 (iOS)',

  // Debug
  debug: __DEV__,
  logger: console,

  // Tags par défaut (pour cache invalidation)
  defaultTags: ['mobile'],
})
```

### Override par requête

Chaque option peut être overridée au niveau de la requête :

```typescript
await api.get('/slow-endpoint', {
  timeout: 60000,        // override global
  retry: { attempts: 5 },
  cache: false,           // désactive le cache pour cette requête
  dedupe: false,
  tags: ['users', 'admin'],
})
```

---

## Méthodes HTTP

```typescript
api.get<T>(path, options?)
api.post<T>(path, body?, options?)
api.put<T>(path, body?, options?)
api.patch<T>(path, body?, options?)
api.delete<T>(path, options?)
api.head<T>(path, options?)
api.options<T>(path, options?)

// Méthode générique
api.request<T>(path, { method: 'POST', body: {...} })
```

---

## Query params

```typescript
await api.get('/users', {
  query: {
    page: 1,
    limit: 20,
    active: true,
    search: 'john',
    roles: ['admin', 'editor'], // → ?roles=admin&roles=editor
    nested: { deep: { value: 42 } }, // → ?nested[deep][value]=42
    nullable: null,   // → skipped (par défaut)
    date: new Date(), // → ISO string
  }
})
```

**Formats de tableaux** (configurable via `serializeQuery`) :
- `repeat` (défaut) : `?a=1&a=2`
- `bracket` : `?a[]=1&a[]=2`
- `index` : `?a[0]=1&a[1]=2`
- `comma` : `?a=1,2`
- `json` : `?a=[1,2]`

---

## Path params

Deux syntaxes supportées :

```typescript
// Syntaxe :id
await api.get('/users/:id', { params: { id: 123 } })
// → /users/123

// Syntaxe {id} (style OpenAPI)
await api.get('/users/{id}/posts/{postId}', {
  params: { id: 123, postId: 456 }
})
// → /users/123/posts/456
```

---

## Body

Le body est automatiquement sérialisé selon son type :

| Type | Sérialisation | Content-Type |
|------|---------------|--------------|
| `string` | tel quel | (inchangé) |
| `Object` / `Array` | `JSON.stringify` | `application/json` |
| `FormData` | natif (RN gère la boundary) | (auto) |
| `ArrayBuffer` | tel quel | (inchangé) |
| `null` / `undefined` | pas de body | — |

```typescript
// JSON
await api.post('/users', { name: 'John' })

// FormData (upload)
const fd = new FormData()
fd.append('file', { uri, name, type })
await api.post('/upload', fd)

// Raw string
await api.post('/webhook', 'raw-body-content', {
  headers: { 'Content-Type': 'text/plain' }
})
```

---

## Headers

```typescript
// Au niveau du client
const api = new ApiClient({
  baseURL: 'https://api.exemple.com',
  headers: {
    'Authorization': 'Bearer xxx', // mais mieux via createAuthPlugin
    'Accept-Language': 'fr-FR',
  },
})

// Au niveau de la requête (override)
await api.get('/users', {
  headers: {
    'X-Request-Id': 'abc-123',
    'Accept-Language': 'en-US', // override
  },
})
```

---

## Timeout

```typescript
// Global
new ApiClient({ baseURL, timeout: 30000 })

// Par requête
await api.get('/slow', { timeout: 120000 }) // 2 min
```

L'erreur levée est `ApiTimeoutError` :

```typescript
try {
  await api.get('/slow')
} catch (err) {
  if (err instanceof ApiTimeoutError) {
    console.log(`Timed out after ${err.timeoutMs}ms`)
  }
}
```

---

## Retry

Le retry utilise un **exponential backoff** avec jitter, et respecte le header `Retry-After`.

```typescript
// Config globale
new ApiClient({
  retry: {
    attempts: 3,
    initialDelayMs: 500,
    backoffMultiplier: 2,  // delays: 500ms, 1000ms, 2000ms
    maxDelayMs: 30000,
    jitter: true,          // +0-50% aléatoire
    retryOnStatus: [408, 429, 500, 502, 503, 504],
    retryOnNetworkError: true,
    onRetry: (info) => {
      console.log(`Retry ${info.attempt}/${info.totalAttempts} dans ${info.delayMs}ms`)
    },
  },
})

// Par requête
await api.get('/flaky', { retry: { attempts: 5 } })

// Désactiver pour une requête
await api.post('/payments', body, { retry: false })
```

**Retry-After** : si la réponse contient le header `Retry-After` (en secondes ou date HTTP), le client attendra cette durée exacte au lieu du backoff.

```typescript
// Condition personnalisée
new ApiClient({
  retry: {
    attempts: 3,
    shouldRetry: (err, attempt) => {
      // Ne pas retry les 4xx sauf 429
      if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
        return false
      }
      return true
    },
  },
})
```

---

## Cancellation (AbortSignal)

```typescript
const controller = new AbortController()

// Lancer la requête
const promise = api.get('/users', { signal: controller.signal })

// Annuler (depuis un autre bouton / useEffect cleanup)
controller.abort()

try {
  await promise
} catch (err) {
  if (err instanceof ApiAbortError) {
    console.log('Request cancelled')
  }
}
```

**Pattern React** :

```tsx
useEffect(() => {
  const controller = new AbortController()
  api.get('/users', { signal: controller.signal })
    .then(setUsers)
    .catch(() => {})
  return () => controller.abort()
}, [])
```

---

## Déduplication

Si deux composants montent en même temps et font le même GET, une seule requête HTTP est envoyée.

```typescript
// Composant A
api.get('/users') // → HTTP request #1

// Composant B (montre en même temps)
api.get('/users') // → share la même promise, pas de 2e HTTP

// Les deux reçoivent la même réponse
```

Activé par défaut. Désactiver par requête :

```typescript
await api.get('/users', { dedupe: false })
```

---

## Cache

Cache en mémoire LRU avec TTL + invalidation par tags.

```typescript
const api = new ApiClient({
  cache: {
    ttlMs: 60000,         // 1 minute
    methods: ['GET'],
    maxEntries: 100,
  },
})

// Invalidation par tag
await api.get('/users', { tags: ['users'] })
await api.get('/users/:id', { params: { id: 1 }, tags: ['users'] })

// Invalider toutes les entrées taguées 'users'
api.clearCache(['users'])

// Invalider par pattern d'URL
api.invalidateCacheURL('/users')

// Vider tout
api.clearCache()
```

**Forcer le refresh d'une requête** :

```typescript
await api.get('/users', { cache: false }) // bypass le cache
```

**Réponse depuis le cache** :

```typescript
const { data, fromCache, status } = await api.get('/users')
console.log(fromCache ? 'depuis cache' : 'fresh')
```

---

## Interceptors

Style Axios, fully-typed.

```typescript
// Request interceptor (modifie la config avant l'envoi)
api.addRequestInterceptor({
  onFulfilled: (config) => {
    config.headers['X-Timestamp'] = Date.now().toString()
    return config
  },
  onRejected: (err) => {
    return err
  },
})

// Response interceptor (modifie la réponse)
api.addResponseInterceptor({
  onFulfilled: (response) => {
    // Transformer la réponse avant de la retourner à l'appelant
    return response
  },
  onRejected: (error) => {
    // Gérer les erreurs globalement
    if (error instanceof ApiAuthError) {
      router.replace('/login')
    }
    return error // ou throw pour propager
  },
})

// Supprimer
const id = api.addRequestInterceptor({ onFulfilled: (c) => c })
api.removeInterceptor(id)
```

**Ordre d'exécution** :
- Request interceptors : LIFO (dernier ajouté = premier exécuté)
- Response interceptors : FIFO (premier ajouté = premier exécuté)

---

## Plugins

Les plugins sont une couche haut niveau qui combine `onRequest` / `onResponse` / `onError`.

```typescript
import { createAuthPlugin, createLoggingPlugin, createMetricsPlugin, createDevtoolsPlugin } from '@/lib/api-fetcher'

// 1. Auth (token + refresh)
api.addPlugin(createAuthPlugin({
  getAuthToken: () => SecureStore.getItemAsync('token'),
  onUnauthorized: async (err, retry) => {
    const newToken = await refreshToken()
    await retry()
  },
  skipAuthPaths: ['/auth/login', '/auth/refresh'],
}))

// 2. Logging
api.addPlugin(createLoggingPlugin({
  level: 'debug',
  redactHeaders: ['authorization', 'cookie'],
}))

// 3. Metrics (compte requests, errors, latence moyenne)
api.addPlugin(createMetricsPlugin())
// api.getPlugin<ReturnType<typeof createMetricsPlugin>>('metrics')?.getMetrics()

// 4. Devtools (in-memory log pour UI de debug)
api.addPlugin(createDevtoolsPlugin({ maxEntries: 100 }))
```

### Plugin custom

```typescript
import type { ApiPlugin } from '@/lib/api-fetcher'

const analyticsPlugin: ApiPlugin = {
  name: 'analytics',
  onRequest: (config) => {
    analytics.track('api_request_start', { url: config.url })
    return config
  },
  onResponse: (response) => {
    analytics.track('api_request_success', {
      url: response.config.url,
      duration: response.duration,
    })
    return response
  },
  onError: (error) => {
    analytics.track('api_request_error', {
      url: error.context.url,
      status: error.context.status,
    })
    return error
  },
}

api.addPlugin(analyticsPlugin)
```

---

## Auth + refresh auto

Le plugin `createAuthPlugin` gère :

1. **Injection du token** : appelle `getAuthToken()` avant chaque requête (sauf `skipAuth: true`).
2. **Refresh sur 401** : appelle `onUnauthorized(error, retry)`. La fonction doit rafraîchir le token puis appeler `retry()`.
3. **Déduplication du refresh** : si plusieurs requêtes tombent en 401 simultanément, un seul refresh est lancé.
4. **Skip paths** : certaines routes (login, refresh) n'ont pas besoin d'auth.

```typescript
import * as SecureStore from 'expo-secure-store'

api.addPlugin(createAuthPlugin({
  getAuthToken: () => SecureStore.getItemAsync('access_token'),
  onUnauthorized: async (error, retry) => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token')
    if (!refreshToken) {
      // Pas de refresh token → déconnecter l'utilisateur
      await logout()
      return
    }

    try {
      const { data } = await api.post<{ token: string }>('/auth/refresh', { refreshToken })
      await SecureStore.setItemAsync('access_token', data.token)
      await retry() // retry la requête initiale avec le nouveau token
    } catch {
      await logout()
    }
  },
  skipAuthPaths: ['/auth/login', '/auth/refresh', '/auth/signup'],
  maxRefreshAttempts: 1, // ne pas boucler si le refresh échoue
}))
```

---

## Upload / Download avec progress

RN `fetch` n'expose pas de progress. Pour l'upload/download avec progression, on bascule sur `XMLHttpRequest` (nativement supporté).

```typescript
// Upload avec progress
const fd = new FormData()
fd.append('file', { uri: 'file:///...', name: 'photo.jpg', type: 'image/jpeg' })

await api.upload('/upload', {
  body: fd,
  onProgress: ({ progress, speed, loaded, total }) => {
    console.log(`${Math.round(progress * 100)}% - ${formatBytes(speed)}/s`)
  },
})

// Download avec progress
await api.download('/large-file.pdf', {
  onProgress: ({ progress }) => {
    setDownloadProgress(progress)
  },
})
```

---

## Hiérarchie d'erreurs

Toutes les erreurs étendent `ApiError`. Vérifiez le type avec `instanceof` ou le code.

```
ApiError (base)
├── ApiNetworkError          (Network request failed)
├── ApiTimeoutError          (timeout exceeded)
├── ApiAbortError            (user aborted)
├── ApiParseError            (body parse failed)
├── ApiHttpError             (HTTP non-2xx)
│   ├── ApiClientError       (4xx)
│   │   ├── ApiAuthError          (401)
│   │   ├── ApiForbiddenError     (403)
│   │   ├── ApiNotFoundError      (404)
│   │   ├── ApiValidationError    (422) → .errors = parsed server errors
│   │   └── ApiRateLimitError     (429) → .retryAfterMs
│   └── ApiServerError       (5xx)
│       ├── ApiBadGatewayError         (502)
│       ├── ApiServiceUnavailableError (503)
│       └── ApiGatewayTimeoutError     (504)
```

### Usage

```typescript
import {
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
  ApiAuthError,
  ApiValidationError,
  ApiRateLimitError,
  isRetryableError,
  isAuthError,
} from '@/lib/api-fetcher'

try {
  await api.post('/users', body)
} catch (err) {
  if (err instanceof ApiValidationError) {
    // 422 — erreurs de validation serveur
    setFieldErrors(err.errors)
  } else if (err instanceof ApiAuthError) {
    // 401 — token expiré / non valide
    router.replace('/login')
  } else if (err instanceof ApiRateLimitError) {
    // 429 — trop de requêtes
    const waitMs = err.retryAfterMs ?? 5000
    showNotice(`Trop de requêtes, réessayez dans ${waitMs / 1000}s`)
  } else if (err instanceof ApiTimeoutError) {
    showError('La requête a expiré')
  } else if (err instanceof ApiNetworkError) {
    showError('Pas de connexion internet')
  } else if (err instanceof ApiError) {
    showError(err.message)
  }
}
```

### Helpers

```typescript
isRetryableError(err)   // → true si network/5xx/429/timeout
isAuthError(err)        // → true si 401
isErrorOfCode(err, 404) // → true si status === 404
err.toJSON()            // → objet sérialisable (pour Sentry / logs)
```

---

## Typed responses

Le paramètre générique `T` type la propriété `data` :

```typescript
interface User { id: string; name: string; email: string }

const { data: users } = await api.get<User[]>('/users')
//       ^? User[]

const { data: created } = await api.post<User>('/users', body)
//       ^? User
```

**⚠️** Le type est une assertion — le client ne valide pas le runtime. Pour de la validation runtime, branchez Zod dans un response interceptor :

```typescript
import { z } from 'zod'

api.addResponseInterceptor({
  onFulfilled: async (response) => {
    if (response.config.meta?.schema) {
      const schema = response.config.meta.schema as z.ZodType
      response.data = schema.parse(response.data)
    }
    return response
  },
})

// Usage
await api.get('/users', {
  meta: { schema: z.array(z.object({ id: z.string(), name: z.string() })) },
})
```

---

## Recipes

### 1. Instance avec auth + logging + analytics

```typescript
import { ApiClient, createAuthPlugin, createLoggingPlugin } from '@/lib/api-fetcher'
import * as SecureStore from 'expo-secure-store'

export const api = new ApiClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL!,
  timeout: 30000,
  headers: { 'X-App-Version': '1.0.0' },
  retry: { attempts: 3 },
})

api.addPlugin(createLoggingPlugin({ level: __DEV__ ? 'debug' : 'error' }))

api.addPlugin(createAuthPlugin({
  getAuthToken: () => SecureStore.getItemAsync('access_token'),
  onUnauthorized: async (err, retry) => {
    const refreshToken = await SecureStore.getItemAsync('refresh_token')
    if (!refreshToken) return logout()
    try {
      const { data } = await api.post<{ token: string }>('/auth/refresh', { refreshToken }, { skipAuth: true })
      await SecureStore.setItemAsync('access_token', data.token)
      await retry()
    } catch {
      await logout()
    }
  },
  skipAuthPaths: ['/auth/login', '/auth/refresh', '/auth/signup'],
}))
```

### 2. React Query integration

```typescript
import { useQuery } from '@tanstack/react-query'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').then((r) => r.data),
    // Le retry / cache du api-fetcher + celui de ReactQuery se cumulent —
    // désactivez celui de ReactQuery si besoin :
    retry: false,
  })
}
```

### 3. Hooks React

```typescript
import { useEffect, useState } from 'react'

export function useApi<T>(fn: () => Promise<ApiResponse<T>>, deps: any[]) {
  const [state, setState] = useState<{
    data?: T
    error?: ApiError
    isLoading: boolean
  }>({ isLoading: true })

  useEffect(() => {
    const controller = new AbortController()
    setState({ isLoading: true })
    fn()
      .then((res) => setState({ data: res.data, isLoading: false }))
      .catch((error) => {
        if (!(error instanceof ApiAbortError)) {
          setState({ error, isLoading: false })
        }
      })
    return () => controller.abort()
  }, deps)

  return state
}

// Usage
const { data, error, isLoading } = useApi(
  () => api.get<User[]>('/users'),
  []
)
```

### 4. Endpoint factory (typed wrappers)

```typescript
// lib/api/endpoints.ts
import { api } from '../api'
import type { User, CreateUserInput, UpdateUserInput } from '../types'

export const usersApi = {
  list: (query?: { page?: number; limit?: number }) =>
    api.get<User[]>('/users', { query, tags: ['users'] }),

  get: (id: string) =>
    api.get<User>(`/users/:id`, { params: { id }, tags: ['users'] }),

  create: (input: CreateUserInput) =>
    api.post<User>('/users', input),

  update: (id: string, input: UpdateUserInput) =>
    api.patch<User>(`/users/:id`, input, { params: { id } }),

  delete: (id: string) =>
    api.delete<void>(`/users/:id`, { params: { id } }),
}

// Usage
const { data: users } = await usersApi.list({ page: 1 })
await usersApi.create({ name: 'John' })
api.clearCache(['users']) // invalide le cache users
```

### 5. Mock en tests

```typescript
import { ApiClient } from '@/lib/api-fetcher'

const mockApi = new ApiClient({ baseURL: 'http://localhost' })

// Override fetch global
global.fetch = jest.fn().mockResolvedValue(
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
)

const { data } = await mockApi.get('/test')
expect(data).toEqual({ ok: true })
```

---

## API complète

### `new ApiClient(config)`

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `baseURL` | `string` | — | URL de base |
| `headers` | `Record<string, string>` | `{}` | Headers par défaut |
| `timeout` | `number` | `30000` | Timeout en ms |
| `retry` | `RetryConfig \| false` | voir defaults | Configuration retry |
| `cache` | `CacheConfig \| false` | `false` | Configuration cache |
| `dedupe` | `boolean` | `true` | Déduplication GET |
| `responseType` | `'json' \| 'text' \| 'blob' \| 'arrayBuffer' \| 'formData' \| 'none'` | `'json'` | Comment parser la réponse |
| `getAuthToken` | `() => string \| null \| Promise<...>` | — | Getter du token |
| `authScheme` | `string` | `'Bearer'` | Schéma d'auth |
| `onUnauthorized` | `(err, retry) => Promise<void>` | — | Callback sur 401 |
| `debug` | `boolean` | `false` | Logs debug |
| `logger` | `Logger` | `console` | Logger custom |
| `userAgent` | `string` | — | Header User-Agent |
| `defaultTags` | `string[]` | `[]` | Tags par défaut |
| `serializeQuery` | `(params) => string` | built-in | Serializer query custom |
| `serializeBody` | `(body, headers) => {...}` | built-in | Serializer body custom |

### `RequestOptions` (par requête)

Toutes les options du constructeur + :

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `method` | `HttpMethod` | `'GET'` | Méthode HTTP |
| `query` | `QueryParams` | — | Query params |
| `params` | `PathParams` | — | Path params |
| `body` | `Body` | — | Corps de la requête |
| `headers` | `HttpHeaders` | — | Headers (mergés) |
| `signal` | `AbortSignal` | — | Pour cancellation |
| `meta` | `Record<string, unknown>` | — | Metadata custom |
| `tags` | `string[]` | — | Tags pour cache |
| `skipAuth` | `boolean` | `false` | Skip l'injection du token |
| `skipInterceptors` | `boolean` | `false` | Skip les interceptors |

### `ApiResponse<T>`

| Prop | Type | Description |
|------|------|-------------|
| `data` | `T` | Corps parsé |
| `response` | `Response` | Objet Response natif |
| `status` | `number` | Code HTTP |
| `headers` | `HttpHeaders` | Headers de réponse |
| `duration` | `number` | Durée en ms |
| `config` | `ResolvedRequestOptions` | Config finale |
| `retries` | `number` | Nombre de retries effectués |
| `fromCache` | `boolean` | Vrai si servi depuis le cache |

### `ApiClient` methods

- `get<T>(path, options?)` / `post` / `put` / `patch` / `delete` / `head` / `options`
- `request<T>(path, options?)` (générique)
- `upload<T>(path, options)` — FormData + progress
- `download<T>(path, options)` — Download + progress
- `addPlugin(plugin)` / `removePlugin(name)`
- `addRequestInterceptor(interceptor)` → `id`
- `addResponseInterceptor(interceptor)` → `id`
- `removeInterceptor(id)`
- `setAuthToken(token)` / `getAuthToken()`
- `clearCache(tags?)` / `invalidateCacheURL(pattern)`
- `clearDedupe()`

---

## Fichiers

```
api-fetcher/
├── README.md              — cette doc
└── src/
    ├── index.ts           — exports publics
    ├── ApiClient.ts        — classe principale (~400 lignes)
    ├── types.ts            — interfaces TypeScript
    ├── errors.ts           — hiérarchie d'erreurs
    ├── constants.ts        — valeurs par défaut
    ├── utils.ts            — helpers purs
    ├── serializer.ts       — query + body
    ├── interceptors.ts     — chain manager
    ├── retry.ts            — exponential backoff
    ├── dedupe.ts           — déduplication
    ├── cache.ts            — cache LRU + TTL
    ├── plugins.ts          — plugin manager
    ├── progress.ts         — upload/download via XHR
    └── builtins.ts         — plugins auth/logging/metrics/devtools
```

---

## Pré-requis

- React Native ≥ 0.60 (fetch + AbortController natifs)
- TypeScript ≥ 4.7 (pour les types avancés)
- Aucune dépendance externe

---

## License

MIT — utilisez librement dans vos projets commerciaux et personnels.