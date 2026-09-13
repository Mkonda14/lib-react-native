/**
 * Stockage MMKV chiffré (ou fallback SecureStore)
 * =================================================
 * Utilisé pour : le cache de session, le profil, le secret TOTP
 * (données non critiques mais sensibles).
 *
 * Le refresh token est stocké séparément dans SecureStore (voir secure-store.ts).
 *
 * Si react-native-mmkv n'est pas disponible (Expo Go), on utilise
 * expo-secure-store comme fallback persistant (au lieu d'un Map en mémoire
 * qui perd les données à chaque reload).
 *
 * IMPORTANT : Les imports de modules natifs (react-native-mmkv, expo-secure-store)
 * sont lazy (require dynamique) pour éviter un crash au démarrage si les modules
 * natifs ne sont pas liés.
 */

import type { AuthConfig, StorageAdapter } from "../types";

type MMKVInstance = any;

let mmkvInstance: MMKVInstance | null = null;

/* ------------------------------------------------------------------ *
 * Cache synchrone SecureStore — lecture rapide, persisté en async
 * ------------------------------------------------------------------ */

const secureStoreCache = new Map<string, string>();
const SECURE_STORE_PREFIX = "auth_mmkv_";

function toSSKey(key: string): string {
  return `${SECURE_STORE_PREFIX}${key}`.replace(/[:]/g, "_");
}

/**
 * Fonction lazy pour obtenir SecureStore.
 * Retourne null si le module natif n'est pas disponible.
 */
function getSecureStore(): typeof import("expo-secure-store") | null {
  try {
    return require("expo-secure-store");
  } catch {
    return null;
  }
}

/**
 * Charger le cache depuis SecureStore au démarrage.
 * Appelé une fois par initMMKV.
 */
async function hydrateSecureStoreCache(): Promise<void> {
  const SecureStore = getSecureStore();
  if (!SecureStore) return;
  const keys = [
    "auth:session", "auth:user", "auth:totp-secret",
    "auth:biometric-enabled", "auth:last-email",
  ];
  const results = await Promise.all(
    keys.map(async (k) => {
      try {
        const val = await SecureStore.getItemAsync(toSSKey(k));
        return [k, val] as const;
      } catch {
        return [k, null] as const;
      }
    })
  );
  for (const [k, val] of results) {
    if (val !== null) {
      secureStoreCache.set(k, val);
    }
  }
}

const secureStoreMMKV = {
  getString: (key: string): string | null => {
    const cached = secureStoreCache.get(key);
    if (cached !== undefined) return cached ?? null;
    return null;
  },
  set: (key: string, value: any) => {
    secureStoreCache.set(key, String(value));
    const SS = getSecureStore();
    if (SS) {
      SS.setItemAsync(toSSKey(key), String(value)).catch(() => {});
    }
  },
  delete: (key: string) => {
    secureStoreCache.delete(key);
    const SS = getSecureStore();
    if (SS) {
      SS.deleteItemAsync(toSSKey(key)).catch(() => {});
    }
  },
  remove: (key: string) => {
    secureStoreMMKV.delete(key);
  },
  getBoolean: (key: string): boolean => {
    const val = secureStoreMMKV.getString(key);
    return val === "true";
  },
  clearAll: () => {
    secureStoreCache.clear();
    const SS = getSecureStore();
    if (SS) {
      const keys = [
        "auth:session", "auth:user", "auth:totp-secret",
        "auth:biometric-enabled", "auth:last-email",
      ];
      for (const k of keys) {
        SS.deleteItemAsync(toSSKey(k)).catch(() => {});
      }
    }
  },
};

/* ------------------------------------------------------------------ *
 * Memory fallback (dernier recours — ne persiste PAS)
 * ------------------------------------------------------------------ */

const memoryStorage = new Map<string, any>();

const memoryMMKV = {
  getString: (key: string) => memoryStorage.get(key) ?? null,
  set: (key: string, value: any) => memoryStorage.set(key, value),
  delete: (key: string) => memoryStorage.delete(key),
  remove: (key: string) => memoryStorage.delete(key),
  getBoolean: (key: string) => Boolean(memoryStorage.get(key)),
  clearAll: () => memoryStorage.clear(),
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function deleteKey(mmkv: MMKVInstance, key: string): void {
  if (typeof mmkv?.delete === "function") {
    mmkv.delete(key);
  } else if (typeof mmkv?.remove === "function") {
    mmkv.remove(key);
  }
}

/* ------------------------------------------------------------------ *
 * Init
 * ------------------------------------------------------------------ */

/**
 * Initialiser l'instance MMKV avec chiffrement.
 * Appelé une seule fois par l'AuthProvider au démarrage de l'app.
 *
 * Ordre de priorité :
 *  1. react-native-mmkv (natif, synchrone, chiffré)
 *  2. expo-secure-store (fallback persistant, async)
 *  3. Map en mémoire (dernier recours, ne persiste pas)
 */
export async function initMMKV(config?: AuthConfig): Promise<MMKVInstance> {
  if (mmkvInstance) return mmkvInstance;

  try {
    const MMKVModule = require("react-native-mmkv");
    const options = {
      id: config?.storage?.mmkvInstanceId ?? `auth-${config?.appId ?? "app"}`,
      encryptionKey: config?.storage?.mmkvEncryptionKey,
    };

    if (typeof MMKVModule.createMMKV === "function") {
      mmkvInstance = MMKVModule.createMMKV(options);
    } else if (typeof MMKVModule.MMKV === "function") {
      const MMKVClass = MMKVModule.MMKV;
      mmkvInstance = new MMKVClass(options);
    } else {
      throw new Error("MMKV module format inconnu");
    }
  } catch {
    // MMKV natif indisponible → fallback SecureStore
    const SS = getSecureStore();
    if (SS) {
      await hydrateSecureStoreCache();
      mmkvInstance = secureStoreMMKV;
      if (config?.debug) {
        console.warn(
          "[auth-rn] MMKV natif indisponible, utilisation de SecureStore comme fallback persistant",
        );
      }
    } else {
      mmkvInstance = memoryMMKV;
      if (config?.debug) {
        console.warn(
          "[auth-rn] MMKV natif et SecureStore indisponibles, utilisation du fallback mémoire (NON persistant)",
        );
      }
    }
  }

  return mmkvInstance!;
}

/**
 * Récupérer l'instance MMKV (initialise le fallback si pas encore initialisé).
 */
export function getMMKV(): MMKVInstance {
  if (!mmkvInstance) {
    return memoryMMKV;
  }
  return mmkvInstance;
}

/**
 * Adaptateur de stockage Better Auth — fait le pont entre MMKV et le client Better Auth.
 *
 * Better Auth attend une API de type localStorage (synchrone, valeurs string).
 * MMKV est synchrone, donc on peut l'envelopper directement.
 */
export function createMMKVStorageAdapter(config: AuthConfig): StorageAdapter {
  return {
    getItem: (key: string) => getMMKV().getString(key) ?? null,
    setItem: (key: string, value: string) => getMMKV().set(key, value),
    removeItem: (key: string) => deleteKey(getMMKV(), key),
  };
}

/* ------------------------------------------------------------------ *
 * Helpers typés — pour le stockage de niveau app
 * (pas les internes Better Auth)
 * ------------------------------------------------------------------ */

const KEYS = {
  session: "auth:session",
  user: "auth:user",
  totpSecret: "auth:totp-secret",
  biometricEnabled: "auth:biometric-enabled",
  lastEmailUsed: "auth:last-email",
} as const;

export const mmkvStorage = {
  getSession: () => getMMKV().getString(KEYS.session) ?? null,
  setSession: (json: string) => getMMKV().set(KEYS.session, json),
  clearSession: () => deleteKey(getMMKV(), KEYS.session),

  getUser: () => getMMKV().getString(KEYS.user) ?? null,
  setUser: (json: string) => getMMKV().set(KEYS.user, json),
  clearUser: () => deleteKey(getMMKV(), KEYS.user),

  getTotpSecret: () => getMMKV().getString(KEYS.totpSecret) ?? null,
  setTotpSecret: (secret: string) => getMMKV().set(KEYS.totpSecret, secret),
  clearTotpSecret: () => deleteKey(getMMKV(), KEYS.totpSecret),

  isBiometricEnabled: () =>
    getMMKV().getBoolean(KEYS.biometricEnabled) ?? false,
  setBiometricEnabled: (enabled: boolean) =>
    getMMKV().set(KEYS.biometricEnabled, enabled),

  getLastEmail: () => getMMKV().getString(KEYS.lastEmailUsed) ?? null,
  setLastEmail: (email: string) => getMMKV().set(KEYS.lastEmailUsed, email),

  clearAll: () => {
    Object.values(KEYS).forEach((k) => deleteKey(getMMKV(), k));
  },
} as const;

export type MmkvStorage = typeof mmkvStorage;
