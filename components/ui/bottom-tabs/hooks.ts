/**
 * Hooks for the bottom-tabs system
 * =================================
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Keyboard, KeyboardEvent } from 'react-native'
import * as Haptics from 'expo-haptics'

/* ------------------------------------------------------------------ *
 * Haptic feedback (expo-haptics)
 * ------------------------------------------------------------------ */

export type HapticIntensity = 'light' | 'medium' | 'heavy' | 'selection' | 'none'

export function useHaptic() {
  return useCallback(async (intensity: HapticIntensity = 'light') => {
    if (Platform.OS === 'web' || intensity === 'none') return
    try {
      switch (intensity) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          break
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          break
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
          break
        case 'selection':
          await Haptics.selectionAsync()
          break
      }
    } catch {
      /* expo-haptics optional fallback */
    }
  }, [])
}

/* ------------------------------------------------------------------ *
 * Keyboard visibility hook (Cross-platform)
 * ------------------------------------------------------------------ */

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setVisible(true)
      setHeight(e.endCoordinates ? e.endCoordinates.height : 0)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setVisible(false)
      setHeight(0)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  return { visible, height }
}

/* ------------------------------------------------------------------ *
 * Safe area insets
 * ------------------------------------------------------------------ */

export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Resolves safe-area insets. Dynamically imports `react-native-safe-area-context`.
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  try {
    const { useSafeAreaInsets: rnUseSafeAreaInsets } = require('react-native-safe-area-context')
    const insets = rnUseSafeAreaInsets()
    if (insets && typeof insets.bottom === 'number') {
      return insets
    }
  } catch {
    // Fallback if safe area provider is absent
  }
  return { top: 0, bottom: 0, left: 0, right: 0 }
}

/* ------------------------------------------------------------------ *
 * Blur view component provider
 * ------------------------------------------------------------------ */

export interface BlurComponentProps {
  intensity: number
  tint: 'light' | 'dark' | 'default'
  style?: any
  children?: React.ReactNode
}

export type BlurComponent = React.ComponentType<BlurComponentProps>

let BlurViewRef: BlurComponent | null = null

export function registerBlurView(comp: BlurComponent) {
  BlurViewRef = comp
}

export function useBlurView(): BlurComponent | null {
  if (BlurViewRef) return BlurViewRef

  // Attempt to auto-require expo-blur if installed
  try {
    const { BlurView } = require('expo-blur')
    if (BlurView) return BlurView
  } catch {
    /* expo-blur not installed */
  }

  return null
}