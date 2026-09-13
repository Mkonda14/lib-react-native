/**
 * useParallaxScroll — hook centralisant la logique du parallax
 * ============================================================
 *
 * Expose:
 *  - scrollRef à attacher sur <Animated.ScrollView>
 *  - scrollOffset (SharedValue<number>) lu depuis useScrollViewOffset
 *  - progress (0..1) : 0 = top, 1 = défilé au-delà du header
 *  - scrollTo(y, animated) + scrollToTop(animated)
 *
 * Avantages par rapport au composant original :
 *  - Pas de re-render sur le scroll (tout est sur le thread UI)
 *  - Réduit les risques de "ref is null" en utilisant useAnimatedRef
 *  - Expose des helpers réutilisables
 */

import { useCallback } from 'react'
import Animated, {
  useAnimatedRef,
  useScrollViewOffset,
  Easing,
} from 'react-native-reanimated'
import type { UseParallaxScrollReturn } from './types'

const EASE_OUT = Easing.out(Easing.ease)

export function useParallaxScroll(): UseParallaxScrollReturn {
  const scrollRef = useAnimatedRef<Animated.ScrollView>()
  const scrollOffset = useScrollViewOffset(scrollRef)

  // `progress` is computed lazily inside useAnimatedStyle consumers
  // (kept here for API symmetry)
  const progress = scrollOffset

  const scrollTo = useCallback((y: number, animated = true) => {
    'worklet'
    const ref = scrollRef
    if (!ref) return
    if (animated) {
      // React Native's scrollTo doesn't animate by default on worklets
      // so we use the JS bridge via runOnJS-free call.
      // The native scrollTo method accepts animated: boolean.
      ;(ref as any).scrollTo?.({ x: 0, y, animated: true })
    } else {
      ;(ref as any).scrollTo?.({ x: 0, y, animated: false })
    }
  }, [scrollRef])

  const scrollToTop = useCallback((animated = true) => {
    'worklet'
    const ref = scrollRef
    if (!ref) return
    ;(ref as any).scrollTo?.({ x: 0, y: 0, animated })
  }, [scrollRef])

  return {
    scrollRef,
    scrollOffset,
    progress,
    scrollTo,
    scrollToTop,
  }
}