import { useEffect, useState } from 'react'
import { requireOptionalNativeModule } from 'expo-modules-core'
import type * as ExpoLocationNS from 'expo-location'
import type { UserLocationConfig } from '../types'
import { DEFAULT_USER_LOCATION_CONFIG, DEFAULT_LOCATION } from '../config'

export interface UserLocationFix {
  /** Latitude en degrés WGS84. */
  lat: number
  /** Longitude en degrés WGS84. */
  lng: number
  /** Précision horizontale en mètres (0 si inconnue). */
  accuracy: number
  /** Cap (course over ground) en degrés, ou null si indisponible. */
  heading: number | null
  /** Vitesse en m/s, ou null si indisponible. */
  speed: number | null
}

export interface UseUserLocationOptions {
  /** Activer la localisation. Par défaut: true. */
  enabled?: boolean
  /**
   * Options de localisation (précision, watch, cache).
   * Fusionnées avec DEFAULT_USER_LOCATION_CONFIG.
   */
  options?: UserLocationConfig
}

export interface UseUserLocationResult {
  /** Dernière position reçue, ou null (désactivé / permission refusée / erreur). */
  location: UserLocationFix | null
  /** Message d'erreur en cas d'échec (permission refusée, module absent…), sinon null. */
  error: string | null
}

type LocationModule = typeof ExpoLocationNS

/**
 * Charge le module JS expo-location uniquement si le module natif associé
 * (« ExpoLocation ») est présent dans le binaire. Évite toute levée d'erreur
 * sur un APK buildé avant l'ajout de la dépendance.
 *
 * NB: les require() doivent rester littéraux (Metro refuse les require
 * dynamiques dont l'argument est une variable).
 */
function loadLocationModule(): LocationModule | null {
  try {
    if (!requireOptionalNativeModule('ExpoLocation')) {
      return null
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- import paresseux (module optionnel)
    return require('expo-location') as LocationModule
  } catch {
    return null
  }
}

/**
 * Localisation de l'utilisateur via expo-location (production uniquement —
 * le mode développement utilise DEFAULT_LOCATION injecté comme mockLocation).
 *
 * - watch !== false (défaut) : suivi continu via watchPositionAsync.
 * - watch === false : position unique via getCurrentPositionAsync.
 * - Permission refusée / module absent : location reste null + error renseigné
 *   (aucune pastille affichée, la carte reste utilisable).
 */
export function useUserLocation({
  enabled = true,
  options,
}: UseUserLocationOptions = {}): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocationFix | null>(null)
  const [error, setError] = useState<string | null>(null)

  const watch = (options?.watch ?? DEFAULT_USER_LOCATION_CONFIG.watch) !== false
  const highAccuracy =
    options?.enableHighAccuracy ?? DEFAULT_USER_LOCATION_CONFIG.enableHighAccuracy
  const maximumAge = options?.maximumAge ?? DEFAULT_USER_LOCATION_CONFIG.maximumAge

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let subscription: { remove: () => void } | null = null

    const applyFix = (coords: ExpoLocationNS.LocationObject['coords']) => {
      if (cancelled) return
      setLocation({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: typeof coords.accuracy === 'number' ? coords.accuracy : 0,
        heading:
          typeof coords.heading === 'number' && !isNaN(coords.heading)
            ? coords.heading
            : null,
        speed:
          typeof coords.speed === 'number' && !isNaN(coords.speed)
            ? coords.speed
            : null,
      })
      setError(null)
    }

    const start = async () => {
      try {
        const Location = loadLocationModule()
        if (!Location) {
          throw new Error('expo-location indisponible (rebuild natif requis)')
        }

        const permission = await Location.requestForegroundPermissionsAsync()
        if (cancelled) return
        if (!permission.granted) {
          setLocation(null)
          setError('Permission de localisation refusée')
          return
        }

        const accuracy = highAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced

        // Position en cache : pastille immédiate pendant l'acquisition GPS.
        try {
          const cached = await Location.getLastKnownPositionAsync({
            maxAge: maximumAge,
          })
          if (cached) applyFix(cached.coords)
        } catch {
          // Non bloquant : on continue vers le flux GPS.
        }
        if (cancelled) return

        if (watch) {
          subscription = await Location.watchPositionAsync(
            { accuracy },
            (loc) => applyFix(loc.coords),
            (reason) => {
              if (!cancelled) setError(reason)
            },
          )
          // L'effet peut avoir été nettoyé pendant l'await : le watch vient
          // alors de démarrer sur un composant désabandonné → on l'arrête.
          if (cancelled) {
            subscription.remove()
            subscription = null
          }
        } else {
          const position = await Location.getCurrentPositionAsync({ accuracy })
          applyFix(position.coords)
        }
      } catch (e) {
        if (cancelled) return
        setLocation(null)
        setError(e instanceof Error ? e.message : String(e))
      }
    }

    void start()

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [enabled, watch, highAccuracy, maximumAge])

  // Désactivé → null observé (sans reset d'état dans l'effet, interdit par
  // react-hooks/set-state-in-effect) : aucun push risqué vers la WebView.
  return {
    location: enabled ? location : null,
    error: enabled ? error : null,
  }
}

/**
 * Acquisition unique (hors hook) — utilisée par MapRef.locate() lorsque
 * config.userLocation est désactivé : une seule position, pas de watch.
 *
 * - module natif absent : __DEV__ renvoie DEFAULT_LOCATION (simulé), sinon throw.
 * - permission refusée : throw (MapRef.locate relaie via onError).
 */
export async function getFixOnce(
  options?: UserLocationConfig,
): Promise<UserLocationFix> {
  const Location = loadLocationModule()
  if (!Location) {
    if (__DEV__) {
      return {
        lat: DEFAULT_LOCATION.lat,
        lng: DEFAULT_LOCATION.lng,
        accuracy: 0,
        heading: null,
        speed: null,
      }
    }
    throw new Error('expo-location indisponible (rebuild natif requis)')
  }

  const permission = await Location.requestForegroundPermissionsAsync()
  if (!permission.granted) {
    throw new Error('Permission de localisation refusée')
  }

  const highAccuracy =
    options?.enableHighAccuracy ?? DEFAULT_USER_LOCATION_CONFIG.enableHighAccuracy
  const maximumAge = options?.maximumAge ?? DEFAULT_USER_LOCATION_CONFIG.maximumAge
  const accuracy = highAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced

  // Position en cache d'abord (réponse immédiate), GPS ensuite.
  let coords: ExpoLocationNS.LocationObject['coords'] | null = null
  try {
    const cached = await Location.getLastKnownPositionAsync({ maxAge: maximumAge })
    if (cached) coords = cached.coords
  } catch {
    // Non bloquant : on passe à l'acquisition GPS.
  }
  if (!coords) {
    const position = await Location.getCurrentPositionAsync({ accuracy })
    coords = position.coords
  }

  return {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: typeof coords.accuracy === 'number' ? coords.accuracy : 0,
    heading:
      typeof coords.heading === 'number' && !isNaN(coords.heading)
        ? coords.heading
        : null,
    speed:
      typeof coords.speed === 'number' && !isNaN(coords.speed) ? coords.speed : null,
  }
}
