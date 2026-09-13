import * as React from 'react'
import {
  forwardRef,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react'
import {
  View,
  Pressable,
  ViewStyle,
  TextStyle,
  StyleSheet,
  PressableProps,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/* ====================================================================== *
 * cva variant tokens (for className composition only)
 * ====================================================================== */

export const toastVariants = cva(
  'relative flex w-full items-center justify-between overflow-hidden rounded-xl border p-2 shadow-md',
  {
    variants: {
      variant: {
        default: 'bg-background border-border',
        destructive:
          'bg-destructive border-destructive',
        success: 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950',
        warning: 'bg-amber-50 border-amber-500 dark:bg-amber-950',
        info: 'bg-sky-50 border-sky-500 dark:bg-sky-950',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>

/* ====================================================================== *
 * Default icons (small inline SVG-like views)
 * ====================================================================== */

const CloseIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Animated.Text
      style={[styles.iconText, { color, fontSize: size * 0.78 }]}
      allowFontScaling={false}
    >
      ✕
    </Animated.Text>
  </View>
)

const StatusIcon = ({ variant, size = 22 }: { variant: ToastVariant; size?: number }) => {
  const map: Record<ToastVariant, string> = {
    default: '•',
    destructive: '✕',
    success: '✓',
    warning: '!',
    info: 'i',
  }
  return (
    <View
      style={[
        styles.statusIcon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Animated.Text style={styles.statusIconText} allowFontScaling={false}>
        {map[variant]}
      </Animated.Text>
    </View>
  )
}

/* ====================================================================== *
 * <Toast>
 * ====================================================================== */

export interface ToastProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  id?: string
  variant?: ToastVariant
  title?: string
  description?: string
  /** Action element rendered on the right (e.g. an Undo button). */
  action?: React.ReactNode
  onClose?: () => void
  onOpen?: () => void
  /** Auto-dismiss after N ms. Set to 0 to disable. */
  duration?: number
  /** Allow swipe-to-dismiss. */
  swipeToDismiss?: boolean
  /** Show the close (✕) button. */
  showCloseButton?: boolean
  /** Show a status icon on the left. */
  showStatusIcon?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  titleStyle?: TextStyle
  descriptionStyle?: TextStyle
  children?: React.ReactNode
}

export const Toast = forwardRef<View, ToastProps>((props, ref) => {
  const {
    id,
    variant = 'default',
    title,
    description,
    action,
    onClose,
    onOpen,
    duration = 5000,
    swipeToDismiss = true,
    showCloseButton = true,
    showStatusIcon = true,
    className,
    style,
    titleStyle,
    descriptionStyle,
    children,
    ...rest
  } = props

  const [isOpen, setIsOpen] = useState(true)

  // animated values
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(0)
  const height = useSharedValue(0)
  const progress = useSharedValue(0) // for the auto-dismiss progress bar

  // track gesture state
  const startX = useSharedValue(0)

  const close = useCallback(() => {
    'worklet'
    opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) })
    translateX.value = withTiming(
      400,
      { duration: 200, easing: Easing.out(Easing.ease) },
      () => {
        runOnJS(handleAfterClose)()
      }
    )
  }, [])

  const handleAfterClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  // open animation
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) })
    translateX.value = withSpring(0, { damping: 18, stiffness: 220 })
    onOpen?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // auto-dismiss timer with progress bar
  useEffect(() => {
    if (duration <= 0) return
    progress.value = 0
    progress.value = withTiming(1, { duration, easing: Easing.linear })

    const timer = setTimeout(() => {
      'worklet'
      // trigger close animation
      opacity.value = withTiming(0, { duration: 200 })
      translateX.value = withTiming(
        300,
        { duration: 200 },
        () => runOnJS(handleAfterClose)()
      )
    }, duration)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  /* ---------------- swipe gesture ---------------- */
  const panGesture = useRef(
    Gesture.Pan()
      .enabled(swipeToDismiss)
      .activeOffsetX([-15, 15])
      .failOffsetY([-5, 5])
      .onBegin((e) => {
        'worklet'
        startX.value = e.translationX
      })
      .onUpdate((e) => {
        'worklet'
        // only allow horizontal swipe; resistance when swiping back past 0
        const tx = e.translationX
        translateX.value = tx < 0 ? tx * 0.6 : Math.max(0, tx * 0.5)
      })
      .onEnd((e) => {
        'worklet'
        if (e.translationX < -100 || e.velocityX < -800) {
          // swipe left to dismiss
          translateX.value = withTiming(
            -400,
            { duration: 200 },
            () => runOnJS(handleAfterClose)()
          )
          opacity.value = withTiming(0, { duration: 200 })
        } else {
          translateX.value = withSpring(0, { damping: 16, stiffness: 220 })
        }
      })
  ).current

  /* ---------------- animated styles ---------------- */
  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }))

  const progressBarAnim = useAnimatedStyle(() => ({
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP) },
    ],
  }))

  if (!isOpen) return null

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        ref={ref}
        style={[styles.container, containerAnim, style as ViewStyle]}
        className={cn(toastVariants({ variant }), className)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        {...rest}
      >
        {/* Main row */}
        <View style={styles.row}>
          {showStatusIcon && (
            <View style={styles.iconColumn}>
              <StatusIcon variant={variant as ToastVariant} />
            </View>
          )}

          <View style={styles.contentColumn}>
            {title ? (
              <Animated.Text
                style={[
                  styles.title,
                  { color: variant === 'destructive' ? '#fff' : undefined },
                  titleStyle,
                ]}
                numberOfLines={2}
              >
                {title}
              </Animated.Text>
            ) : null}
            {description ? (
              <Animated.Text
                style={[
                  styles.description,
                  {
                    color:
                      variant === 'destructive'
                        ? 'rgba(255,255,255,0.9)'
                        : undefined,
                  },
                  descriptionStyle,
                ]}
                numberOfLines={4}
              >
                {description}
              </Animated.Text>
            ) : null}
            {children}
          </View>

          {action ? (
            <View style={styles.actionColumn}>{action}</View>
          ) : null}

          {showCloseButton ? (
            <Pressable
              onPress={() => {
                'worklet'
                opacity.value = withTiming(0, { duration: 150 })
                translateX.value = withTiming(
                  -300,
                  { duration: 200 },
                  () => runOnJS(handleAfterClose)()
                )
              }}
              hitSlop={8}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close notification"
            >
              <CloseIcon color={variant === 'destructive' ? '#fff' : '#888'} />
            </Pressable>
          ) : null}
        </View>

        {/* Auto-dismiss progress bar */}
        {duration > 0 ? (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                progressBarAnim,
                {
                  backgroundColor:
                    variant === 'destructive'
                      ? 'rgba(255,255,255,0.85)'
                      : 'rgba(0,0,0,0.45)',
                },
              ]}
            />
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  )
})
Toast.displayName = 'Toast'

/* ====================================================================== *
 * <ToastClose> (kept for API parity — wraps a pressable close button)
 * ====================================================================== */

export interface ToastCloseProps
  extends Omit<PressableProps, 'style' | 'children'> {
  className?: string
  style?: ViewStyle | ViewStyle[]
  size?: number
  color?: string
}

export const ToastClose = forwardRef<typeof Pressable, ToastCloseProps>(
  ({ className, style, size = 18, color = '#888', ...rest }, ref) => {
    return (
      <Pressable
        ref={ref as any}
        hitSlop={8}
        style={[styles.closeButton, style as ViewStyle]}
        accessibilityRole="button"
        accessibilityLabel="Close notification"
        {...rest}
      >
        <CloseIcon size={size} color={color} />
      </Pressable>
    )
  }
)
ToastClose.displayName = 'ToastClose'

/* ====================================================================== *
 * Toast context for shared defaults (internal)
 * ====================================================================== */

interface ToastContextValue {
  defaultDuration: number
  defaultVariant: ToastVariant
  defaultSwipeToDismiss: boolean
}

const ToastContext = React.createContext<ToastContextValue>({
  defaultDuration: 5000,
  defaultVariant: 'default',
  defaultSwipeToDismiss: true,
})

const useToastContext = () => React.useContext(ToastContext)

/* ====================================================================== *
 * Styles
 * ====================================================================== */

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconColumn: {
    paddingTop: 1,
  },
  contentColumn: {
    flex: 1,
    gap: 2,
  },
  actionColumn: {
    flexShrink: 0,
    marginLeft: 4,
  },
  closeButton: {
    flexShrink: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  iconText: {
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  statusIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  statusIconText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    overflow: 'hidden',
  },
  progressBar: {
    flex: 1,
    transformOrigin: 'left',
  },
})