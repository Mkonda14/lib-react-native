/**
 * MapView — composant principal de la carte
 * ==========================================
 * Enveloppe une WebView qui charge Leaflet avec les tuiles OpenStreetMap.
 *
 * Fonctionnalités :
 *  - Communication bidirectionnelle par pont (RN ↔ WebView)
 *  - Support des marqueurs, polylignes, polygones, cercles
 *  - Regroupement de marqueurs (clustering)
 *  - Position utilisateur avec marqueur pulsant
 *  - Méthodes impératives via ref (moveTo, fitBounds, etc.)
 *  - Événements : onMapClick, onMapLongPress, onMapMove, onMapZoom, onMarkerPress, etc.
 *  - Marqueurs HTML personnalisés (via préréglages ou HTML propre)
 *  - Sélecteur de couches (plusieurs fournisseurs de tuiles)
 *
 * @example
 *   <MapView
 *     ref={mapRef}
 *     config={{ center: { lat: 48.8566, lng: 2.3522 }, zoom: 13, tileProvider: 'osm-standard' }}
 *     markers={[
 *       { id: 'm1', position: { lat: 48.8566, lng: 2.3522 }, data: { name: 'Paris' } },
 *     ]}
 *     onMarkerPress={(e) => setSelectedMarker(e.data)}
 *   />
 */

import * as React from 'react'
import { View, StyleSheet, ViewStyle, ActivityIndicator, Text } from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import type { WebViewProps } from 'react-native-webview'
import { BottomSheet } from './bottom-sheet'
import { MapBridge } from './bridge'
import { TILE_PROVIDERS, DEFAULT_CONFIG, DEFAULT_LOCATION } from './config'
import type {
  MapViewProps,
  MapRef,
  MapConfig,
  MarkerData,
  PolylineData,
  PolygonData,
  CircleData,
  RectangleData,
  LatLng,
  LatLngBounds,
  TileProvider,
  MarkerPressEvent,
  MapClickEvent,
  MapMoveEvent,
  MapZoomEvent,
} from './types'

import { LEAFLET_HTML_CONTENT } from './html/leaflet-html'
import { useHeading } from './hooks/use-heading'
import { useUserLocation, getFixOnce } from './hooks/use-user-location'
import { resolveMarkerVariant } from './marker-variants'

const LEAFLET_HTML = LEAFLET_HTML_CONTENT

export const MapView = React.forwardRef<MapRef, MapViewProps>(
  (props, ref) => {
    const {
      config,
      markers = [],
      polylines = [],
      polygons = [],
      circles = [],
      rectangles = [],
      style,
      className,
      testID,
      onMapReady,
      onMapClick,
      onMapLongPress,
      onMapMove,
      onMapZoom,
      onMarkerPress,
      onMarkerDrag,
      onUserLocationChange,
      onTileLayerChange,
      onError,
      renderMarker,
      renderMarkerDetail,
      showBottomSheetOnPress = true,
      fitToMarkers = false,
      initialBounds,
      interactive = true,
    } = props

    const webViewRef = React.useRef<WebView>(null)
    const bridgeRef = React.useRef<MapBridge | null>(null)
    const [isReady, setIsReady] = React.useState(false)
    // Incrémenté à chaque (re-)ready : force la resynchronisation complète
    // des marqueurs/formes après un rechargement de la WebView (la page
    // repart de zéro alors que l'état RN est resté « prêt »).
    const [readyEpoch, setReadyEpoch] = React.useState(0)
    // Incrémenté après un crash du renderer (onRenderProcessGone) : force le
    // remontage de la WebView pour repartir d'une page saine.
    const [webViewEpoch, setWebViewEpoch] = React.useState(0)
    const [selectedMarker, setSelectedMarker] = React.useState<MarkerData | null>(null)

    // Conserver les derniers marqueurs/formes dans des refs pour comparer lors des mises à jour
    const prevMarkersRef = React.useRef<Record<string, MarkerData>>({})
    const prevPolylinesRef = React.useRef<Record<string, PolylineData>>({})
    const prevPolygonsRef = React.useRef<Record<string, PolygonData>>({})
    const prevCirclesRef = React.useRef<Record<string, CircleData>>({})
    const prevRectanglesRef = React.useRef<Record<string, RectangleData>>({})

    /* ---------------- Valeurs fraîches pour les handlers du bridge ----------------
     * Les handlers (bridge.onEvent, onMarkerPress…) sont enregistrés UNE SEULE
     * fois au chargement de la WebView : sans cette ref, ils captureraient les
     * props d'époque « load » (callbacks du parent avec state périmé, markers
     * figés → bottom sheet qui ne s'ouvre plus sur un marqueur ajouté après).
     * La ref est resynchronisée après chaque render ; les événements arrivant
     * de façon asynchrone, ils lisent toujours la dernière valeur connue. */
    const latestRef = React.useRef({
      config,
      markers,
      onMapReady,
      onMapClick,
      onMapLongPress,
      onMapMove,
      onMapZoom,
      onMarkerPress,
      onMarkerDrag,
      onUserLocationChange,
      onTileLayerChange,
      onError,
      showBottomSheetOnPress,
    })
    React.useEffect(() => {
      latestRef.current = {
        config,
        markers,
        onMapReady,
        onMapClick,
        onMapLongPress,
        onMapMove,
        onMapZoom,
        onMarkerPress,
        onMarkerDrag,
        onUserLocationChange,
        onTileLayerChange,
        onError,
        showBottomSheetOnPress,
      }
    })

    /* ---------------- Orientation magnétomètre (boussole utilisateur) ---------------- */
    const userLocActive = Boolean(config?.userLocation)
    const userLocOpts = typeof config?.userLocation === 'object' ? config.userLocation : {}
    const isCompassEnabled = userLocActive && userLocOpts.showHeading !== false

    const { heading } = useHeading({ enabled: isCompassEnabled })

    /* ---------------- Localisation réelle (production, expo-location) ---------------- */
    // En développement, la position simulée est injectée dans sendInit
    // (DEFAULT_LOCATION) : ce hook ne s'active qu'hors __DEV__.
    const { location: userFix, error: locationError } = useUserLocation({
      enabled: userLocActive && !__DEV__,
      options: userLocOpts,
    })

    React.useEffect(() => {
      if (locationError && __DEV__) {
        console.warn('[osm-leaflet] localisation:', locationError)
      }
    }, [locationError])

    React.useEffect(() => {
      if (!isReady || !bridgeRef.current || !userFix) return
      // .catch : WebView rechargée avant le result (la prochaine passe
      // re-pushera grâce à readyEpoch).
      bridgeRef.current.call('setUserLocation', userFix).catch(() => {})
    }, [isReady, readyEpoch, userFix])

    React.useEffect(() => {
      if (!isReady || !bridgeRef.current) return
      if (!isCompassEnabled) {
        // Boussole désactivée : annule la simulation de cap côté WebView.
        bridgeRef.current.call('setHeading', null)
      } else if (heading !== null) {
        // Tant qu'aucun cap réel n'est disponible on n'émet rien : laisse la
        // simulation éventuelle (dev, sans magnétomètre) faire son travail.
        bridgeRef.current.call('setHeading', heading)
      }
    }, [isReady, isCompassEnabled, heading])

    /* ---------------- Construction du HTML avec les fournisseurs injectés ---------------- */
    const finalHtml = React.useMemo(() => {
      let html = LEAFLET_HTML
      const providersJson = JSON.stringify(TILE_PROVIDERS)
      html = html
        .replace('var TILE_PROVIDERS = {};', `var TILE_PROVIDERS = ${providersJson};`)
        .replace('%TILE_PROVIDERS%', providersJson)
      return html
    }, [])

    /* ---------------- Config effective (init + sync post-init) ----------------
     * Centrée, fusionnée avec DEFAULT_CONFIG et, en __DEV__, enrichie de la
     * position simulée : utilisée par sendInit ET par l'effet de sync de
     * config (les deux doivent calculer la même valeur pour que le diff
     * reste vide tant que rien ne change). */
    const resolveEffectiveConfig = React.useCallback(
      (raw: MapConfig): MapConfig => {
        const merged: MapConfig = { ...DEFAULT_CONFIG, ...raw }
        if (initialBounds) {
          merged.center = {
            lat: (initialBounds.northEast.lat + initialBounds.southWest.lat) / 2,
            lng: (initialBounds.northEast.lng + initialBounds.southWest.lng) / 2,
          }
        }

        if (__DEV__ && merged.userLocation) {
          // Copie (on ne mutate jamais la prop) + injection de la position simulée.
          const opts =
            merged.userLocation === true ? {} : { ...merged.userLocation }
          if (!opts.mockLocation) opts.mockLocation = DEFAULT_LOCATION
          // Sans magnétomètre (émulateur), simuler une rotation lente du cône
          // pour que la direction reste visible en développement.
          if (opts.showHeading !== false && opts.mockHeading === undefined) {
            opts.mockHeading = 'auto'
          }
          merged.userLocation = opts
        }
        return merged
      },
      [initialBounds]
    )

    /* ---------------- Fonction d'envoi de la config ---------------- */
    const sendInit = React.useCallback(() => {
      bridgeRef.current?.init(resolveEffectiveConfig(config))
    }, [config, resolveEffectiveConfig])

    /* ---------------- Initialisation du bridge ---------------- */
    const initBridge = React.useCallback(() => {
      if (!webViewRef.current) return

      if (!bridgeRef.current) {
        bridgeRef.current = new MapBridge((data) => {
          webViewRef.current?.postMessage(data)
        })
      }

      const bridge = bridgeRef.current

      // Le JS de la WebView signale qu'il est prêt
      bridge.onWebViewReady = () => {
        sendInit()
      }

      // La carte est prête → mettre à jour l'état et notifier le parent.
      // Si la WebView s'est rechargée (isReady déjà true), les refs de
      // comparaison sont périmées : on les vide et on incrémente l'epoch
      // pour que les effets de sync renvoient tous les éléments.
      bridge.onReady = () => {
        prevMarkersRef.current = {}
        prevPolylinesRef.current = {}
        prevPolygonsRef.current = {}
        prevCirclesRef.current = {}
        prevRectanglesRef.current = {}
        setReadyEpoch((e) => e + 1)
        setIsReady(true)
        latestRef.current.onMapReady?.()
      }

      // Router les événements de carte vers les bons callbacks
      // (latestRef : toujours la dernière valeur des props, jamais la closure
      // d'époque load — voir le bloc « valeurs fraîches » ci-dessus).
      bridge.onEvent = (payload) => {
        const latest = latestRef.current
        if (payload.type === 'click') {
          latest.onMapClick?.(payload as MapClickEvent)
        } else if (payload.type === 'longpress' || payload.type === 'contextmenu') {
          latest.onMapLongPress?.(payload as MapClickEvent)
        } else if (payload.type === 'move') {
          latest.onMapMove?.(payload as MapMoveEvent)
        } else if (payload.type === 'zoom') {
          latest.onMapZoom?.(payload as MapZoomEvent)
        } else if (payload.type === 'tile-layer-change') {
          latest.onTileLayerChange?.(payload.provider as TileProvider | string)
        }
      }

      // Appui sur un marqueur → enrichir avec les données du marqueur
      bridge.onMarkerPress = (payload: MarkerPressEvent) => {
        const latest = latestRef.current
        const marker = latest.markers.find((m) => m.id === payload.markerId)
        // Data fraîche du prop prioritaire sur le payload (le côté HTML peut
        // envoyer une donnée ancienne si le marqueur a été mis à jour).
        const enriched = marker
          ? { ...payload, data: marker.data ?? payload.data }
          : payload
        latest.onMarkerPress?.(enriched)

        // Afficher la bottom sheet si activé et que le marqueur existe
        if (latest.showBottomSheetOnPress && marker) {
          setSelectedMarker(marker)
        }
      }

      // Drag d'un marqueur → notifier le parent
      bridge.onMarkerDrag = (payload) => {
        latestRef.current.onMarkerDrag?.(payload.markerId, payload.position)
      }

      // Position utilisateur mise à jour → notifier le parent
      bridge.onUserLocation = (payload) => {
        latestRef.current.onUserLocationChange?.(payload.location, payload.accuracy, payload.heading)
      }

      // Erreur depuis la WebView → notifier le parent
      bridge.onError = (error) => {
        if (__DEV__) {
          console.warn('[osm-leaflet]', error.message)
        }
        latestRef.current.onError?.(error)
      }

      // Relayer les logs console (visibles dans Metro en mode dev)
      bridge.onLog = (payload) => {
        if (__DEV__) {
          console.log('[leaflet-webview]', payload.level, payload.args?.join(' '))
        }
      }
    }, [sendInit])

    /* ---------------- Libération au démontage ---------------- */
    // Rejette les appels en attente et neutralise les handlers : ni message en
    // vol, ni callback d'un composant démonté (le bridge est recréé par
    // onLoadEnd si le composant revient).
    React.useEffect(() => {
      return () => {
        bridgeRef.current?.dispose()
        bridgeRef.current = null
      }
    }, [])

    /* ---------------- Fallback de sécurité ---------------- */
    // Masquer le spinner au bout de 3 secondes max et débloquer les appels de bridge
    React.useEffect(() => {
      const timer = setTimeout(() => {
        if (!isReady) {
          bridgeRef.current?.forceReady()
          setIsReady(true)
        }
      }, 3000)
      return () => clearTimeout(timer)
    }, [isReady])

    /* ---------------- Boucle de tentative d'initialisation ---------------- */
    React.useEffect(() => {
      if (isReady) return
      let attempts = 0
      const interval = setInterval(() => {
        if (isReady || attempts > 15) {
          clearInterval(interval)
          return
        }
        attempts++
        sendInit()
      }, 300)

      return () => clearInterval(interval)
    }, [isReady, sendInit])

    /* ---------------- Gestion des messages de la WebView ---------------- */
    const onMessage = React.useCallback((event: WebViewMessageEvent) => {
      const data = event.nativeEvent.data
      bridgeRef.current?.handleMessage(data)
    }, [])

    /* ---------------- La WebView a terminé de charger ---------------- */
    const onLoadEnd = React.useCallback(() => {
      initBridge()
      sendInit()
    }, [initBridge, sendInit])

    /* ---------------- Sync ciblée de la config après l'init ----------------
     * initMap côté WebView est un no-op si la carte est déjà prête : sans cet
     * effet, changer tileProvider / center / zoom / backgroundColor /
     * userLocation après montage ne faisait RIEN (no-op silencieux).
     * On n'envoie QUE les champs réellement modifiés (diff champ par champ) :
     * un config inline recréé à chaque render avec les mêmes valeurs ne
     * déclenche aucun appel (pas de recentrage parasite).
     * NB : clustering / zoomControl / attributionControl restent init-only
     * (structure de la carte Leaflet créée à l'init). */
    const prevConfigRef = React.useRef<MapConfig | null>(null)

    React.useEffect(() => {
      if (!isReady || !bridgeRef.current) return
      const next = resolveEffectiveConfig(config)
      const prev = prevConfigRef.current
      prevConfigRef.current = next
      if (!prev) return // première config : déjà couverte par sendInit

      const bridge = bridgeRef.current

      if (next.tileProvider !== prev.tileProvider) {
        bridge.call('setTileLayer', next.tileProvider).catch(() => {})
      }

      // Vue : seuls les champs changés sont renvoyés — un center inchangé ne
      // doit pas recentrer l'utilisateur après déplacement manuel.
      const view: {
        center?: LatLng
        zoom?: number
        minZoom?: number
        maxZoom?: number
        maxBounds?: LatLngBounds | null
        scrollWheelZoom?: boolean
      } = {}
      if (next.center.lat !== prev.center.lat || next.center.lng !== prev.center.lng) {
        view.center = next.center
      }
      if (next.zoom !== prev.zoom) view.zoom = next.zoom
      if (next.minZoom !== prev.minZoom) view.minZoom = next.minZoom
      if (next.maxZoom !== prev.maxZoom) view.maxZoom = next.maxZoom
      if (JSON.stringify(next.maxBounds) !== JSON.stringify(prev.maxBounds)) {
        view.maxBounds = next.maxBounds ?? null
      }
      if (next.scrollWheelZoom !== prev.scrollWheelZoom) {
        view.scrollWheelZoom = next.scrollWheelZoom ?? true
      }
      if (Object.keys(view).length > 0) {
        bridge.call('updateView', view).catch(() => {})
      }

      if (next.backgroundColor !== prev.backgroundColor) {
        bridge.call('setBackgroundColor', next.backgroundColor ?? '#F8F9FA').catch(() => {})
      }
      if (next.theme !== prev.theme) {
        bridge.call('setThemeClass', next.theme ?? 'light').catch(() => {})
      }

      // Position utilisateur : activation / désactivation / options changées.
      if (
        JSON.stringify(next.userLocation ?? false) !==
        JSON.stringify(prev.userLocation ?? false)
      ) {
        if (next.userLocation) {
          bridge.call('updateUserLocationConfig', next.userLocation).catch(() => {})
        } else {
          bridge.call('clearUserLocation').catch(() => {})
        }
      }
    }, [config, isReady, resolveEffectiveConfig])

    /* ---------------- Synchroniser les marqueurs quand la prop change ---------------- */
    React.useEffect(() => {
      if (!isReady || !markers) return

      const currentMap: Record<string, MarkerData> = {}
      const prevMap = prevMarkersRef.current
      const currentIds = new Set<string>()

      const added: MarkerData[] = []
      const updated: MarkerData[] = []

      for (const raw of markers) {
        // renderMarker (HTML custom) prioritaire sur la variante, puis
        // résolution des variantes (variant → iconHtml) AVANT comparaison :
        // prevMap stocke des marqueurs résolus, les diffs restent stables.
        const withRender = renderMarker ? { ...raw, iconHtml: renderMarker(raw) } : raw
        const m = resolveMarkerVariant(withRender)
        currentIds.add(m.id)
        currentMap[m.id] = m
        const prev = prevMap[m.id]

        if (!prev) {
          added.push(m)
        } else {
          // Comparaison superficielle simple pour éviter du trafic bridge inutile
          const isSame =
            prev.position.lat === m.position.lat &&
            prev.position.lng === m.position.lng &&
            prev.iconHtml === m.iconHtml &&
            prev.opacity === m.opacity &&
            prev.zIndexOffset === m.zIndexOffset &&
            prev.visible === m.visible &&
            prev.draggable === m.draggable &&
            (prev.data === m.data || JSON.stringify(prev.data) === JSON.stringify(m.data))

          if (!isSame) {
            updated.push(m)
          }
        }
      }

      const removedIds = Object.keys(prevMap).filter((id) => !currentIds.has(id))

      if (added.length > 0) {
        bridgeRef.current?.call('addMarkers', added)
      }
      updated.forEach((m) => bridgeRef.current?.call('updateMarker', m.id, m))
      removedIds.forEach((id) => bridgeRef.current?.call('removeMarker', id))

      prevMarkersRef.current = currentMap

      // Ajustement automatique des bornes : UNIQUEMENT au premier passage
      // (0 → n marqueurs, ou re-ready : onReady vide prevMap). Sans cette
      // garde, chaque update de marqueur re-fit la carte et annulait le
      // déplacement manuel de l'utilisateur.
      if (fitToMarkers && markers.length > 0 && Object.keys(prevMap).length === 0) {
        const points = markers.map((m) => m.position)
        const bounds = computeBounds(points)
        if (bounds) {
          bridgeRef.current?.call('fitBounds', bounds, { padding: 60 })
        }
      }
    }, [markers, isReady, fitToMarkers, readyEpoch, renderMarker])

    /* ---------------- Synchroniser les polylignes ---------------- */
    React.useEffect(() => {
      if (!isReady || !polylines) return

      const currentMap: Record<string, PolylineData> = {}
      const prevMap = prevPolylinesRef.current
      const currentIds = new Set<string>()

      polylines.forEach((p) => {
        currentIds.add(p.id)
        currentMap[p.id] = p
        if (!prevMap[p.id]) bridgeRef.current?.call('addPolyline', p)
      })

      const removedIds = Object.keys(prevMap).filter((id) => !currentIds.has(id))
      removedIds.forEach((id) => bridgeRef.current?.call('removePolyline', id))

      prevPolylinesRef.current = currentMap
    }, [polylines, isReady, readyEpoch])

    /* ---------------- Synchroniser les polygones ---------------- */
    React.useEffect(() => {
      if (!isReady || !polygons) return

      const currentMap: Record<string, PolygonData> = {}
      const prevMap = prevPolygonsRef.current
      const currentIds = new Set<string>()

      polygons.forEach((p) => {
        currentIds.add(p.id)
        currentMap[p.id] = p
        if (!prevMap[p.id]) bridgeRef.current?.call('addPolygon', p)
      })

      const removedIds = Object.keys(prevMap).filter((id) => !currentIds.has(id))
      removedIds.forEach((id) => bridgeRef.current?.call('removePolygon', id))

      prevPolygonsRef.current = currentMap
    }, [polygons, isReady, readyEpoch])

    /* ---------------- Synchroniser les cercles ---------------- */
    React.useEffect(() => {
      if (!isReady || !circles) return

      const currentMap: Record<string, CircleData> = {}
      const prevMap = prevCirclesRef.current
      const currentIds = new Set<string>()

      circles.forEach((c) => {
        currentIds.add(c.id)
        currentMap[c.id] = c
        if (!prevMap[c.id]) bridgeRef.current?.call('addCircle', c)
      })

      const removedIds = Object.keys(prevMap).filter((id) => !currentIds.has(id))
      removedIds.forEach((id) => bridgeRef.current?.call('removeCircle', id))

      prevCirclesRef.current = currentMap
    }, [circles, isReady, readyEpoch])

    /* ---------------- Synchroniser les rectangles ---------------- */
    React.useEffect(() => {
      if (!isReady || !rectangles) return

      const currentMap: Record<string, RectangleData> = {}
      const prevMap = prevRectanglesRef.current
      const currentIds = new Set<string>()

      rectangles.forEach((r) => {
        currentIds.add(r.id)
        currentMap[r.id] = r
        if (!prevMap[r.id]) bridgeRef.current?.call('addRectangle', r)
      })

      const removedIds = Object.keys(prevMap).filter((id) => !currentIds.has(id))
      removedIds.forEach((id) => bridgeRef.current?.call('removeRectangle', id))

      prevRectanglesRef.current = currentMap
    }, [rectangles, isReady, readyEpoch])

    /* ---------------- Méthodes impératives exposées via ref ---------------- */
    React.useImperativeHandle(
      ref,
      (): MapRef => ({
        moveTo: (latlng, zoom, options) => bridgeRef.current?.call('moveTo', latlng, zoom, options),
        zoomIn: (options) => bridgeRef.current?.call('zoomIn', options),
        zoomOut: (options) => bridgeRef.current?.call('zoomOut', options),
        setZoom: (zoom, options) => bridgeRef.current?.call('setZoom', zoom, options),
        fitBounds: (bounds, options) => bridgeRef.current?.call('fitBounds', bounds, options),
        panTo: (latlng, options) => bridgeRef.current?.call('panTo', latlng, options),
        flyTo: (latlng, zoom, options) => bridgeRef.current?.call('flyTo', latlng, zoom, options),
        flyToBounds: (bounds, options) => bridgeRef.current?.call('flyToBounds', bounds, options),
        invalidateSize: () => bridgeRef.current?.call('invalidateSize'),
        getCenter: () => bridgeRef.current!.call('getCenter'),
        getZoom: () => bridgeRef.current!.call('getZoom'),
        getBounds: () => bridgeRef.current!.call('getBounds'),
        getPixelBounds: () => bridgeRef.current!.call('getPixelBounds'),
        addMarker: (marker) =>
          bridgeRef.current?.call('addMarker', resolveMarkerVariant(marker)),
        addMarkers: (markers) =>
          bridgeRef.current?.call('addMarkers', markers.map(resolveMarkerVariant)),
        updateMarker: (id, updates) =>
          bridgeRef.current?.call('updateMarker', id, resolveMarkerVariant(updates)),
        removeMarker: (id) => bridgeRef.current?.call('removeMarker', id),
        clearMarkers: () => bridgeRef.current?.call('clearMarkers'),
        addPolyline: (polyline) => bridgeRef.current?.call('addPolyline', polyline),
        removePolyline: (id) => bridgeRef.current?.call('removePolyline', id),
        addPolygon: (polygon) => bridgeRef.current?.call('addPolygon', polygon),
        removePolygon: (id) => bridgeRef.current?.call('removePolygon', id),
        addCircle: (circle) => bridgeRef.current?.call('addCircle', circle),
        removeCircle: (id) => bridgeRef.current?.call('removeCircle', id),
        addRectangle: (rectangle) => bridgeRef.current?.call('addRectangle', rectangle),
        removeRectangle: (id) => bridgeRef.current?.call('removeRectangle', id),
        openPopup: (markerId) => bridgeRef.current?.call('openPopup', markerId),
        closePopup: () => bridgeRef.current?.call('closePopup'),
        setTileLayer: (provider) => bridgeRef.current?.call('setTileLayer', provider),
        toggleLayer: (layerId, enabled) => bridgeRef.current?.call('toggleLayer', layerId, enabled),
        locate: async () => {
          const res = (await bridgeRef.current?.call('locate')) as
            | { success?: boolean; needsRnFetch?: boolean }
            | undefined
          if (!res?.needsRnFetch) return
          // Pas de config.userLocation : acquisition ponctuelle côté RN puis
          // injection avec followUser ponctuel (recentrage immédiat).
          try {
            const ul = latestRef.current.config.userLocation
            const fix = await getFixOnce(ul === true || !ul ? {} : ul)
            await bridgeRef.current?.call('setUserLocation', fix, { followUser: true })
          } catch (e) {
            latestRef.current.onError?.(e instanceof Error ? e : new Error(String(e)))
          }
        },
        setHeading: (heading) => bridgeRef.current?.call('setHeading', heading),
        stopLocate: () => bridgeRef.current?.call('stopLocate'),
        redraw: () => bridgeRef.current?.call('redraw'),
        clearAll: () => bridgeRef.current?.call('clearAll'),
      }),
      []
    )

    /* ---------------- Rendu ---------------- */
    // RNW 14 : `declare class WebView<P = undefined>` — sans candidat
    // d'inférence pour P, les props JSX se résolvent en
    // `WebViewProps & undefined` = `never` (TS strict) : cast typé minimal
    // qui conserve les props réelles (contrairement à un `as any`).
    const WebViewComponent = WebView as unknown as React.ComponentType<
      WebViewProps & {
        ref?: React.Ref<WebView>
        pointerEvents?: 'auto' | 'none'
      }
    >
    return (
      <View style={[styles.container, style]} className={className} testID={testID}>
        <WebViewComponent
          key={webViewEpoch}
          ref={webViewRef}
          source={{ html: finalHtml, baseUrl: 'https://unpkg.com' }}
          style={styles.webview}
          onMessage={onMessage}
          onLoadEnd={onLoadEnd}
          onError={(e) =>
            onError?.(new Error('WebView error: ' + e.nativeEvent.description))
          }
          onHttpError={(e) =>
            onError?.(
              new Error(
                `WebView HTTP ${e.nativeEvent.statusCode} : ${e.nativeEvent.description}`
              )
            )
          }
          onRenderProcessGone={(e) => {
            // Android : le renderer de la WebView est mort (OOM, crash JS…).
            // On remonte la WebView (key) : onLoadEnd → initBridge →
            // webview-ready → re-init → readyEpoch vide les refs de diff et
            // resynchronise marqueurs/formes/config.
            if (__DEV__) {
              console.warn(
                '[osm-leaflet] renderer terminé (didCrash=' +
                  String(e.nativeEvent.didCrash) +
                  ') : remontage de la WebView'
              )
            }
            onError?.(
              new Error(
                'WebView : processus de rendu terminé' +
                  (e.nativeEvent.didCrash ? ' (crash)' : '')
              )
            )
            setIsReady(false)
            setWebViewEpoch((k) => k + 1)
          }}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
          originWhitelist={['*']}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          pointerEvents={interactive ? 'auto' : 'none'}
          containerStyle={{ flex: 1 }}
          textInteractionEnabled={false}
        />

        {!isReady && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#0A84FF" />
            <Text style={styles.loadingText}>Chargement de la carte…</Text>
          </View>
        )}

        {/* Contrôles de carte superposés */}
        {props.renderControls?.()}

        {/* Bottom sheet pour les détails de marqueur */}
        {showBottomSheetOnPress && renderMarkerDetail && (
          <BottomSheetLazy
            marker={selectedMarker}
            renderContent={renderMarkerDetail}
            onClose={() => setSelectedMarker(null)}
          />
        )}
      </View>
    )
  }
)

MapView.displayName = 'MapView'

const BottomSheetLazy: React.FC<{
  marker: MarkerData | null
  renderContent: (marker: MarkerData) => React.ReactNode
  onClose: () => void
}> = ({ marker, renderContent, onClose }) => {
  return (
    <BottomSheet
      marker={marker}
      renderContent={renderContent}
      onClose={onClose}
    />
  )
}

function computeBounds(points: LatLng[]): LatLngBounds | null {
  if (points.length === 0) return null
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return {
    northEast: { lat: maxLat, lng: maxLng },
    southWest: { lat: minLat, lng: minLng },
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
  } as ViewStyle,
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  } as ViewStyle,
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 50,
  } as ViewStyle,
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#71717A',
    fontWeight: '500',
  },
})
