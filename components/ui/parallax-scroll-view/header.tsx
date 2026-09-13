/**
 * Header — animated header with multiple behaviors
 * =================================================
 *
 * Behaviors:
 *  - parallax : translate + scale (default)
 *  - sticky   : stays at top, fades background
 *  - hide     : slides away on scroll-down, returns on scroll-up
 *  - fade     : fades opacity as you scroll
 *  - fixed    : no animation
 *  - cover    : iOS large-title style collapse
 */

import * as React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { useBlurView } from '../bottom-tabs/hooks'
import type { HeaderConfig } from './types'
import type { SharedValue } from 'react-native-reanimated'

interface ParallaxHeaderProps {
  config: Required<
    Pick<
      HeaderConfig,
      | 'height'
      | 'parallaxStrength'
      | 'pullDownScale'
      | 'backgroundColor'
      | 'behavior'
      | 'blur'
      | 'blurIntensity'
      | 'blurTint'
    >
  > & { collapsedHeight: number }
  scrollOffset: SharedValue<number>
  children?: React.ReactNode
}

export const ParallaxHeader = React.memo(function ParallaxHeader(
  props: ParallaxHeaderProps
) {
  const { config, scrollOffset, children } = props
  const BlurView = useBlurView()

  // The header's transform/opacity based on scroll
  const headerAnimStyle = useAnimatedStyle(() => {
    const y = scrollOffset.value
    const h = config.height
    const strength = config.parallaxStrength

    switch (config.behavior) {
      case 'fixed':
        return { transform: [{ translateY: 0 }], opacity: 1 }

      case 'fade':
        return {
          opacity: interpolate(y, [0, h], [1, 0], Extrapolation.CLAMP),
          transform: [{ translateY: y * strength * 0.5 }],
        }

      case 'hide': {
        return {
          transform: [
            {
              translateY: interpolate(
                y,
                [0, h * 0.5, h],
                [0, -h, -h],
                Extrapolation.CLAMP
              ),
            },
          ],
          opacity: interpolate(y, [0, h * 0.7, h], [1, 1, 0], Extrapolation.CLAMP),
        }
      }

      case 'sticky':
        // Header stays in place (zIndex above content), background blurs as you scroll
        return {
          transform: [{ translateY: 0 }],
          opacity: 1,
        }

      case 'cover': {
        // iOS large-title: collapse from height → collapsedHeight
        const collapsed = config.collapsedHeight
        const scale = interpolate(
          y,
          [-h, 0, h - collapsed],
          [config.pullDownScale, 1, 1],
          Extrapolation.CLAMP
        )
        const ty = interpolate(
          y,
          [-h, 0, h - collapsed, h],
          [-h * 0.5, 0, 0, collapsed - h],
          Extrapolation.CLAMP
        )
        return {
          transform: [{ translateY: ty }, { scale }],
        }
      }

      case 'parallax':
      default: {
        // Original logic, but with strength parameter
        const ty = interpolate(
          y,
          [-h, 0, h],
          [-h * 0.5 * strength, 0, h * 0.75 * strength]
        )
        const scale = interpolate(
          y,
          [-h, 0, h],
          [config.pullDownScale, 1, 1],
          Extrapolation.CLAMP
        )
        return {
          transform: [{ translateY: ty }, { scale }],
        }
      }
    }
  })

  // Sticky background opacity (fades in as you scroll)
  const stickyBgStyle = useAnimatedStyle(() => {
    if (config.behavior !== 'sticky' && config.behavior !== 'cover') {
      return { opacity: 0 }
    }
    const target = config.behavior === 'cover' ? config.height - config.collapsedHeight : config.height * 0.5
    return {
      opacity: interpolate(
        scrollOffset.value,
        [0, Math.max(1, target)],
        [0, 1],
        Extrapolation.CLAMP
      ),
    }
  })

  const containerStyle: ViewStyle = {
    height: config.height,
    backgroundColor: config.backgroundColor,
    overflow: 'hidden',
    zIndex: 1,
  }

  return (
    <Animated.View style={[containerStyle, headerAnimStyle]}>
      {/* Optional blur background (sticky / cover) */}
      {config.blur && BlurView && (config.behavior === 'sticky' || config.behavior === 'cover') ? (
        <Animated.View style={[StyleSheet.absoluteFill, stickyBgStyle]}>
          <BlurView
            intensity={config.blurIntensity}
            tint={config.blurTint}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {children}
    </Animated.View>
  )
})

ParallaxHeader.displayName = 'ParallaxHeader'