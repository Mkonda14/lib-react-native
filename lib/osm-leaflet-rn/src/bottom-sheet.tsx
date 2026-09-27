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
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import type { BottomSheetProps, MarkerData } from './types'

// Hauteur de l'écran — utilisée pour calculer les positions de snapping
const SCREEN_HEIGHT = Dimensions.get('window').height

// Configuration de l'animation spring (ressort)
const SPRING_CONFIG = {
  damping: 28,
  stiffness: 280,
  mass: 0.6,
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

  // Calculer les points de snapping (par défaut : 25%, 55%, 90% de l'écran)
  const heights = React.useMemo(() => {
    if (snapPoints && snapPoints.length > 0) return snapPoints
    return [
      Math.round(SCREEN_HEIGHT * 0.25),
      Math.round(SCREEN_HEIGHT * 0.55),
      Math.round(SCREEN_HEIGHT * 0.9),
    ]
  }, [snapPoints])

  // Position verticale de la sheet (shared value pour Reanimated)
  const translateY = useSharedValue(SCREEN_HEIGHT)
  // Opacité du fond flouté (shared value)
  const backdropOpacityValue = useSharedValue(0)
  // Index du point d'ancrage actuel (shared value)
  const currentSnap = useSharedValue(initialSnapIndex)

  /* ---------------- Animer l'ouverture/fermeture ---------------- */
  React.useEffect(() => {
    if (visible) {
      // Glisser vers le haut jusqu'au snap initial
      translateY.value = withSpring(heights[initialSnapIndex], SPRING_CONFIG)
      backdropOpacityValue.value = withTiming(backdropOpacity, {
        duration: animationDuration,
      })
    } else {
      // Glisser vers le bas (fermer)
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: animationDuration,
        easing: Easing.out(Easing.ease),
      })
      backdropOpacityValue.value = withTiming(0, {
        duration: animationDuration,
      })
    }
  }, [visible, heights, initialSnapIndex, animationDuration, backdropOpacity])

  /* ---------------- Geste de glissement (pan) ---------------- */
  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .onBegin((e) => {
          'worklet'
          // Stocker la position de départ (le worklet gère l'état automatiquement)
        })
        .onUpdate((e) => {
          'worklet'
          const start = heights[currentSnap.value]
          const next = start + e.translationY
          // Empêcher de glisser au-dessus du point de snapping le plus haut
          const maxSnap = heights[heights.length - 1]
          translateY.value = Math.min(Math.max(next, maxSnap), SCREEN_HEIGHT)
        })
        .onEnd((e) => {
          'worklet'
          const current = translateY.value
          const velocity = e.velocityY

          // Si glissement rapide vers le bas → fermer
          if (velocity > 800 && current > heights[0]) {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 })
            backdropOpacityValue.value = withTiming(0, { duration: 250 })
            runOnJS(handleClose)()
            return
          }

          // Si glissé en dessous du seuil minimum → fermer
          if (current > heights[0] + 80) {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 })
            backdropOpacityValue.value = withTiming(0, { duration: 250 })
            runOnJS(handleClose)()
            return
          }

          // Trouver le point de snapping le plus proche
          let targetSnap = 0
          let minDistance = Infinity
          heights.forEach((h, i) => {
            const d = Math.abs(current - h)
            if (d < minDistance) {
              minDistance = d
              targetSnap = i
            }
          })

          // Prendre en compte la vélocité (glisser vers le haut = snap suivant, vers le bas = précédent)
          if (velocity < -500 && targetSnap < heights.length - 1) {
            targetSnap += 1
          } else if (velocity > 500 && targetSnap > 0) {
            targetSnap -= 1
          }

          // Appliquer le snapping et retour haptique
          currentSnap.value = targetSnap
          translateY.value = withSpring(heights[targetSnap], SPRING_CONFIG)

          // Retour haptique (vibration) au changement de snap
          runOnJS(fireHaptic)('light')
        }),
    [heights]
  )

  // Fermer la sheet (callback externe)
  const handleClose = React.useCallback(() => {
    onClose?.()
  }, [onClose])

  // Déclencher un retour haptique (ignoré sur web)
  const fireHaptic = React.useCallback((intensity: 'light' | 'medium' | 'heavy') => {
    if (Platform.OS === 'web') return
    try {
      const style =
        intensity === 'heavy'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : intensity === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      Haptics.impactAsync(style)
    } catch {}
  }, [])

  /* ---------------- Styles animés ---------------- */
  // Style de la sheet (glissement vertical)
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  // Style du fond flouté (opacité)
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityValue.value,
  }))

  // Si invisible et entièrement hors écran, ne rien rendre (optimisation)
  if (!visible && translateY.value >= SCREEN_HEIGHT) {
    return null
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Fond flouté — ferme la sheet au tap si dismissOnBackdrop est actif */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={dismissOnBackdrop ? handleClose : undefined}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#000000' },
            backdropStyle,
          ]}
        />
      </Pressable>

      {/* Bottom sheet avec gestion de geste pan */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            { height: SCREEN_HEIGHT },
            sheetStyle,
            style,
          ]}
        >
          {/* Poignée de glissement en haut de la sheet */}
          {showHandle && (
            <View style={styles.handleContainer}>
              {renderHandle ? (
                renderHandle()
              ) : (
                <View style={styles.handle} />
              )}
            </View>
          )}

          {/* Contenu de la sheet */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {marker && renderContent ? (
              // Contenu personnalisé fourni par le parent
              renderContent(marker)
            ) : (
              // Contenu par défaut si aucun renderContent n'est fourni
              <DefaultMarkerContent marker={marker} onClose={handleClose} />
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>
    </View>
  )
})

BottomSheet.displayName = 'BottomSheet'

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
