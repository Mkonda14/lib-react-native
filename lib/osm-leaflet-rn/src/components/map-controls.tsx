/**
 * MapControls — Boutons flottants haute visibilité style Google Maps
 * =======================================================================
 * Boutons flottants à contraste élevé, responsifs, avec des marges de sécurité
 * dynamiques (useSafeAreaInsets), des icônes vectorielles nettes (lucide-react-native)
 * et adaptabilité claire/sombre.
 */

import { Compass, Layers, Minus, Navigation, Plus } from "lucide-react-native";
import * as React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TILE_PROVIDERS } from "../config";
import type { MapRef, TileProvider } from "../types";

interface MapControlsProps {
  /** Référence de la carte (depuis useMap() ou useRef<MapRef>). */
  mapRef: React.RefObject<MapRef | null> | React.RefObject<MapRef> | any;
  /** Position des contrôles sur la carte. */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Afficher les boutons de zoom (+ / −). */
  showZoom?: boolean;
  /** Afficher le bouton de géolocalisation. */
  showLocate?: boolean;
  /** Afficher le bouton de changement de couche. */
  showLayerSwitcher?: boolean;
  /** Afficher la boussole. */
  showCompass?: boolean;
  /** Mode sombre. */
  isDark?: boolean;
  /** Style personnalisé des boutons. */
  buttonStyle?: ViewStyle;
  /** Couleur des icônes. */
  color?: string;
  /** Couleur de fond des boutons. */
  backgroundColor?: string;
  /** Appelé après le déclenchement de la géolocalisation. */
  onLocate?: () => void;
  /** Appelé quand la couche de tuiles change. */
  onLayerChange?: (provider: TileProvider | string) => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  mapRef,
  position = "bottom-right",
  showZoom = true,
  showLocate = true,
  showLayerSwitcher = true,
  showCompass = true,
  isDark = false,
  buttonStyle,
  color,
  backgroundColor,
  onLocate,
  onLayerChange,
}) => {
  const insets = useSafeAreaInsets();
  const [showLayers, setShowLayers] = React.useState(false);
  const [activeLayer, setActiveLayer] =
    React.useState<TileProvider>("carto-light");
  const [isLocating, setIsLocating] = React.useState(false);

  // Couleurs à contraste élevé
  const themeBg = backgroundColor ?? (isDark ? "#1E293B" : "#FFFFFF");
  const themeIconColor = color ?? (isDark ? "#F8FAFC" : "#0F172A");
  const themeBorderColor = isDark ? "#334155" : "#E2E8F0";

  // Calcul du décalage bas sécurisé (flotte au-dessus de la barre d'onglets du bas)
  const safeBottom = 84 + Math.max(insets.bottom, 12);

  const positionStyle: ViewStyle = {
    position: "absolute",
    ...(position === "top-right" && {
      top: Math.max(insets.top, 16) + 70,
      right: 16,
    }),
    ...(position === "top-left" && {
      top: Math.max(insets.top, 16) + 70,
      left: 16,
    }),
    ...(position === "bottom-right" && { bottom: safeBottom, right: 16 }),
    ...(position === "bottom-left" && { bottom: safeBottom, left: 16 }),
    zIndex: 95,
  };

  const handleZoomIn = () => mapRef.current?.zoomIn({ animate: true });
  const handleZoomOut = () => mapRef.current?.zoomOut({ animate: true });

  const handleLocate = () => {
    setIsLocating(true);
    mapRef.current?.locate();
    onLocate?.();
    setTimeout(() => setIsLocating(false), 2500);
  };

  const handleLayerSelect = (provider: TileProvider) => {
    setActiveLayer(provider);
    mapRef.current?.setTileLayer(provider);
    onLayerChange?.(provider);
    setShowLayers(false);
  };

  const handleCompassPress = () => {
    mapRef.current?.moveTo({ lat: 48.8566, lng: 2.3522 }, 13, {
      animate: true,
    });
  };

  return (
    <View style={positionStyle} pointerEvents="box-none">
      {/* Panneau popover du sélecteur de couche */}
      {showLayerSwitcher && showLayers && (
        <View
          style={[
            styles.layerModal,
            { backgroundColor: themeBg, borderColor: themeBorderColor },
          ]}
        >
          <View style={styles.layerModalHeader}>
            <Layers color="#1A73E8" size={18} strokeWidth={2.4} />
            <Text
              style={[
                styles.layerModalTitle,
                { color: isDark ? "#F8FAFC" : "#0F172A" },
              ]}
            >
              Type de carte
            </Text>
          </View>
          <View style={styles.layerGrid}>
            {Object.keys(TILE_PROVIDERS)
              .filter((p) => p !== "custom")
              .map((provider) => {
                const isActive = activeLayer === provider;
                return (
                  <Pressable
                    key={provider}
                    style={({ pressed }) => [
                      styles.layerCard,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        borderColor: themeBorderColor,
                      },
                      isActive && styles.layerCardActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleLayerSelect(provider as TileProvider)}
                  >
                    <Text style={styles.layerIconBadge}>
                      {getLayerBadge(provider as TileProvider)}
                    </Text>
                    <Text
                      style={[
                        styles.layerName,
                        {
                          color: isActive
                            ? "#1A73E8"
                            : isDark
                              ? "#F8FAFC"
                              : "#334155",
                        },
                        isActive && { fontWeight: "700" },
                      ]}
                      numberOfLines={1}
                    >
                      {formatProviderName(provider as TileProvider)}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
        </View>
      )}

      {/* Groupe de boutons d'action flottants empilés */}
      <View style={styles.buttonColumn} pointerEvents="box-none">

        <View  style={[
              styles.zoomStack, styles.buttonColumn,
              { backgroundColor: themeBg, borderColor: themeBorderColor },
            ]} pointerEvents="box-none">
        {/* Sélecteur de couche */}
        {showLayerSwitcher && (
          <ControlButton
            onPress={() => setShowLayers(!showLayers)}
            backgroundColor={themeBg}
            borderColor={themeBorderColor}
            style={buttonStyle}
            active={showLayers}
          >
            <Layers
              color={showLayers ? "#1A73E8" : themeIconColor}
              size={22}
              strokeWidth={2.4}
            />
          </ControlButton>
        )}

          <View
              style={[
                styles.zoomDivider,
                { backgroundColor: themeBorderColor },
              ]}
            />

        {/* Boussole / Recentrage */}
        {showCompass && (
          <ControlButton
            onPress={handleCompassPress}
            backgroundColor={themeBg}
            borderColor={themeBorderColor}
            style={buttonStyle}
          >
            <Compass color={themeIconColor} size={22} strokeWidth={2.4} />
          </ControlButton>
        )}
  <View
              style={[
                styles.zoomDivider,
                { backgroundColor: themeBorderColor },
              ]}
            />
        {/* Géolocalisation GPS */}
        {showLocate && (
          <ControlButton
            onPress={handleLocate}
            backgroundColor={themeBg}
            borderColor={themeBorderColor}
            style={buttonStyle}
            active={isLocating}
          >
            <Navigation
              color={isLocating ? "#1A73E8" : themeIconColor}
              size={22}
              strokeWidth={2.4}
              fill={isLocating ? "#1A73E8" : "transparent"}
            />
          </ControlButton>
        )}

        </View>

        {/* Groupe Zoom (+ / −) */}
        {showZoom && (
          <View
            style={[
              styles.zoomStack,
              { backgroundColor: themeBg, borderColor: themeBorderColor },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && styles.zoomPressed,
              ]}
              onPress={handleZoomIn}
              accessibilityLabel="Zoom avant"
              accessibilityRole="button"
            >
              <Plus color={themeIconColor} size={22} strokeWidth={2.6} />
            </Pressable>

            <View
              style={[
                styles.zoomDivider,
                { backgroundColor: themeBorderColor },
              ]}
            />

            <Pressable
              style={({ pressed }) => [
                styles.zoomBtn,
                pressed && styles.zoomPressed,
              ]}
              onPress={handleZoomOut}
              accessibilityLabel="Zoom arrière"
              accessibilityRole="button"
            >
              <Minus color={themeIconColor} size={22} strokeWidth={2.6} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const ControlButton: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  backgroundColor: string;
  borderColor?: string;
  style?: ViewStyle;
  active?: boolean;
}> = ({ children, onPress, backgroundColor, borderColor, style, active }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.floatingBtn,
      {
        backgroundColor,
        borderColor: active ? "#1A73E8" : (borderColor ?? "transparent"),
      },
      active && styles.activeBtn,
      pressed && styles.pressed,
      style,
    ]}
  >
    {children}
  </Pressable>
);

function getLayerBadge(p: TileProvider): string {
  const icons: Record<string, string> = {
    "osm-standard": "🗺️",
    "osm-hot": "🔥",
    "carto-light": "☀️",
    "carto-dark": "🌙",
    "carto-voyager": "🧭",
    "stamen-terrain": "🏔️",
    "stamen-toner": "🎨",
    "esri-satellite": "🛰️",
    "esri-streets": "🏙️",
    opentopomap: "🗺️",
  };
  return icons[p] ?? "🗺️";
}

function formatProviderName(p: TileProvider): string {
  const names: Record<string, string> = {
    "osm-standard": "Standard",
    "osm-hot": "Humanitaire",
    "carto-light": "Clair",
    "carto-dark": "Sombre",
    "carto-voyager": "Voyager",
    "stamen-terrain": "Relief",
    "stamen-toner": "Toner",
    "esri-satellite": "Satellite",
    "esri-streets": "Rues",
    opentopomap: "Topo",
  };
  return names[p] ?? p;
}

const styles = StyleSheet.create({
  buttonColumn: {
    alignItems: "center",
    gap: 6,
  },
  floatingBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  activeBtn: {
    borderWidth: 2,
    borderColor: "#1A73E8",
    backgroundColor: "#E8F0FE",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.93 }],
  },
  zoomStack: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  zoomBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomPressed: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    transform: [{ scale: 0.93 }],
  },
  zoomDivider: {
    height: 1.5,
    width: 20,
    alignSelf: "center",
  },
  layerModal: {
    position: "absolute",
    right: 0,
    bottom: 64,
    width: 260,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 200,
  },
  layerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  layerModalTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  layerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  layerCard: {
    width: "47%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
  },
  layerCardActive: {
    borderColor: "#1A73E8",
    backgroundColor: "#E8F0FE",
  },
  layerIconBadge: {
    fontSize: 15,
  },
  layerName: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
});
