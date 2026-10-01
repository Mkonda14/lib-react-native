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

const KINSHASA: LatLng = { lat: -4.368694, lng: 15.289146 };

/** Minuscules sans accents — comparaison souple pour les suggestions. */
const normalizeText = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const INITIAL_MARKERS: MarkerData<{
  title: string;
  description: string;
  category: string;
  rating: string;
}>[] = [
  {
    id: "echangeur",
    position: { lat: -4.374205439098188, lng: 15.345256066542532 },
    variant: "transit",
    data: {
      title: "Echangeur de Limete",
      description: "Echangeur de Limete, un échangeur à Kinshasa.",
      category: "Echangeur",
      rating: "4.8",
    },
  },
  {
    id: "notre-dame",
    position: { lat: -4.323684724535177, lng: 15.2948701027723 },
    variant: "religious",
    data: {
      title: "Notre-Dame du Congo",
      description: "Cathédrale gothique du XIIe siècle, en cours de restauration.",
      category: "Édifice religieux",
      rating: "4.7",
    },
  },
  {
    id: "palais-du-peuple",
    position: { lat: -4.332254016261837, lng: 15.303109848950628 },
    variant: "building",
    data: {
      title: "Palais du peuple",
      description: "Palais du peuple, un palais à Kinshasa.",
      category: "Palais",
      rating: "4.9",
    },
  },
  {
    id: "maison-culture",
    position: { lat: -4.325529819004345, lng: 15.299596097129218 },
    variant: "museum",
    data: {
      title: "Maison de la culture",
      description: "Maison de la culture, un édifice à Kinshasa.",
      category: "Maison de la culture",
      rating: "4.8",
    },
  },
];

const ROUTE_POSITIONS: LatLng[] = [
  { lat: -4.374205439098188, lng: 15.345256066542532 },
  { lat: -4.323684724535177, lng: 15.2948701027723 },
  { lat: -4.332254016261837, lng: 15.303109848950628 },
  { lat: -4.325529819004345, lng: 15.299596097129218 },
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

  // ---- Event handlers ---------------------------------------------------

  const handleMapClick = useCallback((e: MapClickEvent) => {
    // Clic simple : ferme le modal de détails s'il est ouvert (comportement Google Maps)
    setSelectedMarker(null);
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
    },
    [addMarker]
  );

  const handleMarkerPress = useCallback((e: MarkerPressEvent<any>) => {
    setSelectedMarker({
      id: e.markerId,
      position: e.position,
      data: e.data,
    } as MarkerData);
  }, []);

  const handleCategorySelect = useCallback(
    (cat: CategoryChip) => {
      if (cat.id === "attractions") {
        map.flyTo(INITIAL_MARKERS[0].position, 15);
      }
    },
    [map]
  );

  const handleFlyToEchangeur = () => {
    map.flyTo({ lat: -4.374205439098188, lng: 15.345256066542532 }, 16, { duration: 1.2 });
  };

  const handleFlyToNotreDame = () => {
    map.flyTo({ lat: -4.323684724535177, lng: 15.2948701027723 }, 16, { duration: 1.2 });
  };

  const handleFitAll = () => {
    // Fit sur les 4 marqueurs de la démo (l'ancienne bounding box Paris
    // était héritée d'une autre démo).
    const lats = INITIAL_MARKERS.map((m) => m.position.lat);
    const lngs = INITIAL_MARKERS.map((m) => m.position.lng);
    map.fitBounds(
      {
        northEast: { lat: Math.max(...lats) + 0.01, lng: Math.max(...lngs) + 0.01 },
        southWest: { lat: Math.min(...lats) - 0.01, lng: Math.min(...lngs) - 0.01 },
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
        onFocusedChange={(f) => null
        }
        focusedContent={({ query, close }) => {
          const q = normalizeText(query.trim());
          const matches = INITIAL_MARKERS.filter(
            (m) =>
              !q ||
              normalizeText(
                `${m.data?.title ?? ""} ${m.data?.description ?? ""} ${
                  m.data?.category ?? ""
                }`
              ).includes(q)
          );
          return (
            <View
              style={[
                styles.suggestPanel,
                isDark && styles.suggestPanelDark,
              ]}
            >
              <Text
                style={[
                  styles.suggestHeader,
                  isDark && styles.suggestTextDark,
                ]}
              >
                {q ? `Résultats (${matches.length})` : "Suggestions"}
              </Text>

              {matches.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.suggestRow}
                  onPress={() => {
                    close();
                    map.flyTo(m.position, 16, { duration: 0.9 });
                  }}
                >
                  <Text style={styles.suggestRowIcon}>📍</Text>
                  <View style={styles.suggestRowBody}>
                    <Text
                      style={[
                        styles.suggestRowTitle,
                        isDark && styles.suggestTextDark,
                      ]}
                    >
                      {m.data?.title ?? m.id}
                    </Text>
                    <Text style={styles.suggestRowSub}>
                      {m.data?.category}
                      {m.data?.description ? ` · ${m.data.description}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.suggestRowChevron}>›</Text>
                </Pressable>
              ))}

              {matches.length === 0 && (
                <Text
                  style={[
                    styles.suggestEmpty,
                    isDark && styles.suggestSubDark,
                  ]}
                >
                  Aucun résultat pour «&nbsp;{query.trim()}&nbsp;»
                </Text>
              )}

              <Pressable
                style={[
                  styles.suggestFitAll,
                  isDark && styles.suggestFitAllDark,
                ]}
                onPress={() => {
                  close();
                  // Fit sur les marqueurs de la démo (handleFitAll historique
                  // cible une bounding box Paris héritée d'une autre démo).
                  const lats = INITIAL_MARKERS.map((m) => m.position.lat);
                  const lngs = INITIAL_MARKERS.map((m) => m.position.lng);
                  map.fitBounds(
                    {
                      northEast: {
                        lat: Math.max(...lats) + 0.01,
                        lng: Math.max(...lngs) + 0.01,
                      },
                      southWest: {
                        lat: Math.min(...lats) - 0.01,
                        lng: Math.min(...lngs) - 0.01,
                      },
                    },
                    { padding: 60, maxZoom: 14, animate: true }
                  );
                }}
              >
                <Text
                  style={[
                    styles.suggestFitAllText,
                    isDark && styles.suggestFitAllTextDark,
                  ]}
                >
                  ⌖ Tout afficher
                </Text>
              </Pressable>
            </View>
          );
        }}
      />

      {/* Main Google-style MapView */}
      <MapView
        ref={map.ref}
        config={{
          center: KINSHASA,
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
        onMapReady={() => {}}
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
        <Pressable style={styles.pillBtn} onPress={handleFlyToEchangeur}>
          <Text style={styles.pillIcon}>🗼</Text>
          <Text style={[styles.pillText, { color: isDark ? "#E8EAED" : "#202124" }]}>Echangeur</Text>
        </Pressable>
        <Pressable style={styles.pillBtn} onPress={handleFlyToNotreDame}>
          <Text style={styles.pillIcon}>⛪</Text>
          <Text style={[styles.pillText, { color: isDark ? "#E8EAED" : "#202124" }]}>Notre Dame</Text>
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
  // Chip de retour d'événement (démonstration onFocusedChange)
  eventChip: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    zIndex: 70,
  },
  eventChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // ---- Slot « suggestions » du GoogleSearchBar (mode focus) ---------------
  suggestPanel: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  suggestPanelDark: {
    backgroundColor: "#303134",
  },
  suggestHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5F6368",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  suggestRowIcon: {
    fontSize: 18,
  },
  suggestRowBody: {
    flex: 1,
  },
  suggestRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#202124",
  },
  suggestRowSub: {
    fontSize: 12,
    color: "#5F6368",
    marginTop: 2,
  },
  suggestRowChevron: {
    fontSize: 20,
    color: "#9AA0A6",
  },
  suggestEmpty: {
    fontSize: 14,
    color: "#5F6368",
    textAlign: "center",
    paddingVertical: 18,
  },
  suggestFitAll: {
    marginTop: 8,
    backgroundColor: "#E8F0FE",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  suggestFitAllDark: {
    backgroundColor: "#1E293B",
  },
  suggestFitAllText: {
    color: "#1A73E8",
    fontWeight: "600",
    fontSize: 14,
  },
  suggestFitAllTextDark: {
    color: "#8AB4F8",
  },
  suggestTextDark: {
    color: "#E8EAED",
  },
  suggestSubDark: {
    color: "#9AA0A6",
  },
});
