import { useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  MapView,
  MapControls,
  GoogleSearchBar,
  BottomSheet,
  useMap,
  useMarkers,
  getMarkerIconHtml,
} from "@your-org/osm-leaflet-rn";
import type {
  MarkerData,
  MarkerPressEvent,
  MapClickEvent,
  MapMoveEvent,
  MapZoomEvent,
  LatLng,
  CategoryChip,
} from "@your-org/osm-leaflet-rn";

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const PARIS: LatLng = { lat: 48.8566, lng: 2.3522 };

const INITIAL_MARKERS: MarkerData<{
  title: string;
  description: string;
  category: string;
  rating: string;
}>[] = [
  {
    id: "tour-eiffel",
    position: { lat: 48.8584, lng: 2.2945 },
    iconHtml: getMarkerIconHtml("pin", "#EA4335", 36),
    iconSize: { width: 36, height: 50 },
    iconAnchor: { x: 18, y: 50 },
    data: {
      title: "Tour Eiffel",
      description: "Monument emblématique de Paris, haut de 330 mètres.",
      category: "Monument historique",
      rating: "4.8",
    },
  },
  {
    id: "notre-dame",
    position: { lat: 48.853, lng: 2.3499 },
    iconHtml: getMarkerIconHtml("pin", "#1A73E8", 34),
    iconSize: { width: 34, height: 48 },
    iconAnchor: { x: 17, y: 48 },
    data: {
      title: "Notre-Dame de Paris",
      description: "Cathédrale gothique du XIIe siècle, en cours de restauration.",
      category: "Édifice religieux",
      rating: "4.7",
    },
  },
  {
    id: "sacre-coeur",
    position: { lat: 48.8867, lng: 2.3431 },
    iconHtml: getMarkerIconHtml("star", "#FBBC04", 34),
    iconSize: { width: 34, height: 34 },
    iconAnchor: { x: 17, y: 17 },
    data: {
      title: "Sacré-Cœur",
      description: "Basilique romano-byzantine dominant Montmartre.",
      category: "Basilique",
      rating: "4.9",
    },
  },
  {
    id: "louvre",
    position: { lat: 48.8606, lng: 2.3376 },
    iconHtml: getMarkerIconHtml("square", "#34A853", 32),
    iconSize: { width: 32, height: 32 },
    iconAnchor: { x: 16, y: 16 },
    data: {
      title: "Musée du Louvre",
      description: "Plus grand musée du monde, 35 000 œuvres exposées.",
      category: "Musée d'art",
      rating: "4.8",
    },
  },
];

const ROUTE_POSITIONS: LatLng[] = [
  { lat: 48.8584, lng: 2.2945 },
  { lat: 48.86, lng: 2.32 },
  { lat: 48.8606, lng: 2.3376 },
  { lat: 48.853, lng: 2.3499 },
];

export default function MapTestScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const safeBottom = 84 + Math.max(insets.bottom, 12);

  const map = useMap();
  const { markers, addMarker, removeMarker } = useMarkers(INITIAL_MARKERS);

  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  // ---- Event handlers ---------------------------------------------------

  const handleMapReady = useCallback(() => {
    setLastEvent("Carte Google Maps prête");
  }, []);

  const handleMapClick = useCallback((e: MapClickEvent) => {
    // Clic simple : ferme le modal de détails s'il est ouvert (comportement Google Maps)
    setSelectedMarker(null);
    setLastEvent(`Clic: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
  }, []);

  const handleMapLongPress = useCallback(
    (e: MapClickEvent) => {
      // Appui long : place un nouveau repère (pin) et ouvre son modal de détails
      const id = `pin-${Date.now()}`;
      const newM: MarkerData = {
        id,
        position: e.latlng,
        iconHtml: getMarkerIconHtml("pin", "#EA4335", 36),
        iconSize: { width: 36, height: 50 },
        iconAnchor: { x: 18, y: 50 },
        data: {
          title: "Repère placé",
          description: `Coordonnées: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
          category: "Emplacement personnalisé",
          rating: "5.0",
        },
      };
      addMarker(newM);
      setSelectedMarker(newM);
      setLastEvent(`Repère placé: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
    },
    [addMarker]
  );

  const handleMarkerPress = useCallback((e: MarkerPressEvent<any>) => {
    setSelectedMarker({
      id: e.markerId,
      position: e.position,
      data: e.data,
    } as MarkerData);
    setLastEvent(`Marqueur: ${e.data?.title ?? e.markerId}`);
  }, []);

  const handleCategorySelect = useCallback(
    (cat: CategoryChip) => {
      setLastEvent(`Filtre: ${cat.label}`);
      if (cat.id === "attractions") {
        map.flyTo({ lat: 48.8584, lng: 2.2945 }, 15);
      }
    },
    [map]
  );

  const handleFlyToEiffel = () => {
    map.flyTo({ lat: 48.8584, lng: 2.2945 }, 16, { duration: 1.2 });
  };

  const handleFlyToSacréCoeur = () => {
    map.flyTo({ lat: 48.8867, lng: 2.3431 }, 16, { duration: 1.2 });
  };

  const handleFitAll = () => {
    map.fitBounds(
      {
        northEast: { lat: 48.89, lng: 2.36 },
        southWest: { lat: 48.85, lng: 2.29 },
      },
      { padding: 60, maxZoom: 14, animate: true }
    );
  };

  return (
    <View style={styles.root}>
      {/* Google Floating Search & Category Header */}
      <GoogleSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onCategorySelect={handleCategorySelect}
        isDark={isDark}
      />

      {/* Main Google-style MapView */}
      <MapView
        ref={map.ref}
        config={{
          center: PARIS,
          zoom: 13,
          tileProvider: isDark ? "osm-hot" : "osm-standard",
          zoomControl: false,
          clustering: false,
          userLocation: true,
          theme: isDark ? "dark" : "light",
        }}
        markers={markers}
        polylines={[
          {
            id: "route",
            positions: ROUTE_POSITIONS,
            color: "#1A73E8",
            weight: 5,
            opacity: 0.85,
          },
        ]}
        circles={[
          {
            id: "eiffel-radius",
            center: { lat: 48.8584, lng: 2.2945 },
            radius: 500,
            color: "#1A73E8",
            fillColor: "#1A73E8",
            fillOpacity: 0.1,
            weight: 1.5,
          },
        ]}
        fitToMarkers
        showBottomSheetOnPress={false}
        onMapReady={handleMapReady}
        onMapClick={handleMapClick}
        onMapLongPress={handleMapLongPress}
        onMarkerPress={handleMarkerPress}
        style={styles.map}
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

      {/* Floating Action Pill Bar */}
      <View
        style={[
          styles.floatingPillBar,
          {
            bottom: safeBottom,
            backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
            borderColor: isDark ? "#334155" : "#E2E8F0",
          },
        ]}
      >
        <Pressable style={styles.pillBtn} onPress={handleFlyToEiffel}>
          <Text style={styles.pillIcon}>🗼</Text>
          <Text style={[styles.pillText, { color: isDark ? "#E8EAED" : "#202124" }]}>Eiffel</Text>
        </Pressable>
        <Pressable style={styles.pillBtn} onPress={handleFlyToSacréCoeur}>
          <Text style={styles.pillIcon}>⛪</Text>
          <Text style={[styles.pillText, { color: isDark ? "#E8EAED" : "#202124" }]}>Sacré-Cœur</Text>
        </Pressable>
        <Pressable style={styles.pillBtn} onPress={handleFitAll}>
          <Text style={styles.pillIcon}>🔍</Text>
          <Text style={[styles.pillText, { color: isDark ? "#E8EAED" : "#202124" }]}>Vue global</Text>
        </Pressable>
      </View>

      {/* Google Maps Place Card Details BottomSheet */}
      {selectedMarker && (
        <BottomSheet
          marker={selectedMarker}
          onClose={() => setSelectedMarker(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  map: {
    flex: 1,
  },
  floatingPillBar: {
    position: "absolute",
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 80,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.04)",
    gap: 4,
  },
  pillIcon: {
    fontSize: 14,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
