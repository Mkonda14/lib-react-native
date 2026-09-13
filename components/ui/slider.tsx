import { forwardRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  ViewStyle,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated'
import { cn } from '@/lib/utils'

export interface SliderProps {
  /** Current value (number for default, [start,end] for range). */
  value: number | number[]
  /** Called on every change during drag. */
  onValueChange: (value: number | number[]) => void
  /** Called once when a drag starts. */
  onSlidingStart?: (value: number | number[]) => void
  /** Called once when a drag ends (and on tap-to-seek). */
  onSlidingComplete?: (value: number | number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  /** 'range' shows two thumbs. */
  variant?: 'default' | 'range'
  className?: string
  style?: ViewStyle | ViewStyle[]
  thumbClassName?: string
  trackClassName?: string
  activeTrackClassName?: string
  /** Track thickness (px). */
  trackHeight?: number
  /** Thumb diameter (px). */
  thumbSize?: number
  /** Disable snapping to step (allows free positioning). */
  disableStepSnapping?: boolean
  /** Allow the two range thumbs to pass each other. */
  allowOverlap?: boolean
  accessibilityLabel?: string
}

/**
 * Slider component for React Native + NativeWind.
 *
 * Requires:
 *  - react-native-gesture-handler v2+ (wrap your app in <GestureHandlerRootView>)
 *  - react-native-reanimated v3+
 *
 * @example
 * <Slider value={50} onValueChange={setV} />
 * <Slider variant="range" value={[20, 80]} onValueChange={setRange} />
 * <Slider orientation="vertical" value={v} onValueChange={setV} />
 */
export const Slider = forwardRef<View, SliderProps>((props, ref) => {
  const {
    value,
    onValueChange,
    onSlidingStart,
    onSlidingComplete,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = 'horizontal',
    variant = 'default',
    className,
    style,
    thumbClassName,
    trackClassName,
    activeTrackClassName,
    trackHeight = 6,
    thumbSize = 22,
    disableStepSnapping = false,
    allowOverlap = false,
    accessibilityLabel,
  } = props

  const isRange = variant === 'range'
  const isHorizontal = orientation === 'horizontal'
  const range = max - min

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  const toNorm = useCallback(
    (v: number) => (range === 0 ? 0 : (v - min) / range),
    [min, range]
  )
  const fromNorm = useCallback((n: number) => min + n * range, [min, range])

  const clampUnit = (n: number) => Math.max(0, Math.min(1, n))

  /* ------------------------------------------------------------------ *
   * Shared values (always 2 thumbs internally for simplicity)
   * ------------------------------------------------------------------ */
  const positions = useSharedValue<[number, number]>(
    isRange
      ? [toNorm((value as number[])[0]), toNorm((value as number[])[1])]
      : [toNorm(value as number), 1]
  )
  const trackDim = useSharedValue(0)
  const activeThumbIdx = useSharedValue(-1)
  const isInteracting = useSharedValue(false)

  // per-thumb drag tracking
  const startPos0 = useSharedValue(0)
  const startPos1 = useSharedValue(0)
  const startTrans0 = useSharedValue(0)
  const startTrans1 = useSharedValue(0)

  /* ------------------------------------------------------------------ *
   * Emit helpers
   * ------------------------------------------------------------------ */
  const emit = useCallback(
    (pos: [number, number]) => {
      if (isRange) {
        onValueChange([fromNorm(pos[0]), fromNorm(pos[1])])
      } else {
        onValueChange(fromNorm(pos[0]))
      }
    },
    [isRange, fromNorm, onValueChange]
  )

  const emitStart = useCallback(() => {
    if (!onSlidingStart) return
    const p = positions.value
    onSlidingStart(
      isRange ? [fromNorm(p[0]), fromNorm(p[1])] : fromNorm(p[0])
    )
  }, [isRange, fromNorm, onSlidingStart])

  const emitComplete = useCallback(() => {
    if (!onSlidingComplete) return
    const p = positions.value
    onSlidingComplete(
      isRange ? [fromNorm(p[0]), fromNorm(p[1])] : fromNorm(p[0])
    )
  }, [isRange, fromNorm, onSlidingComplete])

  /* ------------------------------------------------------------------ *
   * Sync from external `value` prop (skip while user is dragging)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (isInteracting.value) return
    if (isRange) {
      const [a, b] = value as number[]
      positions.value = [toNorm(a), toNorm(b)]
    } else {
      positions.value = [toNorm(value as number), 1]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, isRange, toNorm])

  /* ------------------------------------------------------------------ *
   * Track layout measurement
   * ------------------------------------------------------------------ */
  const onTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackDim.value = isHorizontal
        ? e.nativeEvent.layout.width
        : e.nativeEvent.layout.height
    },
    [isHorizontal]
  )

  /* ------------------------------------------------------------------ *
   * Pan gesture (one factory, two instances)
   * ------------------------------------------------------------------ */
  const makePan = (idx: 0 | 1) => {
    const startPos = idx === 0 ? startPos0 : startPos1
    const startTrans = idx === 0 ? startTrans0 : startTrans1

    return Gesture.Pan()
      .enabled(!disabled)
      .minDistance(0)
      .onBegin((e) => {
        'worklet'
        startTrans.value = isHorizontal ? e.translationX : e.translationY
        startPos.value = positions.value[idx]
        activeThumbIdx.value = idx
        isInteracting.value = true
        runOnJS(emitStart)()
      })
      .onUpdate((e) => {
        'worklet'
        if (trackDim.value === 0) return
        const t = isHorizontal ? e.translationX : e.translationY
        const delta = (t - startTrans.value) / trackDim.value
        let next = startPos.value + delta

        // clamp 0..1
        next = Math.max(0, Math.min(1, next))

        // snap to step (in normalized space)
        if (!disableStepSnapping && step > 0 && range > 0) {
          const normStep = step / range
          next = Math.round(next / normStep) * normStep
        }

        // prevent thumbs from crossing in range variant
        if (isRange && !allowOverlap) {
          if (idx === 0) next = Math.min(next, positions.value[1])
          else next = Math.max(next, positions.value[0])
        }

        const newPos: [number, number] = [
          positions.value[0],
          positions.value[1],
        ]
        newPos[idx] = next
        positions.value = newPos
        runOnJS(emit)(newPos)
      })
      .onEnd(() => {
        'worklet'
        activeThumbIdx.value = -1
        isInteracting.value = false
        runOnJS(emitComplete)()
      })
      .onFinalize(() => {
        'worklet'
        if (activeThumbIdx.value === idx) activeThumbIdx.value = -1
        isInteracting.value = false
      })
  }

  const panDeps = [
    disabled,
    isHorizontal,
    isRange,
    allowOverlap,
    disableStepSnapping,
    step,
    range,
    emit,
    emitStart,
    emitComplete,
  ] as const

  const pan0 = useMemo(() => makePan(0), panDeps)
  const pan1 = useMemo(() => makePan(1), panDeps)

  /* ------------------------------------------------------------------ *
   * Tap-to-seek on the track (moves the nearest thumb)
   * ------------------------------------------------------------------ */
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!disabled)
        .onEnd((e) => {
          'worklet'
          if (trackDim.value === 0) return
          const tapPos = isHorizontal ? e.x : e.y
          let ratio = clampUnit(tapPos / trackDim.value)

          if (!disableStepSnapping && step > 0 && range > 0) {
            const normStep = step / range
            ratio = Math.round(ratio / normStep) * normStep
          }

          let idx = 0
          if (isRange) {
            const d0 = Math.abs(positions.value[0] - ratio)
            const d1 = Math.abs(positions.value[1] - ratio)
            idx = d0 <= d1 ? 0 : 1
          }

          const newPos: [number, number] = [
            positions.value[0],
            positions.value[1],
          ]
          newPos[idx] = ratio

          if (isRange && !allowOverlap) {
            if (idx === 0) newPos[0] = Math.min(newPos[0], newPos[1])
            else newPos[1] = Math.max(newPos[1], newPos[0])
          }

          positions.value = newPos
          runOnJS(emit)(newPos)
          runOnJS(emitComplete)()
        }),
    [
      disabled,
      isHorizontal,
      isRange,
      allowOverlap,
      disableStepSnapping,
      step,
      range,
      emit,
      emitComplete,
    ]
  )

  /* ------------------------------------------------------------------ *
   * Animated styles
   * ------------------------------------------------------------------ */
  const thumb0Style = useAnimatedStyle(() => {
    const pos = positions.value[0]
    const dim = trackDim.value
    if (dim === 0) return { transform: [{ translateX: 0 }] }
    const offset = isHorizontal
      ? pos * (dim - thumbSize)
      : (1 - pos) * (dim - thumbSize) // vertical: 0 at bottom, 1 at top
    return {
      transform: [
        isHorizontal ? { translateX: offset } : { translateY: offset },
      ],
    }
  })

  const thumb1Style = useAnimatedStyle(() => {
    if (!isRange) return { transform: [{ translateX: 0 }] }
    const pos = positions.value[1]
    const dim = trackDim.value
    if (dim === 0) return { transform: [{ translateX: 0 }] }
    const offset = isHorizontal
      ? pos * (dim - thumbSize)
      : (1 - pos) * (dim - thumbSize)
    return {
      transform: [
        isHorizontal ? { translateX: offset } : { translateY: offset },
      ],
    }
  })

  // Active (filled) portion of the track
  const fillStyle = useAnimatedStyle(() => {
    if (!isRange) {
      const w = positions.value[0] * 100
      return isHorizontal
        ? { left: 0, top: 0, bottom: 0, width: `${w}%` }
        : { left: 0, right: 0, bottom: 0, height: `${w}%` }
    }
    const start = positions.value[0] * 100
    const end = positions.value[1] * 100
    const size = end - start
    return isHorizontal
      ? { left: `${start}%`, top: 0, bottom: 0, width: `${size}%` }
      : { top: `${start}%`, left: 0, right: 0, height: `${size}%` }
  })

  /* ------------------------------------------------------------------ *
   * Static layout styles
   * ------------------------------------------------------------------ */
  const containerSizeStyle: ViewStyle = isHorizontal
    ? { width: '100%', height: Math.max(thumbSize, trackHeight) * 1.6 }
    : {
        width: Math.max(thumbSize, trackHeight) * 1.6,
        height: 200,
      }

  const thumbBaseStyle: ViewStyle = {
    position: 'absolute',
    width: thumbSize,
    height: thumbSize,
    ...(isHorizontal
      ? { top: '50%', marginTop: -thumbSize / 2, left: 0 }
      : { left: '50%', marginLeft: -thumbSize / 2, top: 0 }),
  }

  const trackSizeStyle: ViewStyle = isHorizontal
    ? { width: '100%', height: trackHeight }
    : { width: trackHeight, height: '100%' }

  const nowValue = Array.isArray(value)
    ? (value as number[])[0]
    : (value as number)

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */
  return (
    <GestureDetector gesture={tapGesture}>
      <View
        ref={ref}
        className={cn(
          'relative flex items-center justify-center',
          disabled && 'opacity-50',
          className
        )}
        style={[containerSizeStyle, style]}
        onLayout={onTrackLayout}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: nowValue }}
      >
        {/* Track */}
        <View
          className={cn(
            'rounded-full bg-muted overflow-hidden',
            trackClassName
          )}
          style={trackSizeStyle}
        >
          {/* Active fill */}
          <Animated.View
            style={[StyleSheet.absoluteFill, fillStyle]}
            className={cn('bg-primary', activeTrackClassName)}
          />
        </View>

        {/* Thumb 0 (always rendered; for default variant this is the only thumb) */}
        <GestureDetector gesture={pan0}>
          <Animated.View
            style={[thumbBaseStyle, thumb0Style]}
            className={cn(
              'bg-background border-2 border-primary rounded-full shadow-sm',
              thumbClassName
            )}
            accessibilityRole="adjustable"
            accessibilityLabel={isRange ? 'Lower bound' : 'Value'}
          />
        </GestureDetector>

        {/* Thumb 1 (range only) */}
        {isRange && (
          <GestureDetector gesture={pan1}>
            <Animated.View
              style={[thumbBaseStyle, thumb1Style]}
              className={cn(
                'bg-background border-2 border-primary rounded-full shadow-sm',
                thumbClassName
              )}
              accessibilityRole="adjustable"
              accessibilityLabel="Upper bound"
            />
          </GestureDetector>
        )}
      </View>
    </GestureDetector>
  )
})

Slider.displayName = 'Slider'