/**
 * MapControls — Boutons flottants haute visibilité style Google Maps
 * =======================================================================
 * Boutons flottants à contraste élevé, responsifs, avec des marges de sécurité
 * dynamiques (useSafeAreaInsets), des icônes vectorielles nettes (lucide-react-native)
 * et adaptabilité clair/sombre.
 *
 * Le sélecteur de fond de carte est délégué à `LayerPickerPopover`
 * (grille 3 colonnes, défini dans bottom-sheet.tsx) :
 *  - Apparition animée (fade + translate + scale via Reanimated)
 *  - Fermeture par tap extérieur (backdrop animé, géré ici)
 */

import { Compass, Layers, Minus, Navigation, Plus } from "lucide-react-native";
import * as React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DEFAULT_CONFIG } from "../config";
import { LayerPickerPopover } from "../bottom-sheet";
import type { MapRef, TileProvider } from "../types";

// Pressable animé pour le backdrop (Reanimated exige createAnimatedComponent)
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MapControlsProps {
  /** Référence de la carte (depuis useMap() ou useRef<MapRef>). */
  mapRef: React.RefObject<MapRef | null> | React.RefObject<MapRef>;
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
  // Couche active initialisée depuis la config par défaut de la carte
  const [activeLayer, setActiveLayer] = React.useState<TileProvider>(
    (DEFAULT_CONFIG.tileProvider as TileProvider) || "osm-standard"
  );
  const [isLocating, setIsLocating] = React.useState(false);

  // Couleurs à contraste élevé
  const themeBg = backgroundColor ?? (isDark ? "#1E293B" : "#FFFFFF");
  const themeIconColor = color ?? (isDark ? "#F8FAFC" : "#0F172A");
  const themeBorderColor = isDark ? "#334155" : "#E2E8F0";

  // Calcul du décalage bas sécurisé (flotte au-dessus de la barre d'onglets du bas)
  const safeBottom = 84 + Math.max(insets.bottom, 12);

  /* ---------------- Animation du backdrop ---------------- */
  // Opacité du backdrop (0 fermé → 1 ouvert, multipliée dans le style)
  const backdrop = useSharedValue(0);

  React.useEffect(() => {
    const duration = showLayers ? 200 : 150;
    const easing = Easing.out(Easing.cubic);
    backdrop.value = withTiming(showLayers ? 1 : 0, { duration, easing });
  }, [showLayers, backdrop]);

  // Backdrop : fondu jusqu'à 32 % d'opacité
  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * 0.32,
  }));

  /* ---------------- Ancrage dans le coin choisi ---------------- */
  const anchorStyle: ViewStyle = {
    position: "absolute",
    ...(position === "top-right" && {
      top: Math.max(insets.top, 16) + 70,
      right: 16,
    }),
    ...(position === "top-left" && {
      top: Math.max(insets.top, 16) + 70,
      left: 16,
    }),
    ...(position === "bottom-right" && { bottom: safeBottom + 100, right: 16 }),
    ...(position === "bottom-left" && { bottom: safeBottom, left: 16 }),
  };

  // Alignement transversal de la colonne (selon le côté choisi)
  const anchorAlignment: ViewStyle = {
    alignItems: position.endsWith("right") ? "flex-end" : "flex-start",
    gap: 8,
  };

  const handleZoomIn = () => mapRef.current?.zoomIn({ animate: true });
  const handleZoomOut = () => mapRef.current?.zoomOut({ animate: true });

  const handleLocate = () => {
    setIsLocating(true);
    mapRef.current?.locate();
    onLocate?.();
    setTimeout(() => setIsLocating(false), 2500);
  };

  const handleLayerSelect = (provider: string) => {
    setActiveLayer(provider as TileProvider);
    mapRef.current?.setTileLayer(provider);
    onLayerChange?.(provider);
    setShowLayers(false);
  };

  const handleCompassPress = () => {
    // Boussole / Recentrage : revenir à la vue par défaut de la carte
    // (l'ancien placeholder visait des coordonnées Paris héritées d'une démo).
    mapRef.current?.moveTo(DEFAULT_CONFIG.center, DEFAULT_CONFIG.zoom, {
      animate: true,
    });
  };

  /* ---------------- Sélecteur de fond de carte ---------------- */
  const popoverNode = showLayerSwitcher && (
    <LayerPickerPopover
      visible={showLayers}
      activeProvider={activeLayer}
      onSelect={handleLayerSelect}
      isDark={isDark}
      direction={position.startsWith("top") ? "top" : "bottom"}
      // L'ancrage vertical est géré par le flux (colonnes) : le panneau
      // se positionne naturellement au-dessus (bottom) / en dessous (top)
      // des boutons, et aligné transversalement par le parent.
      style={
        position.endsWith("right")
          ? { alignSelf: "flex-end" }
          : { alignSelf: "flex-start" }
      }
    />
  );

  return (
    // Racine plein écran : capte le tap extérieur quand ouvert,
    // laisse passer les touches de la carte quand fermé (box-none)
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 95 }]}
      pointerEvents={showLayers ? "auto" : "box-none"}
    >
      {/* Backdrop : ferme le popover en touchant hors du panneau */}
      {showLayerSwitcher && (
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, backdropAnimStyle]}
          onPress={() => setShowLayers(false)}
          pointerEvents={showLayers ? "auto" : "none"}
          accessibilityLabel="Fermer le sélecteur de carte"
          accessibilityRole="button"
        />
      )}

      {/* Colonne ancrée dans le coin choisi */}
      <View style={[anchorStyle, anchorAlignment]} pointerEvents="box-none">
        {/* Positions bottom : popover au-dessus des boutons */}
        {position.startsWith("bottom") && popoverNode}

        {/* Groupe de boutons d'action flottants empilés */}
        <View style={styles.buttonColumn} pointerEvents="box-none">
          <View
            style={[
              styles.zoomStack,
              styles.buttonColumn,
              { backgroundColor: themeBg, borderColor: themeBorderColor },
            ]}
            pointerEvents="box-none"
          >
            {/* Sélecteur de couche */}
            {showLayerSwitcher && (
              <ControlButton
                onPress={() => setShowLayers(!showLayers)}
                backgroundColor={themeBg}
                borderColor={themeBorderColor}
                style={buttonStyle}
                active={showLayers}
                accessibilityLabel="Choisir le type de carte"
                accessibilityExpanded={showLayers}
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

        {/* Positions top : popover en dessous des boutons */}
        {position.startsWith("top") && popoverNode}
      </View>
    </View>
  );
};

/* ------------------------------------------------------------------ *
 * Bouton de contrôle flottant (rond, état actif bleu)
 * ------------------------------------------------------------------ */

const ControlButton: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  backgroundColor: string;
  borderColor?: string;
  style?: ViewStyle;
  active?: boolean;
  accessibilityLabel?: string;
  accessibilityExpanded?: boolean;
}> = ({
  children,
  onPress,
  backgroundColor,
  borderColor,
  style,
  active,
  accessibilityLabel,
  accessibilityExpanded,
}) => (
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
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={
      accessibilityExpanded !== undefined
        ? { expanded: accessibilityExpanded }
        : undefined
    }
  >
    {children}
  </Pressable>
);

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
});
