import * as React from 'react'
import {
  forwardRef,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react'
import {
  Pressable,
  PressableProps,
  View,
  ViewStyle,
  TextStyle,
  StyleSheet,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/* ====================================================================== *
 * cva tokens (compose classNames only; the actual visual state is
 * driven by `style` because NativeWind doesn't process `data-[state=on]:`)
 * ====================================================================== */

export const toggleVariants = cva(
  'items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: {
        default: 'border border-input bg-background',
        outline: 'border border-input bg-transparent',
      },
      size: {
        sm: 'h-8 px-2',
        md: 'h-10 px-3',
        lg: 'h-12 px-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export type ToggleVariant = NonNullable<VariantProps<typeof toggleVariants>['variant']>
export type ToggleSize = NonNullable<VariantProps<typeof toggleVariants>['size']>

/* ====================================================================== *
 * Theme tokens (colors for active/disabled states).
 * Replace these with your theme tokens if you have a theming layer.
 * ====================================================================== */

const TOKENS = {
  primary: '#6366F1', // bg-primary
  primaryFg: '#FFFFFF', // text-primary-foreground
  bg: '#FFFFFF', // bg-background
  bgMuted: '#F4F4F5', // bg-muted
  border: '#E4E4E7', // border-input
  fg: '#18181B', // text-foreground
  mutedFg: '#71717A', // text-muted-foreground
  accent: '#F4F4F5',
  accentFg: '#18181B',
}

/* ====================================================================== *
 * <Toggle>
 * ====================================================================== */

export interface ToggleProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  /** Controlled pressed state. */
  pressed?: boolean
  /** Initial pressed state (uncontrolled). */
  defaultPressed?: boolean
  /** Called whenever pressed state changes. */
  onPressedChange?: (pressed: boolean) => void
  variant?: ToggleVariant
  size?: ToggleSize
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
  activeTextStyle?: TextStyle
  children: React.ReactNode
  /** Custom render for pressed-state color override. */
  pressedStyle?: ViewStyle
}

export const Toggle = forwardRef<typeof Pressable, ToggleProps>(
  (props, ref) => {
    const {
      pressed: controlled,
      defaultPressed = false,
      onPressedChange,
      variant = 'default',
      size = 'md',
      disabled = false,
      className,
      style,
      textStyle,
      activeTextStyle,
      pressedStyle,
      children,
      ...rest
    } = props

    const isControlled = controlled !== undefined
    const [internal, setInternal] = useState(defaultPressed)
    const isPressed = isControlled ? controlled! : internal

    // press-scale animation
    const scale = useSharedValue(1)

    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.97, { damping: 18, stiffness: 320 })
    }, [scale])

    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1, { damping: 18, stiffness: 320 })
    }, [scale])

    const handlePress = useCallback(() => {
      if (disabled) return
      if (!isControlled) setInternal((p) => !p)
      onPressedChange?.(!isPressed)
    }, [disabled, isControlled, isPressed, onPressedChange])

    // visual styles based on state
    const stateColors: ViewStyle = useMemo(() => {
      if (disabled) return { opacity: 0.5 }
      if (isPressed) {
        return {
          backgroundColor:
            variant === 'outline' ? TOKENS.accent : TOKENS.primary,
          borderColor: TOKENS.primary,
        }
      }
      // inactive
      return {
        backgroundColor: variant === 'outline' ? 'transparent' : TOKENS.bg,
        borderColor: TOKENS.border,
      }
    }, [disabled, isPressed, variant])

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))

    return (
      <Pressable
        ref={ref as any}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, checked: isPressed }}
        accessibilityLabel={typeof children === 'string' ? children : undefined}
        {...rest}
      >
        <Animated.View
          style={[styles.base, stateColors, animStyle, style as ViewStyle]}
          className={cn(toggleVariants({ variant, size }), className)}
        >
          {typeof children === 'string' || typeof children === 'number' ? (
            <Animated.Text
              style={[
                styles.text,
                sizeTextStyles[size],
                { color: isPressed ? TOKENS.primaryFg : TOKENS.fg },
                textStyle,
                isPressed && activeTextStyle,
              ]}
              numberOfLines={1}
            >
              {children}
            </Animated.Text>
          ) : (
            children
          )}
        </Animated.View>
      </Pressable>
    )
  }
)
Toggle.displayName = 'Toggle'

/* ====================================================================== *
 * ToggleGroup — context-based (no fragile cloneElement)
 * ====================================================================== */

type GroupType = 'single' | 'multiple'

interface ToggleGroupContextValue {
  type: GroupType
  values: string[]
  toggle: (value: string) => void
  variant: ToggleVariant
  size: ToggleSize
  disabled: boolean
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null)

const useToggleGroupCtx = () => {
  const ctx = useContext(ToggleGroupContext)
  if (!ctx) {
    throw new Error('<ToggleGroupItem> must be used within <ToggleGroup>.')
  }
  return ctx
}

export interface ToggleGroupProps {
  type: GroupType
  /** Controlled value: string for 'single', string[] for 'multiple'. */
  value?: string | string[]
  /** Initial value (uncontrolled). */
  defaultValue?: string | string[]
  onValueChange?: (value: string | string[]) => void
  variant?: ToggleVariant
  size?: ToggleSize
  disabled?: boolean
  /** Layout: 'row' (horizontal) or 'column' (vertical). */
  orientation?: 'horizontal' | 'vertical'
  /** Stretch items to fill width (horizontal only). */
  stretch?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  children: React.ReactNode
}

export const ToggleGroup = (props: ToggleGroupProps) => {
  const {
    type,
    value: controlled,
    defaultValue,
    onValueChange,
    variant = 'default',
    size = 'md',
    disabled = false,
    orientation = 'horizontal',
    stretch = false,
    className,
    style,
    children,
  } = props

  // normalize the controlled/default value into string[]
  const toArray = (v?: string | string[]): string[] => {
    if (v === undefined) return []
    if (Array.isArray(v)) return v
    return v === '' ? [] : [v]
  }

  const isControlled = controlled !== undefined
  const [internal, setInternal] = useState<string[]>(toArray(defaultValue))
  const current = isControlled ? toArray(controlled) : internal

  const emit = useCallback(
    (next: string[]) => {
      if (!onValueChange) return
      if (type === 'single') {
        onValueChange(next[0] ?? '')
      } else {
        onValueChange(next)
      }
    },
    [onValueChange, type]
  )

  const toggle = useCallback(
    (value: string) => {
      if (disabled) return
      let next: string[]
      if (type === 'single') {
        // toggle the single value
        next = current.includes(value) ? [] : [value]
      } else {
        // multiple
        next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
      }
      if (!isControlled) setInternal(next)
      emit(next)
    },
    [disabled, type, current, isControlled, emit]
  )

  const ctx = useMemo<ToggleGroupContextValue>(
    () => ({
      type,
      values: current,
      toggle,
      variant,
      size,
      disabled,
    }),
    [type, current, toggle, variant, size, disabled]
  )

  return (
    <ToggleGroupContext.Provider value={ctx}>
      <View
        style={[
          styles.group,
          orientation === 'horizontal'
            ? { flexDirection: 'row', alignItems: 'center' }
            : { flexDirection: 'column', alignItems: 'stretch' },
          style,
        ]}
        className={cn(
          'rounded-md bg-muted p-1',
          orientation === 'vertical' && 'self-start',
          className
        )}
        aria-role="group"
      >
        {children}
      </View>
    </ToggleGroupContext.Provider>
  )
}
ToggleGroup.displayName = 'ToggleGroup'

/* ====================================================================== *
 * <ToggleGroupItem>
 * ====================================================================== */

export interface ToggleGroupItemProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  value: string
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
  activeTextStyle?: TextStyle
  children: React.ReactNode
}

export const ToggleGroupItem = forwardRef<typeof Pressable, ToggleGroupItemProps>(
  (props, ref) => {
    const {
      value,
      disabled: itemDisabled = false,
      className,
      style,
      textStyle,
      activeTextStyle,
      children,
      ...rest
    } = props

    const { values, toggle, variant, size, disabled: groupDisabled } =
      useToggleGroupCtx()
    const isPressed = values.includes(value)
    const disabled = groupDisabled || itemDisabled

    const scale = useSharedValue(1)
    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.97, { damping: 18, stiffness: 320 })
    }, [scale])
    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1, { damping: 18, stiffness: 320 })
    }, [scale])

    const handlePress = useCallback(() => {
      if (disabled) return
      toggle(value)
    }, [disabled, toggle, value])

    const stateColors: ViewStyle = useMemo(() => {
      if (disabled) return { opacity: 0.5 }
      if (isPressed) {
        return {
          backgroundColor:
            variant === 'outline' ? TOKENS.accent : TOKENS.primary,
          borderColor: TOKENS.primary,
        }
      }
      return {
        backgroundColor: variant === 'outline' ? 'transparent' : TOKENS.bg,
        borderColor: 'transparent',
      }
    }, [disabled, isPressed, variant])

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))

    return (
      <Pressable
        ref={ref as any}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, checked: isPressed }}
        accessibilityLabel={typeof children === 'string' ? children : undefined}
        {...rest}
      >
        <Animated.View
          style={[
            styles.base,
            styles.groupItem,
            sizeItemStyles[size],
            stateColors,
            animStyle,
            style as ViewStyle,
          ]}
          className={cn(toggleVariants({ variant, size }), className)}
        >
          {typeof children === 'string' || typeof children === 'number' ? (
            <Animated.Text
              style={[
                styles.text,
                sizeTextStyles[size],
                {
                  color: isPressed
                    ? variant === 'outline'
                      ? TOKENS.accentFg
                      : TOKENS.primaryFg
                    : TOKENS.fg,
                },
                textStyle,
                isPressed && activeTextStyle,
              ]}
              numberOfLines={1}
            >
              {children}
            </Animated.Text>
          ) : (
            children
          )}
        </Animated.View>
      </Pressable>
    )
  }
)
ToggleGroupItem.displayName = 'ToggleGroupItem'

/* ====================================================================== *
 * Styles
 * ====================================================================== */

const sizeTextStyles: Record<ToggleSize, TextStyle> = {
  sm: { fontSize: 12 },
  md: { fontSize: 14 },
  lg: { fontSize: 16 },
}

const sizeItemStyles: Record<ToggleSize, ViewStyle> = {
  sm: { height: 32, paddingHorizontal: 8, paddingVertical: 4 },
  md: { height: 40, paddingHorizontal: 12, paddingVertical: 6 },
  lg: { height: 48, paddingHorizontal: 16, paddingVertical: 8 },
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    flexDirection: 'row',
  },
  group: {
    alignSelf: 'flex-start',
  },
  groupItem: {
    marginHorizontal: 2,
    marginVertical: 2,
  },
  text: {
    fontWeight: '500',
  },
})
