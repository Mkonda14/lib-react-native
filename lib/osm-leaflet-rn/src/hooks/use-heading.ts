import { useState, useEffect, useRef } from 'react'
import { requireOptionalNativeModule } from 'expo-modules-core'

export interface UseHeadingOptions {
  /** Activer le suivi du magnétomètre. Par défaut: true. */
  enabled?: boolean
  /** Intervalle de mise à jour en millisecondes. Par défaut: 100ms. */
  updateInterval?: number
  /**
   * Intensité du lissage exponentiel (0 exclusive à 1 exclusive).
   * 0.2 = rééquilibré (τ ≈ 0.45s à 10Hz) : quasi aucun tremblement à l'arrêt,
   * légère latence perceptible en pivotant. Valeur plus faible = plus stable
   * mais plus lent ; valeur plus forte = plus réactif mais plus nerveux.
   * Par défaut: 0.2.
   */
  smoothing?: number
}

export interface UseHeadingResult {
  /** Angle d'orientation en degrés (0° = Nord, 90° = Est, 180° = Sud, 270° = Ouest), ou null si non disponible / désactivé. */
  heading: number | null
  /** Vrai si le capteur magnétomètre est disponible sur l'appareil. */
  isAvailable: boolean
}

type Vec3 = { x: number; y: number; z: number }

/** Données d'échantillon d'un capteur expo-sensors (champs optionnels). */
type SensorEvent = { x?: number; y?: number; z?: number }

/** Surface minimale utilisée d'un module capteur expo-sensors. */
interface SensorLike {
  isAvailableAsync(): Promise<boolean>
  setUpdateInterval(interval: number): void
  addListener(listener: (data: SensorEvent) => void): { remove: () => void }
}

/**
 * Obtient le module natif demandé en vérifiant au préalable avec
 * requireOptionalNativeModule. Cela évite toute levée d'erreur si le module
 * natif n'est pas recompilé dans le binaire Android/iOS.
 *
 * NB: les require() doivent rester littéraux (Metro refuse les require
 * dynamiques dont l'argument est une variable).
 */
function getOptionalSensorSafe(
  name: string,
  load: () => SensorLike | { default?: SensorLike },
): SensorLike | null {
  try {
    const nativeModule = requireOptionalNativeModule(name)
    if (!nativeModule) {
      return null
    }
    const Module = load()
    const sensor = (Module as { default?: SensorLike }).default ?? (Module as SensorLike)
    return sensor ?? null
  } catch {
    return null
  }
}

function loadMagnetometer() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import paresseux (module optionnel)
  return require('expo-sensors/build/Magnetometer')
}

function loadAccelerometer() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import paresseux (module optionnel)
  return require('expo-sensors/build/Accelerometer')
}

/**
 * Compense l'inclinaison de l'appareil : projette le vecteur magnétique `m`
 * sur le plan perpendiculaire à la gravité `g` pour ne garder que la
 * composante horizontale du champ. Sans ce calcul, une pente (table de bord…)
 * mélange la composante verticale du champ dans les composantes horizontales
 * et fausse/instabilise le cap.
 *
 * La formule est indépendante du signe de `g`. Avec g = (0,0,1) (repli quand
 * l'accéléromètre est absent), le résultat est strictement équivalent à un
 * atan2(x, y) classique sur les composantes X/Y.
 */
function projectHorizontal(m: Vec3, g: Vec3): Vec3 {
  const dot = m.x * g.x + m.y * g.y + m.z * g.z
  const g2 = g.x * g.x + g.y * g.y + g.z * g.z
  if (g2 < 1e-12) return m
  const k = dot / g2
  return { x: m.x - g.x * k, y: m.y - g.y * k, z: m.z - g.z * k }
}

/**
 * Hook personnalisé React Native pour obtenir l'orientation (cap/boussole)
 * de l'appareil en degrés à l'aide d'Expo Magnetometer + Accelerometer
 * (expo-sensors). Le cap est compensé en inclinaison puis filtré par une
 * moyenne exponentielle circulaire pour rester lisible sans tremblement.
 */
export function useHeading(options: UseHeadingOptions = {}): UseHeadingResult {
  const { enabled = true, updateInterval = 100, smoothing = 0.2 } = options
  const [heading, setHeading] = useState<number | null>(null)
  const [isAvailable, setIsAvailable] = useState<boolean>(false)
  const lastEmittedRef = useRef<number | null>(null)
  const smoothingRef = useRef(smoothing)

  // Synchroniser la valeur de lissage sans écrire dans un ref pendant le rendu.
  useEffect(() => {
    smoothingRef.current = smoothing
  }, [smoothing])

  useEffect(() => {
    if (!enabled) {
      /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation d'état quand le capteur est désactivé */
      setHeading(null)
      setIsAvailable(false)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    const Magnetometer = getOptionalSensorSafe('ExponentMagnetometer', loadMagnetometer)
    if (!Magnetometer) {
      setIsAvailable(false)
      setHeading(null)
      return
    }
    const Accelerometer = getOptionalSensorSafe('ExponentAccelerometer', loadAccelerometer)

    let magSubscription: { remove: () => void } | null = null
    let accelSubscription: { remove: () => void } | null = null
    const magRef = { current: null as Vec3 | null }
    const accelRef = { current: null as Vec3 | null }
    const filteredRef = { current: null as number | null }

    function computeAndEmit() {
      const mag = magRef.current
      if (!mag) return
      // Repli sans accéléromètre : gravité supposée le long de Z (équivalent
      // à l'ancien calcul atan2(x, y)).
      const gravity = accelRef.current ?? { x: 0, y: 0, z: 1 }
      const h = projectHorizontal(mag, gravity)

      // Angle brut (0° = Nord, sens horaire), convention inchangée.
      let raw = Math.atan2(h.x, h.y) * (180 / Math.PI)
      if (raw < 0) raw += 360
      raw = (360 - raw) % 360

      // Moyenne exponentielle circulaire : le delta est toujours ramené sur
      // [-180, 180[ pour traverser 0/360 dans le bon sens.
      const alpha = smoothingRef.current
      const filtered = filteredRef.current
      let next: number
      if (filtered === null) {
        next = raw
      } else {
        const delta = ((raw - filtered + 540) % 360) - 180
        next = (filtered + delta * alpha + 360) % 360
      }
      filteredRef.current = next

      // Émission entière uniquement si elle change : hystérésis ~1° gratuite
      // (le lissage fait déjà le gros du travail anti-bruit).
      const emitted = Math.round(next) % 360
      if (emitted !== lastEmittedRef.current) {
        lastEmittedRef.current = emitted
        setHeading(emitted)
      }
    }

    async function setupSensors() {
      try {
        // Garde locale (la réduction de type de la portée externe ne s'applique
        // pas à l'intérieur de la closure).
        if (!Magnetometer) return
        const available = await Magnetometer.isAvailableAsync()
        setIsAvailable(available)
        if (!available) return

        Magnetometer.setUpdateInterval(updateInterval)
        magSubscription = Magnetometer.addListener((data) => {
          if (data.x === undefined || data.y === undefined) return
          magRef.current = { x: data.x, y: data.y, z: data.z ?? 0 }
          computeAndEmit()
        })

        if (Accelerometer) {
          try {
            const accelAvailable = await Accelerometer.isAvailableAsync()
            if (accelAvailable) {
              Accelerometer.setUpdateInterval(updateInterval)
              accelSubscription = Accelerometer.addListener((data) => {
                if (data.x === undefined || data.y === undefined || data.z === undefined) return
                accelRef.current = { x: data.x, y: data.y, z: data.z }
              })
            }
          } catch {
            // Accéléromètre facultatif : repli sur le calcul sans compensation.
          }
        }
      } catch {
        setIsAvailable(false)
      }
    }

    setupSensors()

    return () => {
      magSubscription?.remove()
      accelSubscription?.remove()
      magRef.current = null
      accelRef.current = null
      filteredRef.current = null
      lastEmittedRef.current = null
    }
  }, [enabled, updateInterval])

  return { heading, isAvailable }
}
