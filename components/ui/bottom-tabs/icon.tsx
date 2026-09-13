/**
 * Tab Icon — Renders the icon inside a BottomTabItem
 * ====================================================
 * Priority order:
 *  1. Image source (source prop)
 *  2. Named icon (lucide-react-native → @expo/vector-icons fallback)
 *  3. Function children — called with { size, color } (Expo Router pattern)
 *  4. React element children — cloned with resolved color/size if not set
 *  5. Fallback dot
 *
 * The spring scale animation responds to the `active` prop.
 * Color and size are NOT overridden if the child already has them defined.
 */

import * as React from 'react'
import {
  Image,
  StyleSheet,
  View,
  ImageSourcePropType,
  ImageResizeMode,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import type { TabIconProps } from './types'

export interface ResolvedIconProps extends TabIconProps {
  /** Resolved active/inactive colour from the parent item. */
  resolvedColor?: string
  /** Whether this tab is currently active. */
  active?: boolean
  /** Active scale multiplier (from preset). Default 1.12 */
  activeScale?: number
}

/* ------------------------------------------------------------------ */

function getLucideModule(): Record<string, React.ComponentType<any>> | null {
  try {
    return require('lucide-react-native') as Record<string, React.ComponentType<any>>
  } catch {
    return null
  }
}

function getExpoIconsModule(): Record<string, any> | null {
  try {
    return require('@expo/vector-icons') as Record<string, any>
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */

export const BottomTabIcon = React.memo(function BottomTabIcon(
  props: ResolvedIconProps
) {
  const {
    children,
    name,
    size = 24,
    color,
    resolvedColor,
    source,
    resizeMode = 'contain',
    active = false,
    activeScale = 1.12,
  } = props

  const targetColor = color ?? resolvedColor ?? '#000000'

  // Spring scale: animates icon on activation
  const scale = useSharedValue(active ? activeScale : 1)
  React.useEffect(() => {
    scale.value = withSpring(active ? activeScale : 1, {
      damping: 14,
      stiffness: 280,
      mass: 0.8,
    })
  }, [active, activeScale, scale])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  /* -------- 1. Image-based icon -------- */
  if (source) {
    return (
      <Animated.View style={[styles.wrap, { width: size, height: size }, animStyle]}>
        <Image
          source={source as ImageSourcePropType}
          style={{ width: size, height: size }}
          resizeMode={resizeMode as ImageResizeMode}
          tintColor={targetColor}
          accessibilityRole="image"
        />
      </Animated.View>
    )
  }

  /* -------- 2. Named icon (lucide → expo/vector-icons) -------- */
  if (name) {
    const lucide = getLucideModule()
    if (lucide && lucide[name]) {
      const LucideComponent = lucide[name]
      return (
        <Animated.View style={[styles.wrap, animStyle]}>
          <LucideComponent size={size} color={targetColor} />
        </Animated.View>
      )
    }

    const expo = getExpoIconsModule()
    if (expo) {
      const iconSets: Array<React.ComponentType<any> & { glyphMap?: Record<string, any> }> = (
        [
          expo.Ionicons,
          expo.MaterialIcons,
          expo.Feather,
          expo.FontAwesome,
          expo.MaterialCommunityIcons,
        ] as Array<React.ComponentType<any> & { glyphMap?: Record<string, any> }>
      ).filter(Boolean)

      for (const IconSet of iconSets) {
        if (IconSet && IconSet.glyphMap && IconSet.glyphMap[name]) {
          return (
            <Animated.View style={[styles.wrap, animStyle]}>
              <IconSet name={name} size={size} color={targetColor} />
            </Animated.View>
          )
        }
      }
    }
  }

  /* -------- 3. Function children (Expo Router tabBarIcon pattern) -------- */
  if (typeof children === 'function') {
    const rendered = (children as (p: { size: number; color: string }) => React.ReactNode)({
      size,
      color: targetColor,
    })
    return (
      <Animated.View style={[styles.wrap, animStyle]}>
        {React.isValidElement(rendered)
          ? React.cloneElement(rendered as React.ReactElement<any>, {
              // Only inject if the element did not already set these props
              size: (rendered.props as any)?.size ?? size,
              color: (rendered.props as any)?.color ?? targetColor,
            })
          : rendered}
      </Animated.View>
    )
  }

  /* -------- 4. React element children -------- */
  if (children && React.isValidElement(children)) {
    return (
      <Animated.View style={[styles.wrap, animStyle]}>
        {React.cloneElement(children as React.ReactElement<any>, {
          size: (children.props as any)?.size ?? size,
          color: (children.props as any)?.color ?? targetColor,
        })}
      </Animated.View>
    )
  }

  /* -------- 5. Other children (text, custom nodes) -------- */
  if (children) {
    return (
      <Animated.View style={[styles.wrap, animStyle]}>
        {children}
      </Animated.View>
    )
  }

  /* -------- 6. Fallback: subtle dot -------- */
  return (
    <Animated.View style={[styles.wrap, { width: size, height: size }, animStyle]}>
      <View
        style={[
          styles.fallback,
          {
            width: size * 0.35,
            height: size * 0.35,
            borderRadius: size * 0.175,
            backgroundColor: targetColor,
          },
        ]}
      />
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    opacity: 0.5,
  },
})

BottomTabIcon.displayName = 'BottomTabIcon'