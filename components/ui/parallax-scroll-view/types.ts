/**
 * ParallaxScrollView — Type definitions
 * ======================================
 */

import type { ReactNode, ReactElement } from 'react'
import type {
  ViewStyle,
  StyleProp,
  ScrollViewProps,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import type { AnimatedRef, SharedValue } from 'react-native-reanimated'

/* ------------------------------------------------------------------ *
 * Header
 * ------------------------------------------------------------------ */

export type HeaderBehavior =
  | 'parallax'      // default: translate + scale on scroll
  | 'sticky'        // header sticks to top
  | 'hide'          // header hides on scroll down, reappears on scroll up
  | 'fade'          // header fades out as you scroll
  | 'fixed'         // header never moves (no parallax)
  | 'cover'         // iOS large title style — collapses to compact bar

export interface HeaderConfig {
  /** Header height in px (expanded). */
  height?: number
  /** Header height when collapsed (used by 'cover' behavior). */
  collapsedHeight?: number
  /** Parallax strength: 0 = none, 1 = full (default 0.5). */
  parallaxStrength?: number
  /** Initial scale when pulled down (default 2). */
  pullDownScale?: number
  /** Background color of the header container. */
  backgroundColor?: string
  /** Header behavior preset. */
  behavior?: HeaderBehavior
  /** Apply blur to the header background when sticky/cover. */
  blur?: boolean
  /** Blur intensity (iOS). */
  blurIntensity?: number
  /** Blur tint. */
  blurTint?: 'light' | 'dark' | 'default'
  /** Render the header content. */
  renderHeader?: (params: { scrollOffset: SharedValue<number>; progress: SharedValue<number> }) => ReactNode
  /** Optional large title (only for 'cover' behavior). */
  largeTitle?: string
  /** Optional large title style. */
  largeTitleStyle?: StyleProp<TextStyle>
  /** Optional compact title style. */
  compactTitleStyle?: StyleProp<TextStyle>
}

// minimal TextStyle import to avoid pulling ViewStyle extras
import type { TextStyle } from 'react-native'
import Animated from 'react-native-reanimated'

/* ------------------------------------------------------------------ *
 * Main component props
 * ------------------------------------------------------------------ */

export interface ParallaxScrollViewProps {
  /** Header image element (kept for backwards compat). */
  headerImage?: ReactElement
  /** Or full header config. */
  header?: HeaderConfig
  /** Header height (shorthand for `header.height`). */
  headerHeight?: number
  /** Body content. */
  children: ReactNode
  /** Body container style. */
  contentContainerStyle?: StyleProp<ViewStyle>
  /** Body background color. */
  backgroundColor?: string
  /** Body horizontal padding (default 32). */
  contentPadding?: number
  /** Body gap between children (default 16). */
  contentGap?: number
  /** Apply safe area insets to body. */
  safeArea?: boolean | ('top' | 'bottom' | 'left' | 'right')[]
  /** Pull-to-refresh handler. */
  onRefresh?: () => Promise<void> | void
  /** Show the refresh indicator while refreshing. */
  refreshing?: boolean
  /** Pull-to-refresh colors (Android). */
  refreshColors?: string[]
  /** Wrap body in a KeyboardAvoidingView for input forms. */
  keyboardAware?: boolean
  /** Keyboard vertical offset (iOS). */
  keyboardVerticalOffset?: number
  /** Sticky headers (rendered at the top of the body, stick on scroll). */
  stickyHeader?: ReactNode
  /** Sticky header transparent background. */
  stickyHeaderTransparent?: boolean
  /** Footer rendered after the body. */
  footer?: ReactNode
  /** Custom scroll handler. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  /** Enable horizontal scroll (rare). */
  horizontal?: boolean
  /** Show scroll indicator. */
  showsVerticalScrollIndicator?: boolean
  /** Auto-scroll-to-top on tap of the status bar (iOS). */
  scrollToTopOnTapBar?: boolean
  /** Override ScrollView props. */
  scrollViewProps?: ScrollViewProps
  /** Style of the outer container. */
  style?: StyleProp<ViewStyle>
  /** Test ID. */
  testID?: string
}

/* ------------------------------------------------------------------ *
 * Hook return type
 * ------------------------------------------------------------------ */

export interface UseParallaxScrollReturn {
  scrollRef: AnimatedRef<Animated.ScrollView>
  scrollOffset: SharedValue<number>
  /** 0 = top, 1 = fully scrolled past header. */
  progress: SharedValue<number>
  scrollTo: (y: number, animated?: boolean) => void
  scrollToTop: (animated?: boolean) => void
}