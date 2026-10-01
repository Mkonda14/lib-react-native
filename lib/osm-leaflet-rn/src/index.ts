/**
 * @your-org/osm-leaflet-rn — API publique
 * ==========================================
 *
 * Intégration OpenStreetMap + Leaflet pour React Native.
 *
 * Fonctionnalités :
 *  - Leaflet basé sur WebView (aucun module natif requis)
 *  - Marqueurs personnalisés (icônes HTML/SVG, préréglages)
 *  - Regroupement de marqueurs (Leaflet.markercluster)
 *  - Bottom sheet pour les détails de marqueur (glissable, animé)
 *  - Contrôles de carte (zoom, géolocalisation, changement de couche)
 *  - Polylignes, polygones, cercles, rectangles
 *  - Position de l'utilisateur avec marqueur pulsant
 *  - Événements (clic, déplacement, zoom, appui marqueur, glisser)
 *  - Méthodes impératives via ref (moveTo, fitBounds, flyTo, etc.)
 *  - 10 fournisseurs de tuiles prédéfinis (OSM, Carto, Esri, Stamen)
 *  - Thème sombre/clair
 *
 * Utilisation rapide :
 *
 *   import { MapView, MapControls, useMap } from '@your-org/osm-leaflet-rn'
 *
 *   function App() {
 *     const map = useMap()
 *     return (
 *       <MapView
 *         ref={map.ref}
 *         config={{
 *           center: { lat: 48.8566, lng: 2.3522 },
 *           zoom: 13,
 *           tileProvider: 'osm-standard',
 *         }}
 *         markers={[
 *           { id: 'paris', position: { lat: 48.8566, lng: 2.3522 }, data: { name: 'Paris' } },
 *         ]}
 *         onMarkerPress={(e) => console.log(e.data)}
 *         renderControls={() => <MapControls mapRef={map.ref} />}
 *         renderMarkerDetail={(marker) => (
 *           <View><Text>{marker.data.name}</Text></View>
 *         )}
 *       />
 *     )
 *   }
 */

// Composant principal — la carte Leaflet dans une WebView
export { MapView } from './map-view'

// BottomSheet — modal glissable pour les détails (exporté aussi pour usage seul)
// LayerPickerPopover — sélecteur de fond de carte en grille 3 colonnes
export { BottomSheet, LayerPickerPopover } from './bottom-sheet'

// Contrôles de carte + barre de recherche Google
export { MapControls } from './components/map-controls'
export { GoogleSearchBar, GOOGLE_CATEGORIES } from './components/google-search-bar'
export type {
  CategoryChip,
  GoogleSearchBarProps,
  GoogleSearchBarFocusContext,
} from './components/google-search-bar'

// Configuration + préréglages (fournisseurs de tuiles, icônes de marqueurs)
export {
  TILE_PROVIDERS,
  DEFAULT_CONFIG,
  DEFAULT_CLUSTER_CONFIG,
  DEFAULT_USER_LOCATION_CONFIG,
  DEFAULT_LOCATION,
  MARKER_PRESETS,
  getMarkerIconHtml,
  getThemedConfig,
} from './config'

// Variantes de marqueurs (icônes POI par catégorie : pharmacy, hospital…)
export { MARKER_VARIANTS, getVariantIconHtml, resolveMarkerVariant } from './marker-variants'
export type { MarkerVariant, MarkerVariantDef } from './marker-variants'

// Hooks React pour interagir avec la carte
export { useMap } from './hooks/use-map'
export { useMapEvents } from './hooks/use-map-events'
export { useMarkers } from './hooks/use-markers'
export { useHeading } from './hooks/use-heading'
export type { UseHeadingOptions, UseHeadingResult } from './hooks/use-heading'
export { useUserLocation, getFixOnce } from './hooks/use-user-location'
export type {
  UseUserLocationOptions,
  UseUserLocationResult,
  UserLocationFix,
} from './hooks/use-user-location'

// Utilitaires géographiques purs (distance, bounds, polylines, etc.)
export {
  distance,
  distanceKm,
  boundsFromPoints,
  boundsToArray,
  boundsFromArray,
  isPointInBounds,
  centroid,
  polylineLength,
  isPointInPolygon,
  boundingCircleRadius,
  decodePolyline,
  formatDistance,
  formatLatLng,
  toRad,
  toDeg,
  bearing,
  interpolate,
  destinationPoint,
} from './utils/geo'

// Pont de communication RN ↔ WebView (pour les usages avancés)
export { MapBridge } from './bridge'

// Types TypeScript
export type {
  LatLng,
  LatLngBounds,
  BoundingBox,
  MarkerData,
  MarkerPressEvent,
  PolylineData,
  PolygonData,
  CircleData,
  RectangleData,
  TileProvider,
  TileLayerConfig,
  MapConfig,
  ClusterConfig,
  UserLocationConfig,
  MapClickEvent,
  MapMoveEvent,
  MapZoomEvent,
  MapRef,
  MapViewProps,
  BottomSheetProps,
  LayerPickerPopoverProps,
  BridgeMessage,
  BridgeMessageType,
  MethodCall,
} from './types'
