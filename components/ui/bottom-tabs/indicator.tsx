/**
 * Tab Indicator — Animated pill, dot, or backdrop that glides between tabs
 * =========================================================================
 *
 * Three indicator variants:
 *  - BottomTabIndicator : simple absolute % positioning (ios / material)
 *  - CenteredIndicator  : morphing pill that measures each item (pill / glass)
 *  - DotIndicator       : small dot below the active icon (minimal / dock)
 *
 * All worklet-safe: no Array.prototype methods that are remote functions.
 */

import * as React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import type { TabIndicatorProps } from './types'

/* ------------------------------------------------------------------ */

export interface ItemLayout {
  x: number
  y: number
  w: number
  h: number
}

/* ------------------------------------------------------------------ *
 * 1. BottomTabIndicator — Simple percentage-based positional indicator
 * ------------------------------------------------------------------ */
export const BottomTabIndicator = React.memo(function BottomTabIndicator(
  props: TabIndicatorProps
) {
  const {
    position,
    count,
    width = 64,
    height = 32,
    borderRadius = 16,
    color = 'rgba(0,0,0,0.08)',
    overlay = false,
  } = props

  const animStyle = useAnimatedStyle(() => {
    if (count <= 0) return { opacity: 0 }

    const slotPct = 100 / count
    const centerPct = position.value * slotPct + slotPct / 2
    const isNumericWidth = typeof width === 'number'

    if (isNumericWidth) {
      return {
        left: `${centerPct}%` as any,
        width: width as number,
        height,
        borderRadius,
        backgroundColor: color,
        transform: [{ translateX: -(width as number) / 2 }],
      }
    }

    return {
      left: `${position.value * slotPct}%` as any,
      width: `${slotPct}%` as any,
      height,
      borderRadius,
      backgroundColor: color,
    }
  })

  const containerStyle: ViewStyle = {
    position: 'absolute',
    zIndex: overlay ? 1 : 0,
    top: '50%',
    marginTop: -height / 2,
  }

  return (
    <Animated.View
      style={[containerStyle, animStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  )
})

/* ------------------------------------------------------------------ *
 * 2. CenteredIndicator — Morphing pill that tracks measured item bounds
 *    Used for pill & glass presets. Worklet-safe (no Array methods).
 * ------------------------------------------------------------------ */
export const CenteredIndicator = React.memo(function CenteredIndicator(
  props: TabIndicatorProps & {
    tabLayouts?: ItemLayout[]
    barWidth?: number
  }
) {
  const {
    position,
    count,
    tabLayouts = [],
    barWidth = 0,
    height = 44,
    borderRadius = 16,
    color = '#0EA5E9',
    borderColor,
    borderWidth = 0,
  } = props

  const animStyle = useAnimatedStyle(() => {
    if (count <= 0) return { opacity: 0 }

    // Worklet-safe: manual loop instead of Array.every / Array.map
    let hasLayouts = tabLayouts.length === count && count > 0
    if (hasLayouts) {
      for (let i = 0; i < tabLayouts.length; i++) {
        const l = tabLayouts[i]
        if (!l || l.w <= 0) {
          hasLayouts = false
          break
        }
      }
    }

    if (hasLayouts) {
      // Inset each pill by 8px on left and right inside its slot for an elegant capsule
      const insetX = 8
      const inputRange: number[] = []
      const xOutput: number[] = []
      const wOutput: number[] = []
      for (let i = 0; i < count; i++) {
        inputRange.push(i)
        xOutput.push(tabLayouts[i].x + insetX)
        wOutput.push(Math.max(tabLayouts[i].w - insetX * 2, 40))
      }

      const targetX = interpolate(position.value, inputRange, xOutput, Extrapolation.CLAMP)
      const targetW = interpolate(position.value, inputRange, wOutput, Extrapolation.CLAMP)

      return {
        left: 0,
        width: targetW,
        height,
        borderRadius,
        backgroundColor: color,
        borderWidth: borderWidth,
        borderColor: borderColor ?? 'transparent',
        transform: [{ translateX: targetX }],
        opacity: 1,
      }
    }

    // Fallback: equal-width slots before layouts are measured
    const slotPct = 100 / count
    const fallbackW = barWidth > 0 ? (barWidth / count) * 0.84 : 68
    const centerPct = position.value * slotPct + slotPct / 2

    return {
      left: `${centerPct}%` as any,
      width: fallbackW,
      height,
      borderRadius,
      backgroundColor: color,
      borderWidth: borderWidth,
      borderColor: borderColor ?? 'transparent',
      transform: [{ translateX: -fallbackW / 2 }],
      opacity: 0.85,
    }
  })

  const LinearGradientComp = React.useMemo(() => {
    try {
      return require('expo-linear-gradient').LinearGradient
    } catch {
      return null
    }
  }, [])

  return (
    <Animated.View
      style={[styles.centeredBase, { zIndex: 0, marginTop: -height / 2, overflow: 'hidden' }, animStyle]}
      pointerEvents="none"
    >
      {LinearGradientComp && borderWidth > 0 && (
        <LinearGradientComp
          colors={['transparent', 'rgba(255, 255, 255, 0.95)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.indicatorTopShine}
        />
      )}
    </Animated.View>
  )
})

/* ------------------------------------------------------------------ *
 * 3. DotIndicator — Small colored dot below the active icon
 *    Position is relative to bar so it always appears below icons.
 * ------------------------------------------------------------------ */
export const DotIndicator = React.memo(function DotIndicator(
  props: TabIndicatorProps & {
    dotSize?: number
    /** Offset from the bottom of the bar in px. */
    bottomOffset?: number
  }
) {
  const {
    position,
    count,
    dotSize = 4,
    color = '#0EA5E9',
    bottomOffset = 8,
  } = props

  const animStyle = useAnimatedStyle(() => {
    if (count <= 0) return { opacity: 0 }

    const slotPct = 100 / count
    const centerPct = position.value * slotPct + slotPct / 2

    return {
      left: `${centerPct}%` as any,
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      backgroundColor: color,
      transform: [{ translateX: -dotSize / 2 }],
      opacity: 1,
    }
  })

  return (
    <Animated.View
      style={[
        styles.dotBase,
        { bottom: bottomOffset },
        animStyle,
      ]}
      pointerEvents="none"
    />
  )
})

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  centeredBase: {
    position: 'absolute',
    top: '50%',
  } as ViewStyle,
  dotBase: {
    position: 'absolute',
    zIndex: 1,
  } as ViewStyle,
  indicatorTopShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 10,
  } as ViewStyle,
})

BottomTabIndicator.displayName = 'BottomTabIndicator'
CenteredIndicator.displayName = 'CenteredIndicator'
DotIndicator.displayName = 'DotIndicator'