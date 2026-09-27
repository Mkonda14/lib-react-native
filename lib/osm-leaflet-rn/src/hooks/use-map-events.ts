/**
 * useMapEvents — souscription déclarative aux événements de carte
 * ================================================================
 *
 *   useMapEvents(mapRef, {
 *     onMapClick: (e) => console.log(e.latlng),
 *     onMapMove: (e) => console.log(e.center, e.zoom),
 *     onMarkerPress: (e) => console.log(e.markerId, e.data),
 *   })
 *
 * État actuel : placeholder. MapView accepte déjà ces callbacks
 * directement en props. Ce hook existe pour une extension future
 * (ex : lier les événements à un contexte de carte global).
 */

import { useEffect } from "react";
import type {
  MapRef,
  MapClickEvent,
  MapMoveEvent,
  MapZoomEvent,
  MarkerPressEvent,
  LatLng,
} from "../types";

/** Options d'événements supportées par le hook. */
interface UseMapEventsOptions {
  onMapReady?: () => void;
  onMapClick?: (e: MapClickEvent) => void;
  onMapMove?: (e: MapMoveEvent) => void;
  onMapZoom?: (e: MapZoomEvent) => void;
  onMarkerPress?: (e: MarkerPressEvent) => void;
  onMarkerDrag?: (markerId: string, position: LatLng) => void;
  onUserLocationChange?: (location: LatLng, accuracy: number) => void;
}

export function useMapEvents(
  _mapRef: React.RefObject<MapRef>,
  _options: UseMapEventsOptions,
) {
  // Placeholder — aucun effet pour l'instant. Passer les événements
  // directement à <MapView> :
  //
  //   <MapView
  //     ref={mapRef}
  //     onMapClick={options.onMapClick}
  //     onMapMove={options.onMapMove}
  //     onMarkerPress={options.onMarkerPress}
  //   />
  //
  useEffect(() => {
    // Pas d'opération pour le moment
  }, []);
}
