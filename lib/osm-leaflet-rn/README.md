# @your-org/osm-leaflet-rn

> Carte OpenStreetMap + Leaflet pour React Native — basée sur WebView, ultra-personnalisable, avec clustering, bottom sheet, et 5 providers de tuiles.

## Pourquoi WebView ?

Leaflet est une lib JS qui s'exécute dans un navigateur. Pour React Native, l'approche la plus fiable et performante est d'embarquer Leaflet dans un `WebView` et de faire communiquer RN ↔ WebView via `postMessage`. Cela donne accès à **toutes les fonctionnalités de Leaflet** (plugins, geoJSON, markers custom HTML, clustering) sans module natif.

## Fonctionnalités

- ✅ **OpenStreetMap** + 9 autres providers (Carto, Esri, Stamen, OpenTopoMap)
- ✅ **Markers custom** : HTML/SVG inline, 6 presets (pin, circle, bubble, square, pulse, star)
- ✅ **20 variantes de marqueur** : icônes POI par catégorie (`pharmacy`, `hospital`, `transit`…) avec couleur sémantique
- ✅ **GoogleSearchBar** : barre de recherche flottante + **mode focus plein écran** (overlay, suggestions injectables)
- ✅ **Marker clustering** automatique (Leaflet.markercluster)
- ✅ **Bottom sheet** swipeable avec snap points + animations spring
- ✅ **Map controls** : zoom in/out, locate, layer switcher, boussole
- ✅ **User location** avec marker pulsant, cercle de précision et cône d'orientation
- ✅ **Hooks React** : `useMap`, `useMarkers`, `useUserLocation`, `useHeading`
- ✅ **Polylines, Polygones, Cercles, Rectangles**
- ✅ **Événements** : click map, marker press, marker drag, move, zoom
- ✅ **Méthodes impératives** : `moveTo`, `flyTo`, `fitBounds`, `setZoom`, etc.
- ✅ **Custom callbacks** : `onMarkerPress`, `onMapClick`, `onMapMove`, etc.
- ✅ **Modal détails marker** : data attachée au marker passée au callback
- ✅ **Thème dark/light** automatique
- ✅ **Haptic feedback** au snap du bottom sheet
- ✅ **0 module natif requis** (juste `react-native-webview` ; `expo-location`/`expo-sensors` optionnels, chargés paresseusement)

## Installation

```bash
npm install react-native-webview react-native-reanimated react-native-gesture-handler \
  expo-haptics expo-linear-gradient lucide-react-native react-native-safe-area-context
```

### Modules optionnels

La carte fonctionne **sans** aucun module natif supplémentaire. Deux features activent des modules optionnels, détectés dynamiquement via `requireOptionalNativeModule` (absence = dégradation propre, aucun crash) :

| Module | Feature | Sans le module |
|--------|---------|----------------|
| `expo-location` | Position réelle de l'utilisateur (prod) | En dev : `DEFAULT_LOCATION` injecté comme `mockLocation`. En prod : aucune position |
| `expo-sensors` | Boussole / cône d'orientation (`useHeading`) | Cône désactivé ou `mockHeading` en dev |

```bash
npm install expo-location expo-sensors   # uniquement si vous voulez ces features
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

## Intégration dans l'app hôte

Modifications à faire **en dehors de la lib** pour qu'elle fonctionne dans une app Expo :

1. **Alias TypeScript** — `tsconfig.json` :

   ```jsonc
   {
     "compilerOptions": {
       "paths": {
         "@your-org/osm-leaflet-rn": ["./lib/osm-leaflet-rn/src"],
         "@your-org/osm-leaflet-rn/*": ["./lib/osm-leaflet-rn/src/*"]
       }
     }
   }
   ```

   La lib est importée depuis les sources (`src/`), pas depuis `dist/` : pas de build préalable en dev.

2. **Dépendances hôte** — `package.json` : les peerDeps de la lib (voir *Installation*) + si besoin `expo-location` et `expo-sensors`.

3. **Permissions native** — `app.json` pour `expo-location` :

   ```jsonc
   "plugins": [
     "expo-router",
     [
       "expo-location",
       {
         "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location."
       }
     ]
   ]
   ```

4. **Écran de démonstration** — `app/(protected)/(tabs)/map-test.tsx` : exemple complet d'intégration (variantes de marqueur, `GoogleSearchBar` en mode focus, localisation, bottom sheet, contrôles, thème dark/light).

5. **Émulateur Android** : `localhost`/`127.0.0.1` n'atteignent pas l'hôte — utiliser `10.0.2.2` (notamment pour `EXPO_PUBLIC_BACKEND_URL`, sans rapport avec les tuiles qui, elles, sont chargées directement par la WebView).

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
          tileProvider: 'osm-standard',
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
| `onMapLongPress` | `(e: MapClickEvent) => void` | Appui long sur la carte |
| `onMarkerPress` | `(e: MarkerPressEvent) => void` | Marker pressé |
| `onMarkerDrag` | `(id, position) => void` | Marker draggé |
| `onUserLocationChange` | `(location, accuracy, heading?) => void` | Position user (`heading` = cap en degrés, 0 = Nord, si dispo) |
| `onTileLayerChange` | `(provider) => void` | Layer changé |
| `onError` | `(error) => void` | Erreurs remontées : bridge/WebView, HTTP du document principal, crash du renderer (WebView remontée automatiquement puis resync complète) |
| `renderMarker` | `(marker) => string` | Rendu HTML custom du marqueur (remplace le pin) |
| `renderMarkerDetail` | `(marker) => ReactNode` | Contenu du bottom sheet |
| `renderClusterIcon` | `(count) => string` | **Déprécié** (impossible : callback non sérialisable) → utiliser `config.clusterIconHtml` |
| `renderCallout` | `(marker) => ReactNode` | Bulle au-dessus d'un marqueur |
| `renderControls` | `() => ReactNode` | Contrôles custom |
| `fitToMarkers` | `boolean` | Auto-fit aux markers — **uniquement** au premier remplissage (`0 → n`) ou après un re-ready : les updates de markers ne re-fit pas (ne déplace pas l'utilisateur)
| `showBottomSheetOnPress` | `boolean` | Ouvrir bottom sheet au press (default `true`) |
| `className` | `string` | Classe NativeWind |
| `testID` | `string` | Test ID |

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
  clusterIconHtml?: string            // HTML custom des clusters, token {count} (init-only)
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

#### Mise à jour à chaud (post-init)

La config est **diffée champ par champ** après le montage : seuls les champs
réellement modifiés sont renvoyés à la WebView. Un objet `config` inline
recréé à chaque render avec les mêmes valeurs ne déclenche **aucun** appel
(pas de recentrage parasite sur un déplacement manuel de l'utilisateur).

| Champ | Comportement après montage |
|-------|---------------------------|
| `tileProvider` | chaud → `setTileLayer` |
| `center`, `zoom`, `minZoom`, `maxZoom`, `maxBounds`, `scrollWheelZoom` | chaud → `updateView` (seuls les champs changés) |
| `backgroundColor` | chaud → `setBackgroundColor` |
| `theme` | chaud → `setThemeClass` (classe `.dark`) |
| `userLocation` | chaud → activation/désactivation + options (`updateUserLocationConfig` / `clearUserLocation`) |
| `clustering`, `clusterIconHtml`, `zoomControl`, `attributionControl` | **init-only** : structure Leaflet créée à l'init — les changer après montage ne fait rien (remonter la WebView pour appliquer) |

#### `UserLocationConfig`

```typescript
interface UserLocationConfig {
  enableHighAccuracy?: boolean  // GPS haute précision (défaut: true)
  maximumAge?: number           // cache max d'une position en ms (défaut: 30000)
  timeout?: number              // délai max en ms (défaut: 10000)
  watch?: boolean               // suivi continu watchPositionAsync (défaut: true)
  showAccuracy?: boolean        // cercle de précision (défaut: true)
  markerColor?: string          // couleur du marqueur user (défaut: '#0A84FF')
  pulsate?: boolean             // animation de pulsation (défaut: true)
  followUser?: boolean          // recentrer la carte à chaque déplacement (défaut: false)
  showHeading?: boolean         // cône d'orientation boussole (défaut: true si userLocation actif)
  mockLocation?: LatLng         // position simulée (voir « dev vs prod » ci-dessous)
  mockHeading?: 'auto' | number // cap simulé : rotation lente continue, ou angle fixe (0 = Nord)
}
```

**Dev vs prod** :

- **`__DEV__`** : aucune GPS réel requis. `DEFAULT_LOCATION` (Kinshasa) est injecté comme `mockLocation` si vous n'en fournissez pas, et `mockHeading: 'auto'` fait tourner lentement le cône (utile sur émulateur sans magnétomètre). Une `mockLocation` explicite reste prioritaire.
- **Production** : la position vient d'`expo-location` (module optionnel — voir *Installation*). Sans `expo-location`, aucun crash : la position reste simplement indisponible.

### `MarkerData<T>`

```typescript
interface MarkerData<T = unknown> {
  id: string
  position: LatLng
  variant?: MarkerVariant     // variante POI ('pharmacy', 'hospital', …) — voir « Variantes de marqueur »
  iconColor?: string          // surcharge de la couleur du pin de la variante (hex)
  iconHtml?: string          // HTML custom pour l'icône (prioritaire sur variant)
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

Ordre de résolution de l'icône : **`iconHtml` > `variant` > pin par défaut**.

### Providers de tuiles

| Provider | Description | URL |
|----------|-------------|-----|
| `osm-standard` | OpenStreetMap standard | tile.openstreetmap.org |
| `osm-hot` | Humanitarian OSM (style HOT) | tile.openstreetmap.fr/hot |
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
map.ref.current?.setZoom(15, { animate: true })

// Markers
map.ref.current?.addMarker(marker)
map.ref.current?.addMarkers(markers)
map.ref.current?.updateMarker(id, updates)
map.ref.current?.removeMarker(id)
map.ref.current?.clearMarkers()
map.ref.current?.openPopup(id)
map.ref.current?.closePopup()

// Formes
map.ref.current?.addPolyline(polyline)
map.ref.current?.removePolyline(id)
map.ref.current?.addPolygon(polygon)
map.ref.current?.removePolygon(id)
map.ref.current?.addCircle(circle)
map.ref.current?.removeCircle(id)
map.ref.current?.addRectangle(rectangle)
map.ref.current?.removeRectangle(id)

// User location — fonctionne AVEC ou SANS config.userLocation
map.locate()   // sans userLocation : fix ponctuel via getFixOnce + recentrage
map.ref.current?.setHeading(45)    // cap manuel en degrés (null = désactive)
map.ref.current?.stopLocate()

// Tile layer
map.ref.current?.setTileLayer('esri-satellite')
map.ref.current?.toggleLayer('overlay1', true)

// Info (Promise)
const center = await map.ref.current?.getCenter()
const zoom = await map.ref.current?.getZoom()
const bounds = await map.ref.current?.getBounds()

// Redimensionnement / cleanup
map.ref.current?.invalidateSize()
map.ref.current?.redraw()
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

### `renderMarker` (prop)

Rendu HTML **pour tous les markers**, calculé au moment de la synchro (prioritaire
sur `variant`, traité comme `iconHtml` et inclus dans le diff) :

```tsx
<MapView
  markers={markers}
  renderMarker={(m) =>
    `<div style="width:40px;height:40px;border-radius:8px;background:#7C3AED;
                color:#fff;display:flex;align-items:center;justify-content:center">
       ${(m.data as any)?.title?.[0] ?? '?'}
     </div>`
  }
/>
```

Retirer la prop ou changer le retour de la fonction re-sync les icônes
(`updateMarker` diffé, pas de re-création de tous les markers).
La prop `className` (NativeWind) s'applique au conteneur de la carte.

## Variantes de marqueur

20 variantes POI « plug & play » : une couleur sémantique + un pictogramme, rendus côté RN (aucune régénération du HTML requis). Glyphes SVG extraits de [lucide](https://lucide.dev) (licence ISC).

```tsx
import { MarkerData } from '@your-org/osm-leaflet-rn'

const markers: MarkerData[] = [
  { id: 'pharma', position: { lat: -4.3742, lng: 15.3452 }, variant: 'pharmacy' },
  { id: 'hopital', position: { lat: -4.3236, lng: 15.2948 }, variant: 'hospital' },
  // Surcharge de la couleur de la variante
  { id: 'gare', position: { lat: -4.3322, lng: 15.3031 }, variant: 'transit', iconColor: '#0B5FFF' },
]
```

**Ordre de résolution** : `iconHtml` (prioritaire, ignore la variante) > `variant` > pin par défaut.

| Variante | Couleur | Glyphe |
|----------|---------|--------|
| `default` | `#EA4335` | pin standard (aucun glyphe) |
| `building` | `#6B7280` | building-2 |
| `hotel` | `#6366F1` | bed |
| `hospital` | `#DC2626` | hospital |
| `pharmacy` | `#16A34A` | pill |
| `restaurant` | `#F97316` | utensils |
| `cafe` | `#B45309` | coffee |
| `store` | `#0891B2` | store |
| `bank` | `#4F46E5` | landmark |
| `atm` | `#047857` | banknote |
| `school` | `#D97706` | school |
| `religious` | `#7C3AED` | church |
| `fuel` | `#EA580C` | fuel |
| `park` | `#15803D` | tree-pine |
| `parking` | `#2563EB` | square-parking |
| `police` | `#1E40AF` | shield |
| `transit` | `#CA8A04` | train-front |
| `museum` | `#92400E` | palette |
| `office` | `#475569` | briefcase |
| `airport` | `#0284C7` | plane |

Exports associés :

```tsx
import {
  MARKER_VARIANTS,          // catalogue complet (label, color, glyph)
  getVariantIconHtml,       // getVariantIconHtml(variant, color?, width?) → string HTML
  resolveMarkerVariant,     // applique la variante à un MarkerData (iconHtml/iconSize/iconAnchor)
} from '@your-org/osm-leaflet-rn'
import type { MarkerVariant, MarkerVariantDef } from '@your-org/osm-leaflet-rn'
```

## GoogleSearchBar

Barre de recherche flottante « style Google » : champ inline, avatar profil, chips de catégories — et un **mode focus plein écran** : au focus du champ, un overlay prend toute la place (barre repositionnée en haut, zone de contenu injectable dessous, clavier géré).

```tsx
import { GoogleSearchBar, GOOGLE_CATEGORIES } from '@your-org/osm-leaflet-rn'
import type { CategoryChip } from '@your-org/osm-leaflet-rn'

<GoogleSearchBar
  value={searchQuery}
  onChangeText={setSearchQuery}
  onCategorySelect={(cat: CategoryChip) => console.log(cat.id)}
  onProfilePress={() => router.push('/profile')}
  isDark={isDark}
  onFocusedChange={(focused) => console.log('mode focus:', focused)}
  focusedContent={({ query, close, isDark }) => (
    <SuggestionList
      query={query}
      onSelect={(place) => {
        close()                                   // ferme l'overlay (animation)
        map.flyTo(place.position, 16, { duration: 0.9 })
      }}
    />
  )}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `placeholder` | `string` | Texte du placeholder (défaut : `« Rechercher ici... »`) |
| `value` | `string` | Valeur contrôlée du champ (sinon état interne) |
| `onChangeText` | `(text) => void` | Appelé à chaque frappe |
| `onCategorySelect` | `(cat: CategoryChip) => void` | Sélection / désélection d'une chip catégorie |
| `onProfilePress` | `() => void` | Appui sur l'avatar profil |
| `isDark` | `boolean` | Thème sombre (inversion des couleurs) |
| `style` | `ViewStyle` | Style du conteneur |
| `focusedContent` | `ReactNode \| ({ query, close, isDark }) => ReactNode` | Contenu de la zone basse de l'overlay (render-prop recommandé) |
| `onFocusedChange` | `(focused: boolean) => void` | Notifie l'ouverture / la fermeture du mode focus |
| `autoFocus` | `boolean` | Auto-focus du champ dans l'overlay (défaut : `true`) |

- `GOOGLE_CATEGORIES` : 7 chips prédéfinies (Restaurants, Essence, Courses, Café, Hôtels, Pharmacie, Monuments) ; remplacez la liste via vos propres `CategoryChip` si besoin.
- `close()` (reçu par le render-prop) déclenche la fermeture animée ; `onFocusedChange(false)` est appelé en fin de cycle.
- Fermeture : tap sur `×`, sélection d'un résultat (`close()`), ou **retour Android** (1er back = clavier, 2e = overlay).

### Exemple : suggestions filtrées

```tsx
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

<GoogleSearchBar
  value={query}
  onChangeText={setQuery}
  focusedContent={({ query, close }) => {
    const q = normalize(query.trim())
    const matches = markers.filter(
      (m) => !q || normalize(`${m.data?.title} ${m.data?.category}`).includes(q)
    )
    return (
      <View>
        <Text>{q ? `Résultats (${matches.length})` : 'Suggestions'}</Text>
        {matches.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              close()
              map.flyTo(m.position, 16, { duration: 0.9 })
            }}
          >
            <Text>{m.data?.title}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            close()
            map.fitBounds(boundsFromPoints(markers.map((m) => m.position)), { padding: 60 })
          }}
        >
          <Text>Tout afficher</Text>
        </Pressable>
      </View>
    )
  }}
/>
```

## MapControls

```tsx
import { MapControls } from '@your-org/osm-leaflet-rn'

<MapView
  ref={map.ref}
  renderControls={() => (
    <MapControls
      mapRef={map.ref}
      position="bottom-right"
      showZoom
      showLocate
      showLayerSwitcher
      showCompass
      isDark={isDark}
    />
  )}
/>
```

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `mapRef` | `RefObject<MapRef>` | — | `useMap().ref` ou `useRef<MapRef>()` |
| `position` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'bottom-right'` | Position des contrôles |
| `showZoom` | `boolean` | `true` | Boutons zoom + / − |
| `showLocate` | `boolean` | `true` | Bouton géolocalisation |
| `showLayerSwitcher` | `boolean` | `true` | Bouton changement de couche |
| `showCompass` | `boolean` | `true` | Boussole |
| `isDark` | `boolean` | `false` | Thème sombre |
| `buttonStyle` / `color` / `backgroundColor` | styles | — | Personnalisation |
| `onLocate` | `() => void` | — | Après déclenchement de la géolocalisation |
| `onLayerChange` | `(provider) => void` | — | Quand la couche de tuiles change |

### LayerPickerPopover standalone

Sélecteur de fond de carte en grille, exporté pour usage hors `MapControls` :

```tsx
import { LayerPickerPopover } from '@your-org/osm-leaflet-rn'

<LayerPickerPopover
  visible={showLayers}
  activeProvider={active}
  direction="top"
  isDark={isDark}
  onSelect={(provider) => setActive(provider)}
/>
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
    tileProvider: 'osm-standard',
    clustering: {
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
    },
    // HTML custom de l'icône — {count} = nombre de marqueurs groupés
    clusterIconHtml:
      '<div style="width:44px;height:44px;border-radius:50%;background:#1A73E8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #fff">{count}</div>',
  }}
  markers={hundredsOfMarkers}
/>
```

> **Init-only** : le clustering est construit à l'initialisation de la carte.
> Changer `config.clustering` ou `clusterIconHtml` après montage n'a aucun effet
> (structure Leaflet créée à l'init) — prévoyez les valeurs dès le premier render.
>
> `renderClusterIcon` / `clusterIconBuilder` sont **dépréciés** : un callback RN
> ne peut pas traverser le bridge JSON. `clusterIconHtml` (chaîne) le remplace.

## User Location

```tsx
<MapView
  config={{
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 13,
    tileProvider: 'osm-standard',
    userLocation: {
      enableHighAccuracy: true,
      watch: true,
      showAccuracy: true,
      pulsate: true,
      followUser: false,
      markerColor: '#0A84FF',
      showHeading: true,        // cône d'orientation (boussole)
    },
  }}
  onUserLocationChange={(location, accuracy, heading) => {
    console.log(`User at ${location.lat}, ${location.lng} (±${accuracy}m)`)
    if (heading !== null && heading !== undefined) console.log(`Cap: ${heading}°`)
  }}
/>
```

**Dev vs prod** (détails dans `UserLocationConfig` plus haut) :

- **Dev** : position simulée `DEFAULT_LOCATION` injectée automatiquement, `mockHeading: 'auto'` fait tourner le cône — fonctionne sur émulateur sans GPS ni magnétomètre.
- **Prod** : position réelle via `expo-location` (module optionnel, chargé paresseusement), cap réel via `expo-sensors` quand disponible. Sans ces modules, la carte reste utilisable, sans position user ni boussole.

Cône d'orientation via `mockHeading` en dev :

```tsx
userLocation: { mockHeading: 'auto' }   // rotation lente continue (défaut en dev)
userLocation: { mockHeading: 90 }       // cap fixe à l'Est
userLocation: { showHeading: false }    // désactive le cône
```

### `map.locate()` sans `config.userLocation`

`locate()` fonctionne **dans les deux cas** :

- **`userLocation` activé** : la WebView répond directement (watch déjà actif).
- **`userLocation` désactivé / absent** : la WebView répond `needsRnFetch`, la
  position est acquise **une fois** côté RN via `getFixOnce()` (cache
  `getLastKnownPositionAsync` puis GPS), injectée avec `followUser: true` pour
  un recentrage ponctuel — sans démarrer de watch continu.

Sans `expo-location` : en dev la position simulée `DEFAULT_LOCATION` est
renvoyée ; en prod, l'erreur est relayée à `onError` (pas de crash).

### `getFixOnce(options?)`

```tsx
import { getFixOnce } from '@your-org/osm-leaflet-rn'

const fix = await getFixOnce({ enableHighAccuracy: true })
// → UserLocationFix { lat, lng, accuracy, heading, speed }
```

Acquisition unique **hors hook** (la même que celle interne de `map.locate()`),
utile pour un badge de position ou un appel avant montage de la carte :

- module absent : `__DEV__` → `DEFAULT_LOCATION`, sinon **throw**.
- permission refusée : **throw** (à relayer via `onError`).

## Hooks

### `useMap()`

```tsx
const map = useMap()
// → { ref, moveTo, zoomIn, zoomOut, flyTo, fitBounds, locate, clearAll }
```

Passez `map.ref` à `<MapView ref={map.ref}>` et à `<MapControls mapRef={map.ref}>`. Les méthodes restantes (30+) sont sur `map.ref.current` — voir *Méthodes impératives*.

### `useMarkers(initial?)`

```tsx
const { markers, addMarker, addMarkers, updateMarker, removeMarker, clearMarkers, setMarkers } =
  useMarkers(INITIAL_MARKERS)
```

Un `id` déjà présent est **remplacé**, jamais dupliqué.

### `useUserLocation({ enabled?, options? })`

```tsx
const { location, error } = useUserLocation({
  enabled: true,
  options: { watch: true, enableHighAccuracy: true },
})
// location : UserLocationFix | null  ({ lat, lng, accuracy, heading, speed })
// error    : string | null
```

Charge `expo-location` paresseusement ; sans module, `error` est renseigné et `location` reste `null`. La lib l'utilise déjà en interne via `<MapView config={{ userLocation: true }}>` — à n'utiliser directement que pour un usage hors carte (ex. badge de position) ; pour une acquisition **unique**, préférer `getFixOnce()` (voir plus haut).

### `useHeading({ enabled?, updateInterval?, smoothing? })`

```tsx
const { heading, isAvailable } = useHeading({ enabled: true, smoothing: 0.2 })
// heading     : number | null  (0° = Nord, 90° = Est — ou null)
// isAvailable : boolean        (magnétomètre présent sur l'appareil)
```

`expo-sensors` (Magnetometer + Accelerometer) chargé paresseusement : sans module ou sans capteur, `isAvailable = false`. Lissage exponentiel anti-tremblement (`smoothing`, défaut `0.2`).

### `useMapEvents(mapRef, options)`

Placeholder : les événements se passent directement en props à `<MapView>` (`onMapClick`, `onMapMove`, `onMarkerPress`…). Le hook existe pour une future extension (contexte de carte global).

## Polylines, Polygones, Cercles, Rectangles

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
  rectangles={[
    {
      id: 'zone-box',
      bounds: {
        northEast: { lat: 48.87, lng: 2.36 },
        southWest: { lat: 48.86, lng: 2.35 },
      },
      color: '#EF4444',
      fillColor: '#EF4444',
      fillOpacity: 0.08,
      weight: 2,
    },
  ]}
/>
```

Les rectangles suivent la même synchro diff que les markers : ajouter/retirer
une entrée du tableau `rectangles` appelle `addRectangle` / `removeRectangle`
côté WebView (également en impératif via `map.ref.current?.…`).

## Geo utilities

```typescript
import {
  distance, distanceKm, formatDistance, formatLatLng,
  boundsFromPoints, boundsToArray, boundsFromArray, isPointInBounds,
  centroid, polylineLength, isPointInPolygon, boundingCircleRadius,
  decodePolyline, bearing, interpolate, destinationPoint,
  toRad, toDeg,
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

// Point destination à une distance/bearing donné(e)
const next = destinationPoint(from, bearingDeg, distanceMeters)
```

## Performance

- **WebView dédiée** : la carte tourne dans son propre thread, pas de jank sur le thread JS RN
- **Clustering** : regroupe les markers proches pour éviter d'en rendre des centaines
- **Diff updates** : seuls les markers ajoutés/modifiés/supprimés sont envoyés au WebView
- **Diff config** : un `config` inline recréé à chaque render ne déclenche
  d'appels bridge que si un champ a réellement changé (voir *Mise à jour à chaud*)
- **Will-change transforms** : CSS optimisé pour la fluidité des animations
- **Method-call batching** : les appels impératifs sont dedupés et timed

## Recettes

### 1. Carte avec recherche + sélection de marker

```tsx
function MapWithSearch() {
  const [results, setResults] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const map = useMap()

  const handleSearch = async (text) => {
    const found = await searchPlaces(text)
    setResults(found)
    if (found.length > 0) {
      map.fitBounds(boundsFromPoints(found.map(r => r.position)))
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <GoogleSearchBar
        value={query}
        onChangeText={(text) => {
          setQuery(text)
          handleSearch(text)
        }}
        focusedContent={({ query, close }) => (
          <ResultList
            results={results}
            onSelect={(place) => {
              close()
              map.flyTo(place.position, 16, { duration: 0.9 })
            }}
          />
        )}
      />
      <MapView
        ref={map.ref}
        markers={results.map(r => ({ ...r, variant: 'store' }))}
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

Voir aussi l'exemple complet de suggestions dans la section *GoogleSearchBar* et l'écran de démo `app/(protected)/(tabs)/map-test.tsx`.

### 2. Tracker GPS en temps réel

```tsx
function GpsTracker() {
  const map = useMap()
  // Suivi de position via le hook de la lib (expo-location, optionnel)
  const { location } = useUserLocation({ enabled: true, options: { watch: true } })

  return (
    <MapView
      ref={map.ref}
      onUserLocationChange={(pos) => {
        map.moveTo(pos, undefined, { animate: true })
      }}
      config={{
        center: location ?? { lat: 0, lng: 0 },
        zoom: 15,
        userLocation: { followUser: true, watch: true },
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
    tileProvider: 'osm-standard',
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

## Dépannage

| Symptôme | Cause / solution |
|----------|------------------|
| Tuiles blanches | Pas de réseau dans la WebView, ou `tileProvider` inconnu. Vérifier l'accès internet ; tester avec `'osm-standard'`. |
| `expo-location` / `expo-sensors` absents | Comportement attendu : modules **optionnels**, détectés via `requireOptionalNativeModule`. Aucun crash — la position user et la boussole sont simplement indisponibles (dev : `DEFAULT_LOCATION` injecté à la place). |
| Pas de position user en prod | Installer `expo-location` + plugin `app.json` **puis rebuild natif** (pas de simple reload JS). |
| Boussole toujours à `null` | `expo-sensors` absent ou capteur absent (`isAvailable = false`). En dev, `mockHeading: 'auto'` simule une rotation. |
| Clavier / overlay de recherche mal positionné | Le mode focus gère l'IME via `KeyboardAvoidingView` ; sur Android, un artefact `uimode night` transitoire au premier focus peut décaler la barre — re-taper pour ré-ouvrir l'IME corrige (le focus n'est jamais perdu au ré-attachement du dialog). |
| Retour Android ne ferme pas l'overlay | Le `BackHandler` du mode focus est prioritaire : 1er retour = clavier, 2e = fermeture de l'overlay (restant sur le même onglet). |
| `localhost` inaccessible depuis l'émulateur Android | Utiliser `10.0.2.2` pour tout service de l'hôte (`EXPO_PUBLIC_BACKEND_URL`) — les tuiles OSM, elles, viennent d'internet. |
| Alias `@your-org/osm-leaflet-rn` introuvable | Vérifier le bloc `paths` du `tsconfig.json` hôte (voir *Intégration dans l'app hôte*). |
| Changement de `config` après montage sans effet | Voir *Mise à jour à chaud* : les champs chauds sont diffés automatiquement, mais `clustering` / `clusterIconHtml` / `zoomControl` / `attributionControl` restent **init-only**. |
| Carte blanche / WebView figée après un crash natif | `onRenderProcessGone` (Android) remonte la WebView et resynchronise tout ; l'erreur est relayée à `onError`. |

## Pré-requis

- `react-native-webview` ≥ 13
- `react-native-reanimated` ≥ 3
- `react-native-gesture-handler` ≥ 2
- `expo-haptics` ≥ 13
- `expo-linear-gradient` ≥ 13
- `lucide-react-native` ≥ 0.400
- `react-native-safe-area-context` ≥ 4
- React Native ≥ 0.74

Optionnels : `expo-location` (position réelle), `expo-sensors` (boussole).

Testé avec **Expo SDK 57 / React Native 0.86 / React 19.2** (l'app hôte de ce dépôt) ; compatibles avec les versions minimales ci-dessus.

## Fichiers

```
osm-leaflet-rn/
├── README.md                       — cette doc
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                    — exports publics
    ├── types.ts                    — interfaces TypeScript (MapRef, MarkerData, événements…)
    ├── config.ts                   — presets (5 tile providers, 6 marker presets, DEFAULT_LOCATION…)
    ├── marker-variants.ts          — 20 variantes POI (glyphes lucide) + resolveMarkerVariant
    ├── bridge.ts                   — communication RN ↔ WebView
    ├── map-view.tsx                — composant principal
    ├── bottom-sheet.tsx            — BottomSheet swipeable + LayerPickerPopover
    ├── html/
    │   ├── leaflet.html            — page Leaflet + bridge JS (chargée dans WebView)
    │   └── leaflet-html.ts         — le même HTML exporté comme string TS
    │                                ⚠ garder les 2 fichiers synchronisés
    ├── components/
    │   ├── map-controls.tsx        — zoom + locate + layer switcher + boussole
    │   └── google-search-bar.tsx   — barre de recherche + mode focus plein écran
    ├── hooks/
    │   ├── use-map.ts              — ref + méthodes impératives
    │   ├── use-map-events.ts       — abonnement events (placeholder)
    │   ├── use-markers.ts          — gestion markers state
    │   ├── use-heading.ts          — boussole (expo-sensors, optionnel)
    │   └── use-user-location.ts    — position réelle (expo-location, optionnel)
    └── utils/
        ├── uid.ts                  — générateur d'IDs
        └── geo.ts                  — helpers géo (distance, bounds, decode polyline, etc.)
```

## License

MIT. Les tuiles OpenStreetMap nécessitent une attribution (incluse par défaut).