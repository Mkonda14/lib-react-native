/**
 * useMarkers — gestion de l'état des marqueurs (ajout/suppression/mise à jour)
 * =============================================================================
 *
 *   const { markers, addMarker, updateMarker, removeMarker } = useMarkers()
 *
 *   addMarker({
 *     id: 'm1',
 *     position: { lat: 48.8566, lng: 2.3522 },
 *     data: { name: 'Paris' },
 *   })
 *
 * Retourne le tableau de marqueurs et des mutations qui préservent
 * l'unicité par id (un id existant est remplacé, pas dupliqué).
 */

import { useState, useCallback } from 'react'
import type { MarkerData } from '../types'

export function useMarkers(initial: MarkerData[] = []) {
  // État local : liste ordonnée de marqueurs
  const [markers, setMarkers] = useState<MarkerData[]>(initial)

  /**
   * Ajoute un marqueur. S'il existe déjà un marqueur avec le même id,
   * il est remplacé (évite les doublons).
   */
  const addMarker = useCallback((marker: MarkerData) => {
    setMarkers((prev) => {
      const filtered = prev.filter((m) => m.id !== marker.id)
      return [...filtered, marker]
    })
  }, [])

  /**
   * Ajoute plusieurs marqueurs en lot. Les ids déjà présents
   * dans la liste sont remplacés par les nouvelles valeurs.
   */
  const addMarkers = useCallback((newMarkers: MarkerData[]) => {
    setMarkers((prev) => {
      const newIds = new Set(newMarkers.map((m) => m.id))
      const filtered = prev.filter((m) => !newIds.has(m.id))
      return [...filtered, ...newMarkers]
    })
  }, [])

  /**
   * Met à jour un marqueur existant par id (fusion partielle).
   * Ne fait rien si l'id n'existe pas.
   */
  const updateMarker = useCallback((id: string, updates: Partial<MarkerData>) => {
    setMarkers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    )
  }, [])

  /** Supprime un marqueur par id (no-op si absent). */
  const removeMarker = useCallback((id: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id))
  }, [])

  /** Supprime tous les marqueurs. */
  const clearMarkers = useCallback(() => {
    setMarkers([])
  }, [])

  return {
    markers,
    addMarker,
    addMarkers,
    updateMarker,
    removeMarker,
    clearMarkers,
    setMarkers,
  }
}
