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
 *     config={{ center: { lat: 48.8566, lng: 2.3522 }, zoom: 13, tileProvider: 'carto-light' }}
 *     markers={[
 *       { id: 'm1', position: { lat: 48.8566, lng: 2.3522 }, data: { name: 'Paris' } },
 *     ]}
 *     onMarkerPress={(e) => setSelectedMarker(e.data)}
 *   />
 */

import * as React from 'react'
import { View, StyleSheet, ViewStyle, Platform, ActivityIndicator, Text } from 'react-native'
// eslint-disable-next-line import/no-unresolved
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { BottomSheet } from './bottom-sheet'
import { MapBridge } from './bridge'
import { TILE_PROVIDERS, DEFAULT_CONFIG } from './config'
import type {
  MapViewProps,
  MapRef,
  MarkerData,
  PolylineData,
  PolygonData,
  CircleData,
  LatLng,
  LatLngBounds,
  TileProvider,
  MarkerPressEvent,
  MapClickEvent,
  MapMoveEvent,
  MapZoomEvent,
} from './types'

import { LEAFLET_HTML_CONTENT } from './html/leaflet-html'

const LEAFLET_HTML = LEAFLET_HTML_CONTENT

export const MapView = React.forwardRef<MapRef, MapViewProps>(
  (props, ref) => {
    const {
      config,
      markers = [],
      polylines = [],
      polygons = [],
      circles = [],
      style,
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
      renderMarkerDetail,
      showBottomSheetOnPress = true,
      fitToMarkers = false,
      initialBounds,
      interactive = true,
    } = props

    const webViewRef = React.useRef<WebView>(null)
    const bridgeRef = React.useRef<MapBridge | null>(null)
    const [isReady, setIsReady] = React.useState(false)
    const [selectedMarker, setSelectedMarker] = React.useState<MarkerData | null>(null)

    // Conserver les derniers marqueurs/formes dans des refs pour comparer lors des mises à jour
    const prevMarkersRef = React.useRef<Record<string, MarkerData>>({})
    const prevPolylinesRef = React.useRef<Record<string, PolylineData>>({})
    const prevPolygonsRef = React.useRef<Record<string, PolygonData>>({})
    const prevCirclesRef = React.useRef<Record<string, CircleData>>({})

    /* ---------------- Construction du HTML avec les fournisseurs injectés ---------------- */
    const finalHtml = React.useMemo(() => {
      let html = typeof LEAFLET_HTML === 'string' ? LEAFLET_HTML : (LEAFLET_HTML as any).default ?? ''
      const providersJson = JSON.stringify(TILE_PROVIDERS)
      html = html
        .replace('var TILE_PROVIDERS = {};', `var TILE_PROVIDERS = ${providersJson};`)
        .replace('%TILE_PROVIDERS%', providersJson)
      return html
    }, [])

    /* ---------------- Fonction d'envoi de la config ---------------- */
    const sendInit = React.useCallback(() => {
      const mergedConfig = { ...DEFAULT_CONFIG, ...config }
      if (initialBounds) {
        mergedConfig.center = {
          lat: (initialBounds.northEast.lat + initialBounds.southWest.lat) / 2,
          lng: (initialBounds.northEast.lng + initialBounds.southWest.lng) / 2,
        }
      }

      if (__DEV__ && mergedConfig.userLocation) {
        if (mergedConfig.userLocation === true) {
          mergedConfig.userLocation = { mockLocation: mergedConfig.center }
        } else if (typeof mergedConfig.userLocation === 'object' && !mergedConfig.userLocation.mockLocation) {
          mergedConfig.userLocation.mockLocation = mergedConfig.center
        }
      }
      bridgeRef.current?.init(mergedConfig)
    }, [config, initialBounds])

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

      // La carte est prête → mettre à jour l'état et notifier le parent
      bridge.onReady = () => {
        setIsReady(true)
        onMapReady?.()
      }

      // Router les événements de carte vers les bons callbacks
      bridge.onEvent = (payload) => {
        if (payload.type === 'click' && onMapClick) {
          onMapClick(payload as MapClickEvent)
        } else if ((payload.type === 'longpress' || payload.type === 'contextmenu') && onMapLongPress) {
          onMapLongPress(payload as MapClickEvent)
        } else if (payload.type === 'move' && onMapMove) {
          onMapMove(payload as MapMoveEvent)
        } else if (payload.type === 'zoom' && onMapZoom) {
          onMapZoom(payload as MapZoomEvent)
        } else if (payload.type === 'tile-layer-change' && onTileLayerChange) {
          onTileLayerChange(payload.provider as TileProvider | string)
        }
      }

      // Appui sur un marqueur → enrichir avec les données du marqueur
      bridge.onMarkerPress = (payload: MarkerPressEvent) => {
        const marker = markers.find((m) => m.id === payload.markerId)
        const enriched = marker
          ? { ...payload, data: payload.data ?? marker.data }
          : payload
        onMarkerPress?.(enriched)

        // Afficher la bottom sheet si activé et que le marqueur existe
        if (showBottomSheetOnPress && marker) {
          setSelectedMarker(marker)
        }
      }

      // Drag d'un marqueur → notifier le parent
      bridge.onMarkerDrag = (payload) => {
        onMarkerDrag?.(payload.markerId, payload.position)
      }

      // Position utilisateur mise à jour → notifier le parent
      bridge.onUserLocation = (payload) => {
        onUserLocationChange?.(payload.location, payload.accuracy)
      }

      // Erreur depuis la WebView → notifier le parent
      bridge.onError = (error) => {
        onError?.(error)
      }

      // Relayer les logs console (visibles dans Metro en mode dev)
      bridge.onLog = (payload) => {
        if (__DEV__) {
          console.log('[leaflet-webview]', payload.level, payload.args?.join(' '))
        }
      }
    }, [sendInit, markers, onMapReady, onMapClick, onMapLongPress, onMapMove, onMapZoom, onMarkerPress, onMarkerDrag, onUserLocationChange, onTileLayerChange, onError, showBottomSheetOnPress])

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

    /* ---------------- Synchroniser les marqueurs quand la prop change ---------------- */
    React.useEffect(() => {
      if (!isReady || !markers) return

      const currentMap: Record<string, MarkerData> = {}
      const prevMap = prevMarkersRef.current
      const currentIds = new Set<string>()

      const added: MarkerData[] = []
      const updated: MarkerData[] = []

      for (const m of markers) {
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
            prev.data === m.data

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

      // Ajustement automatique des bornes aux marqueurs si demandé
      if (fitToMarkers && markers.length > 0) {
        const points = markers.map((m) => m.position)
        const bounds = computeBounds(points)
        if (bounds) {
          bridgeRef.current?.call('fitBounds', bounds, { padding: 60 })
        }
      }
    }, [markers, isReady, fitToMarkers])

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
    }, [polylines, isReady])

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
    }, [polygons, isReady])

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
    }, [circles, isReady])

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
        addMarker: (marker) => bridgeRef.current?.call('addMarker', marker),
        addMarkers: (markers) => bridgeRef.current?.call('addMarkers', markers),
        updateMarker: (id, updates) => bridgeRef.current?.call('updateMarker', id, updates),
        removeMarker: (id) => bridgeRef.current?.call('removeMarker', id),
        clearMarkers: () => bridgeRef.current?.call('clearMarkers'),
        addPolyline: (polyline) => bridgeRef.current?.call('addPolyline', polyline),
        removePolyline: (id) => bridgeRef.current?.call('removePolyline', id),
        addPolygon: (polygon) => bridgeRef.current?.call('addPolygon', polygon),
        removePolygon: (id) => bridgeRef.current?.call('removePolygon', id),
        addCircle: (circle) => bridgeRef.current?.call('addCircle', circle),
        removeCircle: (id) => bridgeRef.current?.call('removeCircle', id),
        openPopup: (markerId) => bridgeRef.current?.call('openPopup', markerId),
        closePopup: () => bridgeRef.current?.call('closePopup'),
        setTileLayer: (provider) => bridgeRef.current?.call('setTileLayer', provider),
        toggleLayer: (layerId, enabled) => bridgeRef.current?.call('toggleLayer', layerId, enabled),
        locate: () => bridgeRef.current?.call('locate'),
        stopLocate: () => bridgeRef.current?.call('stopLocate'),
        redraw: () => bridgeRef.current?.call('redraw'),
        clearAll: () => bridgeRef.current?.call('clearAll'),
      }),
      []
    )

    const WebViewComponent = WebView as any

    /* ---------------- Rendu ---------------- */
    return (
      <View style={[styles.container, style]} testID={testID}>
        <WebViewComponent
          ref={webViewRef}
          source={{ html: finalHtml, baseUrl: 'https://unpkg.com' }}
          style={styles.webview}
          onMessage={onMessage}
          onLoadEnd={onLoadEnd}
          onError={(e: any) => onError?.(new Error('WebView error: ' + e.nativeEvent?.description))}
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
          geolocationEnabled
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
