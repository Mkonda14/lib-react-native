/**
 * Configuration et préréglages de la carte
 * ==========================================
 * Fournisseurs de tuiles prédéfinis + configs par défaut + icônes de marqueurs.
 *
 * Toutes les valeurs par défaut ici sont utilisées par MapView quand
 * une propriété de config n'est pas fournie explicitement.
 */

import type {
  TileLayerConfig,
  TileProvider,
  MapConfig,
  ClusterConfig,
  UserLocationConfig,
} from './types'

/* ------------------------------------------------------------------ *
 * Préréglages de couches de tuiles
 * ------------------------------------------------------------------ */

/**
 * Dictionnaire des 10 fournisseurs de tuiles prédéfinis.
 * Clé = identifiant du fournisseur (TileProvider), valeur = config de tuile.
 * Ces configs sont injectées dans le HTML de la WebView via le bridge.
 */
export const TILE_PROVIDERS: Record<TileProvider, TileLayerConfig> = {
  'osm-standard': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
    subdomains: 'abc',
  },
  'osm-hot': {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team',
    subdomains: 'abc',
  },
  'carto-light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
  },
  'carto-dark': {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
  },
  'carto-voyager': {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
  },
  'stamen-terrain': {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.jpg',
    maxZoom: 18,
    attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap contributors',
    subdomains: 'a-d',
  },
  'stamen-toner': {
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.jpg',
    maxZoom: 18,
    attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap contributors',
    subdomains: 'a-d',
  },
  'esri-satellite': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
  },
  'esri-streets': {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles © Esri — Source: Esri, DeLorme, NAVTEQ, USGS, NPS',
  },
  'opentopomap': {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution: '© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)',
    subdomains: 'abc',
  },
  custom: {
    url: '',
    maxZoom: 19,
    attribution: '',
  },
}

/* ------------------------------------------------------------------ *
 * Configurations par défaut
 * ------------------------------------------------------------------ */

/**
 * Configuration par défaut du clustering de marqueurs.
 * Utilisée quand `config.clustering = true` sans objet de config.
 */
export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  spiderfyOnMaxZoom: true,
  removeOutsideVisibleBounds: true,
  animateAddingMarkers: true,
  maxClusterRadius: 50,
}

/**
 * Configuration par défaut de la localisation de l'utilisateur.
 * Utilisée quand `config.userLocation = true` sans objet de config.
 */
export const DEFAULT_USER_LOCATION_CONFIG: UserLocationConfig = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 10000,
  watch: true,
  showAccuracy: true,
  markerColor: '#0A84FF',
  pulsate: true,
  followUser: false,
}

/**
 * Configuration par défaut de la carte.
 * Centrée sur Paris, zoom 13, tuiles OSM standards.
 * Toutes les propriétés non spécifiées dans `config` héritent de ces valeurs.
 */
export const DEFAULT_CONFIG: MapConfig = {
  center: { lat: 48.8566, lng: 2.3522 }, // Paris
  zoom: 13,
  minZoom: 1,
  maxZoom: 19,
  scrollWheelZoom: true,
  zoomControl: false, // On utilise nos propres contrôles personnalisés
  attributionControl: true,
  scaleControl: false,
  tileProvider: 'osm-standard',
  clustering: false,
  userLocation: false,
  compass: false,
  backgroundColor: '#E5E5E5',
  defaultMarkerStyle: {
    color: '#DC2626',
    size: 32,
  },
  theme: 'light',
}

/* ------------------------------------------------------------------ *
 * Préréglages d'icônes de marqueurs (chaînes HTML)
 * ------------------------------------------------------------------ */

/**
 * Interface d'un préréglage d'icône de marqueur.
 * Chaque préréglage génère du HTML SVG, une taille et un ancrage.
 */
export interface MarkerIconPreset {
  /** Nom identifiant le préréglage. */
  name: string
  /** Fonction générant le HTML de l'icône (couleur + taille optionnelles). */
  html: (color?: string, size?: number) => string
  /** Taille de l'icône en pixels. */
  size: (size?: number) => { width: number; height: number }
  /** Point d'ancrage de l'icône. */
  anchor: (size?: number) => { x: number; y: number }
}

/**
 * Préréglages d'icônes de marqueurs disponibles :
 *  - pin     : classique en forme de pin (rouge par défaut)
 *  - circle  : cercle moderne plat (indigo par défaut)
 *  - bubble  : goutte avec intérieur vide (vert par défaut)
 *  - square  : carré arrondi minimal (ambre par défaut)
 *  - pulse   : point pulsant pour les marqueurs importants (rouge)
 *  - star    : étoile pour les lieux en vedette (jaune doré)
 */
export const MARKER_PRESETS: Record<string, MarkerIconPreset> = {
  // Pin classique (rouge par défaut, couleur personnalisable)
  pin: {
    name: 'pin',
    html: (color = '#DC2626', size = 32) => `
      <div style="position: relative; width: ${size}px; height: ${size * 1.4}px;">
        <svg width="${size}" height="${size * 1.4}" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z"
                fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="5" fill="white"/>
        </svg>
      </div>
    `,
    size: (size = 32) => ({ width: size, height: size * 1.4 }),
    anchor: (size = 32) => ({ x: size / 2, y: size * 1.4 }),
  },

  // Marqueur circulaire (design plat moderne)
  circle: {
    name: 'circle',
    html: (color = '#6366F1', size = 28) => `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="3"/>
          <circle cx="14" cy="14" r="5" fill="white"/>
        </svg>
      </div>
    `,
    size: (size = 28) => ({ width: size, height: size }),
    anchor: (size = 28) => ({ x: size / 2, y: size / 2 }),
  },

  // Goutte avec intérieur vide (texte/icône possible)
  bubble: {
    name: 'bubble',
    html: (color = '#10B981', size = 36) => `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0C8.1 0 0 8.1 0 18c0 13.5 18 18 18 18s18-4.5 18-18c0-9.9-8.1-18-18-18z"
                fill="${color}" stroke="white" stroke-width="2.5"/>
        </svg>
      </div>
    `,
    size: (size = 36) => ({ width: size, height: size }),
    anchor: (size = 36) => ({ x: size / 2, y: size / 2 }),
  },

  // Pin carré (minimaliste moderne)
  square: {
    name: 'square',
    html: (color = '#F59E0B', size = 30) => `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <svg width="${size}" height="${size}" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="24" height="24" rx="4" fill="${color}" stroke="white" stroke-width="3"/>
          <circle cx="15" cy="15" r="5" fill="white"/>
        </svg>
      </div>
    `,
    size: (size = 30) => ({ width: size, height: size }),
    anchor: (size = 30) => ({ x: size / 2, y: size / 2 }),
  },

  // Point pulsant (pour les marqueurs mis en avant)
  pulse: {
    name: 'pulse',
    html: (color = '#DC2626', size = 24) => `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <style>
          @keyframes pulse-${color.replace('#', '')} {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
        </style>
        <div style="
          position: absolute; inset: 0;
          border-radius: 50%;
          background: ${color};
          animation: pulse-${color.replace('#', '')} 2s ease-out infinite;
        "></div>
        <div style="
          position: absolute; left: 25%; top: 25%;
          width: 50%; height: 50%;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
        "></div>
      </div>
    `,
    size: (size = 24) => ({ width: size, height: size }),
    anchor: (size = 24) => ({ x: size / 2, y: size / 2 }),
  },

  // Étoile (pour les lieux en vedette/favoris)
  star: {
    name: 'star',
    html: (color = '#FBBF24', size = 32) => `
      <div style="position: relative; width: ${size}px; height: ${size}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0L19.5 12.5L32 14L22 22L25 32L16 25L7 32L10 22L0 14L12.5 12.5Z"
                fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </div>
    `,
    size: (size = 32) => ({ width: size, height: size }),
    anchor: (size = 32) => ({ x: size / 2, y: size / 2 }),
  },
}

/**
 * Récupère le HTML d'un préréglage d'icône de marqueur.
 *
 * @param preset - Nom du préréglage ('pin', 'circle', 'bubble', 'square', 'pulse', 'star')
 * @param color  - Couleur de l'icône (couleur par défaut du préréglage si non fournie)
 * @param size   - Taille en pixels (taille par défaut du préréglage si non fournie)
 * @returns Chaîne HTML prête à injecter dans un marqueur Leaflet
 */
export function getMarkerIconHtml(
  preset: keyof typeof MARKER_PRESETS = 'pin',
  color?: string,
  size?: number
): string {
  return MARKER_PRESETS[preset].html(color, size)
}

/**
 * Génère une config de carte partielle selon le thème demandé.
 * Fournit le bon fournisseur de tuiles, la couleur de fond et le style
 * de marqueur par défaut pour le thème clair ou sombre.
 *
 * @param theme - 'light' ou 'dark'
 * @returns Config partielle à fusionner avec la config principale
 */
export function getThemedConfig(theme: 'light' | 'dark'): Partial<MapConfig> {
  return {
    theme,
    tileProvider: theme === 'dark' ? 'carto-dark' : 'carto-light',
    backgroundColor: theme === 'dark' ? '#1F2937' : '#E5E5E5',
    defaultMarkerStyle: {
      color: theme === 'dark' ? '#F87171' : '#DC2626',
      size: 32,
    },
  }
}
