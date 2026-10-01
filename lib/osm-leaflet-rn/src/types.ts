/**
 * OSM Leaflet RN — Définitions de types
 * ========================================
 * Typage complet pour l'intégration OpenStreetMap + Leaflet dans React Native.
 *
 * Architecture :
 *   ┌─────────────────────┐         ┌──────────────────────┐
 *   │   React Native      │         │   WebView (Leaflet)   │
 *   │                     │         │                       │
 *   │  <MapView>          │  post   │   L.map()             │
 *   │   ├─ markers[]      │ ────→   │   L.tileLayer()       │
 *   │   ├─ polylines[]    │         │   L.marker()          │
 *   │   ├─ polygons[]     │         │   L.geoJSON()         │
 *   │   ├─ circles[]      │  on     │                       │
 *   │   └─ config         │ ←────   │   événements → RN     │
 *   │                     │ Message │                       │
 *   │  <BottomSheet>      │         │                       │
 *   └─────────────────────┘         └──────────────────────┘
 */

import type { ReactNode } from 'react'
import type { ViewStyle, StyleProp } from 'react-native'
import type { MarkerVariant } from './marker-variants'

/* ------------------------------------------------------------------ *
 * Primitives géographiques
 * ------------------------------------------------------------------ */

/** Coordonnée géographique en degrés décimaux. */
export interface LatLng {
  /** Latitude (Nord positif, Sud négatif). */
  lat: number
  /** Longitude (Est positif, Ouest négatif). */
  lng: number
}

/** Rectangle géographique défini par ses coins opposés. */
export interface LatLngBounds {
  /** Coin Nord-Est. */
  northEast: LatLng
  /** Coin Sud-Ouest. */
  southWest: LatLng
}

/**
 * Format bounding box compact : [sud, ouest, nord, est].
 * Utilisé pour les formats standards comme le WMS/BBOX.
 */
export type BoundingBox = [number, number, number, number]

/* ------------------------------------------------------------------ *
 * Marqueurs
 * ------------------------------------------------------------------ */

/**
 * Marqueur affichable sur la carte.
 * Chaque marqueur a un identifiant unique et peut porter des données
 * personnalisées (objets typés) retournées lors de l'appui.
 */
export interface MarkerData<T = unknown> {
  /** Identifiant unique du marqueur (obligatoire, sert de clé de cache). */
  id: string
  /** Position géographique du marqueur. */
  position: LatLng
  /**
   * Variante visuelle (anglais : 'pharmacy', 'hospital', 'hotel'…) :
   * génère automatiquement `iconHtml` / `iconSize` / `iconAnchor`
   * (couleur sémantique + pictogramme). Ignorée si `iconHtml` est fourni.
   */
  variant?: MarkerVariant
  /** Surcharge de la couleur du pin de la variante (hex). */
  iconColor?: string
  /** HTML personnalisé pour l'icône (remplace le pin par défaut). */
  iconHtml?: string
  /** Taille de l'icône en pixels. */
  iconSize?: { width: number; height: number }
  /** Point d'ancrage (par défaut : centre-bas). */
  iconAnchor?: { x: number; y: number }
  /** Contenu du popup (chaîne HTML). */
  popup?: string
  /** Ouvrir automatiquement le popup au chargement. */
  openPopup?: boolean
  /** Décalage du z-index (utile pour superposer des marqueurs). */
  zIndexOffset?: number
  /** Opacité de 0 à 1. */
  opacity?: number
  /** Rendre le marqueur glissable (drag & drop). */
  draggable?: boolean
  /** Données personnalisées attachées au marqueur, retournées à l'appui. */
  data?: T
  /** Masquer le marqueur sans le supprimer. */
  visible?: boolean
  /** Regrouper ce marqueur (uniquement si le clustering est activé). */
  cluster?: boolean
  /** Nom du calque personnalisé auquel appartient ce marqueur. */
  layer?: string
}

/**
 * Événement déclenché lors de l'appui sur un marqueur.
 * Contient l'identifiant, la position et les données personnalisées.
 */
export interface MarkerPressEvent<T = unknown> {
  /** Identifiant du marqueur appuyé. */
  markerId: string
  /** Position géographique du marqueur. */
  position: LatLng
  /** Données personnalisées attachées au marqueur. */
  data: T
  /** Détails de l'événement navigateur d'origine. */
  sourceEvent: {
    latlng: LatLng
    type: string
  }
}

/* ------------------------------------------------------------------ *
 * Formes géométriques (Polyligne, Polygone, Cercle, Rectangle)
 * ------------------------------------------------------------------ */

/** Polyligne — ligne reliant une série de points. */
export interface PolylineData {
  /** Identifiant unique. */
  id: string
  /** Liste des points de passage. */
  positions: LatLng[]
  /** Couleur de la ligne (CSS). */
  color?: string
  /** Épaisseur en pixels. */
  weight?: number
  /** Opacité de 0 à 1. */
  opacity?: number
  /** Motif en pointillés (ex : "5,10"). */
  dashArray?: string
  /** Forme des extrémités. */
  lineCap?: 'butt' | 'round' | 'square'
  /** Forme des jonctions entre segments. */
  lineJoin?: 'miter' | 'round' | 'bevel'
  /** Afficher des flèches de direction le long de la ligne. */
  arrows?: boolean
  /** Lissage de la courbe (facteur de Bézier). */
  smoothFactor?: number
  /** Rendre la ligne cliquable. */
  interactive?: boolean
  /** Calque personnalisé auquel appartient cette ligne. */
  layer?: string
}

/** Polygone — forme fermée avec support de trous (rings). */
export interface PolygonData {
  /** Identifiant unique. */
  id: string
  /** Contour extérieur seul, ou contour + trous (tableau de rings). */
  positions: LatLng[] | LatLng[][]
  /** Couleur du contour (CSS). */
  color?: string
  /** Couleur de remplissage (CSS). */
  fillColor?: string
  /** Opacité du remplissage de 0 à 1. */
  fillOpacity?: number
  /** Épaisseur du contour en pixels. */
  weight?: number
  /** Opacité du contour de 0 à 1. */
  opacity?: number
  /** Rendre le polygone cliquable. */
  interactive?: boolean
  /** Calque personnalisé. */
  layer?: string
}

/** Cercle géographique défini par un centre et un rayon en mètres. */
export interface CircleData {
  /** Identifiant unique. */
  id: string
  /** Centre géographique du cercle. */
  center: LatLng
  /** Rayon en mètres. */
  radius: number
  /** Couleur du contour (CSS). */
  color?: string
  /** Couleur de remplissage (CSS). */
  fillColor?: string
  /** Opacité du remplissage de 0 à 1. */
  fillOpacity?: number
  /** Épaisseur du contour en pixels. */
  weight?: number
  /** Opacité du contour de 0 à 1. */
  opacity?: number
  /** Rendre le cercle cliquable. */
  interactive?: boolean
  /** Calque personnalisé. */
  layer?: string
}

/** Rectangle défini par ses bornes géographiques. */
export interface RectangleData {
  /** Identifiant unique. */
  id: string
  /** Bornes du rectangle (coin NE + coin SO). */
  bounds: LatLngBounds
  /** Couleur du contour (CSS). */
  color?: string
  /** Couleur de remplissage (CSS). */
  fillColor?: string
  /** Opacité du remplissage de 0 à 1. */
  fillOpacity?: number
  /** Épaisseur du contour en pixels. */
  weight?: number
  /** Opacité du contour de 0 à 1. */
  opacity?: number
  /** Rendre le rectangle cliquable. */
  interactive?: boolean
  /** Calque personnalisé. */
  layer?: string
}

/* ------------------------------------------------------------------ *
 * Couches de tuiles (fournisseurs OSM)
 * ------------------------------------------------------------------ */

/**
 * Fournisseur de tuiles prédéfini.
 * Chaque entrée correspond à une config de tuile dans TILE_PROVIDERS.
 */
export type TileProvider =
  | 'osm-standard'
  | 'osm-hot'
  | 'esri-satellite'
  | 'esri-streets'
  | 'opentopomap'
  | 'custom'

/** Configuration d'une couche de tuiles. */
export interface TileLayerConfig {
  /** Modèle d'URL des tuiles avec variables {z}/{x}/{y} et {s} pour les sous-domaines. */
  url: string
  /** Zoom maximum disponible pour ce fournisseur. */
  maxZoom?: number
  /** Zoom minimum disponible. */
  minZoom?: number
  /** Sous-domaines pour équilibrer la charge (ex : "abc"). */
  subdomains?: string
  /** Texte d'attribution (requis par les conditions OSM). */
  attribution?: string
  /** Taille des tuiles en pixels (256 par défaut). */
  tileSize?: number
  /** Détecter les écrans Retina et charger les tuiles 2x. */
  detectRetina?: boolean
  /** Activer les requêtes cross-origin (CORS). */
  crossOrigin?: boolean
  /** Schéma TMS (axe Y inversé, utilisé par certains serveurs). */
  tms?: boolean
}

/* ------------------------------------------------------------------ *
 * Configuration de la carte
 * ------------------------------------------------------------------ */

/** Configuration complète d'une carte Leaflet. */
export interface MapConfig {
  /** Centre initial de la carte. */
  center: LatLng
  /** Niveau de zoom initial. */
  zoom: number
  /** Zoom minimum autorisé (contraint le dézoom). */
  minZoom?: number
  /** Zoom maximum autorisé (contraint le zoom). */
  maxZoom?: number
  /** Bornes maximales de déplacement (empêche de sortir de la zone). */
  maxBounds?: LatLngBounds
  /** Autoriser le zoom à la molette (souris uniquement). */
  scrollWheelZoom?: boolean
  /** Position du contrôle de zoom natif Leaflet (false pour le masquer — on utilise des contrôles custom). */
  zoomControl?: boolean | 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
  /** Afficher le texte d'attribution (© OpenStreetMap, etc.). */
  attributionControl?: boolean
  /** Afficher l'échelle de distance. */
  scaleControl?: boolean
  /** Fournisseur de tuiles par défaut. */
  tileProvider: TileProvider
  /** Configuration de tuile personnalisée (remplace le fournisseur). */
  tileLayer?: TileLayerConfig
  /** Couches additionnelles pour le sélecteur de couches. */
  overlayLayers?: {
    id: string
    name: string
    config: TileLayerConfig
    enabled?: boolean
  }[]
  /** Activer le regroupement des marqueurs (clustering). */
  clustering?: boolean | ClusterConfig
  /**
   * HTML custom des clusters — token `{count}` remplacé par le nombre de
   * marqueurs groupés (ex : `'<b>{count}</b>'`). Chaîne : contrairement à un
   * callback, elle traverse le bridge JSON jusqu'à la WebView.
   * Init-only (comme `clustering`) : changer après montage n'a aucun effet.
   */
  clusterIconHtml?: string
  /** Configuration de la position de l'utilisateur. */
  userLocation?: boolean | UserLocationConfig
  /** Afficher la boussole. */
  compass?: boolean
  /** Couleur de fond de la carte (avant le chargement des tuiles). */
  backgroundColor?: string
  /** Style par défaut des marqueurs (couleur, taille, icône). */
  defaultMarkerStyle?: {
    color?: string
    size?: number
    iconHtml?: string
  }
  /** Thème — affecte le style par défaut si aucun fournisseur n'est spécifié. */
  theme?: 'light' | 'dark'
}

/** Configuration du regroupement de marqueurs (clustering). */
export interface ClusterConfig {
  /** Afficher la zone couverte au survol d'un cluster. */
  showCoverageOnHover?: boolean
  /** Zoomer sur les bornes du cluster au clic. */
  zoomToBoundsOnClick?: boolean
  /** Éparpiller les marqueurs (spiderfy) au zoom maximum. */
  spiderfyOnMaxZoom?: boolean
  /** Supprimer les marqueurs hors des bornes visibles. */
  removeOutsideVisibleBounds?: boolean
  /** Animer l'ajout de marqueurs. */
  animateAddingMarkers?: boolean
  /** Désactiver le clustering au-delà de ce niveau de zoom. */
  disableClusteringAtZoom?: number
  /** Rayon maximum du cluster en pixels. */
  maxClusterRadius?: number
  /** Options des polylignes du spiderfy. */
  spiderLegPolylineOptions?: Record<string, unknown>
  /**
   * @deprecated Ne peut pas fonctionner (fonction non sérialisable dans le
   * bridge JSON) — utiliser `MapConfig.clusterIconHtml` (token `{count}`).
   */
  clusterIconBuilder?: (count: number) => string
}

/** Configuration de la localisation de l'utilisateur. */
export interface UserLocationConfig {
  /** Activer la haute précision GPS (consomme plus de batterie). */
  enableHighAccuracy?: boolean
  /** Âge maximum d'une position en millisecondes (position en cache, via getLastKnownPositionAsync). */
  maximumAge?: number
  /** Délai d'attente maximum en millisecondes (legacy WebView, ignoré par expo-location). */
  timeout?: number
  /**
   * Suivre la position en continu (watchPositionAsync via expo-location).
   * false = position unique (getCurrentPositionAsync).
   */
  watch?: boolean
  /** Afficher le cercle de précision. */
  showAccuracy?: boolean
  /** Couleur du marqueur utilisateur. */
  markerColor?: string
  /** Faire pulser le marqueur (animation). */
  pulsate?: boolean
  /** Suivre l'utilisateur (recentrer la carte à chaque déplacement). */
  followUser?: boolean
  /**
   * Position simulée (mode dev, sans GPS réel).
   * Sans valeur explicite, le mode dev injecte DEFAULT_LOCATION
   * ({ lat: -4.368708586536611, lng: 15.289138329917593 }).
   * En production, la position réelle vient de expo-location.
   */
  mockLocation?: LatLng
  /** Afficher le cône d'orientation/boussole magnétomètre (Google Maps style). Par défaut: true si userLocation est actif. */
  showHeading?: boolean
  /**
   * Cap simulé (uniquement avec mockLocation, mode dev) :
   * - 'auto' : rotation lente continue du cône (démo sans magnétomètre)
   * - number : angle fixe en degrés (0 = Nord)
   */
  mockHeading?: 'auto' | number
}

/* ------------------------------------------------------------------ *
 * Événements de la carte
 * ------------------------------------------------------------------ */

/** Événement de clic sur la carte. */
export interface MapClickEvent {
  /** Coordonnées géographiques du clic. */
  latlng: LatLng
  /** Coordonnées en pixels par rapport au conteneur de la carte. */
  containerPoint: { x: number; y: number }
  /** Coordonnées en pixels par rapport à la couche de la carte. */
  layerPoint: { x: number; y: number }
}

/** Événement de déplacement de la carte. */
export interface MapMoveEvent {
  /** Nouveau centre de la carte. */
  center: LatLng
  /** Niveau de zoom actuel. */
  zoom: number
  /** Bornes visibles après le déplacement. */
  bounds: LatLngBounds
}

/** Événement de zoom de la carte. */
export interface MapZoomEvent {
  /** Nouveau niveau de zoom. */
  zoom: number
  /** Centre après le zoom. */
  center: LatLng
  /** Bornes visibles après le zoom. */
  bounds: LatLngBounds
}

/* ------------------------------------------------------------------ *
 * Méthodes impératives de la carte (via ref)
 * ------------------------------------------------------------------ */

/**
 * Interface des méthodes impératives exposées par la ref de MapView.
 * Permet de piloter la carte programmatiquement : déplacements, zoom,
 * gestion des marqueurs et formes, changement de couche, etc.
 */
export interface MapRef {
  /** Se déplacer vers une position avec un zoom donné. */
  moveTo: (latlng: LatLng, zoom?: number, options?: { animate?: boolean; duration?: number }) => void
  /** Zoomer d'un cran. */
  zoomIn: (options?: { animate?: boolean }) => void
  /** Dézoomer d'un cran. */
  zoomOut: (options?: { animate?: boolean }) => void
  /** Définir un niveau de zoom précis. */
  setZoom: (zoom: number, options?: { animate?: boolean }) => void
  /** Ajuster la vue pour encadrer des bornes géographiques. */
  fitBounds: (bounds: LatLngBounds, options?: { padding?: number; maxZoom?: number; animate?: boolean }) => void
  /** Déplacer la carte vers une position (sans zoomer). */
  panTo: (latlng: LatLng, options?: { animate?: boolean; duration?: number }) => void
  /** Voler vers une position avec animation fluide. */
  flyTo: (latlng: LatLng, zoom?: number, options?: { duration?: number }) => void
  /** Voler vers des bornes avec animation fluide. */
  flyToBounds: (bounds: LatLngBounds, options?: { padding?: number; maxZoom?: number; duration?: number }) => void
  /** Recalculer la taille de la carte (après redimensionnement). */
  invalidateSize: () => void
  /** Obtenir le centre actuel (Promise). */
  getCenter: () => Promise<LatLng>
  /** Obtenir le zoom actuel (Promise). */
  getZoom: () => Promise<number>
  /** Obtenir les bornes visibles (Promise). */
  getBounds: () => Promise<LatLngBounds>
  /** Obtenir les bornes en pixels (Promise). */
  getPixelBounds: () => Promise<{ topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } }>
  /** Ajouter un marqueur à la carte. */
  addMarker: (marker: MarkerData) => void
  /** Ajouter plusieurs marqueurs en lot. */
  addMarkers: (markers: MarkerData[]) => void
  /** Mettre à jour un marqueur existant. */
  updateMarker: (id: string, updates: Partial<MarkerData>) => void
  /** Supprimer un marqueur par son identifiant. */
  removeMarker: (id: string) => void
  /** Supprimer tous les marqueurs. */
  clearMarkers: () => void
  /** Ajouter une polyligne. */
  addPolyline: (polyline: PolylineData) => void
  /** Supprimer une polyligne. */
  removePolyline: (id: string) => void
  /** Ajouter un polygone. */
  addPolygon: (polygon: PolygonData) => void
  /** Supprimer un polygone. */
  removePolygon: (id: string) => void
  /** Ajouter un cercle. */
  addCircle: (circle: CircleData) => void
  /** Supprimer un cercle. */
  removeCircle: (id: string) => void
  /** Ajouter un rectangle. */
  addRectangle: (rectangle: RectangleData) => void
  /** Supprimer un rectangle par son identifiant. */
  removeRectangle: (id: string) => void
  /** Ouvrir le popup d'un marqueur. */
  openPopup: (markerId: string) => void
  /** Fermer le popup ouvert. */
  closePopup: () => void
  /** Changer la couche de tuiles active. */
  setTileLayer: (provider: TileProvider | string) => void
  /** Activer/désactiver une couche de superposition. */
  toggleLayer: (layerId: string, enabled: boolean) => void
  /**
   * Localiser l'utilisateur : recentre sur la position connue (pastille déjà
   * affichée) ou, si `config.userLocation` est actif, démarre le suivi.
   * Sans `config.userLocation` : acquisition ponctuelle via expo-location
   * puis recentrage (échec → onError).
   */
  locate: () => void
  /** Définir manuellement l'orientation/cap (en degrés 0-360) sur le marqueur utilisateur. */
  setHeading: (heading: number | null) => void
  /** Arrêter le suivi de position (la pastille reste affichée). */
  stopLocate: () => void
  /** Forcer le redessin de la carte (après resize). */
  redraw: () => void
  /** Supprimer tous les éléments (marqueurs, formes, etc.). */
  clearAll: () => void
}

/* ------------------------------------------------------------------ *
 * Props du composant MapView
 * ------------------------------------------------------------------ */

/** Props du composant MapView. */
export interface MapViewProps {
  /** Configuration de la carte (centre, zoom, tuiles, etc.). */
  config: MapConfig
  /** Marqueurs à afficher. */
  markers?: MarkerData[]
  /** Polylignes à afficher. */
  polylines?: PolylineData[]
  /** Polygones à afficher. */
  polygons?: PolygonData[]
  /** Cercles à afficher. */
  circles?: CircleData[]
  /** Rectangles à afficher. */
  rectangles?: RectangleData[]
  /** Style du conteneur. */
  style?: StyleProp<ViewStyle>
  /** Classe NativeWind. */
  className?: string
  /** Test ID pour les tests automatisés. */
  testID?: string

  /* ---------------- Événements ---------------- */

  /** Appelé quand la carte est prête. */
  onMapReady?: () => void
  /** Appelé quand la carte est cliquée. */
  onMapClick?: (e: MapClickEvent) => void
  /** Appelé quand la carte fait l'objet d'un appui long. */
  onMapLongPress?: (e: MapClickEvent) => void
  /** Appelé quand la carte est déplacée. */
  onMapMove?: (e: MapMoveEvent) => void
  /** Appelé quand la carte est zoomée. */
  onMapZoom?: (e: MapZoomEvent) => void
  /** Appelé quand un marqueur est pressé. */
  onMarkerPress?: <T = unknown>(e: MarkerPressEvent<T>) => void
  /** Appelé quand un marqueur est déplacé (drag). */
  onMarkerDrag?: (markerId: string, position: LatLng) => void
  /** Appelé quand la position de l'utilisateur est mise à jour. `heading` = cap en degrés (0 = Nord) si disponible. */
  onUserLocationChange?: (location: LatLng, accuracy: number, heading?: number | null) => void
  /** Appelé quand la couche de tuiles est changée. */
  onTileLayerChange?: (provider: TileProvider | string) => void
  /** Appelé quand une erreur survient. */
  onError?: (error: Error) => void

  /* ---------------- Renderers personnalisés ---------------- */

  /** Rendu personnalisé du marqueur (HTML) — remplace le pin par défaut. */
  renderMarker?: (marker: MarkerData) => string
  /** Rendu personnalisé du contenu de la bottom sheet pour un marqueur. */
  renderMarkerDetail?: (marker: MarkerData) => ReactNode
  /**
   * @deprecated Ne peut pas fonctionner (callback RN non sérialisable dans
   * le bridge JSON) — utiliser `MapConfig.clusterIconHtml` (token `{count}`).
   */
  renderClusterIcon?: (count: number) => string
  /** Rendu personnalisé d'un callout (bulle au-dessus d'un marqueur). */
  renderCallout?: (marker: MarkerData) => ReactNode
  /** Rendu de contrôles de carte personnalisés (overlay). */
  renderControls?: () => ReactNode

  /* ---------------- Comportement ---------------- */

  /** Ajuster automatiquement les bornes sur les marqueurs au chargement. */
  fitToMarkers?: boolean
  /** Afficher la bottom sheet au clic sur un marqueur (true par défaut). */
  showBottomSheetOnPress?: boolean
  /** Région initiale visible (remplace centre/zoom). */
  initialBounds?: LatLngBounds
  /** Rendre la carte interactive (déplacement, zoom). */
  interactive?: boolean
}

/* ------------------------------------------------------------------ *
 * Bottom sheet (modale de détails de marqueur)
 * ------------------------------------------------------------------ */

/** Props du composant BottomSheet. */
export interface BottomSheetProps {
  /** Marqueur affiché (null = masqué). */
  marker: MarkerData | null
  /** Rendu personnalisé du contenu. */
  renderContent?: (marker: MarkerData) => ReactNode
  /** Appelé quand la sheet est fermée. */
  onClose?: () => void
  /** Points d'ancrage en pixels (positions de snapping). */
  snapPoints?: number[]
  /** Index du snap initial. */
  initialSnapIndex?: number
  /** Style. */
  style?: StyleProp<ViewStyle>
  /** Durée d'animation en millisecondes. */
  animationDuration?: number
  /** Opacité du fond flouté. */
  backdropOpacity?: number
  /** Fermer en tapotant le fond. */
  dismissOnBackdrop?: boolean
  /** Afficher la poignée de glissement. */
  showHandle?: boolean
  /** Poignée personnalisée. */
  renderHandle?: () => ReactNode
}

/* ------------------------------------------------------------------ *
 * Popover « Type de carte » (sélecteur de fond de carte)
 * ------------------------------------------------------------------ */

/** Props du composant LayerPickerPopover (grille 3 colonnes). */
export interface LayerPickerPopoverProps {
  /** Popover affiché (animé à l'ouverture/fermeture). */
  visible: boolean
  /** Identifiant de la couche actuellement sélectionnée. */
  activeProvider?: string
  /** Liste des couches affichées (défaut : tous les providers hors « custom »). */
  providers?: string[]
  /** Appelé quand l'utilisateur choisit une couche. */
  onSelect?: (provider: string) => void
  /** Mode sombre. */
  isDark?: boolean
  /** Sens d'ouverture : vers le haut (popover au-dessus des boutons) ou vers le bas. */
  direction?: 'top' | 'bottom'
  /** Titre de l'en-tête (défaut : « Type de carte »). */
  title?: string
  /** Style d'ancrage du panneau (géré par le parent). */
  style?: StyleProp<ViewStyle>
}

/* ------------------------------------------------------------------ *
 * Protocole du pont de communication
 * ------------------------------------------------------------------ */

/**
 * Types de messages échangés entre React Native et la WebView.
 * Chaque message a une structure { type, payload?, id?, timestamp? }.
 */
export type BridgeMessageType =
  | 'ready'           // WebView → RN : carte prête
  | 'webview-ready'   // WebView → RN : JS initialisé et en écoute
  | 'init'            // RN → WebView : initialiser la carte avec la config
  | 'event'           // WebView → RN : événement de carte (clic, déplacement, zoom)
  | 'marker-press'    // WebView → RN : marqueur pressé
  | 'marker-drag'     // WebView → RN : marqueur déplacé (drag)
  | 'user-location'   // WebView → RN : mise à jour de position utilisateur
  | 'method'          // RN → WebView : appel de méthode (moveTo, setZoom, etc.)
  | 'method-result'   // WebView → RN : résultat d'un appel de méthode
  | 'error'           // WebView → RN : erreur
  | 'log'             // WebView → RN : log console
  | 'state'           // WebView → RN : changement d'état

/** Message échangé via le pont RN ↔ WebView. */
export interface BridgeMessage<T = unknown> {
  /** Type du message. */
  type: BridgeMessageType
  /** Identifiant de corrélation (pour les appels de méthode). */
  id?: string
  /** Données du message. */
  payload?: T
  /** Horodatage. */
  timestamp?: number
}

/** Appel de méthode en attente de résolution. */
export interface MethodCall<T = unknown> {
  /** Identifiant unique de l'appel. */
  id: string
  /** Nom de la méthode à appeler. */
  method: string
  /** Arguments de la méthode. */
  args?: unknown[]
  /** Callback de résolution (appelé quand la méthode renvoie un résultat). */
  resolve?: (value: T) => void
  /** Callback de rejet (appelé si la méthode échoue). */
  reject?: (error: Error) => void
}
