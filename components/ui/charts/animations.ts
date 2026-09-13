/**
 * Charts — Animation Helpers & Presets
 * ====================================
 */

import { Easing, withDelay, withTiming } from 'react-native-reanimated'

export const easing = {
  linear: Easing.linear,
  easeIn: Easing.in(Easing.quad),
  easeOut: Easing.out(Easing.quad),
  easeInOut: Easing.inOut(Easing.quad),
  easeOutCubic: Easing.out(Easing.cubic),
  easeInOutCubic: Easing.inOut(Easing.cubic),
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
}

export const animationPresets = {
  entrance: {
    fadeIn: { opacity: [0, 1] },
    slideUp: { translateY: [20, 0], opacity: [0, 1] },
    slideDown: { translateY: [-20, 0], opacity: [0, 1] },
    slideLeft: { translateX: [-20, 0], opacity: [0, 1] },
    slideRight: { translateX: [20, 0], opacity: [0, 1] },
    scaleIn: { scale: [0.8, 1], opacity: [0, 1] },
    stagger: (index: number, delay = 50) => ({ delay: index * delay }),
  },
  update: {
    smooth: { duration: 300, easing: Easing.out(Easing.cubic) },
    spring: { damping: 20, stiffness: 300 },
    bouncy: { damping: 15, stiffness: 400 },
  },
  hover: {
    scale: { scale: 1.05 },
    highlight: { opacity: 0.8 },
    lift: { translateY: -4, shadowOpacity: 0.3 },
  },
  exit: {
    fadeOut: { opacity: [1, 0] },
    slideDown: { translateY: [0, 20], opacity: [1, 0] },
    scaleOut: { scale: [1, 0.8], opacity: [1, 0] },
  },
}

export const springConfig = {
  gentle: { damping: 20, stiffness: 300 },
  wobbly: { damping: 15, stiffness: 400 },
  stiff: { damping: 25, stiffness: 500 },
  smooth: { damping: 20, stiffness: 300 },
}

export const timingConfig = {
  fast: { duration: 200, easing: Easing.out(Easing.quad) },
  normal: { duration: 500, easing: Easing.out(Easing.cubic) },
  slow: { duration: 1000, easing: Easing.out(Easing.cubic) },
}

export const createStaggeredAnimation = (
  index: number,
  baseDelay: number = 50,
  maxDelay: number = 500
) =>
  withDelay(
    Math.min(index * baseDelay, maxDelay),
    withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
  )

export const createStaggeredValue = (
  index: number,
  baseDelay: number = 50,
  maxDelay: number = 500
) =>
  withDelay(
    Math.min(index * baseDelay, maxDelay),
    withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
  )

export const createStaggeredDelay = (index: number, delay: number = 50) => index * delay

export const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

export const lerp = (start: number, end: number, t: number) => start + (end - start) * t

export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
) => ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin