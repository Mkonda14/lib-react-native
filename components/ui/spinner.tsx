import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import { View, ViewProps as RNViewProps, ViewStyle, StyleSheet } from 'react-native'
import { forwardRef, useEffect } from 'react'
import { Text } from './text'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

const spinnerVariants = cva(
  'flex items-center justify-center',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        default: 'h-6 w-6',
        lg: 'h-8 w-8',
        icon: 'h-6 w-6',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
)

interface SpinnerProps
  extends Omit<RNViewProps, 'style'>,
    VariantProps<typeof spinnerVariants> {
  asChild?: boolean
  variant?: 'default' | 'circle' | 'dots' | 'pulse' | 'bars'
  label?: string
  showLabel?: boolean
  style?: ViewStyle | ViewStyle[]
  color?: string
  thickness?: number
  speed?: 'slow' | 'normal' | 'fast'
}

export const Spinner = forwardRef<View, SpinnerProps>(
  (
    {
      className,
      asChild = false,
      size,
      variant = 'default',
      label,
      showLabel = false,
      style,
      color,
      thickness = 2,
      speed = 'normal',
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : View

    const rotate = useSharedValue(0)
    const pulse = useSharedValue(1)
    const dotAnim1 = useSharedValue(0.3)
    const dotAnim2 = useSharedValue(0.3)
    const dotAnim3 = useSharedValue(0.3)
    const barAnim1 = useSharedValue(0.3)
    const barAnim2 = useSharedValue(0.3)
    const barAnim3 = useSharedValue(0.3)
    const barAnim4 = useSharedValue(0.3)

    const dotsAnims = [dotAnim1, dotAnim2, dotAnim3]
    const barsAnims = [barAnim1, barAnim2, barAnim3, barAnim4]

    const speedConfig = {
      slow: 1500,
      normal: 1000,
      fast: 500,
    } as const
    const animationDuration = speedConfig[speed as keyof typeof speedConfig]

    useEffect(() => {
      rotate.value = withRepeat(
        withTiming(360, { duration: animationDuration, easing: Easing.linear }),
        -1,
        false
      )
    }, [animationDuration, rotate])

    const animatedCircleStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotate.value}deg` }],
    }))

    const animatedPulseStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pulse.value }],
    }))

    const renderSpinner = () => {
      const spinnerColor = color || 'currentColor'
      const sizeConfig = {
        sm: 16,
        default: 24,
        lg: 32,
        icon: 24,
      } as const
      const currentSize = sizeConfig[size as keyof typeof sizeConfig]

      switch (variant) {
        case 'circle':
          return (
            <Animated.View
              style={[
                styles.customSpinner,
                { width: currentSize, height: currentSize },
                animatedCircleStyle,
              ]}
            >
              <View
                style={[
                  styles.spinnerRing,
                  {
                    width: currentSize,
                    height: currentSize,
                    borderWidth: thickness,
                    borderColor: spinnerColor,
                  },
                ]}
              />
            </Animated.View>
          )

        case 'pulse':
          return (
            <Animated.View
              style={[
                styles.pulseSpinner,
                {
                  width: currentSize,
                  height: currentSize,
                  backgroundColor: spinnerColor,
                },
                animatedPulseStyle,
              ]}
            />
          )

        case 'dots':
          return (
            <View style={[styles.dotsContainer, { gap: currentSize / 4 }]}>
              {dotsAnims.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      width: currentSize / 3,
                      height: currentSize / 3,
                      backgroundColor: spinnerColor,
                    },
                    { opacity: anim.value },
                  ]}
                />
              ))}
            </View>
          )

        case 'bars':
          return (
            <View style={[styles.barsContainer, { gap: currentSize / 6 }]}>
              {barsAnims.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.bar,
                    {
                      width: currentSize / 6,
                      height: currentSize,
                      backgroundColor: spinnerColor,
                    },
                    { opacity: anim.value },
                  ]}
                />
              ))}
            </View>
          )

        default:
          return (
            <Animated.View
              style={[
                styles.defaultSpinner,
                { width: currentSize, height: currentSize },
                animatedCircleStyle,
              ]}
            >
              <View
                style={[
                  styles.spinnerRing,
                  {
                    width: currentSize,
                    height: currentSize,
                    borderWidth: thickness,
                    borderColor: spinnerColor,
                    borderTopColor: 'transparent',
                  },
                ]}
              />
            </Animated.View>
          )
      }
    }

    return (
      <Comp
        ref={ref}
        className={cn(spinnerVariants({ size, className }), 'flex flex-col items-center')}
        data-slot="spinner"
        style={style}
        {...props}
      >
        {renderSpinner()}
        {(showLabel || label) && (
          <Text
            variant="caption"
            className="mt-2 text-center"
            style={{ color }}
          >
            {label || 'Loading...'}
          </Text>
        )}
      </Comp>
    )
  }
)
Spinner.displayName = 'Spinner'

export interface LoadingOverlayProps extends SpinnerProps {
  visible: boolean
  backdrop?: boolean
  backdropColor?: string
  backdropOpacity?: number
  onRequestClose?: () => void
}

export const LoadingOverlay = forwardRef<View, LoadingOverlayProps>(
  (
    {
      visible,
      backdrop = true,
      backdropColor,
      backdropOpacity = 0.5,
      className,
      asChild = false,
      style,
      ...spinnerProps
    },
    ref
  ) => {
    const Comp = asChild ? Slot : View
    const opacity = useSharedValue(0)

    const animatedOverlayStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      display: opacity.value === 0 ? 'none' : 'flex',
    }))

    return (
      <Comp
        ref={ref}
        className={cn(styles.overlay, className)}
        data-slot="loading-overlay"
        style={[
          styles.overlay,
          { backgroundColor: backdrop ? (backdropColor || 'rgba(0,0,0,0.5)') : 'transparent' },
          animatedOverlayStyle,
          style,
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
        {...spinnerProps}
      >
        <View style={styles.overlayContent}>
          <Spinner {...spinnerProps} />
        </View>
      </Comp>
    )
  }
)
LoadingOverlay.displayName = 'LoadingOverlay'

const styles = StyleSheet.create({
  defaultSpinner: {
    width: 24,
    height: 24,
  },
  customSpinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerRing: {
    borderRadius: 999,
    borderStyle: 'solid',
  },
  pulseSpinner: {
    borderRadius: 999,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 999,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    borderRadius: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  overlayContent: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
})