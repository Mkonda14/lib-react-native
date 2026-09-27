/**
 * useMap — hook de convenance pour utiliser une ref MapView
 * ==========================================================
 *
 * Expose la ref et un sous-ensemble des méthodes impératives
 * les plus courantes, déjà wrappées dans des useCallback stables :
 *
 *   const map = useMap()
 *   map.moveTo({ lat: 48.8566, lng: 2.3522 }, 14)
 *   map.zoomIn()
 *
 * À passer en ref au <MapView> :
 *   <MapView ref={map.ref} ... />
 */

import { useRef, useCallback } from 'react'
import type { MapRef, LatLng, LatLngBounds } from '../types'

export function useMap() {
  // Ref vers la MapView (React.useImperativeHandle)
  const ref = useRef<MapRef>(null)

  /**
   * Déplace la carte vers un centre / zoom donnés.
   */
  const moveTo = useCallback(
    (latlng: LatLng, zoom?: number, options?: { animate?: boolean; duration?: number }) =>
      ref.current?.moveTo(latlng, zoom, options),
    []
  )

  /** Zoom d'un cran vers l'avant. */
  const zoomIn = useCallback(
    () => ref.current?.zoomIn({ animate: true }),
    []
  )

  /** Zoom d'un cran en arrière. */
  const zoomOut = useCallback(
    () => ref.current?.zoomOut({ animate: true }),
    []
  )

  /** Animation fluide (fly) vers un centre / zoom donné. */
  const flyTo = useCallback(
    (latlng: LatLng, zoom?: number, options?: { duration?: number }) =>
      ref.current?.flyTo(latlng, zoom, options),
    []
  )

  /** Ajuste le viewport pour afficher toutes les bornes données. */
  const fitBounds = useCallback(
    (bounds: LatLngBounds, options?: { padding?: number; maxZoom?: number; animate?: boolean }) =>
      ref.current?.fitBounds(bounds, options),
    []
  )

  /** Lance la géolocalisation de l'utilisateur. */
  const locate = useCallback(() => ref.current?.locate(), [])

  /** Supprime tous les éléments dessinés (marqueurs, polylignes, etc.). */
  const clearAll = useCallback(() => ref.current?.clearAll(), [])

  return {
    ref,
    moveTo,
    zoomIn,
    zoomOut,
    flyTo,
    fitBounds,
    locate,
    clearAll,
  }
}
