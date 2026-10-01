/**
 * BottomSheet — modale glissable pour les détails de marqueur
 * ==============================================================
 * Bottom sheet performante avec :
 *  - Glisser vers le haut pour déplier (3 points d'ancrage : réduit, demi, pleine)
 *  - Glisser vers le bas pour fermer
 *  - Fond flouté (backdrop)
 *  - Animations spring fluides (Reanimated 3)
 *  - Poignée de glissement
 *  - Retour haptique lors du snapping
 *
 * Utilisée par MapView pour afficher les détails d'un marqueur au clic.
 * Peut aussi être utilisée seule avec du contenu personnalisé.
 */
/* eslint-disable react-hooks/exhaustive-deps, react-hooks/immutability */

import * as React from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Text,
  ScrollView,
  Modal,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { Layers } from 'lucide-react-native'
import { TILE_PROVIDERS } from './config'
import type { BottomSheetProps, LayerPickerPopoverProps, MarkerData, TileProvider } from './types'

// Dégradé optionnel (peerDependency) — pattern lazy require du projet.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LinearGradient = require('expo-linear-gradient').LinearGradient

// Hauteur de l'écran — utilisée pour calculer les positions de snapping
const SCREEN_HEIGHT = Dimensions.get('window').height

// Configuration de l'animation spring (ressort)
const SPRING_CONFIG = {
  damping: 30,
  stiffness: 300,
  mass: 0.7,
}

export const BottomSheet = React.memo(function BottomSheet(
  props: BottomSheetProps
) {
  const {
    marker,
    renderContent,
    onClose,
    snapPoints,
    initialSnapIndex = 0,
    style,
    animationDuration = 300,
    backdropOpacity = 0.4,
    dismissOnBackdrop = true,
    showHandle = true,
    renderHandle,
  } = props

  // La sheet est visible si un marqueur est fourni
  const visible = marker !== null
  const [modalVisible, setModalVisible] = React.useState(visible)

  // Positions Y d'ancrage (translateY = SCREEN_HEIGHT * (1 - ratio))
  const snapHeights = React.useMemo(() => {
    const raw = snapPoints && snapPoints.length > 0 ? snapPoints : [0.25, 0.55, 0.9]
    return raw.map((p) => {
      if (p <= 1) {
        return Math.round(SCREEN_HEIGHT * (1 - p))
      }
      return Math.max(0, Math.round(SCREEN_HEIGHT - p))
    })
  }, [snapPoints])

  const defaultTranslateY = snapHeights[Math.min(initialSnapIndex, snapHeights.length - 1)] ?? snapHeights[0]

  // Shared values Reanimated
  const translateY = useSharedValue(SCREEN_HEIGHT)
  const backdropOpacityValue = useSharedValue(0)
  const currentSnap = useSharedValue(initialSnapIndex)
  const contextY = useSharedValue(0)

  // Animation de fermeture fluide puis notification de fin
  const animateClose = React.useCallback(() => {
    'worklet'
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(setModalVisible)(false)
          if (onClose) {
            runOnJS(onClose)()
          }
        }
      }
    )
    backdropOpacityValue.value = withTiming(0, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    })
  }, [animationDuration, onClose, translateY, backdropOpacityValue])

  // React à la modification du prop `visible`
  React.useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ouverture du Modal synchronisée à la prop visible
      setModalVisible(true)
      currentSnap.value = initialSnapIndex
      translateY.value = withSpring(defaultTranslateY, SPRING_CONFIG)
      backdropOpacityValue.value = withTiming(backdropOpacity, {
        duration: animationDuration,
      })
    } else if (modalVisible) {
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        {
          duration: animationDuration,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setModalVisible)(false)
          }
        }
      )
      backdropOpacityValue.value = withTiming(0, {
        duration: animationDuration,
      })
    }
  }, [visible, defaultTranslateY, initialSnapIndex, backdropOpacity, animationDuration])

  // Déclencher un retour haptique
  const fireHaptic = React.useCallback((intensity: 'light' | 'medium' | 'heavy') => {
    if (Platform.OS === 'web') return
    try {
      const hStyle =
        intensity === 'heavy'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : intensity === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      Haptics.impactAsync(hStyle)
    } catch {}
  }, [])

  /* ---------------- Geste de glissement (pan) ---------------- */
  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          'worklet'
          contextY.value = translateY.value
        })
        .onUpdate((e) => {
          'worklet'
          const next = contextY.value + e.translationY
          const maxSnap = snapHeights[snapHeights.length - 1] // point le plus haut
          translateY.value = Math.min(Math.max(next, maxSnap), SCREEN_HEIGHT)
        })
        .onEnd((e) => {
          'worklet'
          const current = translateY.value
          const velocity = e.velocityY
          const lowestSnap = snapHeights[0]

          // Glissement rapide vers le bas ou sous le seuil minimum → fermer proprement
          if (velocity > 600 || current > lowestSnap + 60) {
            animateClose()
            return
          }

          // Trouver le snap le plus proche
          let targetIndex = 0
          let minDistance = Infinity
          snapHeights.forEach((h, i) => {
            const d = Math.abs(current - h)
            if (d < minDistance) {
              minDistance = d
              targetIndex = i
            }
          })

          // Vélocité vers le haut ou bas
          if (velocity < -500 && targetIndex < snapHeights.length - 1) {
            targetIndex += 1
          } else if (velocity > 500 && targetIndex > 0) {
            targetIndex -= 1
          }

          currentSnap.value = targetIndex
          translateY.value = withSpring(snapHeights[targetIndex], SPRING_CONFIG)
          runOnJS(fireHaptic)('light')
        }),
    [snapHeights, animateClose, fireHaptic]
  )

  const handleBackdropPress = React.useCallback(() => {
    if (dismissOnBackdrop) {
      animateClose()
    }
  }, [dismissOnBackdrop, animateClose])

  /* ---------------- Styles animés ---------------- */
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityValue.value,
  }))

  if (!modalVisible) return null

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={dismissOnBackdrop ? handleBackdropPress : undefined}
    >
      <GestureHandlerRootView style={styles.rootView}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Fond flouté (backdrop) */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: '#000000' },
                backdropStyle,
              ]}
            />
          </Pressable>

          {/* Bottom sheet avec GestureDetector */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.sheet,
                { height: SCREEN_HEIGHT },
                sheetStyle,
                style,
              ]}
            >
              {/* Poignée de glissement */}
              {showHandle && (
                <View style={styles.handleContainer}>
                  {renderHandle ? renderHandle() : <View style={styles.handle} />}
                </View>
              )}

              {/* Contenu */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
                {marker && renderContent ? (
                  renderContent(marker)
                ) : (
                  <DefaultMarkerContent marker={marker} onClose={animateClose} />
                )}
              </KeyboardAvoidingView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
})

BottomSheet.displayName = 'BottomSheet'

/* ------------------------------------------------------------------ *
 * LayerPickerPopover — sélecteur de fond de carte (grille 3 colonnes)
 * ------------------------------------------------------------------ *
 * Panneau flottant affichant les couches de tuiles sous forme d'une
 * grille de vignettes carrées (3 par ligne) avec le nom en dessous.
 *
 * Animation interne pilotée par `visible` : fade + glissement vertical
 * (±8px selon `direction`) + scale 0.96 → 1. Le backdrop appartien au
 * parent (MapControls), qui détient la racine plein écran.
 */

export const LayerPickerPopover = React.memo(function LayerPickerPopover(
  props: LayerPickerPopoverProps
) {
  const {
    visible,
    activeProvider,
    providers,
    onSelect,
    isDark = false,
    direction = 'bottom',
    title = 'Type de carte',
    style,
  } = props

  // Liste des couches affichées (hors « custom » par défaut)
  const layerProviders = React.useMemo(
    () => providers ?? Object.keys(TILE_PROVIDERS).filter((p) => p !== 'custom'),
    [providers]
  )

  // Progression d'ouverture (0 fermé → 1 ouvert)
  const open = useSharedValue(0)

  React.useEffect(() => {
    const duration = visible ? 200 : 150
    open.value = withTiming(visible ? 1 : 0, {
      duration,
      easing: Easing.out(Easing.cubic),
    })
  }, [visible, open])

  // Panel : fade + glissement ±8px (selon le sens d'ouverture) + scale
  const popoverAnimStyle = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [
      { translateY: (1 - open.value) * (direction === 'top' ? -8 : 8) },
      { scale: 0.96 + open.value * 0.04 },
    ],
  }))

  return (
    <Animated.View
      style={[layerStyles.popover, popoverAnimStyle, style]}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      {/* En-tête : badge + titre + sous-titre */}
      <View style={layerStyles.popoverHeader}>
        <View
          style={[
            layerStyles.headerBadge,
            { backgroundColor: isDark ? 'rgba(26, 115, 232, 0.20)' : '#E8F0FE' },
          ]}
        >
          <Layers color="#1A73E8" size={16} strokeWidth={2.6} />
        </View>
        <View style={layerStyles.headerTexts}>
          <Text
            style={[
              layerStyles.popoverTitle,
              { color: isDark ? '#74A3B8' : '#64748B' },
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              layerStyles.popoverSubtitle,
              { color: isDark ? '#94A3B8' : '#64748B' },
            ]}
          >
            Fond de carte
          </Text>
        </View>
      </View>

      <View
        style={[
          layerStyles.headerDivider,
          { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
        ]}
      />

      {/* Grille 3 colonnes (défilable sur petits écrans) */}
      <ScrollView
        style={layerStyles.gridScroll}
        contentContainerStyle={layerStyles.gridContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {layerProviders.map((provider) => {
          const isActive = activeProvider === provider
          return (
            <Pressable
              key={provider}
              style={({ pressed }) => [
                layerStyles.gridCell,
                pressed && layerStyles.gridCellPressed,
              ]}
              onPress={() => onSelect?.(provider)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={formatProviderName(provider as TileProvider)}
            >
              {/* Vignette carrée avec contour bleu si active */}
              <LayerSwatch provider={provider as TileProvider} active={isActive} />
              <Text
                style={[
                  layerStyles.cellLabel,
                  {
                    color: isActive
                      ? '#1A73E8'
                      : isDark
                        ? '#CBD5E1'
                        : '#475569',
                  },
                  isActive && layerStyles.cellLabelActive,
                ]}
                numberOfLines={1}
              >
                {formatProviderName(provider as TileProvider)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </Animated.View>
  )
})

LayerPickerPopover.displayName = 'LayerPickerPopover'

/* ------------------------------------------------------------------ *
 * Vignette colorée d'une couche de tuiles (contour bleu si active)
 * ------------------------------------------------------------------ */

const LayerSwatch: React.FC<{ provider: TileProvider; active?: boolean }> = ({
  provider,
  active,
}) => {
  const [from, to] = getLayerSwatch(provider)
  const emoji = getLayerBadge(provider)
  const outline = { borderColor: active ? '#1A73E8' : 'rgba(0, 0, 0, 0.12)' }

  if (LinearGradient) {
    return (
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[layerStyles.swatch, outline, active && layerStyles.swatchActive]}
      >
        <Text style={layerStyles.swatchEmoji}>{emoji}</Text>
      </LinearGradient>
    )
  }
  return (
    <View style={[layerStyles.swatch, { backgroundColor: from }, outline, active && layerStyles.swatchActive]}>
      <Text style={layerStyles.swatchEmoji}>{emoji}</Text>
    </View>
  )
}

/**
 * Palette [départ, arrivée] du dégradé de chaque provider,
 * choisie pour évoquer visuellement le rendu de la couche.
 */
function getLayerSwatch(p: TileProvider): [string, string] {
  const swatches: Record<string, [string, string]> = {
    'osm-standard': ['#9FC5E8', '#D9EAD3'],
    'osm-hot': ['#F4A6A6', '#F7D9A0'],
    'esri-satellite': ['#1B4332', '#2563A0'],
    'esri-streets': ['#E8E4DC', '#CBD5E1'],
    opentopomap: ['#EDE3CF', '#BFD3B8'],
  }
  return swatches[p] ?? ['#9FC5E8', '#D9EAD3']
}

/** Emoji associé à chaque provider (fallback 🗺️). */
function getLayerBadge(p: TileProvider): string {
  const icons: Record<string, string> = {
    'osm-standard': '🗺️',
    'osm-hot': '🔥',
    'esri-satellite': '🛰️',
    'esri-streets': '🏙️',
    opentopomap: '🗺️',
  }
  return icons[p] ?? '🗺️'
}

/** Nom lisible d'un provider de tuiles. */
function formatProviderName(p: TileProvider): string {
  const names: Record<string, string> = {
    'osm-standard': 'Standard',
    'osm-hot': 'Humanitaire',
    'esri-satellite': 'Satellite',
    'esri-streets': 'Rues',
    opentopomap: 'Topo',
  }
  return names[p] ?? p
}

/* ------------------------------------------------------------------ *
 * Contenu par défaut du marqueur (fallback sans renderContent)
 * Affiche le titre, la description, les coordonnées et un bouton de fermeture.
 * ------------------------------------------------------------------ */

function DefaultMarkerContent({
  marker,
  onClose,
}: {
  marker: MarkerData | null
  onClose: () => void
}) {
  if (!marker) return null
  const data = (marker.data ?? {}) as Record<string, unknown>

  return (
    <View style={styles.defaultContent}>
      <View style={styles.header}>
        <Text style={styles.title}>{String(data.title ?? data.name ?? 'Marqueur')}</Text>
        {Boolean(data.subtitle) && (
          <Text style={styles.subtitle}>{String(data.subtitle)}</Text>
        )}
      </View>
      {Boolean(data.description) && (
        <Text style={styles.description}>{String(data.description)}</Text>
      )}
      <View style={styles.coordsRow}>
        <Text style={styles.coord}>
          📍 {marker.position.lat.toFixed(5)}, {marker.position.lng.toFixed(5)}
        </Text>
      </View>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>Fermer</Text>
      </Pressable>
    </View>
  )
}

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  // Conteneur de la sheet — positionné en bas de l'écran
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 16,
    overflow: 'hidden',
  },
  // Conteneur de la poignée de glissement
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  // Poignée visuelle (petite barre arrondie)
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D4D4D8',
  },
  // Contenu par défaut — rempli la sheet avec padding
  defaultContent: {
    flex: 1,
    padding: 24,
    paddingTop: 8,
  },
  // En-tête (titre + sous-titre)
  header: {
    marginBottom: 16,
  },
  // Titre du marqueur (grand, gras)
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#18181B',
    marginBottom: 4,
  },
  // Sous-titre (métadonnées)
  subtitle: {
    fontSize: 14,
    color: '#71717A',
  },
  // Description du marqueur
  description: {
    fontSize: 15,
    color: '#3F3F46',
    lineHeight: 22,
    marginBottom: 16,
  },
  // Ligne de coordonnées GPS
  coordsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  // Texte des coordonnées (monospace)
  coord: {
    fontSize: 13,
    color: '#A1A1AA',
    fontFamily: 'monospace',
  },
  // Bouton de fermeture
  closeButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  // Texte du bouton de fermeture
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#18181B',
  },
})

/* ------------------------------------------------------------------ *
 * Styles du popover « Type de carte » (grille 3 colonnes)
 * ------------------------------------------------------------------ */

const layerStyles = StyleSheet.create({
  // Panneau flottant du sélecteur (positionnement fourni via `style`
  // par le parent — ex. MapControls l'ancre au-dessus/en dessous des boutons)
  popover: {
    width: 280,
    // Limite la hauteur : la grille défile au lieu de déborder de l'écran
    maxHeight: Math.round(Dimensions.get('window').height * 0.55),
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  // En-tête : badge + titre + sous-titre
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  // Petit badge circulaire bleu contenant l'icône Layers
  headerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  popoverTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  popoverSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  headerDivider: {
    height: 1,
    width: '100%',
  },
  // Zone défilante de la grille
  gridScroll: {
    marginTop: 4,
  },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  // Cellule de la grille (vignette + nom en dessous)
  gridCell: {
    width: '33%',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    paddingVertical: 6,
  },
  gridCellPressed: {
    opacity: 0.6,
  },
  // Vignette carrée 56×56
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  // Contour bleu quand la couche est active
  swatchActive: {
    borderColor: '#1A73E8',
    // Halo discret autour de la vignette active
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  swatchEmoji: {
    fontSize: 24,
  },
  // Nom de la couche sous la vignette
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  cellLabelActive: {
    fontWeight: '700',
  },
})
