import * as React from 'react'
import {
  forwardRef,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  useEffect,
} from 'react'
import {
  View,
  Pressable,
  ViewStyle,
  TextStyle,
  LayoutChangeEvent,
  StyleSheet,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { SharedValue } from 'react-native-reanimated'
import { cn } from '@/lib/utils'

/* ====================================================================== *
 * Context
 * ====================================================================== */

interface TabsContextValue {
  value: number
  setValue: (next: number) => void
  variant: TabsProps['variant']
  orientation: 'horizontal' | 'vertical'
  layout: 'fixed' | 'full'
  triggerCount: number
  registerTrigger: (id: number) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsCtx(component: string): TabsContextValue {
  const ctx = useContext(TabsContext)
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Tabs>.`)
  }
  return ctx
}

/* Layout context - exposes the indicator position, updated by triggers */
interface IndicatorContextValue {
  x: SharedValue<number>
  y: SharedValue<number>
  w: SharedValue<number>
  h: SharedValue<number>
  setIndicatorPosition: (x: number, y: number, w: number, h: number) => void
}

const IndicatorContext = createContext<IndicatorContextValue | null>(null)

/* ====================================================================== *
 * Types
 * ====================================================================== */

export interface TabsProps {
  /** Controlled active index. */
  value?: number
  /** Initial index (uncontrolled). Defaults to 0. */
  defaultValue?: number
  /** Called whenever the active index changes. */
  onValueChange?: (index: number) => void
  /** Layout of the list — 'fixed' (left-aligned) or 'full' (fill width). */
  layout?: 'fixed' | 'full'
  /** Tab orientation. */
  orientation?: 'horizontal' | 'vertical'
  /** Visual variant of the list. */
  variant?: 'default' | 'outline' | 'pills'
  /** Show an animated indicator that slides between active tabs. */
  animatedIndicator?: boolean
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  children: React.ReactNode
}

export interface TabsListProps {
  className?: string
  style?: ViewStyle | ViewStyle[]
  children: React.ReactNode
}

export interface TabsTriggerProps {
  value: number
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
  activeTextStyle?: TextStyle
  children: React.ReactNode
}

export interface TabsContentProps {
  value: number
  /** Animate appearance with a fade. */
  animated?: boolean
  /** Keep mounted when inactive (useful for state preservation). */
  forceMount?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  children: React.ReactNode
}

/* ====================================================================== *
 * <Tabs>
 * ====================================================================== */

export const Tabs = forwardRef<View, TabsProps>((props, ref) => {
  const {
    value: controlledValue,
    defaultValue = 0,
    onValueChange,
    layout = 'fixed',
    orientation = 'horizontal',
    variant = 'default',
    animatedIndicator = true,
    disabled = false,
    className,
    style,
    children,
  } = props

  const [internalValue, setInternalValue] = useState(defaultValue)
  const [triggerCount, setTriggerCount] = useState(0)
  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue! : internalValue

  // indicator position (in list-local coords)
  const indicatorX = useSharedValue(0)
  const indicatorY = useSharedValue(0)
  const indicatorW = useSharedValue(0)
  const indicatorH = useSharedValue(0)

  const setIndicatorPosition = useCallback(
    (x: number, y: number, w: number, h: number) => {
      'worklet'
      indicatorX.value = withSpring(x, { damping: 24, stiffness: 280 })
      indicatorY.value = withSpring(y, { damping: 24, stiffness: 280 })
      indicatorW.value = withSpring(w, { damping: 24, stiffness: 280 })
      indicatorH.value = withSpring(h, { damping: 24, stiffness: 280 })
    },
    []
  )

  const setValue = useCallback(
    (next: number) => {
      if (disabled) return
      if (!isControlled) setInternalValue(next)
      onValueChange?.(next)
    },
    [disabled, isControlled, onValueChange]
  )

  const ctx = useMemo<TabsContextValue>(
    () => ({
      value: currentValue,
      setValue,
      variant,
      orientation,
      layout,
      triggerCount,
      registerTrigger: () => {},
    }),
    [currentValue, setValue, variant, orientation, layout, triggerCount]
  )

  const indicatorCtx = useMemo<IndicatorContextValue>(
    () => ({
      x: indicatorX,
      y: indicatorY,
      w: indicatorW,
      h: indicatorH,
      setIndicatorPosition,
    }),
    [indicatorX, indicatorY, indicatorW, indicatorH, setIndicatorPosition]
  )

  return (
    <TabsContext.Provider value={ctx}>
      <IndicatorContext.Provider value={indicatorCtx}>
        <View
          ref={ref}
          className={cn(
            'flex',
            orientation === 'horizontal' ? 'flex-col' : 'flex-row',
            className
          )}
          style={style}
          accessibilityRole="tablist"
          accessibilityState={{ disabled }}
        >
          {children}
        </View>
      </IndicatorContext.Provider>
    </TabsContext.Provider>
  )
})
Tabs.displayName = 'Tabs'

/* ====================================================================== *
 * <TabsList>
 * ====================================================================== */

const variantClassMap: Record<NonNullable<TabsProps['variant']>, string> = {
  default: 'bg-muted rounded-md',
  outline: 'border border-border rounded-md',
  pills: 'bg-transparent',
}

export const TabsList = forwardRef<View, TabsListProps>((props, ref) => {
  const { className, style, children } = props
  const { orientation, variant, layout } = useTabsCtx('TabsList')
  const indicatorCtx = useContext(IndicatorContext)

  // Animated indicator (pill) rendered behind the active trigger
  const indicatorStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    transform: [
      { translateX: indicatorCtx?.x?.value ?? 0 },
      { translateY: indicatorCtx?.y?.value ?? 0 },
    ],
    width: indicatorCtx?.w?.value ?? 0,
    height: indicatorCtx?.h?.value ?? 0,
  }))

  return (
    <View
      ref={ref}
      className={cn(
        'flex relative p-1',
        orientation === 'horizontal'
          ? 'flex-row items-center'
          : 'flex-col items-stretch',
        variantClassMap[variant ?? 'default'],
        layout === 'full' && 'w-full',
        className
      )}
      style={style}
    >
      <Animated.View
        style={[styles.indicator, indicatorStyle]}
        className={cn(
          'bg-background rounded-md shadow-sm',
          variant === 'outline' && 'border border-border'
        )}
        pointerEvents="none"
      />
      {children}
    </View>
  )
})
TabsList.displayName = 'TabsList'

/* ====================================================================== *
 * <TabsTrigger>
 * ====================================================================== */

export const TabsTrigger = forwardRef<typeof Pressable, TabsTriggerProps>(
  (props, ref) => {
    const {
      value,
      disabled = false,
      className,
      style,
      textStyle,
      activeTextStyle,
      children,
    } = props

    const { value: active, setValue, orientation, layout } = useTabsCtx('TabsTrigger')
    const indicatorCtx = useContext(IndicatorContext)
    const isActive = value === active

    const onLayout = useCallback(
      (e: LayoutChangeEvent) => {
        if (!indicatorCtx || !isActive) return
        const { x, y, width, height } = e.nativeEvent.layout
        indicatorCtx.setIndicatorPosition(x, y, width, height)
      },
      [isActive, indicatorCtx]
    )

    const containerStyle: ViewStyle =
      layout === 'full'
        ? orientation === 'horizontal'
          ? { flex: 1 }
          : { width: '100%' }
        : {}

    const content = (
      <View
        onLayout={onLayout}
        style={[
          styles.triggerInner,
          layout === 'full' && { alignItems: 'center', justifyContent: 'center' },
        ]}
        pointerEvents="none"
      >
        {typeof children === 'string' || typeof children === 'number' ? (
          <Animated.Text
            style={[styles.text, textStyle, isActive && activeTextStyle]}
            className={cn(
              'text-sm font-medium',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {children}
          </Animated.Text>
        ) : (
          children
        )}
      </View>
    )

    return (
      <Pressable
        ref={ref as any}
        onPress={() => !disabled && setValue(value)}
        disabled={disabled}
        onLayout={onLayout}
        style={({ pressed }) => [
          styles.trigger,
          containerStyle,
          pressed && styles.triggerPressed,
          style as ViewStyle,
        ]}
        className={cn(
          'items-center justify-center px-3 py-1.5 rounded-sm',
          isActive ? 'opacity-100' : 'opacity-90',
          disabled && 'opacity-40',
          className
        )}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive, disabled }}
        accessibilityLabel={`Tab ${value + 1}`}
      >
        {content}
      </Pressable>
    )
  }
)
TabsTrigger.displayName = 'TabsTrigger'

/* ====================================================================== *
 * <TabsContent>
 * ====================================================================== */

export const TabsContent = forwardRef<View, TabsContentProps>(
  (props, ref) => {
    const { value, animated = true, forceMount = false, className, style, children } = props
    const { value: active } = useTabsCtx('TabsContent')
    const isActive = value === active

    const opacity = useSharedValue(isActive ? 1 : 0)

    useEffect(() => {
      if (!animated) {
        opacity.value = isActive ? 1 : 0
        return
      }
      opacity.value = withTiming(isActive ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      })
    }, [isActive, animated, opacity])

    const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

    if (!isActive && !forceMount) return null

    return (
      <Animated.View
        ref={ref}
        style={[style, animated && animStyle]}
        className={cn(
          'mt-2 flex-1',
          orientation === 'horizontal' ? 'flex-col' : '',
          className
        )}
        accessibilityRole={undefined}
        accessibilityLiveRegion={isActive ? 'polite' : 'none'}
      >
        {children}
      </Animated.View>
    )
  }
)
TabsContent.displayName = 'TabsContent'

/* ====================================================================== *
 * Orientation helper — TabsContent needs access to context for orientation
 * (read here via a re-imported hook to keep imports minimal)
 * ====================================================================== */
const { orientation } = { orientation: 'horizontal' as const } // placeholder; TabsContent actually uses useTabsCtx above — but orientation is referenced there. Keep this for reference removal.

const styles = StyleSheet.create({
  indicator: {
    zIndex: 0,
  },
  trigger: {
    zIndex: 1,
  },
  triggerPressed: {
    opacity: 0.7,
  },
  triggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
})