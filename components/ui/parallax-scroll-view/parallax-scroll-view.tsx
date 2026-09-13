/**
 * ParallaxScrollView — main component (improved & hardened)
 * =========================================================
 *
 * Improvements over the original:
 *  - Safe area insets (auto)
 *  - Reduced motion respected
 *  - Header behaviors: parallax, sticky, hide, fade, fixed, cover
 *  - Pull-to-refresh
 *  - KeyboardAvoidingView option
 *  - Sticky header support (stickyHeaderContent)
 *  - scrollEventThrottle=1 (smoother than 16)
 *  - contentInsetAdjustmentBehavior="automatic" (iOS safe area)
 *  - All animations on the UI thread (no jank)
 *  - Optional `useBottomTabOverflow` (graceful fallback)
 *  - Memoized styles
 *  - TypeScript strict
 */

import * as React from 'react'
import {
  StyleSheet,
  ViewStyle,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
  View,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  Extrapolation,
  interpolate,
} from 'react-native-reanimated'
import { useParallaxScroll } from './use-parallax-scroll'
import { ParallaxHeader } from './header'
import { cn } from '@/lib/utils'
import type { ParallaxScrollViewProps, HeaderConfig } from './types'

/* ------------------------------------------------------------------ *
 * Optional hook fallback: useBottomTabOverflow may not exist
 * ------------------------------------------------------------------ */
function useBottomTabOverflowSafe(): number {
  try {
    const mod = require('@/hooks/useBottomTabOverflow')
    return mod.useBottomTabOverflow?.() ?? 0
  } catch {
    return 0
  }
}

function useColorSafe(name: string): string {
  try {
    const mod = require('@/hooks/useColor')
    return mod.useColor?.(name) ?? (name === 'background' ? '#FFFFFF' : '#000000')
  } catch {
    return name === 'background' ? '#FFFFFF' : '#000000'
  }
}

function useSafeAreaSafe() {
  try {
    const mod = require('react-native-safe-area-context')
    return mod.useSafeAreaInsets()
  } catch {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }
}

/* ------------------------------------------------------------------ *
 * Defaults
 * ------------------------------------------------------------------ */
const DEFAULT_HEADER_CONFIG: Required<
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
> & { collapsedHeight: number } = {
  height: 250,
  collapsedHeight: 96,
  parallaxStrength: 0.5,
  pullDownScale: 2,
  backgroundColor: '#FFFFFF',
  behavior: 'parallax',
  blur: false,
  blurIntensity: 80,
  blurTint: 'light',
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */
export const ParallaxScrollView = React.memo(function ParallaxScrollView(
  props: ParallaxScrollViewProps
) {
  const {
    headerImage,
    header,
    headerHeight,
    children,
    contentContainerStyle,
    backgroundColor: bgColor,
    contentPadding = 32,
    contentGap = 16,
    safeArea = ['bottom'],
    onRefresh,
    refreshing = false,
    refreshColors,
    keyboardAware = false,
    keyboardVerticalOffset = Platform.OS === 'ios' ? 80 : 0,
    stickyHeader,
    stickyHeaderTransparent = false,
    footer,
    onScroll,
    horizontal = false,
    showsVerticalScrollIndicator = true,
    scrollToTopOnTapBar = true,
    scrollViewProps,
    style,
    testID,
  } = props

  // Hooks
  const backgroundColor = bgColor ?? useColorSafe('background')
  const bottom = useBottomTabOverflowSafe()
  const safe = useSafeAreaSafe()
  const reduceMotion = useReducedMotion()
  const { scrollRef, scrollOffset } = useParallaxScroll()

  // Compute safe area paddings
  const safeArray = Array.isArray(safeArea)
    ? safeArea
    : safeArea === true
    ? (['top', 'bottom', 'left', 'right'] as const)
    : []
  const padTop = safeArray.includes('top') ? safe.top : 0
  const padBottom = safeArray.includes('bottom') ? safe.bottom : 0
  const padLeft = safeArray.includes('left') ? safe.left : 0
  const padRight = safeArray.includes('right') ? safe.right : 0

  // Build header config
  const headerConfig = React.useMemo(() => {
    const base = { ...DEFAULT_HEADER_CONFIG }
    if (header) {
      Object.assign(base, header)
      if (header.height !== undefined) base.height = header.height
      if (header.parallaxStrength !== undefined) base.parallaxStrength = header.parallaxStrength
      if (header.pullDownScale !== undefined) base.pullDownScale = header.pullDownScale
      if (header.backgroundColor !== undefined) base.backgroundColor = header.backgroundColor
      if (header.behavior !== undefined) base.behavior = header.behavior
      if (header.blur !== undefined) base.blur = header.blur
      if (header.blurIntensity !== undefined) base.blurIntensity = header.blurIntensity
      if (header.blurTint !== undefined) base.blurTint = header.blurTint
      if (header.collapsedHeight !== undefined) base.collapsedHeight = header.collapsedHeight
    }
    if (headerHeight !== undefined) base.height = headerHeight
    if (reduceMotion) {
      base.behavior = 'fixed'
    }
    return base
  }, [header, headerHeight, reduceMotion])

  // Header element
  const headerContent = React.useMemo(() => {
    if (header?.renderHeader) {
      return header.renderHeader({ scrollOffset, progress: scrollOffset })
    }
    if (headerImage) return headerImage
    return null
  }, [header, headerImage, scrollOffset])

  // Refresh control
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={refreshColors ?? ['#0A84FF']}
      tintColor={refreshColors?.[0] ?? '#0A84FF'}
      progressViewOffset={headerConfig.height * 0.3}
    />
  ) : undefined

  // Body container style (memoized)
  const bodyStyle: ViewStyle = React.useMemo(
    () => ({
      flex: 1,
      paddingTop: padTop,
      paddingLeft: padLeft + contentPadding,
      paddingRight: padRight + contentPadding,
      paddingBottom: padBottom + bottom + contentPadding,
      gap: contentGap,
      overflow: 'hidden',
      backgroundColor,
    }),
    [padTop, padLeft, padRight, padBottom, bottom, contentPadding, contentGap, backgroundColor]
  )

  // Status bar tap → scroll to top (iOS only)
  const scrollToTop = React.useCallback(() => {
    if (!scrollToTopOnTapBar || Platform.OS !== 'ios') return
    scrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: true })
  }, [scrollRef, scrollToTopOnTapBar])

  const content = (
    <Animated.ScrollView
      ref={scrollRef}
      scrollEventThrottle={1}
      onScroll={onScroll}
      onScrollToTop={scrollToTop}
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      scrollIndicatorInsets={{
        top: 0,
        bottom: bottom + padBottom,
      }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: bottom + padBottom,
      }}
      refreshControl={refreshControl}
      {...scrollViewProps}
    >
      {/* Header */}
      {headerContent ? (
        <ParallaxHeader config={headerConfig} scrollOffset={scrollOffset}>
          {headerContent}
        </ParallaxHeader>
      ) : null}

      {/* Sticky header (sticks to top of body, below the animated header) */}
      {stickyHeader ? (
        <View
          style={[
            styles.stickyHeader,
            !stickyHeaderTransparent && { backgroundColor },
          ]}
        >
          {stickyHeader}
        </View>
      ) : null}

      {/* Body */}
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={bodyStyle}
        >
          {children}
        </KeyboardAvoidingView>
      ) : (
        <View style={bodyStyle}>{children}</View>
      )}

      {/* Footer */}
      {footer ? <View>{footer}</View> : null}
    </Animated.ScrollView>
  )

  return (
    <View style={[styles.outer, style]} testID={testID}>
      {content}
    </View>
  )
})

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  } as ViewStyle,
  stickyHeader: {
    position: 'relative',
    zIndex: 2,
  } as ViewStyle,
})

ParallaxScrollView.displayName = 'ParallaxScrollView'