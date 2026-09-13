/**
 * Tab Badge — small indicator on top of a tab icon
 * =================================================
 * Supports three variants:
 *  - 'dot'   — small colored circle
 *  - 'count' — rounded number (auto-clips to "99+")
 *  - 'custom' — render your own node
 */

import * as React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import type { TabBadgeProps } from './types'

const DEFAULT_COLORS = {
  dot: '#EF4444',       // red-500
  count: '#EF4444',
  text: '#FFFFFF',
}

export const BottomTabBadge = React.memo(function BottomTabBadge(
  props: TabBadgeProps
) {
  const {
    variant = 'dot',
    count = 0,
    max = 99,
    children,
    position = 'top-right',
    color,
    textColor,
    size = variant === 'dot' ? 8 : 18,
    offsetX = 0,
    offsetY = 0,
    showWhenActive = false,
    animated = true,
  } = props

  // animated appear/disappear
  const scale = useSharedValue(0)
  React.useEffect(() => {
    const target = count > 0 || variant === 'custom' || variant === 'dot' ? 1 : 0
    scale.value = animated
      ? withSpring(target, { damping: 14, stiffness: 280 })
      : target
  }, [count, variant, animated, scale])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0, 0.5, 1], [0, 0.5, 1]),
  }))

  // position offsets
  const positionStyle: ViewStyle = {
    position: 'absolute',
    zIndex: 10,
    ...(position === 'top-right' && { top: -2, right: -2 }),
    ...(position === 'top-left' && { top: -2, left: -2 }),
    ...(position === 'bottom-right' && { bottom: -2, right: -2 }),
    ...(position === 'bottom-left' && { bottom: -2, left: -2 }),
    transform: [{ translateX: offsetX }, { translateY: offsetY }],
  }

  const bgColor = color ?? (variant === 'dot' ? DEFAULT_COLORS.dot : DEFAULT_COLORS.count)
  const txtColor = textColor ?? DEFAULT_COLORS.text

  const displayCount =
    count > max ? `${max}+` : count > 0 ? String(count) : ''

  return (
    <Animated.View
      style={[positionStyle, animStyle]}
      pointerEvents="none"
      accessibilityLabel={
        variant === 'count' && count > 0
          ? `${count} notifications`
          : 'has notification'
      }
    >
      {variant === 'dot' ? (
        <View
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
              borderColor: '#FFFFFF',
              borderWidth: 1.5,
            },
          ]}
        />
      ) : variant === 'count' && displayCount ? (
        <View
          style={[
            styles.count,
            {
              minWidth: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
              paddingHorizontal: size > 18 ? 5 : 3,
            },
          ]}
        >
          <Animated.Text
            style={[styles.countText, { color: txtColor, fontSize: size * 0.55 }]}
            allowFontScaling={false}
          >
            {displayCount}
          </Animated.Text>
        </View>
      ) : variant === 'custom' ? (
        children
      ) : null}
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  dot: {
    // sized inline
  },
  count: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  countText: {
    fontWeight: '700',
    lineHeight: 14,
  },
})

BottomTabBadge.displayName = 'BottomTabBadge'