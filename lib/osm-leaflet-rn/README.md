# @your-org/osm-leaflet-rn

> Carte OpenStreetMap + Leaflet pour React Native — basée sur WebView, ultra-personnalisable, avec clustering, bottom sheet, et 10 providers de tuiles.

## Pourquoi WebView ?

Leaflet est une lib JS qui s'exécute dans un navigateur. Pour React Native, l'approche la plus fiable et performante est d'embarquer Leaflet dans un `WebView` et de faire communiquer RN ↔ WebView via `postMessage`. Cela donne accès à **toutes les fonctionnalités de Leaflet** (plugins, geoJSON, markers custom HTML, clustering) sans module natif.

## Fonctionnalités

- ✅ **OpenStreetMap** + 9 autres providers (Carto, Esri, Stamen, OpenTopoMap)
- ✅ **Markers custom** : HTML/SVG inline, 6 presets (pin, circle, bubble, square, pulse, star)
- ✅ **Marker clustering** automatique (Leaflet.markercluster)
- ✅ **Bottom sheet** swipeable avec snap points + animations spring
- ✅ **Map controls** : zoom in/out, locate, layer switcher
- ✅ **User location** avec marker pulsant + cercle de précision
- ✅ **Polylines, Polygones, Cercles, Rectangles**
- ✅ **Événements** : click map, marker press, marker drag, move, zoom
- ✅ **Méthodes impératives** : `moveTo`, `flyTo`, `fitBounds`, `setZoom`, etc.
- ✅ **Custom callbacks** : `onMarkerPress`, `onMapClick`, `onMapMove`, etc.
- ✅ **Modal détails marker** : data attachée au marker passée au callback
- ✅ **Thème dark/light** automatique
- ✅ **Haptic feedback** au snap du bottom sheet
- ✅ **0 module natif** (juste `react-native-webview`)

## Installation

```bash
npm install react-native-webview react-native-reanimated react-native-gesture-handler expo-haptics
```

Wrappez votre app :

```tsx
// App.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Main />
    </GestureHandlerRootView>
  )
}
```

## Démarrage rapide

```tsx
import { MapView, MapControls, useMap, MarkerData } from '@your-org/osm-leaflet-rn'

interface Place {
  name: string
  description: string
  rating: number
}

export function MapScreen() {
  const map = useMap()

  const markers: MarkerData<Place>[] = [
    {
      id: 'paris',
      position: { lat: 48.8566, lng: 2.3522 },
      data: {
        name: 'Paris',
        description: 'La ville lumière',
        rating: 4.8,
      },
    },
    {
      id: 'lyon',
      position: { lat: 45.7640, lng: 4.8357 },
      data: {
        name: 'Lyon',
        description: 'Capitale de la gastronomie',
        rating: 4.6,
      },
    },
  ]

  return (
    <View style={{ flex: 1 }}>
      <MapView<Place>
        config={{
          center: { lat: 47.0, lng: 2.5 },
          zoom: 6,
          tileProvider: 'carto-voyager',
          clustering: true,
        }}
        markers={markers}
        onMarkerPress={(e) => {
          console.log(`Marker ${e.markerId} pressed`)
          console.log(`Data:`, e.data) // typed as Place
        }}
        renderControls={() => <MapControls mapRef={map.ref} />}
        renderMarkerDetail={(marker) => (
          <View style={{ padding: 24 }}>
            <Text style={{ fontSize: 24, fontWeight: '700' }}>
              {marker.data.name}
            </Text>
            <Text style={{ color: '#71717A' }}>
              {marker.data.description}
            </Text>
            <Text>⭐ {marker.data.rating}/5</Text>
          </View>
        )}
      />
    </View>
  )
}
```

## API complète

### `<MapView>` props

| Prop | Type | Description |
|------|------|-------------|
| `config` | `MapConfig` | Configuration de la carte |
| `markers` | `MarkerData[]` | Liste des markers |
| `polylines` | `PolylineData[]` | Liste des polylignes |
| `polygons` | `PolygonData[]` | Liste des polygones |
| `circles` | `CircleData[]` | Liste des cercles |
| `rectangles` | `RectangleData[]` | Liste des rectangles |
| `onMapReady` | `() => void` | Carte prête |
| `onMapClick` | `(e: MapClickEvent) => void` | Click sur la carte |
| `onMapMove` | `(e: MapMoveEvent) => void` | Carte déplacée |
| `onMapZoom` | `(e: MapZoomEvent) => void` | Zoom changé |
| `onMarkerPress` | `(e: MarkerPressEvent) => void` | Marker pressé |
| `onMarkerDrag` | `(id, position) => void` | Marker draggé |
| `onUserLocationChange` | `(location, accuracy) => void` | Position user |
| `onTileLayerChange` | `(provider) => void` | Layer changé |
| `onError` | `(error) => void` | Erreur |
| `renderMarkerDetail` | `(marker) => ReactNode` | Contenu du bottom sheet |
| `renderControls` | `() => ReactNode` | Contrôles custom |
| `fitToMarkers` | `boolean` | Auto-fit aux markers |
| `showBottomSheetOnPress` | `boolean` | Ouvrir bottom sheet au press (default `true`) |

### `MapConfig`

```typescript
interface MapConfig {
  center: LatLng           // { lat, lng }
  zoom: number              // initial zoom
  minZoom?: number
  maxZoom?: number
  maxBounds?: LatLngBounds // contrainte de déplacement
  scrollWheelZoom?: boolean
  zoomControl?: boolean | 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
  tileProvider: TileProvider
  tileLayer?: TileLayerConfig          // custom tile (override provider)
  overlayLayers?: Array<{
    id: string
    name: string
    config: TileLayerConfig
    enabled?: boolean
  }>
  clustering?: boolean | ClusterConfig
  userLocation?: boolean | UserLocationConfig
  theme?: 'light' | 'dark'
  backgroundColor?: string
  defaultMarkerStyle?: {
    color?: string
    size?: number
    iconHtml?: string
  }
}
```

### `MarkerData<T>`

```typescript
interface MarkerData<T = unknown> {
  id: string
  position: LatLng
  iconHtml?: string          // HTML custom pour l'icône
  iconSize?: { width, height }
  iconAnchor?: { x, y }      // point d'ancrage (default: bottom-center)
  popup?: string             // HTML du popup
  openPopup?: boolean
  zIndexOffset?: number
  opacity?: number
  draggable?: boolean
  cluster?: boolean          // inclure dans le clustering
  layer?: string             // nom du layer
  visible?: boolean
  data?: T                   // données custom passées au callback onMarkerPress
}
```

### Providers de tuiles

| Provider | Description | URL |
|----------|-------------|-----|
| `osm-standard` | OpenStreetMap standard | tile.openstreetmap.org |
| `osm-hot` | Humanitarian OSM (style HOT) | tile.openstreetmap.fr/hot |
| `carto-light` | Carto Light (minimal) | basemaps.cartocdn.com/light_all |
| `carto-dark` | Carto Dark | basemaps.cartocdn.com/dark_all |
| `carto-voyager` | Carto Voyager (coloré) | basemaps.cartocdn.com/rastertiles/voyager |
| `stamen-terrain` | Stamen Terrain (relief) | tiles.stadiamaps.com/stamen_terrain |
| `stamen-toner` | Stamen Toner (NB) | tiles.stadiamaps.com/stamen_toner |
| `esri-satellite` | Esri Satellite (imagerie) | server.arcgisonline.com/World_Imagery |
| `esri-streets` | Esri Streets | server.arcgisonline.com/World_Street_Map |
| `opentopomap` | OpenTopoMap (topographique) | tile.opentopomap.org |
| `custom` | Vos tuiles (avec `tileLayer`) | — |

### Méthodes impératives (via ref)

```typescript
const map = useMap()

// Déplacement
map.moveTo({ lat: 48.8566, lng: 2.3522 }, 14)
map.flyTo({ lat: 48.8566, lng: 2.3522 }, 14, { duration: 2 })
map.panTo({ lat: 48.8566, lng: 2.3522 })
map.fitBounds(bounds, { padding: 60, maxZoom: 17 })

// Zoom
map.zoomIn()
map.zoomOut()

// Markers
map.ref.current?.addMarker(marker)
map.ref.current?.updateMarker(id, updates)
map.ref.current?.removeMarker(id)
map.ref.current?.clearMarkers()

// User location
map.locate()

// Tile layer
map.ref.current?.setTileLayer('carto-dark')
map.ref.current?.toggleLayer('overlay1', true)

// Info
const center = await map.ref.current?.getCenter()
const zoom = await map.ref.current?.getZoom()
const bounds = await map.ref.current?.getBounds()

// Cleanup
map.clearAll()
```

## Markers custom

### Utiliser un preset

```tsx
import { MARKER_PRESETS, MarkerData } from '@your-org/osm-leaflet-rn'

const markers: MarkerData[] = [
  {
    id: 'm1',
    position: { lat: 48.8566, lng: 2.3522 },
    iconHtml: MARKER_PRESETS.pin.html('#10B981', 36),
    iconSize: MARKER_PRESETS.pin.size(36),
    iconAnchor: MARKER_PRESETS.pin.anchor(36),
    data: { name: 'Paris' },
  },
  {
    id: 'm2',
    position: { lat: 45.7640, lng: 4.8357 },
    iconHtml: MARKER_PRESETS.pulse.html('#DC2626', 24),
    iconSize: MARKER_PRESETS.pulse.size(24),
    iconAnchor: MARKER_PRESETS.pulse.anchor(24),
    data: { name: 'Lyon', featured: true },
  },
]
```

### HTML custom

```tsx
const marker: MarkerData = {
  id: 'custom',
  position: { lat: 48.8566, lng: 2.3522 },
  iconHtml: `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; padding: 8px 12px; border-radius: 8px;
                font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
      Paris
    </div>
  `,
  iconSize: { width: 80, height: 32 },
  iconAnchor: { x: 40, y: 16 },
  data: { name: 'Paris' },
}
```

## Bottom Sheet

Le bottom sheet apparaît automatiquement quand on clique sur un marker (si `renderMarkerDetail` est fourni). Il est swipeable avec 3 snap points (25%, 55%, 90% de l'écran).

```tsx
<MapView
  renderMarkerDetail={(marker) => (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>
        {marker.data.name}
      </Text>
      <Text>{marker.data.description}</Text>
      <Image source={{ uri: marker.data.image }} />
      <Pressable onPress={() => navigateToDetail(marker.id)}>
        <Text>Voir les détails</Text>
      </Pressable>
    </View>
  )}
/>
```

### BottomSheet standalone

```tsx
import { BottomSheet } from '@your-org/osm-leaflet-rn'

<BottomSheet
  marker={selectedMarker}
  renderContent={(marker) => <MyDetail marker={marker} />}
  onClose={() => setSelectedMarker(null)}
  snapPoints={[200, 400, 600]}
  dismissOnBackdrop
  showHandle
/>
```

## Clustering

```tsx
<MapView
  config={{
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 12,
    tileProvider: 'carto-light',
    clustering: {
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
    },
  }}
  markers={hundredsOfMarkers}
/>
```

## User Location

```tsx
<MapView
  config={{
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 13,
    tileProvider: 'carto-light',
    userLocation: {
      enableHighAccuracy: true,
      watch: true,
      showAccuracy: true,
      pulsate: true,
      followUser: false,
      markerColor: '#0A84FF',
    },
  }}
  onUserLocationChange={(location, accuracy) => {
    console.log(`User at ${location.lat}, ${location.lng} (±${accuracy}m)`)
  }}
/>
```

## Polylines, Polygons, Cercles

```tsx
<MapView
  polylines={[
    {
      id: 'route1',
      positions: [
        { lat: 48.8566, lng: 2.3522 },
        { lat: 48.8606, lng: 2.3376 },
        { lat: 48.8534, lng: 2.3488 },
      ],
      color: '#6366F1',
      weight: 4,
      opacity: 0.8,
      dashArray: '5, 10',
    },
  ]}
  polygons={[
    {
      id: 'zone1',
      positions: [
        { lat: 48.86, lng: 2.35 },
        { lat: 48.87, lng: 2.35 },
        { lat: 48.87, lng: 2.36 },
        { lat: 48.86, lng: 2.36 },
      ],
      color: '#EF4444',
      fillColor: '#EF4444',
      fillOpacity: 0.2,
    },
  ]}
  circles={[
    {
      id: 'radius1',
      center: { lat: 48.8566, lng: 2.3522 },
      radius: 500, // meters
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 0.1,
    },
  ]}
/>
```

## Geo utilities

```typescript
import {
  distance,
  formatDistance,
  boundsFromPoints,
  centroid,
  decodePolyline,
  bearing,
  isPointInPolygon,
} from '@your-org/osm-leaflet-rn'

// Distance entre 2 points (Haversine, en mètres)
const d = distance(
  { lat: 48.8566, lng: 2.3522 },
  { lat: 45.7640, lng: 4.8357 }
)
console.log(formatDistance(d)) // "392 km"

// Bounds depuis une liste de points
const bounds = boundsFromPoints(markers.map(m => m.position))

// Centroid
const center = centroid(points)

// Decode polyline Google
const points = decodePolyline('encoded_string')

// Bearing (direction)
const angle = bearing(from, to) // 0-360 degrés
```

## Performance

- **WebView dédiée** : la carte tourne dans son propre thread, pas de jank sur le thread JS RN
- **Clustering** : regroupe les markers proches pour éviter d'en rendre des centaines
- **Diff updates** : seuls les markers ajoutés/modifiés/supprimés sont envoyés au WebView
- **Will-change transforms** : CSS optimisé pour la fluidité des animations
- **Method-call batching** : les appels impératifs sont dedupés et timed

## Recettes

### 1. Carte avec recherche + sélection de marker

```tsx
function MapWithSearch() {
  const [markers, setMarkers] = useState([])
  const [selected, setSelected] = useState(null)
  const map = useMap()

  const handleSearch = async (query) => {
    const results = await searchPlaces(query)
    setMarkers(results.map(r => ({
      id: r.id,
      position: r.position,
      data: r,
    })))
    if (results.length > 0) {
      map.fitBounds(boundsFromPoints(results.map(r => r.position)))
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <SearchBar onSearch={handleSearch} />
      <MapView
        ref={map.ref}
        markers={markers}
        onMarkerPress={(e) => setSelected(e.data)}
        renderMarkerDetail={(marker) => (
          <PlaceDetail place={marker.data} onClose={() => setSelected(null)} />
        )}
        renderControls={() => <MapControls mapRef={map.ref} />}
      />
    </View>
  )
}
```

### 2. Tracker GPS en temps réel

```tsx
function GpsTracker() {
  const [positions, setPositions] = useState([])
  const map = useMap()

  useEffect(() => {
    const unsubscribe = watchPosition((pos) => {
      setPositions(prev => [...prev, pos])
      map.moveTo(pos, undefined, { animate: true })
    })
    return unsubscribe
  }, [])

  return (
    <MapView
      ref={map.ref}
      polylines={[{
        id: 'track',
        positions,
        color: '#0A84FF',
        weight: 5,
      }]}
      config={{
        center: positions[0] ?? { lat: 0, lng: 0 },
        zoom: 15,
        userLocation: { followUser: true },
      }}
    />
  )
}
```

### 3. Carte avec layers multiples (overlay)

```tsx
<MapView
  config={{
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 13,
    tileProvider: 'carto-light',
    overlayLayers: [
      {
        id: 'satellite',
        name: 'Satellite',
        config: TILE_PROVIDERS['esri-satellite'],
        enabled: false,
      },
    ],
  }}
  renderControls={() => (
    <MapControls
      mapRef={map.ref}
      showLayerSwitcher
      onLayerChange={(provider) => console.log('Layer:', provider)}
    />
  )}
/>
```

## Pré-requis

- `react-native-webview` ≥ 13
- `react-native-reanimated` ≥ 3
- `react-native-gesture-handler` ≥ 2
- `expo-haptics` ≥ 13
- React Native ≥ 0.74

## Fichiers

```
osm-leaflet-rn/
├── README.md                       — cette doc
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    — exports publics
    ├── types.ts                    — interfaces TypeScript
    ├── config.ts                   — presets (10 tile providers + 6 marker presets)
    ├── bridge.ts                   — communication RN ↔ WebView
    ├── MapView.tsx                 — composant principal
    ├── BottomSheet.tsx             — modal swipeable pour détails
    ├── html/
    │   └── leaflet.html            — page Leaflet + bridge JS (chargée dans WebView)
    ├── components/
    │   └── MapControls.tsx         — zoom + locate + layer switcher
    ├── hooks/
    │   ├── useMap.ts               — ref + méthodes impératives
    │   ├── useMapEvents.ts         — abonnement events
    │   └── useMarkers.ts           — gestion markers state
    └── utils/
        ├── uid.ts                  — générateur d'IDs
        └── geo.ts                  — helpers géo (distance, bounds, decode polyline, etc.)
```

## License

MIT. Les tuiles OpenStreetMap nécessitent une attribution (incluse par défaut).